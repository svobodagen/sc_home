-- =================================================================
-- KOMPLETNÍ OPRAVNÝ SKRIPT (COMPLETE REPAIR SCRIPT)
-- Tento skript sjednotí vše potřebné: vytvoří tabulky pokud chybí a nastaví práva.
-- Spusťte tento kód v Supabase SQL Editoru.
-- =================================================================

BEGIN;

-- 1. Ujistíme se, že tabulka USERS existuje
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  password TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vytvoříme tabulku APPRENTICE_GOALS (pokud neexistuje)
CREATE TABLE IF NOT EXISTS apprentice_goals (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_goal_week FLOAT DEFAULT 20,
  study_goal_week FLOAT DEFAULT 10,
  work_goal_month FLOAT DEFAULT 80,
  study_goal_month FLOAT DEFAULT 40,
  work_goal_year FLOAT DEFAULT 960,
  study_goal_year FLOAT DEFAULT 480,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT apprentice_goals_user_id_key UNIQUE(user_id)
);

-- Index pro rychlé hledání
CREATE INDEX IF NOT EXISTS idx_apprentice_goals_user_id ON apprentice_goals(user_id);

-- 3. Vytvoříme tabulku MASTER_APPRENTICES (pokud neexistuje)
CREATE TABLE IF NOT EXISTS master_apprentices (
  id SERIAL PRIMARY KEY,
  master_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  apprentice_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  apprentice_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT master_apprentices_unique UNIQUE(master_id, apprentice_id)
);

-- 4. Povolíme RLS (Row Level Security)
ALTER TABLE apprentice_goals ENABLE ROW LEVEL SECURITY;

-- 5. Nastavíme Policies (nejprve smažeme staré, aby nedošlo k chybě "policy exists")
DROP POLICY IF EXISTS "Users can view own goals" ON apprentice_goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON apprentice_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON apprentice_goals;
DROP POLICY IF EXISTS "Masters can view apprentice goals" ON apprentice_goals;

-- Vytvoření nových policies
CREATE POLICY "Users can view own goals"
ON apprentice_goals FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own goals"
ON apprentice_goals FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own goals"
ON apprentice_goals FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Masters can view apprentice goals"
ON apprentice_goals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM master_apprentices
    WHERE master_apprentices.apprentice_id = apprentice_goals.user_id
    AND master_apprentices.master_id = auth.uid()::text
  )
);

COMMIT;

-- =================================================================
-- KONEC SKRIPTU - Pokud vidíte "Success", je vše hotovo.
-- =================================================================
