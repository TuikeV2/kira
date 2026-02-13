
# ANALIZA INTEGRACJI: Panel ↔ Bot ↔ API

## A. Architektura komunikacji

```
Web Panel  --HTTP-->  API (Express, port 3001)  --HTTP-->  Bot Internal API (port 3002)
                           |                                        |
                           +------------- MariaDB -----------------+
                                      (shared models)
```

- **Web → API**: standardowe REST wywołania z JWT auth
- **API → Bot**: tylko muzyka (przez internal API z shared secret)
- **API → Discord**: bezpośrednie wywołania Discord REST API z `DISCORD_BOT_TOKEN` (kanały, role, embeddy)
- **Bot → API**: nigdy — bot nie woła API, oba czytają/piszą do wspólnej bazy

---

## B. Niezaimplementowane funkcje (panel zapisuje, bot ignoruje)

### B1. `music.djRoleId` — niezaimplementowane
- **Panel zapisuje**: `packages/web/src/components/dashboard/modules/MusicTab.jsx:23`
- **Bot ignoruje**: szukanie `djRoleId` w `packages/bot/src/` — 0 wyników
- **Efekt**: użytkownik ustawia "DJ Role" w panelu, ale bot nie sprawdza tej roli przy komendach muzycznych. Ustawienie nie ma żadnego efektu.

### B2. `botAvatarUrl` — zapisane, ale nigdy nie stosowane
- **Panel zapisuje**: `packages/web/src/components/dashboard/modules/BotCustomizationTab.jsx:17`
- **Bot ma funkcję**: `packages/bot/src/utils/botCustomization.js:76` — `applyGlobalBotAvatar()` istnieje
- **Ale nigdy nie jest wywoływana**: `packages/bot/src/events/ready.js` wywołuje `applyCustomizationToAllGuilds()`, która aplikuje tylko `botNickname`, nie avatar
- **Efekt**: zmiana avatara w panelu nie robi nic

### B3. `levelingIgnoredRoles` — zduplikowane/nieużywane pole
- **Panel zapisuje**: `packages/web/src/components/dashboard/modules/LevelingTab.jsx:40` — pole `levelingIgnoredRoles: []`
- **Bot czyta inne pole**: `packages/bot/src/events/messageCreate.js:207` — bot sprawdza `levelingNoXpRoles`, NIE `levelingIgnoredRoles`
- **Efekt**: panel ma pole "Ignored Roles" w leveling tab, ale bot go nie czyta. Prawdopodobnie duplikat `levelingNoXpRoles` z inną nazwą.

---

## C. Nieistniejące endpointy (Web woła → 404)

### C1. `purchaseService.getAvailableServers()` — endpoint nie istnieje
- **Web**: `packages/web/src/services/api.service.js:148` — `api.get('/api/purchase/servers')`
- **API**: brak takiej trasy w `packages/api/src/routes/purchase.routes.js`
- **Status**: martwy kod — żadna strona nie wywołuje tej metody, ale może powodować zamieszanie

### C2. `promoCodeService.getStats(id)` — endpoint nie istnieje
- **Web**: `packages/web/src/services/api.service.js:184` — `api.get('/api/promo-codes/${id}/stats')`
- **API**: brak trasy `/:id/stats` w `packages/api/src/routes/promoCode.routes.js`
- **Status**: martwy kod — żadna strona nie wywołuje tej metody

---

## D. Martwe endpointy API (istnieją, nikt nie woła)

### D1. `POST /api/licenses/extend` — brak UI
- **API**: `packages/api/src/routes/license.routes.js:13`
- **Web**: `licenseService` nie ma metody `extend`
- **Efekt**: funkcja przedłużania licencji istnieje w backendzie, ale panel nie ma przycisku do jej użycia

### D2. `POST /api/licenses/stack` — brak UI
- **API**: `packages/api/src/routes/license.routes.js:14`
- **Web**: `licenseService` nie ma metody `stack`
- **Efekt**: stackowanie licencji (opisane w CLAUDE.md jako feature) istnieje w API, ale nie ma interfejsu w panelu

### D3. `PUT /api/admin/products/reorder` — brak UI
- **API**: `packages/api/src/routes/admin.routes.js:284`
- **Web**: żadna strona nie woła tego endpointu

