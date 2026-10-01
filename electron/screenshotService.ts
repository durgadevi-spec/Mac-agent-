import { app, nativeImage, systemPreferences } from 'electron';
import fs from 'fs';
import path from 'path';
import screenshot from 'screenshot-desktop';
import { getCurrentActivity } from './activityMonitor.js';

// Setup debug log file
const debugLogPath = path.join(app.getPath('userData'), 'debug-screenshots.log');
function debugLog(msg: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(msg);
  try {
    fs.appendFileSync(debugLogPath, line);
  } catch (e) {
    // ignore
  }
}

let screenshotInterval: NodeJS.Timeout | null = null;
let pendingScreenshots: Array<{ employee_id: string; app_name: string; captured_at: string; screenshot_data: string; id: string }> = [];
let currentIntervalMinutes = 3; // Default 3 minutes from settings image
let currentEmployeeId: string | null = null;
let initialCaptureTimer: NodeJS.Timeout | null = null;
let captureInitialScreenshot: (() => Promise<void>) | null = null;
let isInitialCaptureInProgress = false;

let shouldBlurScreenshots = false;

export function updateScreenshotSettings(intervalMinutes: number, blur?: boolean) {
  if (blur !== undefined) {
    shouldBlurScreenshots = !!blur;
  }
  const newInterval = Math.max(1, intervalMinutes);
  debugLog(`[Screenshot] Settings updated: interval=${newInterval}m, blur=${shouldBlurScreenshots}`);

  if (currentIntervalMinutes !== newInterval) {
    currentIntervalMinutes = newInterval;
    if (screenshotInterval) {
      stopScreenshotService();
      startScreenshotService();
    }
  }
}

export function setCurrentEmployeeId(id: string | null) {
  const wasLoggedIn = !!currentEmployeeId;
  currentEmployeeId = id;
  if (!id) {
    if (initialCaptureTimer) clearTimeout(initialCaptureTimer);
    initialCaptureTimer = null;
    // If logging out or ID is cleared, wipe the buffer immediately so nothing gets mixed
    pendingScreenshots = [];
    debugLog('[Screenshot] Employee logged out. Cleared pending screenshots buffer.');
  } else {
    debugLog(`[Screenshot] Employee logged in: ${id}`);
    if (!wasLoggedIn) scheduleInitialScreenshot(1000);
  }
}

function scheduleInitialScreenshot(delayMs: number) {
  if (!captureInitialScreenshot || !currentEmployeeId) return;
  if (initialCaptureTimer) clearTimeout(initialCaptureTimer);
  initialCaptureTimer = setTimeout(() => {
    initialCaptureTimer = null;
    void captureInitialScreenshot?.();
  }, delayMs);
}

