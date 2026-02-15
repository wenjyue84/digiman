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

type EmergencyType = 'theft_report' | 'card_locked' | 'complaint';

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

      const emergencyType: EmergencyType = (item.emergencyType === 'theft_report' || item.emergencyType === 'card_locked')
        ? item.emergencyType
        : (item.emergencyType === 'theft' ? 'theft_report' : 'complaint');
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
export function getEmergencyIntent(text: string): 'theft_report' | 'card_locked' | 'complaint' | null {
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
    if (i === BUILTIN_THEFT_INDEX) return 'theft_report';
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

// ─── LLM Intent Mapper (Fix generic LLM responses) ─────────────────────

/**
 * Maps generic LLM intent names to specific defined intents.
 * The LLM often returns simplified names like "complaint", "facilities", "payment"
 * This function maps them to the correct specific intent categories.
 */
function mapLLMIntentToSpecific(llmIntent: string, messageText: string): string {
  const lowerText = messageText.toLowerCase();

  // Map generic "complaint" to specific complaint types
  if (llmIntent === 'complaint' || llmIntent === 'general_complaint' || llmIntent === 'issue' || llmIntent === 'problem') {
    // Check for specific complaint types based on keywords in the message
    if (/\b(cold|hot|warm|temperature|ac|air\s?cond|heater|sejuk|panas)\b/i.test(messageText)) {
      return 'climate_control_complaint';
    }
    if (/\b(nois[ye]|loud|bising|can'?t\s?sleep|quiet)\b/i.test(messageText)) {
      return 'noise_complaint';
    }
    if (/\b(dirty|unclean|smell|stain|not\s?clean|kotor|bau|comot|脏|不干净)\b/i.test(messageText)) {
      return 'cleanliness_complaint';
    }
    if (/\b(broken|not\s?working|malfunction|damaged|rosak|tak\s?boleh\s?guna|坏了|不能用)\b/i.test(messageText)) {
      return 'facility_malfunction';
    }
    // Check for post-checkout context (including "checking out", "checked out")
    if (/\b(after\s+(checking\s+out|check\s*out|checkout|checked\s+out)|post[- ]?checkout|already\s?(left|checked\s+out)|was\s?there|during\s?my\s?stay|lepas\s?(check\s*out|checkout|keluar)|退房后)\b/i.test(messageText)) {
      return 'post_checkout_complaint';
    }
    // Check for review/feedback language (not a complaint-in-stay)
    if (/\b(worst\s+(hotel|hostel|place|stay)|highly\s+recommend|great\s+experience|give\s+.*(star|rating)|review|recommend|5\s?star|1\s?star|never\s+(come|stay|return)\s+back)\b/i.test(messageText)) {
      return 'review_feedback';
    }
    // Otherwise generic in-stay complaint
    return 'general_complaint_in_stay';
  }

  // Map "facilities" to "facilities_info"
  if (llmIntent === 'facilities' || llmIntent === 'amenities' || llmIntent === 'facilities_info') {
    // Check if asking about facility location (orientation)
    if (/\b(where\s?is|di\s?mana|在哪|location|lokasi)\b/i.test(messageText)) {
      return 'facility_orientation';
    }
    return 'facilities_info';
  }

  // Map "rules" to "rules_policy"
  if (llmIntent === 'rules' || llmIntent === 'policy') {
    return 'rules_policy';
  }

  // Map "payment" to specific payment intents
  if (llmIntent === 'payment' || llmIntent === 'pay') {
    // Check if confirming payment already made
    if (/\b(already\s?paid|i\s?paid|just\s?paid|transfer(?:red)?|sent|payment\s?done|sudah\s?bayar|dah\s?bayar|已付|付了)\b/i.test(messageText)) {
      return 'payment_made';
    }
    // Otherwise asking about payment info
    return 'payment_info';
  }

  // Map "checkin" variations
  if (llmIntent === 'checkin' || llmIntent === 'check_in' || llmIntent === 'checkin_info') {
    // Check if guest has arrived or wants to check in (not just asking about times)
    if (/\b(i\s?(want|wan|wanna)\s?(to\s?)?check\s?in|want\s?to\s?check\s?in|checking\s?in|i\s?have\s?arrived|i'?m\s?here|i\s?arrived|just\s?arrived|dah\s?sampai|dah\s?tiba|nak\s?(check\s?in|checkin|daftar\s?masuk)|要入住|已经到|我来了|我到了)\b/i.test(messageText)) {
      return 'check_in_arrival';
    }
    return 'checkin_info';
  }

  // Map "checkout" variations
  if (llmIntent === 'checkout' || llmIntent === 'check_out') {
    // Check for late checkout request
    if (/\b(late|later|extend|checkout\s?at|stay\s?longer|lewat|延迟|晚点)\b/i.test(messageText)) {
      return 'late_checkout_request';
    }
    // Check for luggage storage
    if (/\b(luggage|bag|suitcase|keep|store|simpan|寄存|行李)\b/i.test(messageText)) {
      return 'luggage_storage';
    }
    // Check for checkout procedure
    if (/\b(how\s?to|how\s?do|process|procedure|macam\s?mana|怎么)\b/i.test(messageText)) {
      return 'checkout_procedure';
    }
    return 'checkout_info';
  }

  // Map "general" to more specific intents
  if (llmIntent === 'general' || llmIntent === 'general_inquiry') {
    // Check for amenity requests
    if (/\b(need|can\s?i\s?get|can\s?i\s?have|more|extra|blanket|pillow|towel|charger|boleh|要|需要)\b/i.test(messageText)) {
      return 'extra_amenity_request';
    }
  }

  // Map "unknown" to more specific intents if possible
  if (llmIntent === 'unknown') {
    // Check for check-in arrival (especially Chinese/Malay short messages)
    if (/(?:我要入住|要入住|办理入住|我来了|我到了|可以入住|入住登记|check\s?in|checkin|nak\s?check\s?in|nak\s?checkin|daftar\s?masuk)/i.test(messageText)) {
      return 'check_in_arrival';
    }
    // Check for tourist guide requests
    if (/\b(tourist|attraction|visit|sightseeing|what\s?to\s?(do|see)|where\s?to\s?go|tempat\s?menarik|景点|旅游)\b/i.test(messageText)) {
      return 'tourist_guide';
    }
    // Check for forgot items
    if (/\b(forgot|left|left\s?behind|terlupa|tertinggal|忘了|落下)\b/i.test(messageText)) {
      return 'forgot_item_post_checkout';
    }
    // Check for billing
    if (/\b(bill|invoice|charge|receipt|bil|resit|overcharge|账单|收费)\b/i.test(messageText)) {
      if (/\b(overcharge|wrong|incorrect|dispute|多收|错误)\b/i.test(messageText)) {
        return 'billing_dispute';
      }
      return 'billing_inquiry';
    }
    // Check for review/feedback
    if (/\b(review|rating|feedback|recommend|great\s?experience|worst|terrible\s?service|评价|反馈)\b/i.test(messageText)) {
      return 'review_feedback';
    }
  }

  // ─── Post-classification corrections (specific → specific) ───
  // LLM sometimes returns a close-but-wrong specific category

  // noise_complaint + baby/infant → escalate (babies not allowed, unauthorized guest)
  if (llmIntent === 'noise_complaint') {
    if (/\b(baby|infant|toddler|bayi|budak\s?kecil|婴儿|宝宝|小孩哭)\b/i.test(messageText)) {
      return 'contact_staff';  // Escalate: babies not allowed in hostel
    }
  }

  // checkout_procedure/checkout_info → late_checkout_request when mentioning specific time
  if (llmIntent === 'checkout_procedure' || llmIntent === 'checkout_info') {
    if (/\b(at\s+\d{1,2}\s*(pm|am|:\d{2})|checkout\s+at|check\s?out\s+at|late|later|extend|stay\s+longer)\b/i.test(messageText)) {
      return 'late_checkout_request';
    }
  }

  // general_complaint_in_stay → post_checkout_complaint when explicitly post-checkout
  if (llmIntent === 'general_complaint_in_stay') {
    if (/\b(after\s+(checking\s+out|check\s*out|checkout)|post[- ]?checkout|already\s+(left|checked\s+out)|lepas\s+(check\s*out|checkout|keluar)|退房后)\b/i.test(messageText)) {
      return 'post_checkout_complaint';
    }
    // → review_feedback when using review/rating language
    if (/\b(worst\s+(hotel|hostel|place)|highly\s+recommend|great\s+experience|give\s+.*(star|rating)|review|recommend|5\s?star|1\s?star)\b/i.test(messageText)) {
      return 'review_feedback';
    }
  }

  // Return original intent if no mapping found
  return llmIntent;
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

      // Map generic LLM intent names to specific defined intents
      const mappedCategory = mapLLMIntentToSpecific(llmResult.category, text);

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

      return {
        ...llmResult,
        category: mappedCategory as any,
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
