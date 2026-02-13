#!/bin/bash

# Kolory dla lepszej czytelności
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ścieżka główna projektu
ROOT_DIR="/home/debian/kira"

# Sprawdzenie czy PM2 jest zainstalowane
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 nie jest zainstalowane!${NC}"
    echo -e "Instaluję PM2 globalnie..."
    npm install -g pm2
    echo -e "${GREEN}PM2 zainstalowane.${NC}"
    sleep 2
fi

# Funkcja pauzy
pause() {
    echo ""
    read -n 1 -s -r -p "Naciśnij dowolny klawisz, aby wrócić do menu..."
}

# Funkcja pełnego backupu
backup_full() {
    BACKUP_DIR="$ROOT_DIR/backups"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_NAME="kira_backup_${TIMESTAMP}"
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

    echo -e "${CYAN}📦 Rozpoczynam pełny backup...${NC}"
    echo ""

    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        echo -e "${GREEN}✓ Utworzono katalog backupów${NC}"
    fi

    mkdir -p "$BACKUP_PATH"

    echo -e "${YELLOW}[1/3] Tworzenie archiwum plików projektu...${NC}"
    cd "$ROOT_DIR"

    tar --exclude='node_modules' \
        --exclude='.git' \
        --exclude='backups' \
        --exclude='dist' \
        --exclude='*.log' \
        --exclude='.env' \
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
            echo -e "${YELLOW}⚠ Nie udało się utworzyć zrzutu bazy (sprawdź dane dostępowe)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ mysqldump nie jest zainstalowany - pomijam zrzut bazy${NC}"
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

# Funkcja budowania strony
build_web() {
    echo -e "${CYAN}🔨 Kompilowanie Panelu Web...${NC}"
    cd "$ROOT_DIR/packages/web" || return
    npm run build
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Kompilacja zakończona sukcesem!${NC}"
    else
        echo -e "${RED}❌ Błąd kompilacji!${NC}"
    fi
    # Powrót do głównego katalogu nie jest konieczny w skrypcie, ale dobra praktyka
    cd "$ROOT_DIR"
}

# Funkcja startu API
start_api() {
    echo -e "${CYAN}🚀 Uruchamianie API...${NC}"
    # --cwd ustawia katalog roboczy na folder API, dzięki temu widzi .env
    pm2 start src/index.js --name "kira-api" --cwd "$ROOT_DIR/packages/api"
}

# Funkcja startu Bota
start_bot() {
    echo -e "${CYAN}🤖 Uruchamianie Bota...${NC}"
    # --cwd ustawia katalog roboczy na folder Bota, dzięki temu widzi .env i token
    pm2 start src/index.js --name "kira-bot" --cwd "$ROOT_DIR/packages/bot"
}

# Funkcja startu Web
start_web() {
    echo -e "${CYAN}🌐 Uruchamianie Panelu Web...${NC}"
    # --cwd ustawia katalog roboczy na folder Web
    pm2 start npm --name "kira-web" --cwd "$ROOT_DIR/packages/web" -- run preview
}

# Główne Menu
while true; do
    clear
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${YELLOW}       KIRA PROJECT MANAGER (PM2)        ${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    echo -e "STATUS PROCESÓW:"
    # Wyświetla status procesów Kira
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
    echo -e "${BLUE}--- BACKUP ---${NC}"
    echo "13. 📦 Pełny Backup (pliki + baza danych)"
    echo "0.  ❌ Wyjście"
    echo ""
    read -p "Wybierz opcję: " choice

    case $choice in
        1)
            # Najpierw usuwamy stare procesy, aby upewnić się, że wstaną z nowym configiem (--cwd)
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
