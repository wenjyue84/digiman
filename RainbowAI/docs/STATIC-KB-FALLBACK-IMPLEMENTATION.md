# Static KB Fallback Implementation Guide

**Status:** Designed and tested, ready for implementation
**Priority:** LOW RISK
**Estimated Time:** 30-45 minutes

## Overview

Graceful degradation when Knowledge Base fails to load. System continues operating with static replies instead of crashing.

## Architecture

**Fallback Hierarchy:**
1. **Dynamic KB** (preferred) - Full knowledge base with all topic files
2. **Static Fallback Mode** (degraded) - Basic responses from knowledge.json, limited information
3. **Minimal Hardcoded Fallback** (emergency) - Staff contact info only

## Implementation Steps

### 1. Modify `RainbowAI/src/assistant/knowledge-base.ts`

**Add health tracking variables** (after line 15, after `let kbCache`):
```typescript
// KB Health Tracking
let kbHealthy = false;        // true if KB loaded successfully
let kbFailureCount = 0;       // consecutive load failures
let lastKBCheckAt = 0;        // timestamp of last health check
```

**Add import** (top of file):
```typescript
import { notifyAdminKBFailure } from '../lib/admin-notifier.js';
```

**Wrap `reloadAllKB()` in try-catch** (line ~185):
```typescript
export function reloadAllKB(): void {
  try {
    if (!existsSync(RAINBOW_KB_DIR)) {
      console.warn(`[KnowledgeBase] .rainbow-kb/ not found at ${RAINBOW_KB_DIR}`);
      kbHealthy = false;
      kbFailureCount++;
      console.warn(`[KnowledgeBase] ⚠️ KB unavailable (failure #${kbFailureCount}) — static fallback active`);

      // Notify admin after 3 consecutive failures
      if (kbFailureCount >= 3) {
        notifyAdminKBFailure(kbFailureCount, kbCache.size).catch(err => {
          console.warn(`[KnowledgeBase] Failed to send KB failure notification:`, err.message);
        });
      }

      return;
    }

    const files = readdirSync(RAINBOW_KB_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
      kbCache.set(file, readFileSync(join(RAINBOW_KB_DIR, file), 'utf-8'));
    }

    // Also load today + yesterday daily logs from memory/
    if (existsSync(MEMORY_DIR)) {
      const today = getTodayDate();
      const yesterday = getYesterdayDate();
      for (const date of [today, yesterday]) {
        const memFile = join(MEMORY_DIR, `${date}.md`);
        if (existsSync(memFile)) {
          kbCache.set(`memory/${date}.md`, readFileSync(memFile, 'utf-8'));
        }
      }
    }

    // Mark KB as healthy if we loaded files successfully
    if (kbCache.size > 0) {
      kbHealthy = true;
      if (kbFailureCount > 0) {
        console.log(`[KnowledgeBase] ✅ KB recovered after ${kbFailureCount} failures`);
        kbFailureCount = 0;
      }
    } else {
      kbHealthy = false;
      kbFailureCount++;
      console.warn(`[KnowledgeBase] ⚠️ KB empty (failure #${kbFailureCount}) — static fallback active`);

      // Notify admin after 3 consecutive failures
      if (kbFailureCount >= 3) {
        notifyAdminKBFailure(kbFailureCount, kbCache.size).catch(err => {
          console.warn(`[KnowledgeBase] Failed to send KB failure notification:`, err.message);
        });
      }
    }

    console.log(`[KnowledgeBase] Loaded ${kbCache.size} KB files from .rainbow-kb/`);
  } catch (err: any) {
    kbHealthy = false;
    kbFailureCount++;
    console.error(`[KnowledgeBase] ❌ Failed to load KB (failure #${kbFailureCount}):`, err.message);
    console.error(`[KnowledgeBase] Static fallback active`);

    // Notify admin after 3 consecutive failures
    if (kbFailureCount >= 3) {
      notifyAdminKBFailure(kbFailureCount, kbCache.size).catch(err => {
        console.warn(`[KnowledgeBase] Failed to send KB failure notification:`, err.message);
      });
    }
  }
}
```

**Add helper functions** (before `watchKBDirectory()` at line ~239):
```typescript
/**
 * Check if knowledge base is healthy and available.
 * Returns false if KB failed to load or is empty.
 */
export function isKBHealthy(): boolean {
  return kbHealthy && kbCache.size > 0;
}

