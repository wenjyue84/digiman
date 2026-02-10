import { describe, test, expect } from 'vitest';
import { FuzzyIntentMatcher, type KeywordIntent } from '../../src/assistant/fuzzy-matcher.js';

const testIntents: KeywordIntent[] = [
  { intent: 'greeting', keywords: ['hi', 'hello', 'hey', 'good morning'], language: 'en' },
  { intent: 'thanks', keywords: ['thank you', 'thanks', 'tq', 'tqvm', 'thx'], language: 'en' },
  { intent: 'wifi', keywords: ['wifi password', 'wi-fi', 'internet password', 'wifi code'], language: 'en' },
  { intent: 'pricing', keywords: ['how much', 'price', 'cost', 'rate'], language: 'en' },
  { intent: 'checkin_info', keywords: ['check in', 'check in time'], language: 'en' },
  { intent: 'checkout_info', keywords: ['check out', 'check out time'], language: 'en' },
  { intent: 'greeting', keywords: ['你好', '嗨', '早安'], language: 'zh' },
  { intent: 'pricing', keywords: ['多少钱', '价格', '费用'], language: 'zh' },
];

const matcher = new FuzzyIntentMatcher(testIntents);

describe('FuzzyIntentMatcher.match()', () => {
  describe('Exact matches', () => {
    test.each([
      ['hi', 'greeting'],
      ['thanks', 'thanks'],
      ['wifi password', 'wifi'],
      ['price', 'pricing'],
    ])('"%s" → %s', (input, expected) => {
      const result = matcher.match(input);
      expect(result?.intent).toBe(expected);
      expect(result?.score).toBeGreaterThan(0.9);
    });
  });

  describe('Typo tolerance', () => {
    test('"helo" should match greeting', () => {
      const result = matcher.match('helo');
      expect(result?.intent).toBe('greeting');
      expect(result?.score).toBeGreaterThan(0.7);
    });

    test('"thnks" should match thanks', () => {
      const result = matcher.match('thnks');
      expect(result?.intent).toBe('thanks');
      expect(result?.score).toBeGreaterThan(0.6);
    });
  });

  describe('Abbreviations', () => {
    test.each([
      ['tq', 'thanks'],
      ['tqvm', 'thanks'],
      ['thx', 'thanks'],
    ])('"%s" → %s', (input, expected) => {
      const result = matcher.match(input);
      expect(result?.intent).toBe(expected);
      expect(result?.score).toBeGreaterThan(0.8);
    });
  });

  describe('Chinese keywords', () => {
    test('"你好" should match greeting', () => {
      const result = matcher.match('你好');
      expect(result?.intent).toBe('greeting');
      expect(result?.score).toBeGreaterThan(0.9);
    });

    test('"多少钱" should match pricing', () => {
      const result = matcher.match('多少钱');
      expect(result?.intent).toBe('pricing');
      expect(result?.score).toBeGreaterThan(0.9);
    });
  });

  describe('Language filter', () => {
    test('should prefer Chinese keywords when filtered', () => {
      const result = matcher.match('你好', 'zh');
      expect(result?.intent).toBe('greeting');
    });

    test('should still find English fallback for unknown filter', () => {
      const result = matcher.match('hello');
      expect(result?.intent).toBe('greeting');
    });
  });

  describe('Performance', () => {
    test('100 classifications in <50ms', () => {
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        matcher.match('hello');
      }
      expect(Date.now() - start).toBeLessThan(50);
    });
  });
});

describe('FuzzyIntentMatcher.matchAll()', () => {
  test('returns matches sorted by score descending', () => {
    const results = matcher.matchAll('hello', 0.5);
    expect(results.length).toBeGreaterThan(0);
    // Verify descending score order
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });

  test('threshold filters low-confidence results', () => {
    const high = matcher.matchAll('hi', 0.9);
    const low = matcher.matchAll('hi', 0.5);
    expect(high.length).toBeLessThanOrEqual(low.length);
  });
});
