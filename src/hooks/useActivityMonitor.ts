import { useState, useEffect } from 'react';

export type ActivityState = 'productive' | 'idle' | 'away' | 'non_productive' | 'neutral';

export interface ActivityData {
  state: ActivityState;
  activeSeconds: number;
  idleSeconds: number;
  productiveSeconds: number;
  awaySeconds: number;
  sessionSeconds: number;
  currentApp: string;
  windowTitle: string;
  website?: string;
  lastActivity: Date;
}

export function useActivityMonitor(enabled: boolean) {
  const [data, setData] = useState<ActivityData>({
    state: 'away',
    activeSeconds: 0,
    idleSeconds: 0,
    productiveSeconds: 0,
    awaySeconds: 0,
    sessionSeconds: 0,
    currentApp: 'Unknown',
    windowTitle: 'Unknown',
    website: undefined,
    lastActivity: new Date(),
  });

  useEffect(() => {
    if (!enabled) return;

    const applyUpdate = (latest: any) => {
      if (!latest) return;
      setData({
        state: latest.state,
        activeSeconds: latest.activeSeconds,
        idleSeconds: latest.idleSeconds,
        productiveSeconds: latest.productiveSeconds,
        awaySeconds: latest.awaySeconds ?? 0,
        sessionSeconds: latest.sessionSeconds,
        currentApp: latest.activeWindow?.appName ?? 'Unknown',
        windowTitle: latest.activeWindow?.windowTitle ?? 'Unknown',
        website: latest.activeWindow?.website,
        lastActivity: new Date(latest.lastActivityAt),
      });
    };

    const updateFromElectron = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getLatestActivity) {
          const latest = await (window as any).electronAPI.getLatestActivity();
          applyUpdate(latest);
        }
      } catch (error) {
        console.error('Failed to update activity from Electron:', error);
      }
    };

    updateFromElectron();
    const interval = window.setInterval(updateFromElectron, 1000);

    let removeListener: (() => void) | undefined;
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onActivityUpdate) {
      removeListener = (window as any).electronAPI.onActivityUpdate((latest: any) => {
        applyUpdate(latest);
      });
    }

    return () => {
      window.clearInterval(interval);
      if (removeListener) {
        removeListener();
      } else if (typeof window !== 'undefined' && (window as any).electronAPI?.removeActivityUpdateListener) {
        (window as any).electronAPI.removeActivityUpdateListener();
      }
    };
  }, [enabled]);

  return data;
}

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
