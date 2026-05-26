import { BrowserWindow, screen, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let floatingWindow: BrowserWindow | null = null;
let isSessionActive = false;

export function createFloatingTimerWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;

  const winWidth = 280;
  const winHeight = 130;

  floatingWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: sw - winWidth - 16,
    y: sh - winHeight - 16,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    focusable: false,
    show: false,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const html = buildFloatingHTML();
  floatingWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);

  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });

  return floatingWindow;
}

export function showFloatingTimer() {
  isSessionActive = true;
  if (!floatingWindow || floatingWindow.isDestroyed()) {
    createFloatingTimerWindow();
  }
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.show();
    floatingWindow.setAlwaysOnTop(true, 'floating');
  }
}

export function hideFloatingTimer() {
  isSessionActive = false;
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.hide();
  }
}

export function updateFloatingTimer(data: {
  sessionSeconds: number;
  state: string;
  currentApp: string;
  productivityPct: number;
  activeSeconds: number;
}) {
  if (!floatingWindow || floatingWindow.isDestroyed()) return;
  if (!isSessionActive) return;

  const { sessionSeconds, state, currentApp, productivityPct, activeSeconds } = data;
  const h = Math.floor(sessionSeconds / 3600);
  const m = Math.floor((sessionSeconds % 3600) / 60);
  const s = sessionSeconds % 60;
  const timeStr = h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const stateColors: Record<string, string> = {
    productive: '#22c55e',
    idle: '#f59e0b',
    away: '#94a3b8',
    non_productive: '#ef4444',
  };
  const stateLabels: Record<string, string> = {
    productive: '⚡ Productive',
    idle: '☕ Idle',
    away: '💤 Away',
    non_productive: '📵 Non-Productive',
  };

  const color = stateColors[state] || '#94a3b8';
  const label = stateLabels[state] || '— Unknown';
  const appShort = currentApp.length > 18 ? currentApp.slice(0, 17) + '…' : currentApp;

  floatingWindow.webContents.executeJavaScript(`
    (function() {
      var t = document.getElementById('ft-time');
      var s = document.getElementById('ft-state');
      var a = document.getElementById('ft-app');
      var b = document.getElementById('ft-bar');
      var p = document.getElementById('ft-pct');
      if (t) t.textContent = ${JSON.stringify(timeStr)};
      if (s) { s.textContent = ${JSON.stringify(label)}; s.style.color = ${JSON.stringify(color)}; }
      if (a) a.textContent = ${JSON.stringify(appShort)};
      if (b) b.style.width = ${JSON.stringify(productivityPct + '%')};
      if (b) b.style.background = ${JSON.stringify(color)};
      if (p) p.textContent = ${JSON.stringify(productivityPct + '%')};
    })();
  `).catch(() => {});
}

function buildFloatingHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:280px; height:130px; background:transparent; overflow:hidden; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; -webkit-app-region:drag; user-select:none; }
  .card {
    width:280px; height:130px;
    background: rgba(15,15,25,0.88);
    backdrop-filter: blur(14px);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    padding: 12px 16px 10px;
    display:flex; flex-direction:column; gap:6px;
  }
  .row1 { display:flex; align-items:center; justify-content:space-between; }
  .brand { font-size:10px; font-weight:600; color:rgba(255,255,255,0.45); letter-spacing:0.06em; text-transform:uppercase; }
  .timer { font-size:28px; font-weight:700; color:#fff; letter-spacing:0.03em; font-variant-numeric:tabular-nums; font-feature-settings:"tnum"; line-height:1; }
  .state { font-size:11px; font-weight:600; color:#22c55e; }
  .app { font-size:10px; color:rgba(255,255,255,0.5); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .bar-row { display:flex; align-items:center; gap:6px; margin-top:2px; }
  .bar-track { flex:1; height:3px; background:rgba(255,255,255,0.12); border-radius:2px; overflow:hidden; }
  .bar-fill { height:3px; width:0%; border-radius:2px; background:#22c55e; transition:width 1s linear, background 0.3s; }
  .pct { font-size:10px; color:rgba(255,255,255,0.45); font-weight:600; min-width:28px; text-align:right; }
</style>
</head>
<body>
<div class="card">
  <div class="row1">
    <span class="brand">Knockturn</span>
    <span class="timer" id="ft-time">00:00</span>
  </div>
  <div>
    <div class="state" id="ft-state">⚡ Productive</div>
    <div class="app" id="ft-app">—</div>
  </div>
  <div class="bar-row">
    <div class="bar-track"><div class="bar-fill" id="ft-bar"></div></div>
    <span class="pct" id="ft-pct">0%</span>
  </div>
</div>
</body>
</html>`;
}

export function isFloatingTimerVisible(): boolean {
  return floatingWindow !== null && !floatingWindow.isDestroyed() && floatingWindow.isVisible();
}
