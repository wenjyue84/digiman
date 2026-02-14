/**
 * Pipeline Phase 1: Input Validation & Preprocessing
 *
 * Handles: group filtering, non-text messages, empty text, staff commands,
 * rate limiting, language detection/translation, conversation setup, sentiment.
 */
import type { IncomingMessage, MessageType } from '../types.js';
import type { RouterContext, ValidationResult, PipelineState } from './types.js';
import type { ConversationEvent } from '../memory-writer.js';
import { getOrCreate, addMessage, getOrCreate as getConversation, updateSlots } from '../conversation.js';
import { checkRate } from '../rate-limiter.js';
import { detectLanguage, getTemplate, detectFullLanguage } from '../formatter.js';
import { configStore } from '../config-store.js';
import { handleStaffReply, escalateToStaff } from '../escalation.js';
import { isAIAvailable, translateText } from '../ai-client.js';
import { logMessage, logNonTextExchange } from '../conversation-logger.js';
import { setDynamicKnowledge, deleteDynamicKnowledge, listDynamicKnowledge } from '../knowledge.js';
import { resetSentimentTracking, analyzeSentiment, trackSentiment, isSentimentAnalysisEnabled } from '../sentiment-tracker.js';
import { trackMessageReceived, trackRateLimited } from '../../lib/activity-tracker.js';

// ─── Helpers ────────────────────────────────────────────────────────

/** Prevent raw LLM JSON from being sent to the guest. */
export function ensureResponseText(response: string, lang: 'en' | 'ms' | 'zh'): string {
  const t = response.trim();
  if (!t || !t.startsWith('{') || !t.includes('"')) return response;
  try {
    const parsed = JSON.parse(t);
    const text = typeof parsed.response === 'string' ? parsed.response.trim() : '';
    if (text && !text.trimStart().startsWith('{')) return text;
  } catch {
    // not valid JSON — don't send to guest
  }
  console.warn('[Router] Stripped JSON-like response before send, using error template');
  return getTemplate('error', lang);
}

/** Placeholder content for non-text messages so live chat shows "[Image]", etc. */
function getNonTextPlaceholder(messageType: MessageType): string {
  const labels: Record<MessageType, string> = {
    text: '',
    image: '[Image]',
    audio: '[Voice message]',
    video: '[Video]',
    sticker: '[Sticker]',
    document: '[Document]',
    contact: '[Contact]',
    location: '[Location]'
  };
  return labels[messageType] || `[${messageType}]`;
}

/**
 * Get the response mode for a conversation.
 * Per-conversation override takes precedence over global default.
 */
export function getConversationMode(phone: string): 'autopilot' | 'copilot' | 'manual' {
  const convo = getConversation(phone, 'Guest');
  const settings = configStore.getSettings();

  if (convo?.slots?.responseMode) {
    return convo.slots.responseMode as 'autopilot' | 'copilot' | 'manual';
  }

  return (settings as any).response_modes?.default_mode || 'autopilot';
}

export function isStaffPhone(jid: string, ctx: RouterContext): boolean {
  const staffPhones = configStore.getSettings().staff.phones;
  if (staffPhones.some(num => jid.includes(num))) return true;
  if (ctx.jayLID && jid === ctx.jayLID) return true;
  return false;
}

export async function handleStaffCommand(
  phone: string, text: string, instanceId: string | undefined, ctx: RouterContext
): Promise<void> {
  const parts = text.split(/\s+/);
  const command = parts[0]?.toLowerCase();

  switch (command) {
    case '!update':
    case '!add': {
      const topic = parts[1];
      const content = parts.slice(2).join(' ');
      if (!topic || !content) {
        await ctx.sendMessage(phone, '⚠️ Usage: !update <topic> <content>\nExample: !update wifi New password is ABC123', instanceId);
        return;
      }
      setDynamicKnowledge(topic, content);
      await ctx.sendMessage(phone, `✅ Knowledge updated: *${topic}*\n${content}`, instanceId);
      return;
    }

    case '!list': {
      const topics = listDynamicKnowledge();
      if (topics.length === 0) {
        await ctx.sendMessage(phone, '📋 No dynamic knowledge entries yet.\nUse !add <topic> <content> to add one.', instanceId);
        return;
      }
      const list = topics.map((t, i) => `${i + 1}. ${t}`).join('\n');
      await ctx.sendMessage(phone, `📋 *Dynamic Knowledge Topics:*\n${list}`, instanceId);
      return;
    }

    case '!delete': {
      const topic = parts[1];
      if (!topic) {
        await ctx.sendMessage(phone, '⚠️ Usage: !delete <topic>', instanceId);
        return;
      }
      const deleted = deleteDynamicKnowledge(topic);
      if (deleted) {
        await ctx.sendMessage(phone, `🗑️ Deleted: *${topic}*`, instanceId);
      } else {
        await ctx.sendMessage(phone, `⚠️ Topic not found: *${topic}*`, instanceId);
      }
      return;
    }

    default:
      await ctx.sendMessage(phone, '⚠️ Unknown command. Available: !update, !add, !list, !delete', instanceId);
      return;
  }
}

