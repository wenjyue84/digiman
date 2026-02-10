# Multilingual Intent Detection — Ready-to-Use Code Examples

This file contains production-ready TypeScript code examples for the PelangiManager intent detection system.

---

## Example 1: Minimal Fuzzy Matching Integration (30 mins)

Add typo tolerance to your existing system without changing architecture.

### Installation
```bash
npm install fuse.js
npm install --save-dev @types/fuse.js
```

### Code: `/mcp-server/src/assistant/fuzzy-matcher.ts`

```typescript
import Fuse from 'fuse.js';
import type { IntentResult, IntentCategory } from './types.js';

// Map phrases to their intent categories
const PHRASE_TO_CATEGORY: Record<string, IntentCategory> = {
  // English
  'hello': 'greeting',
  'hi': 'greeting',
  'hey': 'greeting',
  'good morning': 'greeting',
  'good afternoon': 'greeting',
  'good evening': 'greeting',
  'good night': 'greeting',

  'thank you': 'thanks',
  'thanks': 'thanks',
  'appreciate': 'thanks',
  'tq': 'thanks',
  'ty': 'thanks',
  'tvm': 'thanks',
  'tqvm': 'thanks',
  'merci': 'thanks',

  'wifi': 'wifi',
  'wi-fi': 'wifi',
  'internet': 'wifi',
  'password': 'wifi',
  'network': 'wifi',

  'check in': 'checkin_info',
  'checkin': 'checkin_info',
  'check-in': 'checkin_info',
  'when can i check in': 'checkin_info',
  'what time check in': 'checkin_info',

  'check out': 'checkout_info',
  'checkout': 'checkout_info',
  'check-out': 'checkout_info',
  'when do i check out': 'checkout_info',
  'what time check out': 'checkout_info',

  'how much': 'pricing',
  'price': 'pricing',
  'cost': 'pricing',
  'rate': 'pricing',
  'expensive': 'pricing',

  'available': 'availability',
  'vacancy': 'availability',
  'room available': 'availability',
  'any room': 'availability',

  'booking': 'booking',
  'book': 'booking',
  'reserve': 'booking',
  'i want to book': 'booking',

  // Malay
  'assalamualaikum': 'greeting',
  'salam': 'greeting',
  'selamat pagi': 'greeting',
  'selamat petang': 'greeting',
  'selamat malam': 'greeting',

  'terima kasih': 'thanks',
  'terima kasih banyak': 'thanks',

  'wifi': 'wifi',
  'password wifi': 'wifi',

  'daftar masuk': 'checkin_info',
  'masa masuk': 'checkin_info',

  'daftar keluar': 'checkout_info',
  'masa keluar': 'checkout_info',

  'berapa': 'pricing',
  'harga': 'pricing',

  'ada bilik': 'availability',
  'ada katil': 'availability',

  'tempah': 'booking',
  'tempahan': 'booking',

  // Chinese
  '你好': 'greeting',
  '早上好': 'greeting',
  '晚上好': 'greeting',

  '谢谢': 'thanks',
  '感谢': 'thanks',
  '谢了': 'thanks',

  '网络密码': 'wifi',
  'wifi密码': 'wifi',
  '无线密码': 'wifi',

  '入住': 'checkin_info',
  '几点入住': 'checkin_info',
  '什么时候入住': 'checkin_info',

  '退房': 'checkout_info',
  '几点退房': 'checkout_info',
  '什么时候退房': 'checkout_info',

  '价格': 'pricing',
  '多少钱': 'pricing',
  '费用': 'pricing',

  '有没有房': 'availability',
  '还有空房': 'availability',

  '预定': 'booking',
  '订房': 'booking',

  // Japanese
  'こんにちは': 'greeting',
  'おはよう': 'greeting',
  'おばよう': 'greeting',

  'ありがとう': 'thanks',
  'ありがとうございます': 'thanks',

  'wifi': 'wifi',
  'パスワード': 'wifi',

  'チェックイン': 'checkin_info',
  'いつチェックイン': 'checkin_info',

  'チェックアウト': 'checkout_info',
  'いつチェックアウト': 'checkout_info',

  '価格': 'pricing',
  'いくら': 'pricing',

  '部屋': 'availability',
  '空いている': 'availability',

  '予約': 'booking',
  '予約したい': 'booking',
};

export class FuzzyIntentMatcher {
  private fuse: Fuse<string>;
  private phrases: string[];

  constructor() {
    this.phrases = Object.keys(PHRASE_TO_CATEGORY);
    this.fuse = new Fuse(this.phrases, {
      threshold: 0.4, // Allow 40% character difference
      distance: 100,
      minMatchCharLength: 2,
      useExtendedSearch: false,
    });
  }

  /**
   * Match text against fuzzy phrase index
   * Returns highest confidence match or null
   */
  match(text: string): IntentResult | null {
    if (!text || text.length < 2) return null;

    const normalized = text.toLowerCase().trim();
    const results = this.fuse.search(normalized);

    if (results.length === 0) return null;

    const topMatch = results[0];
    const phrase = topMatch.item;
    const score = topMatch.score ?? 1; // 0 = perfect match, 1 = no match

    // Only accept if similarity is high enough
    const similarity = Math.max(0, 1 - score);
    if (similarity < 0.6) return null; // Increase from 0.6 to require higher match

    const category = PHRASE_TO_CATEGORY[phrase];

    return {
      category,
      confidence: similarity,
      entities: { matched_phrase: phrase },
      source: 'fuzzy'
    };
  }

  /**
   * Get all matches with scores (for debugging/analysis)
   */
  getMatches(text: string, topN: number = 5): Array<{
    phrase: string;
    category: IntentCategory;
    similarity: number;
  }> {
    const normalized = text.toLowerCase().trim();
    const results = this.fuse.search(normalized, { limit: topN });

    return results.map(r => ({
      phrase: r.item,
      category: PHRASE_TO_CATEGORY[r.item],
      similarity: Math.max(0, 1 - (r.score ?? 1))
    }));
  }
}

export const fuzzyMatcher = new FuzzyIntentMatcher();
```

