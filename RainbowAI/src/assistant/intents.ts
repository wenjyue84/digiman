import type { IntentResult, ChatMessage, ConversationState } from './types.js';
import { classifyIntent as llmClassify } from './ai-client.js';
import { FuzzyIntentMatcher, type KeywordIntent } from './fuzzy-matcher.js';
import { languageRouter, type SupportedLanguage } from './language-router.js';
import { getSemanticMatcher, type IntentExamples } from './semantic-matcher.js';
import { getIntentConfig, buildIntentThresholdMap, checkTierThreshold } from './intent-config.js';
import intentKeywordsData from './data/intent-keywords.json' assert { type: 'json' };
import intentExamplesData from './data/intent-examples.json' assert { type: 'json' };
import intentsJsonData from './data/intents.json' assert { type: 'json' };

// ─── Emergency patterns (regex, critical patterns for immediate escalation) ─────────

const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(fire|kebakaran|着火|火灾)\b/i,
  /\b(ambulan[cs]e|hospital|emergency|kecemasan|darurat|急救|紧急)\b/i,
  /\b(stol[ea]n|theft|rob(?:bed|bery)|dicuri|dirompak|kecurian|被偷|被抢|失窃)\b/i,
  /\b(assault|attack|violen[ct]|fight|serang|pukul|袭击|打架)\b/i,
  /\b(police|polis|cops?|警察|报警)\b/i,
  /\b(locked.*card|card.*locked|terkunci|锁在里面|出不去)\b/i,
];

export function isEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some(p => p.test(text));
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
  if (config.tiers.tier1_emergency.enabled && isEmergency(text)) {
    console.log('[Intent] 🚨 EMERGENCY detected (regex)');
    return {
      category: 'complaint',
      confidence: 1.0,
      entities: { emergency: 'true' },
      source: 'regex',
      detectedLanguage: detectedLang
    };
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
