-- Přidání sloupců do certificate_templates, pokud chybí (pro Admin sekci)
ALTER TABLE certificate_templates 
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'BADGE',
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'GLOBAL';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
