import { describe, test, expect, beforeAll, beforeEach } from 'vitest';
import { healthCheck } from '../helpers/api-client.js';
import { ConversationTestHarness } from '../helpers/conversation-harness.js';

let serverAvailable = false;
let harness: ConversationTestHarness;

beforeAll(async () => {
  serverAvailable = await healthCheck();
  if (!serverAvailable) {
    console.warn('[Integration] MCP server not running — skipping tests');
  }
});

describe.skipIf(() => !serverAvailable)('Multi-turn conversations', () => {
  beforeEach(() => {
    harness = new ConversationTestHarness();
  });

  test('topic switching: wifi → pricing', async () => {
    const r1 = await harness.sendMessage("what's the wifi password?");
    expect(r1.intent).toBe('wifi');

    const r2 = await harness.sendMessage('how much per night?');
    expect(r2.intent).toBe('pricing');
  });

  test('history grows with each turn', async () => {
    await harness.sendMessage('hello');
    expect(harness.getHistory()).toHaveLength(2); // user + assistant

    await harness.sendMessage('wifi password?');
    expect(harness.getHistory()).toHaveLength(4); // 2 turns

    await harness.sendMessage('how much?');
    expect(harness.getHistory()).toHaveLength(6); // 3 turns
  });

  test('reset clears history', async () => {
    await harness.sendMessage('hello');
    harness.reset();
    expect(harness.getHistory()).toHaveLength(0);
    expect(harness.getLastResponse()).toBeNull();
  });
});
