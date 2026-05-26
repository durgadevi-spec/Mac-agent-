-- Seed employees from login_logs data
INSERT INTO employees (employee_code, employee_name, password_hash)
VALUES
  ('E0046', 'Rebecasuji.A', 'admin123'),
  ('E0048', 'DurgaDevi E', 'admin123'),
  ('E0053', 'S.NAVEEN KUMAR', 'admin123'),
  ('E0051', 'ARUN KUMAR V', 'admin123'),
  ('E0040', 'UMAR FAROOQUE', 'admin123'),
  ('E0042', 'YUVARAJ S', 'admin123'),
  ('E0032', 'SIVARAM C', 'admin123'),
  ('E0049', 'P PUSHPA', 'admin123'),
  ('E0002', 'Leocelestine', 'admin123'),
  ('-', 'FAREETHA', 'admin123'),
  ('E0047', 'Samyuktha S', 'admin123'),
  ('E0050', 'ZAMEELA BEGAM N', 'admin123'),
  ('E0009', 'RANJITH', 'admin123'),
  ('E0052', 'D K JYOTHSNA PRIYA', 'admin123'),
  ('E0054', 'KIRUBA', 'admin123'),
  ('E0041', 'MOHAN RAJ C', 'admin123'),
  ('E0001', 'Samprakash', 'admin123'),
  ('E0028', 'KAALIPUSHPA', 'admin123')
ON CONFLICT (employee_code) DO NOTHING;
