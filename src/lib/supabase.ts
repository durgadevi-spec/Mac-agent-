import { createClient, PostgrestError } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Employee {
  id: string;
  employee_code: string;
  employee_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  position?: string;
  department?: string;
  phone?: string;
  password_hash: string;
  role?: 'user' | 'admin' | 'superadmin' | 'employee';
  productive_apps?: string[];
  created_at: string;
}

export interface WorkSession {
  id: string;
  employee_id: string;
  session_date: string;
  punched_in: boolean;
  punch_in_time: string | null;
  started_work_time: string | null;
  plan_submitted: boolean;
  plan_text: string;
  active_seconds: number;
  idle_seconds: number;
  productive_seconds: number;
  day_finished?: boolean;
  ended_work_time?: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  session_id: string | null;
  employee_id: string;
  app_name: string;
  window_title: string;
  activity_type: string;
  idle_reason?: string | null;
  logged_at: string;
  cpu_usage?: number;
  memory_usage?: number;
  duration_seconds?: number;
  productive?: boolean;
  website?: string;
}

export async function loginEmployee(
  employeeCode: string,
  employeeName: string,
  password: string
): Promise<{ employee: Employee | null; error: PostgrestError | null }> {
  const normalizedCode = employeeCode.trim().toUpperCase();
  const normalizedName = employeeName.trim();

  try {
    // Try primary database first
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_code', normalizedCode)
      .eq('password_hash', password)
      .maybeSingle() as { data: Employee | null; error: PostgrestError | null };

    if (error) {
      console.error('Login query error:', error);
      // Continue to try login logs fallback
    }

    if (data) {
      // Employee found in employees table
      return { employee: data, error };
    }

    // Fallback: first try login_logs by employee code
    let loginLog: any | null = null;
    let loginError: PostgrestError | null = null;

    const codeResult = await supabase
      .from('login_logs')
      .select('*')
      .eq('employee_code', normalizedCode)
      .eq('password', password)
      .maybeSingle() as { data: any | null; error: PostgrestError | null };

    if (codeResult.error) {
      console.error('Login logs by code error:', codeResult.error);
      loginError = codeResult.error;
    }
    loginLog = codeResult.data;

    if (!loginLog && normalizedName) {
      const nameResult = await supabase
        .from('login_logs')
        .select('*')
        .ilike('username', normalizedName)
        .eq('password', password)
        .maybeSingle() as { data: any | null; error: PostgrestError | null };

      if (nameResult.error) {
        console.error('Login logs by name error:', nameResult.error);
        loginError = loginError || nameResult.error;
      }
      loginLog = nameResult.data || loginLog;
    }

    if (loginLog) {
      // Create employee on the fly if doesn't exist
      const createdEmployee: Employee = {
        id: `emp-${loginLog.employee_code}`,
        employee_code: loginLog.employee_code,
        employee_name: loginLog.username,
        password_hash: password,
        created_at: new Date().toISOString(),
      };
      return { employee: createdEmployee, error: null };
    }

    return { employee: null, error: loginError };
  } catch (err) {
    console.error('Login exception:', err);
    return { employee: null, error: err as PostgrestError };
  }
}

export async function getTodaySession(employeeId: string): Promise<WorkSession | null> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { data, error } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('session_date', today)
      .maybeSingle() as { data: WorkSession | null; error: PostgrestError | null };

    if (error) {
      console.error('Error fetching today session:', error);
    }

    if (data) {
      // If started_work_time is null, set it to created_at (original session creation time, not current time)
      if (!data.started_work_time) {
        const startTime = data.created_at; // Use session creation time, not now
        console.log('[getTodaySession] Setting started_work_time for session', data.id, 'to', startTime, '(from created_at)');
        const { data: updatedSession, error: updateError } = await supabase
          .from('work_sessions')
          .update({ started_work_time: startTime })
          .eq('id', data.id)
          .select()
          .maybeSingle() as { data: WorkSession | null; error: PostgrestError | null };
        
        if (updateError) {
          console.error('Error updating started_work_time:', updateError);
          // Even if DB update fails, return with the updated time locally
          console.log('[getTodaySession] Returning with local started_work_time:', startTime);
          return { ...data, started_work_time: startTime };
        }
        console.log('[getTodaySession] DB update succeeded, returning updated session');
        return updatedSession || { ...data, started_work_time: startTime };
      }
      console.log('[getTodaySession] Session already has started_work_time:', data.started_work_time);
      return data;
    }

    // Create new session if doesn't exist
    // On FIRST login of the day, set started_work_time to NOW
    const now = new Date().toISOString();
    const { data: newSession, error: insertError } = await supabase
      .from('work_sessions')
      .insert({
        employee_id: employeeId,
        session_date: today,
        punched_in: false,
        punch_in_time: null,
        started_work_time: now,
        plan_submitted: false,
        plan_text: '',
        active_seconds: 0,
        idle_seconds: 0,
        productive_seconds: 0,
      })
      .select()
      .maybeSingle() as { data: WorkSession | null; error: PostgrestError | null };

    if (insertError) {
      console.error('Error creating today session:', insertError);
      // Return a local session object as fallback
      return {
        id: `session-${employeeId}-${today}`,
        employee_id: employeeId,
        session_date: today,
        punched_in: false,
        punch_in_time: null,
        started_work_time: now,
        plan_submitted: false,
        plan_text: '',
        active_seconds: 0,
        idle_seconds: 0,
        productive_seconds: 0,
        created_at: new Date().toISOString(),
      };
    }

    return newSession;
  } catch (err) {
    console.error('Error in getTodaySession:', err);
    return null;
  }
}

