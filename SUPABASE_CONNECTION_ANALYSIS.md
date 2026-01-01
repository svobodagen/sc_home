# Detailní Analýza: Textové Pole → Supabase

## 📍 ARCHITEKTURA - Kompletní Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        APLIKACE (Expo)                           │
│                       Port 8081 (browser)                         │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ 1️⃣ FRONTEND - React Native
         │    - LoginScreen.tsx (textové pole)
         │    - Endpoint: /api/test/save (POST) a /api/test/{id} (GET)
         │    - Metoda: api.post(), api.get()
         │
         ↓ fetch() s JSON
┌─────────────────────────────────────────────────────────────────┐
│                      CORS KOMUNIKACE                             │
│   https://d43d4c42-caaa-4cf8-b259-4783380bce62...kirk.replit.dev │
│                      :3000 (backend)                              │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ 2️⃣ BACKEND - Express.js (server.js)
         │    - Endpoint: POST /api/test/save
         │    - Endpoint: GET /api/test/{userId}
         │    - Supabase client
         │
         ↓ Supabase JS SDK
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLOUD                                 │
│    https://imivlsfkgmqkhqhhiilf.supabase.co                       │
│                  PostgreSQL Database                              │
│                      (tabulka: test_data)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 1. FRONTEND - LoginScreen.tsx

### Textové pole (UI komponenta):
```typescript
// Řádky 218-235 v LoginScreen.tsx
<TextInput
  value={testSqlValue}
  onChangeText={setTestSqlValue}
  placeholder="Napiš text..."
  style={styles.input}
/>

<Pressable onPress={handleSaveTestSql} disabled={testLoading}>
  <ThemedText>💾 Ulož do cloudu</ThemedText>
</Pressable>
```

### Uložení do cloudu - Funkce:
```typescript
// Řádky 67-83
const handleSaveTestSql = async () => {
  setTestLoading(true);
  setTestStatus("💾 Ukládám do cloudu...");

  try {
    // VOLÁNÍ API - TEXTOVÉ POLE → BACKEND
    await api.saveTestValue("test_shared", testSqlValue);
    setSavedTestValue(testSqlValue);
    setTestStatus(`✅ Uloženo v cloudu: "${testSqlValue}"`);
  } catch (err) {
    setTestStatus("⚠️ Cloud server není dostupný");
  } finally {
    setTestLoading(false);
  }
};
```

### Co se pošle na backend:
```json
POST https://.../...replit.dev:3000/api/test/save
Content-Type: application/json

{
  "userId": "test_shared",
  "testValue": "Obsah textového pole"
}
```

---

## 🔧 2. BACKEND - Express.js (server.js)

### CORS Nastavení (řádky 8-16):
```javascript
const corsOptions = {
  origin: "*",                    // Povolit ALL domains
  credentials: false,              // No credentials needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());
```

**Proč je to důležité:** Bez správného CORS, prohlížeč blokuje požadavek s chybou "Failed to fetch".

### Supabase Inicializace (řádky 18-22):
```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,              // https://imivlsfkgmqkhqhhiilf.supabase.co
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);
```

