/**
 * Semantic matcher tests — requires model download (~5-10s first run).
 * Migrated from src/assistant/__tests__/semantic-matcher.test.ts
 */
import { describe, test, expect, beforeAll } from 'vitest';
import { SemanticMatcher, type IntentExamples } from '../../src/assistant/semantic-matcher.js';

const testIntents: IntentExamples[] = [
  {
    intent: 'wifi',
    examples: ['wifi password', 'internet password', 'how to connect wifi', 'network access code'],
  },
  {
    intent: 'pricing',
    examples: ['how much', "what's the price", 'cost per night', 'room rate'],
  },
  {
    intent: 'checkin_info',
    examples: ['check in time', 'when can I arrive', 'what time is check in'],
  },
  {
    intent: 'directions',
    examples: ['where are you', 'address', 'location', 'how to get there', 'directions'],
  },
];

let matcher: SemanticMatcher;

beforeAll(async () => {
  matcher = new SemanticMatcher();
  await matcher.initialize(testIntents);
}, 60_000);

describe('SemanticMatcher — initialization', () => {
  test('is ready after init', () => {
    expect(matcher.isReady()).toBe(true);
  });

  test('has correct stats', () => {
    const stats = matcher.getStats();
    expect(stats.totalIntents).toBe(4);
    expect(stats.totalExamples).toBeGreaterThan(0);
  });
});

describe('SemanticMatcher — exact phrases', () => {
  test('"wifi password" → wifi', async () => {
    const r = await matcher.match('wifi password');
    expect(r?.intent).toBe('wifi');
    expect(r?.score).toBeGreaterThan(0.9);
  });

  test('"how much" → pricing', async () => {
    const r = await matcher.match('how much');
    expect(r?.intent).toBe('pricing');
    expect(r?.score).toBeGreaterThan(0.9);
  });
});

describe('SemanticMatcher — paraphrases', () => {
  test('"internet code" → wifi', async () => {
    const r = await matcher.match('internet code', 0.70);
    expect(r?.intent).toBe('wifi');
  });

  test('"what will it cost me" → pricing', async () => {
    const r = await matcher.match('what will it cost me', 0.65);
    expect(r?.intent).toBe('pricing');
  });

  test('"when do I arrive" → checkin_info', async () => {
    const r = await matcher.match('when do I arrive', 0.70);
    expect(r?.intent).toBe('checkin_info');
  });

  test('"your location" → directions', async () => {
    const r = await matcher.match('your location', 0.70);
    expect(r?.intent).toBe('directions');
  });
});

describe('SemanticMatcher — threshold filtering', () => {
  test('unrelated text returns null at high threshold', async () => {
    const r = await matcher.match('completely random unrelated text', 0.75);
    expect(r).toBeNull();
  });

  test('gibberish returns null', async () => {
    const r = await matcher.match('xyz abc 123 nonsense', 0.75);
    expect(r).toBeNull();
  });
});

describe('SemanticMatcher — matchAll', () => {
  test('returns results sorted by score descending', async () => {
    const results = await matcher.matchAll('wifi', 0.50);
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });
});

describe('SemanticMatcher — performance', () => {
  test('single match <100ms', async () => {
    const start = Date.now();
    await matcher.match('how much is it');
    expect(Date.now() - start).toBeLessThan(100);
  });
});
