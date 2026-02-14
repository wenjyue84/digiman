import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../../lib/db.js';
import { appSettings, updateFeedbackSettingsSchema } from '../../../../shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import { configStore } from '../../assistant/config-store.js';
import { badRequest, serverError } from './http-utils.js';

const router = Router();

// ─── GET /api/feedback/settings ─────────────────────────────
// Get current feedback settings
router.get('/feedback/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await db
      .select()
      .from(appSettings)
      .where(sql`${appSettings.key} LIKE 'rainbow_feedback_%'`);

    const config: any = {
      enabled: true,
      frequency_minutes: 30,
      timeout_minutes: 2,
      skip_intents: ['greeting', 'thanks', 'acknowledgment', 'escalate', 'contact_staff', 'unknown', 'general'],
      prompts: {
        en: 'Was this helpful? 👍 👎',
        ms: 'Adakah ini membantu? 👍 👎',
        zh: '这个回答有帮助吗？👍 👎'
      }
    };

    for (const setting of settings) {
      const shortKey = setting.key.replace('rainbow_feedback_', '');
      if (shortKey === 'enabled') {
        config.enabled = setting.value === 'true';
      } else if (shortKey === 'frequency_minutes') {
        config.frequency_minutes = parseInt(setting.value);
      } else if (shortKey === 'timeout_minutes') {
        config.timeout_minutes = parseInt(setting.value);
      } else if (shortKey === 'skip_intents') {
        config.skip_intents = JSON.parse(setting.value);
      } else if (shortKey === 'prompts') {
        config.prompts = JSON.parse(setting.value);
      }
    }

    res.json({ success: true, settings: config });
  } catch (error) {
    console.error('[Feedback Settings] ❌ Error loading settings:', error);
    serverError(res, 'Failed to load feedback settings');
  }
});

// ─── PATCH /api/feedback/settings ───────────────────────────
// Update feedback settings (hot-reload)
router.patch('/feedback/settings', async (req: Request, res: Response) => {
  try {
    const validated = updateFeedbackSettingsSchema.parse(req.body);

    // Update each setting in the database
    const updates: Promise<any>[] = [];

    if (validated.enabled !== undefined) {
      updates.push(
        db.update(appSettings)
          .set({ value: String(validated.enabled), updatedAt: new Date() })
          .where(eq(appSettings.key, 'rainbow_feedback_enabled'))
      );
    }

    if (validated.frequency_minutes !== undefined) {
      updates.push(
        db.update(appSettings)
          .set({ value: String(validated.frequency_minutes), updatedAt: new Date() })
          .where(eq(appSettings.key, 'rainbow_feedback_frequency_minutes'))
      );
    }

    if (validated.timeout_minutes !== undefined) {
      updates.push(
        db.update(appSettings)
          .set({ value: String(validated.timeout_minutes), updatedAt: new Date() })
          .where(eq(appSettings.key, 'rainbow_feedback_timeout_minutes'))
      );
    }

    if (validated.skip_intents !== undefined) {
      updates.push(
        db.update(appSettings)
          .set({ value: JSON.stringify(validated.skip_intents), updatedAt: new Date() })
          .where(eq(appSettings.key, 'rainbow_feedback_skip_intents'))
      );
    }

    if (validated.prompts !== undefined) {
      updates.push(
        db.update(appSettings)
          .set({ value: JSON.stringify(validated.prompts), updatedAt: new Date() })
          .where(eq(appSettings.key, 'rainbow_feedback_prompts'))
      );
    }

    await Promise.all(updates);

    console.log('[Feedback Settings] ✅ Updated settings');

    // Trigger hot-reload
    configStore.emit('reload', 'feedback');

    res.json({ success: true, message: 'Feedback settings updated' });
  } catch (error) {
    console.error('[Feedback Settings] ❌ Error updating settings:', error);
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      badRequest(res, 'Validation error');
    } else {
      serverError(res, 'Failed to update feedback settings');
    }
  }
});

export default router;
