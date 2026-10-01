/// <reference types="vite/client" />

export interface ElectronAPI {
  cacheData: (key: string, value: any) => Promise<boolean>;
  getCachedData: (key: string) => Promise<any>;
  getConnectionStatus: () => Promise<boolean>;
  onConnectionChange: (callback: (status: boolean) => void) => void;
  onlineStatus: boolean;
  acknowledgeScreenshots: (ids: string[]) => Promise<boolean>;
  setCurrentEmployee: (employeeId: string | null) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
