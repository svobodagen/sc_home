-- 1. Vytvoreni tabulky admin_settings pro globalni implicitni nastaveni
CREATE TABLE IF NOT EXISTS admin_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    
    -- Implicitni limity pro praci (hodiny)
    max_work_hours_day INTEGER NOT NULL DEFAULT 8,
    max_work_hours_week INTEGER NOT NULL DEFAULT 40,
    max_work_hours_month INTEGER NOT NULL DEFAULT 160,
    max_work_hours_year INTEGER NOT NULL DEFAULT 1920,
    
    -- Implicitni limity pro studium (hodiny)
    max_study_hours_day INTEGER NOT NULL DEFAULT 4,
    max_study_hours_week INTEGER NOT NULL DEFAULT 20,
    max_study_hours_month INTEGER NOT NULL DEFAULT 80,
    max_study_hours_year INTEGER NOT NULL DEFAULT 960,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT
);

-- Vlozit vychozi radek pro admin_settings
INSERT INTO admin_settings (id, max_work_hours_day, max_work_hours_week, max_work_hours_month, max_work_hours_year, max_study_hours_day, max_study_hours_week, max_study_hours_month, max_study_hours_year)
VALUES (1, 8, 40, 160, 1920, 4, 20, 80, 960)
ON CONFLICT (id) DO NOTHING;

-- 2. Vytvoreni tabulky pro individualni limity hodin pro kazdeho ucednika
CREATE TABLE IF NOT EXISTS user_hour_limits (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Limity pro praci (hodiny)
    max_work_hours_day INTEGER NOT NULL DEFAULT 8,
    max_work_hours_week INTEGER NOT NULL DEFAULT 40,
    max_work_hours_month INTEGER NOT NULL DEFAULT 160,
    max_work_hours_year INTEGER NOT NULL DEFAULT 1920,
    
    -- Limity pro studium (hodiny)
    max_study_hours_day INTEGER NOT NULL DEFAULT 8,
    max_study_hours_week INTEGER NOT NULL DEFAULT 20,
    max_study_hours_month INTEGER NOT NULL DEFAULT 80,
    max_study_hours_year INTEGER NOT NULL DEFAULT 960,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pro rychle vyhledavani podle user_id
CREATE INDEX IF NOT EXISTS idx_user_hour_limits_user_id ON user_hour_limits(user_id);

-- Komentare k tabulkam
COMMENT ON TABLE admin_settings IS 'Globalni implicitni nastaveni limitu hodin pro nove ucedniky';
COMMENT ON TABLE user_hour_limits IS 'Individualni limity hodin pro kazdeho ucednika';