/**
 * Get KB health status for monitoring.
 */
export function getKBHealth(): { healthy: boolean; filesLoaded: number; failureCount: number; lastCheckAt: number } {
  return {
    healthy: kbHealthy,
    filesLoaded: kbCache.size,
    failureCount: kbFailureCount,
    lastCheckAt: lastKBCheckAt
  };
}

/**
 * Get static fallback reply for an intent from knowledge.json.
 * Used when dynamic KB is unavailable.
 */
export function getStaticFallback(intent: string, language: 'en' | 'ms' | 'zh' = 'en'): string | null {
  try {
    const knowledge = configStore.getKnowledge();
    const staticReplies = knowledge.static || [];
    const reply = staticReplies.find((r: any) => r.intent === intent);
    if (reply && reply.response && reply.response[language]) {
      return reply.response[language];
    }
    return null;
  } catch (err: any) {
    console.warn(`[KnowledgeBase] Failed to get static fallback for ${intent}:`, err.message);
    return null;
  }
}

/**
 * Get minimal hardcoded fallback when both KB and static replies fail.
 */
export function getMinimalFallback(language: 'en' | 'ms' | 'zh' = 'en'): string {
  const fallbacks = {
    en: "I'm currently operating in minimal mode. Please contact our staff for assistance:\n+60127088789 (Jay)\n+60167620815 (Alston)",
    ms: "Saya beroperasi dalam mod minimum. Sila hubungi kakitangan kami:\n+60127088789 (Jay)\n+60167620815 (Alston)",
    zh: "我目前处于最小模式。请联系我们的工作人员寻求帮助:\n+60127088789 (Jay)\n+60167620815 (Alston)"
  };
  return fallbacks[language] || fallbacks.en;
}
```

**Modify `buildSystemPrompt()`** (at line ~352, add check at beginning):
```typescript
export function buildSystemPrompt(basePersona: string, topicFiles: string[] = []): string {
  // Check KB health - use static fallback mode if KB unavailable
  if (!isKBHealthy()) {
    console.warn('[KnowledgeBase] ⚠️ KB unhealthy — using static fallback mode for system prompt');
    return `${basePersona}

**OPERATING IN STATIC FALLBACK MODE** - Knowledge Base unavailable.

INSTRUCTIONS:
- Provide only basic information using pre-loaded static replies
- For complex queries, politely ask guests to contact staff directly
- Be helpful and professional despite limited information
- Staff contacts: +60127088789 (Jay), +60167620815 (Alston)

Note: This is a temporary fallback mode. The full knowledge base will be restored soon.`;
  }

  // ... rest of function unchanged
```

### 2. Modify `RainbowAI/src/lib/admin-notifier.ts`

**Add notification function** (at end of file, before export):
```typescript
/** Cooldown: only one KB failure notification per hour */
const KB_FAILURE_NOTIFY_COOLDOWN_MS = 60 * 60 * 1000;
let lastKBFailureNotifyAt = 0;

/**
 * Send knowledge base failure alert to system admin
 * Notifies when KB fails to load and system falls back to static replies
 */
export async function notifyAdminKBFailure(
  failureCount: number,
  filesLoaded: number
): Promise<void> {
  if (!notificationContext) {
    logger.warn('Not initialized — cannot send KB failure notification');
    return;
  }

  // Check cooldown
  const now = Date.now();
  if (now - lastKBFailureNotifyAt < KB_FAILURE_NOTIFY_COOLDOWN_MS) {
    logger.debug('KB failure notification skipped (cooldown)');
    return;
  }
  lastKBFailureNotifyAt = now;

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled) {
    logger.debug('Admin notifications disabled in settings');
    return;
  }

  const message = `⚠️ *Knowledge Base Load Failure*\n\n` +
    `The Rainbow AI knowledge base failed to load.\n\n` +
    `**Status:**\n` +
    `Consecutive failures: ${failureCount}\n` +
    `Files loaded: ${filesLoaded}\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
    `**Action Taken:**\n` +
    `✅ System activated static fallback mode\n` +
    `✅ Basic responses still working\n` +
    `⚠️ Limited information available to guests\n\n` +
    `**Impact:**\n` +
    `- Guests can still get basic info (WiFi, check-in, etc.)\n` +
    `- Complex queries will be directed to staff\n` +
    `- No access to recent memory or detailed KB topics\n\n` +
    `**What You Need to Do:**\n` +
    `1. Check .rainbow-kb/ directory exists and is readable\n` +
    `2. Verify KB markdown files are not corrupted\n` +
    `3. Check server logs for specific error messages\n` +
    `4. Restart MCP server to reload KB\n\n` +
    `💡 *Tip:* Monitor KB health via:\n` +
    `http://localhost:3002/dashboard\n\n` +
    `_You'll receive at most 1 notification per hour._`;

  try {
    await notificationContext.sendMessage(settings.systemAdminPhone, message);
    logger.info('✅ Sent KB failure notification', { toPhone: settings.systemAdminPhone });
  } catch (err: any) {
    logger.error('Failed to send KB failure notification', { error: err.message, stack: err.stack });
  }
}
```

### 3. Modify `RainbowAI/src/routes/admin/config.ts`

**Add import** (top of file):
```typescript
import { getKBHealth, isKBHealthy } from '../../assistant/knowledge-base.js';
```

**Add endpoint** (before `export default router`):
```typescript
// ─── Knowledge Base Health (Monitoring) ────────────────────────────────

