import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const onlineWindowMs = 35_000;
const authWindowMs = 15 * 60_000;
const maxFailedAttempts = 5;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function getBearer(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  return authorization.replace(/^Bearer\s+/i, '').trim();
}

async function verifyCredentials(employeeCode: string, password: string, adminOnly: boolean) {
  const normalizedCode = employeeCode.trim().toUpperCase();
  const { data: employee, error } = await service
    .from('employees')
    .select('id, employee_code, employee_name, email, role, password_hash')
    .eq('employee_code', normalizedCode)
    .maybeSingle();

  if (error || !employee || employee.password_hash !== password) return null;
  if (adminOnly && !['admin', 'superadmin'].includes(employee.role || '')) return null;
  return employee;
}

async function recordFailedAuth(employeeCode: string) {
  const now = Date.now();
  const { data: prior } = await service
    .from('mac_agent_auth_attempts')
    .select('failed_attempts, window_started_at, blocked_until')
    .eq('employee_code', employeeCode)
    .maybeSingle();

  if (prior?.blocked_until && new Date(prior.blocked_until).getTime() > now) return;
  const windowStarted = prior?.window_started_at ? new Date(prior.window_started_at).getTime() : 0;
  const withinWindow = now - windowStarted < authWindowMs;
  const attempts = withinWindow ? (prior?.failed_attempts || 0) + 1 : 1;
  await service.from('mac_agent_auth_attempts').upsert({
    employee_code: employeeCode,
    failed_attempts: attempts,
    window_started_at: withinWindow ? prior.window_started_at : new Date(now).toISOString(),
    blocked_until: attempts >= maxFailedAttempts ? new Date(now + authWindowMs).toISOString() : null,
  }, { onConflict: 'employee_code' });
}

async function adminForToken(request: Request) {
  const token = getBearer(request);
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const { data: session, error } = await service
    .from('mac_agent_admin_sessions')
    .select('admin_id, expires_at')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error || !session) return null;

  const { data: admin } = await service
    .from('employees')
    .select('id, employee_code, employee_name, role')
    .eq('id', session.admin_id)
    .maybeSingle();
  if (!admin || !['admin', 'superadmin'].includes(admin.role || '')) return null;
  return admin;
}

async function deviceForToken(request: Request) {
  const token = getBearer(request);
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const { data: device, error } = await service
    .from('mac_agent_devices')
    .select('id, device_id, employee_id, device_name')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  return error ? null : device;
}

