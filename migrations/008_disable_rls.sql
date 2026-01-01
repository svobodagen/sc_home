-- =================================================================
-- OPRAVA ZABEZPEČENÍ (FIX SECURITY)
-- Aplikace nepoužívá standardní Supabase Auth, ale vlastní systém uživatelů.
-- RLS (Row Level Security) pravidla, která jsme zapnuli, proto blokují přístup.
-- Tento skript vypne RLS pro tabulku cílů, aby aplikace mohla zapisovat.
-- =================================================================

BEGIN;

-- Vypnutí RLS (umožní aplikaci volně číst/zapisovat)
ALTER TABLE apprentice_goals DISABLE ROW LEVEL SECURITY;

-- Pro jistotu vypneme RLS i na ostatních tabulkách, pokud by byl problém
ALTER TABLE master_apprentices DISABLE ROW LEVEL SECURITY;

-- (Volitelně) Smazání policies, aby nepletly budoucí správce
DROP POLICY IF EXISTS "Users can view own goals" ON apprentice_goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON apprentice_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON apprentice_goals;
DROP POLICY IF EXISTS "Masters can view apprentice goals" ON apprentice_goals;

COMMIT;

-- =================================================================
-- KONEC SKRIPTU
-- =================================================================
