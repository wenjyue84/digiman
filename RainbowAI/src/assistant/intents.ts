import type { IntentResult, ChatMessage, ConversationState } from './types.js';
import { classifyIntent as llmClassify } from './ai-client.js';
import { FuzzyIntentMatcher, type KeywordIntent } from './fuzzy-matcher.js';
import { languageRouter, type SupportedLanguage } from './language-router.js';
import { getSemanticMatcher, type IntentExamples } from './semantic-matcher.js';
import { getIntentConfig, buildIntentThresholdMap, checkTierThreshold } from './intent-config.js';
import intentKeywordsData from './data/intent-keywords.json' with { type: 'json' };
import intentExamplesData from './data/intent-examples.json' with { type: 'json' };
import intentsJsonData from './data/intents.json' with { type: 'json' };
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Emergency patterns (regex, critical patterns for immediate escalation) ─────────

type EmergencyType = 'theft' | 'card_locked' | 'complaint';

interface LoadedEmergencyRule {
  re: RegExp;
  emergencyType: EmergencyType;
  isFire: boolean;
}

/** Loaded from regex-patterns.json when present; otherwise use built-in defaults. */
let emergencyRules: LoadedEmergencyRule[] = [];

/** Built-in fallback when regex-patterns.json is missing or empty. */
const BUILTIN_EMERGENCY_PATTERNS: RegExp[] = [
  /\b(fire|kebakaran|着火|火灾)\b/i,
  /\b(ambulan[cs]e|hospital|emergency|kecemasan|darurat|急救|紧急)\b/i,
  /\b(stol[ea]n|theft|rob(?:bed|bery)|dicuri|dirompak|kecurian|被偷|被抢|失窃|missing\s+from\s+(the\s+)?safe|(the\s+)?safe\s+.*(missing|stolen))\b/i,
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

async function loadEmergencyPatternsFromFile(): Promise<void> {
  const dataPath = join(__dirname, 'data', 'regex-patterns.json');
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

      const emergencyType: EmergencyType = (item.emergencyType === 'theft' || item.emergencyType === 'card_locked')
        ? item.emergencyType
        : 'complaint';
      const desc = (item.description || '').toLowerCase();
      const isFire = desc.includes('fire emergency');

      rules.push({ re, emergencyType, isFire });
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
export function getEmergencyIntent(text: string): 'theft' | 'card_locked' | 'complaint' | null {
  if (emergencyRules.length > 0) {
    for (const { re, emergencyType, isFire } of emergencyRules) {
      if (!re.test(text)) continue;
      if (isFire && FIRE_BENIGN_OVERRIDES.some(b => b.test(text))) continue;
      return emergencyType;
    }
    return null;
  }

  for (let i = 0; i < BUILTIN_EMERGENCY_PATTERNS.length; i++) {
    if (!BUILTIN_EMERGENCY_PATTERNS[i].test(text)) continue;
    if (i === 0 && FIRE_BENIGN_OVERRIDES.some(b => b.test(text))) continue;
    if (i === BUILTIN_THEFT_INDEX) return 'theft';
    if (i === BUILTIN_CARD_LOCKED_INDEX) return 'card_locked';
    return 'complaint';
  }
  return null;
}

// ─── Fuzzy Keyword Matcher (NEW! - Phase 1 Enhancement) ────────────

let fuzzyMatcher: FuzzyIntentMatcher | null = null;

function initFuzzyMatcher(): void {
  // Flatten intent keywords from JSON into format fuzzy matcher expects
  const keywordIntents: KeywordIntent[] = [];

  for (const intent of intentKeywordsData.intents) {
    // Add keywords for each language
    for (const [lang, keywords] of Object.entries(intent.keywords)) {
      keywordIntents.push({
        intent: intent.intent,
        keywords: keywords as string[],
        language: lang as 'en' | 'ms' | 'zh'
      });
    }
  }

  fuzzyMatcher = new FuzzyIntentMatcher(keywordIntents);
  console.log('[Intents] Fuzzy matcher initialized with', keywordIntents.length, 'keyword groups');
}

// ─── Init (enhanced with fuzzy + semantic matching) ────────────────

export async function initIntents(): Promise<void> {
  await loadEmergencyPatternsFromFile();
  initFuzzyMatcher();

  // Build per-intent threshold map (Layer 1)
  buildIntentThresholdMap(intentsJsonData);

  // Initialize semantic matcher (Phase 3 - async, takes 5-10 seconds)
  const semanticMatcher = getSemanticMatcher();
  const intentExamples = intentExamplesData.intents as IntentExamples[];

  // Initialize in background (don't block startup)
  semanticMatcher.initialize(intentExamples).then(() => {
    const stats = semanticMatcher.getStats();
    console.log(
      `[Intents] Semantic matcher ready: ${stats.totalIntents} intents, ` +
      `${stats.totalExamples} examples`
    );
  }).catch(error => {
    console.error('[Intents] Semantic matcher initialization failed:', error);
  });

  console.log('[Intents] Hybrid mode: Emergency → Fuzzy → Semantic → LLM');
}

// ─── Main Classification Function (Enhanced with 4-tier system + Config) ─────

/**
 * Classify intent using configurable 4-tier system with context awareness:
 * 1. Emergency patterns (regex) - highest priority
 * 2. Fuzzy keyword matching with context - fast path (<5ms)
 * 3. Semantic similarity with context - medium path (50-200ms)
 * 4. LLM classification with configurable context - fallback for complex queries
 *
 * Uses admin-configurable context window sizes per tier
 *
 * @param text Current user message
 * @param history Full conversation history (will be sliced based on config)
 * @param lastIntent Previous detected intent (for context)
 * @returns Intent result with confidence and source
 */
export async function classifyMessageWithContext(
  text: string,
  history: ChatMessage[] = [],
  lastIntent: string | null = null
): Promise<IntentResult> {
  const config = getIntentConfig();

  // TIER 0: Language Detection
  const detectedLang = languageRouter.detectLanguage(text);
  const langName = languageRouter.getLanguageName(detectedLang);

  console.log(`[Intent] 🌍 Language: ${langName} (${detectedLang})`);

  // TIER 1: Emergency check (always enabled, always single message)
  if (config.tiers.tier1_emergency.enabled) {
    const emergencyIntent = getEmergencyIntent(text);
    if (emergencyIntent !== null) {
      console.log(`[Intent] 🚨 EMERGENCY detected (regex) → ${emergencyIntent}`);
      return {
        category: emergencyIntent,
        confidence: 1.0,
        entities: { emergency: 'true' },
        source: 'regex',
        detectedLanguage: detectedLang
      };
    }
  }

  // TIER 2: Fuzzy keyword matching WITH CONTEXT
  if (config.tiers.tier2_fuzzy.enabled && fuzzyMatcher) {
    const contextSize = config.tiers.tier2_fuzzy.contextMessages;
    const context = history.slice(-contextSize);
    const languageFilter = detectedLang !== 'unknown' ? detectedLang : undefined;

    const fuzzyResult = fuzzyMatcher.matchWithContext(
      text,
      context,
      lastIntent,
      languageFilter
    );

    if (fuzzyResult && checkTierThreshold(
      fuzzyResult.intent,
      fuzzyResult.score,
      config.tiers.tier2_fuzzy.threshold,
      't2'
    )) {
      console.log(
        `[Intent] ⚡ FUZZY match: ${fuzzyResult.intent} ` +
        `(${(fuzzyResult.score * 100).toFixed(0)}% - keyword: "${fuzzyResult.matchedKeyword}")` +
        (fuzzyResult.contextBoost ? ' [CONTEXT BOOST]' : '')
      );

      return {
        category: fuzzyResult.intent as any,
        confidence: fuzzyResult.score,
        entities: {},
        source: 'fuzzy',
        matchedKeyword: fuzzyResult.matchedKeyword,
        detectedLanguage: detectedLang
      };
    }

    // Log if close but not confident enough
    if (fuzzyResult && fuzzyResult.score > 0.60 && fuzzyResult.score < config.tiers.tier2_fuzzy.threshold) {
      console.log(
        `[Intent] 🔸 Fuzzy match below threshold: ${fuzzyResult.intent} ` +
        `(${(fuzzyResult.score * 100).toFixed(0)}%), trying semantic...`
      );
    }
  }

  // TIER 3: Semantic similarity matching WITH CONTEXT
  if (config.tiers.tier3_semantic.enabled) {
    const semanticMatcher = getSemanticMatcher();
    if (semanticMatcher.isReady()) {
      const semanticResult = await semanticMatcher.match(text, config.tiers.tier3_semantic.threshold);

      if (semanticResult && checkTierThreshold(
        semanticResult.intent,
        semanticResult.score,
        config.tiers.tier3_semantic.threshold,
        't3'
      )) {
        console.log(
          `[Intent] 🔬 SEMANTIC match: ${semanticResult.intent} ` +
          `(${(semanticResult.score * 100).toFixed(0)}% - similar to: "${semanticResult.matchedExample}")`
        );

        return {
          category: semanticResult.intent as any,
          confidence: semanticResult.score,
          entities: {},
          source: 'semantic',
          matchedExample: semanticResult.matchedExample,
          detectedLanguage: detectedLang
        };
      }

      // Log if close but not confident enough
      if (semanticResult && semanticResult.score > 0.60 && semanticResult.score < config.tiers.tier3_semantic.threshold) {
        console.log(
          `[Intent] 🔸 Semantic match below threshold: ${semanticResult.intent} ` +
          `(${(semanticResult.score * 100).toFixed(0)}%), falling back to LLM`
        );
      }
    }
  }

  // TIER 4: LLM classification WITH CONFIGURABLE CONTEXT
  if (config.tiers.tier4_llm.enabled) {
    try {
      const contextSize = config.tiers.tier4_llm.contextMessages;
      const context = history.slice(-contextSize);

      const llmResult = await llmClassify(text, context);
      console.log(
        `[Intent] 🤖 LLM classified: ${llmResult.category} ` +
        `(${(llmResult.confidence * 100).toFixed(0)}% with ${context.length} context messages)`
      );

      return {
        ...llmResult,
        source: 'llm',
        detectedLanguage: detectedLang
      };
    } catch (error) {
      console.error('[Intent] LLM classification failed:', error);
      return {
        category: 'unknown',
        confidence: 0,
        entities: {},
        source: 'llm',
        detectedLanguage: detectedLang
      };
    }
  }

  // All tiers disabled or failed - return unknown
  return {
    category: 'unknown',
    confidence: 0,
    entities: {},
    source: 'llm',
    detectedLanguage: detectedLang
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use classifyMessageWithContext() instead
 */
export async function classifyMessage(
  text: string,
  history: ChatMessage[] = []
): Promise<IntentResult> {
  return classifyMessageWithContext(text, history, null);
}
