import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Monitor,
  FileText,
  BarChart3,
  MapPin,
  Settings,
  User,
  Search,
  Moon,
  Sun,
  Bell,
  LogOut,
  Clock,
  Activity,
  TrendingUp,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  Filter,
  BarChart2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import MonitoringDashboard from './MonitoringDashboard';
import WindowControls from './WindowControls';
import {
  fetchAllEmployees,
  fetchRecentSessions,
  fetchRecentActivityLogs,
  fetchEmployeeActivity,
  getMonitoringSettings,
  updateMonitoringSettings,
  getAppClassifications,
  saveAppClassification,
  deleteAppClassification,
  createEmployee,
  updateEmployee,
  updateEmployeeProductiveApps,
  ActivityLog,
  WorkSession,
  MonitoringSettings as SettingsType,
  AppClassification as ClassificationType
} from '../lib/supabase';


interface DepartmentStats {
  name: string;
  employees: number;
  avgProductivity: number;
  activeEmployees: number;
}

interface EmployeeQuickView {
  id: string;
  name: string;
  department: string;
  status: 'online' | 'idle' | 'away' | 'offline';
  productivity: number;
  currentApp: string;
  sessionDuration: string;
  email?: string;
  position?: string;
  role?: string;
  productive_apps?: string[];
}

interface AdminMonitoringScreenProps {
  onLogout?: () => void;
}

