import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { IncomingMessage, SendMessageFn, CallAPIFn, MessageType } from './types.js';
import { isEmergency, classifyMessageWithContext } from './intents.js';
import { setDynamicKnowledge, deleteDynamicKnowledge, listDynamicKnowledge, getStaticReply } from './knowledge.js';
import { getOrCreate, addMessage, updateBookingState, updateWorkflowState, incrementUnknown, resetUnknown, updateLastIntent, checkRepeatIntent } from './conversation.js';
import { detectMessageType } from './problem-detector.js';
import { checkRate } from './rate-limiter.js';
import { detectLanguage, getTemplate, detectFullLanguage } from './formatter.js';
import { configStore } from './config-store.js';
import { escalateToStaff, shouldEscalate, handleStaffReply } from './escalation.js';
import { handleBookingStep, createBookingState } from './booking.js';
import { isAIAvailable, classifyAndRespond, classifyOnly, generateReplyOnly, translateText, classifyAndRespondWithSmartFallback } from './ai-client.js';
import { buildSystemPrompt, guessTopicFiles } from './knowledge-base.js';
import { sendWhatsAppTypingIndicator } from '../lib/baileys-client.js';
import { initWorkflowExecutor, executeWorkflowStep, createWorkflowState, forwardWorkflowSummary } from './workflow-executor.js';
import { maybeWriteDiary } from './memory-writer.js';
import type { ConversationEvent } from './memory-writer.js';
import { logMessage, logNonTextExchange } from './conversation-logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
import {
  shouldAskFeedback,
  setAwaitingFeedback,
  isAwaitingFeedback,
  clearAwaitingFeedback,
  detectFeedbackResponse,
  buildFeedbackData,
  getFeedbackPrompt
} from './feedback.js';
import axios from 'axios';
import { trackIntentPrediction, markIntentCorrection, markIntentCorrect } from './intent-tracker.js';
import {
  analyzeSentiment,
  trackSentiment,
  shouldEscalateOnSentiment,
  markSentimentEscalation,
  resetSentimentTracking,
  isSentimentAnalysisEnabled
} from './sentiment-tracker.js';
import { applyConversationSummarization } from './conversation-summarizer.js';
import {
  trackMessageReceived, trackIntentClassified, trackResponseSent,
  trackEscalation, trackWorkflowStarted, trackBookingStarted,
  trackError, trackFeedback, trackRateLimited, trackEmergency
} from '../lib/activity-tracker.js';

let sendMessage: SendMessageFn;
let callAPI: CallAPIFn;

let jayLID: string | null = null; // Stored after first staff command

/** Placeholder content for non-text messages so live chat shows "Voice message", "[Image]", etc. */
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

function loadRouterConfig(): void {
  // Config reload hook — currently used for workflow/settings changes
}

export function initRouter(send: SendMessageFn, api: CallAPIFn): void {
  sendMessage = send;
  callAPI = api;
  initWorkflowExecutor(send); // Initialize workflow executor
  loadRouterConfig();
  configStore.on('reload', (domain: string) => {
    if (domain === 'workflow' || domain === 'settings' || domain === 'routing' || domain === 'all') {
      loadRouterConfig();
      console.log('[Router] Config reloaded');
    }
  });
}

