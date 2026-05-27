import { app, BrowserWindow, ipcMain, Menu, Notification, Tray, nativeImage, powerMonitor } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import isDev from 'electron-is-dev';
import { setupAutoReconnect } from './autoReconnect.js';
import { setupOfflineCache } from './offlineCache.js';
import {
  setActivityMonitorWindow,
  startBackgroundMonitoring,
  stopBackgroundMonitoring,
  resetSessionCounters,
  showGlobalWaterReminder,
  setAutoLaunchEnabled,
  getAutoLaunchStatus,
  getCurrentActivity,
  getActivityLogs,
  initializeSessionCounters,
  updateIdleTimeout,
  updateAppClassifications,
  setIdleModalActive,
} from './activityMonitor.js';
import { showIdlePromptWindow } from './idlePromptWindow.js';
import {
  createFloatingTimerWindow,
  showFloatingTimer,
  hideFloatingTimer,
  updateFloatingTimer,
} from './floatingTimer.js';
import { startLocalServer, stopLocalServer } from './localServer.js';
import {
  startScreenshotService,
  stopScreenshotService,
  getRecentScreenshots,
  updateScreenshotSettings,
} from './screenshotService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let windowLocked = false;

// Session persistence path
const sessionCachePath = path.join(app.getPath('userData'), 'session-cache.json');

function saveSessionCache(data: any) {
  try {
    fs.writeFileSync(sessionCachePath, JSON.stringify(data), 'utf8');
  } catch { }
}

function loadSessionCache(): any {
  try {
    if (fs.existsSync(sessionCachePath)) {
      return JSON.parse(fs.readFileSync(sessionCachePath, 'utf8'));
    }
  } catch { }
  return null;
}

function clearSessionCache() {
  try {
    if (fs.existsSync(sessionCachePath)) fs.unlinkSync(sessionCachePath);
  } catch { }
}

