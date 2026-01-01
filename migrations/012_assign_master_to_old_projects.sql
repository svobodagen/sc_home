-- SQL Script to assign master_id to old projects
-- Run this in Supabase SQL Editor

-- This script:
-- 1. Finds all projects without master_id
-- 2. For each project, finds the first master connected to that apprentice
-- 3. Assigns that master_id to the project

-- Update projects without master_id
UPDATE projects p
SET master_id = (
  SELECT ma.master_id
  FROM master_apprentices ma
  WHERE ma.apprentice_id = p.user_id
  LIMIT 1
)
WHERE p.master_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM master_apprentices ma
    WHERE ma.apprentice_id = p.user_id
  );

-- Show results
SELECT 
  'Updated projects' as action,
  COUNT(*) as count
FROM projects
WHERE master_id IS NOT NULL;

-- Show projects that still don't have master_id (no master connection found)
SELECT 
  p.id,
  p.title,
  p.user_id,
  u.name as user_name,
  'No master connection found' as reason
FROM projects p
LEFT JOIN users u ON p.user_id = u.id
WHERE p.master_id IS NULL;
