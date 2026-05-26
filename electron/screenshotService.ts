import { app, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';
import screenshot from 'screenshot-desktop';
import { getCurrentActivity } from './activityMonitor.js';

let screenshotInterval: NodeJS.Timeout | null = null;
let pendingScreenshots: Array<{ app_name: string; captured_at: string; screenshot_data: string }> = [];
let currentIntervalMinutes = 3; // Default 3 minutes from settings image

let shouldBlurScreenshots = false;

export function updateScreenshotSettings(intervalMinutes: number, blur?: boolean) {
  if (blur !== undefined) {
    shouldBlurScreenshots = !!blur;
  }
  const newInterval = Math.max(1, intervalMinutes);
  console.log(`[Screenshot] Settings updated: interval=${newInterval}m, blur=${shouldBlurScreenshots}`);

  if (currentIntervalMinutes !== newInterval) {
    currentIntervalMinutes = newInterval;
    if (screenshotInterval) {
      stopScreenshotService();
      startScreenshotService();
    }
  }
}

export function startScreenshotService() {
  if (screenshotInterval) return;

  const screenshotDir = path.join(app.getPath('userData'), 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const INTERVAL_MS = currentIntervalMinutes * 60 * 1000;

  screenshotInterval = setInterval(async () => {
    try {
      const activity = getCurrentActivity();
      if (activity.isIdle || activity.state === 'away') {
        console.log('[Screenshot] System is idle/away, skipping screenshot');
        return;
      }

      const now = new Date();
      const filename = `screenshot_${now.getTime()}.jpg`;
      const filePath = path.join(screenshotDir, filename);

      // Capture screen
      const imgBuffer = await screenshot({ format: 'jpeg' });

      // Compress and resize using Electron's nativeImage to occupy less storage
      const image = nativeImage.createFromBuffer(imgBuffer);
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

      pendingScreenshots.push({
        app_name: activity.activeWindow.appName,
        captured_at: now.toISOString(),
        screenshot_data: `data:image/jpeg;base64,${base64Data}`,
      });

      console.log(`[Screenshot] Screen captured & compressed (${Math.round(finalBuffer.length / 1024)} KB): ${filename} (app: ${activity.activeWindow.appName})`);

      // Keep disk clean by pruning screenshots older than 2 days
      pruneOldScreenshots(screenshotDir);
    } catch (error) {
      console.error('[Screenshot] Capture failed:', error);
    }
  }, INTERVAL_MS);

  // Trigger one screenshot shortly after startup (e.g. 5 seconds) to verify it works
  setTimeout(async () => {
    try {
      const activity = getCurrentActivity();
      if (activity.isIdle || activity.state === 'away') return;

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
      pendingScreenshots.push({
        app_name: activity.activeWindow.appName,
        captured_at: now.toISOString(),
        screenshot_data: `data:image/jpeg;base64,${base64Data}`,
      });
      console.log(`[Screenshot] Initial validation screen captured & compressed (${Math.round(finalBuffer.length / 1024)} KB): ${filename}`);
    } catch (error) {
      console.error('[Screenshot] Initial capture failed:', error);
    }
  }, 5000);

  console.log(`[Screenshot] Service started with interval: ${currentIntervalMinutes}m`);
}

export function stopScreenshotService() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
  console.log('[Screenshot] Service stopped');
}

export function getRecentScreenshots() {
  const copy = [...pendingScreenshots];
  pendingScreenshots = []; // Clear queue on retrieval
  return copy;
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
    console.error('[Screenshot] Error pruning screenshots:', err);
  }
}
