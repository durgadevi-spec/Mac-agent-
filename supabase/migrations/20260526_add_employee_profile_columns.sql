-- Migration: Add employee profile and configuration columns
-- This adds the necessary columns for the Employees UI and App Configuration features

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS position text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS role text DEFAULT 'employee',
ADD COLUMN IF NOT EXISTS productive_apps text[] DEFAULT '{}';