// Register with Windows startup via Registry (robust fallback)
function registerWindowsStartup() {
  if (process.platform !== 'win32') return;

  // Clean up old startup keys to prevent opening old/incorrect versions
  try {
    execSync('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "TimeStrap Agent" /f', { stdio: 'ignore' });
  } catch { }
  try {
    execSync('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "electron.app.Knockturn Agent" /f', { stdio: 'ignore' });
  } catch { }
  try {
    execSync('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "electron.app.Electron" /f', { stdio: 'ignore' });
  } catch { }
  try {
    execSync('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "TimeChampAgent" /f', { stdio: 'ignore' });
  } catch { }

  if (app.isPackaged) {
    // Production: use Electron's built-in login item (always visible, no --background)
    try {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: [],
        openAsHidden: false,
      });
    } catch (err) {
      console.error('Failed to register startup via setLoginItemSettings:', err);
    }
  } else {
    // Dev mode: use Windows Registry to auto-start the app on boot
    try {
      const regValue = `"${process.execPath}" "${path.resolve('.')}"`;
      execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "KnockturnAgent" /t REG_SZ /d "${regValue}" /f`, { stdio: 'ignore' });
      console.log('[Startup] Registered dev auto-launch via Registry');
    } catch (err) {
      console.error('Failed to register dev startup via Registry:', err);
    }
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// Initialize auto-reconnect and offline cache
setupAutoReconnect();
setupOfflineCache();

async function resolveStartUrl() {
  const localUrl = 'http://localhost:5013';
  if (isDev) {
    try {
      const response = await fetch(localUrl, { method: 'HEAD' });
      if (response.ok || response.status === 404) {
        return localUrl;
      }
    } catch {
      console.warn('Dev server unavailable, falling back to built index.html');
    }
  }

  const indexPath = path.join(__dirname, '../app/index.html');
  return `file://${indexPath}`;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    fullscreen: false,
    show: false,
    minimizable: true,
    maximizable: true,
    closable: false,
    skipTaskbar: false,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const startUrl = await resolveStartUrl();
  await mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Set the window reference for activity monitor (actual monitoring starts later via IPC)
  setActivityMonitorWindow(mainWindow);

  mainWindow.once('ready-to-show', () => {
    // Pass session cache to renderer so it can auto-restore —
    // but only if the cached session is from today
    const cached = loadSessionCache();
    const today = new Date().toISOString().slice(0, 10);
    if (cached && cached.session?.session_date === today) {
      mainWindow?.webContents.send('session-restored', cached);
    } else if (cached) {
      // Stale session from a different day — clear it so user starts fresh
      console.log(`[Main] Stale session cache from ${cached.session?.session_date}, today is ${today}. Clearing.`);
      clearSessionCache();
    }

    // Always show and bring to front on startup (like TimeChamp)
    mainWindow?.show();
    mainWindow?.focus();
    // Pop above everything briefly so the user sees the login/plan screen
    mainWindow?.setAlwaysOnTop(true, 'screen-saver');
    setTimeout(() => {
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false);
        }
      } catch { }
    }, 2000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimise to tray instead of taskbar
  mainWindow.on('minimize', () => {
    if (!windowLocked) {
      mainWindow?.hide();
    }
  });

  // Prevent close → hide to tray
  mainWindow.on('close', (event: any) => {
    if (windowLocked && !isQuitting) {
      event.preventDefault();
      return;
    }
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Block Alt+F4 / Alt+Space when locked
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (windowLocked) {
      if (input.alt && input.key.toLowerCase() === 'f4') {
        event.preventDefault();
        return;
      }
      if (input.alt && input.key === ' ') {
        event.preventDefault();
        return;
      }
    }
  });

  return mainWindow;
}

function resolveTrayIconPath() {
  const isWin = process.platform === 'win32';
  const ext = isWin ? 'ico' : 'png';
  const candidates = [
    path.join(__dirname, `../assets/icon.${ext}`),
    path.join(__dirname, `../../assets/icon.${ext}`),
    path.join(process.cwd(), 'assets', `icon.${ext}`),
    path.join(process.cwd(), 'public', 'assets', `icon.${ext}`),
    path.join(app.getAppPath(), 'assets', `icon.${ext}`),
    path.join(app.getAppPath(), 'public', 'assets', `icon.${ext}`),
    path.join(app.getAppPath(), 'dist', 'assets', `icon.${ext}`),
    // Fallbacks
    path.join(__dirname, '../assets/icon.png'),
    path.join(process.cwd(), 'assets', 'icon.png'),
    path.join(process.cwd(), 'public', 'assets', 'icon.png'),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

function createTray() {
  const iconPath = resolveTrayIconPath();
  let trayIcon = null;

  if (iconPath) {
    const image = nativeImage.createFromPath(iconPath);
    if (!image.isEmpty()) trayIcon = image;
  }

  try {
    tray = trayIcon ? new Tray(trayIcon) : new Tray(nativeImage.createEmpty());
  } catch (error) {
    console.error('Failed to create tray icon:', error);
    return;
  }

  tray.setToolTip('Knockturn Employee Agent');

  const rebuildMenu = () => Menu.buildFromTemplate([
    {
      label: 'Show Knockturn',
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
      },
    },
    {
      label: 'Hide to Tray',
      enabled: !windowLocked,
      click: () => {
        if (mainWindow && !windowLocked) mainWindow.hide();
      },
    },
    { type: 'separator' },
    { label: '● Auto-start: ON', enabled: false },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(rebuildMenu());

  tray.on('click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });

  tray.on('double-click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

// ─── Push activity updates to the floating timer ──────────────────────────────
let floatingUpdateInterval: NodeJS.Timeout | null = null;

function startFloatingTimerUpdates() {
  if (floatingUpdateInterval) return;
  floatingUpdateInterval = setInterval(() => {
    const act = getCurrentActivity();
    const productivityPct =
      act.sessionSeconds > 0
        ? Math.round((act.productiveSeconds / act.sessionSeconds) * 100)
        : 0;
    updateFloatingTimer({
      sessionSeconds: act.sessionSeconds,
      state: act.state,
      currentApp: act.activeWindow.appName,
      productivityPct,
      activeSeconds: act.activeSeconds,
    });
  }, 1000);
}

function stopFloatingTimerUpdates() {
  if (floatingUpdateInterval) {
    clearInterval(floatingUpdateInterval);
    floatingUpdateInterval = null;
  }
}

// ─── App ready ────────────────────────────────────────────────────────────────
app.on('ready', async () => {
  if (!gotLock) return;

  await createWindow();

  // Create the floating timer window (hidden until session starts)
  createFloatingTimerWindow();

  try { createTray(); } catch (e) { console.error('Tray creation failed:', e); }

  // Register Windows startup
  registerWindowsStartup();

  // Start local fallback server
  startLocalServer();

  // Start background screenshot service
  startScreenshotService();

  if (mainWindow) {
    mainWindow.webContents.session.preconnect({ url: 'https://qdqypcwnrbdgqagfdeun.supabase.co' });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('get-connection-status', async () => {
  return mainWindow?.webContents.session || false;
});

ipcMain.handle('cache-data', async (_, key: string, value: any) => {
  try {
    const cachePath = path.join(app.getPath('userData'), 'cache');
    if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });
    fs.writeFileSync(path.join(cachePath, `${key}.json`), JSON.stringify(value), 'utf8');
    return true;
  } catch { return false; }
});

ipcMain.handle('get-cached-data', async (_, key: string) => {
  try {
    const file = path.join(app.getPath('userData'), 'cache', `${key}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    return null;
  } catch { return null; }
});

ipcMain.handle('enter-kiosk', async () => {
  try {
    if (mainWindow) {
      mainWindow.setKiosk(true);
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.show(); mainWindow.focus();
    }
    return true;
  } catch { return false; }
});

ipcMain.handle('exit-kiosk', async () => {
  try {
    if (mainWindow) {
      mainWindow.setKiosk(false);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.show(); mainWindow.focus();
    }
    return true;
  } catch { return false; }
});

ipcMain.handle('show-water-reminder', async () => {
  try { showGlobalWaterReminder(); return true; } catch { return false; }
});

ipcMain.handle('request-show-window', async () => {
  try {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.moveTop();
      mainWindow.focus();
      // Keep on top briefly so it pops above everything (even fullscreen apps)
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      setTimeout(() => {
        try {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(false);
          }
        } catch { }
      }, 500);
    }
    return true;
  } catch { return false; }
});
ipcMain.handle('set-idle-modal-active', async (_, active: boolean) => {
  try { setIdleModalActive(active); return true; } catch { return false; }
});
ipcMain.handle('initialize-session-counters', async (_, active: number, idle: number, productive: number, session: number) => {
  try {
    initializeSessionCounters(active, idle, productive, session);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('get-recent-screenshots', async () => {
  try { return getRecentScreenshots(); } catch { return []; }
});

ipcMain.handle('start-screenshot-service', async () => {
  try { startScreenshotService(); return true; } catch { return false; }
});

ipcMain.handle('stop-screenshot-service', async () => {
  try { stopScreenshotService(); return true; } catch { return false; }
});

ipcMain.handle('get-latest-activity', async () => {
  try { return getCurrentActivity(); } catch { return null; }
});

ipcMain.handle('get-activity-logs', async () => {
  try { return getActivityLogs(); } catch { return []; }
});

ipcMain.handle('set-auto-launch', async (_, enabled: boolean) => {
  try { return setAutoLaunchEnabled(enabled); } catch { return false; }
});

ipcMain.handle('get-auto-launch-status', async () => {
  try { return getAutoLaunchStatus(); } catch { return false; }
});

ipcMain.handle('update-monitoring-settings', async (_, settings: any) => {
  try {
    if (settings.screenshot_interval_minutes !== undefined) {
      updateScreenshotSettings(settings.screenshot_interval_minutes, settings.blur_screenshots);
    }
    if (settings.idle_timeout_minutes !== undefined) {
      updateIdleTimeout(settings.idle_timeout_minutes);
    }
    return true;
  } catch (err) {
    console.error('Failed to update monitoring settings in Main:', err);
    return false;
  }
});

ipcMain.handle('update-app-classifications', async (_, classifications: any[]) => {
  try {
    updateAppClassifications(classifications);
    return true;
  } catch (err) {
    console.error('Failed to update app classifications in Main:', err);
    return false;
  }
});

ipcMain.handle('show-idle-reminder', async () => {
  try {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.restore();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.focus();
    }
    const n = new Notification({
      title: 'Idle Time Check',
      body: 'You have been idle. Please enter your activity details.',
      silent: false,
    });
    n.show();
    return true;
  } catch { return false; }
});

ipcMain.handle('get-system-idle-time', async () => {
  try { return powerMonitor.getSystemIdleTime(); } catch { return 0; }
});

ipcMain.handle('minimize-window', async () => {
  try {
    if (mainWindow) {
      if (windowLocked) return false;
      mainWindow.hide(); // hide to tray instead of minimise
    }
    return true;
  } catch { return false; }
});

ipcMain.handle('toggle-maximize-window', async () => {
  try {
    if (mainWindow) {
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
    return true;
  } catch { return false; }
});

ipcMain.handle('close-window', async () => {
  try {
    if (mainWindow) { isQuitting = true; mainWindow.close(); }
    return true;
  } catch { return false; }
});

ipcMain.handle('set-window-minimizable', async (_, minimizable: boolean) => {
  try {
    if (mainWindow) {
      mainWindow.setMinimizable(minimizable);
      if (!minimizable) { mainWindow.show(); mainWindow.focus(); }
      windowLocked = !(mainWindow.isClosable() && mainWindow.isMinimizable());
    }
    return true;
  } catch { return false; }
});

ipcMain.handle('set-window-closable', async (_, closable: boolean) => {
  try {
    if (mainWindow) {
      mainWindow.setClosable(closable);
      windowLocked = !(mainWindow.isClosable() && mainWindow.isMinimizable());
      if (!closable) { mainWindow.show(); mainWindow.focus(); }
    }
    return true;
  } catch { return false; }
});

// ─── Floating Timer IPC ───────────────────────────────────────────────────────

ipcMain.handle('show-floating-timer', async () => {
  try {
    showFloatingTimer();
    startFloatingTimerUpdates();
    return true;
  } catch { return false; }
});

ipcMain.handle('hide-floating-timer', async () => {
  try {
    hideFloatingTimer();
    stopFloatingTimerUpdates();
    return true;
  } catch { return false; }
});

// ─── Session Persistence IPC ──────────────────────────────────────────────────

ipcMain.handle('save-session-cache', async (_, data: any) => {
  try { saveSessionCache(data); return true; } catch { return false; }
});

ipcMain.handle('load-session-cache', async () => {
  try { return loadSessionCache(); } catch { return null; }
});

ipcMain.handle('clear-session-cache', async () => {
  try { clearSessionCache(); return true; } catch { return false; }
});

// Check external timesheet DB for plan submission
ipcMain.handle('check-timesheet-db', async (_, employeeCode) => {
  const pg = await import('pg' as any);
  const Client = pg.default?.Client || pg.Client;
  const client = new Client({ 
    connectionString: 'postgresql://postgres.bmigbiajnhhknltuvrso:Durgadevi%4067@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    // First, get the employee's UUID from their timesheet DB
    const empResult = await client.query('SELECT id FROM employees WHERE employee_code = $1', [employeeCode]);
    if (empResult.rows.length === 0) {
      await client.end();
      return false; // Employee not found in timesheet DB
    }
    
    const employeeId = empResult.rows[0].id;
    const today = new Date().toISOString().slice(0, 10);
    console.log(`[checkTimesheetDb] Checking plans for employeeId ${employeeId} on ${today}`);
    
    // Check if they have a daily_plan for today
    const planResult = await client.query('SELECT id FROM daily_plans WHERE employee_id = $1 AND "date"::text = $2', [employeeId, today]);
    
    console.log(`[checkTimesheetDb] Found ${planResult.rows.length} plans`);
    
    await client.end();
    return planResult.rows.length > 0;
  } catch (error) {
    console.error('[checkTimesheetDb] Error checking timesheet DB:', error);
    try { await client.end(); } catch (e) {}
    return false;
  }
});

// ─── App quit ─────────────────────────────────────────────────────────────────

// ─── Start / Stop tracking IPC (called by renderer after plan+punch) ──────────

ipcMain.handle('start-tracking', async () => {
  try {
    startBackgroundMonitoring();
    console.log('[Main] Tracking started via IPC');
    return true;
  } catch { return false; }
});

ipcMain.handle('stop-tracking', async () => {
  try {
    stopBackgroundMonitoring();
    resetSessionCounters();
    console.log('[Main] Tracking stopped via IPC');
    return true;
  } catch { return false; }
});

// ─── App quit ─────────────────────────────────────────────────────────────────

app.on('before-quit', () => {
  isQuitting = true;
  stopBackgroundMonitoring();
  stopFloatingTimerUpdates();
  stopLocalServer();
  stopScreenshotService();
});

export { mainWindow };
