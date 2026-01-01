-- Add master_id to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS master_id TEXT;
CREATE INDEX IF NOT EXISTS idx_projects_master_id ON projects(master_id);

-- Add master_id to work_hours
ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS master_id TEXT;
CREATE INDEX IF NOT EXISTS idx_work_hours_master_id ON work_hours(master_id);
