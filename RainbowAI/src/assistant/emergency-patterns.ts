import { readFile } from 'fs/promises';
import { join } from 'path';

// ─── Emergency patterns (regex, critical patterns for immediate escalation) ─────────

type EmergencyType = 'theft_report' | 'card_locked' | 'complaint';

interface LoadedEmergencyRule {
  re: RegExp;
  emergencyType: EmergencyType;
  isFire: boolean;
  /** When set, overrides emergencyType with a custom intent (e.g., prompt injection → greeting) */
  intentOverride?: string;
}

/** Loaded from regex-patterns.json when present; otherwise use built-in defaults. */
let emergencyRules: LoadedEmergencyRule[] = [];

/** Built-in fallback when regex-patterns.json is missing or empty. */
const BUILTIN_EMERGENCY_PATTERNS: RegExp[] = [
  /\b(fire|kebakaran|着火|火灾)\b/i,
  /\b(ambulan[cs]e|hospital|emergency|kecemasan|darurat|急救|紧急)\b/i,
  /\b(stole|stol[ea]n|theft|rob(?:bed|bery)|dicuri|dirompak|kecurian|被偷|被抢|失窃|missing\s+from\s+(the\s+)?safe|(the\s+)?safe\s+.*(missing|stolen))\b/i,
  /\b(assault|attack|violen[ct]|fight|serang|pukul|袭击|打架)\b/i,
  /\b(police|polis|cops?|警察|报警)\b/i,
  /\b(locked.*card|card.*locked|terkunci|锁在里面|出不去)\b/i,
];
const BUILTIN_THEFT_INDEX = 2;
const BUILTIN_CARD_LOCKED_INDEX = 5;

/**
 * Benign overrides for fire: if the message matches a fire emergency pattern BUT also
 * matches one of these, do NOT treat as emergency (e.g. "fire for my cake").
 */
const FIRE_BENIGN_OVERRIDES: RegExp[] = [
  /\bfire\s+for\s+(my\s+)?(cake|candle|birthday)/i,
  /\bneed\s+fire\s+for\b/i,
  /\b(fire\s+for|for\s+fire)\s+(the\s+)?(cake|candle)/i,
  /\bbirthday\s+(cake\s+)?(fire|candle)/i,
  /\b(candle|lighter|match)\s+.*\s+fire\b/i,
];

function parseRegexPattern(patternStr: string): RegExp | null {
  if (!patternStr || typeof patternStr !== 'string') return null;
  try {
    if (patternStr.startsWith('/')) {
      const parts = patternStr.match(/^\/(.+)\/([gimuy]*)$/);
      if (!parts) return null;
      return new RegExp(parts[1], parts[2] || 'i');
    }
    return new RegExp(patternStr, 'i');
  } catch {
    return null;
  }
}

export async function loadEmergencyPatternsFromFile(): Promise<void> {
  const dataPath = join(process.cwd(), 'src', 'assistant', 'data', 'regex-patterns.json');
  try {
    const raw = await readFile(dataPath, 'utf-8');
    const items = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) return;

    const rules: LoadedEmergencyRule[] = [];
    for (const item of items) {
      const patternStr = item.pattern;
      if (!patternStr) continue;
      const re = parseRegexPattern(patternStr);
      if (!re) continue;

      const emergencyType: EmergencyType = (item.emergencyType === 'theft_report' || item.emergencyType === 'card_locked')
        ? item.emergencyType
        : (item.emergencyType === 'theft' ? 'theft_report' : 'complaint');
      const desc = (item.description || '').toLowerCase();
      const isFire = desc.includes('fire emergency');
      // Support custom intent override (e.g., prompt injection → greeting deflection)
      const intentOverride = item.intent && typeof item.intent === 'string' ? item.intent : undefined;

      rules.push({ re, emergencyType, isFire, intentOverride });
    }
    if (rules.length > 0) {
      emergencyRules = rules;
      console.log('[Intents] Loaded', emergencyRules.length, 'emergency patterns from regex-patterns.json (by language)');
    }
  } catch (err) {
    // File missing or invalid: keep built-in behaviour
  }
}

export function isEmergency(text: string): boolean {
  return getEmergencyIntent(text) !== null;
}

/**
 * Which intent to use when an emergency pattern matches.
 * Theft and card_locked have dedicated workflows; others escalate via complaint.
 */
export function getEmergencyIntent(text: string): string | null {
  if (emergencyRules.length > 0) {
    for (const { re, emergencyType, isFire, intentOverride } of emergencyRules) {
      if (!re.test(text)) continue;
      if (isFire && FIRE_BENIGN_OVERRIDES.some(b => b.test(text))) continue;
      // Skip rules with intentOverride — they are handled by getRegexDeflection() instead
      if (intentOverride) continue;
      return emergencyType;
    }
    return null;
  }

  for (let i = 0; i < BUILTIN_EMERGENCY_PATTERNS.length; i++) {
    if (!BUILTIN_EMERGENCY_PATTERNS[i].test(text)) continue;
    if (i === 0 && FIRE_BENIGN_OVERRIDES.some(b => b.test(text))) continue;
    if (i === BUILTIN_THEFT_INDEX) return 'theft_report';
    if (i === BUILTIN_CARD_LOCKED_INDEX) return 'card_locked';
    return 'complaint';
  }
  return null;
}

/**
 * Check for non-emergency regex deflections (e.g., prompt injection → greeting).
 * These patterns have an intentOverride field and should NOT trigger emergency escalation.
 */
export function getRegexDeflection(text: string): string | null {
  for (const { re, isFire, intentOverride } of emergencyRules) {
    if (!intentOverride) continue;
    if (!re.test(text)) continue;
    if (isFire && FIRE_BENIGN_OVERRIDES.some(b => b.test(text))) continue;
    return intentOverride;
  }
  return null;
}
