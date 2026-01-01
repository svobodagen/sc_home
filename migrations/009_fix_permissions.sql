-- =================================================================
-- DEFINITIVNÍ OPRAVA OPRÁVNĚNÍ (FORCE FIX PERMISSIONS)
-- 1. Vypne RLS (všichni mají přístup)
-- 2. Přidělí práva rolím 'anon' a 'authenticated', aby mohly zapisovat.
-- =================================================================

BEGIN;

-- 1. Vypnutí RLS na všech relevantních tabulkách
ALTER TABLE apprentice_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE master_apprentices DISABLE ROW LEVEL SECURITY;

-- 2. Přidělení práv (GRANT) pro role 'anon' (nepřihlášený) a 'authenticated' (přihlášený)
-- Toto je nutné, protože pouze vypnutí RLS někdy nestačí, pokud role nemá právo INSERT/UPDATE.

GRANT ALL ON TABLE apprentice_goals TO anon;
GRANT ALL ON TABLE apprentice_goals TO authenticated;
GRANT ALL ON TABLE apprentice_goals TO service_role;

GRANT ALL ON TABLE master_apprentices TO anon;
GRANT ALL ON TABLE master_apprentices TO authenticated;
GRANT ALL ON TABLE master_apprentices TO service_role;

-- Povolení použití sekvence pro ID (pokud se používá auto-increment)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMIT;

-- =================================================================
-- KONEC SKRIPTU
-- Nyní by už neměla existovat žádná překážka pro uložení dat.
-- =================================================================
