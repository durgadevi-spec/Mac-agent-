-- Add day_finished and ended_work_time columns to track when employee finishes their day
-- This allows preventing resume after finishing the day

ALTER TABLE work_sessions
ADD COLUMN IF NOT EXISTS day_finished boolean DEFAULT false;

ALTER TABLE work_sessions
ADD COLUMN IF NOT EXISTS ended_work_time timestamptz;

-- Create index for faster queries on day_finished status
CREATE INDEX IF NOT EXISTS idx_work_sessions_day_finished 
ON work_sessions(employee_id, session_date, day_finished);