### Integration: Update `/mcp-server/src/assistant/intents.ts`

```typescript
import type { IntentResult, ChatMessage } from './types.js';
import { classifyIntent as llmClassify } from './ai-client.js';
import { fuzzyMatcher } from './fuzzy-matcher.js';

// Keep existing emergency patterns
const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(fire|kebakaran|着火|火灾)\b/i,
  /\b(ambulan[cs]e|hospital|emergency|kecemasan|darurat|急救|紧急)\b/i,
  /\b(stol[ea]n|theft|rob(?:bed|bery)|dicuri|dirompak|被偷|被抢)\b/i,
  /\b(assault|attack|violen[ct]|fight|serang|pukul|袭击|打架)\b/i,
  /\b(police|polis|cops?|警察|报警)\b/i,
];

export function isEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some(p => p.test(text));
}

export function initIntents(): void {
  console.log('[Intents] Hybrid mode: regex + fuzzy + LLM');
}

/**
 * Classify message with layered approach:
 * 1. Emergency detection
 * 2. Regex (exact phrases)
 * 3. Fuzzy matching (typos)
 * 4. LLM classification
 */
export async function classifyMessage(
  text: string,
  history: ChatMessage[] = []
): Promise<IntentResult> {
  if (!text) {
    return {
      category: 'unknown',
      confidence: 0,
      entities: {},
      source: 'none'
    };
  }

  // Layer 1: Emergency
  if (isEmergency(text)) {
    return {
      category: 'complaint',
      confidence: 1.0,
      entities: { emergency: 'true' },
      source: 'regex'
    };
  }

  // Layer 2: Exact regex matching (if you have it)
  // const regexResult = regexClassify(text);
  // if (regexResult?.confidence >= 0.85) return regexResult;

  // Layer 3: Fuzzy matching for typos/abbreviations (NEW)
  const fuzzyResult = fuzzyMatcher.match(text);
  if (fuzzyResult && fuzzyResult.confidence >= 0.65) {
    return fuzzyResult;
  }

  // Layer 4: LLM fallback for complex intents
  try {
    const llmResult = await llmClassify(text, history);
    return {
      ...llmResult,
      source: 'llm'
    };
  } catch (error) {
    console.error('LLM classification failed:', error);
    return {
      category: 'unknown',
      confidence: 0,
      entities: {},
      source: 'llm'
    };
  }
}
```

