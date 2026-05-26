import { BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import { setIdleModalActive } from './activityMonitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let idleWindow: BrowserWindow | null = null;

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

export async function showIdlePromptWindow(idleStartTimeMs: number) {
  if (idleWindow && !idleWindow.isDestroyed()) {
    idleWindow.show();
    idleWindow.focus();
    return;
  }

  // Set the idle modal active state in the activity monitor
  setIdleModalActive(true);

  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;

  idleWindow = new BrowserWindow({
    width: sw,
    height: sh,
    x: 0,
    y: 0,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    focusable: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const startUrl = await resolveStartUrl();
  // Pass the start time as a query parameter
  await idleWindow.loadURL(`${startUrl}#/idle-prompt?start=${idleStartTimeMs}`);
  idleWindow.focus();
  idleWindow.setAlwaysOnTop(true, 'screen-saver');

  idleWindow.on('closed', () => {
    idleWindow = null;
    setIdleModalActive(false);
  });
}

export function hideIdlePromptWindow() {
  if (idleWindow && !idleWindow.isDestroyed()) {
    idleWindow.close();
  }
  idleWindow = null;
  setIdleModalActive(false);
}

// IPC handler for the idle prompt window to close itself
ipcMain.handle('close-idle-prompt-window', () => {
  hideIdlePromptWindow();
  return true;
});
