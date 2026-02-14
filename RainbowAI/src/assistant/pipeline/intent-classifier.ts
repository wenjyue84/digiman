/**
 * Pipeline Phase 3: Intent Classification & Action Dispatch
 *
 * Handles: conversation summarization, KB topic loading, system prompt building,
 * typing indicator, 3 routing modes (tiered/split/default), Layer 2 fallback,
 * route resolution, and the action dispatch switch.
 *
 * Mutates state.response, state.diaryEvent, state.devMetadata.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { RouterContext, PipelineState } from './types.js';
import { ensureResponseText } from './input-validator.js';
import { configStore } from '../config-store.js';
import { classifyMessageWithContext } from '../intents.js';
import { getStaticReply } from '../knowledge.js';
import {
  isAIAvailable, classifyAndRespond, classifyOnly, generateReplyOnly,
  classifyAndRespondWithSmartFallback
} from '../ai-client.js';
import { buildSystemPrompt, getTimeContext, guessTopicFiles } from '../knowledge-base.js';
import { detectLanguage, getTemplate } from '../formatter.js';
import { sendWhatsAppTypingIndicator } from '../../lib/baileys-client.js';
import { applyConversationSummarization } from '../conversation-summarizer.js';
import { detectMessageType } from '../problem-detector.js';
import {
  getOrCreate, addMessage, updateBookingState, updateWorkflowState,
  incrementUnknown, resetUnknown, updateLastIntent, checkRepeatIntent
} from '../conversation.js';
import { handleBookingStep, createBookingState } from '../booking.js';
import { executeWorkflowStep, createWorkflowState, forwardWorkflowSummary } from '../workflow-executor.js';
import { escalateToStaff, shouldEscalate } from '../escalation.js';
import { trackIntentPrediction } from '../intent-tracker.js';
import {
  trackIntentClassified, trackEscalation,
  trackWorkflowStarted, trackBookingStarted
} from '../../lib/activity-tracker.js';
import { logMessage } from '../conversation-logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSISTANT_DATA_DIR = join(__dirname, '..', 'data');

/**
 * Resolve the best language for response selection.
 * Priority: tier result (high confidence) > conversation state > default 'en'
 */
function resolveResponseLanguage(
  tierResultLang: string | undefined,
  conversationLang: 'en' | 'ms' | 'zh',
  confidence: number
): 'en' | 'ms' | 'zh' {
  if (tierResultLang &&
    tierResultLang !== 'unknown' &&
    confidence >= 0.7 &&
    (tierResultLang === 'en' || tierResultLang === 'ms' || tierResultLang === 'zh')) {
    return tierResultLang as 'en' | 'ms' | 'zh';
  }
  return conversationLang;
}