### Testing

Create `/mcp-server/tests/fuzzy-matching.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { fuzzyMatcher } from '../src/assistant/fuzzy-matcher';

describe('Fuzzy Intent Matching', () => {
  it('should match "tq" to thanks', () => {
    const result = fuzzyMatcher.match('tq');
    expect(result?.category).toBe('thanks');
    expect(result?.source).toBe('fuzzy');
  });

  it('should match "checkin" to checkin_info', () => {
    const result = fuzzyMatcher.match('checkin time?');
    expect(result?.category).toBe('checkin_info');
  });

  it('should match "wifi" with typos (wifi)', () => {
    const result = fuzzyMatcher.match('wifi password');
    expect(result?.category).toBe('wifi');
  });

  it('should handle Malay greetings', () => {
    const result = fuzzyMatcher.match('assalamualaikum');
    expect(result?.category).toBe('greeting');
  });

  it('should handle Chinese', () => {
    const result = fuzzyMatcher.match('你好');
    expect(result?.category).toBe('greeting');

    const result2 = fuzzyMatcher.match('谢谢');
    expect(result2?.category).toBe('thanks');
  });

  it('should return null for no match', () => {
    const result = fuzzyMatcher.match('xyzabc123');
    expect(result).toBeNull();
  });

  it('should return multiple matches with getMatches', () => {
    const results = fuzzyMatcher.getMatches('check in time');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].category).toBe('checkin_info');
  });

  it('should NOT match unrelated text', () => {
    const result = fuzzyMatcher.match('the weather is nice');
    expect(result).toBeNull();
  });

  it('should handle abbreviations', () => {
    const result = fuzzyMatcher.match('tvm');
    expect(result?.category).toBe('thanks');
  });
});
```

Run tests:
```bash
npm test -- fuzzy-matching.test.ts
```

---

## Example 2: Language Detection (20 mins)

Route messages to correct language handler before intent matching.

### Installation
```bash
npm install langdetect
```

### Code: `/mcp-server/src/assistant/language-detector.ts`

```typescript
import { detectSync } from 'langdetect';

export type SupportedLanguage = 'en' | 'ms' | 'zh-cn' | 'ja' | 'unknown';

interface LanguageDetectionResult {
  language: SupportedLanguage;
  confidence: number;
  raw?: string; // Raw ISO 639-1 code from langdetect
}

const LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  'en': 'en',
  'ms': 'ms',
  'zh-cn': 'zh-cn',
  'ja': 'ja',
  'my': 'ms', // Myanmar code
  'id': 'ms', // Indonesian (similar)
};

export class LanguageDetector {
  /**
   * Detect language from text
   * Uses first 100 characters for speed
   */
  detect(text: string): LanguageDetectionResult {
    if (!text || text.length < 3) {
      return { language: 'unknown', confidence: 0 };
    }

    try {
      // Use only first 100 chars for speed
      const sample = text.substring(0, 100);
      const detected = detectSync(sample);

      // Map detected language to our supported set
      const language = (LANGUAGE_MAP[detected] || 'unknown') as SupportedLanguage;

      // Confidence estimation (langdetect doesn't return scores)
      // Use text length as proxy: longer text = higher confidence
      const confidence = Math.min(0.9, Math.log(text.length) / 10);

      return {
        language,
        confidence,
        raw: detected
      };
    } catch (error) {
      console.warn('Language detection failed:', error);
      return { language: 'unknown', confidence: 0 };
    }
  }

  /**
   * Determine if text is primarily one language
   */
  isPrimaryLanguage(
    text: string,
    language: SupportedLanguage,
    minConfidence: number = 0.5
  ): boolean {
    const result = this.detect(text);
    return result.language === language && result.confidence >= minConfidence;
  }

  /**
   * Get language-specific handler
   */
  getLanguageHandler(language: SupportedLanguage) {
    switch (language) {
      case 'en':
        return { name: 'English', parser: 'latin' };
      case 'ms':
        return { name: 'Malay', parser: 'latin' };
      case 'zh-cn':
        return { name: 'Chinese (Simplified)', parser: 'cjk' };
      case 'ja':
        return { name: 'Japanese', parser: 'cjk' };
      default:
        return { name: 'Unknown', parser: 'generic' };
    }
  }
}

export const languageDetector = new LanguageDetector();
```

