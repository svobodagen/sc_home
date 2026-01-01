-- Migration: Add master_comment to work_hours table
-- Allows masters to comment on specific work logs

ALTER TABLE IF EXISTS work_hours ADD COLUMN IF NOT EXISTS master_comment TEXT DEFAULT '';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_work_hours_master_comment ON work_hours(master_comment);