async function adminStatus(request: Request) {
  const admin = await adminForToken(request);
  if (!admin) return json({ error: 'Admin authorization expired. Sign in again.' }, 401);

  const [{ data: employees, error: employeeError }, { data: devices, error: deviceError }, { data: commands }] = await Promise.all([
    service.from('employees').select('id, employee_code, employee_name, email, role').order('employee_name'),
    service.from('mac_agent_devices').select('*').order('last_seen_at', { ascending: false }),
    service.from('mac_agent_commands').select('*').order('requested_at', { ascending: false }).limit(500),
  ]);
  if (employeeError || deviceError) return json({ error: 'Unable to load agent status.' }, 500);

  const commandList = commands || [];
  const staleBefore = Date.now() - 30_000;
  for (const command of commandList) {
    if (!['queued', 'delivered'].includes(command.status) || new Date(command.requested_at).getTime() >= staleBefore) continue;
    const expiredStatus = command.status === 'queued' ? 'undelivered' : 'failed';
    const detail = command.status === 'queued'
      ? 'The agent did not poll before the delivery window expired.'
      : 'The agent received the command but did not confirm closure before timeout.';
    const { error: expiryError } = await service.from('mac_agent_commands').update({ status: expiredStatus, detail })
      .eq('id', command.id).in('status', ['queued', 'delivered']);
    if (!expiryError) {
      command.status = expiredStatus;
      command.detail = detail;
    }
  }

  const employeeById = new Map((employees || []).map((employee: any) => [employee.id, employee]));
  const commandsByDevice = new Map<string, any[]>();
  for (const command of commandList) {
    const list = commandsByDevice.get(command.device_id) || [];
    if (list.length < 10) list.push(command);
    commandsByDevice.set(command.device_id, list);
  }

  const now = Date.now();
  const rows = (devices || []).map((device: any) => {
    const employee: any = employeeById.get(device.employee_id) || {};
    const ageMs = device.last_seen_at ? now - new Date(device.last_seen_at).getTime() : Number.POSITIVE_INFINITY;
    const deviceCommands = commandsByDevice.get(device.device_id) || [];
    const latestCommand = deviceCommands[0] || null;
    let status = ageMs <= onlineWindowMs ? 'active' : 'offline';
    if (latestCommand && ['queued', 'delivered'].includes(latestCommand.status)) status = 'closing';
    else if (latestCommand && latestCommand.status === 'failed') status = 'failed';
    else if (device.agent_status === 'closed' && latestCommand?.status === 'executed') status = 'closed';

    return {
      employee_id: device.employee_id,
      employee_code: employee.employee_code || '',
      employee_name: employee.employee_name || 'Unknown employee',
      email: employee.email || '',
      device_id: device.device_id,
      device_name: device.device_name || 'Mac',
      status,
      last_seen_at: device.last_seen_at,
      current_app: device.current_app || '—',
      current_window: device.current_window || '—',
      usage_status: device.usage_status || '—',
      session_status: device.session_status || 'signed_out',
      agent_version: device.agent_version || '',
      latest_command: latestCommand,
    };
  });

  const registeredEmployeeIds = new Set(rows.map((row: any) => row.employee_id));
  for (const employee of employees || []) {
    if (['admin', 'superadmin'].includes((employee as any).role || '') || registeredEmployeeIds.has((employee as any).id)) continue;
    rows.push({
      employee_id: (employee as any).id,
      employee_code: (employee as any).employee_code || '',
      employee_name: (employee as any).employee_name || 'Unknown employee',
      email: (employee as any).email || '',
      device_id: null,
      device_name: 'No Mac registered',
      status: 'offline',
      last_seen_at: null,
      current_app: '—',
      current_window: '—',
      usage_status: '—',
      session_status: 'unknown',
      agent_version: '',
      latest_command: null,
    });
  }

  return json({ employees: rows, refreshed_at: new Date().toISOString(), admin: admin.employee_code });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405);
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Mac agent control is not configured.' }, 503);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const action = body?.action;

  if (action === 'admin-auth') {
    const employeeCode = String(body.employee_code || '').trim().toUpperCase();
    const password = String(body.password || '');
    if (!employeeCode || !password) return json({ error: 'Employee code and password are required.' }, 400);

    const { data: attempt } = await service.from('mac_agent_auth_attempts')
      .select('blocked_until').eq('employee_code', employeeCode).maybeSingle();
    if (attempt?.blocked_until && new Date(attempt.blocked_until).getTime() > Date.now()) {
      return json({ error: 'Too many failed attempts. Try again later.' }, 429);
    }

    const admin = await verifyCredentials(employeeCode, password, true);
    if (!admin) {
      await recordFailedAuth(employeeCode);
      return json({ error: 'Admin credentials were not accepted.' }, 401);
    }

    await service.from('mac_agent_auth_attempts').delete().eq('employee_code', employeeCode);
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const { error } = await service.from('mac_agent_admin_sessions').insert({
      admin_id: admin.id,
      token_hash: await hashToken(token),
      expires_at: expiresAt,
    });
    if (error) return json({ error: 'Unable to create admin control session.' }, 500);
    return json({ token, expires_at: expiresAt, admin_name: admin.employee_name, admin_code: admin.employee_code });
  }

  if (action === 'register-agent') {
    const employeeCode = String(body.employee_code || '').trim().toUpperCase();
    const password = String(body.password || '');
    const deviceId = String(body.device_id || '');
    const deviceToken = String(body.device_token || '');
    const deviceName = String(body.device_name || '').slice(0, 160);
    if (!employeeCode || !password || !deviceId || deviceToken.length < 64 || !deviceName) {
      return json({ error: 'Agent registration data is incomplete.' }, 400);
    }
    const { data: attempt } = await service.from('mac_agent_auth_attempts')
      .select('blocked_until').eq('employee_code', employeeCode).maybeSingle();
    if (attempt?.blocked_until && new Date(attempt.blocked_until).getTime() > Date.now()) {
      return json({ error: 'Too many failed attempts. Try again later.' }, 429);
    }
    const employee = await verifyCredentials(employeeCode, password, false);
    if (!employee) {
      await recordFailedAuth(employeeCode);
      return json({ error: 'Employee credentials were not accepted.' }, 401);
    }
    const { data: existing } = await service.from('mac_agent_devices').select('employee_id').eq('device_id', deviceId).maybeSingle();
    if (existing && existing.employee_id !== employee.id) return json({ error: 'This device is registered to a different employee.' }, 403);
    const { error } = await service.from('mac_agent_devices').upsert({
      employee_id: employee.id,
      device_id: deviceId,
      device_name: deviceName,
      platform: 'darwin',
      token_hash: await hashToken(deviceToken),
      agent_status: 'active',
      session_status: 'signed_in',
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'device_id' });
    if (error) return json({ error: 'Unable to register this Mac Agent.' }, 500);
    return json({ registered: true });
  }

  if (action === 'agent-poll') {
    const device = await deviceForToken(request);
    if (!device) return json({ error: 'Agent device authorization failed.' }, 401);
    const now = new Date().toISOString();
    const { error: heartbeatError } = await service.from('mac_agent_devices').update({
      device_name: String(body.device_name || device.device_name).slice(0, 160),
      agent_status: 'active',
      session_status: String(body.session_status || 'signed_out').slice(0, 40),
      current_app: String(body.current_app || '').slice(0, 160),
      current_window: String(body.current_window || '').slice(0, 500),
      usage_status: String(body.usage_status || 'unknown').slice(0, 40),
      agent_version: String(body.agent_version || '').slice(0, 40),
      last_seen_at: now,
      updated_at: now,
    }).eq('id', device.id);
    if (heartbeatError) return json({ error: 'Unable to update agent heartbeat.' }, 500);

    const { data: queued, error: commandError } = await service.from('mac_agent_commands')
      .select('id, command, requested_at')
      .eq('device_id', device.device_id)
      .eq('status', 'queued')
      .order('requested_at', { ascending: true })
      .limit(5);
    if (commandError) return json({ error: 'Unable to check agent commands.' }, 500);

    const commands = [];
    for (const command of queued || []) {
      const { data: delivered } = await service.from('mac_agent_commands').update({
        status: 'delivered',
        delivered_at: now,
      }).eq('id', command.id).eq('status', 'queued').select('id, command, requested_at').maybeSingle();
      if (delivered) commands.push(delivered);
    }
    return json({ commands });
  }

  if (action === 'agent-ack') {
    const device = await deviceForToken(request);
    if (!device) return json({ error: 'Agent device authorization failed.' }, 401);
    const status = body.status === 'executed' ? 'executed' : body.status === 'failed' ? 'failed' : null;
    if (!status || !body.command_id) return json({ error: 'Invalid command acknowledgement.' }, 400);
    const now = new Date().toISOString();
    const { data: command, error } = await service.from('mac_agent_commands').update({
      status,
      executed_at: now,
      detail: String(body.detail || '').slice(0, 500),
    }).eq('id', body.command_id).eq('device_id', device.device_id).eq('status', 'delivered')
      .select('id').maybeSingle();
    if (error || !command) return json({ error: 'Command acknowledgement was not accepted.' }, 409);
    await service.from('mac_agent_devices').update({
      agent_status: status === 'executed' ? 'closed' : 'active',
      last_command_status: status,
      last_seen_at: now,
      updated_at: now,
    }).eq('id', device.id);
    return json({ acknowledged: true, status });
  }

  if (action === 'admin-status') {
    if (!await adminForToken(request)) return json({ error: 'Admin authorization expired. Sign in again.' }, 401);
    return await adminStatus(request);
  }

  if (action === 'admin-close') {
    const admin = await adminForToken(request);
    if (!admin) return json({ error: 'Admin authorization expired. Sign in again.' }, 401);
    const deviceId = String(body.device_id || '');
    if (!deviceId) return json({ error: 'Device ID is required.' }, 400);
    const { data: device, error: deviceError } = await service.from('mac_agent_devices')
      .select('id, device_id, employee_id, agent_status, last_seen_at')
      .eq('device_id', deviceId).maybeSingle();
    if (deviceError || !device) return json({ error: 'Mac Agent device is not registered.' }, 404);

    const online = device.agent_status === 'active' && !!device.last_seen_at && Date.now() - new Date(device.last_seen_at).getTime() <= onlineWindowMs;
    if (online) {
      const { data: existingCommand } = await service.from('mac_agent_commands')
        .select('id, status, requested_at')
        .eq('device_id', device.device_id)
        .in('status', ['queued', 'delivered'])
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingCommand) return json({ command: existingCommand, delivered: true, alreadyPending: true });
    }
    const status = online ? 'queued' : 'undelivered';
    const { data: command, error } = await service.from('mac_agent_commands').insert({
      device_id: device.device_id,
      employee_id: device.employee_id,
      command: 'CLOSE_AGENT',
      status,
      requested_by: admin.id,
      requested_by_code: admin.employee_code,
      detail: online ? null : 'Agent heartbeat is stale; command could not be delivered.',
    }).select('id, status, requested_at').single();
    if (error) return json({ error: 'Unable to create close command.' }, 500);
    return json({ command, delivered: online });
  }

  return json({ error: 'Unknown action.' }, 400);
});