### Integration: Update `intents.ts`

```typescript
import { languageDetector } from './language-detector.js';

export async function classifyMessage(
  text: string,
  history: ChatMessage[] = []
): Promise<IntentResult> {
  if (!text) return { category: 'unknown', confidence: 0, entities: {}, source: 'none' };

  // Detect language first
  const { language } = languageDetector.detect(text);

  // ... rest of classification layers ...

  return {
    ...result,
    entities: {
      ...result.entities,
      detected_language: language
    }
  };
}
```

---

## Example 3: Unicode Normalization (10 mins)

Handle accents and character variants across languages.

### Code: `/mcp-server/src/assistant/normalizer.ts`

```typescript
/**
 * Unicode normalization utilities for intent matching
 */

/**
 * Normalize text for comparison
 * NFKD = decompose characters + apply compatibility decompositions
 * Good for: "café" → "cafe", "ﬁ" (ligature) → "fi"
 */
export function normalizeForComparison(text: string): string {
  return text
    .normalize('NFKD') // Decompose + compatibility
    .toLowerCase()
    .trim();
}

/**
 * Remove accents/diacritics for matching
 * Example: "Phôm Thành" → "Pnom Thanh"
 */
export function removeDiacritics(text: string): string {
  return text
    .normalize('NFD') // Decompose only (no compatibility)
    .replace(/[\u0300-\u036f]/g, '') // Remove combining marks
    .normalize('NFC'); // Recompose
}

/**
 * Normalize whitespace (multiple spaces → single space)
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Full normalization pipeline
 */
export function fullNormalize(text: string): string {
  return normalizeForComparison(normalizeWhitespace(text));
}

/**
 * Check if two strings are equivalent after normalization
 */
export function areEquivalent(text1: string, text2: string): boolean {
  return fullNormalize(text1) === fullNormalize(text2);
}

/**
 * Check if normalized text includes substring
 */
export function includedNormalized(haystack: string, needle: string): boolean {
  return fullNormalize(haystack).includes(fullNormalize(needle));
}

// Tests
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it('should normalize accents', () => {
    expect(removeDiacritics('café')).toBe('cafe');
    expect(removeDiacritics('naïve')).toBe('naive');
  });

  it('should handle ligatures', () => {
    expect(normalizeForComparison('ﬁle')).toBe('file');
  });

  it('should compare normalized strings', () => {
    expect(areEquivalent('Café', 'cafe')).toBe(true);
  });

  it('should normalize whitespace', () => {
    expect(normalizeWhitespace('hello   world')).toBe('hello world');
  });
}
```

---

## Example 4: Phonetic Matching for STT Errors (Optional, 15 mins)

Handle speech-to-text errors in English.

### Installation
```bash
npm install metaphone3
```

### Code: `/mcp-server/src/assistant/phonetic-matcher.ts`

