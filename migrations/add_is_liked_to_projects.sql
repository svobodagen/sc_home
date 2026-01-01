-- Add is_liked column to projects table
ALTER TABLE projects ADD COLUMN is_liked BOOLEAN DEFAULT false NOT NULL;

-- Create index for faster filtering
CREATE INDEX idx_projects_is_liked ON projects(is_liked);
