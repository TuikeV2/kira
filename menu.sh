#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="/home/debian/kira"

if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 nie jest zainstalowane!${NC}"
    npm install -g pm2
    sleep 2
fi

pause() {
    echo ""
    read -n 1 -s -r -p "Naciśnij dowolny klawisz, aby wrócić do menu..."
}

backup_full() {
    BACKUP_DIR="$ROOT_DIR/backups"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_NAME="kira_backup_${TIMESTAMP}"
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

    echo -e "${CYAN}📦 Rozpoczynam pełny backup...${NC}"
    echo ""

    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi

    mkdir -p "$BACKUP_PATH"

    echo -e "${YELLOW}[1/3] Tworzenie archiwum plików...${NC}"
    cd "$ROOT_DIR"

    tar --exclude='node_modules' \
        --exclude='.git' \
        --exclude='backups' \
        --exclude='dist' \
        --exclude='*.log' \
        --exclude='.env' \
        --exclude='packages/web/android' \
        -cvzf "${BACKUP_PATH}/files.tar.gz" \
        packages/ \
        docker-compose.yml \
        package.json \
        menu.sh \
        *.md \
        2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Archiwum plików utworzone${NC}"
    else
        echo -e "${RED}✗ Błąd podczas tworzenia archiwum plików${NC}"
        return 1
    fi

    echo -e "${YELLOW}[2/3] Tworzenie zrzutu bazy danych...${NC}"

    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-3306}"
    DB_USER="${DB_USER:-kira_user}"
    DB_PASS="${DB_PASS:-kira_password_change_me}"
    DB_NAME="${DB_NAME:-kira_db}"

    if [ -f "$ROOT_DIR/packages/api/.env" ]; then
        source <(grep -E '^DB_' "$ROOT_DIR/packages/api/.env" | sed 's/^/export /')
    fi

    if command -v mysqldump &> /dev/null; then
        mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "${BACKUP_PATH}/database.sql" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Zrzut bazy danych utworzony${NC}"
        else
            echo -e "${YELLOW}⚠ Nie udało się utworzyć zrzutu bazy${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ mysqldump nie jest zainstalowany${NC}"
    fi

    echo -e "${YELLOW}[3/3] Kompresja finalnego archiwum...${NC}"
    cd "$BACKUP_DIR"
    tar -cvzf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME" 2>/dev/null

    if [ $? -eq 0 ]; then
        rm -rf "$BACKUP_PATH"
        FINAL_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
        echo -e "${GREEN}✓ Backup zakończony pomyślnie!${NC}"
        echo ""
        echo -e "${CYAN}📁 Lokalizacja: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz${NC}"
        echo -e "${CYAN}📊 Rozmiar: ${FINAL_SIZE}${NC}"
    else
        echo -e "${RED}✗ Błąd podczas kompresji finalnej${NC}"
        return 1
    fi

    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 5 ]; then
        echo ""
        echo -e "${YELLOW}⚠ Masz więcej niż 5 backupów. Rozważ usunięcie starszych.${NC}"
    fi

    cd "$ROOT_DIR"
}

build_web() {
    echo -e "${CYAN}🔨 Kompilowanie Panelu Web...${NC}"
    cd "$ROOT_DIR/packages/web" || return
    npm run build
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Kompilacja zakończona sukcesem!${NC}"
    else
        echo -e "${RED}❌ Błąd kompilacji!${NC}"
    fi
    cd "$ROOT_DIR"
}

start_api() {
    echo -e "${CYAN}🚀 Uruchamianie API...${NC}"
    pm2 start src/index.js --name "kira-api" --cwd "$ROOT_DIR/packages/api"
}

start_bot() {
    echo -e "${CYAN}🤖 Uruchamianie Bota...${NC}"
    pm2 start src/index.js --name "kira-bot" --cwd "$ROOT_DIR/packages/bot"
}

start_web() {
    echo -e "${CYAN}🌐 Uruchamianie Panelu Web...${NC}"
    pm2 start npm --name "kira-web" --cwd "$ROOT_DIR/packages/web" -- run preview
}