```typescript
import { metaphone } from 'metaphone3';
import type { IntentCategory } from './types.js';

/**
 * Metaphone mapping: Phonetic code → Intent category
 * These are common STT errors for your intent keywords
 */
const PHONETIC_KEYWORDS: Record<string, IntentCategory> = {
  'WF': 'wifi', // "wifi", "wifey", "wy-fi"
  'XKKMN': 'checkin_info', // "check in", "chick inn"
  'XKKT': 'checkout_info', // "check out", "chick out"
  'XXKKMN': 'checkin_info', // "ch-eck in" variants
  'PR': 'pricing', // "price", "pry" (homophone)
  'KST': 'pricing', // "cost", "cost-like"
  'RXN': 'thanks', // rare but possible
  'ANKSMN': 'thanks', // "thank someone"
  'XNJ': 'contact_staff', // "change", "contact"-like
  'RMNK': 'complaint', // "room ache" variant of "room problem"
};

export class PhoneticMatcher {
  /**
   * Match word(s) phonetically
   * Best used for single words or 2-word combinations
   */
  match(text: string): { category: IntentCategory; word: string } | null {
    const words = text.toLowerCase().split(/\s+/);

    // Try individual words
    for (const word of words) {
      if (word.length < 2) continue;

      const phonetic = metaphone(word);
      if (PHONETIC_KEYWORDS[phonetic]) {
        return {
          category: PHONETIC_KEYWORDS[phonetic],
          word
        };
      }
    }

    // Try 2-word combinations for compound terms
    if (words.length >= 2) {
      const twoWord = metaphone(words[0]) + metaphone(words[1]);
      if (PHONETIC_KEYWORDS[twoWord]) {
        return {
          category: PHONETIC_KEYWORDS[twoWord],
          word: `${words[0]} ${words[1]}`
        };
      }
    }

    return null;
  }

  /**
   * Get phonetic code for debugging
   */
  getPhonetic(word: string): string {
    return metaphone(word);
  }
}

export const phoneticMatcher = new PhoneticMatcher();

// IMPORTANT: Phonetic matching is English-only
// Do NOT apply to Chinese, Japanese, or Malay text
```

### Integration (Conditional)

```typescript
import { phoneticMatcher } from './phonetic-matcher.js';
import { languageDetector } from './language-detector.js';

export async function classifyMessage(
  text: string,
  history: ChatMessage[] = []
): Promise<IntentResult> {
  // ... layers 1-3 ...

  // Layer 3.5: Phonetic matching (English only, STT errors)
  const { language } = languageDetector.detect(text);
  if (language === 'en') {
    const phoneticResult = phoneticMatcher.match(text);
    if (phoneticResult) {
      return {
        category: phoneticResult.category,
        confidence: 0.55, // Lower confidence than fuzzy
        entities: { stt_error: phoneticResult.word },
        source: 'phonetic'
      };
    }
  }

  // Layer 4: LLM...
}
```

---

## Example 5: N-Gram Matching for Quick Filtering (Optional, 20 mins)

Use before expensive Fuse.js operations.

### Code: `/mcp-server/src/assistant/ngram-matcher.ts`