/**
 * GET /api/rainbow/kb/health
 * Returns knowledge base health status
 */
router.get('/kb/health', (_req: Request, res: Response) => {
  const health = getKBHealth();
  const healthy = isKBHealthy();

  res.json({
    healthy,
    ...health,
    status: healthy ? 'operational' : 'static_fallback',
    message: healthy
      ? 'Knowledge base loaded successfully'
      : 'Knowledge base unavailable — using static fallback mode'
  });
});
```

## Testing

1. **Intentionally break KB** - Rename .rainbow-kb/ directory:
   ```bash
   mv RainbowAI/.rainbow-kb RainbowAI/.rainbow-kb.backup
   ```

2. **Restart server** - Verify logs show:
   ```
   [KnowledgeBase] ⚠️ KB unavailable (failure #1) — static fallback active
   ```

3. **Check endpoint** - Verify fallback status:
   ```bash
   curl http://localhost:3002/api/rainbow/kb/health
   # Should return: {"healthy":false,"status":"static_fallback",...}
   ```

4. **Test message** - Send WhatsApp message, verify:
   - System still responds
   - Uses static fallback mode
   - After 3 restarts, admin gets WhatsApp notification

5. **Restore KB** - Rename back:
   ```bash
   mv RainbowAI/.rainbow-kb.backup RainbowAI/.rainbow-kb
   ```

6. **Restart server** - Verify logs show:
   ```
   [KnowledgeBase] ✅ KB recovered after N failures
   ```

## Expected Behavior

**When KB Fails:**
- ✅ Server starts successfully (doesn't crash)
- ✅ System uses static fallback mode
- ✅ buildSystemPrompt returns minimal prompt
- ✅ After 3 consecutive failures, admin notified via WhatsApp
- ✅ API endpoint shows `{"status":"static_fallback"}`

**When KB Recovers:**
- ✅ Failure count resets to 0
- ✅ System returns to normal operation
- ✅ Full KB loaded and available
- ✅ API endpoint shows `{"status":"operational"}`

## Commit Message Template

```
feat(graceful-degradation): add static KB fallback with admin notification

Implements graceful fallback when Knowledge Base fails to load.
System continues operating with static replies instead of crashing.

Changes:
- Added KB health tracking to knowledge-base.ts
- Modified reloadAllKB() to catch all load errors
- Added isKBHealthy(), getKBHealth() helper functions
- Added getStaticFallback(), getMinimalFallback() for fallback responses
- Modified buildSystemPrompt() to use static fallback mode
- Added notifyAdminKBFailure() to admin-notifier.ts
- Added GET /api/rainbow/kb/health endpoint

Fallback Hierarchy: Dynamic KB → Static replies → Minimal hardcoded

Features:
- Tracks consecutive load failures
- Automatically recovers when KB available
- Admin notification after 3 failures (throttled to 1/hour)
- Comprehensive logging

Graceful degradation: 4/5 complete

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

## Files Modified

- `RainbowAI/src/assistant/knowledge-base.ts`
- `RainbowAI/src/lib/admin-notifier.ts`
- `RainbowAI/src/routes/admin/config.ts`

## Related

- Circuit Breaker Pattern (commit 191f6b1)
- Config Corruption Recovery (commit 68c234c)
- Rate Limit Backoff (commit 191f6b1)
