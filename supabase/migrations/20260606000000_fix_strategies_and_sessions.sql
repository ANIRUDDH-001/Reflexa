-- Fix the strategies table to have updated_at column so the trigger doesn't crash
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Remove unused study_plan column from sessions
ALTER TABLE sessions DROP COLUMN IF EXISTS study_plan;
