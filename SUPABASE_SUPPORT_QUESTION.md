# Dotaz pro Supabase Support

## Situace
Mám Node.js Express backend na Replitu, který se připojuje k Supabase PostgreSQL. Frontend (Expo) volá backend přes veřejnou Replit URL bez portu (jak jste doporučili).

## Problém
1. **Backend terminuje se stavem 143** - proces se automaticky zabíjí / nespouští
2. **Frontend dostane HTML chybu místo JSON** - hlásí "Unexpected token '<'" v json() parse
3. **Chyba v API:** `Failed to fetch` z prohlížeče

## Kód backendu

```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

app.get("/api/test/:userId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("test_data")
      .select("test_value")
      .eq("user_id", userId)
      .single();
    
    if (error) return res.json({ test_value: null });
    res.json({ ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ Server running on ${PORT}`);
});
```

## Otázky
1. **Jaké mohou být příčiny, že Supabase client se nespustí a zabije proces?** (SIGTERM 143)
2. **Jak správně spustit Node.js backend na Replitu tak, aby běžel nepřetržitě?** Máme frontend na portu 8081, měl by backend mít speciální nastavení?
3. **Máme SUPABASE_SERVICE_KEY ve secrets - je správné ho používat z backendu?** Nebo bychom měli místo toho použít ANON_KEY s RLS policies?
4. **Jakým způsobem debugovat, proč server vrací HTML chybu místo JSON odpovědi?** (Jak zjistit, jestli jde o 404, 500, nebo chybu v Supabase klientu?)
5. **Jak zajistit, že Supabase klient se správně inicializuje s environment variables v Replitu?** Jsou nějaké známé problémy?

## Info
- Supabase projekt URL: https://imivlsfkgmqkhqhhiilf.supabase.co
- Replit URL frontendu: https://d43d4c42-caaa-4cf8-b259-4783380bce62-00-3m8g3jenxus1y.kirk.replit.dev
- Node.js v22
- Express.js, CORS povoleno
- Frontend: Expo (React Native)

Děkuji za radu!
