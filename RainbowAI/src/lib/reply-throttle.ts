/**
 * Reply Throttle - Prevents WhatsApp spam detection
 *
 * CRITICAL: WhatsApp bans accounts that reply too fast (<100ms)
 * Safe pattern: 2-3 second delay + typing indicator
 */
export class ReplyThrottle {
  private lastReplyTime = new Map<string, number>();
  private readonly MIN_DELAY = 2000;  // 2 seconds minimum
  private readonly MAX_DELAY = 3000;  // 3 seconds maximum

  /**
   * Add natural delay before sending message
   * @param userId User identifier
   * @param minDelay Minimum delay in ms (default: 2000)
   * @param maxDelay Maximum delay in ms (default: 3000)
   */
  async throttle(
    userId: string,
    minDelay = this.MIN_DELAY,
    maxDelay = this.MAX_DELAY
  ): Promise<void> {
    const now = Date.now();
    const lastReply = this.lastReplyTime.get(userId) || 0;
    const elapsed = now - lastReply;

    // Calculate wait time (random between min and max for natural variation)
    const waitTime = minDelay + Math.random() * (maxDelay - minDelay);

    if (elapsed < minDelay) {
      // Need to wait
      console.log(`[THROTTLE] Waiting ${Math.round(waitTime)}ms for natural timing (user: ${userId.slice(0, 8)}...)`);
      await this.sleep(waitTime - elapsed);
    } else {
      // Already waited enough, but add small random delay for naturalness
      const smallDelay = Math.random() * 500; // 0-500ms
      await this.sleep(smallDelay);
    }

    this.lastReplyTime.set(userId, Date.now());
  }

  /**
   * Send message with typing indicator and natural delay
   * @param userId User identifier
   * @param message Message to send
   * @param sendFn Function to send the actual message
   * @param showTypingFn Optional function to show typing indicator
   */
  async sendWithTyping(
    userId: string,
    message: string,
    sendFn: (msg: string) => Promise<void>,
    showTypingFn?: () => Promise<void>
  ): Promise<void> {
    // Show typing indicator if provided
    if (showTypingFn) {
      try {
        await showTypingFn();
      } catch (error) {
        console.warn('[THROTTLE] Failed to show typing indicator:', error);
      }
    }

    // Wait 2-3 seconds (safe delay)
    await this.throttle(userId);

    // Send actual message
    await sendFn(message);
  }

  /**
   * Get stats for monitoring
   */
  getStats(): { totalUsers: number; avgDelayMs: number } {
    const now = Date.now();
    const recentDelays: number[] = [];

    for (const [userId, lastTime] of this.lastReplyTime.entries()) {
      const elapsed = now - lastTime;
      if (elapsed < 60000) {
        // Only count recent (last minute)
        recentDelays.push(elapsed);
      }
    }

    return {
      totalUsers: this.lastReplyTime.size,
      avgDelayMs: recentDelays.length > 0
        ? recentDelays.reduce((a, b) => a + b, 0) / recentDelays.length
        : 0
    };
  }

  /**
   * Clear old entries (cleanup)
   */
  cleanup(maxAgeMs = 3600000): void {
    // Clear entries older than 1 hour by default
    const now = Date.now();
    for (const [userId, lastTime] of this.lastReplyTime.entries()) {
      if (now - lastTime > maxAgeMs) {
        this.lastReplyTime.delete(userId);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const replyThrottle = new ReplyThrottle();

// Cleanup old entries every 10 minutes
setInterval(() => {
  replyThrottle.cleanup();
}, 600000);
