-- =================================================================
-- ZAČÁTEK SQL SKRIPTU (KOPÍRUJTE OD TÉTO ŘÁDKY DOLŮ)
-- =================================================================

-- Tabulka pro uložení cílů učedníka
-- Spusť tento SQL příkaz v Supabase SQL Editoru

-- 1. Nejprve se ujistíme, že existuje tabulka users (pokud nebyla vytvořena)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  password TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabulka pro cíle
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
  UNIQUE(user_id)
);

-- Index pro rychlejší vyhledávání podle userID
CREATE INDEX IF NOT EXISTS idx_apprentice_goals_user_id ON apprentice_goals(user_id);

-- =================================================================
-- KONEC SQL SKRIPTU
-- =================================================================
