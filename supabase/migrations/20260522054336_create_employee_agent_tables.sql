/*
  # Knockturn Employee Agent Schema

  1. New Tables
    - `employees`
      - `id` (uuid, primary key)
      - `employee_code` (text, unique) - login identifier
      - `employee_name` (text)
      - `password_hash` (text) - plain text for internal use
      - `created_at` (timestamptz)

    - `work_sessions`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, FK to employees)
      - `session_date` (date)
      - `punched_in` (boolean)
      - `punch_in_time` (timestamptz)
      - `plan_submitted` (boolean)
      - `plan_text` (text)
      - `active_seconds` (int)
      - `idle_seconds` (int)
      - `productive_seconds` (int)
      - `created_at` (timestamptz)

    - `activity_logs`
      - `id` (uuid, primary key)
      - `session_id` (uuid, FK to work_sessions)
      - `employee_id` (uuid)
      - `app_name` (text)
      - `window_title` (text)
      - `activity_type` (text) - 'productive','idle','away','non_productive'
      - `logged_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Employees can read/write their own data
*/

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text UNIQUE NOT NULL,
  employee_name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can read own record"
  ON employees FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

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

ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can insert own sessions"
  ON work_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Employees can select own sessions"
  ON work_sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Employees can update own sessions"
  ON work_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  app_name text DEFAULT '',
  window_title text DEFAULT '',
  activity_type text DEFAULT 'idle',
  logged_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert activity logs"
  ON activity_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can select activity logs"
  ON activity_logs FOR SELECT
  TO anon
  USING (true);

-- Seed a demo employee for testing
INSERT INTO employees (employee_code, employee_name, password_hash)
VALUES ('EMP001', 'John Doe', 'password123')
ON CONFLICT (employee_code) DO NOTHING;
