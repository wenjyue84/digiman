/**
 * Unit Cache (US-010, US-011)
 *
 * Fetches unit list from the main dashboard API (port 5000),
 * caches with a 5-minute TTL, and merges with custom user entries.
 * Gracefully handles port 5000 being unavailable.
 */

import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const CUSTOM_UNITS_FILE = join(process.cwd(), 'data', 'custom-units.json');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DASHBOARD_API = process.env.DASHBOARD_API_URL || 'http://localhost:5000';

interface UnitEntry {
  number: string;
  section?: string;
  isAvailable?: boolean;
}

interface CacheState {
  units: UnitEntry[];
  fetchedAt: number;
}

interface CustomUnitsData {
  units: string[];
}

let _cache: CacheState = { units: [], fetchedAt: 0 };

// --- Custom Units (disk-backed) ---

function loadCustomUnits(): CustomUnitsData {
  try {
    if (!existsSync(CUSTOM_UNITS_FILE)) return { units: [] };
    const raw = readFileSync(CUSTOM_UNITS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.units)) return parsed as CustomUnitsData;
    return { units: [] };
  } catch {
    return { units: [] };
  }
}

function saveCustomUnits(data: CustomUnitsData): void {
  const dir = dirname(CUSTOM_UNITS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmpPath = CUSTOM_UNITS_FILE + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmpPath, CUSTOM_UNITS_FILE);
}

export function addCustomUnit(unit: string): string[] {
  const data = loadCustomUnits();
  const trimmed = unit.trim();
  if (!trimmed) return data.units;

  // Case-insensitive dedup
  if (!data.units.some(u => u.toLowerCase() === trimmed.toLowerCase())) {
    data.units.push(trimmed);
    data.units.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    saveCustomUnits(data);
  }
  return data.units;
}

// --- API Cache ---

async function fetchUnits(): Promise<UnitEntry[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const resp = await fetch(`${DASHBOARD_API}/api/units`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`[UnitCache] Dashboard API returned ${resp.status}`);
      return [];
    }

    const data = await resp.json() as UnitEntry[];
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    // ECONNREFUSED, timeout, etc -- graceful degradation
    if (err?.name !== 'AbortError') {
      console.warn('[UnitCache] Dashboard API unavailable:', err?.code || err?.message);
    }
    return [];
  }
}

async function refreshIfStale(): Promise<void> {
  const age = Date.now() - _cache.fetchedAt;
  if (age < CACHE_TTL_MS && _cache.units.length > 0) return;

  const fresh = await fetchUnits();
  if (fresh.length > 0) {
    _cache = { units: fresh, fetchedAt: Date.now() };
  }
  // If fetch failed but we have stale cache, keep using it
}

// --- Public API ---

/** Get merged list of unit numbers + custom units. */
export async function getUnitList(): Promise<string[]> {
  await refreshIfStale();

  // Extract unit numbers from API data
  const apiUnits = _cache.units.map(c => c.number);

  // Merge with custom units
  const custom = loadCustomUnits().units;

  // Deduplicate (case-insensitive), keep original case from first occurrence
  const seen = new Map<string, string>();
  for (const u of [...apiUnits, ...custom]) {
    const key = u.toLowerCase();
    if (!seen.has(key)) seen.set(key, u);
  }

  return Array.from(seen.values()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}

// Backward-compat alias
export const getCapsuleUnits = getUnitList;

/** Force refresh the cache (called from manual trigger). */
export async function forceRefresh(): Promise<string[]> {
  const fresh = await fetchUnits();
  if (fresh.length > 0) {
    _cache = { units: fresh, fetchedAt: Date.now() };
  }
  return getUnitList();
}

/** Warm up cache on server start. */
export function initUnitCache(): void {
  // Fire and forget -- no blocking
  refreshIfStale().catch(() => {});
  console.log('[UnitCache] Initialized (5-min TTL)');
}

// Backward-compat alias
export const initCapsuleCache = initUnitCache;
