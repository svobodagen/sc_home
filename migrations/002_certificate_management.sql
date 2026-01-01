-- Migration: Certificate Management System
-- Vytváří systém pro správu certifikátů a pravidel pro jejich odemykání

-- Tabulka: Šablony certifikátů (master list)
CREATE TABLE IF NOT EXISTS certificate_templates (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Badge', 'Certifikát')),
  points INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  visible_to_all BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabulka: Pravidla pro odemknutí certifikátů
CREATE TABLE IF NOT EXISTS certificate_unlock_rules (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES certificate_templates(id) ON DELETE CASCADE,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('MANUAL', 'AUTO')),
  condition_type VARCHAR(50) CHECK (condition_type IN ('WORK_HOURS', 'STUDY_HOURS', 'TOTAL_HOURS', 'POINTS', 'PROJECTS', 'NONE')),
  condition_value INTEGER,
  description VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabulka: Historie odemknutí certifikátů
CREATE TABLE IF NOT EXISTS certificate_unlock_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id INTEGER NOT NULL REFERENCES certificate_templates(id) ON DELETE CASCADE,
  unlocked_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  rule_id INTEGER REFERENCES certificate_unlock_rules(id) ON DELETE SET NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabulka: Odkaz uživatelů na odemčené certifikáty (user_certificates)
CREATE TABLE IF NOT EXISTS user_certificates (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id INTEGER NOT NULL REFERENCES certificate_templates(id) ON DELETE CASCADE,
  locked BOOLEAN NOT NULL DEFAULT true,
  earned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, template_id)
);

-- Indexy pro výkon
CREATE INDEX IF NOT EXISTS idx_certificate_unlock_rules_template_id ON certificate_unlock_rules(template_id);
CREATE INDEX IF NOT EXISTS idx_certificate_unlock_history_user_id ON certificate_unlock_history(user_id);
CREATE INDEX IF NOT EXISTS idx_certificate_unlock_history_template_id ON certificate_unlock_history(template_id);
CREATE INDEX IF NOT EXISTS idx_user_certificates_user_id ON user_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_certificates_template_id ON user_certificates(template_id);

-- Migrace stávajících certifikátů do nové struktury
-- Vytvoř šablony z existujících certifikátů
INSERT INTO certificate_templates (title, category, points, description, visible_to_all)
SELECT DISTINCT title, category, points, requirement, true
FROM certificates
ON CONFLICT DO NOTHING;

-- Vytvoř user_certificates z existujících certifikátů
INSERT INTO user_certificates (user_id, template_id, locked, earned_at)
SELECT c.user_id, ct.id, c.locked, c.earned_at
FROM certificates c
LEFT JOIN certificate_templates ct ON c.title = ct.title AND c.category = ct.category
WHERE ct.id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Přidat výchozí pravidla pro Začátečníka (žádné pravidlo - vždy odemčeno)
INSERT INTO certificate_unlock_rules (template_id, rule_type, condition_type, description)
SELECT id, 'AUTO', 'NONE', 'Automaticky odemčeno všem'
FROM certificate_templates
WHERE title = 'Začátečník'
ON CONFLICT DO NOTHING;

-- Přidat pravidlo pro Prače (100 hodin práce)
INSERT INTO certificate_unlock_rules (template_id, rule_type, condition_type, condition_value, description)
SELECT id, 'AUTO', 'WORK_HOURS', 100, 'Odemčeno po 100 hodinách práce'
FROM certificate_templates
WHERE title = 'Práč'
ON CONFLICT DO NOTHING;

-- Přidat pravidlo pro Řemeslníka (250 hodin práce)
INSERT INTO certificate_unlock_rules (template_id, rule_type, condition_type, condition_value, description)
SELECT id, 'AUTO', 'WORK_HOURS', 250, 'Odemčeno po 250 hodinách práce'
FROM certificate_templates
WHERE title = 'Řemeslník'
ON CONFLICT DO NOTHING;

-- Přidat pravidlo pro Tovaryše (500 hodin práce)
INSERT INTO certificate_unlock_rules (template_id, rule_type, condition_type, condition_value, description)
SELECT id, 'AUTO', 'WORK_HOURS', 500, 'Odemčeno po 500 hodinách práce'
FROM certificate_templates
WHERE title = 'Tovaryš'
ON CONFLICT DO NOTHING;

-- Přidat pravidlo pro Mistra (1000 hodin práce)
INSERT INTO certificate_unlock_rules (template_id, rule_type, condition_type, condition_value, description)
SELECT id, 'AUTO', 'WORK_HOURS', 1000, 'Odemčeno po 1000 hodinách práce'
FROM certificate_templates
WHERE title = 'Mistr'
ON CONFLICT DO NOTHING;

-- Přidat pravidlo pro Základní certifikát (aktivace mistrem MANUAL)
INSERT INTO certificate_unlock_rules (template_id, rule_type, condition_type, description)
SELECT id, 'MANUAL', 'NONE', 'Aktivace mistrem'
FROM certificate_templates
WHERE title = 'Základní certifikát'
ON CONFLICT DO NOTHING;
