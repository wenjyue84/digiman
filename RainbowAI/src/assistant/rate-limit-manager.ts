/**
 * Rate Limit Manager
 *
 * Tracks rate limit errors (429) per AI provider and enforces exponential backoff.
 * Prevents spamming rate-limited providers and improves reliability.
 *
 * Features:
 * - Exponential backoff with jitter (1s → 2s → 4s → 8s → ... → 5min max)
 * - Per-provider cooldown tracking
 * - Automatic reset on successful calls
 * - Admin notification after repeated violations
 * - Comprehensive logging for debugging
 */

export interface RateLimitConfig {
  baseDelayMs: number;           // Initial delay after first 429 (default: 1000ms)
  maxDelayMs: number;            // Maximum cooldown period (default: 300000ms = 5min)
  notifyAfterErrors: number;     // Notify admin after N consecutive 429s (default: 5)
  resetSuccessCount: number;     // Reset error count after N successes (default: 3)
}

interface RateLimitState {
  errorCount: number;            // Consecutive 429 errors
  successCount: number;          // Consecutive successes since last error
  lastErrorAt: number;           // Timestamp of last 429 error
  cooldownUntil: number;         // Timestamp when cooldown ends
  totalErrors: number;           // Lifetime 429 count (for monitoring)
  notifiedAt: number | null;     // Last time admin was notified
}

const DEFAULT_CONFIG: RateLimitConfig = {
  baseDelayMs: 1000,           // 1 second
  maxDelayMs: 300000,          // 5 minutes
  notifyAfterErrors: 5,        // Notify after 5 consecutive 429s
  resetSuccessCount: 3,        // Reset after 3 consecutive successes
};

export class RateLimitManager {
  private states = new Map<string, RateLimitState>();
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a rate limit error (429) for a provider.
   * Calculates exponential backoff and updates cooldown.
   */
  recordRateLimit(providerId: string): void {
    const now = Date.now();
    let state = this.states.get(providerId);

    if (!state) {
      state = {
        errorCount: 0,
        successCount: 0,
        lastErrorAt: 0,
        cooldownUntil: 0,
        totalErrors: 0,
        notifiedAt: null,
      };
      this.states.set(providerId, state);
    }

    // Increment error counts
    state.errorCount += 1;
    state.successCount = 0; // Reset success streak
    state.lastErrorAt = now;
    state.totalErrors += 1;

    // Calculate exponential backoff with jitter
    const baseDelay = this.config.baseDelayMs;
    const maxDelay = this.config.maxDelayMs;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, state.errorCount - 1), maxDelay);

    // Add ±20% jitter to prevent thundering herd
    const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
    const totalDelay = Math.round(exponentialDelay + jitter);

    state.cooldownUntil = now + totalDelay;

    const cooldownSec = (totalDelay / 1000).toFixed(1);
    console.warn(
      `[RateLimitManager] Provider "${providerId}" rate-limited (429) — ` +
      `error #${state.errorCount}, cooldown ${cooldownSec}s (total: ${state.totalErrors} lifetime)`
    );

    // Check if we should notify admin
    if (state.errorCount >= this.config.notifyAfterErrors) {
      // Only notify once per hour to avoid spam
      const oneHourAgo = now - 60 * 60 * 1000;
      if (!state.notifiedAt || state.notifiedAt < oneHourAgo) {
        state.notifiedAt = now;
        console.warn(
          `[RateLimitManager] ⚠️ Provider "${providerId}" has ${state.errorCount} consecutive rate limits — admin notification recommended`
        );
        // Actual notification will be sent by caller (admin-notifier.ts)
      }
    }
  }

  /**
   * Record a successful API call for a provider.
   * Resets error count after enough consecutive successes.
   */
  recordSuccess(providerId: string): void {
    let state = this.states.get(providerId);

    if (!state) {
      // No previous errors, nothing to track
      return;
    }

    state.successCount += 1;

    // Reset error count after enough consecutive successes
    if (state.successCount >= this.config.resetSuccessCount && state.errorCount > 0) {
      console.log(
        `[RateLimitManager] Provider "${providerId}" recovered — ` +
        `${state.successCount} successes, resetting error count (was ${state.errorCount})`
      );
      state.errorCount = 0;
      state.cooldownUntil = 0;
      state.successCount = 0;
    }
  }

  /**
   * Check if a provider is currently in rate limit cooldown.
   */
  isInCooldown(providerId: string): boolean {
    const state = this.states.get(providerId);
    if (!state) return false;

    const now = Date.now();
    return now < state.cooldownUntil;
  }

  /**
   * Get remaining cooldown time in milliseconds.
   * Returns 0 if not in cooldown.
   */
  getCooldownRemaining(providerId: string): number {
    const state = this.states.get(providerId);
    if (!state) return 0;

    const now = Date.now();
    const remaining = Math.max(0, state.cooldownUntil - now);
    return remaining;
  }

  /**
   * Get current state for a specific provider.
   */
  getState(providerId: string): RateLimitState | null {
    return this.states.get(providerId) || null;
  }

  /**
   * Get all provider states for monitoring/debugging.
   */
  getAllStates(): Map<string, RateLimitState> {
    return new Map(this.states);
  }

  /**
   * Check if a provider should trigger admin notification.
   * Returns true if error count >= threshold AND no recent notification.
   */
  shouldNotifyAdmin(providerId: string): boolean {
    const state = this.states.get(providerId);
    if (!state) return false;

    if (state.errorCount < this.config.notifyAfterErrors) {
      return false;
    }

    // Only notify once per hour
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    return !state.notifiedAt || state.notifiedAt < oneHourAgo;
  }

  /**
   * Clear rate limit state for a provider (manual reset via admin).
   */
  resetProvider(providerId: string): void {
    this.states.delete(providerId);
    console.log(`[RateLimitManager] Manually reset rate limit state for "${providerId}"`);
  }

  /**
   * Clear all rate limit states (manual reset via admin).
   */
  resetAll(): void {
    this.states.clear();
    console.log('[RateLimitManager] Manually reset all rate limit states');
  }
}

// Singleton instance
export const rateLimitManager = new RateLimitManager();
