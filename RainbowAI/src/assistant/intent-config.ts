/**
 * Intent Detection Configuration Store
 * Manages configurable context window sizes per tier
 * Supports per-intent confidence thresholds (Layer 1)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadConfigFromDB } from '../lib/config-db.js';

// Use process.cwd() (= RainbowAI/) — __dirname is dist/ in esbuild bundle
const DATA_DIR = join(process.cwd(), 'src', 'assistant', 'data');
const TIERS_FILE = join(DATA_DIR, 'intent-tiers.json');

// ─── Per-Intent Threshold Maps (Layer 1 + Tier Overrides) ───────────────────
const intentMinConfidenceMap = new Map<string, number>();
const intentT2FuzzyThresholdMap = new Map<string, number>();
const intentT3SemanticThresholdMap = new Map<string, number>();

export interface IntentDetectionConfig {
  tiers: {
    tier1_emergency: {
      enabled: boolean;
      contextMessages: number;  // Always 0 for regex
    };
    tier2_fuzzy: {
      enabled: boolean;
      contextMessages: number;  // 0-10
      threshold: number;
    };
    tier3_semantic: {
      enabled: boolean;
      contextMessages: number;  // 0-10
      threshold: number;
    };
    tier4_llm: {
      enabled: boolean;
      contextMessages: number;  // 1-20
    };
  };
  conversationState: {
    trackLastIntent: boolean;
    trackSlots: boolean;
    maxHistoryMessages: number;
    contextTTL: number;  // minutes
  };
}

let currentConfig: IntentDetectionConfig = getDefaultConfig();

export function getDefaultConfig(): IntentDetectionConfig {
  return {
    tiers: {
      tier1_emergency: {
        enabled: true,
        contextMessages: 0  // Always 0 for regex
      },
      tier2_fuzzy: {
        enabled: true,
        contextMessages: 3,
        threshold: 0.80
      },
      tier3_semantic: {
        enabled: true,
        contextMessages: 5,
        threshold: 0.67
      },
      tier4_llm: {
        enabled: true,
        contextMessages: 5
      }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 20,
      contextTTL: 30  // 30 minutes
    }
  };
}

export function getIntentConfig(): IntentDetectionConfig {
  return currentConfig;
}

export function updateIntentConfig(config: Partial<IntentDetectionConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
    tiers: {
      ...currentConfig.tiers,
      ...(config.tiers || {})
    },
    conversationState: {
      ...currentConfig.conversationState,
      ...(config.conversationState || {})
    }
  };

  console.log('[IntentConfig] Configuration updated:', currentConfig);
}

/**
 * Load tier configuration from intent-tiers.json if it exists.
 * Called at module load so server restarts preserve tier toggles (e.g. AI Fallback off).
 */
export function loadIntentTiersFromFile(): void {
  if (!existsSync(TIERS_FILE)) return;
  try {
    const raw = readFileSync(TIERS_FILE, 'utf-8');
    const data = JSON.parse(raw) as { tiers?: Partial<IntentDetectionConfig['tiers']> };
    if (data?.tiers && typeof data.tiers === 'object') {
      updateIntentConfig({ tiers: { ...currentConfig.tiers, ...data.tiers } });
      console.log('[IntentConfig] Loaded tiers from', TIERS_FILE);
    }
  } catch (err) {
    console.warn('[IntentConfig] Could not load intent-tiers.json:', (err as Error).message);
  }
}

/** Path to persisted tiers file for use by routes. */
export function getIntentTiersFilePath(): string {
  return TIERS_FILE;
}

export function loadIntentConfigFromDB(dbConfig: any): void {
  if (!dbConfig) {
    console.log('[IntentConfig] No DB config found, using defaults');
    return;
  }

  currentConfig = {
    tiers: {
      tier1_emergency: {
        enabled: dbConfig.tier1Enabled ?? true,
        contextMessages: dbConfig.tier1ContextMessages ?? 0
      },
      tier2_fuzzy: {
        enabled: dbConfig.tier2Enabled ?? true,
        contextMessages: dbConfig.tier2ContextMessages ?? 3,
        threshold: dbConfig.tier2Threshold ?? 0.80
      },
      tier3_semantic: {
        enabled: dbConfig.tier3Enabled ?? true,
        contextMessages: dbConfig.tier3ContextMessages ?? 5,
        threshold: dbConfig.tier3Threshold ?? 0.67
      },
      tier4_llm: {
        enabled: dbConfig.tier4Enabled ?? true,
        contextMessages: dbConfig.tier4ContextMessages ?? 5
      }
    },
    conversationState: {
      trackLastIntent: dbConfig.trackLastIntent ?? true,
      trackSlots: dbConfig.trackSlots ?? true,
      maxHistoryMessages: dbConfig.maxHistoryMessages ?? 20,
      contextTTL: dbConfig.contextTTL ?? 30
    }
  };

  console.log('[IntentConfig] Loaded from database:', currentConfig);
}

// ─── Layer 1: Per-Intent Threshold Support ─────────────────────────────────

/**
 * Build per-intent threshold map from intents.json data.
 * Call this during initialization to populate the threshold map.
 */
