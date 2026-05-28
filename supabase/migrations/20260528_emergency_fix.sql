-- Emergency fix: Clear problematic foreign key and make session_id nullable

-- First, remove the RLS policies temporarily to allow updates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'screenshots' AND policyname = 'Anon insert screenshots'
  ) THEN
    DROP POLICY "Anon insert screenshots" ON screenshots;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'screenshots' AND policyname = 'Anon select screenshots'
  ) THEN
    DROP POLICY "Anon select screenshots" ON screenshots;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Drop the problematic foreign key constraint
ALTER TABLE screenshots DROP CONSTRAINT IF EXISTS screenshots_session_id_fkey;

-- Make session_id nullable and set all invalid values to NULL
ALTER TABLE screenshots ALTER COLUMN session_id DROP NOT NULL;

-- Set invalid session IDs to NULL (IDs that don't exist in work_sessions)
UPDATE screenshots 
SET session_id = NULL 
WHERE session_id IS NOT NULL 
  AND session_id NOT IN (SELECT id FROM work_sessions);

-- Recreate the foreign key with proper handling
ALTER TABLE screenshots 
  ADD CONSTRAINT screenshots_session_id_fkey 
  FOREIGN KEY (session_id) REFERENCES work_sessions(id) ON DELETE SET NULL;

-- Recreate RLS policies
CREATE POLICY "Anon insert screenshots" ON screenshots FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon select screenshots" ON screenshots FOR SELECT TO anon USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_screenshots_employee_id ON screenshots(employee_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_captured_at ON screenshots(captured_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_employee_id ON activity_logs(employee_id);
