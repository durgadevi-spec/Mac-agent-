-- Fix RLS policies to allow anon users to query employees for login
-- Drop existing policies that block anon access
DROP POLICY IF EXISTS "Employees can read own record" ON employees;

-- Allow anon users to SELECT for login purposes
CREATE POLICY "Anon can select employees for login"
  ON employees FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to read own record
CREATE POLICY "Authenticated users can read own record"
  ON employees FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);
