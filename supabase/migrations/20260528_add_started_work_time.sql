-- Add started_work_time column to work_sessions
-- This tracks the FIRST TIME an employee signs in for the day
-- It should NOT change even if they sign out and back in

ALTER TABLE work_sessions 
ADD COLUMN IF NOT EXISTS started_work_time timestamptz;

-- Add comment for clarity
COMMENT ON COLUMN work_sessions.started_work_time IS 'The time when the employee first signed in for the day. Set once on first login, never changes.';
