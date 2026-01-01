-- =================================================================
-- ZAČÁTEK SQL SKRIPTU (KOPÍRUJTE OD TÉTO ŘÁDKY DOLŮ)
-- =================================================================

-- Povolení RLS na tabulce apprentice_goals
ALTER TABLE apprentice_goals ENABLE ROW LEVEL SECURITY;

-- 1. Policy pro čtení (Uživatel může číst pouze své cíle)
CREATE POLICY "Users can view own goals"
ON apprentice_goals FOR SELECT
USING (auth.uid()::text = user_id);

-- 2. Policy pro vkládání (Uživatel může vkládat pouze své cíle)
CREATE POLICY "Users can insert own goals"
ON apprentice_goals FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- 3. Policy pro update (Uživatel může upravovat pouze své cíle)
CREATE POLICY "Users can update own goals"
ON apprentice_goals FOR UPDATE
USING (auth.uid()::text = user_id);

-- Ujistíme se, že existuje tabulka master_apprentices
CREATE TABLE IF NOT EXISTS master_apprentices (
  id SERIAL PRIMARY KEY,
  master_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  apprentice_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  apprentice_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(master_id, apprentice_id)
);

-- 4. Policy pro mistry (Mistr může číst cíle svých učedníků)
-- Předpokládá existenci tabulky master_apprentices
CREATE POLICY "Masters can view apprentice goals"
ON apprentice_goals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM master_apprentices
    WHERE master_apprentices.apprentice_id = apprentice_goals.user_id
    AND master_apprentices.master_id = auth.uid()::text
  )
);

-- =================================================================
-- KONEC SQL SKRIPTU
-- =================================================================
