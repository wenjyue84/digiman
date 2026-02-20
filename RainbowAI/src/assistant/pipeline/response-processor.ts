/**
 * Pipeline Phase 4: Response Processing & Delivery
 *
 * Handles: JSON safety check, confidence thresholds + disclaimers,
 * sentiment-based escalation, foreign language translation,
 * response mode dispatch (manual/copilot/autopilot),
 * logging, tracking, and feedback prompts.
 */
import type { RouterContext, PipelineState } from './types.js';
import { ensureResponseText, getConversationMode } from './input-validator.js';
import { configStore } from '../config-store.js';
import { getLLMSettings } from '../llm-settings-loader.js';
import { addMessage } from '../conversation.js';
import { isAIAvailable, translateText } from '../ai-client.js';
import { getTemplate } from '../formatter.js';
import { escalateToStaff } from '../escalation.js';
import { logMessage } from '../conversation-logger.js';
import {
  shouldEscalateOnSentiment, markSentimentEscalation,
  isSentimentAnalysisEnabled
} from '../sentiment-tracker.js';
import {
  shouldAskFeedback, setAwaitingFeedback, getFeedbackPrompt
} from '../feedback.js';
import { addApproval } from '../approval-queue.js';
import { trackResponseSent } from '../../lib/activity-tracker.js';
import { getUnknownFallbackMessages } from '../ai-response-generator.js';

// LLM settings loaded via shared cached loader (llm-settings-loader.ts)

