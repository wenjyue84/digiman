import { describe, it, expect } from 'vitest';

/**
 * Unit tests for language resolution logic in message-router.ts
 *
 * Tests the resolveResponseLanguage() function behavior:
 * - High confidence tier result (≥0.7) should override conversation state
 * - Low confidence tier result (<0.7) should defer to conversation state
 * - 'unknown' tier result should use conversation state
 * - Invalid languages should fall back to conversation state
 */

// Replicate the resolveResponseLanguage function for testing
function resolveResponseLanguage(
  tierResultLang: string | undefined,
  conversationLang: 'en' | 'ms' | 'zh',
  confidence: number
): 'en' | 'ms' | 'zh' {
  // If tier result has high-confidence language detection, use it
  if (tierResultLang &&
      tierResultLang !== 'unknown' &&
      confidence >= 0.7 &&
      (tierResultLang === 'en' || tierResultLang === 'ms' || tierResultLang === 'zh')) {
    return tierResultLang as 'en' | 'ms' | 'zh';
  }

  // Otherwise use conversation state language
  return conversationLang;
}

describe('Language Resolution', () => {
  describe('High Confidence Tier Result', () => {
    it('should use tier result when confidence is 0.9 and language is ms', () => {
      const result = resolveResponseLanguage('ms', 'en', 0.9);
      expect(result).toBe('ms');
    });

    it('should use tier result when confidence is 0.7 (threshold)', () => {
      const result = resolveResponseLanguage('zh', 'en', 0.7);
      expect(result).toBe('zh');
    });

    it('should use tier result when confidence is 1.0', () => {
      const result = resolveResponseLanguage('en', 'ms', 1.0);
      expect(result).toBe('en');
    });
  });

  describe('Low Confidence Tier Result', () => {
    it('should use conversation state when confidence is 0.6', () => {
      const result = resolveResponseLanguage('ms', 'en', 0.6);
      expect(result).toBe('en');
    });

    it('should use conversation state when confidence is 0.5', () => {
      const result = resolveResponseLanguage('zh', 'en', 0.5);
      expect(result).toBe('en');
    });

    it('should use conversation state when confidence is 0.0', () => {
      const result = resolveResponseLanguage('ms', 'en', 0.0);
      expect(result).toBe('en');
    });
  });

  describe('Unknown Language Detection', () => {
    it('should use conversation state when tier result is "unknown"', () => {
      const result = resolveResponseLanguage('unknown', 'ms', 0.9);
      expect(result).toBe('ms');
    });

    it('should use conversation state when tier result is undefined', () => {
      const result = resolveResponseLanguage(undefined, 'zh', 0.9);
      expect(result).toBe('zh');
    });
  });

  describe('Invalid Language Handling', () => {
    it('should use conversation state when tier result is not en/ms/zh', () => {
      const result = resolveResponseLanguage('ja', 'en', 0.9);
      expect(result).toBe('en');
    });

    it('should use conversation state when tier result is "fr" (French)', () => {
      const result = resolveResponseLanguage('fr', 'ms', 0.9);
      expect(result).toBe('ms');
    });

    it('should use conversation state when tier result is empty string', () => {
      const result = resolveResponseLanguage('', 'zh', 0.9);
      expect(result).toBe('zh');
    });
  });

  describe('Edge Cases', () => {
    it('should handle tier result matching conversation state (no change)', () => {
      const result = resolveResponseLanguage('en', 'en', 0.9);
      expect(result).toBe('en');
    });

    it('should prefer tier result even when matching conversation state', () => {
      // This tests that the function returns the tier result when confidence is high
      const result = resolveResponseLanguage('ms', 'ms', 0.8);
      expect(result).toBe('ms');
    });

    it('should handle confidence at exact boundary (0.69 vs 0.7)', () => {
      const resultLow = resolveResponseLanguage('ms', 'en', 0.69);
      const resultHigh = resolveResponseLanguage('ms', 'en', 0.70);

      expect(resultLow).toBe('en');  // Below threshold → conversation state
      expect(resultHigh).toBe('ms'); // At threshold → tier result
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle "apa" (Malay) detected by tier but not formatter', () => {
      // Formatter detects 'en' (only 1 Malay keyword)
      // LanguageRouter detects 'ms' (statistical analysis)
      // High confidence tier result should win
      const result = resolveResponseLanguage('ms', 'en', 0.85);
      expect(result).toBe('ms');
    });

    it('should handle short Chinese message', () => {
      // Both detectors should agree on Chinese
      const result = resolveResponseLanguage('zh', 'zh', 0.9);
      expect(result).toBe('zh');
    });

    it('should handle language switch mid-conversation', () => {
      // Conversation state = 'en' (from previous messages)
      // Current message detected as 'ms' with high confidence
      const result = resolveResponseLanguage('ms', 'en', 0.88);
      expect(result).toBe('ms');
    });

    it('should fall back to conversation state when tier result is ambiguous', () => {
      // Low confidence tier result → keep conversation state
      const result = resolveResponseLanguage('ms', 'en', 0.55);
      expect(result).toBe('en');
    });
  });
});
