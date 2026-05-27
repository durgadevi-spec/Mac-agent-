const { contextBridge, ipcRenderer } = require('electron');

// Preload script for security - exposes limited IPC APIs
const electronAPI = {
  // Cache
  cacheData: (key, value) => ipcRenderer.invoke('cache-data', key, value),
  getCachedData: (key) => ipcRenderer.invoke('get-cached-data', key),

  // Connection
  getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),
  onConnectionChange: (callback) => {
    ipcRenderer.on('connection-changed', (_event, status) => callback(status));
  },
  getOnlineStatus: () => (typeof navigator !== 'undefined' ? navigator.onLine : false),

  // Kiosk
  enterKiosk: () => ipcRenderer.invoke('enter-kiosk'),
  exitKiosk: () => ipcRenderer.invoke('exit-kiosk'),

  // Window controls
  setWindowClosable: (closable) => ipcRenderer.invoke('set-window-closable', closable),
  setWindowMinimizable: (minimizable) => ipcRenderer.invoke('set-window-minimizable', minimizable),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('toggle-maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  requestShowWindow: () => ipcRenderer.invoke('request-show-window'),

  // Reminders
  showWaterReminder: () => ipcRenderer.invoke('show-water-reminder'),
  showIdleReminder: () => ipcRenderer.invoke('show-idle-reminder'),
  setIdleModalActive: (active) => ipcRenderer.invoke('set-idle-modal-active', active),
  closeIdlePromptWindow: () => ipcRenderer.invoke('close-idle-prompt-window'),

  // System
  getSystemIdleTime: () => ipcRenderer.invoke('get-system-idle-time'),

  // Activity monitoring
  getLatestActivity: () => ipcRenderer.invoke('get-latest-activity'),
  getActivityLogs: () => ipcRenderer.invoke('get-activity-logs'),
  onActivityUpdate: (callback) => {
    const listener = (_event, activity) => callback(activity);
    ipcRenderer.on('activity-update', listener);
    return () => ipcRenderer.removeListener('activity-update', listener);
  },
  removeActivityUpdateListener: () => ipcRenderer.removeAllListeners('activity-update'),
  startTracking: () => ipcRenderer.invoke('start-tracking'),
  stopTracking: () => ipcRenderer.invoke('stop-tracking'),

  // Auto-launch
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getAutoLaunchStatus: () => ipcRenderer.invoke('get-auto-launch-status'),

  // Floating timer
  showFloatingTimer: () => ipcRenderer.invoke('show-floating-timer'),
  hideFloatingTimer: () => ipcRenderer.invoke('hide-floating-timer'),

  // Session persistence
  saveSessionCache: (data) => ipcRenderer.invoke('save-session-cache', data),
  loadSessionCache: () => ipcRenderer.invoke('load-session-cache'),
  clearSessionCache: () => ipcRenderer.invoke('clear-session-cache'),
  checkTimesheetDb: (employeeCode) => ipcRenderer.invoke('check-timesheet-db', employeeCode),
  onSessionRestored: (callback) => {
    ipcRenderer.on('session-restored', (_event, data) => callback(data));
  },
  initializeSessionCounters: (active, idle, productive, session) =>
    ipcRenderer.invoke('initialize-session-counters', active, idle, productive, session),
  getRecentScreenshots: () => ipcRenderer.invoke('get-recent-screenshots'),
  startScreenshotService: () => ipcRenderer.invoke('start-screenshot-service'),
  stopScreenshotService: () => ipcRenderer.invoke('stop-screenshot-service'),
  updateMonitoringSettings: (settings) => ipcRenderer.invoke('update-monitoring-settings', settings),
  updateAppClassifications: (classifications) => ipcRenderer.invoke('update-app-classifications', classifications),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
