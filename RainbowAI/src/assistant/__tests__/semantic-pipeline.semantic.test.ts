/**
 * Semantic tests — verify intent-examples.json works with SemanticMatcher.
 *
 * Tests that the real training examples from intent-examples.json can be
 * loaded into SemanticMatcher and that exact example phrases match their
 * intended intents with reasonable confidence.
 */
import { describe, test, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { SemanticMatcher, type IntentExamples } from '../semantic-matcher.js';

const rainbowRoot = path.resolve(__dirname, '..', '..', '..');

describe('Semantic Matcher with Real Examples', () => {
  let matcher: SemanticMatcher;
  let intentExamples: IntentExamples[];

  beforeAll(async () => {
    const dataDir = path.join(rainbowRoot, 'src', 'assistant', 'data');
    const examplesPath = path.join(dataDir, 'intent-examples.json');
    const rawData = JSON.parse(fs.readFileSync(examplesPath, 'utf-8'));

    // intent-examples.json uses { intents: [{ intent, examples: { en, ms, zh } }] }
    intentExamples = (rawData.intents || [])
      .filter((entry: any) => entry.intent && entry.examples)
      .map((entry: any) => ({
        intent: entry.intent,
        examples: entry.examples,
      }));

    matcher = new SemanticMatcher();
    await matcher.initialize(intentExamples);
  }, 30000);

  test('should initialize with real training data', () => {
    expect(matcher.isReady()).toBe(true);
    const stats = matcher.getStats();
    expect(stats.totalIntents).toBeGreaterThan(0);
    expect(stats.totalExamples).toBeGreaterThan(0);
  });

  test('should match at least some exact training examples', async () => {
    // Pick up to 10 intents with English examples
    const intentsWithExamples = intentExamples
      .filter((ie) => {
        const ex = ie.examples;
        if (Array.isArray(ex)) return ex.length > 0;
        return (ex as any).en && (ex as any).en.length > 0;
      })
      .slice(0, 10);

    let matchedCount = 0;
    let testedCount = 0;

    for (const ie of intentsWithExamples) {
      // Get first English example
      const examples = Array.isArray(ie.examples) ? ie.examples : (ie.examples as any).en || [];
      const example = examples[0];
      if (!example || typeof example !== 'string') continue;
      testedCount++;

      const result = await matcher.match(example, 0.60);
      if (result && result.intent === ie.intent) {
        matchedCount++;
      }
    }

    // At least 1 of the exact examples should match their intent
    // (local embeddings may not perfectly match all)
    expect(matchedCount).toBeGreaterThan(0);
    console.log(`[Semantic Test] Matched ${matchedCount}/${testedCount} exact examples`);
  });

  test('should return null for unrelated gibberish at high threshold', async () => {
    const result = await matcher.match('xyzzy foobar qux plugh', 0.80);
    expect(result).toBeNull();
  });

  test('should handle empty string gracefully', async () => {
    const result = await matcher.match('', 0.70);
    if (result) {
      expect(result.score).toBeLessThan(0.70);
    }
  });

  test('matchAll should return sorted results', async () => {
    const results = await matcher.matchAll('help', 0.30);
    expect(Array.isArray(results)).toBe(true);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });

  test('should classify within reasonable time per query', async () => {
    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      await matcher.match('hello');
    }
    const elapsed = Date.now() - start;
    // 5 queries should complete in under 500ms
    expect(elapsed).toBeLessThan(500);
  });
});
