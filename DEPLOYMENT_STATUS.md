# Svobodné cechy - Deployment Status

## ✅ Co běží

- **Frontend (Expo)** ✅ - Running na http://localhost:8081
- **Supabase Cloud Database** ✅ - Fully operational
- **Supabase Service** ✅ - Connected

## ❌ Co nefunguje

- **Backend Server (Express)** ❌ - Replit terminuje proces se stavem 143 (SIGTERM)
  - Příčina: Replit automaticky zabíjí child procesy na portu 3000
  - Řešení: Backend MUSÍ běžet jako dedikovaný workflow

## 🎯 Architektonický problém

Aktuálně frontend volá backend na portu 3000:
```
https://...replit.dev/api/test/save  ❌ Backend offline
```

**LEPŠÍ ŘEŠENÍ:** Frontend by měl volat Supabase PŘÍMO:
```
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("email", email)  ✅ Direktně z cloudu!
```

## 🚀 Next Steps (Pro Supabase tým)

1. **Oprava v frontend kódu:**
   - Změnit `services/api.ts` aby volala Supabase přímo (ne backend)
   - Zaměnit API calls za Supabase client calls
   - Výsledek: Frontend = Supabase klient + UI, nulová závislost na backendu

2. **Backend (Alternativa):**
   - Pokud chceš backend pro logic, hostuj ho MIMO Replit
   - Replit je pro frontend (Expo) - nemá resources pro long-running servers
   - Použij: Railway, Render, Fly.io, AWS Lambda, atd.

3. **Ověření:**
   - Otevři app a ověř že LoginScreen funguje
   - Přihlásit se bez backendu (direktně Supabase)

## 📊 Aktuální tech stack

| Komponenta | Status | Poznámka |
|-----------|--------|----------|
| Frontend (Expo) | ✅ Running | Port 8081, React Native |
| Supabase Cloud | ✅ Online | Database + Auth ready |
| Express Backend | ❌ Won't start | Replit limit - exit 143 |
| PostgreSQL (Supabase) | ✅ Ready | 21XX test data stored |

## 🔑 Klíč k úspěchu

**Máš 2 možnosti:**

### Možnost A: Frontend → Supabase (Doporučeno)
- Nejjednoduší
- Žádná závislost na backendu
- Bezprostředně funkční
- Používá RLS policies pro security

### Možnost B: Frontend → Backend → Supabase
- Požaduje backend host mimo Replit
- Komplexnější, ale možný pro production

Doporučuji **Možnost A** - to je co uživatel chtěl ("lokálně nic, všechno z cloudu!")