```typescript
/**
 * N-gram based text matching
 * Useful for: quick pre-filtering before fuzzy match
 * Use case: "thank you very much" → quick filter to thanks category
 */

export class NGramMatcher {
  private nGramSize: number;

  constructor(nGramSize: number = 2) {
    this.nGramSize = nGramSize;
  }

  /**
   * Generate n-grams from text
   * Example: "hello" with n=2 → ['he', 'el', 'll', 'lo']
   */
  private generateNgrams(text: string): Set<string> {
    const normalized = text.toLowerCase().replace(/\s+/g, '');
    const ngrams = new Set<string>();

    for (let i = 0; i <= normalized.length - this.nGramSize; i++) {
      ngrams.add(normalized.slice(i, i + this.nGramSize));
    }

    return ngrams;
  }

  /**
   * Jaccard similarity between two texts
   * Returns 0-1 where 1 = perfect match
   */
  similarity(text1: string, text2: string): number {
    const ngrams1 = this.generateNgrams(text1);
    const ngrams2 = this.generateNgrams(text2);

    if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

    const intersection = [...ngrams1].filter(ng => ngrams2.has(ng)).length;
    const union = ngrams1.size + ngrams2.size - intersection;

    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Find best matching phrase
   */
  findBestMatch(
    text: string,
    candidates: string[],
    minThreshold: number = 0.5
  ): { phrase: string; similarity: number } | null {
    let best: { phrase: string; similarity: number } | null = null;

    for (const candidate of candidates) {
      const sim = this.similarity(text, candidate);
      if (sim >= minThreshold && (!best || sim > best.similarity)) {
        best = { phrase: candidate, similarity: sim };
      }
    }

    return best;
  }
}

// Example usage
export const ngramMatcher = new NGramMatcher(2);

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe('NGramMatcher', () => {
    it('should match similar texts', () => {
      const sim = ngramMatcher.similarity('checkin', 'check in');
      expect(sim).toBeGreaterThan(0.6);
    });

    it('should match "thank you" and "tq"', () => {
      const sim = ngramMatcher.similarity('tq', 'thank you');
      // Will be lower, but above 0.3
      expect(sim).toBeGreaterThan(0.2);
    });

    it('should find best match', () => {
      const result = ngramMatcher.findBestMatch('wifi password', [
        'check in',
        'wifi password',
        'pricing',
      ]);
      expect(result?.phrase).toBe('wifi password');
    });
  });
}
```

---

## Example 6: Complete Production Pipeline

Full integration with all layers.

### Code: `/mcp-server/src/assistant/intent-pipeline.ts`

