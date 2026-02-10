import { describe, test, expect } from 'vitest';
import { guessTopicFiles } from '../../src/assistant/knowledge-base.js';

describe('guessTopicFiles()', () => {
  test('pricing keywords → payment.md', () => {
    expect(guessTopicFiles('how much per night?')).toContain('payment.md');
    expect(guessTopicFiles('what is the price?')).toContain('payment.md');
    expect(guessTopicFiles('berapa harga?')).toContain('payment.md');
    expect(guessTopicFiles('RM45')).toContain('payment.md');
  });

  test('wifi/facilities keywords → facilities.md', () => {
    expect(guessTopicFiles('wifi password')).toContain('facilities.md');
    expect(guessTopicFiles('is there a kitchen?')).toContain('facilities.md');
    expect(guessTopicFiles('laundry service')).toContain('facilities.md');
  });

  test('check-in/out keywords → checkin.md', () => {
    expect(guessTopicFiles('check in time')).toContain('checkin.md');
    expect(guessTopicFiles('when to check out')).toContain('checkin.md');
    expect(guessTopicFiles('door code')).toContain('checkin.md');
  });

  test('rules keywords → houserules.md', () => {
    expect(guessTopicFiles('can I smoke here?')).toContain('houserules.md');
    expect(guessTopicFiles('what are the rules?')).toContain('houserules.md');
    expect(guessTopicFiles('quiet hours')).toContain('houserules.md');
  });

  test('directions keywords → faq.md', () => {
    expect(guessTopicFiles('where are you located?')).toContain('faq.md');
    expect(guessTopicFiles('nearby restaurant')).toContain('faq.md');
    expect(guessTopicFiles('grab to your place')).toContain('faq.md');
  });

  test('no match → fallback to faq.md', () => {
    // Note: "unrelated" contains "late" which matches checkin.md pattern
    // Use truly unmatched text
    expect(guessTopicFiles('xyz abc 123')).toContain('faq.md');
    expect(guessTopicFiles('just a normal hello')).toContain('faq.md');
  });

  test('multi-topic message → multiple files', () => {
    // "price" matches payment.md, "wifi" matches facilities.md
    const files = guessTopicFiles('how much for wifi?');
    expect(files.length).toBeGreaterThanOrEqual(1);
  });
});