// ─── Main validation & preprocessing ────────────────────────────────

export async function validateAndPrepare(
  msg: IncomingMessage, ctx: RouterContext
): Promise<ValidationResult> {
  // Skip group messages
  if (msg.isGroup) return { continue: false, reason: 'group' };

  const phone = msg.from;

  // Handle non-text messages
  if (msg.messageType !== 'text') {
    console.log(`[Router] ${phone} (${msg.pushName}): [${msg.messageType}]`);
    const lang = msg.text ? detectLanguage(msg.text) : 'en';
    const nonTextLabel = getNonTextPlaceholder(msg.messageType);
    const replyText = getTemplate('non_text', lang);
    await ctx.sendMessage(phone, replyText, msg.instanceId);
    await logNonTextExchange(phone, msg.pushName, nonTextLabel, replyText, msg.instanceId);
    return { continue: false, reason: 'non_text' };
  }

  // Skip empty
  const text = msg.text.trim();
  if (!text) return { continue: false, reason: 'empty' };

  console.log(`[Router] ${phone} (${msg.pushName}): ${text.slice(0, 100)}`);
  trackMessageReceived(phone, msg.pushName, text);

  // ─── Staff Commands & Escalation Tracking ──────────────────────
  if (isStaffPhone(phone, ctx)) {
    if (!ctx.jayLID && phone.includes('@lid')) {
      ctx.jayLID = phone;
      console.log(`[Router] Jay's LID stored: ${ctx.jayLID}`);
    }

    handleStaffReply(phone);
    resetSentimentTracking(phone);

    if (text.startsWith('!')) {
      await handleStaffCommand(phone, text, msg.instanceId, ctx);
      return { continue: false, reason: 'staff_command' };
    }
  }

  // Rate limit check
  const rateResult = checkRate(phone);
  if (!rateResult.allowed) {
    trackRateLimited(phone);
    const lang = detectLanguage(text);
    const response = getTemplate('rate_limited', lang);
    if (rateResult.reason === 'per-minute limit exceeded') {
      await ctx.sendMessage(phone, response, msg.instanceId);
    }
    return { continue: false, reason: 'rate_limited' };
  }

  // Language detection + translation
  const foreignLang = detectFullLanguage(text);
  let processText = text;
  if (foreignLang && isAIAvailable()) {
    console.log(`[Router] Detected ${foreignLang} — translating to English for processing`);
    const translated = await translateText(text, foreignLang, 'English');
    if (translated) processText = translated;
  }

  // Get or create conversation
  const convo = getOrCreate(phone, msg.pushName);
  addMessage(phone, 'user', text);
  logMessage(phone, msg.pushName, 'user', text, { instanceId: msg.instanceId }).catch(() => { });
  const lang = convo.language;

  // Sentiment analysis
  if (isSentimentAnalysisEnabled()) {
    const messageSentiment = analyzeSentiment(processText);
    trackSentiment(phone, text, messageSentiment);
    console.log(`[Sentiment] ${phone}: ${messageSentiment} (${text.slice(0, 50)}...)`);
  }

  // Build initial diary event and dev metadata
  const diaryEvent: ConversationEvent = {
    phone, pushName: msg.pushName, intent: '', action: '',
    messageType: 'info', confidence: 1, guestText: text,
    escalated: false, bookingStarted: false, workflowStarted: false
  };

  const devMetadata = {
    source: 'unknown' as string,
    model: undefined as string | undefined,
    responseTime: undefined as number | undefined,
    kbFiles: [] as string[],
    routedAction: 'unknown' as string
  };

  return {
    continue: true,
    state: {
      msg, phone, text, processText, foreignLang,
      convo, lang, diaryEvent, devMetadata, response: null
    }
  };
}
