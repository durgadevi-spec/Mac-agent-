export type ActivityState = 'productive' | 'idle' | 'away' | 'non_productive';

interface WindowInfo {
  title: string;
  appName: string;
  website?: string;
  timestamp: string;
}

interface SystemActivity {
  activeWindow: WindowInfo;
  idleTime: number;
  isIdle: boolean;
  state: ActivityState;
  activeSeconds: number;
  productiveSeconds: number;
  idleSeconds: number;
  awaySeconds: number;
  sessionSeconds: number;
  lastActivityAt: string;
  timestamp: string;
}

interface ActivityLog {
  timestamp: string;
  type: 'app' | 'idle' | 'away';
  appName: string;
  windowTitle: string;
  website?: string;
  productive: boolean;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
}

class ActivityCollector {
  private activityLogs: ActivityLog[] = [];
  private latestActivity: SystemActivity = {
    activeWindow: {
      title: 'Unknown',
      appName: 'Unknown',
      timestamp: new Date().toISOString(),
    },
    idleTime: 0,
    isIdle: true,
    state: 'away',
    activeSeconds: 0,
    productiveSeconds: 0,
    idleSeconds: 0,
    awaySeconds: 0,
    sessionSeconds: 0,
    lastActivityAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  };

  async getLatestActivity(): Promise<SystemActivity> {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.getLatestActivity) {
        const latest = await (window as any).electronAPI.getLatestActivity();
        if (latest && typeof latest === 'object') {
          this.latestActivity = latest as SystemActivity;
          return this.latestActivity;
        }
      } else {
        // Fallback to local server API when running in standard browser
        const res = await fetch('http://127.0.0.1:5014/activity');
        if (res.ok) {
          const latest = await res.json();
          if (latest && typeof latest === 'object') {
            this.latestActivity = latest as SystemActivity;
            return this.latestActivity;
          }
        }
      }
    } catch (error) {
      // suppress error noise in browser console
    }

    return this.latestActivity;
  }

  async getSystemActivity(): Promise<SystemActivity> {
    return this.getLatestActivity();
  }

  getActivityLogs(): ActivityLog[] {
    return this.activityLogs;
  }

  async refreshActivityLogs(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.getActivityLogs) {
        const logs = await (window as any).electronAPI.getActivityLogs();
        if (Array.isArray(logs)) {
          this.activityLogs = logs;
        }
      } else {
        // Fallback to local server API when running in standard browser
        const res = await fetch('http://127.0.0.1:5014/logs');
        if (res.ok) {
          const logs = await res.json();
          if (Array.isArray(logs)) {
            this.activityLogs = logs;
          }
        }
      }
    } catch (error) {
      // suppress error noise in browser console
    }
  }
}

export const activityCollector = new ActivityCollector();
export default ActivityCollector;
