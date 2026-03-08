import type { IntentResult, ChatMessage } from './types.js';
import { FuzzyIntentMatcher } from './fuzzy-matcher.js';
import { getSemanticMatcher } from './semantic-matcher.js';
import { getIntentConfig } from './intent-config.js';
import type { SupportedLanguage } from './language-router.js';

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
export async function tryMultiIntentSplit(
  text: string,
  history: ChatMessage[],
  lastIntent: string | null,
  detectedLang: SupportedLanguage,
  config: ReturnType<typeof getIntentConfig>,
  fuzzyMatcher: FuzzyIntentMatcher | null
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
export function correctCheckInFalsePositive(intent: string, text: string): string | null {
  if (
    (intent === 'check_in_arrival' || intent === 'checkin_info') &&
    /\b(after\s+(checking\s+out|check\s*out|checkout|checked\s+out)|post[- ]?checkout|lepas\s+(check\s*out|checkout|keluar)|退房后)\b/i.test(text) &&
    /\b(complain|complaint|poor\s+service|bad\s+service|aduan|servis\s+teruk|pengalaman\s+teruk)\b/i.test(text)
  ) {
    return 'post_checkout_complaint';
  }
  return null;
}
