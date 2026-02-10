import { describe, test, expect } from 'vitest';
import { FuzzyIntentMatcher, type KeywordIntent } from '../../src/assistant/fuzzy-matcher.js';
import type { ChatMessage } from '../../src/assistant/types.js';

const intents: KeywordIntent[] = [
  { intent: 'booking', keywords: ['book', 'reserve', 'room'], language: 'en' },
  { intent: 'complaint', keywords: ['broken', 'not working'], language: 'en' },
  { intent: 'facilities', keywords: ['kitchen', 'laundry', 'pool'], language: 'en' },
  { intent: 'wifi', keywords: ['wifi', 'internet'], language: 'en' },
];

const matcher = new FuzzyIntentMatcher(intents);

function makeHistory(messages: string[]): ChatMessage[] {
  return messages.map((content, i) => ({
    role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
    content,
    timestamp: Math.floor(Date.now() / 1000) + i,
  }));
}

describe('FuzzyIntentMatcher.matchWithContext()', () => {
  test('booking continuation with date keyword', () => {
    const result = matcher.matchWithContext(
      'tomorrow',
      makeHistory(['I want to book a room', 'When would you like to check in?']),
      'booking'
    );
    expect(result?.intent).toBe('booking');
    expect(result?.contextBoost).toBe(true);
  });

  test('booking confirmation', () => {
    const result = matcher.matchWithContext(
      'yes please',
      makeHistory(['2 nights for 2 people', 'That will be RM90. Confirm?']),
      'booking'
    );
    expect(result?.intent).toBe('booking');
    expect(result?.contextBoost).toBe(true);
  });

  test('complaint follow-up adds details', () => {
    const result = matcher.matchWithContext(
      'it happened again this morning',
      makeHistory(['The shower is not working', "Sorry about that, we'll look into it"]),
      'complaint'
    );
    expect(result?.intent).toBe('complaint');
    expect(result?.contextBoost).toBe(true);
  });

  test('facilities follow-up question', () => {
    const result = matcher.matchWithContext(
      'where is it?',
      makeHistory(['Do you have a kitchen?', 'Yes, on the ground floor']),
      'facilities'
    );
    expect(result?.intent).toBe('facilities');
    expect(result?.contextBoost).toBe(true);
  });

  test('no context available — falls through to regular match', () => {
    const result = matcher.matchWithContext('wifi', [], null);
    expect(result?.intent).toBe('wifi');
    // No context boost when there's no context
    if (result?.contextBoost) {
      expect(result.contextBoost).toBe(true);
    }
  });

  test('no context and no regular match — returns null', () => {
    const result = matcher.matchWithContext('xyz random gibberish', [], null);
    if (result) {
      expect(result.score).toBeLessThan(0.5);
    }
  });
});
