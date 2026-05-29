import { useState, useEffect, useRef } from 'react';
import { supabase, Employee, WorkSession } from './lib/supabase';
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
  const [windowLocked, setWindowLocked] = useState(true); // Start locked at login
  const [planSubmitted, setPlanSubmitted] = useState(false);
  const [summarySubmitted, setSummarySubmitted] = useState(false);
  const [punchConfirmed, setPunchConfirmed] = useState(false);
  const waterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const api = () => (window as any).electronAPI;

  // ── Lock window at startup (before login) ─────────────────────────────────
  useEffect(() => {
    const lockWindowAtStartup = async () => {
      try {
        const eApi = api();
        if (eApi) {
          // Lock window AND enable kiosk mode (prevents Alt+Tab, minimizing, switching apps)
          await eApi.setWindowClosable?.(false);
          await eApi.setWindowMinimizable?.(false);
          await eApi.enterKiosk?.();
          console.log('[App] Window locked at startup + kiosk mode enabled - awaiting login');
        }
      } catch (err) {
        console.error('[App] Failed to lock window at startup:', err);
      }
    };

    lockWindowAtStartup();

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
        const todayStr = new Date().toISOString().slice(0, 10);
        if (cached?.employee && cached?.session && cached?.screen === 'timer' && cached.session.session_date === todayStr) {
          
          let latestSession = cached.session;
          try {
             // Fetch the most recent session seconds from DB in case they shut down abruptly
             const { data } = await supabase.from('work_sessions').select('*').eq('id', cached.session.id).single();
             if (data) {
                 latestSession = data;
                 eApi.saveSessionCache?.({ ...cached, session: latestSession, savedAt: new Date().toISOString() });
             }
          } catch (e) {
             console.error('Failed to fetch latest session from DB', e);
          }

          // If started_work_time is missing, set it to session creation time (not current time)
          if (!latestSession.started_work_time) {
            const startTime = latestSession.created_at; // Use original session creation time
            console.log('[SessionRestore] Setting started_work_time to', startTime, '(from created_at)');
            try {
              const { data: updated, error } = await supabase
                .from('work_sessions')
                .update({ started_work_time: startTime })
                .eq('id', latestSession.id)
                .select()
                .single();
              if (error) {
                console.error('[SessionRestore] Error updating started_work_time:', error);
                // Use local value even if DB update fails
                latestSession = { ...latestSession, started_work_time: startTime };
              } else if (updated) {
                latestSession = updated;
              }
            } catch (err) {
              console.error('[SessionRestore] Exception updating started_work_time:', err);
              latestSession = { ...latestSession, started_work_time: startTime };
            }
          }

          // Check if day has been finished - don't restore if it has
          if (latestSession.day_finished) {
            console.warn('[SessionRestore] Day already finished, clearing cache');
            eApi.clearSessionCache?.();
            return;
          }

          setEmployee(cached.employee);
          setSession(latestSession);
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
          const elapsedSecs1 = latestSession.started_work_time
            ? Math.floor((Date.now() - new Date(latestSession.started_work_time).getTime()) / 1000)
            : 0;
          await eApi.initializeSessionCounters?.(
            latestSession.active_seconds || 0,
            latestSession.idle_seconds || 0,
            latestSession.productive_seconds || 0,
            Math.max(elapsedSecs1, (latestSession.active_seconds || 0) + (latestSession.idle_seconds || 0))
          );
          eApi.showFloatingTimer?.();
          eApi.startTracking?.();
        } else if (cached) {
           eApi.clearSessionCache?.();
        }
      });

      // Also try loading via IPC directly
      const cached = await eApi.loadSessionCache?.();
      const todayStr = new Date().toISOString().slice(0, 10);
      if (cached?.employee && cached?.session && cached?.screen === 'timer' && cached.session.session_date === todayStr) {
        let latestSession = cached.session;
        try {
           const { data } = await supabase.from('work_sessions').select('*').eq('id', cached.session.id).single();
           if (data) {
               latestSession = data;
               eApi.saveSessionCache?.({ ...cached, session: latestSession, savedAt: new Date().toISOString() });
           }
        } catch (e) {}

        // If started_work_time is missing, set it to session creation time (not current time)
        if (!latestSession.started_work_time) {
          const startTime = latestSession.created_at; // Use original session creation time
          console.log('[SessionRestore] Setting started_work_time to', startTime, '(from created_at)');
          try {
            const { data: updated, error } = await supabase
              .from('work_sessions')
              .update({ started_work_time: startTime })
              .eq('id', latestSession.id)
              .select()
              .single();
            if (error) {
              console.error('[SessionRestore] Error updating started_work_time:', error);
              latestSession = { ...latestSession, started_work_time: startTime };
            } else if (updated) {
              latestSession = updated;
            }
          } catch (err) {
            console.error('[SessionRestore] Exception updating started_work_time:', err);
            latestSession = { ...latestSession, started_work_time: startTime };
          }
        }

        // Check if day has been finished - don't restore if it has
        if (latestSession.day_finished) {
          console.warn('[SessionRestore] Day already finished, clearing cache');
          eApi.clearSessionCache?.();
          return;
        }

        setEmployee(cached.employee);
        setSession(latestSession);
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
        const elapsedSecs2 = latestSession.started_work_time
          ? Math.floor((Date.now() - new Date(latestSession.started_work_time).getTime()) / 1000)
          : 0;
        await eApi.initializeSessionCounters?.(
          latestSession.active_seconds || 0,
          latestSession.idle_seconds || 0,
          latestSession.productive_seconds || 0,
          Math.max(elapsedSecs2, (latestSession.active_seconds || 0) + (latestSession.idle_seconds || 0))
        );
        eApi.showFloatingTimer?.();
        eApi.startTracking?.();
      } else if (cached) {
         eApi.clearSessionCache?.();
      }
    };
    tryRestore();
  }, []);

  // ── Window lock sync ───────────────────────────────────────────────────────
  useEffect(() => {
    const syncWindowLock = async () => {
      const eApi = api();
      if (!eApi) return;

      // Lock for: login, plan, motivation (until plan flow complete), and admin
      const shouldLock = screen === 'login' || screen === 'plan' || (screen === 'motivation' && !planFlowCompleted) || screen === 'admin';

      if (shouldLock) {
        setWindowLocked(true);
        try {
          // Lock the window: prevent closing and minimizing
          await eApi?.setWindowClosable?.(false);
          await eApi?.setWindowMinimizable?.(false);
          // Enable kiosk mode: prevent Alt+Tab and switching to other apps
          await eApi?.enterKiosk?.();
          console.log(`[App] Window locked + kiosk enabled for screen: ${screen}`);
        } catch (err) {
          console.error(`[App] Failed to lock window for ${screen}:`, err);
        }
      } else {
        setWindowLocked(false);
        try {
          // Unlock: allow closing, minimizing, and switching apps
          await eApi?.setWindowClosable?.(true);
          await eApi?.setWindowMinimizable?.(true);
          // Exit kiosk mode: allow Alt+Tab and switching to other apps
          await eApi?.exitKiosk?.();
          console.log(`[App] Window unlocked + kiosk disabled for screen: ${screen}`);
        } catch (err) {
          console.error(`[App] Failed to unlock window for ${screen}:`, err);
        }
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
      await api()?.exitKiosk?.();
      console.log('[App] Plan completed - window unlocked, kiosk disabled, employee can now switch apps');
      setWindowLocked(false);
    } catch (err) {
      console.error('[App] Failed to unlock window after plan completion:', err);
    }

    activitySyncService.startSyncingData(30000);

    // Save session so it can be restored after restart
    const eApi = api();
    if (eApi && employee && updatedSession) {
      // Initialize counters in Electron activity monitor
      const elapsedSecs3 = updatedSession.started_work_time
        ? Math.floor((Date.now() - new Date(updatedSession.started_work_time).getTime()) / 1000)
        : 0;
      await eApi.initializeSessionCounters?.(
        updatedSession.active_seconds || 0,
        updatedSession.idle_seconds || 0,
        updatedSession.productive_seconds || 0,
        Math.max(elapsedSecs3, (updatedSession.active_seconds || 0) + (updatedSession.idle_seconds || 0))
      );
      await eApi.saveSessionCache?.({
        employee,
        session: updatedSession,
        screen: 'timer',
        savedAt: new Date().toISOString(),
      });
      // Show the floating live timer
      eApi.showFloatingTimer?.();
      await eApi.startTracking?.();
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
    await eApi?.stopTracking?.();
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

  if (screen === 'plan' && employee) {
    return (
      <PlanOfDay
        employee={employee}
        onComplete={handlePlanComplete}
        windowLocked={windowLocked}
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
