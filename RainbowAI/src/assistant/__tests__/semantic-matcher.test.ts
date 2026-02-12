import { SemanticMatcher, type IntentExamples } from '../semantic-matcher';

describe('SemanticMatcher', () => {
  let matcher: SemanticMatcher;

  const testIntents: IntentExamples[] = [
    {
      intent: 'wifi',
      examples: [
        'wifi password',
        'internet password',
        'how to connect wifi',
        'network access code'
      ]
    },
    {
      intent: 'pricing',
      examples: [
        'how much',
        'what\'s the price',
        'cost per night',
        'room rate'
      ]
    },
    {
      intent: 'checkin_info',
      examples: [
        'check in time',
        'when can I arrive',
        'what time is check in'
      ]
    }
  ];

  beforeAll(async () => {
    matcher = new SemanticMatcher();
    await matcher.initialize(testIntents);
  }, 30000); // 30 second timeout for model download

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(matcher.isReady()).toBe(true);
    });

    test('should have correct stats', () => {
      const stats = matcher.getStats();
      expect(stats.totalIntents).toBe(3);
      expect(stats.totalExamples).toBeGreaterThan(0);
      expect(stats.ready).toBe(true);
    });
  });

  describe('Exact Phrase Matching', () => {
    test('should match exact training example', async () => {
      const result = await matcher.match('wifi password');
      expect(result?.intent).toBe('wifi');
      expect(result?.score).toBeGreaterThan(0.9);
    });

    test('should match "how much" to pricing', async () => {
      const result = await matcher.match('how much');
      expect(result?.intent).toBe('pricing');
      expect(result?.score).toBeGreaterThan(0.9);
    });
  });

  describe('Semantic Similarity - Similar Meanings', () => {
    test('should match "internet code" to wifi (similar to "network access code")', async () => {
      const result = await matcher.match('internet code', 0.70);
      expect(result?.intent).toBe('wifi');
      expect(result?.score).toBeGreaterThan(0.70);
    });

    test('should match "what\'s the cost" to pricing (similar to "what\'s the price")', async () => {
      const result = await matcher.match('what\'s the cost', 0.70);
      expect(result?.intent).toBe('pricing');
      expect(result?.score).toBeGreaterThan(0.70);
    });

    test('should match "when do I arrive" to checkin_info', async () => {
      const result = await matcher.match('when do I arrive', 0.70);
      expect(result?.intent).toBe('checkin_info');
      expect(result?.score).toBeGreaterThan(0.70);
    });
  });

  describe('Paraphrasing Detection', () => {
    test('should match paraphrased wifi question', async () => {
      const result = await matcher.match('how do I get on the internet', 0.65);
      expect(result?.intent).toBe('wifi');
      expect(result?.score).toBeGreaterThan(0.65);
    });

    test('should match paraphrased pricing question', async () => {
      const result = await matcher.match('what will it cost me', 0.65);
      expect(result?.intent).toBe('pricing');
      expect(result?.score).toBeGreaterThan(0.65);
    });
  });

  describe('Threshold Testing', () => {
    test('should not match unrelated text at high threshold', async () => {
      const result = await matcher.match('completely random unrelated text', 0.75);
      expect(result).toBeNull();
    });

    test('should return null for gibberish', async () => {
      const result = await matcher.match('xyz abc 123 nonsense', 0.75);
      expect(result).toBeNull();
    });
  });

  describe('matchAll method', () => {
    test('should return multiple matches for ambiguous query', async () => {
      const results = await matcher.matchAll('how much to check in', 0.60);
      expect(results.length).toBeGreaterThan(0);

      // Should match both pricing and checkin_info
      const intents = results.map(r => r.intent);
      expect(intents).toContain('pricing');
    });

    test('should sort by score descending', async () => {
      const results = await matcher.matchAll('wifi', 0.50);
      expect(results.length).toBeGreaterThan(0);

      // Check scores are descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string gracefully', async () => {
      const result = await matcher.match('');
      // Should either return null or low confidence
      if (result) {
        expect(result.score).toBeLessThan(0.75);
      }
    });

    test('should handle very short text', async () => {
      const result = await matcher.match('hi');
      // May or may not match depending on training data
      // Just ensure it doesn't crash
      expect(result).toBeDefined();
    });

    test('should handle special characters', async () => {
      const result = await matcher.match('wifi password???');
      expect(result?.intent).toBe('wifi');
    });
  });

  describe('Performance', () => {
    test('should classify within reasonable time (<100ms)', async () => {
      const start = Date.now();
      await matcher.match('how much is it');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // Should be <100ms
    });

    test('should handle multiple queries efficiently', async () => {
      const queries = [
        'wifi password',
        'how much',
        'check in time'
      ];

      const start = Date.now();
      for (const query of queries) {
        await matcher.match(query);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(300); // 3 queries in <300ms
    });
  });
});

describe('Real-world Semantic Matching Test Cases', () => {
  let matcher: SemanticMatcher;

  const realWorldIntents: IntentExamples[] = [
    {
      intent: 'wifi',
      examples: [
        'wifi password',
        'internet password',
        'how to connect to wifi',
        'network access',
        'what\'s the wifi code'
      ]
    },
    {
      intent: 'pricing',
      examples: [
        'how much',
        'price',
        'cost',
        'rate per night',
        'room price'
      ]
    },
    {
      intent: 'directions',
      examples: [
        'where are you',
        'address',
        'location',
        'how to get there',
        'directions'
      ]
    }
  ];

  beforeAll(async () => {
    matcher = new SemanticMatcher();
    await matcher.initialize(realWorldIntents);
  }, 30000);

  test('Variation: "internet code" should match wifi', async () => {
    const result = await matcher.match('internet code', 0.70);
    expect(result?.intent).toBe('wifi');
  });

  test('Variation: "network key" should match wifi', async () => {
    const result = await matcher.match('network key', 0.65);
    expect(result?.intent).toBe('wifi');
  });

  test('Variation: "what does it cost" should match pricing', async () => {
    const result = await matcher.match('what does it cost', 0.70);
    expect(result?.intent).toBe('pricing');
  });

  test('Variation: "your location" should match directions', async () => {
    const result = await matcher.match('your location', 0.70);
    expect(result?.intent).toBe('directions');
  });

  test('Variation: "where is your place" should match directions', async () => {
    const result = await matcher.match('where is your place', 0.70);
    expect(result?.intent).toBe('directions');
  });

  test('Complex: "how do I access the wireless network" should match wifi', async () => {
    const result = await matcher.match('how do I access the wireless network', 0.65);
    expect(result?.intent).toBe('wifi');
  });
});