export async function handleIncomingMessage(msg: IncomingMessage): Promise<void> {
  // Skip group messages
  if (msg.isGroup) return;

  const phone = msg.from;

  // Handle non-text messages (images, audio, video, stickers, etc.)
  if (msg.messageType !== 'text') {
    console.log(`[Router] ${phone} (${msg.pushName}): [${msg.messageType}]`);
    const lang = msg.text ? detectLanguage(msg.text) : 'en';
    const nonTextLabel = getNonTextPlaceholder(msg.messageType);
    const replyText = getTemplate('non_text', lang);
    await sendMessage(phone, replyText, msg.instanceId);
    await logNonTextExchange(phone, msg.pushName, nonTextLabel, replyText, msg.instanceId);
    return;
  }

  // Skip empty
  const text = msg.text.trim();
  if (!text) return;

  console.log(`[Router] ${phone} (${msg.pushName}): ${text.slice(0, 100)}`);

  // Track incoming message for real-time activity feed
  trackMessageReceived(phone, msg.pushName, text);

  try {
    // ─── Staff Commands & Escalation Tracking ──────────────────────
    if (isStaffPhone(phone)) {
      // Store Jay's LID for future matching
      if (!jayLID && phone.includes('@lid')) {
        jayLID = phone;
        console.log(`[Router] Jay's LID stored: ${jayLID}`);
      }

      // Clear escalation timers when staff replies
      handleStaffReply(phone);

      // Reset sentiment tracking when staff replies
      resetSentimentTracking(phone);

      if (text.startsWith('!')) {
        await handleStaffCommand(phone, text, msg.instanceId);
        return;
      }
    }

    // Rate limit check
    const rateResult = checkRate(phone);
    if (!rateResult.allowed) {
      trackRateLimited(phone);
      const lang = detectLanguage(text);
      const response = getTemplate('rate_limited', lang);
      if (rateResult.reason === 'per-minute limit exceeded') {
        await sendMessage(phone, response, msg.instanceId);
      }
      // For hourly limit, silently ignore
      return;
    }

    // Detect if message is in a non-template language (needs LLM translation)
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
    logMessage(phone, msg.pushName, 'user', text, { instanceId: msg.instanceId }).catch(() => {});
    const lang = convo.language;

    // ─── SENTIMENT ANALYSIS ─────────────────────────────────────────
    // Analyze sentiment FIRST (before any early returns)
    if (isSentimentAnalysisEnabled()) {
      const messageSentiment = analyzeSentiment(processText);
      trackSentiment(phone, text, messageSentiment);
      console.log(`[Sentiment] ${phone}: ${messageSentiment} (${text.slice(0, 50)}...)`);
    }

    // ─── FEEDBACK DETECTION ─────────────────────────────────────────
    // Check if user is providing feedback (thumbs up/down, yes/no)
    if (isAwaitingFeedback(phone)) {
      const feedbackRating = detectFeedbackResponse(processText);
      if (feedbackRating !== null) {
        // User is providing feedback!
        console.log(`[Feedback] ${feedbackRating === 1 ? '👍' : '👎'} from ${phone}`);
        trackFeedback(phone, msg.pushName, feedbackRating);

        const feedbackData = buildFeedbackData(phone, feedbackRating, processText);
        if (feedbackData) {
          // Save feedback to database via API (post to self)
          try {
            const port = process.env.PORT || 3002;
            await axios.post(`http://localhost:${port}/api/rainbow/feedback`, feedbackData);
            console.log(`[Feedback] ✅ Saved to database`);

            // Update intent accuracy: thumbs down → incorrect, thumbs up → correct
            if (feedbackData.conversationId) {
              if (feedbackRating === -1) {
                markIntentCorrection(
                  feedbackData.conversationId,
                  'unknown', // We don't know the actual intent from negative feedback alone
                  'feedback'
                ).catch(() => {});
              } else {
                markIntentCorrect(feedbackData.conversationId).catch(() => {});
              }
            }
          } catch (error) {
            console.error(`[Feedback] ❌ Failed to save:`, error);
          }
        }

        // Clear awaiting state
        clearAwaitingFeedback(phone);

        // Send thank you message
        const thankYouMessages = {
          en: feedbackRating === 1
            ? 'Thank you for your feedback! 😊'
            : 'Thank you for your feedback. I\'ll work on improving! 😊',
          ms: feedbackRating === 1
            ? 'Terima kasih atas maklum balas anda! 😊'
            : 'Terima kasih atas maklum balas anda. Saya akan cuba memperbaiki! 😊',
          zh: feedbackRating === 1
            ? '谢谢您的反馈！😊'
            : '谢谢您的反馈。我会努力改进！😊'
        };
        const thankYou = thankYouMessages[lang] || thankYouMessages.en;
        await sendMessage(phone, thankYou, msg.instanceId);
        return; // Done processing feedback
      }
    }

    // If in active workflow, continue workflow execution
    if (convo.workflowState) {
      const result = await executeWorkflowStep(convo.workflowState, text, lang, phone, msg.pushName, msg.instanceId);

      if (result.newState) {
        updateWorkflowState(phone, result.newState);
        addMessage(phone, 'assistant', result.response);
        logMessage(phone, msg.pushName, 'assistant', result.response, { action: 'workflow', instanceId: msg.instanceId }).catch(() => {});
        await sendMessage(phone, result.response, msg.instanceId);
      } else {
        // Workflow complete - forward summary and cleanup
        updateWorkflowState(phone, null);
        addMessage(phone, 'assistant', result.response);
        logMessage(phone, msg.pushName, 'assistant', result.response, { action: 'workflow_complete', instanceId: msg.instanceId }).catch(() => {});
        await sendMessage(phone, result.response, msg.instanceId);

        if (result.shouldForward && result.conversationSummary) {
          const workflows = configStore.getWorkflows();
          const workflow = workflows.workflows.find(w => w.id === convo.workflowState?.workflowId);
          if (workflow) {
            await forwardWorkflowSummary(phone, msg.pushName, workflow, convo.workflowState, msg.instanceId);
          }
        }
      }
      return;
    }

    // If in active booking flow, continue booking state machine
    if (convo.bookingState && !['done', 'cancelled'].includes(convo.bookingState.stage)) {
      const result = await handleBookingStep(convo.bookingState, text, lang, convo.messages);
      updateBookingState(phone, result.newState);
      addMessage(phone, 'assistant', result.response);
      logMessage(phone, msg.pushName, 'assistant', result.response, { action: 'booking', instanceId: msg.instanceId }).catch(() => {});
      await sendMessage(phone, result.response, msg.instanceId);
      return;
    }

    // ─── EMERGENCY CHECK (regex, instant) ────────────────────────
    if (isEmergency(processText)) {
      console.log(`[Router] EMERGENCY detected for ${phone}`);
      trackEmergency(phone, msg.pushName);
      await escalateToStaff({
        phone,
        pushName: msg.pushName,
        reason: 'complaint',
        recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
        originalMessage: text,
        instanceId: msg.instanceId
      });
      // Still get AI response for the guest (empathetic acknowledgment)
    }

    // ─── LLM classify + respond (single call) ───────────────────
    let response: string | null = null;

    // Track conversation event for auto-diary (populated during classification)
    const _diaryEvent: ConversationEvent = {
      phone, pushName: msg.pushName, intent: '', action: '',
      messageType: 'info', confidence: 1, guestText: text,
      escalated: false, bookingStarted: false, workflowStarted: false
    };

    // Track developer mode metadata
    let _devMetadata: {
      source?: string;
      model?: string;
      responseTime?: number;
      kbFiles: string[];
      routedAction?: string;
      workflowId?: string;
      stepId?: string;
    } = {
      source: 'unknown' as string,
      model: undefined as string | undefined,
      responseTime: undefined as number | undefined,
      kbFiles: [] as string[],
      routedAction: 'unknown' as string
    };

    if (isAIAvailable()) {
      // Send typing indicator immediately (composing bubble in WhatsApp)
      sendWhatsAppTypingIndicator(phone, msg.instanceId).catch(() => {});

      // ─── CONVERSATION SUMMARIZATION ─────────────────────────────────
      // Apply conversation summarization to reduce context size
      const summarizationResult = await applyConversationSummarization(convo.messages.slice(0, -1));
      const contextMessages = summarizationResult.messages;

      if (summarizationResult.wasSummarized) {
        console.log(
          `[Router] 📝 Conversation summarized: ${summarizationResult.originalCount} → ${summarizationResult.reducedCount} messages ` +
          `(${Math.round((1 - summarizationResult.reducedCount / summarizationResult.originalCount) * 100)}% reduction)`
        );
      }

      const topicFiles = guessTopicFiles(processText);
      _devMetadata.kbFiles = ['AGENTS.md', 'soul.md', 'memory.md', ...topicFiles];
      console.log(`[Router] KB files: [${topicFiles.join(', ')}]`);
      const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt, topicFiles);

      // Ack timer: send "thinking" message if LLM takes >3s
      let ackSent = false;
      const ackTimer = setTimeout(async () => {
        ackSent = true;
        try {
          // Refresh typing indicator
          await sendWhatsAppTypingIndicator(phone, msg.instanceId);
          const ackText = getTemplate('thinking', lang);
          await sendMessage(phone, ackText, msg.instanceId);
          console.log(`[Router] Sent thinking ack to ${phone} (LLM taking >3s)`);
        } catch { /* non-fatal */ }
      }, 3000);

      const settings = configStore.getSettings();
      const routingMode = settings.routing_mode;
      const isSplitModel = routingMode?.splitModel === true;
      const isTiered = routingMode?.tieredPipeline === true;

      let result: { intent: string; action: string; response: string; confidence: number; model?: string; responseTime?: number; detectedLanguage?: string };

      if (isTiered) {
        // ─── T5 TIERED-HYBRID: Fuzzy→Semantic→LLM pipeline ───
        const startTime = Date.now();
        const tierResult = await classifyMessageWithContext(
          processText,
          contextMessages,
          convo.lastIntent
        );
        const classifyTime = Date.now() - startTime;

        const routingConfig = configStore.getRouting();
        const route = routingConfig[tierResult.category];
        const routedAction: string = route?.action || 'llm_reply';

        // If caught by fuzzy/semantic (not LLM), we skip LLM for static routes
        const caughtByFastTier = tierResult.source === 'fuzzy' || tierResult.source === 'semantic' || tierResult.source === 'regex';

        if (caughtByFastTier && routedAction !== 'llm_reply' && routedAction !== 'reply') {
          // Zero LLM calls — serve static/workflow directly
          clearTimeout(ackTimer);
          result = {
            intent: tierResult.category,
            action: routedAction,
            response: '', // Static/workflow handler below will fill this
            confidence: tierResult.confidence,
            model: 'none (tiered)',
            responseTime: classifyTime,
            detectedLanguage: tierResult.detectedLanguage
          };
          _devMetadata.source = tierResult.source;
          console.log(`[Router] T5 fast path: ${tierResult.source} → ${tierResult.category} (${classifyTime}ms, zero LLM)`);
        } else {
          // Need LLM for reply generation (either llm_reply route or LLM classification)
          if (caughtByFastTier) {
            // Classified by fast tier but needs LLM for reply
            const replyResult = await generateReplyOnly(
              systemPrompt,
              contextMessages,
              processText,
              tierResult.category
            );
            clearTimeout(ackTimer);

            // Use reply confidence if available, otherwise use classification confidence
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
            _devMetadata.source = `${tierResult.source}+llm-reply`;
          } else {
            // LLM tier — full classify+respond (fallback)
            const llmResult = await classifyAndRespond(
              systemPrompt,
              contextMessages,
              processText
            );
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
            _devMetadata.source = 'tiered-llm-fallback';
          }
        }
      } else if (isSplitModel) {
        // ─── T4 SPLIT-MODEL: Fast 8B classify, then conditional 70B reply ───
        const classifyResult = await classifyOnly(
          processText,
          contextMessages,
          routingMode?.classifyProvider
        );
        clearTimeout(ackTimer);

        const routingConfig = configStore.getRouting();
        const route = routingConfig[classifyResult.intent];
        const routedAction: string = route?.action || 'llm_reply';

        // Only call the full model for llm_reply routes
        if (routedAction === 'llm_reply' || routedAction === 'reply') {
          const replyResult = await generateReplyOnly(
            systemPrompt,
            contextMessages,
            processText,
            classifyResult.intent
          );

          // Use reply confidence if available, otherwise use classification confidence
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
          _devMetadata.source = 'split-model';
        } else {
          result = {
            intent: classifyResult.intent,
            action: routedAction,
            response: '', // Static/workflow routes don't need LLM response
            confidence: classifyResult.confidence,
            model: classifyResult.model,
            responseTime: classifyResult.responseTime
          };
          _devMetadata.source = 'split-model-fast';
        }
      } else {
        // ─── DEFAULT (T1/T2/T3): Single LLM call for classify + respond ───
        result = await classifyAndRespond(
          systemPrompt,
          contextMessages,
          processText
        );
        clearTimeout(ackTimer);
        _devMetadata.source = 'llm';
      }

      // Store developer metadata
      _devMetadata.model = result.model;
      _devMetadata.responseTime = result.responseTime;

      // ─── LAYER 2: Response Quality Threshold Check ─────────────────────
      // If confidence is below threshold, retry with smartest LLM + 2x context
      const llmSettings = JSON.parse(
        readFileSync(
          join(__dirname, 'data/llm-settings.json'),
          'utf-8'
        )
      );
      const layer2Threshold = llmSettings.thresholds?.layer2 ?? 0.80;

      if (result.confidence < layer2Threshold && isAIAvailable()) {
        console.log(
          `[Router] 🔸 Layer 2: confidence ${result.confidence.toFixed(2)} < ${layer2Threshold.toFixed(2)} ` +
          `→ retrying with smart fallback`
        );

        const fallbackResult = await classifyAndRespondWithSmartFallback(
          systemPrompt,
          contextMessages,
          processText
        );

        // Update result if fallback succeeded and improved confidence
        if (fallbackResult.confidence > result.confidence) {
          console.log(
            `[Router] ✅ Layer 2 improved confidence: ` +
            `${result.confidence.toFixed(2)} → ${fallbackResult.confidence.toFixed(2)} ` +
            `(${fallbackResult.model})`
          );
          result = fallbackResult;
          _devMetadata.source = (_devMetadata.source || 'llm') + '+layer2';
          _devMetadata.model = fallbackResult.model;
          _devMetadata.responseTime = (result.responseTime || 0) + (fallbackResult.responseTime || 0);
        } else {
          console.log(
            `[Router] ⚠️ Layer 2 fallback did not improve confidence ` +
            `(${fallbackResult.confidence.toFixed(2)})`
          );
        }
      }

      // Look up admin-controlled routing for this intent
      const routingConfig = configStore.getRouting();
      const route = routingConfig[result.intent];
      const routedAction: string = route?.action || result.action;

      // Sub-intent detection + repeat check
      const messageType = detectMessageType(processText);
      const repeatCheck = checkRepeatIntent(phone, result.intent);
      console.log(`[Router] Intent: ${result.intent} | Action: ${result.action} | Routed: ${routedAction} | msgType: ${messageType} | repeat: ${repeatCheck.count} | Confidence: ${result.confidence.toFixed(2)}${ackSent ? ' | ack sent' : ''}${isSplitModel ? ' | split-model' : ''}`);

      // Track intent classification for real-time activity
      trackIntentClassified(result.intent, result.confidence, _devMetadata.source || 'unknown');

      // Populate diary event with classification results
      _diaryEvent.intent = result.intent;
      _diaryEvent.action = routedAction;
      _diaryEvent.messageType = messageType;
      _diaryEvent.confidence = result.confidence;

      // Update developer metadata
      _devMetadata.routedAction = routedAction;

      // Track intent prediction for accuracy monitoring
      const conversationId = `${phone}-${Date.now()}`;
      trackIntentPrediction(
        conversationId,
        phone,
        text,
        result.intent,
        result.confidence,
        _devMetadata.source || 'unknown',
        result.model
      ).catch(() => {}); // Non-fatal

      // Track intent for future repeat detection
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
          console.log(
            `[Router] 🔄 Updated conversation language: ${lang} → ${result.detectedLanguage}`
          );
        }
      }

      /**
       * Resolve the best language for response selection.
       * Priority: tier result (high confidence) > conversation state > default 'en'
       */
      function resolveResponseLanguage(
        tierResultLang: string | undefined,
        conversationLang: 'en' | 'ms' | 'zh',
        confidence: number
      ): 'en' | 'ms' | 'zh' {
        // If tier result has high-confidence language detection, use it
        if (tierResultLang &&
            tierResultLang !== 'unknown' &&
            confidence >= 0.7 &&
            (tierResultLang === 'en' || tierResultLang === 'ms' || tierResultLang === 'zh')) {
          return tierResultLang as 'en' | 'ms' | 'zh';
        }

        // Otherwise use conversation state language
        return conversationLang;
      }

      // Route by admin-controlled action (overrides LLM's action)
      switch (routedAction) {
        case 'static_reply': {
          resetUnknown(phone);

          // Problem Override: if guest has a PROBLEM or COMPLAINT, static reply won't help
          if (messageType === 'complaint') {
            // Complaint about this topic → LLM response + escalate
            const replyLang = resolveResponseLanguage(result.detectedLanguage, lang, result.confidence);
            if (replyLang !== lang && result.detectedLanguage !== 'unknown') {
              console.log(`[Router] 🌍 Language resolved (complaint): '${lang}' → '${replyLang}'`);
            }
            response = result.response || getStaticReply(result.intent, replyLang);
            await escalateToStaff({
              phone, pushName: msg.pushName, reason: 'complaint',
              recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
              originalMessage: text, instanceId: msg.instanceId
            });
            _diaryEvent.escalated = true;
            console.log(`[Router] Complaint override: ${result.intent} → LLM + escalate`);
          } else if (messageType === 'problem') {
            // Problem report → use LLM response (context-aware help)
            const replyLang = resolveResponseLanguage(result.detectedLanguage, lang, result.confidence);
            if (replyLang !== lang && result.detectedLanguage !== 'unknown') {
              console.log(`[Router] 🌍 Language resolved (problem): '${lang}' → '${replyLang}'`);
            }
            response = result.response || getStaticReply(result.intent, replyLang);
            console.log(`[Router] Problem override: ${result.intent} → LLM response`);
          } else if (repeatCheck.isRepeat && repeatCheck.count >= 2) {
            // 3rd+ repeat of same intent → escalate
            const replyLang = resolveResponseLanguage(result.detectedLanguage, lang, result.confidence);
            if (replyLang !== lang && result.detectedLanguage !== 'unknown') {
              console.log(`[Router] 🌍 Language resolved (3rd+ repeat): '${lang}' → '${replyLang}'`);
            }
            response = result.response || getStaticReply(result.intent, replyLang);
            await escalateToStaff({
              phone, pushName: msg.pushName, reason: 'unknown_repeated',
              recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
              originalMessage: text, instanceId: msg.instanceId
            });
            console.log(`[Router] Repeat escalation: ${result.intent} (${repeatCheck.count + 1}x)`);
          } else if (repeatCheck.isRepeat) {
            // 2nd repeat → LLM response (static clearly didn't help)
            const replyLang = resolveResponseLanguage(result.detectedLanguage, lang, result.confidence);
            if (replyLang !== lang && result.detectedLanguage !== 'unknown') {
              console.log(`[Router] 🌍 Language resolved (2nd repeat): '${lang}' → '${replyLang}'`);
            }
            response = result.response || getStaticReply(result.intent, replyLang);
            console.log(`[Router] Repeat override: ${result.intent} → LLM response (2nd time)`);
          } else {
            // Normal info request → serve static reply as before
            // Resolve best language using tier result + conversation state
            const replyLang = resolveResponseLanguage(
              result.detectedLanguage,
              lang,
              result.confidence
            );

            // Log language mismatch for monitoring
            if (replyLang !== lang && result.detectedLanguage !== 'unknown') {
              console.log(
                `[Router] 🌍 Language resolved: state='${lang}' → tier='${replyLang}' ` +
                `(confidence ${(result.confidence * 100).toFixed(0)}%)`
              );
            }

            const staticResponse = getStaticReply(result.intent, replyLang);
            if (staticResponse) {
              response = staticResponse;
            } else {
              console.warn(`[Router] No static reply for "${result.intent}", using LLM response`);
              response = result.response;
            }
          }
          break;
        }

        case 'start_booking': {
          resetUnknown(phone);
          _diaryEvent.bookingStarted = true;
          trackBookingStarted(phone, msg.pushName);
          const bookingState = createBookingState();
          const bookingResult = await handleBookingStep(bookingState, text, lang, convo.messages);
          updateBookingState(phone, bookingResult.newState);
          response = bookingResult.response;
          break;
        }

        case 'escalate': {
          // Send AI's empathetic response + notify staff
          _diaryEvent.escalated = true;
          trackEscalation(phone, msg.pushName, 'complaint');
          response = result.response;
          await escalateToStaff({
            phone,
            pushName: msg.pushName,
            reason: 'complaint',
            recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
            originalMessage: text,
            instanceId: msg.instanceId
          });
          break;
        }

        case 'forward_payment': {
          resetUnknown(phone);
          // Forward to staff + confirm to guest
          const forwardTo = configStore.getWorkflow().payment.forward_to;
          const forwardMsg = `💳 *Payment notification from ${msg.pushName}*\nPhone: ${phone}\nMessage: ${text}`;
          try {
            await sendMessage(forwardTo, forwardMsg, msg.instanceId);
            console.log(`[Router] Payment receipt forwarded to ${forwardTo} for ${phone}`);
          } catch (err: any) {
            console.error(`[Router] Failed to forward payment:`, err.message);
          }
          response = result.response || getTemplate('payment_forwarded', lang);
          break;
        }

        case 'workflow': {
          resetUnknown(phone);
          // Get workflow ID from routing config
          const workflowId = route?.workflow_id;
          if (!workflowId) {
            console.error(`[Router] No workflow_id configured for intent "${result.intent}"`);
            response = result.response;
            break;
          }

          // Start workflow execution
          const workflows = configStore.getWorkflows();
          const workflow = workflows.workflows.find(w => w.id === workflowId);
          if (!workflow) {
            console.error(`[Router] Workflow "${workflowId}" not found`);
            response = result.response;
            break;
          }

          console.log(`[Router] Starting workflow: ${workflow.name} (${workflowId})`);
          _diaryEvent.workflowStarted = true;
          trackWorkflowStarted(phone, msg.pushName, workflow.name);
          const workflowState = createWorkflowState(workflowId);
          const workflowResult = await executeWorkflowStep(workflowState, null, lang, phone, msg.pushName, msg.instanceId);

          if (workflowResult.newState) {
            updateWorkflowState(phone, workflowResult.newState);
          } else {
            // Workflow completed in one step (unlikely but possible)
            if (workflowResult.shouldForward && workflowResult.conversationSummary) {
              await forwardWorkflowSummary(phone, msg.pushName, workflow, workflowState, msg.instanceId);
            }
          }

          response = workflowResult.response;
          if (workflowResult.workflowId) _devMetadata.workflowId = workflowResult.workflowId;
          if (workflowResult.stepId) _devMetadata.stepId = workflowResult.stepId;
          break;
        }

        case 'llm_reply':
        case 'reply':
        default: {
          response = result.response;
          // Low confidence → track for escalation
          if (result.confidence < 0.4) {
            const unknownCount = incrementUnknown(phone);
            const escReason = shouldEscalate(null, unknownCount);
            if (escReason) {
              _diaryEvent.escalated = true;
              await escalateToStaff({
                phone,
                pushName: msg.pushName,
                reason: escReason,
                recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
                originalMessage: text,
                instanceId: msg.instanceId
              });
              resetUnknown(phone);
            }
          } else {
            resetUnknown(phone);
          }
          break;
        }
      }
    } else {
      // AI not available — static fallback
      response = getTemplate('unavailable', lang);
    }

    if (response) {
      // ─── PRIORITY 3: Low-Confidence Handling ─────────────────────────
      // Add disclaimer or escalate based on confidence thresholds
      const llmSettings = JSON.parse(
        readFileSync(
          join(__dirname, 'data/llm-settings.json'),
          'utf-8'
        )
      );
      const lowConfidenceThreshold = llmSettings.thresholds?.lowConfidence ?? 0.5;
      const mediumConfidenceThreshold = llmSettings.thresholds?.mediumConfidence ?? 0.7;

      if (_diaryEvent.confidence < lowConfidenceThreshold) {
        // Very low confidence (<0.5) → Escalate to staff
        console.log(
          `[Router] 🚨 Very low confidence ${_diaryEvent.confidence.toFixed(2)} → escalating to staff`
        );
        _diaryEvent.escalated = true;
        await escalateToStaff({
          phone,
          pushName: msg.pushName,
          reason: 'low_confidence',
          recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
          originalMessage: text,
          instanceId: msg.instanceId
        });

        // Add disclaimer to response from configurable templates
        const disclaimer = getTemplate('confidence_very_low', lang);
        response += disclaimer;
      } else if (_diaryEvent.confidence < mediumConfidenceThreshold) {
        // Medium-low confidence (0.5-0.7) → Add disclaimer only
        console.log(
          `[Router] ⚠️ Medium-low confidence ${_diaryEvent.confidence.toFixed(2)} → adding disclaimer`
        );

        // Add disclaimer from configurable templates
        const disclaimer = getTemplate('confidence_low', lang);
        response += disclaimer;
      }

      // ─── SENTIMENT-BASED ESCALATION ─────────────────────────────────
      // Check if user has sent 2+ consecutive negative messages
      if (isSentimentAnalysisEnabled()) {
        const sentimentCheck = shouldEscalateOnSentiment(phone);
        if (sentimentCheck.shouldEscalate) {
          console.log(
            `[Sentiment] 🚨 Escalating: ${sentimentCheck.consecutiveCount} consecutive negative messages from ${phone}`
          );
          _diaryEvent.escalated = true;
          await escalateToStaff({
            phone,
            pushName: msg.pushName,
            reason: sentimentCheck.reason || 'sentiment_negative',
            recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
            originalMessage: text,
            instanceId: msg.instanceId
          });
          markSentimentEscalation(phone);

          // Add empathetic message to response
          const sentimentMessages = {
            en: "\n\nI sense you may be frustrated. I've alerted our team, and someone will reach out to you shortly. 🙏",
            ms: "\n\nSaya faham anda mungkin kecewa. Saya telah maklumkan pasukan kami, dan seseorang akan menghubungi anda tidak lama lagi. 🙏",
            zh: "\n\n我感觉到您可能有些不满。我已通知我们的团队,他们会尽快与您联系。🙏"
          };
          response += sentimentMessages[lang] || sentimentMessages.en;
        }
      }

      // If guest speaks a non-template language, translate response back
      if (foreignLang && isAIAvailable()) {
        const translatedResponse = await translateText(response, 'English', foreignLang);
        if (translatedResponse) {
          response = translatedResponse;
        }
      }
      addMessage(phone, 'assistant', response);
      logMessage(phone, msg.pushName, 'assistant', response, {
        intent: _diaryEvent.intent || undefined,
        confidence: _diaryEvent.confidence,
        action: _diaryEvent.action || undefined,
        instanceId: msg.instanceId,
        source: _devMetadata.source,
        model: _devMetadata.model,
        responseTime: _devMetadata.responseTime,
        kbFiles: _devMetadata.kbFiles.length > 0 ? _devMetadata.kbFiles : undefined,
        messageType: _diaryEvent.messageType,
        routedAction: _devMetadata.routedAction,
        workflowId: _devMetadata.workflowId,
        stepId: _devMetadata.stepId
      }).catch(() => {});
      await sendMessage(phone, response, msg.instanceId);

      // Track response sent for real-time activity
      trackResponseSent(phone, msg.pushName, _devMetadata.routedAction, _devMetadata.responseTime);

      // ─── FEEDBACK PROMPT ─────────────────────────────────────────────
      // Ask for feedback if conditions are met
      if (shouldAskFeedback(phone, _diaryEvent.intent, _diaryEvent.action)) {
        console.log(`[Feedback] Asking for feedback from ${phone}`);

        // Set awaiting feedback state
        setAwaitingFeedback(
          phone,
          `${phone}-${Date.now()}`, // conversationId
          _diaryEvent.intent,
          _diaryEvent.confidence,
          _devMetadata.model || null,
          _devMetadata.responseTime || null,
          _devMetadata.source || null
        );

        // Send feedback prompt (delayed by 1 second for natural feel)
        setTimeout(async () => {
          const feedbackPrompt = getFeedbackPrompt(lang);
          await sendMessage(phone, feedbackPrompt, msg.instanceId);
        }, 1000);
      }
    }

    // ─── Auto-diary: write noteworthy events to today's memory log ──
    // Uses tracked event data from classification above (no re-classification)
    try {
      maybeWriteDiary(_diaryEvent);
    } catch {
      // Non-fatal — never crash the router over diary writes
    }
  } catch (err: any) {
    console.error(`[Router] Error processing message from ${phone}:`, err.message);
    trackError('message-router', err.message);
    try {
      const lang = detectLanguage(text);
      await sendMessage(phone, getTemplate('error', lang), msg.instanceId);
    } catch {
      // Can't even send error message — give up silently
    }
  }
}

