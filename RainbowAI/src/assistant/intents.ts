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

async function loadEmergencyPatternsFromFile(): Promise<void> {
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
    if (/\b(nois[ye]|loud|bising|can'?t\s?sleep|quiet|baby|bayi|infant|婴儿|cry|crying)\b/i.test(messageText)) {
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

  // Map "booking" to "extend_stay" when extending existing stay (not new booking)
  if (llmIntent === 'booking' || llmIntent === 'book' || llmIntent === 'reservation') {
    if (/\b(extend|prolong|extra\s+night|stay\s+longer|add\s+(more\s+)?night|tambah\s+malam|lanjut\s+penginapan|延长|续住|加住)\b/i.test(messageText)) {
      return 'extend_stay';
    }
  }

  // Map "directions" to "local_services" when asking about nearby services/ATM
  if (llmIntent === 'directions') {
    if (/\b(atm|money\s+changer|bank|pharmacy|farmasi|laundry|dobi|convenience|kedai|grocery|tukar\s+wang|取款|换钱|银行|药房|便利店)\b/i.test(messageText)) {
      return 'local_services';
    }
  }

  // Map "facilities" to "facilities_info"
  if (llmIntent === 'facilities' || llmIntent === 'amenities' || llmIntent === 'facilities_info') {
    // Check for accessibility queries
    if (/\b(wheelchair|disabled|disability|accessibility|accessible|mobility|handicap|OKU|kerusi\s+roda|kurang\s+upaya|轮椅|无障碍|残疾)\b/i.test(messageText)) {
      return 'accessibility';
    }
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
    // Check for active departure (guest is checking out now)
    if (/\b(i\s?(want|need|wanna)\s?(to\s?)?(checkout|check\s?out)|checking\s?out\s?(now|today)|i\s?am\s?leaving|im\s?leaving|ready\s?to\s?(checkout|leave)|nak\s?(checkout|keluar)|saya\s?(nak|mahu)\s?(checkout|keluar|pergi|balik)|我要退房|我想退房|退房了|准备退房|现在退房)\b/i.test(messageText)) {
      return 'checkout_now';
    }
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

// ─── Multi-Intent Splitting (compound messages with 2+ intents) ────────────

/** Conjunctions that split compound messages (EN / MS / ZH) */
const SPLIT_CONJUNCTIONS = /\b(and\s+also|and also|also|but\s+also|but also|by the way|btw|oh by the way|oh|anyway|but|dan\s+juga|dan juga|dan|juga|serta|还有|和|另外)\b/i;
const TRIVIAL_INTENTS = new Set(['greeting', 'thanks', 'unknown']);

/** Phrases that look like conjunctions but are part of a SINGLE intent — do NOT split */
const SINGLE_INTENT_GUARDS: RegExp[] = [
  /\b(book\s+and\s+pay|want\s+to\s+book\s+and|tempah\s+dan\s+bayar|预订并付)\b/i,
  /\b(check\s+in\s+and\s+(pay|register)|daftar\s+dan\s+bayar)\b/i,
  /\b(clean\s+and\s+tidy|bersih\s+dan\s+kemas)\b/i,
];

/**
 * Split a compound message into sub-messages using multiple strategies:
 * 1. Question mark boundaries: "How much? And wifi?" → ["How much?", "And wifi?"]
 * 2. Conjunction splitting: "X and Y" / "X dan Y" / "X 和 Y"
 * 3. Sentence boundary with topic shift (basic heuristic)
 *
 * Returns null if message shouldn't be split (single-intent guard or too few segments).
 */
function splitMultiIntentMessage(text: string): string[] | null {
  // Guard: don't split single-intent compound phrases
  if (SINGLE_INTENT_GUARDS.some(g => g.test(text))) return null;

  let segments: string[] = [];

  // Strategy 1: Split on question marks (common in multi-intent questions)
  // "How much? And wifi?" → ["How much?", "And wifi?"]
  const questionParts = text.split(/\?\s*/).filter(s => s.trim().length > 2);
  if (questionParts.length >= 2) {
    // Re-add '?' to each part except possibly the last empty one
    segments = questionParts.map((p, i) => i < questionParts.length - 1 || text.trimEnd().endsWith('?') ? p.trim() + '?' : p.trim()).filter(s => s.length > 3);
    if (segments.length >= 2) {
      return segments;
    }
  }

  // Strategy 2: Split on conjunctions (EN/MS/ZH)
  if (SPLIT_CONJUNCTIONS.test(text)) {
    segments = text.split(SPLIT_CONJUNCTIONS).filter(s => s.trim().length > 3);
    // Remove segments that are just the conjunction word itself
    segments = segments.filter(s => !SPLIT_CONJUNCTIONS.test('^' + s.trim() + '$') && !/^(and|but|also|dan|juga|serta|oh|btw|anyway|还有|和|另外)$/i.test(s.trim()));
    if (segments.length >= 2) return segments;
  }

  // Strategy 3: Chinese sentence boundaries (。/ ，separating different topics)
  if (/[\u4e00-\u9fff]/.test(text)) {
    const zhParts = text.split(/[，。；]/).filter(s => s.trim().length > 2);
    if (zhParts.length >= 2) return zhParts;
  }

  return null;
}

export interface MultiIntentResult {
  intents: IntentResult[];
  segments: string[];
}

/**
 * Detect and classify multiple intents in compound messages.
 * For each sub-message, classify independently using fuzzy/semantic matchers.
 * Returns all distinct non-trivial intents found, or null if message is single-intent.
 */
async function tryMultiIntentSplit(
  text: string,
  history: ChatMessage[],
  lastIntent: string | null,
  detectedLang: SupportedLanguage,
  config: ReturnType<typeof getIntentConfig>
): Promise<IntentResult | null> {
  const segments = splitMultiIntentMessage(text);
  if (!segments || segments.length < 2) return null;

  console.log(`[Intent] Multi-intent split: ${segments.length} segments: ${JSON.stringify(segments)}`);

  // Classify each segment independently
  const results: IntentResult[] = [];
  const seenIntents = new Set<string>();

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (trimmed.length < 3) continue;

    let segResult: IntentResult | null = null;

    // Try fuzzy first (fast)
    if (fuzzyMatcher) {
      const fuzzyResult = fuzzyMatcher.matchWithContext(trimmed, [], null, undefined);
      if (fuzzyResult && fuzzyResult.score >= 0.65 && !TRIVIAL_INTENTS.has(fuzzyResult.intent)) {
        console.log(`[Intent] Multi-intent segment "${trimmed}" -> fuzzy: ${fuzzyResult.intent} (${(fuzzyResult.score * 100).toFixed(0)}%)`);
        segResult = {
          category: fuzzyResult.intent as any,
          confidence: fuzzyResult.score * 0.9,
          entities: {},
          source: 'fuzzy',
          matchedKeyword: fuzzyResult.matchedKeyword,
          detectedLanguage: detectedLang
        };
      }
    }

    // Try semantic if fuzzy didn't match
    if (!segResult && config.tiers.tier3_semantic.enabled) {
      const semanticMatcher = getSemanticMatcher();
      if (semanticMatcher.isReady()) {
        const semanticResult = await semanticMatcher.match(trimmed, 0.60);
        if (semanticResult && !TRIVIAL_INTENTS.has(semanticResult.intent)) {
          console.log(`[Intent] Multi-intent segment "${trimmed}" -> semantic: ${semanticResult.intent} (${(semanticResult.score * 100).toFixed(0)}%)`);
          segResult = {
            category: semanticResult.intent as any,
            confidence: semanticResult.score * 0.9,
            entities: {},
            source: 'semantic',
            matchedExample: semanticResult.matchedExample,
            detectedLanguage: detectedLang
          };
        }
      }
    }

    if (segResult && !seenIntents.has(segResult.category)) {
      seenIntents.add(segResult.category);
      results.push(segResult);
    }
  }

  // If we found 2+ distinct intents, it's truly multi-intent
  if (results.length >= 2) {
    console.log(`[Intent] Multi-intent detected: ${results.map(r => r.category).join(' + ')}`);
    // Return the first (primary) intent; the multi-intent info is available via entities
    const primary = results[0];
    primary.entities = {
      ...primary.entities,
      multiIntent: 'true',
      allIntents: results.map(r => r.category).join(','),
      segmentCount: String(results.length),
    };
    return primary;
  }

  // Only 1 distinct intent found — return it as a normal single result
  if (results.length === 1) {
    return results[0];
  }

  return null;
}

/**
 * Corrects Fuse.js false positives where phonetically similar keywords cause wrong intent.
 * Primary case: "checking out" fuzzy-matches "checking in" → check_in_arrival,
 * but message is actually a post-checkout complaint.
 * Returns the corrected intent string, or null if no correction needed.
 */
function correctCheckInFalsePositive(intent: string, text: string): string | null {
  if (
    (intent === 'check_in_arrival' || intent === 'checkin_info') &&
    /\b(after\s+(checking\s+out|check\s*out|checkout|checked\s+out)|post[- ]?checkout|lepas\s+(check\s*out|checkout|keluar)|退房后)\b/i.test(text) &&
    /\b(complain|complaint|poor\s+service|bad\s+service|aduan|servis\s+teruk|pengalaman\s+teruk)\b/i.test(text)
  ) {
    return 'post_checkout_complaint';
  }
  return null;
}

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
    const uniqueWords = Object.keys(wordCounts);
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
    // Even if the fuzzy result didn't pass per-intent tier thresholds, a raw score >= 0.85
    // is strong enough to skip the expensive semantic embedding step.
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
          const splitResult = await tryMultiIntentSplit(text, history, lastIntent, detectedLang, config);
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
        const splitResult = await tryMultiIntentSplit(text, history, lastIntent, detectedLang, config);
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
      const splitResult = await tryMultiIntentSplit(text, history, lastIntent, detectedLang, config);
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
