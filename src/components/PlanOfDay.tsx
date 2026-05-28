import { useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList, ExternalLink, Lock } from 'lucide-react';
import { Employee, WorkSession, getTodaySession, punchInSession, markPlanAsSubmitted } from '../lib/supabase';
import WindowControls from './WindowControls';

type PlanPhase = 'form' | 'summary' | 'punch' | 'punch_no';

interface PlanOfDayProps {
  employee: Employee;
  onComplete: (session: WorkSession) => void;
  windowLocked?: boolean;
  planSubmitted?: boolean;
  summarySubmitted?: boolean;
  punchConfirmed?: boolean;
  onPlanSubmitted?: () => void;
  onSummarySubmitted?: () => void;
  onPunchConfirmed?: () => void;
}

export default function PlanOfDay({
  employee,
  onComplete,
  windowLocked = true,
  onSummarySubmitted,
  onPunchConfirmed,
}: PlanOfDayProps) {
  const [phase, setPhase] = useState<PlanPhase>('form');
  const [summaryError, setSummaryError] = useState('');
  const [loading, setLoading] = useState(false);
  const [portalOpened, setPortalOpened] = useState(false);
  const [punchError, setPunchError] = useState('');

  const portalUrl = 'http://147.93.28.144:5003/plan-for-day';

  useEffect(() => {
    if (portalOpened) return;
    setPortalOpened(true);
    // Portal is now embedded in an iframe, no need to open in an external browser automatically
  }, [portalOpened]);


  const handleBackClick = () => {
    setSummaryError('');
    setPunchError('');
    setPhase('summary');
  };

  const handleConfirmationYes = async () => {
    setSummaryError('');
    setLoading(true);

    try {
      const todaySession = await getTodaySession(employee.id);

      if (todaySession && todaySession.plan_submitted) {
        onSummarySubmitted?.();
        console.log('✓ Plan submission verified');
        setPhase('punch');
        return;
      }

      // Fallback: check the remote timesheet DB before rejecting
      let externallySubmitted = false;
      try {
        console.log('[PlanOfDay] Checking electronAPI:', !!(window as any).electronAPI?.checkTimesheetDb);
        if (typeof window !== 'undefined' && (window as any).electronAPI?.checkTimesheetDb) {
          externallySubmitted = await (window as any).electronAPI.checkTimesheetDb(employee.employee_code);
          console.log('[PlanOfDay] externallySubmitted result:', externallySubmitted);
        }
      } catch (e) {
        console.error('[PlanOfDay] Failed to check remote timesheet DB', e);
      }

      if (externallySubmitted && todaySession) {
        // Sync the plan submission to local database
        try {
          await markPlanAsSubmitted(todaySession.id);
          console.log('✓ Synced plan submission to local database');
        } catch (syncError) {
          console.error('[PlanOfDay] Failed to sync plan submission:', syncError);
          // Continue anyway - external verification is sufficient
        }
        
        onSummarySubmitted?.();
        console.log('✓ Plan submission verified via remote DB');
        setPhase('punch');
        return;
      }

      setSummaryError('The plan was not found as submitted in the database. Please submit the plan in the portal first and then try again.');
    } catch (error) {
      console.error('Error verifying plan submission:', error);
      setSummaryError('Unable to verify plan submission right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationNo = () => {
    setSummaryError('Please submit your plan in the portal, then click Continue again.');
    setPhase('form');
  };

  const handlePunchYes = async () => {
    setPunchError('');
    setLoading(true);
    try {
      let todaySession: any = null;
      try {
        todaySession = await getTodaySession(employee.id);
      } catch (e) {
        console.warn('Could not get today session, proceeding anyway', e);
      }

      const now = new Date().toISOString();
      
      const completedSession = {
        ...(todaySession || {}),
        punched_in: true,
        punch_in_time: now,
      } as WorkSession;

      onPunchConfirmed?.();
      console.log('✓ Punch-in confirmed (bypassed check)');
      onComplete(completedSession);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchNo = () => {
    setPhase('punch_no');
  };

  const handleRetryPunch = () => {
    setPunchError('');
    setPhase('punch');
  };

  if (phase === 'summary') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white flex flex-col">
        <header className="bg-white border-b border-pink-100 px-6 py-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPhase('form')}
              className="rounded-full bg-pink-50 hover:bg-pink-100 p-2 transition"
            >
              <ArrowLeft className="w-4 h-4 text-pink-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-800">Plan Submission Check</h1>
                <p className="text-xs text-pink-400">Step 2 of 3</p>
              </div>
            </div>
          </div>
          <WindowControls disabledMinimize={windowLocked} disabledClose={windowLocked} />
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-pink-100 p-8 max-w-xl w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Did you submit your plan for today?</h2>
            <p className="text-sm text-gray-500 mb-6">We will verify the submission in the database before moving on.</p>
            {summaryError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">{summaryError}</div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleConfirmationYes}
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold py-3 rounded-xl shadow hover:from-pink-600 hover:to-rose-600 transition disabled:opacity-60"
              >
                {loading ? 'Checking...' : 'Yes, verify and continue'}
              </button>
              <button
                type="button"
                onClick={handleConfirmationNo}
                className="w-full border border-pink-200 text-pink-600 font-semibold py-3 rounded-xl hover:bg-pink-50 transition"
              >
                No, go back to portal
              </button>
            </div>
          </div>
        </div>

        {/* Locked mode indicator during summary phase */}
        {windowLocked && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 bg-red-50 px-4 py-2 rounded-lg border border-red-200 max-w-sm text-center">
            🔒 <strong>Focused Mode Active:</strong> Other applications are locked. Verify your plan to proceed.
          </div>
        )}
      </div>
    );
  }

  if (phase === 'punch') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white flex flex-col">
        <header className="bg-white border-b border-pink-100 px-6 py-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPhase('summary')}
              className="rounded-full bg-pink-50 hover:bg-pink-100 p-2 transition"
            >
              <ArrowLeft className="w-4 h-4 text-pink-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-800">Punch-In Confirmation</h1>
                <p className="text-xs text-pink-400">Step 3 of 3</p>
              </div>
            </div>
          </div>
          <WindowControls disabledMinimize={windowLocked} disabledClose={windowLocked} />
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-pink-100 p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👊</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Did you punch in?</h2>
            <p className="text-gray-500 text-sm mb-6">Confirm your attendance before moving on.</p>
            {punchError && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{punchError}</div>}
            <div className="grid gap-3">
              <button
                onClick={handlePunchYes}
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold py-3 rounded-xl shadow hover:from-pink-600 hover:to-rose-600 transition disabled:opacity-60"
              >
                {loading ? 'Saving...' : 'Yes'}
              </button>
              <button
                onClick={handlePunchNo}
                className="w-full border border-pink-200 text-pink-600 font-semibold py-3 rounded-xl hover:bg-pink-50 transition"
              >
                No
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'punch_no') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white flex flex-col">
        <header className="bg-white border-b border-pink-100 px-6 py-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-800">Punch-In Required</h1>
                <p className="text-xs text-pink-400">Cannot proceed</p>
              </div>
            </div>
          </div>
          <WindowControls disabledMinimize={windowLocked} disabledClose={windowLocked} />
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-pink-100 p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Please punch in first</h2>
            <p className="text-gray-500 text-sm mb-6">You must punch in before you can continue to other modules.</p>
            <button
              onClick={handleRetryPunch}
              className="w-full border border-pink-200 text-pink-600 font-semibold py-3 rounded-xl hover:bg-pink-50 transition"
            >
              Return to punch check
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white flex flex-col">
      <header className="bg-white border-b border-pink-100 px-6 py-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="rounded-full bg-pink-50 hover:bg-pink-100 p-2 transition"
          >
            <ArrowLeft className="w-4 h-4 text-pink-500" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">Plan of the Day</h1>
              <p className="text-xs text-pink-400">Step 1 of 3</p>
            </div>
          </div>
        </div>
        <WindowControls disabledMinimize={windowLocked} disabledClose={windowLocked} />
      </header>

      <div className="flex-1 flex flex-col gap-6 p-6">
        <div className="flex-1 bg-white rounded-2xl shadow-md border border-pink-100 overflow-hidden">
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100 px-4 py-3 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-medium text-gray-600">Daily Plan Portal</span>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-pink-500 hover:text-pink-600 underline"
            >
              Open in browser
            </a>
          </div>
          <div className="relative w-full h-[420px] lg:h-[600px] min-h-[420px] flex items-center justify-center bg-gray-50">
            <iframe 
              src={portalUrl} 
              className="w-full h-full border-0" 
              title="Daily Plan Portal"
            />
          </div>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-md border border-pink-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Continue to the next step</h2>
          <p className="text-sm text-gray-400 mb-4">Use the portal to submit your daily plan, then continue when ready.</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setPhase('summary')}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold py-3 rounded-xl shadow hover:from-pink-600 hover:to-rose-600 transition"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={handleBackClick}
              className="w-full border border-pink-200 text-pink-600 font-semibold py-3 rounded-xl hover:bg-pink-50 transition"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Locked mode indicator during form and summary phases */}
      {windowLocked && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 bg-red-50 px-4 py-2 rounded-lg border border-red-200 max-w-sm text-center">
          🔒 <strong>Focused Mode Active:</strong> Other applications are locked. Complete your plan submission to proceed.
        </div>
      )}
    </div>
  );
}
