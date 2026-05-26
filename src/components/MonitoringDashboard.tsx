import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  Clock,
  AlertCircle,
  Eye,
  LogOut,
  Zap,
} from 'lucide-react';
import {
  fetchAllEmployees,
  fetchActivityLogsByDate,
  fetchSessionsByDate,
  getEmployeeScreenshotsByDate,
  ActivityLog,
  WorkSession,
} from '../lib/supabase';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';

interface EmployeeOverview {
  id: string;
  name: string;
  department: string;
  status: 'online' | 'idle' | 'away' | 'offline';
  lastSync: string;
}

interface ActivityData {
  activeTime: number;
  productiveTime: number;
  nonproductiveTime: number;
  idleTime: number;
  awayTime: number;
  productivity: number;
  currentApp: string;
  sessionStartTime: string;
  screenshots: Array<{
    timestamp: string;
    url: string;
    appName: string;
  }>;
  activityLogs: Array<{
    timestamp: string;
    type: string;
    details: string;
  }>;
}

const MonitoringDashboard: React.FC = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOverview | null>(null);
  const [employees, setEmployees] = useState<EmployeeOverview[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [activityData, setActivityData] = useState<ActivityData>({
    activeTime: 0,
    productiveTime: 0,
    nonproductiveTime: 0,
    idleTime: 0,
    awayTime: 0,
    productivity: 0,
    currentApp: 'Chrome',
    sessionStartTime: new Date().toLocaleTimeString(),
    screenshots: [],
    activityLogs: [],
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [activeTab, setActiveTab] = useState<'activity' | 'applications' | 'screenshots' | 'alerts' | 'logs'>(
    'activity'
  );
  const [sessionDuration, setSessionDuration] = useState('0h 0m');
  const [screenshotsLoading, setScreenshotsLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState('');

  const normalizeScreenshotUrl = (value: string) => {
    if (!value) return '';
    return value.startsWith('data:image/') ? value : `data:image/jpeg;base64,${value}`;
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      const [rawEmployees, rawSessions, rawActivityLogs] = await Promise.all([
        fetchAllEmployees(),
        fetchSessionsByDate(dateString),
        fetchActivityLogsByDate(dateString),
      ]);

      const employeeMap = new Map<string, WorkSession>();
      rawSessions.forEach((session) => {
        employeeMap.set(session.employee_id, session);
      });

      const updatedEmployees: EmployeeOverview[] = rawEmployees.map((emp) => {
        const session = employeeMap.get(emp.id);
        const status: EmployeeOverview['status'] = session
          ? session.active_seconds > 0
            ? 'online'
            : 'idle'
          : 'offline';

        return {
          id: emp.id,
          name: emp.employee_name,
          department: 'Unknown',
          status,
          lastSync: session?.punch_in_time
            ? new Date(session.punch_in_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
            : 'N/A',
        };
      });

      setEmployees(updatedEmployees);
      setSessions(rawSessions);
      setActivityLogs(rawActivityLogs);

      if (!selectedEmployee && updatedEmployees.length > 0) {
        setSelectedEmployee(updatedEmployees[0]);
      }
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedEmployee) return;

    let cancelled = false;

    const selectedSession = sessions.find((session) => session.employee_id === selectedEmployee.id);
    const selectedLogs = activityLogs.filter((log) => log.employee_id === selectedEmployee.id);
    const currentApp = selectedLogs.length > 0 ? selectedLogs[0].app_name : 'Unknown';
    const productiveTime = selectedSession?.productive_seconds ?? 0;
    const activeTime = selectedSession?.active_seconds ?? 0;
    const idleTime = selectedSession?.idle_seconds ?? 0;
    const productivity = activeTime > 0 ? Math.round((productiveTime / activeTime) * 100) : 0;
    const sessionStartTime = selectedSession?.punch_in_time ?? new Date().toLocaleTimeString();

    const loadScreenshots = async () => {
      setScreenshotsLoading(true);
      setScreenshotError('');
      try {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const remoteShots = await getEmployeeScreenshotsByDate(selectedEmployee.id, dateString);
        const shots = remoteShots.map((s) => ({
          captured_at: s.captured_at,
          screenshot_data: normalizeScreenshotUrl(s.screenshot_data),
          app_name: s.app_name,
        }));

        if (!cancelled) {
          setActivityData({
            activeTime,
            productiveTime,
            nonproductiveTime: Math.max(0, activeTime - productiveTime),
            idleTime,
            awayTime: 0,
            productivity,
            currentApp,
            sessionStartTime,
            screenshots: shots.map((s) => ({
              timestamp: new Date(s.captured_at).toLocaleTimeString(),
              url: s.screenshot_data,
              appName: s.app_name,
            })),
            activityLogs: selectedLogs
              .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
              .map((log) => ({
                timestamp: new Date(log.logged_at).toLocaleTimeString(),
                type: log.activity_type,
                details: log.activity_type === 'idle_reason'
                  ? (log.idle_reason || 'Idle reason provided')
                  : `${log.app_name || 'Unknown'} • ${log.window_title || 'No title'}`,
              })),
          });
        }
      } catch (error) {
        console.error('Error loading screenshots for selected employee:', error);
        if (!cancelled) {
          setScreenshotError('Unable to load screenshots at this time.');
          setActivityData((prev) => ({
            ...prev,
            activeTime,
            productiveTime,
            nonproductiveTime: Math.max(0, activeTime - productiveTime),
            idleTime,
            awayTime: 0,
            productivity,
            currentApp,
            sessionStartTime,
            activityLogs: selectedLogs
              .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
              .map((log) => ({
                timestamp: new Date(log.logged_at).toLocaleTimeString(),
                type: log.activity_type,
                details: log.activity_type === 'idle_reason'
                  ? (log.idle_reason || 'Idle reason provided')
                  : `${log.app_name || 'Unknown'} • ${log.window_title || 'No title'}`,
              })),
          }));
        }
      } finally {
        if (!cancelled) {
          setScreenshotsLoading(false);
        }
      }
    };

    loadScreenshots();

    if (selectedSession?.punch_in_time) {
      const start = new Date(selectedSession.punch_in_time).getTime();
      const diff = Date.now() - start;
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setSessionDuration(`${hours}h ${mins}m`);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedEmployee, sessions, activityLogs]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'idle':
        return 'bg-yellow-100 text-yellow-800';
      case 'away':
        return 'bg-orange-100 text-orange-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              Employee Monitoring
            </h1>
            <p className="text-gray-600 mt-2">Real-time employee activity tracking</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm">
            <span className="text-sm font-semibold text-gray-600">Select Date:</span>
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => date && setSelectedDate(date)}
              className="border-none focus:ring-0 text-gray-900 font-bold bg-transparent w-28 cursor-pointer"
              dateFormat="MMM d, yyyy"
              maxDate={new Date()}
            />
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900">{employees.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Online</p>
                <p className="text-3xl font-bold text-green-600">
                  {employees.filter((e) => e.status === 'online').length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Idle</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {employees.filter((e) => e.status === 'idle').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Offline</p>
                <p className="text-3xl font-bold text-gray-600">
                  {employees.filter((e) => e.status === 'offline').length}
                </p>
              </div>
              <LogOut className="w-8 h-8 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Employees List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shrink-0">
              <h2 className="font-bold text-lg">Employees</h2>
            </div>
            <div className="divide-y max-h-[890px] overflow-y-auto custom-scrollbar">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`p-4 cursor-pointer transition ${selectedEmployee?.id === emp.id
                    ? 'bg-blue-50 border-l-4 border-blue-600'
                    : 'hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${getStatusColor(emp.status)} flex items-center justify-center font-bold text-sm shrink-0`}
                    >
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{emp.name}</p>
                      <p className="text-gray-500 text-xs truncate mb-1">{emp.department}</p>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${emp.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                        />
                        <span className="text-xs text-gray-600 capitalize">{emp.status}</span>
                        <span className="text-gray-300 text-xs">•</span>
                        <span className="text-xs text-gray-500 truncate">{emp.lastSync}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Details */}
          <div className="lg:col-span-3 space-y-6">
            {selectedEmployee ? (
              <>
                {/* Employee Header */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-16 h-16 rounded-full ${getStatusColor(selectedEmployee.status)} flex items-center justify-center text-2xl font-bold`}
                      >
                        {selectedEmployee.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {selectedEmployee.name}
                        </h3>
                        <p className="text-gray-600">{selectedEmployee.department}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div
                            className={`w-3 h-3 rounded-full ${selectedEmployee.status === 'online'
                              ? 'bg-green-500'
                              : 'bg-gray-400'
                              }`}
                          />
                          <span className={`text-sm font-semibold capitalize ${selectedEmployee.status === 'online'
                            ? 'text-green-600'
                            : 'text-gray-600'
                            }`}>
                            {selectedEmployee.status === 'online' ? 'Working' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Last Sync</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedEmployee.lastSync}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Time Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-gray-600 text-sm font-semibold mb-2">Active Time</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatTime(activityData.activeTime)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-gray-600 text-sm font-semibold mb-2">Productive</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatTime(activityData.productiveTime)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-gray-600 text-sm font-semibold mb-2">Non-Productive</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatTime(activityData.nonproductiveTime)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-gray-600 text-sm font-semibold mb-2">Idle Time</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatTime(activityData.idleTime)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-gray-600 text-sm font-semibold mb-2">Away Time</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatTime(activityData.awayTime)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-gray-600 text-sm font-semibold mb-2">Productivity</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {activityData.productivity}%
                    </p>
                  </div>
                </div>

                {/* Current Session */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-bold text-lg mb-4 text-gray-900">Current Session</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm">Login Time</p>
                      <p className="font-semibold text-gray-900">{selectedEmployee.lastSync}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Total Duration</p>
                      <p className="font-semibold text-gray-900">{sessionDuration}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Status</p>
                      <p className="font-semibold text-green-600 capitalize">
                        {selectedEmployee.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Current App</p>
                      <p className="font-semibold text-gray-900">{activityData.currentApp}</p>
                    </div>
                  </div>
                </div>

                {/* Activity Tabs */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="flex border-b">
                    {[
                      { id: 'activity', label: 'Activity', icon: Activity },
                      { id: 'applications', label: 'Applications', icon: Activity },
                      { id: 'screenshots', label: 'Screenshots', icon: Eye },
                      { id: 'alerts', label: 'Idle Alerts', icon: AlertCircle },
                      { id: 'logs', label: 'Call Logs', icon: Zap },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id as any)}
                        className={`flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition ${activeTab === id
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="p-6">
                    {activeTab === 'activity' && (
                      <div>
                        {activityData.activityLogs.length > 0 ? (
                          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {activityData.activityLogs.map((log, idx) => (
                              <div key={idx} className={`flex gap-3 pb-3 border-b last:border-0 ${log.type === 'idle_reason' ? 'bg-amber-50/50 p-2 rounded -mx-2' : ''}`}>
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${log.type === 'idle_reason' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                <div className="flex-1">
                                  <p className={`text-sm font-semibold ${log.type === 'idle_reason' ? 'text-amber-900' : 'text-gray-900'}`}>
                                    {log.type === 'idle_reason' ? (
                                      <>
                                        <span className="uppercase text-[10px] tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded mr-2 align-middle">Alert</span>
                                        {log.details}
                                      </>
                                    ) : (
                                      log.details
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">{log.timestamp}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-8">
                            No activity logs yet — agent sends data every 30 seconds.
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === 'applications' && (
                      <div>
                        {activityData.activityLogs.length > 0 ? (
                          <div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                              {Array.from(
                                new Map(
                                  activityData.activityLogs
                                    .filter((log) => log.details.includes('•'))
                                    .map((log) => {
                                      const appName = log.details.split(' • ')[0];
                                      return [appName, appName];
                                    })
                                ).entries()
                              ).map(([appName]) => (
                                <div
                                  key={appName}
                                  className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
                                >
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {appName}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {
                                      activityData.activityLogs.filter((log) =>
                                        log.details.startsWith(appName)
                                      ).length
                                    }{' '}
                                    activities
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <p className="text-sm font-semibold text-gray-900 mb-3">
                                All Application Activities
                              </p>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {activityData.activityLogs.map((log, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-700 font-medium">
                                      {log.details.split(' • ')[0]}
                                    </span>
                                    <span className="text-gray-500">{log.timestamp}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-8">
                            No applications recorded yet.
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === 'screenshots' && (
                      <div>
                        {screenshotsLoading ? (
                          <div className="text-center text-gray-500 py-8">
                            Loading screenshots...
                          </div>
                        ) : screenshotError ? (
                          <div className="text-center text-rose-500 py-8 text-sm font-semibold">
                            {screenshotError}
                          </div>
                        ) : activityData.screenshots.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activityData.screenshots.map((shot, idx) => (
                              <div key={idx} className="relative group overflow-hidden rounded-lg border border-slate-200 shadow-sm bg-slate-50">
                                <img
                                  src={shot.url}
                                  alt={shot.appName}
                                  className="w-full h-36 object-cover"
                                />
                                <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black bg-opacity-40 rounded flex items-end p-3 text-white text-xs">
                                  <div>
                                    <p className="font-semibold truncate">{shot.appName || 'Unknown'}</p>
                                    <p className="text-gray-200">{shot.timestamp}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-8">
                            No screenshots captured yet.
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === 'alerts' && (
                      <div>
                        {activityData.activityLogs.filter(log => log.type === 'idle_reason').length > 0 ? (
                          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {activityData.activityLogs.filter(log => log.type === 'idle_reason').map((log, idx) => (
                              <div key={idx} className="flex gap-3 pb-3 border-b last:border-0">
                                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-amber-900">
                                    {log.details}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">{log.timestamp}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-8">
                            No idle alerts at this moment.
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === 'logs' && (
                      <div>
                        <p className="text-center text-gray-500 py-8">
                          No call logs available.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">Select an employee to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