**Credentials:**
- `SUPABASE_URL`: https://imivlsfkgmqkhqhhiilf.supabase.co
- `SUPABASE_SERVICE_KEY`: eyJhbGciOiJIUzI1NiIs... (ADMIN klíč)
- `SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIs... (Public klíč)

**Důležité:** SERVICE_KEY se používá protože server je backend - má admin práva.

### API Endpoint: Uložení (řádky v server.js - níže je pseudokód):

```javascript
app.post("/api/test/save", async (req, res) => {
  try {
    const { userId, testValue } = req.body;
    
    // Upsert = INSERT or UPDATE
    const { error } = await supabase
      .from("test_data")
      .upsert({
        user_id: userId,        // "test_shared"
        test_value: testValue,  // Obsah z textového pole
        updated_at: new Date()
      }, 
      { onConflict: "user_id" }  // Pokud existuje, update
    );
    
    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### API Endpoint: Načtení (GET):

```javascript
app.get("/api/test/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from("test_data")
      .select("test_value")
      .eq("user_id", userId)
      .single();  // Jen jeden řádek
    
    if (error) throw new Error(error.message);
    res.json(data);  // { test_value: "obsah z databáze" }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🗄️ 3. SUPABASE - PostgreSQL

### Tabulka: test_data

```sql
CREATE TABLE IF NOT EXISTS test_data (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_data_user_id ON test_data(user_id);
```

### Strukturu dat v databázi:

```
┌────┬──────────────┬────────────────────────┬──────────────────┐
│ id │  user_id     │   test_value           │   updated_at     │
├────┼──────────────┼────────────────────────┼──────────────────┤
│ 1  │ test_shared  │ "Obsah z textového pole"│ 2025-11-29 10:00│
│ 2  │ user_123     │ "Jiný obsah"           │ 2025-11-29 10:05│
└────┴──────────────┴────────────────────────┴──────────────────┘
```

### Raw SQL - Co se ve skutečnosti spouští:

```sql
-- INSERT nebo UPDATE
INSERT INTO test_data (user_id, test_value, updated_at)
VALUES ('test_shared', 'Obsah z textového pole', NOW())
ON CONFLICT (user_id) DO UPDATE SET
  test_value = 'Obsah z textového pole',
  updated_at = NOW();

-- SELECT
SELECT test_value FROM test_data WHERE user_id = 'test_shared';
```

---

## 🔄 KOMPLETNÍ FLOW - Krok za krokem

### Scénář: Uživatel napíše "Ahoj 👋" a klikne "Ulož do cloudu"

**Krok 1:** Frontend - TextInput
```
testSqlValue = "Ahoj 👋"
```

**Krok 2:** Frontend - API Call
```typescript
await api.saveTestValue("test_shared", "Ahoj 👋");
```
→ Generuje:
```javascript
fetch("https://d43d4c42-caaa-4cf8-b259-4783380bce62...replit.dev:3000/api/test/save", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: "test_shared", testValue: "Ahoj 👋" })
})
```

**Krok 3:** Backend - Express mě příjme
```javascript
req.body = { userId: "test_shared", testValue: "Ahoj 👋" }
```

**Krok 4:** Backend - Supabase upsert
```javascript
supabase.from("test_data").upsert({
  user_id: "test_shared",
  test_value: "Ahoj 👋"
})
```

**Krok 5:** Supabase - PostgreSQL
```
INSERT INTO test_data (user_id, test_value) 
VALUES ('test_shared', 'Ahoj 👋')
ON CONFLICT (user_id) DO UPDATE SET test_value = 'Ahoj 👋'
```

**Krok 6:** Databáze - Uloženo ✅
```
test_data {
  id: 1,
  user_id: "test_shared",
  test_value: "Ahoj 👋",
  updated_at: 2025-11-29 10:15:32
}
```

**Krok 7:** Backend - Vrátí odpověď
```json
{ "success": true }
```

**Krok 8:** Frontend - Zobrazí status
```
setSavedTestValue("Ahoj 👋")
setTestStatus("✅ Uloženo v cloudu: \"Ahoj 👋\"")
```

---

## ⚙️ NASTAVENÍ - Aktuální Konfigurace

### Frontend (services/api.ts):
```typescript
// Port 3000
const API_URL = "https://d43d4c42-caaa-...replit.dev:3000"

// Endpointy:
saveTestValue: (userId, testValue) => api.post("/api/test/save", { userId, testValue })
getTestValue: (userId) => api.get(`/api/test/${userId}`)
```

### Backend (server.js):
```javascript
// PORT=3000 (nastaven env var)
app.listen(3000, "0.0.0.0")

// SUPABASE_URL = https://imivlsfkgmqkhqhhiilf.supabase.co
// SUPABASE_SERVICE_KEY = eyJhbGciOiJIUzI1NiIs...
```

### Supabase:
```
Project URL: https://imivlsfkgmqkhqhhiilf.supabase.co
API Port: 5432 (PostgreSQL)
Tables: users, user_data, test_data, master_apprentices
```

---

## 🚨 Možné Problémy a Řešení

### ❌ Problém 1: "Failed to fetch" v prohlížeči

**Příčina:** CORS blok nebo backend offline

**Debug:**
```bash
# 1. Test backend z terminálů
curl -X GET http://localhost:3000/api/test/test_shared

# 2. Check CORS headers
curl -I -X OPTIONS http://localhost:3000/api/test/save

# 3. Check backend process
ps aux | grep "node.*server.js"
```

**Řešení:** Zkontroluj:
- Backend slouchá na `0.0.0.0:3000`
- CORS je nastaven na `origin: "*"`
- Environment variablesí jsou nastaveí

### ❌ Problém 2: "Žádná data v Supabase"

**Příčina:** INSERT nefunguje nebo tabulka neexistuje

**Debug:**
```sql
-- V Supabase SQL Editor:
SELECT * FROM test_data;

-- Zkontroluj tabulku
\d test_data;

-- Zkontroluj foreign key
SELECT * FROM users WHERE id = 'test_shared';
```

**Řešení:**
1. Zkontroluj, že uživatel "test_shared" existuje v `users` tabulce
2. Spusť SQL migration z `migrations/001_init_schema.sql`
3. Zkontroluj Supabase RLS políčka (Row Level Security)

### ❌ Problém 3: TypeError: Cannot read property 'test_value'

**Příčina:** Frontend očekává `test_value` ale backend vrátí `testValue` (camelCase mismatch)

**Debug v LoginScreen.tsx (řádka 39):**
```typescript
setSavedTestValue(data.test_value || data.testValue || "Žádná data");
```

**Řešení:** Standardizuj field names - buď vždy `test_value` nebo vždy `testValue`.

---

## 📊 Data Format Reference

### POST /api/test/save
```
Frontend odešle:
{
  "userId": "test_shared",
  "testValue": "Obsah z textového pole"
}

Backend v Supabase uloží:
{
  user_id: "test_shared",
  test_value: "Obsah z textového pole",
  updated_at: "2025-11-29T10:15:32.123Z"
}

Backend vrátí:
{
  "success": true
}
```

### GET /api/test/{userId}
```
Frontend požaduje:
GET /api/test/test_shared

Backend z Supabase načte:
{
  test_value: "Obsah z textového pole"
}

Backend vrátí:
{
  "test_value": "Obsah z textového pole"
}
```

---

## 🔐 Security Considerations

### ✅ Aktuálně:
- Backend používá `SERVICE_KEY` (admin access) - OK pro interní operace
- CORS povoluje všechny origins (`origin: "*"`) - OK pro development

### ⚠️ Production:
- CORS by měl být: `origin: "https://yourdomain.com"`
- Potřebuješ authentication (JWT token)
- Supabase RLS policies - kontrola, kdo co může dělat
- Hesla by měla být hašovaná (BCrypt, ne plain text)

---

## 🎯 Klíčové Soubory

1. **Frontend:**
   - `/services/api.ts` - API klient
   - `/screens/LoginScreen.tsx` - UI komponenta (řádky 218-235 textové pole, řádky 67-83 uložení)

2. **Backend:**
   - `/server.js` - Express server, Supabase integrace

3. **Database:**
   - `/migrations/001_init_schema.sql` - SQL schéma

4. **Environment:**
   - `.env` - SUPABASE_URL, SUPABASE_SERVICE_KEY

---

## 📞 Co se Supabase zeptat

1. "Jak správně konfigurovat CORS pro JavaScript frontend?"
2. "Je dostatečné používat SERVICE_KEY z backendu, nebo potřebuju JWT?"
3. "Jak nastavit RLS policies, aby byl backend schopný zápisu?"
4. "Jaké jsou best practices pro password hashing v Supabase?"
5. "Jak správně migrovat data z jedné Supabase databáze do druhé?"
