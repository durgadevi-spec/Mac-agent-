import http from 'http';
import { getCurrentActivity, getActivityLogs, initializeSessionCounters, updateBrowserUrl } from './activityMonitor.js';
import { showFloatingTimer, hideFloatingTimer, updateFloatingTimer } from './floatingTimer.js';

let server: http.Server | null = null;
let floatingUpdateInterval: NodeJS.Timeout | null = null;

function updateFloatingTimerLoop() {
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
}

function startFloatingTimerUpdates() {
  if (floatingUpdateInterval) return;
  floatingUpdateInterval = setInterval(updateFloatingTimerLoop, 1000);
}

function stopFloatingTimerUpdates() {
  if (floatingUpdateInterval) {
    clearInterval(floatingUpdateInterval);
    floatingUpdateInterval = null;
  }
}

export function startLocalServer() {
  if (server) return;

  server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/activity') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getCurrentActivity()));
      return;
    }

    if (req.method === 'GET' && req.url === '/logs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getActivityLogs()));
      return;
    }

    if (req.method === 'POST' && req.url === '/initialize') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          initializeSessionCounters(
            data.activeSeconds || 0,
            data.idleSeconds || 0,
            data.productiveSeconds || 0,
            data.sessionSeconds || 0
          );
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(400);
          res.end();
        }
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/browser-event') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.url && data.title !== undefined) {
            updateBrowserUrl(data.url, data.title);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(400);
          res.end();
        }
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/show-timer') {
      try {
        showFloatingTimer();
        startFloatingTimerUpdates();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (req.method === 'POST' && req.url === '/hide-timer') {
      try {
        hideFloatingTimer();
        stopFloatingTimerUpdates();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(5014, '127.0.0.1', () => {
    console.log('[Local Server] Listening on http://localhost:5014');
  });
}

export function stopLocalServer() {
  stopFloatingTimerUpdates();
  if (server) {
    server.close();
    server = null;
  }
}
