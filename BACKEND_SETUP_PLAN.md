# Backend Setup - Co je potřeba udělat

## Problém
Backend server.js se nespouští jako standalone proces na portu 3000. Replit terminuje process se stavem 143 (SIGTERM).

## Příčina
- Frontend (Expo) běží na portu 8081 - to je primární workflow "Start application"
- Backend (Express) by měl běžet na portu 3000, ale není spuštěn
- Potřebujeme DVĚ WORKFLOW: jednu pro frontend, jednu pro backend

## Řešení - Co dělat dál:

### Krok 1: Vytvořit nový workflow pro backend
V Replit UI:
1. Klikni na "Workflows" v levém panelu
2. Klikni "+ New Workflow"
3. Název: "Start backend"
4. Command: `PORT=3000 node /home/runner/workspace/server.js`
5. Ulož

### Krok 2: Spustit workflows
1. V přehledu klikni "Start backend" → Start
2. V přehledu klikni "Start application" → Start (pokud není)
3. Oba by měly běžet souběžně

### Krok 3: Ověřit
- Backend: https://d43d4c42-caaa-...replit.dev/health (mělo by vrátit JSON)
- Frontend: https://d43d4c42-caaa-...replit.dev (mělo by se načíst Expo aplikace)

## Co jsem udělal pro backend:

✅ Přidal `/health` endpoint - vrátí `{ status: "ok" }`
✅ Přidal `/` endpoint - vrátí info o serveru
✅ Přidal debug logy - vidíš co se děje při startu
✅ Přidał JSON error handler - veškeré chyby budou jako JSON
✅ Přidań SIGTERM handler - korektní vypnutí

## Backend Features:
- CORS povoleno (`origin: "*"`)
- Supabase integrace (SERVICE_KEY)
- 3 API groupy: Auth, User Data, Master-Apprentice
- Error logging s stack trace
- Health check pro monitoring

## Poznámka od Supabase:
Backend MUSÍ běžet nepřetržitě na separátním procesu/serveru. V Replit to znamená druhý workflow.

## Pokud se backend ani s workflow nespustí:
1. Zkontroluj Secrets v Replit - ověř že SUPABASE_URL a SUPABASE_SERVICE_KEY existují
2. Zkontroluj port - jestli 3000 není obsazený
3. Zkontroluj RAM - Replit má limity
