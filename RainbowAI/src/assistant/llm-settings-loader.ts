/**
 * llm-settings-loader.ts — Shared cached loader for llm-settings.json
 *
 * Replaces 4 scattered readFileSync('llm-settings.json') calls with a single
 * cached loader that tries DB first. Cache TTL: 30s so dashboard changes
 * take effect quickly.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { loadConfigFromDB } from '../lib/config-db.js';

const LLM_SETTINGS_FILE = join(process.cwd(), 'src', 'assistant', 'data', 'llm-settings.json');
const CACHE_TTL_MS = 30_000; // 30 seconds

let cachedSettings: any = null;
let cacheTimestamp = 0;

/**
 * Get LLM settings (cached, 30s TTL).
 * Reads from memory cache first, then falls back to disk.
 * For DB-first loading, call reloadLLMSettingsFromDB() at startup.
 */
export function getLLMSettings(): any {
  const now = Date.now();
  if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedSettings;
  }
  try {
    cachedSettings = JSON.parse(readFileSync(LLM_SETTINGS_FILE, 'utf-8'));
    cacheTimestamp = now;
  } catch {
    if (!cachedSettings) cachedSettings = {};
  }
  return cachedSettings;
}

/**
 * Reload LLM settings from DB (async, called at startup).
 * Falls back to local file if DB is unavailable.
 */
export async function reloadLLMSettingsFromDB(): Promise<void> {
  try {
    const dbData = await loadConfigFromDB('llm-settings.json');
    if (dbData !== null) {
      cachedSettings = dbData;
      cacheTimestamp = Date.now();
      console.log('[LLMSettings] Loaded from DB');
      return;
    }
  } catch (err: any) {
    console.warn('[LLMSettings] DB load failed:', err.message);
  }
  // Fall back to file
  getLLMSettings();
  console.log('[LLMSettings] Loaded from file');
}

/** Force-clear cache (e.g. after admin saves new settings). */
export function invalidateLLMSettingsCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}
