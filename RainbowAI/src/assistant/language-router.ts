import { francAll } from 'franc-min';

export type SupportedLanguage = 'en' | 'ms' | 'zh' | 'unknown';

/**
 * Language Router - Detects message language and routes to appropriate keywords
 *
 * Supports: English (en), Malay (ms), Chinese (zh)
 * Uses franc-min for fast, accurate detection
 */
export class LanguageRouter {
  // ISO 639-3 codes used by franc
  private readonly languageMap: Record<string, SupportedLanguage> = {
    'eng': 'en',  // English
    'zsm': 'ms',  // Standard Malay
    'zlm': 'ms',  // Malay (generic)
    'ind': 'ms',  // Indonesian (close to Malay)
    'cmn': 'zh',  // Mandarin Chinese
    'zho': 'zh',  // Chinese (generic)
    'yue': 'zh',  // Cantonese
  };

  // Common patterns for quick detection (fallback)
  private readonly patterns = {
    zh: /[\u4e00-\u9fff\u3400-\u4dbf]/,  // Chinese characters
    ms: /\b(saya|anda|adalah|dengan|untuk|dari|yang|ini|itu|ada|tidak|boleh)\b/i,
    en: /\b(the|is|are|was|were|have|has|had|do|does|did|can|will|would)\b/i,
  };

  /**
   * Detect language from text
   * @param text Input text to analyze
   * @param minLength Minimum text length for reliable detection (default: 3)
   * @returns Detected language code
   */
  detectLanguage(text: string, minLength = 3): SupportedLanguage {
    const cleaned = text.trim();

    // Too short for reliable detection
    if (cleaned.length < minLength) {
      return 'unknown';
    }

    // Quick pattern-based detection (fast path)
    const patternResult = this.detectByPattern(cleaned);
    if (patternResult !== 'unknown') {
      return patternResult;
    }

    // Use franc for statistical detection
    try {
      const results = francAll(cleaned, { minLength });

      // No reliable detection
      if (results.length === 0 || results[0][0] === 'und') {
        return 'unknown';
      }

      // Map franc language code to our system
      const detectedCode = results[0][0];
      const mappedLang = this.languageMap[detectedCode];

      if (mappedLang) {
        return mappedLang;
      }

      // Check top 3 results for any match
      for (const [code, score] of results.slice(0, 3)) {
        if (this.languageMap[code]) {
          return this.languageMap[code];
        }
      }

      return 'unknown';
    } catch (error) {
      console.warn('[LanguageRouter] Detection error:', error);
      return 'unknown';
    }
  }

  /**
   * Fast pattern-based detection for obvious cases
   * @param text Input text
   * @returns Language code or 'unknown'
   */
  private detectByPattern(text: string): SupportedLanguage {
    // Check for Chinese characters (most reliable)
    if (this.patterns.zh.test(text)) {
      return 'zh';
    }

    // Count matches for Malay and English patterns
    const malayMatches = (text.match(this.patterns.ms) || []).length;
    const englishMatches = (text.match(this.patterns.en) || []).length;

    if (malayMatches > englishMatches && malayMatches > 0) {
      return 'ms';
    }

    if (englishMatches > malayMatches && englishMatches > 0) {
      return 'en';
    }

    return 'unknown';
  }

  /**
   * Detect language with confidence score
   * @param text Input text
   * @returns { language, confidence } object
   */
  detectWithConfidence(text: string): { language: SupportedLanguage; confidence: number } {
    const cleaned = text.trim();

    // Pattern-based detection (high confidence)
    if (this.patterns.zh.test(cleaned)) {
      return { language: 'zh', confidence: 0.95 };
    }

    // Use franc for statistical detection
    try {
      const results = francAll(cleaned, { minLength: 3 });

      if (results.length === 0 || results[0][0] === 'und') {
        return { language: 'unknown', confidence: 0 };
      }

      const [code, score] = results[0];
      const mappedLang = this.languageMap[code] || 'unknown';

      // Franc score is 0-1 (higher = more confident)
      return {
        language: mappedLang,
        confidence: score
      };
    } catch {
      return { language: 'unknown', confidence: 0 };
    }
  }

  /**
   * Get language-specific keywords for better matching
   * @param allKeywords All keyword groups
   * @param detectedLang Detected language
   * @returns Filtered keyword groups
   */
  filterKeywordsByLanguage<T extends { language?: string }>(
    allKeywords: T[],
    detectedLang: SupportedLanguage
  ): T[] {
    // If unknown, return all keywords
    if (detectedLang === 'unknown') {
      return allKeywords;
    }

    // Filter by detected language + English fallback
    return allKeywords.filter(keyword =>
      keyword.language === detectedLang ||
      keyword.language === 'en' ||       // Always include English as fallback
      !keyword.language                   // Include language-agnostic keywords
    );
  }

  /**
   * Get language name for display
   * @param code Language code
   * @returns Human-readable language name
   */
  getLanguageName(code: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
      'en': 'English',
      'ms': 'Malay',
      'zh': 'Chinese',
      'unknown': 'Unknown'
    };
    return names[code];
  }

  /**
   * Detect if message contains multiple languages (code-switching)
   * @param text Input text
   * @returns Array of detected languages
   */
  detectMixedLanguages(text: string): SupportedLanguage[] {
    const detected: Set<SupportedLanguage> = new Set();

    // Check for Chinese
    if (this.patterns.zh.test(text)) {
      detected.add('zh');
    }

    // Check for Malay patterns
    if (this.patterns.ms.test(text)) {
      detected.add('ms');
    }

    // Check for English patterns
    if (this.patterns.en.test(text)) {
      detected.add('en');
    }

    return Array.from(detected);
  }
}

// Singleton instance
export const languageRouter = new LanguageRouter();
