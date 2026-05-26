-- Create aggregated employee activity table for agent syncs
CREATE TABLE IF NOT EXISTS employee_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  active_time int DEFAULT 0,
  productive_time int DEFAULT 0,
  nonproductive_time int DEFAULT 0,
  idle_time int DEFAULT 0,
  away_time int DEFAULT 0,
  productivity_score int DEFAULT 0,
  current_app text DEFAULT '',
  activity_logs jsonb DEFAULT '[]'::jsonb,
  screenshots jsonb DEFAULT '[]'::jsonb,
  online_status text DEFAULT 'offline',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert activity aggregates"
  ON employee_activity FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can select activity aggregates"
  ON employee_activity FOR SELECT
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_employee_activity_employee_id ON employee_activity(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_activity_timestamp ON employee_activity("timestamp");
