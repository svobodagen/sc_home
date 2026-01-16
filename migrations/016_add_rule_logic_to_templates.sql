ALTER TABLE certificate_templates ADD COLUMN rule_logic TEXT CHECK (rule_logic IN ('AND', 'OR')) DEFAULT 'AND';
