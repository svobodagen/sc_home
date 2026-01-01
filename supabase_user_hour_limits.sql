-- SQL skript pro vytvoření tabulky user_hour_limits v Supabase
-- Spusťte tento skript v Supabase SQL Editor

-- 1. Vytvořte tabulku pro individuální limity učedníků
CREATE TABLE IF NOT EXISTS user_hour_limits (
  user_id VARCHAR(255) PRIMARY KEY,
  max_work_hours_day DECIMAL(10,2) DEFAULT 8,
  max_study_hours_day DECIMAL(10,2) DEFAULT 4,
  max_work_hours_week DECIMAL(10,2) DEFAULT 40,
  max_study_hours_week DECIMAL(10,2) DEFAULT 20,
  max_work_hours_month DECIMAL(10,2) DEFAULT 160,
  max_study_hours_month DECIMAL(10,2) DEFAULT 80,
  max_work_hours_year DECIMAL(10,2) DEFAULT 1920,
  max_study_hours_year DECIMAL(10,2) DEFAULT 960,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Přidejte chybějící sloupce do admin_settings (pokud neexistují)
ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS max_work_hours_year DECIMAL(10,2) DEFAULT 1920;

ALTER TABLE admin_settings 
ADD COLUMN IF NOT EXISTS max_study_hours_year DECIMAL(10,2) DEFAULT 960;

-- 3. Vytvořte limity pro VŠECHNY existující učedníky z aktuálního admin nastavení
-- Toto zajistí, že existující učedníci budou mít své vlastní záznamy
INSERT INTO user_hour_limits (user_id, max_work_hours_day, max_study_hours_day, max_work_hours_week, max_study_hours_week, max_work_hours_month, max_study_hours_month, max_work_hours_year, max_study_hours_year)
SELECT 
  u.id,
  COALESCE((SELECT max_work_hours_day FROM admin_settings WHERE id = 1), 8),
  COALESCE((SELECT max_study_hours_day FROM admin_settings WHERE id = 1), 4),
  COALESCE((SELECT max_work_hours_week FROM admin_settings WHERE id = 1), 40),
  COALESCE((SELECT max_study_hours_week FROM admin_settings WHERE id = 1), 20),
  COALESCE((SELECT max_work_hours_month FROM admin_settings WHERE id = 1), 160),
  COALESCE((SELECT max_study_hours_month FROM admin_settings WHERE id = 1), 80),
  COALESCE((SELECT max_work_hours_year FROM admin_settings WHERE id = 1), 1920),
  COALESCE((SELECT max_study_hours_year FROM admin_settings WHERE id = 1), 960)
FROM users u 
WHERE u.role = 'Učedník'
ON CONFLICT (user_id) DO NOTHING;

-- 4. Povolte RLS (Row Level Security) pro tabulku
ALTER TABLE user_hour_limits ENABLE ROW LEVEL SECURITY;

-- 5. Vytvořte politiky pro přístup k tabulce
CREATE POLICY "Allow all operations on user_hour_limits" ON user_hour_limits
  FOR ALL USING (true) WITH CHECK (true);

-- Hotovo! Po spuštění tohoto skriptu budou existující učedníci mít své vlastní limity
-- a změna admin nastavení je neovlivní.
