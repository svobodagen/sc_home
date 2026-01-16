-- 1. Vyčištění starých dat (podle požadavku)
DELETE FROM user_certificates;
DELETE FROM certificate_unlock_rules;
DELETE FROM certificate_templates;

-- 2. Úprava tabulky certificate_templates
-- Přidání sloupců pro nový systém
ALTER TABLE certificate_templates ADD COLUMN item_type TEXT DEFAULT 'BADGE'; -- 'BADGE' nebo 'CERTIFICATE'
ALTER TABLE certificate_templates ADD COLUMN scope TEXT DEFAULT 'GLOBAL';    -- 'GLOBAL' nebo 'PER_MASTER' (jen pro odznaky)

-- Poznámka: Sloupec 'points' a 'category' už by tam měly být z dřívějška, ale pro jistotu:
-- (Pokud neexistují, SQLite alter table add column je bezpečný, pokud už existují, příkaz syntaxe závisí na verzi, 
-- ale v Expo/SQLite většinou ignorujeme nebo řešíme IF NOT EXISTS. Zde předpokládám, že 'points' existuje nebo bylo 'value').
-- Zkontrolujeme schema v dalším kroku, zatím přidáváme klíčové nové sloupce.

-- Typ certifikatu (item_type):
-- 'BADGE' = Automaticky udělovaný na základě pravidel (prácer, studium, projekty)
-- 'CERTIFICATE' = Manuálně udělovaný mistrem

-- Rozsah (scope):
-- 'GLOBAL' = Počítá se ze všech aktivit učedníka dohromady.
-- 'PER_MASTER' = Počítá se pouze z aktivit pod konkrétním mistrem.