export function startScreenshotService() {
  if (screenshotInterval) return;

  debugLog('[Screenshot] Service starting...');
  if (process.platform === 'darwin') {
    try {
      debugLog(`[Screenshot] macOS screen capture access status: ${systemPreferences.getMediaAccessStatus('screen')}`);
    } catch (error) {
      debugLog('[Screenshot] Failed to inspect macOS screen capture access status: ' + String(error));
    }
  }
  const screenshotDir = path.join(app.getPath('userData'), 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
    debugLog('[Screenshot] Created screenshots directory: ' + screenshotDir);
  }

  const INTERVAL_MS = currentIntervalMinutes * 60 * 1000;
  debugLog('[Screenshot] Interval set to: ' + currentIntervalMinutes + ' minutes (' + INTERVAL_MS + 'ms)');

  screenshotInterval = setInterval(async () => {
    try {
      if (!currentEmployeeId) {
        debugLog('[Screenshot] No employee currently logged in, skipping screenshot capture');
        return;
      }

      const activity = getCurrentActivity();
      // Only skip when the system is genuinely hardware-idle (no keyboard/mouse input).
      // Do NOT skip for 'away' state — that just means active-win failed to detect
      // the foreground window, which happens on many Windows configs. We still want
      // to capture the screen so monitoring data is complete.
      if (activity.isIdle) {
        debugLog('[Screenshot] System is idle, skipping screenshot');
        return;
      }

      const now = new Date();
      const filename = `screenshot_${now.getTime()}.jpg`;
      const filePath = path.join(screenshotDir, filename);

      // Capture screen
      const imgBuffer = await screenshot({ format: 'jpeg' });

      // Compress and resize using Electron's nativeImage to occupy less storage
      const image = nativeImage.createFromBuffer(imgBuffer);
      const imageSize = image.getSize();
      if (image.isEmpty() || imageSize.width === 0 || imageSize.height === 0) {
        debugLog(`[Screenshot] Capture returned an empty image (${imageSize.width}x${imageSize.height})`);
        return;
      }
      debugLog(`[Screenshot] Captured display image ${imageSize.width}x${imageSize.height} (active app: ${activity.activeWindow.appName})`);
      let finalBuffer: Buffer;

      if (shouldBlurScreenshots) {
        // Blur/pixelate: resize down to 40px and then scale back to 800px
        const tiny = image.resize({ width: 40 });
        const scaledBack = tiny.resize({ width: 800 });
        finalBuffer = scaledBack.toJPEG(40);
      } else {
        const resized = image.resize({ width: 1000 });
        finalBuffer = resized.toJPEG(50); // 50% JPEG quality
      }

      // Save compressed version to local disk to save space
      fs.writeFileSync(filePath, finalBuffer);

      // Convert to base64 string
      const base64Data = finalBuffer.toString('base64');
      const screenshotData = `data:image/jpeg;base64,${base64Data}`;

      // Validate the data isn't too large (PostgreSQL text limit is very high, but browsers have limits)
      if (screenshotData.length > 5242880) { // 5MB limit for safety
        console.warn(`[Screenshot] Screenshot data too large (${Math.round(screenshotData.length / 1024 / 1024)} MB), skipping this screenshot`);
        return;
      }

      pendingScreenshots.push({
        employee_id: currentEmployeeId,
        app_name: activity.activeWindow.appName,
        captured_at: now.toISOString(),
        screenshot_data: screenshotData,
        id: `${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
      });

      debugLog(`[Screenshot] Screen captured & compressed (${Math.round(finalBuffer.length / 1024)} KB, base64 size: ${Math.round(screenshotData.length / 1024)} KB): ${filename} (app: ${activity.activeWindow.appName})`);
      debugLog(`[Screenshot] Total pending screenshots: ${pendingScreenshots.length}`);

      // Keep disk clean by pruning screenshots older than 2 days
      pruneOldScreenshots(screenshotDir);
    } catch (error) {
      debugLog('[Screenshot] Capture failed: ' + String(error));
    }
  }, INTERVAL_MS);

  captureInitialScreenshot = async () => {
    if (isInitialCaptureInProgress) return;
    isInitialCaptureInProgress = true;
    try {
      const employeeId = currentEmployeeId;
      if (!employeeId) {
        debugLog('[Screenshot] Initial capture skipped: no employee logged in');
        return;
      }

      const activity = getCurrentActivity();
      // Same rule: only skip on genuine hardware idle, not on 'away' state.
      if (activity.isIdle) return;

      const now = new Date();
      const filename = `screenshot_init_${now.getTime()}.jpg`;
      const filePath = path.join(screenshotDir, filename);

      const imgBuffer = await screenshot({ format: 'jpeg' });
      const image = nativeImage.createFromBuffer(imgBuffer);
      let finalBuffer: Buffer;

      if (shouldBlurScreenshots) {
        const tiny = image.resize({ width: 40 });
        const scaledBack = tiny.resize({ width: 800 });
        finalBuffer = scaledBack.toJPEG(40);
      } else {
        const resized = image.resize({ width: 1000 });
        finalBuffer = resized.toJPEG(50);
      }

      fs.writeFileSync(filePath, finalBuffer);

      const base64Data = finalBuffer.toString('base64');
      const screenshotData = `data:image/jpeg;base64,${base64Data}`;

      // Validate the data isn't too large
      if (screenshotData.length > 5242880) {
        console.warn(`[Screenshot] Initial screenshot data too large (${Math.round(screenshotData.length / 1024 / 1024)} MB), skipping`);
        return;
      }

      pendingScreenshots.push({
        employee_id: employeeId,
        app_name: activity.activeWindow.appName,
        captured_at: now.toISOString(),
        screenshot_data: screenshotData,
        id: `${now.getTime()}_init_${Math.random().toString(36).substr(2, 9)}`,
      });
      debugLog(`[Screenshot] Initial validation screen captured & compressed (${Math.round(finalBuffer.length / 1024)} KB, base64 size: ${Math.round(screenshotData.length / 1024)} KB): ${filename}`);
    } catch (error) {
      debugLog('[Screenshot] Initial capture failed: ' + String(error));
    } finally {
      isInitialCaptureInProgress = false;
    }
  };

  // Capture after startup when a session is restored, or shortly after a fresh login.
  scheduleInitialScreenshot(5000);

  debugLog(`[Screenshot] Service started with interval: ${currentIntervalMinutes}m`);

  // Cleanup old synced screenshots every 24 hours
  setInterval(() => {
    cleanupSyncedScreenshots();
  }, 24 * 60 * 60 * 1000);
}

export function stopScreenshotService() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
  if (initialCaptureTimer) clearTimeout(initialCaptureTimer);
  initialCaptureTimer = null;
  captureInitialScreenshot = null;
  debugLog('[Screenshot] Service stopped');
}

export function getRecentScreenshots() {
  debugLog(`[Screenshot] getRecentScreenshots called - returning ${pendingScreenshots.length} queued screenshots`);
  if (pendingScreenshots.length > 0) {
    debugLog(`[Screenshot] Screenshot details: ` + JSON.stringify(pendingScreenshots.map(s => ({ app: s.app_name, time: s.captured_at, dataSize: Math.round(s.screenshot_data.length / 1024) + 'KB' }))));
  }
  return [...pendingScreenshots];
}

export function acknowledgeScreenshots(ids: string[]) {
  const acknowledged = new Set(ids);
  const initialCount = pendingScreenshots.length;
  pendingScreenshots = pendingScreenshots.filter(screenshot => !acknowledged.has(screenshot.id));
  debugLog(`[Screenshot] Acknowledged ${initialCount - pendingScreenshots.length} uploaded screenshots; ${pendingScreenshots.length} remain queued`);
}

function pruneOldScreenshots(dir: string) {
  try {
    const files = fs.readdirSync(dir);
    const now = Date.now();
    const maxAgeMs = 2 * 24 * 60 * 60 * 1000; // 2 days
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    debugLog('[Screenshot] Error pruning screenshots: ' + String(err));
  }
}

export function cleanupSyncedScreenshots() {
  // Remove screenshots older than 2 days from memory
  const now = Date.now();
  const maxAgeMs = 2 * 24 * 60 * 60 * 1000; // 2 days
  const before = pendingScreenshots.length;
  pendingScreenshots = pendingScreenshots.filter(s => {
    const capturedTime = new Date(s.captured_at).getTime();
    return now - capturedTime < maxAgeMs;
  });
  if (pendingScreenshots.length < before) {
    debugLog(`[Screenshot] Cleaned up ${before - pendingScreenshots.length} old screenshots from memory`);
  }
}