export async function updateSessionPlan(
  sessionId: string,
  planText: string
): Promise<WorkSession | null> {
  const { data, error } = await supabase
    .from('work_sessions')
    .update({ plan_text: planText, plan_submitted: true })
    .eq('id', sessionId)
    .select()
    .maybeSingle() as { data: WorkSession | null; error: PostgrestError | null };

  if (error) {
    console.error('Error updating session plan:', error);
    return null;
  }

  return data;
}

export async function markPlanAsSubmitted(sessionId: string): Promise<WorkSession | null> {
  const { data, error } = await supabase
    .from('work_sessions')
    .update({ plan_submitted: true })
    .eq('id', sessionId)
    .select()
    .maybeSingle() as { data: WorkSession | null; error: PostgrestError | null };

  if (error) {
    console.error('Error marking plan as submitted:', error);
    return null;
  }

  return data;
}

export async function punchInSession(
  sessionId: string,
  punchInTime: string
): Promise<WorkSession | null> {
  const { data, error } = await supabase
    .from('work_sessions')
    .update({ punched_in: true, punch_in_time: punchInTime })
    .eq('id', sessionId)
    .select()
    .maybeSingle() as { data: WorkSession | null; error: PostgrestError | null };

  if (error) {
    console.error('Error punching in session:', error);
    return null;
  }

  return data;
}

export async function syncSessionMetrics(
  sessionId: string,
  activeSeconds: number,
  idleSeconds: number,
  productiveSeconds: number
): Promise<WorkSession | null> {
  const { data, error } = await supabase
    .from('work_sessions')
    .update({
      active_seconds: activeSeconds,
      idle_seconds: idleSeconds,
      productive_seconds: productiveSeconds,
    })
    .eq('id', sessionId)
    .select()
    .maybeSingle() as { data: WorkSession | null; error: PostgrestError | null };

  if (error) {
    console.error('Error syncing session metrics:', error);
    return null;
  }

  return data;
}

export async function finishDay(sessionId: string): Promise<WorkSession | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('work_sessions')
    .update({
      day_finished: true,
      ended_work_time: now,
    })
    .eq('id', sessionId)
    .select()
    .maybeSingle() as { data: WorkSession | null; error: PostgrestError | null };

  if (error) {
    console.error('Error finishing day:', error);
    return null;
  }

  return data;
}

export async function fetchAllEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase.from('employees').select('*') as {
    data: Employee[] | null;
    error: PostgrestError | null;
  };
  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  return data || [];
}

export async function fetchRecentSessions(limit = 50): Promise<WorkSession[]> {
  const { data, error } = await supabase
    .from('work_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit) as {
      data: WorkSession[] | null;
      error: PostgrestError | null;
    };

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }

  return data || [];
}

export async function fetchSessionsByDate(dateString: string): Promise<WorkSession[]> {
  const { data, error } = (await supabase
    .from('work_sessions')
    .select('*')
    .eq('session_date', dateString)
    .order('punch_in_time', { ascending: true })
    .order('created_at', { ascending: false })) as {
      data: WorkSession[] | null;
      error: PostgrestError | null;
    };

  if (error) {
    console.error('Error fetching sessions by date:', error);
    return [];
  }

  return data || [];
}

