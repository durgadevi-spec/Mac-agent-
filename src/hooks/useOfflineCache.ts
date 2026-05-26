import { useEffect, useState, useCallback } from 'react';

interface ConnectionStatus {
  isOnline: boolean;
  isConnected: boolean;
  lastChecked: Date;
}

export function useOfflineCache() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    isConnected: true,
    lastChecked: new Date(),
  });

  const cacheData = useCallback(async (key: string, value: any) => {
    if (window.electronAPI) {
      return await window.electronAPI.cacheData(key, value);
    }
    // Fallback: use localStorage
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  }, []);

  const getCachedData = useCallback(async (key: string) => {
    if (window.electronAPI) {
      return await window.electronAPI.getCachedData(key);
    }
    // Fallback: use localStorage
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus(prev => ({
        ...prev,
        isOnline: true,
        lastChecked: new Date(),
      }));
      console.log('✅ Connection restored');
    };

    const handleOffline = () => {
      setConnectionStatus(prev => ({
        ...prev,
        isOnline: false,
        lastChecked: new Date(),
      }));
      console.log('❌ Connection lost - offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for Electron connection changes
    if (window.electronAPI?.onConnectionChange) {
      window.electronAPI.onConnectionChange((status: boolean) => {
        setConnectionStatus(prev => ({
          ...prev,
          isConnected: status,
          lastChecked: new Date(),
        }));
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    connectionStatus,
    cacheData,
    getCachedData,
  };
}

// Global offline cache store
export function useOfflinePlanStorage() {
  const { cacheData, getCachedData } = useOfflineCache();

  const savePlan = useCallback(async (employeeId: string, planText: string) => {
    return await cacheData(`plan_${employeeId}`, {
      text: planText,
      savedAt: new Date().toISOString(),
    });
  }, [cacheData]);

  const getPlan = useCallback(async (employeeId: string) => {
    return await getCachedData(`plan_${employeeId}`);
  }, [getCachedData]);

  const saveSession = useCallback(async (employeeId: string, sessionData: any) => {
    return await cacheData(`session_${employeeId}`, {
      ...sessionData,
      cachedAt: new Date().toISOString(),
    });
  }, [cacheData]);

  const getSession = useCallback(async (employeeId: string) => {
    return await getCachedData(`session_${employeeId}`);
  }, [getCachedData]);

  return {
    savePlan,
    getPlan,
    saveSession,
    getSession,
  };
}