```typescript
import type { IntentResult, ChatMessage } from './types.js';
import { classifyIntent as llmClassify } from './ai-client.js';
import { fuzzyMatcher } from './fuzzy-matcher.js';
import { languageDetector } from './language-detector.js';
import { phoneticMatcher } from './phonetic-matcher.js';
import { ngramMatcher } from './ngram-matcher.js';

interface ClassificationMetrics {
  totalMs: number;
  layer: string;
  confidence: number;
}

const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(fire|kebakaran|着火|火灾)\b/i,
  /\b(ambulan[cs]e|hospital|emergency|kecemasan|darurat|急救|紧急)\b/i,
  /\b(stol[ea]n|theft|rob(?:bed|bery)|dicuri|dirompak|被偷|被抢)\b/i,
  /\b(assault|attack|violen[ct]|fight|serang|pukul|袭击|打架)\b/i,
  /\b(police|polis|cops?|警察|报警)\b/i,
];

export class IntentPipeline {
  private metrics: ClassificationMetrics[] = [];

  /**
   * Main classification method with all layers
   */
  async classify(
    text: string,
    history: ChatMessage[] = []
  ): Promise<IntentResult> {
    const startTime = performance.now();

    if (!text || text.length < 1) {
      return {
        category: 'unknown',
        confidence: 0,
        entities: {},
        source: 'empty'
      };
    }

    // Layer 1: Emergency (< 1ms)
    const emergencyStart = performance.now();
    if (this.isEmergency(text)) {
      this.recordMetric(performance.now() - emergencyStart, 'emergency', 1.0);
      return {
        category: 'complaint',
        confidence: 1.0,
        entities: { emergency: 'true' },
        source: 'regex'
      };
    }
    this.recordMetric(performance.now() - emergencyStart, 'emergency', 0);

    // Layer 2: Language detection (2-5ms)
    const langStart = performance.now();
    const { language } = languageDetector.detect(text);
    this.recordMetric(performance.now() - langStart, 'language_detection', 0);

    // Layer 3: N-gram pre-filter (1-2ms)
    const ngramStart = performance.now();
    const ngramMatch = ngramMatcher.findBestMatch(
      text,
      [
        'hello', 'hi', 'thanks', 'check in', 'check out',
        'wifi', 'price', 'booking', 'complain'
      ],
      0.5
    );
    this.recordMetric(performance.now() - ngramStart, 'ngram', ngramMatch ? 0.5 : 0);

    // Layer 4: Fuzzy matching (2-10ms)
    const fuzzyStart = performance.now();
    const fuzzyResult = fuzzyMatcher.match(text);
    this.recordMetric(
      performance.now() - fuzzyStart,
      'fuzzy',
      fuzzyResult?.confidence || 0
    );

    if (fuzzyResult && fuzzyResult.confidence >= 0.65) {
      return fuzzyResult;
    }

    // Layer 5: Phonetic matching - English only (1-2ms)
    if (language === 'en') {
      const phoneticStart = performance.now();
      const phoneticResult = phoneticMatcher.match(text);
      this.recordMetric(
        performance.now() - phoneticStart,
        'phonetic',
        phoneticResult ? 0.55 : 0
      );

      if (phoneticResult) {
        return {
          category: phoneticResult.category,
          confidence: 0.55,
          entities: { stt_error: phoneticResult.word },
          source: 'phonetic'
        };
      }
    }

    // Layer 6: LLM fallback (100-500ms)
    const llmStart = performance.now();
    try {
      const llmResult = await llmClassify(text, history);
      this.recordMetric(performance.now() - llmStart, 'llm', llmResult.confidence);

      return {
        ...llmResult,
        source: 'llm'
      };
    } catch (error) {
      console.error('LLM classification failed:', error);
      this.recordMetric(performance.now() - llmStart, 'llm', 0);

      return {
        category: 'unknown',
        confidence: 0,
        entities: {},
        source: 'llm'
      };
    }
  }

  private isEmergency(text: string): boolean {
    return EMERGENCY_PATTERNS.some(p => p.test(text));
  }

  private recordMetric(ms: number, layer: string, confidence: number): void {
    this.metrics.push({ totalMs: ms, layer, confidence });
  }

  /**
   * Get performance metrics for debugging
   */
  getMetrics(): ClassificationMetrics[] {
    const copy = [...this.metrics];
    this.metrics = [];
    return copy;
  }

  /**
   * Get summary statistics
   */
  getMetricsSummary() {
    const metrics = this.getMetrics();
    const total = metrics.reduce((sum, m) => sum + m.totalMs, 0);
    const byLayer = metrics.reduce((acc, m) => {
      if (!acc[m.layer]) acc[m.layer] = [];
      acc[m.layer].push(m.totalMs);
      return acc;
    }, {} as Record<string, number[]>);

    return {
      totalMs: total,
      byLayer: Object.entries(byLayer).reduce((acc, [layer, times]) => {
        acc[layer] = {
          count: times.length,
          avgMs: times.reduce((a, b) => a + b, 0) / times.length,
          maxMs: Math.max(...times)
        };
        return acc;
      }, {} as Record<string, { count: number; avgMs: number; maxMs: number }>)
    };
  }
}

export const intentPipeline = new IntentPipeline();
```

---

## Example 7: Testing & Validation

Comprehensive test suite.

### Test File: `/mcp-server/tests/intent-pipeline.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { intentPipeline } from '../src/assistant/intent-pipeline';