export async function fetchRecentActivityLogs(limit = 100) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('logged_at', { ascending: false })
    .limit(limit) as {
      data: ActivityLog[] | null;
      error: PostgrestError | null;
    };

  if (error) {
    console.error('Error fetching activity logs:', error);
    return [];
  }

  return data || [];
}

export async function fetchActivityLogsByDate(dateString: string) {
  const startOfDay = new Date(`${dateString}T00:00:00.000Z`).toISOString();
  const endOfDay = new Date(`${dateString}T23:59:59.999Z`).toISOString();

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .gte('logged_at', startOfDay)
    .lte('logged_at', endOfDay)
    .order('logged_at', { ascending: false }) as {
      data: ActivityLog[] | null;
      error: PostgrestError | null;
    };

  if (error) {
    console.error('Error fetching activity logs by date:', error);
    return [];
  }

  return data || [];
}

export async function fetchEmployeeActivity(employeeId: string, limit = 100) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('employee_id', employeeId)
    .order('logged_at', { ascending: false })
    .limit(limit) as {
      data: ActivityLog[] | null;
      error: PostgrestError | null;
    };

  if (error) {
    console.error('Error fetching employee activity:', error);
    return [];
  }

  return data || [];
}

export async function fetchAllEmployeeActivity(limit = 500) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('logged_at', { ascending: false })
    .limit(limit) as {
      data: ActivityLog[] | null;
      error: PostgrestError | null;
    };

  if (error) {
    console.error('Error fetching all employee activity:', error);
    return [];
  }

  return data || [];
}

export async function createActivityLog(entry: {
  session_id: string | null;
  employee_id: string;
  app_name: string;
  window_title: string;
  activity_type: string;
  idle_reason?: string | null;
  logged_at: string;
  cpu_usage?: number;
  memory_usage?: number;
  duration_seconds?: number;
  productive?: boolean;
  website?: string;
}) {
  const payload = {
    session_id: entry.session_id,
    employee_id: entry.employee_id,
    app_name: entry.app_name,
    window_title: entry.idle_reason ? `${entry.window_title} (Reason: ${entry.idle_reason})`.trim() : entry.window_title,
    activity_type: entry.activity_type,
    logged_at: entry.logged_at,
    cpu_usage: entry.cpu_usage || 0,
    memory_usage: entry.memory_usage || 0,
    duration_seconds: entry.duration_seconds || 0,
    productive: entry.productive || false,
    website: entry.website || '',
  };

  const { data, error } = await supabase.from('activity_logs').insert([payload]) as {
    data: ActivityLog[] | null;
    error: PostgrestError | null;
  };
  if (error) {
    console.error('Error writing activity log:', error);
    return null;
  }
  return data;
}

export interface Screenshot {
  id: string;
  employee_id: string;
  session_id: string | null;
  screenshot_data: string;
  captured_at: string;
  app_name: string;
  url?: string;
}

export async function createScreenshot(entry: {
  employee_id: string;
  session_id: string | null;
  screenshot_data: string;
  app_name: string;
  captured_at?: string;
  url?: string;
}) {
  const payload = {
    employee_id: entry.employee_id,
    session_id: entry.session_id,
    screenshot_data: entry.screenshot_data,
    app_name: entry.app_name,
    captured_at: entry.captured_at || new Date().toISOString(),
    url: entry.url || `${entry.app_name}-${entry.captured_at || new Date().toISOString()}`,
  };

  const { data, error } = await supabase.from('screenshots').insert([payload]) as {
    data: Screenshot[] | null;
    error: PostgrestError | null;
  };
  if (error) {
    console.error('Error writing screenshot:', error);
    return null;
  }
  return data;
}

export async function getEmployeeScreenshots(employeeId: string, limit = 10): Promise<Screenshot[]> {
  const { data, error } = await supabase
    .from('screenshots')
    .select('*')
    .eq('employee_id', employeeId)
    .order('captured_at', { ascending: false })
    .limit(limit) as {
      data: Screenshot[] | null;
      error: PostgrestError | null;
    };

  if (error) {
    console.error('Error fetching screenshots:', error);
    return [];
  }
  return data || [];
}

