import Fuse from 'fuse.js';
import type { ChatMessage } from './types.js';

export interface KeywordIntent {
  intent: string;
  keywords: string[];
  language?: 'en' | 'ms' | 'zh';
}

export interface FuzzyMatchResult {
  intent: string;
  score: number;
  matchedKeyword?: string;
  contextBoost?: boolean;  // True if score was boosted by context
}

/**
 * Fuzzy keyword matcher for intent classification
 * Handles typos, abbreviations, and variations
 */
export class FuzzyIntentMatcher {
  private fuse: Fuse<{ intent: string; keyword: string; language: string }>;
  private searchData: { intent: string; keyword: string; language: string }[];

  // Pre-compiled regexes for hot-path context rules (compiled once at class load time)
  private static readonly CONFIRMATION_RE = /\b(yes|ya|ok|okay|sure|confirm|订|是的|好)\b/i;
  private static readonly FACILITIES_FOLLOWUP_RE = /\b(where|how|when|what time|哪里|怎么|什么时候)\b/i;
  private static readonly DATE_KEYWORDS_RE = /\b(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|besok|hari ini|malam ini|明天|今天|下周|这周|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})\b/i;
  private static readonly NUMBER_KEYWORDS_RE = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|satu|dua|tiga|empat|lima|一|二|三|四|五)\s*(people|person|guest|pax|night|nights|day|days|orang|malam|hari|人|晚|天)\b/i;

  constructor(intents: KeywordIntent[]) {
    // Flatten keywords with their intents for searching
    this.searchData = intents.flatMap(intent =>
      intent.keywords.map(keyword => ({
        intent: intent.intent,
        keyword: keyword.toLowerCase().trim(),
        language: intent.language || 'en'
      }))
    );

    this.fuse = new Fuse(this.searchData, {
      keys: ['keyword'],
      threshold: 0.3,        // 0 = exact match, 1 = match anything (0.3 = moderate)
      distance: 100,         // Max character distance for matching
      ignoreLocation: true,  // Search entire string, not just beginning
      minMatchCharLength: 2, // Minimum 2 characters to match
      includeScore: true,    // Include match score in results
    });
  }

  /**
   * Substring fallback: find keywords that appear as substrings in user text.
   * Used when Fuse.js fails (query much longer than keyword items).
   * Only matches keywords with 4+ words AND 18+ chars to avoid false positives.
   */
  private substringMatch(text: string, languageFilter?: 'en' | 'ms' | 'zh'): FuzzyMatchResult | null {
    const normalized = text.toLowerCase().trim();
    let bestMatch: { intent: string; keyword: string; length: number } | null = null;

    for (const entry of this.searchData) {
      // Require 4+ words AND 18+ chars to avoid generic phrase matches
      if (entry.keyword.split(/\s+/).length < 4 || entry.keyword.length < 18) continue;
      // Apply language filter
      if (languageFilter && entry.language !== languageFilter && entry.language !== 'en') continue;

      if (normalized.includes(entry.keyword)) {
        // Prefer longest matching keyword (more specific = better)
        if (!bestMatch || entry.keyword.length > bestMatch.length) {
          bestMatch = { intent: entry.intent, keyword: entry.keyword, length: entry.keyword.length };
        }
      }
    }

    if (bestMatch) {
      return {
        intent: bestMatch.intent,
        score: 0.95, // High confidence for substring matches
        matchedKeyword: bestMatch.keyword
      };
    }
    return null;
  }

  /**
   * Match user text against keywords
   * @param text User input text
   * @param languageFilter Optional language filter for better accuracy
   * @returns Best matching intent with confidence score
   */
  match(text: string, languageFilter?: 'en' | 'ms' | 'zh'): FuzzyMatchResult | null {
    const normalized = text.toLowerCase().trim();
    const results = this.fuse.search(normalized);

    // Filter by language if specified
    let filteredResults = results;
    if (languageFilter) {
      filteredResults = results.filter(r =>
        r.item.language === languageFilter ||
        r.item.language === 'en'  // Always include English as fallback
      );

      // If no language-specific matches, fall back to all results
      if (filteredResults.length === 0) {
        filteredResults = results;
      }
    }

    // No Fuse.js results at all — try substring fallback
    if (filteredResults.length === 0) {
      return this.substringMatch(normalized, languageFilter);
    }

    // Get best match (lowest score = best match in Fuse.js)
    const bestMatch = filteredResults[0];
    const confidence = 1 - (bestMatch.score || 0);

    // If Fuse.js confidence is low, try substring fallback (handles long messages)
    if (confidence < 0.70) {
      const subMatch = this.substringMatch(normalized, languageFilter);
      if (subMatch) return subMatch;
    }

    return {
      intent: bestMatch.item.intent,
      score: confidence,
      matchedKeyword: bestMatch.item.keyword
    };
  }

  /**
   * Get all matches above a threshold
   * @param text User input text
   * @param threshold Minimum confidence threshold (0-1)
   * @returns All matching intents above threshold
   */
  matchAll(text: string, threshold = 0.6): FuzzyMatchResult[] {
    const normalized = text.toLowerCase().trim();
    const results = this.fuse.search(normalized);

    return results
      .map(result => ({
        intent: result.item.intent,
        score: 1 - (result.score || 0),
        matchedKeyword: result.item.keyword
      }))
      .filter(result => result.score >= threshold)
      .sort((a, b) => b.score - a.score); // Sort by score descending
  }

  /**
   * Match with context awareness (NEW!)
   * Uses previous messages and last intent to improve accuracy
   * @param text Current user message
   * @param contextMessages Previous N messages (from config)
   * @param lastIntent Previous intent detected
   * @param languageFilter Optional language filter
   * @returns Best matching intent with context-aware confidence
   */
  matchWithContext(
    text: string,
    contextMessages: ChatMessage[] = [],
    lastIntent: string | null = null,
    languageFilter?: 'en' | 'ms' | 'zh'
  ): FuzzyMatchResult | null {
    const normalized = text.toLowerCase().trim();

    // First, try regular matching
    const regularMatch = this.match(text, languageFilter);

    // If no regular match, check context-aware rules
    if (!regularMatch || regularMatch.score < 0.80) {
      const contextMatch = this.checkContextRules(normalized, lastIntent, contextMessages);
      if (contextMatch) {
        return contextMatch;
      }
    }

    return regularMatch;
  }

  /**
   * Context-aware rules for intent continuation
   * Handles cases like: "Do you have rooms?" → "tomorrow" (booking)
   */
  private checkContextRules(
    text: string,
    lastIntent: string | null,
    contextMessages: ChatMessage[]
  ): FuzzyMatchResult | null {
    if (!lastIntent || contextMessages.length === 0) return null;

    // Rule 1: Booking/Availability continuation
    if (lastIntent === 'booking' || lastIntent === 'availability') {
      // Check if user is providing booking details (dates, numbers)
      if (this.containsDateKeywords(text) || this.containsNumberKeywords(text)) {
        return {
          intent: 'booking',
          score: 0.90,
          matchedKeyword: 'context:booking_continuation',
          contextBoost: true
        };
      }

      // Check if user is confirming
      if (FuzzyIntentMatcher.CONFIRMATION_RE.test(text)) {
        return {
          intent: 'booking',
          score: 0.85,
          matchedKeyword: 'context:confirmation',
          contextBoost: true
        };
      }
    }

    // Rule 2: Complaint follow-up
    if (lastIntent === 'complaint') {
      // Short messages after complaint = adding details
      if (text.length > 5 && text.length < 100) {
        return {
          intent: 'complaint',
          score: 0.88,
          matchedKeyword: 'context:complaint_details',
          contextBoost: true
        };
      }
    }

    // Rule 3: Facilities follow-up questions
    if (lastIntent === 'facilities') {
      // Questions about specific facilities
      if (FuzzyIntentMatcher.FACILITIES_FOLLOWUP_RE.test(text)) {
        return {
          intent: 'facilities',
          score: 0.85,
          matchedKeyword: 'context:facilities_followup',
          contextBoost: true
        };
      }
    }

    return null;
  }

  // Helper: Check for date keywords (uses pre-compiled regex)
  private containsDateKeywords(text: string): boolean {
    return FuzzyIntentMatcher.DATE_KEYWORDS_RE.test(text);
  }

  // Helper: Check for number keywords (guests, nights) (uses pre-compiled regex)
  private containsNumberKeywords(text: string): boolean {
    return FuzzyIntentMatcher.NUMBER_KEYWORDS_RE.test(text);
  }
}
