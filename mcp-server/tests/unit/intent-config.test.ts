import { describe, test, expect, beforeEach } from 'vitest';
import { getDefaultConfig, getIntentConfig, updateIntentConfig } from '../../src/assistant/intent-config.js';

describe('Intent detection configuration', () => {
  // Reset to defaults before each test
  beforeEach(() => {
    updateIntentConfig(getDefaultConfig());
  });

  test('default config has all 4 tiers enabled', () => {
    const config = getDefaultConfig();
    expect(config.tiers.tier1_emergency.enabled).toBe(true);
    expect(config.tiers.tier2_fuzzy.enabled).toBe(true);
    expect(config.tiers.tier3_semantic.enabled).toBe(true);
    expect(config.tiers.tier4_llm.enabled).toBe(true);
  });

  test('default thresholds are within valid ranges', () => {
    const config = getDefaultConfig();
    expect(config.tiers.tier2_fuzzy.threshold).toBeGreaterThanOrEqual(0);
    expect(config.tiers.tier2_fuzzy.threshold).toBeLessThanOrEqual(1);
    expect(config.tiers.tier3_semantic.threshold).toBeGreaterThanOrEqual(0);
    expect(config.tiers.tier3_semantic.threshold).toBeLessThanOrEqual(1);
  });

  test('default context messages are reasonable', () => {
    const config = getDefaultConfig();
    expect(config.tiers.tier1_emergency.contextMessages).toBe(0);  // regex doesn't use context
    expect(config.tiers.tier2_fuzzy.contextMessages).toBeGreaterThanOrEqual(0);
    expect(config.tiers.tier2_fuzzy.contextMessages).toBeLessThanOrEqual(10);
    expect(config.tiers.tier4_llm.contextMessages).toBeGreaterThanOrEqual(1);
    expect(config.tiers.tier4_llm.contextMessages).toBeLessThanOrEqual(20);
  });

  test('updateIntentConfig merges partial updates', () => {
    updateIntentConfig({
      tiers: {
        ...getDefaultConfig().tiers,
        tier2_fuzzy: {
          ...getDefaultConfig().tiers.tier2_fuzzy,
          threshold: 0.90,
        },
      },
    });

    const config = getIntentConfig();
    expect(config.tiers.tier2_fuzzy.threshold).toBe(0.90);
    // Other tiers should be unchanged
    expect(config.tiers.tier1_emergency.enabled).toBe(true);
  });

  test('conversation state defaults', () => {
    const config = getDefaultConfig();
    expect(config.conversationState.maxHistoryMessages).toBe(20);
    expect(config.conversationState.contextTTL).toBe(30);
    expect(config.conversationState.trackLastIntent).toBe(true);
    expect(config.conversationState.trackSlots).toBe(true);
  });
});
