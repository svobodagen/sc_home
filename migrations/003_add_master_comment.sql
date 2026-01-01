-- Migration: Add master_comment to projects table
-- This allows masters to leave comments/feedback on apprentice projects

ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS master_comment TEXT DEFAULT '';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_master_comment ON projects(master_comment);