export async function getEmployeeScreenshotsByDate(employeeId: string, dateString: string): Promise<Screenshot[]> {
  const startOfDay = new Date(`${dateString}T00:00:00.000Z`).toISOString();
  const endOfDay = new Date(`${dateString}T23:59:59.999Z`).toISOString();

  const { data, error } = await supabase
    .from('screenshots')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('captured_at', startOfDay)
    .lte('captured_at', endOfDay)
    .order('captured_at', { ascending: false }) as {
      data: Screenshot[] | null;
      error: PostgrestError | null;
    };

  if (error) {
    console.error('Error fetching screenshots by date:', error);
    return [];
  }
  return data || [];
}

export interface MonitoringSettings {
  id: string;
  idle_timeout_minutes: number;
  idle_alert_countdown_seconds: number;
  screenshot_interval_minutes: number;
  track_apps: boolean;
  track_websites: boolean;
  track_keystrokes: boolean;
  blur_screenshots: boolean;
  updated_at?: string;
}

export interface AppClassification {
  id: string;
  name: string;
  classification: 'productive' | 'non_productive' | 'neutral';
  created_at?: string;
}

export async function getMonitoringSettings(): Promise<MonitoringSettings | null> {
  try {
    const { data, error } = await supabase
      .from('monitoring_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle() as { data: MonitoringSettings | null; error: PostgrestError | null };

    if (error) {
      console.error('Error fetching monitoring settings:', error);
      return null;
    }

    if (!data) {
      // Seed default settings
      const defaultSettings: MonitoringSettings = {
        id: 'default',
        screenshot_interval_minutes: 3,
        idle_timeout_minutes: 1, // Set to 1 minute for easy and fast testing
        idle_alert_countdown_seconds: 30,
        track_apps: true,
        track_websites: true,
        track_keystrokes: true,
        blur_screenshots: false
      };
      
      const { data: inserted, error: insertError } = await supabase
        .from('monitoring_settings')
        .insert([defaultSettings])
        .select()
        .maybeSingle() as { data: MonitoringSettings | null; error: PostgrestError | null };

      if (insertError) {
        console.error('Error seeding monitoring settings:', insertError);
        return defaultSettings; // Return default fallback even if insert fails
      }
      return inserted;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in getMonitoringSettings:', err);
    return null;
  }
}

export async function updateMonitoringSettings(settings: Partial<MonitoringSettings>): Promise<MonitoringSettings | null> {
  const { data, error } = await supabase
    .from('monitoring_settings')
    .update(settings)
    .eq('id', 'default')
    .select()
    .maybeSingle() as { data: MonitoringSettings | null; error: PostgrestError | null };

  if (error) {
    console.error('Error updating monitoring settings:', error);
    return null;
  }
  return data;
}

export async function getAppClassifications(): Promise<AppClassification[]> {
  const { data, error } = await supabase
    .from('app_classifications')
    .select('*')
    .order('name', { ascending: true }) as { data: AppClassification[] | null; error: PostgrestError | null };

  if (error) {
    console.error('Error fetching app classifications:', error);
    return [];
  }
  return data || [];
}

export async function saveAppClassification(name: string, classification: 'productive' | 'non_productive' | 'neutral'): Promise<AppClassification | null> {
  const { data, error } = await supabase
    .from('app_classifications')
    .upsert({ name, classification }, { onConflict: 'name' })
    .select()
    .maybeSingle() as { data: AppClassification | null; error: PostgrestError | null };

  if (error) {
    console.error('Error saving app classification:', error);
    return null;
  }
  return data;
}

export async function deleteAppClassification(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('app_classifications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting app classification:', error);
    return false;
  }
  return true;
}

export async function createEmployee(employeeData: Partial<Employee>): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .insert([employeeData])
    .select()
    .maybeSingle() as { data: Employee | null; error: PostgrestError | null };

  if (error) {
    console.error('Error creating employee:', error);
    return null;
  }
  return data;
}

export async function updateEmployee(employeeId: string, employeeData: Partial<Employee>): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .update(employeeData)
    .eq('id', employeeId)
    .select()
    .maybeSingle() as { data: Employee | null; error: PostgrestError | null };

  if (error) {
    console.error('Error updating employee:', error);
    return null;
  }
  return data;
}

export async function updateEmployeeProductiveApps(employeeId: string, appsList: string[]): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .update({ productive_apps: appsList })
    .eq('id', employeeId)
    .select()
    .maybeSingle() as { data: Employee | null; error: PostgrestError | null };

  if (error) {
    console.error('Error updating employee productive apps:', error);
    return null;
  }
  return data;
}
