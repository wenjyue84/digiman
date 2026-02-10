import { describe, test, expect, beforeAll } from 'vitest';
import { healthCheck, postPreviewChat } from '../helpers/api-client.js';

let serverAvailable = false;

beforeAll(async () => {
  serverAvailable = await healthCheck();
  if (!serverAvailable) {
    console.warn('[Integration] MCP server not running — skipping tests');
  }
});

describe.skipIf(() => !serverAvailable)('Preview Chat API', () => {
  test('returns full response schema', async () => {
    const result = await postPreviewChat('hello');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('source');
    expect(result).toHaveProperty('action');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('responseTime');
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
  });

  test('responds to wifi question', async () => {
    const result = await postPreviewChat("what's the wifi password?");
    expect(result.intent).toBe('wifi');
    expect(result.message.length).toBeGreaterThan(0);
  });

  test('responseTime is a positive number', async () => {
    const result = await postPreviewChat('hello');
    expect(result.responseTime).toBeGreaterThan(0);
  });

  test('confidence is in valid range', async () => {
    const result = await postPreviewChat('how much per night?');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