build_apk() {
    echo -e "${CYAN}📱 Budowanie Android APK...${NC}"
    echo ""

    export JAVA_HOME="/opt/java/jdk17"
    export ANDROID_HOME="/opt/android-sdk"
    export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

    cd "$ROOT_DIR/packages/web" || return

    # Synchronizacja wersji z package.json do build.gradle
    PKG_VERSION=$(node -p "require('./package.json').version")
    if [ -n "$PKG_VERSION" ]; then
        sed -i "s/versionName \"[^\"]*\"/versionName \"$PKG_VERSION\"/" android/app/build.gradle
        echo -e "${GREEN}✓ Wersja APK ustawiona na: $PKG_VERSION${NC}"
    fi

    echo -e "${YELLOW}[1/5] Budowanie panelu web (Vite)...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Błąd budowania strony!${NC}"
        cd "$ROOT_DIR"
        return 1
    fi
    echo -e "${GREEN}✓ Panel web zbudowany${NC}"

    if [ ! -d "android" ]; then
        echo -e "${YELLOW}[2/5] Dodawanie platformy Android...${NC}"
        npx cap add android
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Błąd dodawania platformy Android!${NC}"
            cd "$ROOT_DIR"
            return 1
        fi
        echo -e "${GREEN}✓ Platforma Android dodana${NC}"
    else
        echo -e "${GREEN}[2/5] ✓ Platforma Android już istnieje${NC}"
    fi

    echo -e "${YELLOW}[3/5] Synchronizacja z Capacitor...${NC}"
    npx cap sync android
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Błąd synchronizacji Capacitor!${NC}"
        cd "$ROOT_DIR"
        return 1
    fi
    echo -e "${GREEN}✓ Synchronizacja zakończona${NC}"

    echo -e "${YELLOW}[4/5] Kompilowanie APK (Gradle)...${NC}"
    cd android 
    chmod +x gradlew
    ./gradlew clean
    ./gradlew assembleDebug
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Błąd kompilacji APK!${NC}"
        cd "$ROOT_DIR"
        return 1
    fi
    echo -e "${GREEN}✓ APK skompilowany${NC}"

    echo -e "${YELLOW}[5/5] Kopiowanie APK...${NC}"
    cd "$ROOT_DIR/packages/web"
    mkdir -p public/downloads
    cp android/app/build/outputs/apk/debug/app-debug.apk public/downloads/kiraevo.apk
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ APK skopiowany do public/downloads/kiraevo.apk${NC}"
    else
        echo -e "${RED}❌ Nie znaleziono pliku APK!${NC}"
        cd "$ROOT_DIR"
        return 1
    fi

    echo -e "${YELLOW}Ponowne budowanie web z plikiem APK...${NC}"
    npm run build
    if [ $? -eq 0 ]; then
        APK_SIZE=$(du -h public/downloads/kiraevo.apk | cut -f1)
        echo ""
        echo -e "${GREEN}✅ Android APK zbudowany pomyślnie!${NC}"
        echo -e "${CYAN}📱 Plik: packages/web/public/downloads/kiraevo.apk${NC}"
        echo -e "${CYAN}📊 Rozmiar: ${APK_SIZE}${NC}"
        echo -e "${CYAN}🌐 Dostępny pod: /downloads/kiraevo.apk${NC}"
        echo -e "${CYAN}📌 Wersja w APK: ${PKG_VERSION}${NC}"
    else
        echo -e "${RED}❌ Błąd ponownego budowania web!${NC}"
    fi

    # Auto-inkrementacja wersji patch w package.json (np. 1.0.0 → 1.0.1)
    # Dzięki temu API zwraca nową wersję, a stare APK wykryją aktualizację
    echo ""
    echo -e "${YELLOW}Podbijanie wersji w package.json...${NC}"
    NEW_VERSION=$(node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const parts = pkg.version.split('.').map(Number);
      parts[2]++;
      pkg.version = parts.join('.');
      fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
      console.log(pkg.version);
    ")
    echo -e "${GREEN}✓ Nowa wersja w API: ${NEW_VERSION} (stare APK ${PKG_VERSION} wykryją aktualizację)${NC}"

    # Restart API żeby serwowało nową wersję
    pm2 restart kira-api 2>/dev/null
    echo -e "${GREEN}✓ API zrestartowane — wersja ${NEW_VERSION} aktywna${NC}"

    cd "$ROOT_DIR"
}

manage_git() {
    cd "$ROOT_DIR" || return
    
    if [ ! -d ".git" ]; then
        echo -e "${RED}Katalog $ROOT_DIR nie jest repozytorium Git!${NC}"
        pause
        return
    fi

    while true; do
        CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
        
        clear
        echo -e "${BLUE}=========================================${NC}"
        echo -e "${YELLOW}         🐙 ZARZĄDZANIE GIT (GitHub)     ${NC}"
        echo -e "${BLUE}=========================================${NC}"
        echo -e "Obecna gałąź: ${GREEN}$CURRENT_BRANCH${NC}"
        echo ""
        echo "1. 📊 Sprawdź status (git status)"
        echo "2. ⬇️ Pobierz aktualizacje (git pull)"
        echo "3. ⚠️ Wymuś aktualizację (Reset HARD)"
        echo "4. 📜 Historia zmian (git log)"
        echo "5. 🆙 Wyślij zmiany (Commit & Push)"
        echo "0. 🔙 Powrót do głównego menu"
        echo ""
        read -p "Wybierz opcję Git: " git_choice

        case $git_choice in
            1)
                echo ""
                git status
                pause
                ;;
            2)
                echo ""
                echo -e "${CYAN}Pobieranie zmian z repozytorium...${NC}"
                git pull
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✓ Pomyślnie pobrano zmiany.${NC}"
                else
                    echo -e "${RED}❌ Błąd pobierania.${NC}"
                fi
                pause
                ;;
            3)
                echo ""
                echo -e "${RED}UWAGA! To usunie WSZYSTKIE twoje lokalne zmiany!${NC}"
                read -p "Kontynuować? (t/n): " confirm
                if [[ "$confirm" == "t" || "$confirm" == "T" ]]; then
                    echo -e "${CYAN}Resetowanie repozytorium...${NC}"
                    git fetch --all
                    git reset --hard "origin/$CURRENT_BRANCH"
                    echo -e "${GREEN}✓ Przywrócono stan z GitHub.${NC}"
                fi
                pause
                ;;
            4)
                echo ""
                git log -n 5 --graph --decorate --oneline
                pause
                ;;
            5)
                echo ""
                echo -e "${YELLOW}--- Pliki zmienione ---${NC}"
                git status -s
                echo ""
                echo -e "${CYAN}Wpisz treść commita (ENTER aby anulować):${NC}"
                read commit_msg
                
                if [ -z "$commit_msg" ]; then
                    echo -e "${RED}Anulowano.${NC}"
                else
                    echo -e "${CYAN}1. Dodawanie plików (git add .)...${NC}"
                    git add .
                    
                    echo -e "${CYAN}2. Tworzenie commita...${NC}"
                    git commit -m "$commit_msg"
                    
                    echo -e "${CYAN}3. Wysyłanie na serwer (git push)...${NC}"
                    git push
                    
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}✅ Sukces! Zmiany wysłane na GitHub.${NC}"
                    else
                        echo -e "${RED}❌ Błąd wysyłania! (Sprawdź token/hasło lub czy repo nie ma konfliktów).${NC}"
                    fi
                fi
                pause
                ;;
            0)
                break
                ;;
            *)
                echo -e "${RED}Nieprawidłowa opcja!${NC}"
                sleep 1
                ;;
        esac
    done
    cd "$ROOT_DIR"
}

