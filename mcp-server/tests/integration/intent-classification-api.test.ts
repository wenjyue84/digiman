import { describe, test, expect, beforeAll } from 'vitest';
import { healthCheck, postIntentTest } from '../helpers/api-client.js';

let serverAvailable = false;

beforeAll(async () => {
  serverAvailable = await healthCheck();
  if (!serverAvailable) {
    console.warn('[Integration] MCP server not running — skipping tests');
  }
});

describe.skipIf(() => !serverAvailable)('Intent Classification API', () => {
  test('returns valid response format', async () => {
    const result = await postIntentTest('hello');
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('source');
    expect(typeof result.intent).toBe('string');
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  test('classifies greeting correctly', async () => {
    const result = await postIntentTest('hello');
    expect(result.intent).toBe('greeting');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test('classifies wifi correctly', async () => {
    const result = await postIntentTest('wifi password');
    expect(result.intent).toBe('wifi');
  });

  test('classifies pricing correctly', async () => {
    const result = await postIntentTest('how much per night?');
    expect(result.intent).toBe('pricing');
  });

  test('returns detected language', async () => {
    const result = await postIntentTest('你好');
    expect(result.detectedLanguage).toBe('zh');
  });
});