export async function processAndSend(
  state: PipelineState, ctx: RouterContext
): Promise<void> {
  const { requestId, phone, text, foreignLang, convo, lang, msg, diaryEvent, devMetadata } = state;
  let response = state.response;

  // Catch-all fallback: if pipeline produced no response, use static fallback
  if (!response || !response.trim()) {
    console.warn(`[ResponseProcessor] Empty response for ${phone}, using static fallback (all_llm_failed)`);
    const fallbacks = getUnknownFallbackMessages();
    response = fallbacks[lang] || fallbacks.en;
  }

  // ─── JSON safety: never send raw LLM JSON to guest ────────────
  response = ensureResponseText(response, lang);

  // ─── Confidence thresholds + disclaimers ───────────────────────
  const llmSettings = getLLMSettings();
  const lowConfidenceThreshold = llmSettings.thresholds?.lowConfidence ?? 0.5;
  const mediumConfidenceThreshold = llmSettings.thresholds?.mediumConfidence ?? 0.7;

  if (diaryEvent.confidence < lowConfidenceThreshold) {
    console.log(
      `[Router] Very low confidence ${diaryEvent.confidence.toFixed(2)} → escalating to staff`
    );
    diaryEvent.escalated = true;
    await escalateToStaff({
      phone,
      pushName: msg.pushName,
      reason: 'low_confidence' as any,
      recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
      originalMessage: text,
      instanceId: msg.instanceId
    });
    const disclaimer = getTemplate('confidence_very_low', lang);
    response += disclaimer;
  } else if (diaryEvent.confidence < mediumConfidenceThreshold) {
    console.log(
      `[Router] Medium-low confidence ${diaryEvent.confidence.toFixed(2)} → adding disclaimer`
    );
    const disclaimer = getTemplate('confidence_low', lang);
    response += disclaimer;
  }

  // ─── Sentiment-based escalation ────────────────────────────────
  if (isSentimentAnalysisEnabled()) {
    const sentimentCheck = shouldEscalateOnSentiment(phone);
    if (sentimentCheck.shouldEscalate) {
      console.log(
        `[Sentiment] Escalating: ${sentimentCheck.consecutiveCount} consecutive negative messages from ${phone}`
      );
      diaryEvent.escalated = true;
      await escalateToStaff({
        phone,
        pushName: msg.pushName,
        reason: (sentimentCheck.reason || 'sentiment_negative') as any,
        recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
        originalMessage: text,
        instanceId: msg.instanceId
      });
      markSentimentEscalation(phone);

      const sentimentMessages = {
        en: "\n\nI sense you may be frustrated. I've alerted our team, and someone will reach out to you shortly.",
        ms: "\n\nSaya faham anda mungkin kecewa. Saya telah maklumkan pasukan kami, dan seseorang akan menghubungi anda tidak lama lagi.",
        zh: "\n\n我感觉到您可能有些不满。我已通知我们的团队,他们会尽快与您联系。"
      };
      response += sentimentMessages[lang] || sentimentMessages.en;
    }
  }

  // ─── Translate back to guest's language ────────────────────────
  if (foreignLang && isAIAvailable()) {
    const translatedResponse = await translateText(response, 'English', foreignLang);
    if (translatedResponse) {
      response = translatedResponse;
    }
  }

  addMessage(phone, 'assistant', response);

  // ─── Mode dispatch: manual / copilot / autopilot ───────────────
  const mode = getConversationMode(phone);

  const logMeta = {
    requestId,
    intent: diaryEvent.intent || undefined,
    confidence: diaryEvent.confidence,
    action: diaryEvent.action || undefined,
    instanceId: msg.instanceId,
    source: devMetadata.source,
    model: devMetadata.model,
    responseTime: devMetadata.responseTime,
    kbFiles: devMetadata.kbFiles.length > 0 ? devMetadata.kbFiles : undefined,
    messageType: diaryEvent.messageType,
    routedAction: devMetadata.routedAction,
    workflowId: devMetadata.workflowId,
    stepId: devMetadata.stepId,
    usage: devMetadata.usage
  };

  if (mode === 'manual') {
    console.log(`[Manual Mode] Skipping AI auto-response for ${phone}`);
    logMessage(phone, msg.pushName, 'assistant', response, {
      ...logMeta, manual: true, skipped_auto_response: true
    } as any).catch(() => { });
    return;
  }

  if (mode === 'copilot') {
    const settings = configStore.getSettings();
    const copilotSettings = (settings as any).response_modes?.copilot;

    const shouldAutoApprove =
      (copilotSettings?.auto_approve_confidence &&
        diaryEvent.confidence >= copilotSettings.auto_approve_confidence) ||
      (copilotSettings?.auto_approve_intents?.includes(diaryEvent.intent));

    if (shouldAutoApprove) {
      console.log(
        `[Copilot] Auto-approving high-confidence response (${diaryEvent.confidence.toFixed(2)} for intent: ${diaryEvent.intent})`
      );
      // Fall through to send below
    } else {
      console.log(
        `[Copilot] Adding response to approval queue (confidence: ${diaryEvent.confidence.toFixed(2)}, intent: ${diaryEvent.intent})`
      );
      const approvalId = addApproval({
        phone,
        pushName: msg.pushName,
        originalMessage: text,
        suggestedResponse: response,
        intent: diaryEvent.intent,
        confidence: diaryEvent.confidence,
        language: lang,
        metadata: {
          source: devMetadata.source || 'unknown',
          model: devMetadata.model || 'unknown',
          kbFiles: devMetadata.kbFiles
        }
      });

      logMessage(phone, msg.pushName, 'assistant', response, {
        ...logMeta, manual: false, pending_approval: true, approval_id: approvalId
      } as any).catch(() => { });

      return; // Don't send yet — waiting for approval
    }
  }

  // ─── Autopilot or auto-approved copilot — send immediately ────
  logMessage(phone, msg.pushName, 'assistant', response, logMeta).catch(() => { });

  // If static reply has an image attachment, send as media with text as caption
  if (state.imageUrl) {
    try {
      const { sendWhatsAppMedia } = await import('../../lib/baileys-client.js');
      const { readFileSync: readF, existsSync: existsF } = await import('fs');
      const { basename, extname } = await import('path');
      const imgPath = state.imageUrl;
      if (existsF(imgPath)) {
        const buffer = readF(imgPath);
        const ext = extname(imgPath).toLowerCase();
        const mimeMap: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
        const mimetype = mimeMap[ext] || 'image/jpeg';
        await sendWhatsAppMedia(phone, buffer, mimetype, basename(imgPath), response, msg.instanceId);
        console.log(`[ResponseProcessor] Sent image + caption for ${phone}: ${imgPath}`);
      } else {
        console.warn(`[ResponseProcessor] Image file not found: ${imgPath}, sending text only`);
        await ctx.sendMessage(phone, response, msg.instanceId);
      }
    } catch (imgErr: any) {
      console.error(`[ResponseProcessor] Failed to send image, falling back to text:`, imgErr.message);
      await ctx.sendMessage(phone, response, msg.instanceId);
    }
  } else {
    await ctx.sendMessage(phone, response, msg.instanceId);
  }
  trackResponseSent(phone, msg.pushName, devMetadata.routedAction || 'unknown', devMetadata.responseTime);

  // ─── Feedback prompt ──────────────────────────────────────────
  if (shouldAskFeedback(phone, diaryEvent.intent, diaryEvent.action)) {
    console.log(`[Feedback] Asking for feedback from ${phone}`);
    setAwaitingFeedback(
      phone,
      `${phone}-${Date.now()}`,
      diaryEvent.intent,
      diaryEvent.confidence,
      devMetadata.model || null,
      devMetadata.responseTime || null,
      devMetadata.source || null
    );

    setTimeout(async () => {
      const feedbackPrompt = getFeedbackPrompt(lang);
      await ctx.sendMessage(phone, feedbackPrompt, msg.instanceId);
    }, 1000);
  }
}
