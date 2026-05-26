import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const CACHE_DIR = path.join(app.getPath('userData'), 'cache');
const CACHE_INDEX = path.join(CACHE_DIR, 'index.json');

// Initialize cache directory
function initializeCache() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
}

let cacheIndex: Map<string, CacheEntry> = new Map();

export function setupOfflineCache() {
  initializeCache();
  loadCacheIndex();

  // Auto-save cache index every 30 seconds
  setInterval(() => {
    saveCacheIndex();
  }, 30000);
}

function loadCacheIndex() {
  try {
    if (fs.existsSync(CACHE_INDEX)) {
      const data = fs.readFileSync(CACHE_INDEX, 'utf-8');
      const entries = JSON.parse(data) as CacheEntry[];
      cacheIndex.clear();
      entries.forEach(entry => {
        // Check if cache is still valid
        if (!entry.ttl || Date.now() - entry.timestamp < entry.ttl) {
          cacheIndex.set(entry.key, entry);
        }
      });
    }
  } catch (err) {
    console.error('Failed to load cache index:', err);
  }
}

function saveCacheIndex() {
  try {
    const entries = Array.from(cacheIndex.values());
    fs.writeFileSync(CACHE_INDEX, JSON.stringify(entries, null, 2));
  } catch (err) {
    console.error('Failed to save cache index:', err);
  }
}

export function setCache(key: string, value: any, ttl?: number) {
  const entry: CacheEntry = {
    key,
    value,
    timestamp: Date.now(),
    ttl,
  };
  cacheIndex.set(key, entry);
  saveCacheIndex();
  return true;
}

export function getCache(key: string) {
  const entry = cacheIndex.get(key);

  if (!entry) {
    return null;
  }

  // Check if cache has expired
  if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
    cacheIndex.delete(key);
    saveCacheIndex();
    return null;
  }

  return entry.value;
}

export function clearCache(key?: string) {
  if (key) {
    cacheIndex.delete(key);
  } else {
    cacheIndex.clear();
  }
  saveCacheIndex();
  return true;
}

export function getCacheSize() {
  return cacheIndex.size;
}

// Cache specific data types
export function cacheEmployeeSession(employeeId: string, sessionData: any) {
  return setCache(`session_${employeeId}`, sessionData, 24 * 60 * 60 * 1000); // 24 hour TTL
}

export function getEmployeeSession(employeeId: string) {
  return getCache(`session_${employeeId}`);
}

export function cachePlanData(employeeId: string, planData: string) {
  return setCache(`plan_${employeeId}`, planData, 7 * 24 * 60 * 60 * 1000); // 7 day TTL
}

export function getPlanData(employeeId: string) {
  return getCache(`plan_${employeeId}`);
}