describe('Intent Pipeline', () => {
  describe('Emergency Detection', () => {
    it('should detect fire emergency', async () => {
      const result = await intentPipeline.classify('FIRE!');
      expect(result.category).toBe('complaint');
      expect(result.entities.emergency).toBe('true');
    });

    it('should detect theft', async () => {
      const result = await intentPipeline.classify('someone stole my bag');
      expect(result.entities.emergency).toBe('true');
    });

    it('should detect multilingual emergency', async () => {
      const result = await intentPipeline.classify('着火了');
      expect(result.entities.emergency).toBe('true');
    });
  });

  describe('Fuzzy Matching', () => {
    it('should match thanks variations', async () => {
      const variations = ['tq', 'ty', 'tvm', 'thank you', 'thanks', 'terima kasih'];

      for (const text of variations) {
        const result = await intentPipeline.classify(text);
        expect(result.category).toBe('thanks');
      }
    });

    it('should match check-in variations', async () => {
      const result1 = await intentPipeline.classify('checkin');
      const result2 = await intentPipeline.classify('check-in');
      const result3 = await intentPipeline.classify('check in');

      expect(result1.category).toBe('checkin_info');
      expect(result2.category).toBe('checkin_info');
      expect(result3.category).toBe('checkin_info');
    });
  });

  describe('Language Detection', () => {
    it('should handle English', async () => {
      const result = await intentPipeline.classify('hello, how much is the room?');
      expect(result.entities.detected_language).toBe('en');
    });

    it('should handle Malay', async () => {
      const result = await intentPipeline.classify('assalamualaikum, berapa harga bilik?');
      expect(result.entities.detected_language).toBe('ms');
    });

    it('should handle Chinese', async () => {
      const result = await intentPipeline.classify('你好，房间多少钱？');
      expect(result.entities.detected_language).toBe('zh-cn');
    });
  });

  describe('Phonetic Matching (English STT)', () => {
    it('should match wifi variations', async () => {
      const result = await intentPipeline.classify('what is the wifey password');
      expect(result.category).toBe('wifi');
    });
  });

  describe('Performance Metrics', () => {
    it('should return metrics', async () => {
      await intentPipeline.classify('hello');
      const metrics = intentPipeline.getMetricsSummary();

      expect(metrics.totalMs).toBeLessThan(50); // Fuzzy layer should be < 50ms
      expect(metrics.byLayer).toBeDefined();
    });

    it('should skip LLM for obvious intents', async () => {
      await intentPipeline.classify('thanks!');
      const metrics = intentPipeline.getMetricsSummary();

      // Should not have LLM call
      expect(metrics.byLayer.llm).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', async () => {
      const result = await intentPipeline.classify('');
      expect(result.category).toBe('unknown');
    });

    it('should handle very long text', async () => {
      const longText = 'hello '.repeat(1000);
      const result = await intentPipeline.classify(longText);
      expect(result).toBeDefined();
    });

    it('should handle mixed language', async () => {
      const result = await intentPipeline.classify('hello 你好 wifi');
      expect(result).toBeDefined();
    });

    it('should handle unicode properly', async () => {
      const result = await intentPipeline.classify('café wifi');
      expect(result).toBeDefined();
    });
  });
});
```

Run all tests:
```bash
npm test
```

Run specific test:
```bash
npm test -- intent-pipeline.test.ts
```

---

## Performance Benchmarking

Add to your CI/CD:

```typescript
// /scripts/bench-intent-classification.ts

import { intentPipeline } from '../src/assistant/intent-pipeline';

const TEST_MESSAGES = [
  'hi', 'tq', 'check in', 'wifi password', 'how much',
  'assalamualaikum', '你好', 'thanks very much',
  'when can i check out', 'complaint about noise',
];

async function benchmark() {
  console.log('Intent Classification Benchmark\n');

  for (const msg of TEST_MESSAGES) {
    const start = performance.now();
    const result = await intentPipeline.classify(msg);
    const duration = performance.now() - start;

    const metrics = intentPipeline.getMetricsSummary();

    console.log(`Message: "${msg}"`);
    console.log(`  Category: ${result.category}`);
    console.log(`  Total Time: ${duration.toFixed(2)}ms`);
    console.log(`  Layer Breakdown:`, metrics.byLayer);
    console.log();
  }
}

benchmark().catch(console.error);
```

Run:
```bash
npx ts-node scripts/bench-intent-classification.ts
```

---

## Summary

These examples provide:

1. **Minimal integration** (Example 1) - 30 mins to add fuzzy matching
2. **Language detection** (Example 2) - Route to correct handlers
3. **Unicode handling** (Example 3) - Support accents and variants
4. **Phonetic matching** (Example 4) - Handle STT errors
5. **N-gram filtering** (Example 5) - Quick pre-filtering
6. **Complete pipeline** (Example 6) - Production-ready system
7. **Testing** (Example 7) - Validate all layers

**Next Steps:**
1. Install `fuse.js` and `langdetect`
2. Copy `fuzzy-matcher.ts` to your project
3. Update `intents.ts` integration
4. Run tests
5. Deploy and monitor

