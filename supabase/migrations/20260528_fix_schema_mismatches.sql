-- Fix missing window_title column in activity_logs if it doesn't exist
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS window_title text DEFAULT '';

-- Add url column to screenshots table with default empty string
ALTER TABLE screenshots ADD COLUMN IF NOT EXISTS url text DEFAULT '';

-- Make session_id nullable in screenshots (screenshots can exist without a valid session reference)
ALTER TABLE screenshots ALTER COLUMN session_id DROP NOT NULL;

-- Fix foreign key constraint on screenshots.session_id
-- Drop the incorrect constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'screenshots' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%session%'
  ) THEN
    ALTER TABLE screenshots DROP CONSTRAINT screenshots_session_id_fkey CASCADE;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Add correct foreign key constraint with ON DELETE SET NULL (allows null session_id)
ALTER TABLE screenshots ADD CONSTRAINT screenshots_session_id_fkey 
  FOREIGN KEY (session_id) REFERENCES work_sessions(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_screenshots_employee_id ON screenshots(employee_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_captured_at ON screenshots(captured_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_employee_id ON activity_logs(employee_id);

-- Verify RLS policies exist for screenshots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'screenshots' AND policyname = 'Anon insert screenshots'
  ) THEN
    CREATE POLICY "Anon insert screenshots" ON screenshots FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'screenshots' AND policyname = 'Anon select screenshots'
  ) THEN
    CREATE POLICY "Anon select screenshots" ON screenshots FOR SELECT TO anon USING (true);
  END IF;
END $$;
