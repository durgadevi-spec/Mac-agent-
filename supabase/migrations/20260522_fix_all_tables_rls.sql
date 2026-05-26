-- Ensure work_sessions table exists with correct structure and RLS
CREATE TABLE IF NOT EXISTS work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  punched_in boolean DEFAULT false,
  punch_in_time timestamptz,
  plan_submitted boolean DEFAULT false,
  plan_text text DEFAULT '',
  active_seconds int DEFAULT 0,
  idle_seconds int DEFAULT 0,
  productive_seconds int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might block access
DROP POLICY IF EXISTS "Employees can insert own sessions" ON work_sessions;
DROP POLICY IF EXISTS "Employees can select own sessions" ON work_sessions;
DROP POLICY IF EXISTS "Employees can update own sessions" ON work_sessions;

-- Allow anon users to INSERT sessions
CREATE POLICY "Anon can insert sessions"
  ON work_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon users to SELECT sessions
CREATE POLICY "Anon can select sessions"
  ON work_sessions FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to UPDATE sessions
CREATE POLICY "Anon can update sessions"
  ON work_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Ensure activity_logs table exists with correct RLS
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  app_name text DEFAULT '',
  window_title text DEFAULT '',
  activity_type text DEFAULT 'idle',
  idle_reason text DEFAULT '',
  logged_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS idle_reason text DEFAULT '';

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anon can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Anon can select activity logs" ON activity_logs;

-- Allow anon users to INSERT activity logs
CREATE POLICY "Anon can insert activity logs"
  ON activity_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon users to SELECT activity logs
CREATE POLICY "Anon can select activity logs"
  ON activity_logs FOR SELECT
  TO anon
  USING (true);

-- Ensure login_logs table exists with proper RLS
CREATE TABLE IF NOT EXISTS login_logs (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  employee_code TEXT,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anon can insert login logs" ON login_logs;

-- Allow anon users to INSERT login logs
CREATE POLICY "Anon can insert login logs"
  ON login_logs FOR INSERT
  TO anon
  WITH CHECK (true);
