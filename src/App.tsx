import { useState, useEffect, useRef } from 'react';
import { Employee, WorkSession } from './lib/supabase';
import LoginScreen from './components/LoginScreen';
import PlanOfDay from './components/PlanOfDay';
import MotivationScreen from './components/MotivationScreen';
import TimerScreen from './components/TimerScreen';
import AdminMonitoringScreen from './components/AdminMonitoringScreen';
import IdlePromptScreen from './components/IdlePromptScreen';
import { activitySyncService } from './lib/activitySyncService';

type AppScreen = 'login' | 'plan' | 'motivation' | 'timer' | 'admin' | 'idle-prompt';

const WATER_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [session, setSession] = useState<WorkSession | null>(null);
  const [planFlowCompleted, setPlanFlowCompleted] = useState(false);
  const [showWaterReminder, setShowWaterReminder] = useState(false);
  const [windowLocked, setWindowLocked] = useState(false);
  const [planSubmitted, setPlanSubmitted] = useState(false);
  const [summarySubmitted, setSummarySubmitted] = useState(false);
  const [punchConfirmed, setPunchConfirmed] = useState(false);
  const waterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const api = () => (window as any).electronAPI;

  useEffect(() => {
    if (window.location.hash.startsWith('#/idle-prompt')) {
      setScreen('idle-prompt');
    }
  }, []);

  // ── Session restore on startup ────────────────────────────────────────────
  useEffect(() => {
    const tryRestore = async () => {
      const eApi = api();
      if (!eApi) return;

      // Listen for session-restored event pushed from main process
      eApi.onSessionRestored?.(async (cached: any) => {
        if (cached?.employee && cached?.session && cached?.screen === 'timer') {
          setEmployee(cached.employee);
          setSession(cached.session);
          setPlanFlowCompleted(true);
          setPlanSubmitted(true);
          setSummarySubmitted(true);
          setPunchConfirmed(true);
          
          if (!window.location.hash.startsWith('#/idle-prompt')) {
            setScreen('timer');
          }
          
          activitySyncService.setEmployeeId(cached.employee.id);
          activitySyncService.startSyncingData(30000);
          
          // Restore counters in Electron activity monitor
          await eApi.initializeSessionCounters?.(
            cached.session.active_seconds || 0,
            cached.session.idle_seconds || 0,
            cached.session.productive_seconds || 0,
            (cached.session.active_seconds || 0) + (cached.session.idle_seconds || 0)
          );
          eApi.showFloatingTimer?.();
        }
      });

      // Also try loading via IPC directly
      const cached = await eApi.loadSessionCache?.();
      if (cached?.employee && cached?.session && cached?.screen === 'timer') {
        setEmployee(cached.employee);
        setSession(cached.session);
        setPlanFlowCompleted(true);
        setPlanSubmitted(true);
        setSummarySubmitted(true);
        setPunchConfirmed(true);
        
        // ONLY set screen to timer if we are NOT in the idle-prompt window
        if (!window.location.hash.startsWith('#/idle-prompt')) {
          setScreen('timer');
        }
        
        activitySyncService.setEmployeeId(cached.employee.id);
        activitySyncService.startSyncingData(30000);
        
        // Restore counters in Electron activity monitor
        await eApi.initializeSessionCounters?.(
          cached.session.active_seconds || 0,
          cached.session.idle_seconds || 0,
          cached.session.productive_seconds || 0,
          (cached.session.active_seconds || 0) + (cached.session.idle_seconds || 0)
        );
        eApi.showFloatingTimer?.();
      }
    };
    tryRestore();
  }, []);

  // ── Window lock sync ───────────────────────────────────────────────────────
  useEffect(() => {
    const syncWindowLock = async () => {
      const eApi = api();
      if (!eApi) return;

      const shouldLock = screen === 'plan' || (screen === 'motivation' && !planFlowCompleted);

      if (shouldLock) {
        setWindowLocked(true);
        try {
          await eApi?.setWindowClosable?.(false);
          await eApi?.setWindowMinimizable?.(false);
        } catch {}
      } else {
        setWindowLocked(false);
        try {
          await eApi?.setWindowClosable?.(true);
          await eApi?.setWindowMinimizable?.(true);
        } catch {}
      }
    };
    syncWindowLock();
  }, [screen, planFlowCompleted, planSubmitted, summarySubmitted, punchConfirmed]);

  // ── Water reminder ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!employee || !planFlowCompleted) return;

    waterTimerRef.current = setInterval(async () => {
      api()?.showWaterReminder?.();
      if (screen === 'timer') setShowWaterReminder(true);
    }, WATER_INTERVAL_MS);

    return () => {
      if (waterTimerRef.current) clearInterval(waterTimerRef.current);
    };
  }, [employee, screen, planFlowCompleted]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLogin = async (emp: Employee, sessionData: WorkSession) => {
    setEmployee(emp);
    setSession(sessionData);
    activitySyncService.setEmployeeId(emp.id);

    if (emp.role === 'admin' || emp.role === 'superadmin') {
      setScreen('admin');
      return;
    }

    setPlanSubmitted(false);
    setSummarySubmitted(false);
    setPunchConfirmed(false);
    setPlanFlowCompleted(false);

    setWindowLocked(true);
    try {
      await api()?.setWindowClosable?.(false);
      await api()?.setWindowMinimizable?.(false);
    } catch {}

    setScreen('plan');
  };

  const handlePlanComplete = async (updatedSession: WorkSession) => {
    setSession(updatedSession);
    setPlanFlowCompleted(true);
    setPlanSubmitted(true);
    setSummarySubmitted(true);
    setPunchConfirmed(true);

    try {
      await api()?.setWindowClosable?.(true);
      await api()?.setWindowMinimizable?.(true);
      setWindowLocked(false);
    } catch {}

    activitySyncService.startSyncingData(30000);

    // Save session so it can be restored after restart
    const eApi = api();
    if (eApi && employee && updatedSession) {
      // Initialize counters in Electron activity monitor
      await eApi.initializeSessionCounters?.(
        updatedSession.active_seconds || 0,
        updatedSession.idle_seconds || 0,
        updatedSession.productive_seconds || 0,
        (updatedSession.active_seconds || 0) + (updatedSession.idle_seconds || 0)
      );
      await eApi.saveSessionCache?.({
        employee,
        session: updatedSession,
        screen: 'timer',
        savedAt: new Date().toISOString(),
      });
      // Show the floating live timer
      eApi.showFloatingTimer?.();
    }

    setScreen('motivation');
  };

  const handleMotivationReady = () => {
    setScreen('timer');
    // Ensure floating timer is visible once on timer screen
    api()?.showFloatingTimer?.();
  };

  const handleLogout = async () => {
    setEmployee(null);
    setSession(null);
    setPlanFlowCompleted(false);
    setScreen('login');
    setShowWaterReminder(false);
    activitySyncService.stopSyncingData();

    // Clear persisted session and hide floating timer
    const eApi = api();
    await eApi?.clearSessionCache?.();
    await eApi?.hideFloatingTimer?.();
    await eApi?.initializeSessionCounters?.(0, 0, 0, 0); // Reset counters in Electron on logout
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (screen === 'idle-prompt') {
    return <IdlePromptScreen />;
  }

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (screen === 'admin') {
    return <AdminMonitoringScreen onLogout={handleLogout} />;
  }

  if (screen === 'plan' && employee && session) {
    return (
      <PlanOfDay
        employee={employee}
        session={session}
        onComplete={handlePlanComplete}
        windowLocked={windowLocked}
        planSubmitted={planSubmitted}
        summarySubmitted={summarySubmitted}
        punchConfirmed={punchConfirmed}
        onPlanSubmitted={() => setPlanSubmitted(true)}
        onSummarySubmitted={() => setSummarySubmitted(true)}
        onPunchConfirmed={() => setPunchConfirmed(true)}
      />
    );
  }

  if (screen === 'motivation' && employee) {
    return <MotivationScreen employee={employee} onReady={handleMotivationReady} />;
  }

  if (screen === 'timer' && employee && session) {
    return (
      <TimerScreen
        employee={employee}
        session={session}
        showWaterReminder={showWaterReminder}
        onDismissWater={() => setShowWaterReminder(false)}
        onLogout={handleLogout}
      />
    );
  }

  return null;
}
