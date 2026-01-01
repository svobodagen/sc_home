-- Tabulka pro ucednicke cile (nastavuje ucednik sam)
-- Oddeleno od admin limitu v user_hour_limits

CREATE TABLE IF NOT EXISTS apprentice_goals (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  work_goal_week INTEGER DEFAULT 20,
  study_goal_week INTEGER DEFAULT 10,
  work_goal_month INTEGER DEFAULT 80,
  study_goal_month INTEGER DEFAULT 40,
  work_goal_year INTEGER DEFAULT 960,
  study_goal_year INTEGER DEFAULT 480,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pro rychle vyhledavani
CREATE INDEX IF NOT EXISTS idx_apprentice_goals_user_id ON apprentice_goals(user_id);

-- Trigger pro aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_apprentice_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_apprentice_goals_updated_at ON apprentice_goals;
CREATE TRIGGER trigger_apprentice_goals_updated_at
  BEFORE UPDATE ON apprentice_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_apprentice_goals_updated_at();

-- Povoleni RLS
ALTER TABLE apprentice_goals ENABLE ROW LEVEL SECURITY;

-- RLS politiky
DROP POLICY IF EXISTS "Users can view own goals" ON apprentice_goals;
CREATE POLICY "Users can view own goals" ON apprentice_goals
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own goals" ON apprentice_goals;
CREATE POLICY "Users can insert own goals" ON apprentice_goals
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own goals" ON apprentice_goals;
CREATE POLICY "Users can update own goals" ON apprentice_goals
  FOR UPDATE USING (true);
