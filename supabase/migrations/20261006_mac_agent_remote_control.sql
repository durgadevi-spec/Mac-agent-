CREATE TABLE IF NOT EXISTS public.mac_agent_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  device_id text NOT NULL UNIQUE,
  device_name text NOT NULL,
  platform text NOT NULL DEFAULT 'darwin' CHECK (platform = 'darwin'),
  token_hash text NOT NULL UNIQUE,
  agent_status text NOT NULL DEFAULT 'offline' CHECK (agent_status IN ('active', 'closed', 'failed')),
  session_status text NOT NULL DEFAULT 'signed_out',
  current_app text,
  current_window text,
  usage_status text,
  agent_version text,
  last_seen_at timestamptz,
  last_command_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mac_agent_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL REFERENCES public.mac_agent_devices(device_id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  command text NOT NULL CHECK (command = 'CLOSE_AGENT'),
  status text NOT NULL CHECK (status IN ('queued', 'delivered', 'executed', 'failed', 'undelivered')),
  requested_by uuid NOT NULL REFERENCES public.employees(id),
  requested_by_code text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  executed_at timestamptz,
  detail text
);

CREATE TABLE IF NOT EXISTS public.mac_agent_admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mac_agent_auth_attempts (
  employee_code text PRIMARY KEY,
  failed_attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mac_agent_devices_employee ON public.mac_agent_devices(employee_id);
CREATE INDEX IF NOT EXISTS idx_mac_agent_devices_last_seen ON public.mac_agent_devices(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_mac_agent_commands_device_status ON public.mac_agent_commands(device_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_mac_agent_commands_employee_requested ON public.mac_agent_commands(employee_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_mac_agent_admin_sessions_expiry ON public.mac_agent_admin_sessions(expires_at);

ALTER TABLE public.mac_agent_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mac_agent_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mac_agent_admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mac_agent_auth_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.mac_agent_devices FROM anon, authenticated;
REVOKE ALL ON public.mac_agent_commands FROM anon, authenticated;
REVOKE ALL ON public.mac_agent_admin_sessions FROM anon, authenticated;
REVOKE ALL ON public.mac_agent_auth_attempts FROM anon, authenticated;
GRANT ALL ON public.mac_agent_devices TO service_role;
GRANT ALL ON public.mac_agent_commands TO service_role;
GRANT ALL ON public.mac_agent_admin_sessions TO service_role;
GRANT ALL ON public.mac_agent_auth_attempts TO service_role;
