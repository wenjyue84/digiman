import type { RateLimitResult } from './types.js';
import { configStore } from './config-store.js';

interface WindowEntry {
  timestamps: number[];
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes

const windows = new Map<string, WindowEntry>();
const staffPhones = new Set<string>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function refreshStaffPhones(): void {
  staffPhones.clear();
  for (const phone of configStore.getSettings().staff.phones) {
    staffPhones.add(phone.replace(/\D/g, ''));
  }
}

export function initRateLimiter(): void {
  refreshStaffPhones();
  // Periodic cleanup of expired entries
  if (cleanupTimer) clearInterval(cleanupTimer);
  cleanupTimer = setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);
  configStore.on('reload', (domain: string) => {
    if (domain === 'settings' || domain === 'all') {
      refreshStaffPhones();
      console.log('[RateLimiter] Staff phones reloaded');
    }
  });
}

export function destroyRateLimiter(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  windows.clear();
}

export function checkRate(phone: string): RateLimitResult {
  const normalized = phone.replace(/\D/g, '');

  // Staff are exempt
  if (staffPhones.has(normalized)) {
    return { allowed: true };
  }

  const limits = configStore.getSettings().rate_limits;
  const now = Date.now();
  let entry = windows.get(normalized);
  if (!entry) {
    entry = { timestamps: [] };
    windows.set(normalized, entry);
  }

  // Remove timestamps older than 1 hour
  entry.timestamps = entry.timestamps.filter(t => now - t < HOUR_MS);

  // Check per-hour limit
  if (entry.timestamps.length >= limits.per_hour) {
    const oldest = entry.timestamps[0];
    const retryAfter = Math.ceil((oldest + HOUR_MS - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: 'hourly limit exceeded'
    };
  }

  // Check per-minute limit
  const recentMinute = entry.timestamps.filter(t => now - t < MINUTE_MS);
  if (recentMinute.length >= limits.per_minute) {
    const oldest = recentMinute[0];
    const retryAfter = Math.ceil((oldest + MINUTE_MS - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: 'per-minute limit exceeded'
    };
  }

  // Record this request
  entry.timestamps.push(now);
  return { allowed: true };
}

function cleanupExpired(): void {
  const now = Date.now();
  for (const [phone, entry] of windows.entries()) {
    entry.timestamps = entry.timestamps.filter(t => now - t < HOUR_MS);
    if (entry.timestamps.length === 0) {
      windows.delete(phone);
    }
  }
}

// For testing
export function _getWindowsSize(): number {
  return windows.size;
}