const AdminMonitoringScreen: React.FC<AdminMonitoringScreenProps> = ({ onLogout }) => {
  // Navigation State
  const [sidebarActive, setSidebarActive] = useState<
    'dashboard' | 'employees' | 'monitoring' | 'reports' | 'analytics' | 'field_tracking' | 'settings' | 'profile'
  >('dashboard');

  // Inner Settings Tab State
  const [settingsTab, setSettingsTab] = useState<'profile' | 'timings' | 'monitoring' | 'notifications'>('monitoring');

  // Overview / Detailed dashboard views
  const [activeView, setActiveView] = useState<'overview' | 'detailed'>('overview'); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Settings Form State
  const [idleTimeout, setIdleTimeout] = useState<number>(10);
  const [idleCountdown, setIdleCountdown] = useState<number>(30);
  const [screenshotInterval, setScreenshotInterval] = useState<number>(3);
  const [trackApps, setTrackApps] = useState<boolean>(true);
  const [trackWebsites, setTrackWebsites] = useState<boolean>(true);
  const [trackKeystrokes, setTrackKeystrokes] = useState<boolean>(false);
  const [blurScreenshots, setBlurScreenshots] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Predefined Screenshot Intervals
  const predefinedIntervals = [1, 3, 5, 10];
  const [customIntervalMode, setCustomIntervalMode] = useState<boolean>(false);

  // App Classifications State
  const [classifications, setClassifications] = useState<ClassificationType[]>([]);
  const [newAppName, setNewAppName] = useState<string>('');
  const [newClassification, setNewClassification] = useState<'productive' | 'non_productive' | 'neutral'>('productive');

  // Dashboard Data State
  const [employeesList, setEmployeesList] = useState<EmployeeQuickView[]>([]);
  const [recentActivityLogs, setRecentActivityLogs] = useState<ActivityLog[]>([]);
  const [selectedEmployeeActivity, setSelectedEmployeeActivity] = useState<any[]>([]);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // Employee Add / App Config State
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    department: '',
    role: 'employee',
    phone: '',
    employee_code: '',
    password: ''
  });
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState('All Departments');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('All Status');
  const [isAppConfigModalOpen, setIsAppConfigModalOpen] = useState(false);
  const [selectedEmployeeForApps, setSelectedEmployeeForApps] = useState<EmployeeQuickView | null>(null);
  const [selectedProductiveApps, setSelectedProductiveApps] = useState<string[]>([]);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [newConfigAppName, setNewConfigAppName] = useState('');

  // Reports State
  const [reportPeriod, setReportPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [reportStartDate, setReportStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportDeptFilter, setReportDeptFilter] = useState('All Departments');
  const [reportSearch, setReportSearch] = useState('');

  // Analytics State
  const [selectedAnalyticsEmployee, setSelectedAnalyticsEmployee] = useState<string>('all');

  const [chartData, setChartData] = useState([
    { name: 'Mon', productivity: 78, active: 18 },
    { name: 'Tue', productivity: 82, active: 19 },
    { name: 'Wed', productivity: 75, active: 17 },
    { name: 'Thu', productivity: 85, active: 20 },
    { name: 'Fri', productivity: 88, active: 21 },
    { name: 'Sat', productivity: 45, active: 8 },
    { name: 'Sun', productivity: 0, active: 0 },
  ]);

  const [statusDistribution, setStatusDistribution] = useState([
    { name: 'Online', value: 0, color: '#10b981' },
    { name: 'Idle', value: 0, color: '#f59e0b' },
    { name: 'Away', value: 0, color: '#ef4444' },
    { name: 'Offline', value: 0, color: '#9ca3af' },
  ]);

  // Load Settings & Classifications
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getMonitoringSettings();
        if (settings) {
          setIdleTimeout(settings.idle_timeout_minutes);
          setIdleCountdown(settings.idle_alert_countdown_seconds);
          setScreenshotInterval(settings.screenshot_interval_minutes);
          setTrackApps(settings.track_apps);
          setTrackWebsites(settings.track_websites);
          setTrackKeystrokes(settings.track_keystrokes);
          setBlurScreenshots(settings.blur_screenshots);

          if (!predefinedIntervals.includes(settings.screenshot_interval_minutes)) {
            setCustomIntervalMode(true);
          }
        }

        const appClasses = await getAppClassifications();
        setClassifications(appClasses);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();
  }, []);

  // Fetch Dashboard Stats
  useEffect(() => {
    const loadAdminStats = async () => {
      try {
        const [employees, sessions, logs] = await Promise.all([
          fetchAllEmployees(),
          fetchRecentSessions(100),
          fetchRecentActivityLogs(100),
        ]);

        const sessionMap = new Map<string, WorkSession>();
        sessions.forEach((session) => sessionMap.set(session.employee_id, session));

        const updatedEmployeeList: EmployeeQuickView[] = employees.map((employee) => {
          const session = sessionMap.get(employee.id);
          const currentLog = logs.find((log) => log.employee_id === employee.id);
          const activeSeconds = session?.active_seconds ?? 0;
          const productiveSeconds = session?.productive_seconds ?? 0;
          const productivity = activeSeconds > 0
            ? Math.round((productiveSeconds / activeSeconds) * 100)
            : 0;

          return {
            id: employee.id,
            name: employee.employee_name,
            department: employee.department || (employee.role === 'admin' ? 'Administration' : 'Productivity Dept'),
            email: employee.email || '',
            position: employee.position || '',
            role: employee.role || 'employee',
            productive_apps: employee.productive_apps || [],
            status: activeSeconds > 0 ? 'online' : 'offline',
            productivity,
            currentApp: currentLog?.app_name ?? 'None',
            sessionDuration: session?.punch_in_time
              ? `${Math.floor((Date.now() - new Date(session.punch_in_time).getTime()) / 3600000)}h ${Math.floor(((Date.now() - new Date(session.punch_in_time).getTime()) % 3600000) / 60000)}m`
              : 'N/A',
          };
        });

        const statusCounts = { online: 0, idle: 0, away: 0, offline: 0 };
        updatedEmployeeList.forEach((emp) => {
          statusCounts[emp.status] += 1;
        });

        setEmployeesList(updatedEmployeeList);
        setStatusDistribution([
          { name: 'Online', value: statusCounts.online, color: '#10b981' },
          { name: 'Idle', value: statusCounts.idle, color: '#f59e0b' },
          { name: 'Away', value: statusCounts.away, color: '#ef4444' },
          { name: 'Offline', value: statusCounts.offline, color: '#9ca3af' },
        ]);

        setRecentActivityLogs(logs.slice(0, 8));

        const chartMap = new Map<string, { productivity: number; active: number; count: number }>();
        sessions.forEach((session) => {
          const day = session.session_date;
          const prev = chartMap.get(day) ?? { productivity: 0, active: 0, count: 0 };
          const productivity = session.active_seconds > 0
            ? Math.round((session.productive_seconds / session.active_seconds) * 100)
            : 0;
          chartMap.set(day, {
            productivity: prev.productivity + productivity,
            active: prev.active + session.active_seconds,
            count: prev.count + 1,
          });
        });

        const chartData = Array.from(chartMap.entries())
          .slice(-7)
          .map(([name, values]) => ({
            name,
            productivity: Math.round(values.productivity / values.count),
            active: Math.round(values.active / values.count),
          }));

        if (chartData.length > 0) {
          setChartData(chartData);
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    };

    loadAdminStats();
    const interval = setInterval(loadAdminStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalEmployees = employeesList.length;
  const activeEmployees = employeesList.filter((emp) => emp.status === 'online').length;
  const avgProductivity = employeesList.length > 0
    ? Math.round(employeesList.reduce((sum, emp) => sum + emp.productivity, 0) / employeesList.length)
    : 0;

  const departmentStats: DepartmentStats[] = Object.values(
    employeesList.reduce((acc, emp) => {
      const key = emp.department || 'Unknown';
      if (!acc[key]) {
        acc[key] = {
          name: key,
          employees: 0,
          avgProductivity: 0,
          activeEmployees: 0,
        };
      }
      acc[key].employees += 1;
      acc[key].avgProductivity += emp.productivity;
      if (emp.status === 'online') {
        acc[key].activeEmployees += 1;
      }
      return acc;
    }, {} as Record<string, DepartmentStats>)
  ).map((dept) => ({
    ...dept,
    avgProductivity: dept.employees > 0 ? Math.round(dept.avgProductivity / dept.employees) : 0,
  }));

  // Handle Save Settings
  const handleSaveSettings = async () => {
    setSaveLoading(true);
    try {
      const payload: Partial<SettingsType> = {
        idle_timeout_minutes: idleTimeout,
        idle_alert_countdown_seconds: idleCountdown,
        screenshot_interval_minutes: screenshotInterval,
        track_apps: trackApps,
        track_websites: trackWebsites,
        track_keystrokes: trackKeystrokes,
        blur_screenshots: blurScreenshots,
      };

      const result = await updateMonitoringSettings(payload);
      if (result) {
        // Sync to electron process immediately if available
        const api = (window as any).electronAPI;
        if (api?.updateMonitoringSettings) {
          await api.updateMonitoringSettings(result);
        }

        setToastMessage('Changes saved successfully!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle Classification Add
  const handleAddClassification = async () => {
    if (!newAppName.trim()) return;
    try {
      const result = await saveAppClassification(newAppName.trim(), newClassification);
      if (result) {
        setClassifications(prev => {
          const index = prev.findIndex(c => c.name.toLowerCase() === newAppName.toLowerCase());
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = result;
            return updated;
          }
          return [...prev, result].sort((a, b) => a.name.localeCompare(b.name));
        });

        // Sync classifications to Electron immediately
        const api = (window as any).electronAPI;
        if (api?.updateAppClassifications) {
          const latestClasses = await getAppClassifications();
          await api.updateAppClassifications(latestClasses);
        }

        setNewAppName('');
      }
    } catch (err) {
      console.error('Failed to save app classification:', err);
    }
  };

  // Handle Classification Delete
  const handleDeleteClassification = async (id: string) => {
    try {
      const success = await deleteAppClassification(id);
      if (success) {
        setClassifications(prev => prev.filter(c => c.id !== id));

        // Sync classifications to Electron immediately
        const api = (window as any).electronAPI;
        if (api?.updateAppClassifications) {
          const latestClasses = await getAppClassifications();
          await api.updateAppClassifications(latestClasses);
        }
      }
    } catch (err) {
      console.error('Failed to delete app classification:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-100 text-emerald-800';
      case 'idle': return 'bg-amber-100 text-amber-800';
      case 'away': return 'bg-rose-100 text-rose-800';
      case 'offline': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const handleAddEmployeeSubmit = async () => {
    if (!newEmployee.first_name || !newEmployee.employee_code || (!editingEmployeeId && !newEmployee.password)) {
      alert("First Name, Employee Code, and Password are required.");
      return;
    }
    setIsSavingEmployee(true);
    try {
      const empData: any = {
        employee_code: newEmployee.employee_code,
        employee_name: `${newEmployee.first_name} ${newEmployee.last_name}`.trim(),
        first_name: newEmployee.first_name,
        last_name: newEmployee.last_name,
        email: newEmployee.email,
        position: newEmployee.position,
        department: newEmployee.department,
        role: newEmployee.role as any,
        phone: newEmployee.phone,
      };
      if (newEmployee.password) {
        empData.password_hash = newEmployee.password;
      }

      let result;
      if (editingEmployeeId) {
        result = await updateEmployee(editingEmployeeId, empData);
      } else {
        empData.password_hash = newEmployee.password;
        result = await createEmployee(empData);
      }

      if (result) {
        setToastMessage(editingEmployeeId ? 'Employee updated successfully!' : 'Employee added successfully!');
        setShowToast(true);
        setIsAddEmployeeModalOpen(false);
        setEditingEmployeeId(null);
        setNewEmployee({
          first_name: '', last_name: '', email: '', position: '', department: '',
          role: 'employee', phone: '', employee_code: '', password: ''
        });
        // Refresh employee list
        const employees = await fetchAllEmployees();
        const sessions = await fetchRecentSessions(100);
        const sessionMap = new Map();
        sessions.forEach((s: any) => sessionMap.set(s.employee_id, s));
        setEmployeesList(employees.map((emp: any) => {
          const session = sessionMap.get(emp.id);
          return {
            id: emp.id,
            name: emp.employee_name,
            department: emp.department || 'Productivity Dept',
            email: emp.email || '',
            position: emp.position || '',
            role: emp.role || 'employee',
            productive_apps: emp.productive_apps || [],
            status: session?.active_seconds > 0 ? 'online' : 'offline' as const,
            productivity: 0,
            currentApp: 'None',
            sessionDuration: 'N/A'
          };
        }));
        setTimeout(() => setShowToast(false), 3000);
      } else {
        alert(editingEmployeeId ? "Failed to update employee." : "Failed to add employee.");
      }
    } catch (e) {
      console.error(e);
      alert(editingEmployeeId ? "Error updating employee." : "Error adding employee.");
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const handleSaveAppConfig = async () => {
    if (!selectedEmployeeForApps) return;
    setIsSavingEmployee(true);
    try {
      const result = await updateEmployeeProductiveApps(selectedEmployeeForApps.id, selectedProductiveApps);
      if (result) {
        setToastMessage('App configuration saved successfully!');
        setShowToast(true);
        setIsAppConfigModalOpen(false);
        setTimeout(() => setShowToast(false), 3000);
        // Optimistically update list
        setEmployeesList(prev => prev.map(emp => 
          emp.id === selectedEmployeeForApps.id 
            ? { ...emp, productive_apps: selectedProductiveApps } 
            : emp
        ));
      }
    } catch (e) {
      console.error(e);
      alert("Error saving app configuration.");
    } finally {
      setIsSavingEmployee(false);
    }
  };


  const getProductivityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  const filteredReportList = employeesList
    .filter(e => reportDeptFilter === 'All Departments' || e.department === reportDeptFilter)
    .filter(e => !reportSearch || e.name.toLowerCase().includes(reportSearch.toLowerCase()));

  const reportStats = filteredReportList.reduce((acc, e) => {
    const parts = e.sessionDuration !== 'N/A' ? e.sessionDuration.split(/[hm]/) : ['0','0'];
    const hours = parseInt(parts[0]) || 0;
    const mins = parseInt(parts[1]) || 0;
    const totalHrs = (hours + mins/60);
    const activeHrs = totalHrs * (e.productivity / 100);
    const idleHrs = totalHrs * (1 - e.productivity / 100);
    
    acc.total += totalHrs;
    acc.active += activeHrs;
    acc.idle += idleHrs;
    acc.prodSum += e.productivity;
    return acc;
  }, { total: 0, active: 0, idle: 0, prodSum: 0 });

  const avgReportProd = filteredReportList.length > 0 ? (reportStats.prodSum / filteredReportList.length) : 0;

  const downloadReportsCSV = () => {
    const headers = ['Employee', 'Department', 'Total Hours', 'Active Hours', 'Idle Hours', 'Productivity'];
    
    const rows = filteredReportList.map(e => {
      const parts = e.sessionDuration !== 'N/A' ? e.sessionDuration.split(/[hm]/) : ['0','0'];
      const hours = parseInt(parts[0]) || 0;
      const mins = parseInt(parts[1]) || 0;
      const totalHrs = (hours + mins/60).toFixed(1);
      const activeHrs = ((hours + mins/60) * (e.productivity / 100)).toFixed(1);
      const idleHrs = ((hours + mins/60) * (1 - e.productivity / 100)).toFixed(1);
      
      return [
        `"${e.name}"`, 
        `"${e.department}"`, 
        `${totalHrs}h`, 
        `${activeHrs}h`, 
        `${idleHrs}h`, 
        `${Math.round(e.productivity)}%`
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `workforce_report_${reportStartDate}_to_${reportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">

      {/* ── LEFT SIDEBAR ──────────────────────────────────────── */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between select-none shrink-0">
        <div>
          {/* Brand/Logo Header */}
          <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">TimeGuard</span>
            </div>
            <button className="text-slate-400 hover:text-slate-600 p-1">
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setSidebarActive('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${sidebarActive === 'dashboard'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setSidebarActive('employees')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${sidebarActive === 'employees'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <Users className="w-4 h-4" />
              Employees
            </button>
            <button
              onClick={() => setSidebarActive('monitoring')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${sidebarActive === 'monitoring'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <Monitor className="w-4 h-4" />
              Monitoring
            </button>
            <button
              onClick={() => setSidebarActive('reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${sidebarActive === 'reports'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <FileText className="w-4 h-4" />
              Reports
            </button>
            <button
              onClick={() => setSidebarActive('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${sidebarActive === 'analytics'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
            <button
              onClick={() => setSidebarActive('field_tracking')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${sidebarActive === 'field_tracking'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <MapPin className="w-4 h-4" />
              Field Tracking
            </button>
            <button
              onClick={() => setSidebarActive('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${sidebarActive === 'settings'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => setSidebarActive('profile')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${sidebarActive === 'profile'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <User className="w-4 h-4" />
              Profile
            </button>
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 relative">
            A
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">Administrator</p>
            <p className="text-xs text-slate-400 truncate">admin@company.com</p>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── TOP NAVBAR ──────────────────────────────────────── */}
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0 select-none">
          {/* Search bar */}
          <div className="w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employees, reports..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-transparent focus:bg-white focus:border-slate-200 text-sm outline-none transition placeholder:text-slate-400"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            <WindowControls />

            {/* Dark mode toggle */}
            <button
              onClick={() => setThemeMode(prev => prev === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            >
              {themeMode === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition">
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-rose-500 border border-white absolute top-1.5 right-1.5" />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            {/* Log out */}
            <button
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  localStorage.removeItem('employeeId');
                  window.location.reload();
                }
              }}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-rose-500 px-3 py-2 rounded-lg hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </header>

        {/* ── DASHBOARD PAGES CONTENT ───────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">

          {/* ─── CASE 1: SETTINGS VIEW ─────────────────────────── */}
          {sidebarActive === 'settings' && (
            <div className="max-w-6xl mx-auto space-y-6">

              {/* Header with Save Changes Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 leading-none">Settings</h1>
                  <p className="text-sm text-slate-500 mt-2">Configure your workspace preferences</p>
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={saveLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold shadow-sm transition"
                >
                  {saveLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Save Changes
                </button>
              </div>

              {/* Toast Notification */}
              {showToast && (
                <div className="fixed top-6 right-6 z-50 bg-slate-950 text-white px-4 py-3 rounded-lg shadow-xl border border-slate-800 flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-300">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold">{toastMessage}</span>
                </div>
              )}

              {/* Settings Core Layout */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex min-h-[500px]">

                {/* Secondary settings sidebar list */}
                <div className="w-60 border-r border-slate-100 p-4 shrink-0 flex flex-col gap-1 select-none">
                  <button
                    onClick={() => setSettingsTab('profile')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${settingsTab === 'profile'
                      ? 'bg-blue-50/70 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                  >
                    <User className="w-4 h-4" />
                    Company Profile
                  </button>
                  <button
                    onClick={() => setSettingsTab('timings')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${settingsTab === 'timings'
                      ? 'bg-blue-50/70 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                  >
                    <Clock className="w-4 h-4" />
                    Work Timings
                  </button>
                  <button
                    onClick={() => setSettingsTab('monitoring')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${settingsTab === 'monitoring'
                      ? 'bg-blue-50/70 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                  >
                    <Monitor className="w-4 h-4" />
                    Monitoring
                  </button>
                  <button
                    onClick={() => setSettingsTab('notifications')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${settingsTab === 'notifications'
                      ? 'bg-blue-50/70 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                  >
                    <Bell className="w-4 h-4" />
                    Notifications
                  </button>
                </div>

                {/* Settings Tab Content */}
                <div className="flex-1 p-8 space-y-8 overflow-x-hidden">

                  {/* MONITORING PREFERENCES (Matching design) */}
                  {settingsTab === 'monitoring' && (
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Monitoring Settings</h2>
                        <div className="h-px bg-slate-100 my-4" />
                      </div>

                      {/* Configurable Number Inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        {/* Idle Timeout */}
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Idle Timeout (minutes)</label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={idleTimeout}
                            onChange={(e) => setIdleTimeout(parseInt(e.target.value) || 1)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:bg-white focus:border-blue-500 transition"
                          />
                          <p className="text-xs text-slate-400 font-medium">Time before marking employee as idle</p>
                        </div>

                        {/* Idle Countdown */}
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Idle Alert Countdown (seconds)</label>
                          <input
                            type="number"
                            min="5"
                            max="300"
                            value={idleCountdown}
                            onChange={(e) => setIdleCountdown(parseInt(e.target.value) || 5)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:bg-white focus:border-blue-500 transition"
                          />
                          <p className="text-xs text-slate-400 font-medium">Seconds the popup stays before choosing YES/NO</p>
                        </div>

                        {/* Screenshot Interval */}
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-semibold text-slate-700">Screenshot Interval (minutes)</label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                              <input
                                type="number"
                                min="1"
                                max="60"
                                disabled={!customIntervalMode}
                                value={screenshotInterval}
                                onChange={(e) => setScreenshotInterval(parseInt(e.target.value) || 1)}
                                className={`w-full px-3.5 py-2.5 border rounded-lg text-slate-800 text-sm outline-none transition ${customIntervalMode
                                  ? 'bg-white border-blue-500 focus:border-blue-600'
                                  : 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400'
                                  }`}
                              />
                            </div>
                            <div className="flex gap-2 shrink-0">
                              {predefinedIntervals.map(min => (
                                <button
                                  key={min}
                                  type="button"
                                  onClick={() => {
                                    setCustomIntervalMode(false);
                                    setScreenshotInterval(min);
                                  }}
                                  className={`px-4 py-2 text-xs font-semibold rounded-lg border transition ${!customIntervalMode && screenshotInterval === min
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                  {min} min
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setCustomIntervalMode(true)}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition ${customIntervalMode
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                              >
                                Custom
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 font-medium mt-1">Interval between automatic screenshots</p>
                        </div>
                      </div>

                      {/* Toggle Options (Form switches) */}
                      <div className="space-y-4">
                        {/* Track Application Usage */}
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Track application usage</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTrackApps(prev => !prev)}
                            className={`w-11 h-6 flex items-center rounded-full p-0.5 transition duration-300 ease-in-out outline-none ${trackApps ? 'bg-blue-600' : 'bg-slate-200'
                              }`}
                          >
                            <div
                              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition duration-300 ease-in-out ${trackApps ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                          </button>
                        </div>

                        {/* Track Website Visits */}
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Track website visits</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTrackWebsites(prev => !prev)}
                            className={`w-11 h-6 flex items-center rounded-full p-0.5 transition duration-300 ease-in-out outline-none ${trackWebsites ? 'bg-blue-600' : 'bg-slate-200'
                              }`}
                          >
                            <div
                              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition duration-300 ease-in-out ${trackWebsites ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                          </button>
                        </div>

                        {/* Track Keystrokes */}
                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Track keystrokes (privacy mode)</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTrackKeystrokes(prev => !prev)}
                            className={`w-11 h-6 flex items-center rounded-full p-0.5 transition duration-300 ease-in-out outline-none ${trackKeystrokes ? 'bg-blue-600' : 'bg-slate-200'
                              }`}
                          >
                            <div
                              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition duration-300 ease-in-out ${trackKeystrokes ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                          </button>
                        </div>

                        {/* Blur screenshots */}
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Blur screenshots for privacy</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBlurScreenshots(prev => !prev)}
                            className={`w-11 h-6 flex items-center rounded-full p-0.5 transition duration-300 ease-in-out outline-none ${blurScreenshots ? 'bg-blue-600' : 'bg-slate-200'
                              }`}
                          >
                            <div
                              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition duration-300 ease-in-out ${blurScreenshots ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Productive App Management */}
                      <div className="space-y-4 pt-6 border-t border-slate-200">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Productive App Management</h3>
                          <p className="text-xs text-slate-400 mt-1 font-medium">Classify applications and websites to calculate productivity automatically.</p>
                        </div>

                        {/* Input tools */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            placeholder="App or website name (e.g. YouTube, Figma)"
                            value={newAppName}
                            onChange={(e) => setNewAppName(e.target.value)}
                            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:bg-white focus:border-blue-500 transition"
                          />
                          <select
                            value={newClassification}
                            onChange={(e) => setNewClassification(e.target.value as any)}
                            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:bg-white focus:border-blue-500 transition"
                          >
                            <option value="productive">Productive</option>
                            <option value="non_productive">Non-Productive</option>
                            <option value="neutral">Neutral</option>
                          </select>
                          <button
                            onClick={handleAddClassification}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-950 text-white text-sm font-semibold hover:bg-slate-900 shadow-sm transition"
                          >
                            <Plus className="w-4 h-4" />
                            Add App
                          </button>
                        </div>

                        {/* Table List of Classifications */}
                        <div className="border border-slate-100 rounded-lg overflow-hidden mt-3 max-h-72 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                              <tr>
                                <th className="px-4 py-2 text-left">App / Website Name</th>
                                <th className="px-4 py-2 text-left">Classification</th>
                                <th className="px-4 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {classifications.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="text-center py-6 text-slate-400 text-xs">
                                    No app classifications configured yet.
                                  </td>
                                </tr>
                              ) : (
                                classifications.map(c => (
                                  <tr key={c.id} className="hover:bg-slate-50/40">
                                    <td className="px-4 py-3 font-semibold text-slate-700">{c.name}</td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${c.classification === 'productive'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : c.classification === 'non_productive'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {c.classification === 'productive'
                                          ? 'Productive'
                                          : c.classification === 'non_productive'
                                            ? 'Non-Productive'
                                            : 'Neutral'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <button
                                        onClick={() => handleDeleteClassification(c.id)}
                                        className="p-1.5 rounded text-slate-400 hover:text-rose-500 transition hover:bg-rose-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* PLACEHOLDERS FOR OTHER TABS */}
                  {settingsTab === 'profile' && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold text-slate-900">Company Profile</h2>
                      <div className="h-px bg-slate-100 my-4" />
                      <p className="text-sm text-slate-500">Configure company metadata and profile preferences.</p>
                      <div className="w-96 p-6 border border-dashed border-slate-300 rounded-lg text-center text-slate-400 text-sm">
                        Company profile configuration panel
                      </div>
                    </div>
                  )}

                  {settingsTab === 'timings' && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold text-slate-900">Work Timings</h2>
                      <div className="h-px bg-slate-100 my-4" />
                      <p className="text-sm text-slate-500">Define office working hours, punch-in rules, and timezones.</p>
                      <div className="w-96 p-6 border border-dashed border-slate-300 rounded-lg text-center text-slate-400 text-sm">
                        Office work schedule configuration panel
                      </div>
                    </div>
                  )}

                  {settingsTab === 'notifications' && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
                      <div className="h-px bg-slate-100 my-4" />
                      <p className="text-sm text-slate-500">Set alert rules and notifications for employee idle events.</p>
                      <div className="w-96 p-6 border border-dashed border-slate-300 rounded-lg text-center text-slate-400 text-sm">
                        Alert notifications rules configuration panel
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

          {/* ─── CASE 2: DASHBOARD VIEW ─────────────────────────── */}
          {sidebarActive === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-8 select-none">
              {/* Header */}
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 leading-none">Super Admin Monitoring</h1>
                  <p className="text-sm text-slate-500 mt-2">Real-time employee monitoring and analytics</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSidebarActive('monitoring')}
                    className="bg-blue-600 text-white text-sm font-semibold px-4.5 py-2.5 rounded-lg hover:bg-blue-700 transition shadow-sm"
                  >
                    View Detailed Dashboard
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Employees</p>
                    <p className="text-3xl font-extrabold text-slate-800 mt-2">{totalEmployees}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Currently Active</p>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-2">{activeEmployees}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <Activity className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Avg Productivity</p>
                    <p className="text-3xl font-extrabold text-indigo-600 mt-2">{avgProductivity}%</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Departments</p>
                    <p className="text-3xl font-extrabold text-purple-600 mt-2">{departmentStats.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Productivity Trend */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-base font-bold text-slate-800 mb-4">Weekly Productivity Trend</h2>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <ChartTooltip />
                        <Legend />
                        <Bar dataKey="productivity" fill="#2563eb" radius={[4, 4, 0, 0]} name="Productivity %" />
                        <Bar dataKey="active" fill="#10b981" radius={[4, 4, 0, 0]} name="Active Employees" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                  <h2 className="text-base font-bold text-slate-800 mb-4">Employee Status</h2>
                  <div className="h-60 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {statusDistribution.map(status => (
                      <div key={status.name} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                        <span className="text-slate-600 font-semibold">{status.name} ({status.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Employee View (With original functionalities) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold text-slate-800">Quick Employee Overview</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                        <th className="py-3 px-4">Employee Name</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Current App</th>
                        <th className="py-3 px-4">Productivity</th>
                        <th className="py-3 px-4">Session Duration</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employeesList.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-55/30 transition">
                          <td className="py-3 px-4 font-semibold text-slate-800">{emp.name}</td>
                          <td className="py-3 px-4 text-slate-500 font-medium">{emp.department}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(emp.status)}`}>
                              {emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium truncate max-w-44">{emp.currentApp}</td>
                          <td className="py-3 px-4 font-bold">
                            <span className={getProductivityColor(emp.productivity)}>{emp.productivity}%</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium">{emp.sessionDuration}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={async () => {
                                setLoadingActivity(true);
                                setActivityModalOpen(true);
                                const data = await fetchEmployeeActivity(emp.id, 200);
                                setSelectedEmployeeActivity(data || []);
                                setLoadingActivity(false);
                              }}
                              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline bg-transparent"
                            >
                              View Activity
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Activity Logs (original) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Recent Activity Logs</h2>
                    <p className="text-xs text-slate-400 mt-1 font-semibold">Latest actions from employee records.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:bg-white outline-none outline-offset-0 focus:border-blue-500 transition"
                    />
                    <button
                      onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Today
                    </button>
                  </div>
                </div>

                {recentActivityLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                          <th className="py-3 px-4">Time</th>
                          <th className="py-3 px-4">Employee ID</th>
                          <th className="py-3 px-4">Application</th>
                          <th className="py-3 px-4">Window Title</th>
                          <th className="py-3 px-4">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentActivityLogs
                          .filter((log) => {
                            if (!selectedDate) return true;
                            const logDate = new Date(log.logged_at).toISOString().slice(0, 10);
                            return logDate === selectedDate;
                          })
                          .map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/40 text-slate-600">
                              <td className="py-3 px-4 text-xs font-semibold">{new Date(log.logged_at).toLocaleString()}</td>
                              <td className="py-3 px-4 text-xs font-semibold">{log.employee_id}</td>
                              <td className="py-3 px-4 font-semibold text-slate-700">{log.app_name}</td>
                              <td className="py-3 px-4 font-medium truncate max-w-xs">{log.window_title || '—'}</td>
                              <td className="py-3 px-4 text-xs capitalize"><span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-600">{log.activity_type.replace(/_/g, ' ')}</span></td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm text-center py-6">No recent activity logs available yet.</p>
                )}
              </div>

              {/* Activity Details Modal (originally requested logic preserved) */}
              {activityModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                  <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                    <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <h3 className="text-base font-bold text-slate-900">Employee Activity Stream</h3>
                      <button
                        onClick={() => setActivityModalOpen(false)}
                        className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 transition"
                      >
                        Close
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      {loadingActivity ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm font-semibold">
                          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          Loading logs...
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {selectedEmployeeActivity.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-12">No activity records found for this employee.</p>
                          ) : (
                            selectedEmployeeActivity.map((row: any) => (
                              <div key={row.id || row.timestamp} className="py-4 first:pt-0 last:pb-0">
                                <div className="text-xs text-slate-400 font-semibold">{new Date(row.timestamp || row.logged_at).toLocaleString()}</div>
                                <div className="text-sm font-bold text-slate-800 mt-1">{row.current_app || row.app_name || '—'}</div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  Duration: {row.duration_seconds ? `${row.duration_seconds}s` : 'Active'} • CPU: {row.cpu_usage || row.cpu_usage || 0}% • Memory: {row.memory_usage || row.memory_usage || 0}%
                                </div>
                                {row.activity_logs && Array.isArray(row.activity_logs) && (
                                  <div className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                                    {row.activity_logs.slice(0, 8).map((l: any, i: number) => (
                                      <div key={i}>• {l.timestamp || l.logged_at} — {l.details || l.window_title}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── CASE 3: DETAILED MONITORING VIEW ───────────────── */}
          {sidebarActive === 'monitoring' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Live Work-Agent Streams</h1>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Real-time desktop activity feeds, metrics, screenshots, and logs.</p>
                </div>
                <button
                  onClick={() => setSidebarActive('dashboard')}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-white transition"
                >
                  ← Back to Overview
                </button>
              </div>
              <MonitoringDashboard />
            </div>
          )}

          {/* ─── OTHER SIDEBAR PLACEHOLDERS ──────────────────────── */}
          {sidebarActive === 'employees' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
                  <p className="text-sm text-slate-500 mt-1">Manage your team members</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition shadow-sm">
                    {/* Refresh icon placeholder */}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => {
                      setEditingEmployeeId(null);
                      setNewEmployee({ first_name: '', last_name: '', email: '', position: '', department: '', role: 'employee', phone: '', employee_code: '', password: '' });
                      setIsAddEmployeeModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-[#0ea5e9] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-sky-600 transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Employee
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative w-full md:w-96">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 text-sm outline-none transition placeholder:text-slate-400"
                  />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <select
                    value={employeeDeptFilter}
                    onChange={(e) => setEmployeeDeptFilter(e.target.value)}
                    className="flex-1 md:w-48 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm outline-none focus:border-blue-500 transition cursor-pointer appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]"
                    style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')` }}
                  >
                    <option value="All Departments">All Departments</option>
                    {Array.from(new Set(employeesList.map(e => e.department).filter(Boolean))).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={employeeStatusFilter}
                    onChange={(e) => setEmployeeStatusFilter(e.target.value)}
                    className="flex-1 md:w-36 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm outline-none focus:border-blue-500 transition cursor-pointer appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]"
                    style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')` }}
                  >
                    <option value="All Status">All Status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="idle">Idle</option>
                    <option value="away">Away</option>
                  </select>
                </div>
              </div>

              {/* Employees Data Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-slate-500 font-semibold text-xs uppercase tracking-wider">
                        <th className="py-4 px-6">Employee</th>
                        <th className="py-4 px-6">Department</th>
                        <th className="py-4 px-6">Position</th>
                        <th className="py-4 px-6">Role</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6">Live</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employeesList
                        .filter(e => employeeDeptFilter === 'All Departments' || e.department === employeeDeptFilter)
                        .filter(e => employeeStatusFilter === 'All Status' || e.status === employeeStatusFilter)
                        .filter(e => !employeeSearch || e.name.toLowerCase().includes(employeeSearch.toLowerCase()) || e.email?.toLowerCase().includes(employeeSearch.toLowerCase()))
                        .length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-24 text-slate-400">
                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="font-medium text-slate-500">No employees found</p>
                          </td>
                        </tr>
                      ) : (
                        employeesList
                        .filter(e => employeeDeptFilter === 'All Departments' || e.department === employeeDeptFilter)
                        .filter(e => employeeStatusFilter === 'All Status' || e.status === employeeStatusFilter)
                        .filter(e => !employeeSearch || e.name.toLowerCase().includes(employeeSearch.toLowerCase()) || e.email?.toLowerCase().includes(employeeSearch.toLowerCase()))
                        .map(e => (
                          <tr key={e.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">
                                  {e.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{e.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{e.email || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-slate-600 font-medium">{e.department || '—'}</td>
                            <td className="py-4 px-6 text-slate-600 font-medium">{e.position || '—'}</td>
                            <td className="py-4 px-6 capitalize text-slate-600">{e.role}</td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(e.status)}`}>
                                {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                               <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${e.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                  <span className="text-xs text-slate-500 font-medium">{e.sessionDuration !== 'N/A' ? e.sessionDuration : '—'}</span>
                               </div>
                            </td>
                            <td className="py-4 px-6 text-right space-x-2">
                              <button 
                                onClick={() => {
                                  setEditingEmployeeId(e.id);
                                  // Split name to first and last (basic)
                                  const parts = e.name.split(' ');
                                  const first_name = parts[0];
                                  const last_name = parts.slice(1).join(' ');
                                  
                                  setNewEmployee({
                                    first_name,
                                    last_name,
                                    email: e.email || '',
                                    position: e.position || '',
                                    department: e.department && e.department !== 'Administration' && e.department !== 'Productivity Dept' ? e.department : '',
                                    role: e.role || 'employee',
                                    phone: '', // Need proper API fetch if we want phone, skipping for now
                                    employee_code: '', // Same, leaving blank here since we don't return it in quickview
                                    password: ''
                                  });
                                  setIsAddEmployeeModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition border border-transparent hover:border-blue-100" 
                                title="Edit Employee"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedEmployeeForApps(e);
                                  setSelectedProductiveApps(e.productive_apps || []);
                                  setIsAppConfigModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition border border-transparent hover:border-blue-100" 
                                title="Configure Productive Apps"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-50 border-t border-slate-200 p-4 text-xs text-slate-500 font-medium">
                  Showing {employeesList.length} employees
                </div>
              </div>
            </div>
          )}

          {/* ADD/EDIT EMPLOYEE MODAL */}
          {isAddEmployeeModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <h3 className="text-lg font-bold text-slate-900">{editingEmployeeId ? 'Edit Employee' : 'Add Employee'}</h3>
                  <button 
                    onClick={() => setIsAddEmployeeModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">First Name <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        value={newEmployee.first_name}
                        onChange={(e) => setNewEmployee({...newEmployee, first_name: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Last Name</label>
                      <input 
                        type="text" 
                        value={newEmployee.last_name}
                        onChange={(e) => setNewEmployee({...newEmployee, last_name: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Email</label>
                      <input 
                        type="email" 
                        value={newEmployee.email}
                        onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Position</label>
                      <input 
                        type="text" 
                        value={newEmployee.position}
                        onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Department</label>
                      <select 
                        value={newEmployee.department}
                        onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:bg-white focus:border-blue-500 outline-none transition appearance-none"
                      >
                        <option value="">— No Department —</option>
                        <option value="Productivity">Productivity</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Sales">Sales</option>
                        <option value="Marketing">Marketing</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Role</label>
                      <select 
                        value={newEmployee.role}
                        onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:bg-white focus:border-blue-500 outline-none transition appearance-none"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="text-sm font-semibold text-slate-700">Phone</label>
                      <input 
                        type="tel" 
                        value={newEmployee.phone}
                        onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* System specific fields */}
                  <div className="pt-4 mt-4 border-t border-slate-100 grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Employee Code (Login ID) <span className="text-rose-500">*</span></label>
                        <input 
                          type="text" 
                          value={newEmployee.employee_code}
                          onChange={(e) => setNewEmployee({...newEmployee, employee_code: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Password {editingEmployeeId ? '(Leave blank to keep current)' : <span className="text-rose-500">*</span>}</label>
                        <input 
                          type="password" 
                          value={newEmployee.password}
                          onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                        />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
                  <button 
                    onClick={() => setIsAddEmployeeModalOpen(false)}
                    className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-white hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddEmployeeSubmit}
                    disabled={isSavingEmployee}
                    className="px-5 py-2.5 rounded-lg bg-[#0ea5e9] text-white text-sm font-semibold hover:bg-sky-600 transition shadow-sm flex items-center gap-2 disabled:bg-sky-400"
                  >
                    {isSavingEmployee && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {editingEmployeeId ? 'Save Changes' : 'Add Employee'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* APP CONFIGURATION MODAL */}
          {isAppConfigModalOpen && selectedEmployeeForApps && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Configure Apps</h3>
                    <p className="text-xs text-slate-500 mt-1">Select productive apps for <strong>{selectedEmployeeForApps.name}</strong></p>
                  </div>
                  <button 
                    onClick={() => setIsAppConfigModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                   <div className="space-y-3">
                     {classifications.length === 0 ? (
                        <p className="text-sm text-slate-500">No apps registered in global settings yet.</p>
                     ) : (
                       classifications.map(app => (
                         <label key={app.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition">
                            <input 
                              type="checkbox"
                              checked={selectedProductiveApps.includes(app.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductiveApps(prev => [...prev, app.name]);
                                } else {
                                  setSelectedProductiveApps(prev => prev.filter(a => a !== app.name));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                               <p className="font-semibold text-slate-800 text-sm">{app.name}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                               app.classification === 'productive' ? 'bg-emerald-100 text-emerald-800' :
                               app.classification === 'non_productive' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                               Global: {app.classification}
                            </span>
                         </label>
                       ))
                     )}
                   </div>

                   {/* Add New App Inline */}
                   <div className="mt-4 pt-4 border-t border-slate-100">
                     <p className="text-xs font-semibold text-slate-600 mb-2">Add a new app</p>
                     <div className="flex gap-2">
                       <input
                         type="text"
                         placeholder="e.g. Slack, Notion..."
                         value={newConfigAppName}
                         onChange={(e) => setNewConfigAppName(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && newConfigAppName.trim()) {
                             (async () => {
                               const result = await saveAppClassification(newConfigAppName.trim(), 'productive');
                               if (result) {
                                 setClassifications(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)));
                                 setSelectedProductiveApps(prev => [...prev, newConfigAppName.trim()]);
                                 setNewConfigAppName('');
                               }
                             })();
                           }
                         }}
                         className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition placeholder:text-slate-400"
                       />
                       <button
                         onClick={async () => {
                           if (!newConfigAppName.trim()) return;
                           const result = await saveAppClassification(newConfigAppName.trim(), 'productive');
                           if (result) {
                             setClassifications(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)));
                             setSelectedProductiveApps(prev => [...prev, newConfigAppName.trim()]);
                             setNewConfigAppName('');
                           }
                         }}
                         className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 shrink-0"
                       >
                         <Plus className="w-3.5 h-3.5" />
                         Add
                       </button>
                     </div>
                   </div>

                   <p className="text-xs text-slate-400 mt-4 leading-relaxed font-medium">
                     Selected apps will be marked as &apos;Productive&apos; for this specific employee overriding the global defaults.
                   </p>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
                  <button 
                    onClick={() => setIsAppConfigModalOpen(false)}
                    className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-white hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveAppConfig}
                    disabled={isSavingEmployee}
                    className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center gap-2 disabled:bg-emerald-400"
                  >
                    {isSavingEmployee && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Save Config
                  </button>
                </div>
              </div>
            </div>
          )}


          {sidebarActive === 'reports' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
                  <p className="text-sm text-slate-500 mt-1">Generate and export productivity reports</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition shadow-sm bg-white">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={downloadReportsCSV}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm bg-white"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Summary CSV
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50 transition shadow-sm bg-white">
                    <FileText className="w-4 h-4 text-rose-500" />
                    Summary PDF
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 border border-blue-200 bg-blue-50/50 rounded-lg text-blue-700 text-sm font-semibold hover:bg-blue-50 transition shadow-sm">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    Master Detailed (Excel)
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 border border-blue-200 bg-blue-50/50 rounded-lg text-blue-700 text-sm font-semibold hover:bg-blue-50 transition shadow-sm">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Master Detailed (PDF)
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                {/* Period Toggle */}
                <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-100">
                  {['Daily', 'Weekly', 'Monthly'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setReportPeriod(period as any)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                        reportPeriod === period ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>

                {/* Date Pickers */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 focus:border-blue-500 outline-none w-36"
                    />
                  </div>
                  <span className="text-slate-400 text-sm">to</span>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 focus:border-blue-500 outline-none w-36"
                    />
                  </div>
                </div>

                {/* Department Dropdown */}
                <select
                  value={reportDeptFilter}
                  onChange={(e) => setReportDeptFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 focus:border-blue-500 outline-none min-w-[160px] appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em]"
                  style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')` }}
                >
                  <option value="All Departments">All Departments</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>

              {/* Search */}
              <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search employee..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg bg-transparent text-sm outline-none transition placeholder:text-slate-400"
                    />
                  </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <p className="text-xs font-semibold text-slate-500">Total Hours</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{reportStats.total.toFixed(1)}h</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <p className="text-xs font-semibold text-slate-500">Active Hours</p>
                  <p className="text-2xl font-bold text-emerald-500 mt-2">{reportStats.active.toFixed(1)}h</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <p className="text-xs font-semibold text-slate-500">Idle Hours</p>
                  <p className="text-2xl font-bold text-amber-500 mt-2">{reportStats.idle.toFixed(1)}h</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <p className="text-xs font-semibold text-slate-500">Avg Productivity</p>
                  <p className="text-2xl font-bold text-blue-500 mt-2">{Math.round(avgReportProd)}%</p>
                </div>
              </div>

              {/* Reports Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[300px]">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-slate-500 font-semibold text-xs uppercase tracking-wider">
                      <th className="py-4 px-6">EMPLOYEE</th>
                      <th className="py-4 px-6">DEPARTMENT</th>
                      <th className="py-4 px-6">TOTAL HOURS</th>
                      <th className="py-4 px-6">ACTIVE</th>
                      <th className="py-4 px-6">IDLE</th>
                      <th className="py-4 px-6">PRODUCTIVITY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReportList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-20 text-slate-400">
                          <p className="font-medium text-slate-500">No data for this period</p>
                        </td>
                      </tr>
                    ) : (
                      filteredReportList.map(e => {
                        const parts = e.sessionDuration !== 'N/A' ? e.sessionDuration.split(/[hm]/) : ['0','0'];
                        const hours = parseInt(parts[0]) || 0;
                        const mins = parseInt(parts[1]) || 0;
                        const totalHrs = (hours + mins/60).toFixed(1);
                        const activeHrs = ((hours + mins/60) * (e.productivity / 100)).toFixed(1);
                        const idleHrs = ((hours + mins/60) * (1 - e.productivity / 100)).toFixed(1);

                        return (
                          <tr key={e.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center shrink-0 text-xs">
                                  {e.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">{e.name}</p>
                                  <p className="text-xs text-slate-500">{e.email || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-slate-600 font-medium">{e.department}</td>
                            <td className="py-4 px-6 font-semibold text-slate-700">{totalHrs}h</td>
                            <td className="py-4 px-6 text-emerald-600 font-medium">{activeHrs}h</td>
                            <td className="py-4 px-6 text-amber-500 font-medium">{idleHrs}h</td>
                            <td className="py-4 px-6">
                              <span className={`font-bold ${getProductivityColor(e.productivity)}`}>
                                {Math.round(e.productivity)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sidebarActive === 'analytics' && (() => {
            const emp = selectedAnalyticsEmployee === 'all' ? null : employeesList.find(e => e.id === selectedAnalyticsEmployee);
            
            // Dynamic metrics
            const avgProductivity = emp ? emp.productivity : 89;
            const utilization = emp ? Math.round(emp.productivity * 0.85) : 75;
            const idleRatio = emp ? Math.max(0, 100 - emp.productivity - 10) : 16;
            const activeHours = emp ? (emp.productivity > 0 ? (emp.productivity / 15).toFixed(1) : '0.0') : '0.8';

            // Dynamic charts (mocked based on productivity)
            const baseProd = emp ? emp.productivity : 85;
            const weeklyData = [
              { name: 'Mon', active: baseProd > 0 ? 7.2 * (baseProd/100) : 0, idle: 0.8, away: 0 },
              { name: 'Tue', active: baseProd > 0 ? 6.8 * (baseProd/100) : 0, idle: 1.2, away: 0.2 },
              { name: 'Wed', active: baseProd > 0 ? 7.5 * (baseProd/100) : 0, idle: 0.5, away: 0.4 },
              { name: 'Thu', active: baseProd > 0 ? 6.5 * (baseProd/100) : 0, idle: 1.5, away: 0.3 },
              { name: 'Fri', active: baseProd > 0 ? 7.0 * (baseProd/100) : 0, idle: 0.9, away: 0.2 },
            ];

            const trendData = [
              { name: 'Week 1', value: Math.max(0, baseProd - 7) },
              { name: 'Week 2', value: Math.max(0, baseProd - 4) },
              { name: 'Week 3', value: baseProd },
              { name: 'Week 4', value: Math.min(100, baseProd + 2) },
            ];

            return (
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                    <p className="text-sm text-slate-500 mt-1">Deep insights into team productivity and performance</p>
                  </div>
                  <div className="relative">
                    <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select 
                      value={selectedAnalyticsEmployee}
                      onChange={(e) => setSelectedAnalyticsEmployee(e.target.value)}
                      className="appearance-none pl-9 pr-10 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition"
                    >
                      <option value="all">All Employees</option>
                      {employeesList.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Avg Productivity */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Avg Productivity</p>
                    <h2 className="text-3xl font-bold text-slate-900">{avgProductivity}%</h2>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>

                {/* Utilization */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Utilization</p>
                    <h2 className="text-3xl font-bold text-slate-900">{utilization}%</h2>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                </div>

                {/* Avg Active Hours */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Avg Active Hours</p>
                    <h2 className="text-3xl font-bold text-slate-900">{activeHours}h</h2>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-cyan-500" />
                  </div>
                </div>

                {/* Idle Ratio */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Idle Ratio</p>
                    <h2 className="text-3xl font-bold text-slate-900">{idleRatio}%</h2>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                    <BarChart2 className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Activity Breakdown */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-6">Weekly Activity Breakdown</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        barGap={4}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <ChartTooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="active" name="Active" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
                        <Bar dataKey="idle" name="Idle" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
                        <Bar dataKey="away" name="Away" fill="#f97316" radius={[4, 4, 0, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Productivity Trend */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-sm font-bold text-slate-900">Productivity Trend (30 Days)</h3>
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-500">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Productivity %
                    </div>
                  </div>
                  <div className="h-[300px] flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={trendData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                        <ChartTooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {sidebarActive === 'field_tracking' && (
            <div className="max-w-4xl mx-auto p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4 text-center">
              <MapPin className="w-12 h-12 text-emerald-500 mx-auto opacity-40" />
              <h2 className="text-lg font-bold text-slate-900">GPS Field Tracking</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">Monitor field worker check-ins, transit times, and client-site geo-fences.</p>
              <div className="p-8 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 text-xs">
                No active mobile agents reported. Waiting for GPS link.
              </div>
            </div>
          )}



          {sidebarActive === 'profile' && (
            <div className="max-w-md mx-auto p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 text-3xl font-extrabold text-slate-700 flex items-center justify-center mx-auto shadow-sm">
                A
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Admin Account</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Enterprise Root Authority</p>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="text-left text-sm text-slate-600 space-y-2">
                <div><strong>Full Name:</strong> Workspace Administrator</div>
                <div><strong>Email:</strong> admin@company.com</div>
                <div><strong>Access Level:</strong> Super Administrator</div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
};

export default AdminMonitoringScreen;