export function buildIntentThresholdMap(intentsData: any): void {
  intentMinConfidenceMap.clear();
  intentT2FuzzyThresholdMap.clear();
  intentT3SemanticThresholdMap.clear();

  if (!intentsData?.categories) {
    console.warn('[IntentConfig] No categories found in intents data');
    return;
  }

  for (const phase of intentsData.categories) {
    if (!phase.intents) continue;
    for (const intent of phase.intents) {
      if (!intent.category) continue;

      // Store Layer 1 min_confidence
      if (typeof intent.min_confidence === 'number') {
        intentMinConfidenceMap.set(intent.category, intent.min_confidence);
      }

      // Store tier-specific overrides (if present)
      if (typeof intent.t2_fuzzy_threshold === 'number') {
        intentT2FuzzyThresholdMap.set(intent.category, intent.t2_fuzzy_threshold);
      }
      if (typeof intent.t3_semantic_threshold === 'number') {
        intentT3SemanticThresholdMap.set(intent.category, intent.t3_semantic_threshold);
      }
    }
  }

  console.log(
    `[IntentConfig] Built threshold maps: ${intentMinConfidenceMap.size} intents, ` +
    `${intentT2FuzzyThresholdMap.size} T2 overrides, ${intentT3SemanticThresholdMap.size} T3 overrides`
  );
}

/**
 * Check if a classification passes BOTH global threshold AND per-intent threshold.
 *
 * @param intentName - The classified intent name
 * @param score - The confidence score from fuzzy/semantic matcher
 * @param globalThreshold - The tier's global threshold (e.g., 0.80 for fuzzy)
 * @returns true if score passes both thresholds, false otherwise
 */
export function checkIntentThreshold(
  intentName: string,
  score: number,
  globalThreshold: number
): boolean {
  const minConfidence = intentMinConfidenceMap.get(intentName) ?? globalThreshold;
  const passes = score >= Math.max(minConfidence, globalThreshold);

  if (!passes && score >= globalThreshold) {
    console.log(
      `[IntentConfig] 🔸 "${intentName}" passed global (${globalThreshold.toFixed(2)}) ` +
      `but failed per-intent (${minConfidence.toFixed(2)}) with score ${score.toFixed(2)}`
    );
  }

  return passes;
}

/**
 * Check if a classification passes tier-specific threshold with per-intent overrides.
 * Checks tier-specific override first, then falls back to checkIntentThreshold().
 *
 * @param intentName - The classified intent name
 * @param score - The confidence score from fuzzy/semantic matcher
 * @param globalThreshold - The tier's global threshold (e.g., 0.80 for T2 fuzzy)
 * @param tier - The tier being checked ('t2' or 't3')
 * @returns true if score passes all thresholds, false otherwise
 */
export function checkTierThreshold(
  intentName: string,
  score: number,
  globalThreshold: number,
  tier: 't2' | 't3'
): boolean {
  // Check for tier-specific override first
  const tierMap = tier === 't2' ? intentT2FuzzyThresholdMap : intentT3SemanticThresholdMap;
  const tierOverride = tierMap.get(intentName);

  if (tierOverride !== undefined) {
    // Tier-specific override exists - use it instead of global threshold
    const minConfidence = intentMinConfidenceMap.get(intentName) ?? globalThreshold;
    const effectiveThreshold = Math.max(tierOverride, minConfidence);
    const passes = score >= effectiveThreshold;

    if (!passes && score >= globalThreshold) {
      console.log(
        `[IntentConfig] 🔸 "${intentName}" passed global ${tier.toUpperCase()} (${globalThreshold.toFixed(2)}) ` +
        `but failed per-intent ${tier.toUpperCase()} override (${tierOverride.toFixed(2)}) with score ${score.toFixed(2)}`
      );
    } else if (passes && tierOverride !== globalThreshold) {
      console.log(
        `[IntentConfig] ✅ "${intentName}" passed with ${tier.toUpperCase()} override ` +
        `(${tierOverride.toFixed(2)} vs global ${globalThreshold.toFixed(2)}) with score ${score.toFixed(2)}`
      );
    }

    return passes;
  }

  // No tier-specific override - use standard check
  return checkIntentThreshold(intentName, score, globalThreshold);
}

/** Try loading intent tiers from DB (called at startup). Falls back to file. */
export async function loadIntentTiersFromDB(): Promise<void> {
  try {
    const dbData = await loadConfigFromDB('intent-tiers.json');
    if (dbData && typeof dbData === 'object') {
      const tiers = (dbData as { tiers?: Partial<IntentDetectionConfig['tiers']> }).tiers;
      if (tiers) {
        updateIntentConfig({ tiers: { ...currentConfig.tiers, ...tiers } });
        console.log('[IntentConfig] Loaded tiers from DB');
        return;
      }
    }
  } catch (err: any) {
    console.warn('[IntentConfig] DB load failed:', err.message);
  }
  // Fall back to file
  loadIntentTiersFromFile();
}

// Load persisted tier state on module init (e.g. AI Fallback disabled)
loadIntentTiersFromFile();
