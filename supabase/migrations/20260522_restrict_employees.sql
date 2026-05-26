-- Drop the old employees table and recreate it with the correct structure
DROP TABLE IF EXISTS employees CASCADE;

-- Create fresh employees table
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text UNIQUE NOT NULL,
  employee_name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Insert the 18 approved employees
INSERT INTO employees (id, employee_code, employee_name, password_hash, created_at) VALUES
  ('0070896e-d35c-4864-8358-84c8220565ac', 'E0046', 'Rebecasuji.A', 'admin123', '2026-05-18 05:50:13.425685+00'),
  ('06a8cfe1-e100-4bfc-9554-4b1e4c16e034', 'E0048', 'DurgaDevi E', 'admin123', '2026-05-18 05:50:13.466666+00'),
  ('193f1988-c0fd-4ccc-a69a-b86b4f54a6a6', 'E0053', 'S.NAVEEN KUMAR', 'admin123', '2026-05-18 05:50:13.717837+00'),
  ('270bb5fd-2db3-457f-a8be-15d15c9aab4b', 'E0051', 'ARUN KUMAR V', 'admin123', '2026-05-18 05:50:13.550503+00'),
  ('324c6ac1-1e78-4745-8814-b73db8ca61c5', 'E0040', 'UMAR FAROOQUE', 'admin123', '2026-05-18 05:50:13.210419+00'),
  ('33b1d465-f47d-4ca0-871d-14c0db76cf6a', 'E0042', 'YUVARAJ S', 'admin123', '2026-05-18 05:50:13.124581+00'),
  ('471194f4-07b0-4d85-a8d2-4ce0d8683cf8', 'E0032', 'SIVARAM C', 'admin123', '2026-05-18 05:50:13.16651+00'),
  ('571c51db-c448-4c79-be6b-885613071ce2', 'E0049', 'P PUSHPA', 'admin123', '2026-05-18 05:50:13.633793+00'),
  ('68d03f87-1dc0-4445-a40b-634aed750e17', 'E0002', 'Leocelestine', 'admin123', '2026-05-18 05:50:13.758574+00'),
  ('70e101fd-c0e1-443b-b6ff-233bac2dd0f9', '-', 'FAREETHA', 'admin123', '2026-05-18 05:50:13.345546+00'),
  ('7c7a1c27-664f-4d8f-862e-b966ea5a7190', 'E0047', 'Samyuktha S', 'admin123', '2026-05-18 05:50:13.385252+00'),
  ('83936cf7-57e0-4abd-9781-ac17ed77fe8d', 'E0050', 'ZAMEELA BEGAM N', 'admin123', '2026-05-18 05:50:13.508607+00'),
  ('87362bb2-663d-4fe5-8ba7-e03330996d13', 'E0009', 'RANJITH', 'admin123', '2026-05-18 05:50:13.299459+00'),
  ('8f395547-3c05-461e-910f-3b5d2266a367', 'E0052', 'D K JYOTHSNA PRIYA', 'admin123', '2026-05-18 05:50:13.591861+00'),
  ('9775c8b7-f92c-4999-8047-5551bc49fefd', 'E0054', 'KIRUBA', 'admin123', '2026-05-18 05:50:13.674645+00'),
  ('a2b8c31a-e68e-45a9-aa21-0226044d7557', 'E0041', 'MOHAN RAJ C', 'admin123', '2026-05-18 05:50:13.078652+00'),
  ('c7c1029a-1305-42d8-b5d4-27b0aa682342', 'E0001', 'Samprakash', 'admin123', '2026-05-18 05:50:13.800597+00'),
  ('f783fd47-4e8b-4dd5-9130-9937afa617d1', 'E0028', 'KAALIPUSHPA', 'admin123', '2026-05-18 05:50:13.254608+00');

-- Recreate RLS policies
CREATE POLICY "Employees can read own record"
  ON employees FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

