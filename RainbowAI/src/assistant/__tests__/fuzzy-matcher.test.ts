import { FuzzyIntentMatcher, type KeywordIntent } from '../fuzzy-matcher.js';

describe('FuzzyIntentMatcher', () => {
  const testIntents: KeywordIntent[] = [
    {
      intent: 'greeting',
      keywords: ['hi', 'hello', 'hey', 'good morning'],
      language: 'en'
    },
    {
      intent: 'thanks',
      keywords: ['thank you', 'thanks', 'tq', 'tqvm', 'thx'],
      language: 'en'
    },
    {
      intent: 'wifi',
      keywords: ['wifi password', 'wi-fi', 'internet password', 'wifi code'],
      language: 'en'
    },
    {
      intent: 'greeting',
      keywords: ['你好', '嗨', '早安'],
      language: 'zh'
    }
  ];

  const matcher = new FuzzyIntentMatcher(testIntents);

  describe('Exact Matches', () => {
    test('should match exact keyword "hi"', () => {
      const result = matcher.match('hi');
      expect(result?.intent).toBe('greeting');
      expect(result?.score).toBeGreaterThan(0.9);
    });

    test('should match exact keyword "thanks"', () => {
      const result = matcher.match('thanks');
      expect(result?.intent).toBe('thanks');
      expect(result?.score).toBeGreaterThan(0.9);
    });

    test('should match "wifi password"', () => {
      const result = matcher.match('wifi password');
      expect(result?.intent).toBe('wifi');
      expect(result?.score).toBeGreaterThan(0.9);
    });
  });

  describe('Typo Tolerance', () => {
    test('should match "thnks" (typo in thanks)', () => {
      const result = matcher.match('thnks');
      expect(result?.intent).toBe('thanks');
      expect(result?.score).toBeGreaterThan(0.6);
    });

    test('should match "helo" (typo in hello)', () => {
      const result = matcher.match('helo');
      expect(result?.intent).toBe('greeting');
      expect(result?.score).toBeGreaterThan(0.7);
    });

    test('should match "wify pasword" (typos)', () => {
      const result = matcher.match('wify pasword');
      expect(result?.intent).toBe('wifi');
      expect(result?.score).toBeGreaterThan(0.5);
    });
  });

  describe('Abbreviations', () => {
    test('should match "tq" abbreviation', () => {
      const result = matcher.match('tq');
      expect(result?.intent).toBe('thanks');
      expect(result?.score).toBeGreaterThan(0.9);
    });

    test('should match "tqvm" abbreviation', () => {
      const result = matcher.match('tqvm');
      expect(result?.intent).toBe('thanks');
      expect(result?.score).toBeGreaterThan(0.9);
    });

    test('should match "thx" abbreviation', () => {
      const result = matcher.match('thx');
      expect(result?.intent).toBe('thanks');
      expect(result?.score).toBeGreaterThan(0.8);
    });
  });

  describe('Case Insensitivity', () => {
    test('should match "HI" (uppercase)', () => {
      const result = matcher.match('HI');
      expect(result?.intent).toBe('greeting');
      expect(result?.score).toBeGreaterThan(0.9);
    });

    test('should match "THANKS" (uppercase)', () => {
      const result = matcher.match('THANKS');
      expect(result?.intent).toBe('thanks');
      expect(result?.score).toBeGreaterThan(0.9);
    });

    test('should match "WiFi PaSsWoRd" (mixed case)', () => {
      const result = matcher.match('WiFi PaSsWoRd');
      expect(result?.intent).toBe('wifi');
      expect(result?.score).toBeGreaterThan(0.8);
    });
  });

  describe('Partial Matches in Sentences', () => {
    test('should match "hi there!"', () => {
      const result = matcher.match('hi there!');
      expect(result?.intent).toBe('greeting');
      expect(result?.score).toBeGreaterThan(0.7);
    });

    test('should match "what\'s the wifi password?"', () => {
      const result = matcher.match("what's the wifi password?");
      expect(result?.intent).toBe('wifi');
      expect(result?.score).toBeGreaterThan(0.7);
    });

    test('should match "good morning!" ', () => {
      const result = matcher.match('good morning!');
      expect(result?.intent).toBe('greeting');
      expect(result?.score).toBeGreaterThan(0.8);
    });
  });

  describe('Multi-language Support', () => {
    test('should match Chinese greeting "你好"', () => {
      const result = matcher.match('你好');
      expect(result?.intent).toBe('greeting');
      expect(result?.score).toBeGreaterThan(0.9);
    });

    test('should match Chinese "嗨"', () => {
      const result = matcher.match('嗨');
      expect(result?.intent).toBe('greeting');
      expect(result?.score).toBeGreaterThan(0.9);
    });
  });

  describe('No Match Scenarios', () => {
    test('should return null for completely unrelated text', () => {
      const result = matcher.match('xyz random gibberish text 12345');
      // May return null or low confidence result
      if (result) {
        expect(result.score).toBeLessThan(0.5);
      }
    });
  });

  describe('matchAll method', () => {
    test('should return multiple matches for ambiguous text', () => {
      const results = matcher.matchAll('hi thanks', 0.5);
      expect(results.length).toBeGreaterThan(0);
      // Should match both greeting and thanks with some confidence
      const intents = results.map(r => r.intent);
      expect(intents).toContain('greeting');
      expect(intents).toContain('thanks');
    });

    test('should filter by threshold', () => {
      const highThreshold = matcher.matchAll('hi', 0.9);
      const lowThreshold = matcher.matchAll('hi', 0.5);

      expect(highThreshold.length).toBeLessThanOrEqual(lowThreshold.length);
    });
  });

  describe('Performance', () => {
    test('should classify quickly (<50ms)', () => {
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        matcher.match('hello');
      }
      const elapsed = Date.now() - start;

      // 100 classifications should take less than 50ms
      expect(elapsed).toBeLessThan(50);
    });
  });
});

