import type { InsertRainbowFeedbackType } from '../../../shared/schema.js';
import { loadFeedbackSettings } from '../lib/init-feedback-settings.js';
import { configStore } from './config-store.js';

// ─── Feedback State Tracking ────────────────────────────────────────
// Tracks when we last asked for feedback from each phone number

interface FeedbackState {
  lastAskedAt: number; // timestamp
  awaitingFeedback: boolean; // is bot waiting for thumbs up/down response?
  lastMessageId: string; // conversation ID for correlation
  lastIntent: string | null;
  lastConfidence: number | null;
  lastModel: string | null;
  lastResponseTime: number | null;
  lastTier: string | null;
}

const feedbackStates = new Map<string, FeedbackState>();

// ─── Configuration (Loaded from Database) ───────────────────────────
let feedbackConfig = {
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

// Load settings from database on startup
(async () => {
  feedbackConfig = await loadFeedbackSettings();
  console.log('[Feedback] ✅ Settings loaded from database');
})();

// Hot-reload settings when updated
configStore.on('reload', async (type: string) => {
  if (type === 'feedback' || type === 'all') {
    feedbackConfig = await loadFeedbackSettings();
    console.log('[Feedback] ♻️ Settings reloaded');
  }
});

// ─── Should Ask for Feedback? ───────────────────────────────────────
export function shouldAskFeedback(
  phone: string,
  intent: string | null,
  action: string | null
): boolean {
  // Check if feedback is enabled
  if (!feedbackConfig.enabled) {
    return false;
  }

  // Don't ask for static replies or escalations
  if (action === 'static_reply' || action === 'escalate' || action === 'workflow') {
    return false;
  }

  // Don't ask for skip intents
  if (intent && feedbackConfig.skipIntents.has(intent)) {
    return false;
  }

  // Check if we asked recently
  const state = feedbackStates.get(phone);
  if (state) {
    const timeSinceLastAsk = Date.now() - state.lastAskedAt;
    if (timeSinceLastAsk < feedbackConfig.frequencyMs) {
      return false; // Asked too recently
    }
  }

  return true; // OK to ask
}

// ─── Mark as Awaiting Feedback ──────────────────────────────────────
export function setAwaitingFeedback(
  phone: string,
  conversationId: string,
  intent: string | null,
  confidence: number | null,
  model: string | null,
  responseTime: number | null,
  tier: string | null
): void {
  feedbackStates.set(phone, {
    lastAskedAt: Date.now(),
    awaitingFeedback: true,
    lastMessageId: conversationId,
    lastIntent: intent,
    lastConfidence: confidence,
    lastModel: model,
    lastResponseTime: responseTime,
    lastTier: tier,
  });

  // Auto-clear awaiting state after timeout
  setTimeout(() => {
    const current = feedbackStates.get(phone);
    if (current?.lastMessageId === conversationId) {
      current.awaitingFeedback = false;
    }
  }, feedbackConfig.timeoutMs);
}

// ─── Is Awaiting Feedback? ──────────────────────────────────────────
export function isAwaitingFeedback(phone: string): boolean {
  const state = feedbackStates.get(phone);
  return state?.awaitingFeedback ?? false;
}

// ─── Clear Awaiting State ───────────────────────────────────────────
export function clearAwaitingFeedback(phone: string): void {
  const state = feedbackStates.get(phone);
  if (state) {
    state.awaitingFeedback = false;
  }
}

// ─── Get Feedback State ─────────────────────────────────────────────
export function getFeedbackState(phone: string): FeedbackState | null {
  return feedbackStates.get(phone) ?? null;
}

// ─── Detect Feedback Intent ─────────────────────────────────────────
// Detects if the message is a thumbs up/down or yes/no feedback response

export function detectFeedbackResponse(text: string): 1 | -1 | null {
  const normalized = text.toLowerCase().trim();

  // Thumbs up patterns
  const thumbsUpPatterns = [
    '👍',
    'thumbs up',
    'yes',
    'helpful',
    'good',
    'great',
    'thanks',
    'thank you',
    'ok',
    'okay',
    'correct',
    'right',
    'ya',
    'ye',
    'yup',
    'yep',
    'ya',
    'bagus', // Malay: good
    'terima kasih', // Malay: thank you
    '好', // Chinese: good
    '对', // Chinese: correct
    '谢谢', // Chinese: thank you
  ];

  // Thumbs down patterns
  const thumbsDownPatterns = [
    '👎',
    'thumbs down',
    'no',
    'not helpful',
    'bad',
    'wrong',
    'incorrect',
    'nope',
    'nah',
    'tidak', // Malay: no
    'salah', // Malay: wrong
    '不', // Chinese: no
    '错', // Chinese: wrong
  ];

  // Check thumbs up first (longer patterns first for better matching)
  for (const pattern of thumbsUpPatterns) {
    if (normalized.includes(pattern)) {
      return 1; // Thumbs up
    }
  }

  // Check thumbs down
  for (const pattern of thumbsDownPatterns) {
    if (normalized.includes(pattern)) {
      return -1; // Thumbs down
    }
  }

  return null; // Not a feedback response
}

// ─── Build Feedback Data ────────────────────────────────────────────
export function buildFeedbackData(
  phone: string,
  rating: 1 | -1,
  feedbackText?: string
): InsertRainbowFeedbackType | null {
  const state = getFeedbackState(phone);
  if (!state) return null;

  return {
    conversationId: state.lastMessageId,
    phoneNumber: phone,
    intent: state.lastIntent ?? undefined,
    confidence: state.lastConfidence ?? undefined,
    rating,
    feedbackText,
    responseModel: state.lastModel ?? undefined,
    responseTime: state.lastResponseTime ?? undefined,
    tier: state.lastTier ?? undefined,
  };
}

// ─── Get Feedback Prompt Message ────────────────────────────────────
export function getFeedbackPrompt(language: 'en' | 'ms' | 'zh'): string {
  return feedbackConfig.prompts[language] || feedbackConfig.prompts.en;
}