while true; do
    clear
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${YELLOW}       KIRA PROJECT MANAGER (PM2)        ${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    echo -e "STATUS PROCESÓW:"
    pm2 status | grep -E "kira-|App name" --color=never
    echo ""
    echo -e "${BLUE}--- URUCHAMIANIE (START) ---${NC}"
    echo "1. 🚀 Uruchom WSZYSTKO (API + Bot + Web)"
    echo "2. 🔌 Uruchom tylko API"
    echo "3. 🤖 Uruchom tylko Bota"
    echo "4. 🌐 Uruchom tylko Web"
    echo ""
    echo -e "${BLUE}--- RESTARTOWANIE ---${NC}"
    echo "5. 🔄 Restartuj WSZYSTKO"
    echo "6. 🔄 Restartuj API"
    echo "7. 🔄 Restartuj Bota"
    echo "8. 🔄 Restartuj Web"
    echo ""
    echo -e "${BLUE}--- ZATRZYMYWANIE I INNE ---${NC}"
    echo "9. 🛑 Zatrzymaj WSZYSTKO"
    echo "10. 🔨 Zbuduj Stronę (npm run build)"
    echo "11. 📊 Podgląd logów (PM2 Monit)"
    echo "12. 🗑️ Usuń procesy z PM2"
    echo ""
    echo -e "${BLUE}--- ROZSZERZONE ---${NC}"
    echo "13. 📦 Pełny Backup (pliki + baza danych)"
    echo "14. 📱 Zbuduj Android APK"
    echo "15. 🐙 Zarządzanie GitHub (Push/Pull)"
    echo "0.  ❌ Wyjście"
    echo ""
    read -p "Wybierz opcję: " choice

    case $choice in
        1)
            pm2 delete kira-api kira-bot kira-web 2>/dev/null
            start_api
            start_bot
            start_web
            echo -e "${GREEN}Wszystkie serwisy zostały uruchomione w tle!${NC}"
            pause
            ;;
        2)
            pm2 delete kira-api 2>/dev/null
            start_api
            pause
            ;;
        3)
            pm2 delete kira-bot 2>/dev/null
            start_bot
            pause
            ;;
        4)
            pm2 delete kira-web 2>/dev/null
            start_web
            pause
            ;;
        5)
            pm2 restart kira-api kira-bot kira-web
            echo -e "${GREEN}Wszystkie serwisy zrestartowane.${NC}"
            pause
            ;;
        6)
            pm2 restart kira-api
            pause
            ;;
        7)
            pm2 restart kira-bot
            pause
            ;;
        8)
            pm2 restart kira-web
            pause
            ;;
        9)
            pm2 stop kira-api kira-bot kira-web
            echo -e "${RED}Wszystkie serwisy zatrzymane.${NC}"
            pause
            ;;
        10)
            build_web
            pause
            ;;
        11)
            pm2 monit
            ;;
        12)
            pm2 delete kira-api kira-bot kira-web
            echo -e "${RED}Procesy usunięte z listy PM2.${NC}"
            pause
            ;;
        13)
            backup_full
            pause
            ;;
        14)
            build_apk
            pause
            ;;
        15)
            manage_git
            ;;
        0)
            echo "Do widzenia!"
            exit 0
            ;;
        *)
            echo -e "${RED}Nieprawidłowa opcja!${NC}"
            pause
            ;;
    esac
done