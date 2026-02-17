/**
 * Retry wrapper with exponential backoff for message delivery.
 *
 * WhatsApp/Baileys can fail transiently (network glitch, connection reset,
 * brief disconnection). This wrapper retries the send function up to
 * `maxAttempts` times with exponential delays (1 s → 2 s → 4 s).
 *
 * Usage:
 *   const safeSend = withSendRetry(originalSendFn);
 *   await safeSend(phone, text, instanceId);
 */
import type { SendMessageFn } from '../assistant/types.js';

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

const DEFAULTS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
};

/**
 * Wraps a SendMessageFn with retry + exponential backoff.
 * Returns a new function with the same signature.
 */
export function withSendRetry(
  send: SendMessageFn,
  opts?: RetryOptions
): SendMessageFn {
  const { maxAttempts, baseDelayMs } = { ...DEFAULTS, ...opts };

  return async (phone: string, text: string, instanceId?: string) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await send(phone, text, instanceId);
      } catch (err: any) {
        if (attempt === maxAttempts) {
          console.error(
            `[SendRetry] All ${maxAttempts} attempts failed for ${phone}: ${err.message}`
          );
          throw err;
        }
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(
          `[SendRetry] Attempt ${attempt}/${maxAttempts} failed for ${phone} ` +
          `(${err.message}), retrying in ${delay}ms…`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };
}
