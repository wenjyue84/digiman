import type { IntentResult, ChatMessage } from './types.js';
import { classifyIntent as llmClassify } from './ai-client.js';
import { FuzzyIntentMatcher, type KeywordIntent } from './fuzzy-matcher.js';
import { languageRouter } from './language-router.js';
import { getSemanticMatcher, type IntentExamples } from './semantic-matcher.js';
import { getIntentConfig, buildIntentThresholdMap, checkTierThreshold } from './intent-config.js';
import intentKeywordsData from './data/intent-keywords.json' with { type: 'json' };
import intentExamplesData from './data/intent-examples.json' with { type: 'json' };
import intentsJsonData from './data/intents.json' with { type: 'json' };

// Re-export public API from extracted modules (keeps all imports from './intents.js' working)
export { isEmergency, getEmergencyIntent, getRegexDeflection } from './emergency-patterns.js';
export type { MultiIntentResult } from './multi-intent.js';

import { loadEmergencyPatternsFromFile, getEmergencyIntent, getRegexDeflection } from './emergency-patterns.js';
import { mapLLMIntentToSpecific } from './llm-intent-mapper.js';
import { tryMultiIntentSplit, correctCheckInFalsePositive } from './multi-intent.js';

// ─── Fuzzy Keyword Matcher ────────────

let fuzzyMatcher: FuzzyIntentMatcher | null = null;

