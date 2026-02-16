/**
 * Integration tests for config-store and intent classification pipeline.
 *
 * Tests that config-store can load data files and that the intent
 * classification system works end-to-end with real config data.
 */
import { describe, test, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';

// Resolve paths relative to RainbowAI root
const rainbowRoot = path.resolve(__dirname, '..', '..', '..');

describe('Config Data Files Integration', () => {
  describe('Data files exist and are valid JSON', () => {
    const dataDir = path.join(rainbowRoot, 'src', 'assistant', 'data');

    test('intents.json exists and is valid', () => {
      const filePath = path.join(dataDir, 'intents.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content).toBeDefined();
      expect(typeof content).toBe('object');
    });

    test('routing.json exists and is valid', () => {
      const filePath = path.join(dataDir, 'routing.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content).toBeDefined();
      expect(typeof content).toBe('object');
    });

    test('intent-keywords.json exists and has intents', () => {
      const filePath = path.join(dataDir, 'intent-keywords.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content).toBeDefined();
      expect(Object.keys(content).length).toBeGreaterThan(0);
    });

    test('intent-examples.json exists and has intents', () => {
      const filePath = path.join(dataDir, 'intent-examples.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content).toBeDefined();
      expect(Object.keys(content).length).toBeGreaterThan(0);
    });

    test('settings.json exists and has required fields', () => {
      const filePath = path.join(dataDir, 'settings.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content).toBeDefined();
      expect(content.staff).toBeDefined();
      expect(content.staff.phones).toBeDefined();
      expect(Array.isArray(content.staff.phones)).toBe(true);
    });
  });

  describe('Routing config consistency', () => {
    test('every routed intent has a valid action', () => {
      const dataDir = path.join(rainbowRoot, 'src', 'assistant', 'data');
      const routing = JSON.parse(fs.readFileSync(path.join(dataDir, 'routing.json'), 'utf-8'));
      const validActions = ['static_reply', 'workflow', 'llm_reply', 'escalate', 'start_booking'];

      for (const [intent, config] of Object.entries(routing)) {
        const action = (config as any).action;
        expect(validActions).toContain(action);
      }
    });

    test('intents.json and routing.json have matching intent names', () => {
      const dataDir = path.join(rainbowRoot, 'src', 'assistant', 'data');
      const intentsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'intents.json'), 'utf-8'));
      const routing = JSON.parse(fs.readFileSync(path.join(dataDir, 'routing.json'), 'utf-8'));

      // intents.json uses nested structure: { categories: [{ phase, intents: [{ category }] }] }
      const intentNames: string[] = [];
      for (const phase of (intentsData.categories || [])) {
        for (const intent of (phase.intents || [])) {
          if (intent.category) intentNames.push(intent.category);
        }
      }
      const routedIntents = Object.keys(routing);

      // At least 50% of defined intents should have a routing entry
      const routedCount = intentNames.filter(i => routedIntents.includes(i)).length;
      expect(intentNames.length).toBeGreaterThan(0);
      expect(routedCount).toBeGreaterThan(intentNames.length * 0.5);
    });
  });

  describe('Knowledge base files', () => {
    test('.rainbow-kb directory exists', () => {
      const kbDir = path.join(rainbowRoot, '.rainbow-kb');
      expect(fs.existsSync(kbDir)).toBe(true);
    });

    test('KB contains at least one markdown file', () => {
      const kbDir = path.join(rainbowRoot, '.rainbow-kb');
      if (fs.existsSync(kbDir)) {
        const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md'));
        expect(files.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('FuzzyMatcher + Keywords Integration', () => {
  test('should initialize matcher from real intent-keywords.json', async () => {
    const { FuzzyIntentMatcher } = await import('../fuzzy-matcher.js');
    const dataDir = path.join(rainbowRoot, 'src', 'assistant', 'data');
    const keywordsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'intent-keywords.json'), 'utf-8'));

    const intents: Array<{ intent: string; keywords: string[]; language: string }> = [];
    for (const [intentName, langMap] of Object.entries(keywordsData)) {
      for (const [lang, keywords] of Object.entries(langMap as Record<string, string[]>)) {
        if (Array.isArray(keywords) && keywords.length > 0) {
          intents.push({ intent: intentName, keywords, language: lang });
        }
      }
    }

    const matcher = new FuzzyIntentMatcher(intents);
    expect(matcher).toBeDefined();

    // Test basic matching with real keywords
    const hiResult = matcher.match('hi');
    if (hiResult) {
      expect(hiResult.intent).toBeDefined();
      expect(hiResult.score).toBeGreaterThan(0.5);
    }
  });
});
