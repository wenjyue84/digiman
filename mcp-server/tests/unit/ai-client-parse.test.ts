import { describe, test, expect } from 'vitest';

/**
 * Tests for AI client response parsing logic.
 * Since parseClassifyResult and parseAIResponse are private functions,
 * we test the logic by replicating the parsing pattern.
 */

const VALID_CATEGORIES = [
  'greeting', 'thanks', 'wifi', 'directions', 'checkin_info', 'checkout_info',
  'pricing', 'availability', 'booking', 'complaint', 'contact_staff',
  'facilities', 'rules', 'payment', 'general', 'unknown',
] as const;

type IntentCategory = typeof VALID_CATEGORIES[number];

function parseClassifyResult(parsed: any): { category: IntentCategory; confidence: number; entities: Record<string, string> } {
  const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'unknown';
  const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5;
  const entities = typeof parsed.entities === 'object' && parsed.entities !== null ? parsed.entities : {};
  return { category, confidence, entities };
}

const VALID_ACTIONS = ['reply', 'static_reply', 'llm_reply', 'start_booking', 'escalate', 'forward_payment'];

function parseAIResponse(raw: string): { intent: string; action: string; response: string; confidence: number } {
  try {
    const parsed = JSON.parse(raw);
    const intent = typeof parsed.intent === 'string' ? parsed.intent : 'general';
    return {
      intent,
      action: VALID_ACTIONS.includes(parsed.action) ? parsed.action : 'reply',
      response: typeof parsed.response === 'string' ? parsed.response : '',
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
    };
  } catch {
    return { intent: 'general', action: 'reply', response: raw, confidence: 0.5 };
  }
}

describe('parseClassifyResult — response parsing', () => {
  test('valid JSON with known category', () => {
    const result = parseClassifyResult({
      category: 'wifi',
      confidence: 0.95,
      entities: { language: 'en' },
    });
    expect(result.category).toBe('wifi');
    expect(result.confidence).toBe(0.95);
    expect(result.entities.language).toBe('en');
  });

  test('unknown category maps to "unknown"', () => {
    const result = parseClassifyResult({
      category: 'made_up_category',
      confidence: 0.8,
      entities: {},
    });
    expect(result.category).toBe('unknown');
  });

  test('missing confidence defaults to 0.5', () => {
    const result = parseClassifyResult({ category: 'greeting', entities: {} });
    expect(result.confidence).toBe(0.5);
  });

  test('confidence clamped to [0,1]', () => {
    expect(parseClassifyResult({ category: 'greeting', confidence: 1.5, entities: {} }).confidence).toBe(1);
    expect(parseClassifyResult({ category: 'greeting', confidence: -0.5, entities: {} }).confidence).toBe(0);
  });

  test('null entities defaults to empty object', () => {
    const result = parseClassifyResult({ category: 'greeting', confidence: 0.9, entities: null });
    expect(result.entities).toEqual({});
  });
});

describe('parseAIResponse — full response parsing', () => {
  test('valid JSON response', () => {
    const result = parseAIResponse(JSON.stringify({
      intent: 'wifi',
      action: 'static_reply',
      response: 'The wifi password is pelangi2024',
      confidence: 0.92,
    }));
    expect(result.intent).toBe('wifi');
    expect(result.action).toBe('static_reply');
    expect(result.response).toBe('The wifi password is pelangi2024');
    expect(result.confidence).toBe(0.92);
  });

  test('invalid action defaults to "reply"', () => {
    const result = parseAIResponse(JSON.stringify({
      intent: 'wifi',
      action: 'invalid_action',
      response: 'test',
      confidence: 0.8,
    }));
    expect(result.action).toBe('reply');
  });

  test('non-JSON raw string used as response', () => {
    const result = parseAIResponse('Just a plain text response');
    expect(result.intent).toBe('general');
    expect(result.action).toBe('reply');
    expect(result.response).toBe('Just a plain text response');
    expect(result.confidence).toBe(0.5);
  });

  test('malformed JSON falls back gracefully', () => {
    const result = parseAIResponse('{invalid json}');
    expect(result.intent).toBe('general');
    expect(result.response).toBe('{invalid json}');
  });
});