function initFuzzyMatcher(): void {
  const keywordIntents: KeywordIntent[] = [];

  for (const intent of intentKeywordsData.intents) {
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

  // PRE-PROCESSING: Deduplicate heavily repeated words (e.g., "hello hello hello" → "hello")
  let processedText = text;
  const words = text.trim().split(/\s+/);
  if (words.length >= 3) {
    const wordCounts: Record<string, number> = {};
    for (const w of words) wordCounts[w.toLowerCase()] = (wordCounts[w.toLowerCase()] || 0) + 1;
    // If one word makes up 80%+ of the message, deduplicate to just that word
    for (const [word, count] of Object.entries(wordCounts)) {
      if (count / words.length >= 0.8) {
        processedText = word;
        console.log(`[Intent] 🔄 Dedup: "${text}" → "${processedText}"`);
        break;
      }
    }
  }

  // TIER 1: Emergency check (always enabled, always single message)
  if (config.tiers.tier1_emergency.enabled) {
    const emergencyIntent = getEmergencyIntent(text);
    if (emergencyIntent !== null) {
      console.log(`[Intent] 🚨 EMERGENCY detected (regex) → ${emergencyIntent}`);
      return {
        category: emergencyIntent as any,
        confidence: 1.0,
        entities: { emergency: 'true' },
        source: 'regex',
        detectedLanguage: detectedLang
      };
    }
    // Check for non-emergency regex deflections (e.g., prompt injection → greeting)
    const deflection = getRegexDeflection(text);
    if (deflection !== null) {
      console.log(`[Intent] 🛡️ Regex deflection → ${deflection}`);
      return {
        category: deflection as any,
        confidence: 1.0,
        entities: {},
        source: 'regex',
        detectedLanguage: detectedLang
      };
    }
  }

  // TIER 2: Fuzzy keyword matching WITH CONTEXT
  let fuzzyHighConfidenceResult: IntentResult | null = null;
  if (config.tiers.tier2_fuzzy.enabled && fuzzyMatcher) {
    const contextSize = config.tiers.tier2_fuzzy.contextMessages;
    const context = history.slice(-contextSize);
    const languageFilter = detectedLang !== 'unknown' ? detectedLang : undefined;

    const fuzzyResult = fuzzyMatcher.matchWithContext(
      processedText,
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
      const correctedIntent = correctCheckInFalsePositive(fuzzyResult.intent, processedText);
      const finalIntent = correctedIntent ?? fuzzyResult.intent;
      if (correctedIntent) {
        console.log(`[Intent] ⚠️ T2 false-positive corrected: ${fuzzyResult.intent} → ${correctedIntent} (post-checkout context)`);
      } else {
        console.log(
          `[Intent] ⚡ FUZZY match: ${fuzzyResult.intent} ` +
          `(${(fuzzyResult.score * 100).toFixed(0)}% - keyword: "${fuzzyResult.matchedKeyword}")` +
          (fuzzyResult.contextBoost ? ' [CONTEXT BOOST]' : '')
        );
      }

      return {
        category: finalIntent as any,
        confidence: correctedIntent ? 0.88 : fuzzyResult.score,
        entities: {},
        source: 'fuzzy',
        matchedKeyword: fuzzyResult.matchedKeyword,
        detectedLanguage: detectedLang
      };
    }

    // US-155: Skip semantic match if fuzzy confidence is already high (saves 100-300ms)
    if (fuzzyResult && fuzzyResult.score >= 0.85) {
      const correctedHigh = correctCheckInFalsePositive(fuzzyResult.intent, processedText);
      const finalHighIntent = correctedHigh ?? fuzzyResult.intent;
      if (correctedHigh) {
        console.log(`[Intent] ⚠️ T2 high-confidence false-positive corrected: ${fuzzyResult.intent} → ${correctedHigh}`);
      } else {
        console.log(
          `[Intent] ⚡ FUZZY high-confidence shortcut: ${fuzzyResult.intent} ` +
          `(${(fuzzyResult.score * 100).toFixed(0)}% >= 85%) — skipping semantic tier`
        );
      }
      fuzzyHighConfidenceResult = {
        category: finalHighIntent as any,
        confidence: correctedHigh ? 0.88 : fuzzyResult.score,
        entities: {},
        source: 'fuzzy',
        matchedKeyword: fuzzyResult.matchedKeyword,
        detectedLanguage: detectedLang
      };
    }

    // Log if close but not confident enough
    if (fuzzyResult && fuzzyResult.score > 0.60 && fuzzyResult.score < config.tiers.tier2_fuzzy.threshold && !fuzzyHighConfidenceResult) {
      console.log(
        `[Intent] 🔸 Fuzzy match below threshold: ${fuzzyResult.intent} ` +
        `(${(fuzzyResult.score * 100).toFixed(0)}%), trying semantic...`
      );
    }
  }

  // US-155: If fuzzy had high confidence (>= 0.85), skip semantic tier entirely
  if (fuzzyHighConfidenceResult) {
    return fuzzyHighConfidenceResult;
  }

  // TIER 3: Semantic similarity matching WITH CONTEXT
  if (config.tiers.tier3_semantic.enabled) {
    const semanticMatcher = getSemanticMatcher();
    if (semanticMatcher.isReady()) {
      const semanticResult = await semanticMatcher.match(processedText, config.tiers.tier3_semantic.threshold);

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

  // TIER 4: LLM classification WITH CONFIGURABLE CONTEXT (+ timeout fallback US-046)
  if (config.tiers.tier4_llm.enabled) {
    try {
      const contextSize = config.tiers.tier4_llm.contextMessages;
      const context = history.slice(-contextSize);

      // US-046: Wrap LLM call with configurable timeout (default 8s)
      const LLM_TIMEOUT_MS = 8000;
      let llmResult: Awaited<ReturnType<typeof llmClassify>>;
      let llmTimedOut = false;
      try {
        llmResult = await Promise.race([
          llmClassify(processedText, context),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('LLM_TIMEOUT')), LLM_TIMEOUT_MS)
          )
        ]);
      } catch (timeoutErr: any) {
        if (timeoutErr?.message === 'LLM_TIMEOUT') {
          llmTimedOut = true;
          console.warn(`[Intent] ⏱️ LLM timeout (${LLM_TIMEOUT_MS}ms) for: "${text.slice(0, 60)}"`);
          // Fallback: try semantic with lower threshold, then fuzzy with relaxed scoring
          if (config.tiers.tier3_semantic.enabled) {
            const semanticMatcher = getSemanticMatcher();
            if (semanticMatcher.isReady()) {
              const relaxedSemantic = await semanticMatcher.match(processedText, 0.55);
              if (relaxedSemantic) {
                console.log(`[Intent] ⏱️ Timeout fallback → semantic: ${relaxedSemantic.intent} (${(relaxedSemantic.score * 100).toFixed(0)}%)`);
                return {
                  category: relaxedSemantic.intent as any,
                  confidence: relaxedSemantic.score * 0.85,
                  entities: {},
                  source: 'semantic',
                  matchedExample: relaxedSemantic.matchedExample,
                  detectedLanguage: detectedLang
                };
              }
            }
          }
          if (fuzzyMatcher) {
            const relaxedFuzzy = fuzzyMatcher.matchWithContext(processedText, [], null, undefined);
            if (relaxedFuzzy && relaxedFuzzy.score >= 0.55) {
              console.log(`[Intent] ⏱️ Timeout fallback → fuzzy: ${relaxedFuzzy.intent} (${(relaxedFuzzy.score * 100).toFixed(0)}%)`);
              return {
                category: relaxedFuzzy.intent as any,
                confidence: relaxedFuzzy.score * 0.85,
                entities: {},
                source: 'fuzzy',
                matchedKeyword: relaxedFuzzy.matchedKeyword,
                detectedLanguage: detectedLang
              };
            }
          }
          // Multi-intent split as last resort
          const splitResult = await tryMultiIntentSplit(text, history, lastIntent, detectedLang, config, fuzzyMatcher);
          if (splitResult) return splitResult;
          return { category: 'unknown', confidence: 0, entities: {}, source: 'llm', detectedLanguage: detectedLang };
        }
        throw timeoutErr; // Re-throw non-timeout errors
      }

      // Map generic LLM intent names to specific defined intents
      const mappedCategory = mapLLMIntentToSpecific(llmResult.category, processedText);

      if (mappedCategory !== llmResult.category) {
        console.log(
          `[Intent] 🤖 LLM classified: ${llmResult.category} → mapped to: ${mappedCategory} ` +
          `(${(llmResult.confidence * 100).toFixed(0)}% with ${context.length} context messages)`
        );
      } else {
        console.log(
          `[Intent] 🤖 LLM classified: ${llmResult.category} ` +
          `(${(llmResult.confidence * 100).toFixed(0)}% with ${context.length} context messages)`
        );
      }

      // If LLM returned unknown with low confidence, try multi-intent splitting
      if (mappedCategory === 'unknown' && llmResult.confidence < 0.3) {
        const splitResult = await tryMultiIntentSplit(text, history, lastIntent, detectedLang, config, fuzzyMatcher);
        if (splitResult) return splitResult;
      }

      return {
        ...llmResult,
        category: mappedCategory as any,
        source: 'llm',
        detectedLanguage: detectedLang
      };
    } catch (error) {
      console.error('[Intent] LLM classification failed:', error);
      // On LLM failure, try multi-intent splitting as last resort
      const splitResult = await tryMultiIntentSplit(text, history, lastIntent, detectedLang, config, fuzzyMatcher);
      if (splitResult) return splitResult;
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
