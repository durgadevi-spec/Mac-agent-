import { useEffect, useRef, useState } from 'react';
import { Laptop, Power, RefreshCw } from 'lucide-react';
import { getSupabaseFunctionErrorMessage, supabase } from '../lib/supabase';

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
  adminToken: string | null;
  adminName: string;
  authError: string;
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

export default function MacAgentManagementPanel({ adminToken, adminName, authError }: Props) {
  const [rows, setRows] = useState<MacAgentRow[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [closingDevice, setClosingDevice] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  const callControl = async (body: Record<string, unknown>, token?: string) => {
      const { data, error: invokeError } = await supabase.functions.invoke('mac-agent-control', {
        body,
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      });
      if (invokeError) {
        throw new Error(await getSupabaseFunctionErrorMessage(invokeError));
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
        setRows([]);
        setError('Admin session expired. Sign out and sign in again to continue.');
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

  const closeAgent = async (row: MacAgentRow) => {
    if (!adminToken || !row.device_id) return;
    const accepted = window.confirm(`Hide the Mac Agent window for ${row.employee_name}? The agent will keep running and can be reopened from the Mac menu bar icon.`);
    if (!accepted) return;

    setClosingDevice(row.device_id);
    setNotice('');
    setError('');
    try {
      const result = await callControl({ action: 'admin-close', device_id: row.device_id }, adminToken);
      if (result.delivered) {
        setNotice(`Hide request sent to ${row.employee_name}. The agent will keep running and can be reopened from the Mac menu bar icon.`);
      } else {
        setNotice(`Could not deliver the hide request to ${row.employee_name}: the Mac Agent is offline.`);
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
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Mac Agent Status</h2>
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {authError || 'Mac Agent control could not be initialized from your admin login. Sign out and sign in again, or contact your administrator.'}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Mac Agent Status</h2>
          <p className="mt-1 text-sm text-slate-500">Live device status. Hiding a window leaves the agent running; it can be reopened from the Mac menu bar icon. Authenticated as {adminName}.</p>
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
                      Hide Window
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