// ─── Staff Helpers ──────────────────────────────────────────────────

function isStaffPhone(jid: string): boolean {
  const staffPhones = configStore.getSettings().staff.phones;
  if (staffPhones.some(num => jid.includes(num))) return true;
  if (jayLID && jid === jayLID) return true;
  return false;
}

async function handleStaffCommand(phone: string, text: string, instanceId?: string): Promise<void> {
  const parts = text.split(/\s+/);
  const command = parts[0]?.toLowerCase();

  switch (command) {
    case '!update':
    case '!add': {
      const topic = parts[1];
      const content = parts.slice(2).join(' ');
      if (!topic || !content) {
        await sendMessage(phone, '⚠️ Usage: !update <topic> <content>\nExample: !update wifi New password is ABC123', instanceId);
        return;
      }
      setDynamicKnowledge(topic, content);
      await sendMessage(phone, `✅ Knowledge updated: *${topic}*\n${content}`, instanceId);
      return;
    }

    case '!list': {
      const topics = listDynamicKnowledge();
      if (topics.length === 0) {
        await sendMessage(phone, '📋 No dynamic knowledge entries yet.\nUse !add <topic> <content> to add one.', instanceId);
        return;
      }
      const list = topics.map((t, i) => `${i + 1}. ${t}`).join('\n');
      await sendMessage(phone, `📋 *Dynamic Knowledge Topics:*\n${list}`, instanceId);
      return;
    }

    case '!delete': {
      const topic = parts[1];
      if (!topic) {
        await sendMessage(phone, '⚠️ Usage: !delete <topic>', instanceId);
        return;
      }
      const deleted = deleteDynamicKnowledge(topic);
      if (deleted) {
        await sendMessage(phone, `🗑️ Deleted: *${topic}*`, instanceId);
      } else {
        await sendMessage(phone, `⚠️ Topic not found: *${topic}*`, instanceId);
      }
      return;
    }

    default:
      await sendMessage(phone, '⚠️ Unknown command. Available: !update, !add, !list, !delete', instanceId);
      return;
  }
}