export async function classifyAndRoute(
  state: PipelineState, ctx: RouterContext
): Promise<void> {
  const { phone, processText, convo, lang, text, msg, diaryEvent, devMetadata } = state;

  if (!isAIAvailable()) {
    state.response = getTemplate('unavailable', lang);
    return;
  }

  // Send typing indicator
  sendWhatsAppTypingIndicator(phone, msg.instanceId).catch(() => { });

  // ─── CONVERSATION SUMMARIZATION ─────────────────────────────────
  const summarizationResult = await applyConversationSummarization(convo.messages.slice(0, -1));
  const contextMessages = summarizationResult.messages;

  if (summarizationResult.wasSummarized) {
    console.log(
      `[Router] 📝 Conversation summarized: ${summarizationResult.originalCount} → ${summarizationResult.reducedCount} messages ` +
      `(${Math.round((1 - summarizationResult.reducedCount / summarizationResult.originalCount) * 100)}% reduction)`
    );
  }

  const topicFiles = guessTopicFiles(processText);
  devMetadata.kbFiles = ['AGENTS.md', 'soul.md', 'memory.md', ...topicFiles];
  console.log(`[Router] KB files: [${topicFiles.join(', ')}]`);
  const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt, topicFiles);

  // Ack timer: send "thinking" message if LLM takes >3s
  let ackSent = false;
  const ackTimer = setTimeout(async () => {
    ackSent = true;
    try {
      await sendWhatsAppTypingIndicator(phone, msg.instanceId);
      const ackText = getTemplate('thinking', lang);
      await ctx.sendMessage(phone, ackText, msg.instanceId);
      logMessage(phone, msg.pushName ?? 'Guest', 'assistant', ackText, { action: 'thinking', instanceId: msg.instanceId }).catch(() => {});
      console.log(`[Router] Sent thinking ack to ${phone} (LLM taking >3s)`);
    } catch { /* non-fatal */ }
  }, 3000);

  const settings = configStore.getSettings();
  const routingMode = settings.routing_mode;
  const isSplitModel = routingMode?.splitModel === true;
  const isTiered = routingMode?.tieredPipeline === true;

  let result: { intent: string; action: string; response: string; confidence: number; model?: string; responseTime?: number; detectedLanguage?: string };

  if (isTiered) {
    // ─── TIERED PIPELINE: Fuzzy→Semantic→LLM ───
    const startTime = Date.now();
    const tierResult = await classifyMessageWithContext(processText, contextMessages, convo.lastIntent);
    const classifyTime = Date.now() - startTime;

    const routingConfig = configStore.getRouting();
    const route = routingConfig[tierResult.category];
    const routedAction: string = route?.action || 'llm_reply';

    const caughtByFastTier = tierResult.source === 'fuzzy' || tierResult.source === 'semantic' || tierResult.source === 'regex';

    if (caughtByFastTier && routedAction !== 'llm_reply' && routedAction !== 'reply') {
      clearTimeout(ackTimer);
      result = {
        intent: tierResult.category,
        action: routedAction,
        response: '',
        confidence: tierResult.confidence,
        model: 'none (tiered)',
        responseTime: classifyTime,
        detectedLanguage: tierResult.detectedLanguage
      };
      devMetadata.source = tierResult.source;
      console.log(`[Router] T5 fast path: ${tierResult.source} → ${tierResult.category} (${classifyTime}ms, zero LLM)`);
    } else {
      if (caughtByFastTier) {
        const timeSensitiveSet = configStore.getTimeSensitiveIntentSet();
        const replyPrompt = timeSensitiveSet.has(tierResult.category)
          ? systemPrompt + '\n\n' + getTimeContext()
          : systemPrompt;
        const replyResult = await generateReplyOnly(replyPrompt, contextMessages, processText, tierResult.category);
        clearTimeout(ackTimer);

        const finalConfidence = replyResult.confidence !== undefined
          ? replyResult.confidence
          : tierResult.confidence;

        result = {
          intent: tierResult.category,
          action: routedAction,
          response: replyResult.response,
          confidence: finalConfidence,
          model: replyResult.model,
          responseTime: classifyTime + (replyResult.responseTime || 0),
          detectedLanguage: tierResult.detectedLanguage
        };
        devMetadata.source = `${tierResult.source}+llm-reply`;
      } else {
        const llmResult = await classifyAndRespond(systemPrompt, contextMessages, processText);
        clearTimeout(ackTimer);
        result = {
          intent: llmResult.intent,
          action: llmResult.action,
          response: llmResult.response,
          confidence: llmResult.confidence,
          model: llmResult.model,
          responseTime: classifyTime + (llmResult.responseTime || 0),
          detectedLanguage: tierResult.detectedLanguage
        };
        devMetadata.source = 'tiered-llm-fallback';
      }
    }
  } else if (isSplitModel) {
    // ─── SPLIT MODEL: Fast 8B classify, then conditional 70B reply ───
    const classifyResult = await classifyOnly(processText, contextMessages, routingMode?.classifyProvider);
    clearTimeout(ackTimer);

    const routingConfig = configStore.getRouting();
    const route = routingConfig[classifyResult.intent];
    const routedAction: string = route?.action || 'llm_reply';

    if (routedAction === 'llm_reply' || routedAction === 'reply') {
      const timeSensitiveSet = configStore.getTimeSensitiveIntentSet();
      const replyPrompt = timeSensitiveSet.has(classifyResult.intent)
        ? systemPrompt + '\n\n' + getTimeContext()
        : systemPrompt;
      const replyResult = await generateReplyOnly(replyPrompt, contextMessages, processText, classifyResult.intent);

      const finalConfidence = replyResult.confidence !== undefined
        ? replyResult.confidence
        : classifyResult.confidence;

      result = {
        intent: classifyResult.intent,
        action: routedAction,
        response: replyResult.response,
        confidence: finalConfidence,
        model: `${classifyResult.model} → ${replyResult.model}`,
        responseTime: (classifyResult.responseTime || 0) + (replyResult.responseTime || 0)
      };
      devMetadata.source = 'split-model';
    } else {
      result = {
        intent: classifyResult.intent,
        action: routedAction,
        response: '',
        confidence: classifyResult.confidence,
        model: classifyResult.model,
        responseTime: classifyResult.responseTime
      };
      devMetadata.source = 'split-model-fast';
    }
  } else {
    // ─── DEFAULT: Single LLM call ───
    result = await classifyAndRespond(systemPrompt, contextMessages, processText);
    clearTimeout(ackTimer);
    devMetadata.source = 'llm';
  }

  devMetadata.model = result.model;
  devMetadata.responseTime = result.responseTime;

  // ─── LAYER 2: Response Quality Threshold Check ─────────────────
  const llmSettings = JSON.parse(
    readFileSync(join(ASSISTANT_DATA_DIR, 'llm-settings.json'), 'utf-8')
  );
  const layer2Threshold = llmSettings.thresholds?.layer2 ?? 0.80;

  if (result.confidence < layer2Threshold && isAIAvailable()) {
    console.log(
      `[Router] 🔸 Layer 2: confidence ${result.confidence.toFixed(2)} < ${layer2Threshold.toFixed(2)} → retrying with smart fallback`
    );

    const fallbackResult = await classifyAndRespondWithSmartFallback(systemPrompt, contextMessages, processText);

    if (fallbackResult.confidence > result.confidence) {
      console.log(
        `[Router] ✅ Layer 2 improved confidence: ${result.confidence.toFixed(2)} → ${fallbackResult.confidence.toFixed(2)} (${fallbackResult.model})`
      );
      result = fallbackResult;
      devMetadata.source = (devMetadata.source || 'llm') + '+layer2';
      devMetadata.model = fallbackResult.model;
      devMetadata.responseTime = (result.responseTime || 0) + (fallbackResult.responseTime || 0);
    } else {
      console.log(`[Router] ⚠️ Layer 2 fallback did not improve confidence (${fallbackResult.confidence.toFixed(2)})`);
    }
  }

  // ─── Route resolution & action dispatch ─────────────────────────
  const routingConfig = configStore.getRouting();
  const route = routingConfig[result.intent];
  const routedAction: string = route?.action || result.action;

  const messageType = detectMessageType(processText);
  const repeatCheck = checkRepeatIntent(phone, result.intent);
  console.log(`[Router] Intent: ${result.intent} | Action: ${result.action} | Routed: ${routedAction} | msgType: ${messageType} | repeat: ${repeatCheck.count} | Confidence: ${result.confidence.toFixed(2)}${ackSent ? ' | ack sent' : ''}${isSplitModel ? ' | split-model' : ''}`);

  trackIntentClassified(result.intent, result.confidence, devMetadata.source || 'unknown');

  diaryEvent.intent = result.intent;
  diaryEvent.action = routedAction;
  diaryEvent.messageType = messageType;
  diaryEvent.confidence = result.confidence;
  devMetadata.routedAction = routedAction;

  const conversationId = `${phone}-${Date.now()}`;
  trackIntentPrediction(
    conversationId, phone, text, result.intent, result.confidence,
    devMetadata.source || 'unknown', result.model
  ).catch(() => { });

  updateLastIntent(phone, result.intent, result.confidence);

  // Update conversation language with tier result if more confident
  if (result.detectedLanguage &&
    result.detectedLanguage !== 'unknown' &&
    result.confidence >= 0.8 &&
    result.detectedLanguage !== lang) {
    const updatedConvo = getOrCreate(phone, msg.pushName);
    if (updatedConvo && (result.detectedLanguage === 'en' ||
      result.detectedLanguage === 'ms' ||
      result.detectedLanguage === 'zh')) {
      updatedConvo.language = result.detectedLanguage as 'en' | 'ms' | 'zh';
      console.log(`[Router] 🔄 Updated conversation language: ${lang} → ${result.detectedLanguage}`);
    }
  }

  // ─── Action Switch ──────────────────────────────────────────────
  switch (routedAction) {
    case 'static_reply': {
      resetUnknown(phone);

      if (messageType === 'complaint') {
        const replyLang = resolveResponseLanguage(result.detectedLanguage, lang, result.confidence);
        if (replyLang !== lang && result.detectedLanguage !== 'unknown') {
          console.log(`[Router] 🌍 Language resolved (complaint): '${lang}' → '${replyLang}'`);
        }
        state.response = result.response || getStaticReply(result.intent, replyLang);
        await escalateToStaff({
          phone, pushName: msg.pushName, reason: 'complaint',
          recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
          originalMessage: text, instanceId: msg.instanceId
        });
        diaryEvent.escalated = true;
        console.log(`[Router] Complaint override: ${result.intent} → LLM + escalate`);
      } else if (messageType === 'problem') {
        const replyLang = resolveResponseLanguage(result.detectedLanguage, lang, result.confidence);
        if (replyLang !== lang && result.detectedLanguage !== 'unknown') {
          console.log(`[Router] 🌍 Language resolved (problem): '${lang}' → '${replyLang}'`);
        }
        state.response = result.response || getStaticReply(result.intent, replyLang);
        console.log(`[Router] Problem override: ${result.intent} → LLM response`);
      } else if (repeatCheck.isRepeat && repeatCheck.count >= 2) {
        const replyLang = resolveResponseLanguage(result.detectedLanguage, lang, result.confidence);
        if (replyLang !== lang && result.detectedLanguage !== 'unknown') {
          console.log(`[Router] 🌍 Language resolved (3rd+ repeat): '${lang}' → '${replyLang}'`);
        }
        state.response = result.response || getStaticReply(result.intent, replyLang);
        await escalateToStaff({
          phone, pushName: msg.pushName, reason: 'unknown_repeated',
          recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
          originalMessage: text, instanceId: msg.instanceId
        });
        console.log(`[Router] Repeat escalation: ${result.intent} (${repeatCheck.count + 1}x)`);
      } else if (repeatCheck.isRepeat) {
        const replyLang = resolveResponseLanguage(result.detectedLanguage, lang, result.confidence);
        if (replyLang !== lang && result.detectedLanguage !== 'unknown') {
          console.log(`[Router] 🌍 Language resolved (2nd repeat): '${lang}' → '${replyLang}'`);
        }
        state.response = result.response || getStaticReply(result.intent, replyLang);
        console.log(`[Router] Repeat override: ${result.intent} → LLM response (2nd time)`);
      } else {
        const replyLang = resolveResponseLanguage(result.detectedLanguage, lang, result.confidence);
        if (replyLang !== lang && result.detectedLanguage !== 'unknown') {
          console.log(`[Router] 🌍 Language resolved: state='${lang}' → tier='${replyLang}' (confidence ${(result.confidence * 100).toFixed(0)}%)`);
        }
        const staticResponse = getStaticReply(result.intent, replyLang);
        if (staticResponse) {
          state.response = staticResponse;
        } else {
          console.warn(`[Router] No static reply for "${result.intent}", using LLM response`);
          state.response = result.response;
        }
      }
      break;
    }

    case 'start_booking': {
      resetUnknown(phone);
      diaryEvent.bookingStarted = true;
      trackBookingStarted(phone, msg.pushName);
      const bookingState = createBookingState();
      const bookingResult = await handleBookingStep(bookingState, text, lang, convo.messages);
      updateBookingState(phone, bookingResult.newState);
      state.response = bookingResult.response;
      break;
    }

    case 'escalate': {
      diaryEvent.escalated = true;
      trackEscalation(phone, msg.pushName, 'complaint');
      state.response = result.response;
      await escalateToStaff({
        phone, pushName: msg.pushName, reason: 'complaint',
        recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
        originalMessage: text, instanceId: msg.instanceId
      });
      break;
    }

    case 'forward_payment': {
      resetUnknown(phone);
      const forwardTo = configStore.getWorkflow().payment.forward_to;
      const forwardMsg = `💳 *Payment notification from ${msg.pushName}*\nPhone: ${phone}\nMessage: ${text}`;
      try {
        await ctx.sendMessage(forwardTo, forwardMsg, msg.instanceId);
        console.log(`[Router] Payment receipt forwarded to ${forwardTo} for ${phone}`);
      } catch (err: any) {
        console.error(`[Router] Failed to forward payment:`, err.message);
      }
      state.response = result.response || getTemplate('payment_forwarded', lang);
      break;
    }

    case 'workflow': {
      resetUnknown(phone);
      const workflowId = route?.workflow_id;
      if (!workflowId) {
        console.error(`[Router] No workflow_id configured for intent "${result.intent}"`);
        state.response = result.response;
        break;
      }

      const workflows = configStore.getWorkflows();
      const workflow = workflows.workflows.find(w => w.id === workflowId);
      if (!workflow) {
        console.error(`[Router] Workflow "${workflowId}" not found`);
        state.response = result.response;
        break;
      }

      console.log(`[Router] Starting workflow: ${workflow.name} (${workflowId})`);
      diaryEvent.workflowStarted = true;
      trackWorkflowStarted(phone, msg.pushName, workflow.name);
      const workflowState = createWorkflowState(workflowId);
      const workflowResult = await executeWorkflowStep(workflowState, null, lang, phone, msg.pushName, msg.instanceId);

      if (workflowResult.newState) {
        updateWorkflowState(phone, workflowResult.newState);
      } else {
        if (workflowResult.shouldForward && workflowResult.conversationSummary) {
          await forwardWorkflowSummary(phone, msg.pushName, workflow, workflowState, msg.instanceId);
        }
      }

      state.response = workflowResult.response;
      if (workflowResult.workflowId) devMetadata.workflowId = workflowResult.workflowId;
      if (workflowResult.stepId) devMetadata.stepId = workflowResult.stepId;
      break;
    }

    case 'llm_reply':
    case 'reply':
    default: {
      state.response = result.response;
      if (result.confidence < 0.4) {
        const unknownCount = incrementUnknown(phone);
        const escReason = shouldEscalate(null, unknownCount);
        if (escReason) {
          diaryEvent.escalated = true;
          await escalateToStaff({
            phone, pushName: msg.pushName, reason: escReason,
            recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
            originalMessage: text, instanceId: msg.instanceId
          });
          resetUnknown(phone);
        }
      } else {
        resetUnknown(phone);
      }
      break;
    }
  }
}