### D4. `GET /music/:guildId/voice-channels` — martwy endpoint bota
- **Bot internal API**: `packages/bot/src/internal-api.js:257`
- **API**: nigdy nie woła tego endpointu (kanały głosowe pobiera bezpośrednio z Discord REST API)

---

## E. Zduplikowane trasy w routerze React

### E1. `/licenses` i `/admin/licenses` → ten sam komponent
- **Router**: `packages/web/src/App.jsx:71` i `:143`
- Obie trasy renderują `<Licenses />`. Komponent wewnętrznie sprawdza `user.role !== 'ADMIN'` i wyświetla "Access Denied" dla nie-adminów.
- **Efekt**: trasa `/licenses` (bez prefixu admin) jest bezużyteczna — i tak wymaga admina

### E2. `/promo-codes` i `/admin/promo-codes` → ten sam komponent
- **Router**: `packages/web/src/App.jsx:118` i `:151`
- Identyczny wzorzec jak powyżej — `<PromoCodes />` ma wbudowany check na admina

---

## F. Niespójności w kodzie

### F1. AdminServers i AdminProducts pomijają `adminService`
- `packages/web/src/pages/admin/AdminServers.jsx:21` — woła `api.get('/api/admin/servers')` bezpośrednio
- `packages/web/src/pages/admin/AdminProducts.jsx:39,79,98,101` — wszystkie CRUD operacje przez bezpośrednie `api` wywołania
- Reszta admin stron używa `adminService` — niespójna architektura

### F2. Account.jsx woła admin-only endpoint
- `packages/web/src/pages/Account.jsx:21` — `licenseService.getAll({ userId: user.id })`
- Ten endpoint wymaga `requireAdmin` middleware → zawsze 403 dla zwykłych userów
- **Mitygowane**: `.catch(() => ({ data: { data: [] } }))` — cichy fallback, ale zbędne żądanie

### F3. Model `UserLevel` — brak API
- Bot pisze i czyta dane XP/level (`messageCreate.js`, `voiceXp.js`)
- **API nie ma żadnego endpointu** do odczytu danych levelingu
- **Efekt**: panel nie może wyświetlić leaderboardu ani statystyk XP

---

## G. Ustawienia które DZIAŁAJĄ poprawnie

| Funkcja | Panel (zapisuje) | Bot (czyta) | Status |
|---------|-------------------|-------------|--------|
| Welcome/goodbye messages | JoinLeaveTab | guildMemberAdd/Remove | OK |
| AutoMod (spam, flood, linki) | AutoModTab | automod.js | OK (konwersja ms↔s poprawna) |
| Leveling (XP, multiplier, kanały) | LevelingTab | messageCreate/voiceXp | OK |
| Temp voice channels | TempVoiceTab | tempVoice.js | OK |
| Stats channels | StatsChannelsTab | statsUpdater.js | OK |
| Reaction roles | ReactionRolesTab | messageReactionAdd/Remove | OK |
| Invite logging | InviteLoggerTab | guildMemberAdd | OK |
| Music (enabled, 24/7, volume, playlist) | MusicTab | musicManager.js | OK |
| Custom command prefix | OverviewTab | messageCreate | OK |
| Bot nickname | BotCustomizationTab | botCustomization.js | OK |

---

## H. Podsumowanie priorytetów

| Priorytet | Problem | Wpływ |
|-----------|---------|-------|
| **WYSOKI** | B1: djRoleId niezaimplementowane | Użytkownicy myślą że DJ role działa |
| **WYSOKI** | D1-D2: extend/stack licencji bez UI | Zadeklarowane feature bez interfejsu |
| **ŚREDNI** | B2: botAvatarUrl nie stosowane | Ustawienie w panelu nie działa |
| **ŚREDNI** | B3: levelingIgnoredRoles vs levelingNoXpRoles | Pole w panelu bez efektu |
| **ŚREDNI** | F3: brak API do levelingu | Panel nie pokazuje XP/leaderboard |
| **NISKI** | C1-C2: martwe metody w api.service | Zaśmiecony kod |
| **NISKI** | D3-D4: martwe endpointy | Nieużywany kod |
| **NISKI** | E1-E2: zduplikowane trasy | Zbędne wpisy w routerze |
| **NISKI** | F1-F2: niespójności w kodzie | Architektura do uporządkowania |
