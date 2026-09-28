ALTER TABLE activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_activity_type_check;

ALTER TABLE activity_logs
ADD CONSTRAINT activity_logs_activity_type_check
CHECK (activity_type IN ('app', 'website', 'idle', 'away', 'idle_reason', 'unknown'));