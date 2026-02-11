import type { IncomingMessage, SendMessageFn, CallAPIFn } from './types.js';
import { isEmergency } from './intents.js';
import { setDynamicKnowledge, deleteDynamicKnowledge, listDynamicKnowledge, getStaticReply } from './knowledge.js';
import { getOrCreate, addMessage, updateBookingState, updateWorkflowState, incrementUnknown, resetUnknown, updateLastIntent, checkRepeatIntent } from './conversation.js';
import { detectMessageType } from './problem-detector.js';
import { checkRate } from './rate-limiter.js';
import { detectLanguage, getTemplate, detectFullLanguage } from './formatter.js';
import { escalateToStaff, shouldEscalate, handleStaffReply } from './escalation.js';
import { handleBookingStep, createBookingState } from './booking.js';
import { isAIAvailable, classifyAndRespond, translateText } from './ai-client.js';
import { buildSystemPrompt, guessTopicFiles } from './knowledge-base.js';
import { configStore } from './config-store.js';
import { initWorkflowExecutor, executeWorkflowStep, createWorkflowState, forwardWorkflowSummary } from './workflow-executor.js';
import { maybeWriteDiary } from './memory-writer.js';
import type { ConversationEvent } from './memory-writer.js';
import { logMessage } from './conversation-logger.js';

let sendMessage: SendMessageFn;
let callAPI: CallAPIFn;

let jayLID: string | null = null; // Stored after first staff command

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
    await sendMessage(phone, getTemplate('non_text', lang), msg.instanceId);
    return;
  }

  // Skip empty
  const text = msg.text.trim();
  if (!text) return;

  console.log(`[Router] ${phone} (${msg.pushName}): ${text.slice(0, 100)}`);

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

      if (text.startsWith('!')) {
        await handleStaffCommand(phone, text, msg.instanceId);
        return;
      }
    }

    // Rate limit check
    const rateResult = checkRate(phone);
    if (!rateResult.allowed) {
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
    let _devMetadata = {
      source: 'unknown' as string,
      model: undefined as string | undefined,
      responseTime: undefined as number | undefined,
      kbFiles: [] as string[],
      routedAction: 'unknown' as string
    };

    if (isAIAvailable()) {
      const topicFiles = guessTopicFiles(processText);
      _devMetadata.kbFiles = ['AGENTS.md', 'soul.md', 'memory.md', ...topicFiles];
      console.log(`[Router] KB files: [${topicFiles.join(', ')}]`);
      const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt, topicFiles);
      const result = await classifyAndRespond(
        systemPrompt,
        convo.messages.slice(0, -1),
        processText
      );

      // Store developer metadata
      _devMetadata.model = result.model;
      _devMetadata.responseTime = result.responseTime;

      // Look up admin-controlled routing for this intent
      const routingConfig = configStore.getRouting();
      const route = routingConfig[result.intent];
      const routedAction: string = route?.action || result.action;

      // Sub-intent detection + repeat check
      const messageType = detectMessageType(processText);
      const repeatCheck = checkRepeatIntent(phone, result.intent);
      console.log(`[Router] Intent: ${result.intent} | Action: ${result.action} | Routed: ${routedAction} | msgType: ${messageType} | repeat: ${repeatCheck.count} | Confidence: ${result.confidence.toFixed(2)}`);

      // Populate diary event with classification results
      _diaryEvent.intent = result.intent;
      _diaryEvent.action = routedAction;
      _diaryEvent.messageType = messageType;
      _diaryEvent.confidence = result.confidence;

      // Update developer metadata
      _devMetadata.source = 'llm'; // classifyAndRespond uses LLM
      _devMetadata.routedAction = routedAction;

      // Track intent for future repeat detection
      updateLastIntent(phone, result.intent, result.confidence);

      // Route by admin-controlled action (overrides LLM's action)
      switch (routedAction) {
        case 'static_reply': {
          resetUnknown(phone);

          // Problem Override: if guest has a PROBLEM or COMPLAINT, static reply won't help
          if (messageType === 'complaint') {
            // Complaint about this topic → LLM response + escalate
            response = result.response || getStaticReply(result.intent, lang);
            await escalateToStaff({
              phone, pushName: msg.pushName, reason: 'complaint',
              recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
              originalMessage: text, instanceId: msg.instanceId
            });
            _diaryEvent.escalated = true;
            console.log(`[Router] Complaint override: ${result.intent} → LLM + escalate`);
          } else if (messageType === 'problem') {
            // Problem report → use LLM response (context-aware help)
            response = result.response || getStaticReply(result.intent, lang);
            console.log(`[Router] Problem override: ${result.intent} → LLM response`);
          } else if (repeatCheck.isRepeat && repeatCheck.count >= 2) {
            // 3rd+ repeat of same intent → escalate
            response = result.response || getStaticReply(result.intent, lang);
            await escalateToStaff({
              phone, pushName: msg.pushName, reason: 'unknown_repeated',
              recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
              originalMessage: text, instanceId: msg.instanceId
            });
            console.log(`[Router] Repeat escalation: ${result.intent} (${repeatCheck.count + 1}x)`);
          } else if (repeatCheck.isRepeat) {
            // 2nd repeat → LLM response (static clearly didn't help)
            response = result.response || getStaticReply(result.intent, lang);
            console.log(`[Router] Repeat override: ${result.intent} → LLM response (2nd time)`);
          } else {
            // Normal info request → serve static reply as before
            const staticResponse = getStaticReply(result.intent, lang);
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
          const bookingState = createBookingState();
          const bookingResult = await handleBookingStep(bookingState, text, lang, convo.messages);
          updateBookingState(phone, bookingResult.newState);
          response = bookingResult.response;
          break;
        }

        case 'escalate': {
          // Send AI's empathetic response + notify staff
          _diaryEvent.escalated = true;
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
        routedAction: _devMetadata.routedAction
      }).catch(() => {});
      await sendMessage(phone, response, msg.instanceId);
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
