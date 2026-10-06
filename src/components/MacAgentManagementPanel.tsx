import { useEffect, useRef, useState } from 'react';
import { Laptop, LockKeyhole, Power, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MacAgentRow {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  email: string;
  device_id: string | null;
  device_name: string;
  status: 'active' | 'offline' | 'closing' | 'closed' | 'failed';
  last_seen_at: string | null;
  current_app: string;
  current_window: string;
  usage_status: string;
  session_status: string;
  agent_version: string;
  latest_command: {
    id: string;
    status: string;
    requested_at: string;
    requested_by_code: string;
    detail?: string | null;
  } | null;
}

interface Props {
  adminEmployeeCode: string;
}

function relativeTime(value: string | null) {
  if (!value) return 'Never';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

const statusStyle: Record<MacAgentRow['status'], string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  offline: 'bg-slate-100 text-slate-600 ring-slate-200',
  closing: 'bg-amber-50 text-amber-700 ring-amber-200',
  closed: 'bg-slate-100 text-slate-600 ring-slate-200',
  failed: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export default function MacAgentManagementPanel({ adminEmployeeCode }: Props) {
  const [adminPassword, setAdminPassword] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('');
  const [rows, setRows] = useState<MacAgentRow[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [closingDevice, setClosingDevice] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  const callControl = async (body: Record<string, unknown>, token?: string) => {
    const { data, error: invokeError } = await supabase.functions.invoke('mac-agent-control', {
      body,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    });
    if (invokeError) {
      const context = (invokeError as any).context;
      if (context && typeof context.json === 'function') {
        let responseBody: any = null;
        try {
          responseBody = await context.json();
        } catch { }
        if (responseBody?.error) throw new Error(responseBody.error);
      }
      throw invokeError;
    }
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const refreshStatus = async () => {
    if (!adminToken || refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    try {
      const result = await callControl({ action: 'admin-status' }, adminToken);
      setRows(result.employees || []);
      setError('');
    } catch (requestError: any) {
      const message = String(requestError?.message || requestError);
      if (/authorization expired|unauthorized|401/i.test(message)) {
        setAdminToken(null);
        setAdminName('');
        setRows([]);
        setError('Admin session expired. Re-enter your password to continue.');
      } else {
        setError(message || 'Could not refresh Mac Agent status.');
      }
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!adminToken) return;
    void refreshStatus();
    const timer = setInterval(() => void refreshStatus(), 5000);
    return () => clearInterval(timer);
  }, [adminToken]);

  const authenticateAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminEmployeeCode || !adminPassword) return;
    setAuthenticating(true);
    setError('');
    try {
      const result = await callControl({
        action: 'admin-auth',
        employee_code: adminEmployeeCode,
        password: adminPassword,
      });
      setAdminToken(result.token);
      setAdminName(result.admin_name || adminEmployeeCode);
      setAdminPassword('');
    } catch (authError: any) {
      setError(String(authError?.message || 'Admin authentication failed.'));
      setAdminPassword('');
    } finally {
      setAuthenticating(false);
    }
  };

  const closeAgent = async (row: MacAgentRow) => {
    if (!adminToken || !row.device_id) return;
    const accepted = window.confirm(`Are you sure you want to close the Mac Agent for ${row.employee_name}?`);
    if (!accepted) return;

    setClosingDevice(row.device_id);
    setNotice('');
    setError('');
    try {
      const result = await callControl({ action: 'admin-close', device_id: row.device_id }, adminToken);
      if (result.delivered) {
        setNotice(`Close command queued for ${row.employee_name}. Waiting for the Mac Agent to confirm closure.`);
      } else {
        setNotice(`Could not deliver the close command to ${row.employee_name}: the Mac Agent is offline.`);
      }
      await refreshStatus();
    } catch (closeError: any) {
      setError(String(closeError?.message || 'Could not send the close command.'));
    } finally {
      setClosingDevice(null);
    }
  };

  if (!adminToken) {
    return (
      <section className="mx-auto max-w-xl py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700"><LockKeyhole className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Mac Agent Management</h1>
              <p className="text-sm text-slate-500">Re-enter your admin password to view devices or send commands.</p>
            </div>
          </div>
          <form onSubmit={authenticateAdmin} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Admin employee code
              <input value={adminEmployeeCode} readOnly className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Admin password
              <input type="password" autoComplete="current-password" value={adminPassword} onChange={event => setAdminPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <button disabled={authenticating || !adminPassword} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {authenticating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {authenticating ? 'Verifying…' : 'Authenticate'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mac Agent Management</h1>
          <p className="mt-1 text-sm text-slate-500">Live device heartbeat and remote close controls. Authenticated as {adminName}.</p>
        </div>
        <button onClick={() => void refreshStatus()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      {notice && <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</div>}
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Agent status</th>
                <th className="px-4 py-3">Last heartbeat</th>
                <th className="px-4 py-3">Current usage</th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(row => (
                <tr key={row.device_id || row.employee_id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{row.employee_name}</div>
                    <div className="text-xs text-slate-500">{row.email || row.employee_code}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-slate-700"><Laptop className="h-4 w-4 text-slate-400" />{row.device_name}</div>
                    {row.agent_version && <div className="mt-1 text-xs text-slate-400">v{row.agent_version}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyle[row.status]}`}>
                      {row.status === 'active' ? 'Active' : row.status === 'closing' ? 'Closing' : row.status === 'closed' ? 'Closed' : row.status === 'failed' ? 'Failed' : 'Offline'}
                    </span>
                    {row.latest_command && <div className="mt-1 text-xs text-slate-500">Last command: {row.latest_command.status}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{relativeTime(row.last_seen_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-700">{row.current_app}</div>
                    <div className="max-w-[240px] truncate text-xs text-slate-500">{row.current_window}</div>
                    <div className="text-xs capitalize text-slate-400">{row.usage_status}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.session_status?.replace(/_/g, ' ') || 'Unknown'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void closeAgent(row)}
                      disabled={!row.device_id || row.status !== 'active' || closingDevice === row.device_id}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {closingDevice === row.device_id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                      Close Agent
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No employees or Mac devices found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-400">Device status updates every 5 seconds. Offline devices cannot receive commands; agent heartbeats expire after 35 seconds.</p>
    </section>
  );
}
