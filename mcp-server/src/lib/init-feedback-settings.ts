import { db, dbReady } from './db.js';
import { appSettings } from '../../../shared/schema.js';
import { sql } from 'drizzle-orm';

// Initialize default feedback settings if not exist
export async function initFeedbackSettings(): Promise<void> {
  // Wait for database connection to be ready
  const isConnected = await dbReady;
  if (!isConnected) {
    console.log('[Feedback Settings] ⚠️ Database not available, skipping initialization');
    return;
  }

  const defaults = {
    'rainbow_feedback_enabled': 'true',
    'rainbow_feedback_frequency_minutes': '30',
    'rainbow_feedback_timeout_minutes': '2',
    'rainbow_feedback_skip_intents': JSON.stringify([
      'greeting', 'thanks', 'acknowledgment',
      'escalate', 'contact_staff', 'unknown', 'general'
    ]),
    'rainbow_feedback_prompts': JSON.stringify({
      en: 'Was this helpful? 👍 👎',
      ms: 'Adakah ini membantu? 👍 👎',
      zh: '这个回答有帮助吗？👍 👎'
    })
  };

  try {
    for (const [key, value] of Object.entries(defaults)) {
      await db.insert(appSettings)
        .values({
          key,
          value,
          description: `Feedback system: ${key.replace('rainbow_feedback_', '')}`,
          updatedBy: null
        })
        .onConflictDoNothing(); // Skip if already exists
    }
    console.log('[Feedback Settings] ✅ Initialized defaults');
  } catch (error) {
    console.error('[Feedback Settings] ❌ Failed to initialize:', error);
  }
}

// Load current feedback settings from database
export async function loadFeedbackSettings(): Promise<{
  enabled: boolean;
  frequencyMs: number;
  timeoutMs: number;
  skipIntents: Set<string>;
  prompts: { en: string; ms: string; zh: string };
}> {
  try {
    // Check if database is ready
    const isConnected = await dbReady;
    if (!isConnected) {
      throw new Error('Database not connected');
    }

    const settings = await db
      .select()
      .from(appSettings)
      .where(sql`${appSettings.key} LIKE 'rainbow_feedback_%'`);

    const config: any = {};
    for (const setting of settings) {
      const shortKey = setting.key.replace('rainbow_feedback_', '');
      config[shortKey] = setting.value;
    }

    return {
      enabled: config.enabled === 'true',
      frequencyMs: parseInt(config.frequency_minutes || '30') * 60 * 1000,
      timeoutMs: parseInt(config.timeout_minutes || '2') * 60 * 1000,
      skipIntents: new Set(JSON.parse(config.skip_intents || '[]')),
      prompts: JSON.parse(config.prompts || '{"en":"Was this helpful? 👍 👎","ms":"Adakah ini membantu? 👍 👎","zh":"这个回答有帮助吗？👍 👎"}')
    };
  } catch (error) {
    console.error('[Feedback Settings] ❌ Failed to load settings, using defaults:', error);
    // Return defaults on error
    return {
      enabled: true,
      frequencyMs: 30 * 60 * 1000,
      timeoutMs: 2 * 60 * 1000,
      skipIntents: new Set(['greeting', 'thanks', 'acknowledgment', 'escalate', 'contact_staff', 'unknown', 'general']),
      prompts: {
        en: 'Was this helpful? 👍 👎',
        ms: 'Adakah ini membantu? 👍 👎',
        zh: '这个回答有帮助吗？👍 👎'
      }
    };
  }
}