describe('Real-world Test Cases', () => {
  // Using actual keywords from intent-keywords.json structure
  const realWorldIntents: KeywordIntent[] = [
    { intent: 'greeting', keywords: ['hi', 'hello', 'hey'], language: 'en' },
    { intent: 'thanks', keywords: ['thank you', 'thanks', 'tq', 'tqvm'], language: 'en' },
    { intent: 'wifi', keywords: ['wifi password', 'internet password'], language: 'en' },
    { intent: 'checkin_info', keywords: ['check in', 'check in time'], language: 'en' },
    { intent: 'checkout_info', keywords: ['check out', 'check out time'], language: 'en' },
    { intent: 'pricing', keywords: ['how much', 'price', 'cost'], language: 'en' },
  ];

  const matcher = new FuzzyIntentMatcher(realWorldIntents);

  test('User: "tq" → thanks', () => {
    const result = matcher.match('tq');
    expect(result?.intent).toBe('thanks');
    expect(result?.score).toBeGreaterThan(0.85);
  });

  test('User: "tqvm" → thanks', () => {
    const result = matcher.match('tqvm');
    expect(result?.intent).toBe('thanks');
    expect(result?.score).toBeGreaterThan(0.85);
  });

  test('User: "wifi password?" → wifi', () => {
    const result = matcher.match('wifi password?');
    expect(result?.intent).toBe('wifi');
    expect(result?.score).toBeGreaterThan(0.85);
  });

  test('User: "how much for a day?" → pricing', () => {
    const result = matcher.match('how much for a day?');
    expect(result?.intent).toBe('pricing');
    expect(result?.score).toBeGreaterThan(0.7);
  });

  test('User: "what time check out?" → checkout_info', () => {
    const result = matcher.match('what time check out?');
    expect(result?.intent).toBe('checkout_info');
    expect(result?.score).toBeGreaterThan(0.7);
  });

  test('User: "when can i check in?" → checkin_info', () => {
    const result = matcher.match('when can i check in?');
    expect(result?.intent).toBe('checkin_info');
    expect(result?.score).toBeGreaterThan(0.7);
  });
});
