import { describe, test, expect, beforeEach, vi } from 'vitest';
import { checkRate, initRateLimiter, destroyRateLimiter } from '../../src/assistant/rate-limiter.js';
import { configStore } from '../../src/assistant/config-store.js';

// configStore.init() is called in tests/setup.ts

describe('Rate limiter', () => {
  beforeEach(() => {
    destroyRateLimiter();
    initRateLimiter();
  });

  test('first request is always allowed', () => {
    const result = checkRate('+60199999999');
    expect(result.allowed).toBe(true);
  });

  test('staff phones are exempt', () => {
    const settings = configStore.getSettings();
    const staffPhone = settings.staff.phones[0];
    if (!staffPhone) return; // Skip if no staff configured

    // Send many requests — staff should always pass
    for (let i = 0; i < 50; i++) {
      const result = checkRate(staffPhone);
      expect(result.allowed).toBe(true);
    }
  });

  test('per-minute limit eventually blocks', () => {
    const settings = configStore.getSettings();
    const perMinute = settings.rate_limits.per_minute;
    const testPhone = '+60100000001';

    // Exhaust per-minute limit
    for (let i = 0; i < perMinute; i++) {
      expect(checkRate(testPhone).allowed).toBe(true);
    }

    // Next request should be blocked
    const blocked = checkRate(testPhone);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain('per-minute');
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  test('different phone numbers have separate windows', () => {
    const result1 = checkRate('+60100000010');
    const result2 = checkRate('+60100000020');
    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
  });
});
