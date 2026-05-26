-- Add screenshot storage table
CREATE TABLE IF NOT EXISTS screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE,
  screenshot_data text,        -- base64 JPEG data
  captured_at timestamptz DEFAULT now(),
  app_name text DEFAULT ''
);

-- Add system metrics and duration/productivity metadata to activity_logs
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS cpu_usage real DEFAULT 0;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS memory_usage real DEFAULT 0;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS duration_seconds int DEFAULT 0;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS productive boolean DEFAULT false;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS website text DEFAULT '';

-- Enable Row Level Security (RLS) on screenshots
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplicate errors
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
END $$;

-- Create permissive policies for anon users (since client app writes directly)
CREATE POLICY "Anon insert screenshots" ON screenshots FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon select screenshots" ON screenshots FOR SELECT TO anon USING (true);
