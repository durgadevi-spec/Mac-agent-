-- Create login logs table
CREATE TABLE IF NOT EXISTS login_logs (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL,
  employee_code TEXT,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_login_logs_employee_code ON login_logs(employee_code);
CREATE INDEX idx_login_logs_created_at ON login_logs(created_at);

-- Insert employee login data
INSERT INTO login_logs (id, username, employee_code, password, created_at) VALUES
  ('0070896e-d35c-4864-8358-84c8220565ac', 'Rebecasuji.A', 'E0046', 'admin123', '2026-05-18 05:50:13.425685+00'),
  ('06a8cfe1-e100-4bfc-9554-4b1e4c16e034', 'DurgaDevi E', 'E0048', 'admin123', '2026-05-18 05:50:13.466666+00'),
  ('193f1988-c0fd-4ccc-a69a-b86b4f54a6a6', 'S.NAVEEN KUMAR', 'E0053', 'admin123', '2026-05-18 05:50:13.717837+00'),
  ('270bb5fd-2db3-457f-a8be-15d15c9aab4b', 'ARUN KUMAR V', 'E0051', 'admin123', '2026-05-18 05:50:13.550503+00'),
  ('324c6ac1-1e78-4745-8814-b73db8ca61c5', 'UMAR FAROOQUE', 'E0040', 'admin123', '2026-05-18 05:50:13.210419+00'),
  ('33b1d465-f47d-4ca0-871d-14c0db76cf6a', 'YUVARAJ S', 'E0042', 'admin123', '2026-05-18 05:50:13.124581+00'),
  ('471194f4-07b0-4d85-a8d2-4ce0d8683cf8', 'SIVARAM C', 'E0032', 'admin123', '2026-05-18 05:50:13.16651+00'),
  ('571c51db-c448-4c79-be6b-885613071ce2', 'P PUSHPA', 'E0049', 'admin123', '2026-05-18 05:50:13.633793+00'),
  ('68d03f87-1dc0-4445-a40b-634aed750e17', 'Leocelestine', 'E0002', 'admin123', '2026-05-18 05:50:13.758574+00'),
  ('70e101fd-c0e1-443b-b6ff-233bac2dd0f9', 'FAREETHA', '-', 'admin123', '2026-05-18 05:50:13.345546+00'),
  ('7c7a1c27-664f-4d8f-862e-b966ea5a7190', 'Samyuktha S', 'E0047', 'admin123', '2026-05-18 05:50:13.385252+00'),
  ('83936cf7-57e0-4abd-9781-ac17ed77fe8d', 'ZAMEELA BEGAM N', 'E0050', 'admin123', '2026-05-18 05:50:13.508607+00'),
  ('87362bb2-663d-4fe5-8ba7-e03330996d13', 'RANJITH', 'E0009', 'admin123', '2026-05-18 05:50:13.299459+00'),
  ('8f395547-3c05-461e-910f-3b5d2266a367', 'D K JYOTHSNA PRIYA', 'E0052', 'admin123', '2026-05-18 05:50:13.591861+00'),
  ('9775c8b7-f92c-4999-8047-5551bc49fefd', 'KIRUBA', 'E0054', 'admin123', '2026-05-18 05:50:13.674645+00'),
  ('a2b8c31a-e68e-45a9-aa21-0226044d7557', 'MOHAN RAJ C', 'E0041', 'admin123', '2026-05-18 05:50:13.078652+00'),
  ('c7c1029a-1305-42d8-b5d4-27b0aa682342', 'Samprakash', 'E0001', 'admin123', '2026-05-18 05:50:13.800597+00'),
  ('f783fd47-4e8b-4dd5-9130-9937afa617d1', 'KAALIPUSHPA', 'E0028', 'admin123', '2026-05-18 05:50:13.254608+00');
