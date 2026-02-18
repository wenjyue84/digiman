/**
 * Pipeline Stage 6: Action Dispatch
 *
 * Routes to the correct handler based on routedAction:
 * - static_reply: Pre-written response (with complaint/problem/repeat overrides)
 * - start_booking: Initialize booking workflow
 * - escalate: Forward to staff
 * - forward_payment: Forward payment proof to admin
 * - workflow: Start multi-step workflow
 * - llm_reply/reply/default: Use LLM response directly
 */

import type { IPipelineContext } from '../pipeline-context.js';
import type { PipelineState } from '../types.js';
import type { ClassificationResult } from './tier-classification.js';
import type { RoutingResult } from './routing.js';
import { resolveResponseLanguage } from './routing.js';

/**
 * Stage 6: Action Dispatch
 *
 * Executes the action determined by routing. Each case handles a different
 * response strategy — from pre-written static replies to multi-step workflows.
 *
 * @param state - Pipeline state (mutates state.response)
 * @param result - Classification result
 * @param routing - Routing result (action, language, message type, repeat check)
 * @param context - Pipeline context with all dependencies
 */
export async function dispatchAction(
  state: PipelineState,
  result: ClassificationResult,
  routing: RoutingResult,
  context: IPipelineContext
): Promise<void> {
  const { phone, text, processText, convo, lang, msg, diaryEvent, devMetadata } = state;
  const { routedAction, responseLang, messageType, repeatCheck } = routing;

  switch (routedAction) {
    case 'static_reply':
      await handleStaticReply(state, result, routing, context);
      break;

    case 'start_booking':
      await handleStartBooking(state, context);
      break;

    case 'escalate':
      await handleEscalate(state, result, context);
      break;

    case 'forward_payment':
      await handleForwardPayment(state, result, context);
      break;

    case 'workflow':
      await handleWorkflow(state, result, context);
      break;

    case 'llm_reply':
    case 'reply':
    default:
      await handleLLMReply(state, result, context);
      break;
  }
}

/**
 * Static Reply handler
 *
 * Uses pre-written responses from knowledge.json.
 * Overrides for: complaints (LLM + escalate), problems (LLM response),
 * repeat intents (2nd time → LLM, 3rd+ → escalate).
 */
async function handleStaticReply(
  state: PipelineState,
  result: ClassificationResult,
  routing: RoutingResult,
  context: IPipelineContext
): Promise<void> {
  const { phone, text, convo, lang, msg, diaryEvent } = state;
  const { responseLang, messageType, repeatCheck } = routing;

  context.resetUnknown(phone);

  if (messageType === 'complaint') {
    logLanguageResolution('complaint', lang, responseLang, result);
    state.response = result.response || context.getStaticReply(result.intent, responseLang);
    await context.escalateToStaff({
      phone, pushName: msg.pushName, reason: 'complaint',
      recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
      originalMessage: text, instanceId: msg.instanceId,
    });
    diaryEvent.escalated = true;
    console.log(`[Dispatch] Complaint override: ${result.intent} → LLM + escalate`);
  } else if (messageType === 'problem') {
    logLanguageResolution('problem', lang, responseLang, result);
    state.response = result.response || context.getStaticReply(result.intent, responseLang);
    console.log(`[Dispatch] Problem override: ${result.intent} → LLM response`);
  } else if (repeatCheck.isRepeat && repeatCheck.count >= 2) {
    logLanguageResolution('3rd+ repeat', lang, responseLang, result);
    state.response = result.response || context.getStaticReply(result.intent, responseLang);
    await context.escalateToStaff({
      phone, pushName: msg.pushName, reason: 'unknown_repeated',
      recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
      originalMessage: text, instanceId: msg.instanceId,
    });
    console.log(`[Dispatch] Repeat escalation: ${result.intent} (${repeatCheck.count + 1}x)`);
  } else if (repeatCheck.isRepeat) {
    logLanguageResolution('2nd repeat', lang, responseLang, result);
    state.response = result.response || context.getStaticReply(result.intent, responseLang);
    console.log(`[Dispatch] Repeat override: ${result.intent} → LLM response (2nd time)`);
  } else if (result.entities?.multiIntent === 'true' && result.entities.allIntents) {
    // Multi-intent: combine static replies for all detected intents
    logLanguageResolution('multi-intent', lang, responseLang, result);
    const intents = result.entities.allIntents.split(',');
    const replies: string[] = [];
    for (const intent of intents) {
      const reply = context.getStaticReply(intent.trim(), responseLang);
      if (reply) replies.push(reply);
    }
    if (replies.length >= 2) {
      state.response = replies.join('\n\n');
      console.log(`[Dispatch] Multi-intent combined: ${intents.join(' + ')} → ${replies.length} replies`);
    } else {
      // Fallback: not enough static replies, use LLM response or primary static
      const primaryReply = context.getStaticReply(result.intent, responseLang);
      state.response = primaryReply || result.response;
      console.log(`[Dispatch] Multi-intent partial: only ${replies.length} static replies, using primary`);
    }
  } else {
    logLanguageResolution('default', lang, responseLang, result);
    const staticResponse = context.getStaticReply(result.intent, responseLang);
    if (staticResponse) {
      state.response = staticResponse;
    } else {
      console.warn(`[Dispatch] No static reply for "${result.intent}", using LLM response`);
      state.response = result.response;
    }
  }

  // Attach image if the static reply has one configured
  const imageUrl = context.getStaticReplyImageUrl(result.intent);
  if (imageUrl) {
    state.imageUrl = imageUrl;
  }
}

/**
 * Start Booking handler
 */
async function handleStartBooking(
  state: PipelineState,
  context: IPipelineContext
): Promise<void> {
  const { phone, text, convo, lang, msg, diaryEvent } = state;

  context.resetUnknown(phone);
  diaryEvent.bookingStarted = true;
  context.trackBookingStarted(phone, msg.pushName);
  const bookingState = context.createBookingState();
  const bookingResult = await context.handleBookingStep(bookingState, text, lang, convo.messages);
  context.updateBookingState(phone, bookingResult.newState);
  state.response = bookingResult.response;
}

/**
 * Escalate handler
 */
async function handleEscalate(
  state: PipelineState,
  result: ClassificationResult,
  context: IPipelineContext
): Promise<void> {
  const { phone, text, convo, msg, diaryEvent } = state;

  diaryEvent.escalated = true;
  context.trackEscalation(phone, msg.pushName, 'complaint');
  state.response = result.response;
  await context.escalateToStaff({
    phone, pushName: msg.pushName, reason: 'complaint',
    recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
    originalMessage: text, instanceId: msg.instanceId,
  });
}

/**
 * Forward Payment handler
 */
async function handleForwardPayment(
  state: PipelineState,
  result: ClassificationResult,
  context: IPipelineContext
): Promise<void> {
  const { phone, text, lang, msg } = state;

  context.resetUnknown(phone);
  const forwardTo = context.getWorkflow().payment.forward_to;
  const forwardMsg = `\u{1F4B3} *Payment notification from ${msg.pushName}*\nPhone: ${phone}\nMessage: ${text}`;
  try {
    await context.sendMessage(forwardTo, forwardMsg, msg.instanceId);
    console.log(`[Dispatch] Payment receipt forwarded to ${forwardTo} for ${phone}`);
  } catch (err: any) {
    console.error(`[Dispatch] Failed to forward payment:`, err.message);
  }
  state.response = result.response || context.getTemplate('payment_forwarded', lang);
}

/**
 * Workflow handler
 *
 * Starts a multi-step workflow. Validates workflow_id exists in routing config
 * and that the referenced workflow is defined in workflows.json.
 * Falls back to escalation on config errors.
 */
async function handleWorkflow(
  state: PipelineState,
  result: ClassificationResult,
  context: IPipelineContext
): Promise<void> {
  const { phone, text, lang, convo, msg, diaryEvent, devMetadata } = state;

  context.resetUnknown(phone);

  const routingConfig = context.getRouting();
  const route = routingConfig[result.intent];
  const workflowId = route?.workflow_id;

  if (!workflowId) {
    console.error(`[Dispatch] CRITICAL: Intent "${result.intent}" has action=workflow but no workflow_id`);
    context.notifyAdminConfigError(
      `Intent "${result.intent}" configured with action=workflow but workflow_id is missing.\n\n` +
      `Fix in routing.json by adding "workflow_id": "workflow_name"`
    ).catch(() => {});

    diaryEvent.configError = `missing_workflow_id:${result.intent}`;
    await context.escalateToStaff({
      phone, pushName: msg.pushName,
      reason: 'config_error',
      recentMessages: convo.messages.slice(-5).map(m => `${m.role}: ${m.content}`),
      originalMessage: text,
      instanceId: msg.instanceId,
      metadata: { configError: 'missing_workflow_id', intent: result.intent },
    });
    state.response = context.getTemplate('escalated', lang);
    return;
  }

  const workflows = context.getWorkflows();
  const workflow = workflows.workflows.find((w: any) => w.id === workflowId);

  if (!workflow) {
    console.error(`[Dispatch] CRITICAL: Workflow "${workflowId}" referenced but not found in workflows.json`);
    context.notifyAdminConfigError(
      `Intent "${result.intent}" references workflow_id "${workflowId}" which doesn't exist.\n\n` +
      `Available workflows: ${workflows.workflows.map((w: any) => w.id).join(', ')}`
    ).catch(() => {});

    diaryEvent.configError = `workflow_not_found:${workflowId}`;
    await context.escalateToStaff({
      phone, pushName: msg.pushName,
      reason: 'config_error',
      recentMessages: convo.messages.slice(-5).map(m => `${m.role}: ${m.content}`),
      originalMessage: text,
      instanceId: msg.instanceId,
      metadata: { configError: 'workflow_not_found', workflowId },
    });
    state.response = context.getTemplate('escalated', lang);
    return;
  }

  console.log(`[Dispatch] Starting workflow: ${workflow.name} (${workflowId})`);
  diaryEvent.workflowStarted = true;
  context.trackWorkflowStarted(phone, msg.pushName, workflow.name);
  const workflowState = context.createWorkflowState(workflowId);
  const workflowResult = await context.executeWorkflowStep(
    workflowState, null, { language: lang, phone, pushName: msg.pushName, instanceId: msg.instanceId }
  );

  if (workflowResult.newState) {
    context.updateWorkflowState(phone, workflowResult.newState);
  } else {
    if (workflowResult.shouldForward && workflowResult.conversationSummary) {
      await context.forwardWorkflowSummary(phone, msg.pushName, workflow, workflowState, msg.instanceId);
    }
  }

  state.response = workflowResult.response;
  if (workflowResult.workflowId) devMetadata.workflowId = workflowResult.workflowId;
  if (workflowResult.stepId) devMetadata.stepId = workflowResult.stepId;
}

/**
 * LLM Reply / Default handler
 *
 * Uses the LLM-generated response directly.
 * If confidence is very low (<0.4), increments unknown counter and
 * may escalate if threshold is reached.
 */
async function handleLLMReply(
  state: PipelineState,
  result: ClassificationResult,
  context: IPipelineContext
): Promise<void> {
  const { phone, text, convo, msg, diaryEvent } = state;

  state.response = result.response;

  // Track unknown intents OR low-confidence results for operator escalation
  const isUnknownIntent = result.intent === 'unknown' || result.intent === 'unknown_intent';
  if (isUnknownIntent || result.confidence < 0.4) {
    const unknownCount = context.incrementUnknown(phone);
    const escReason = context.shouldEscalate(null, unknownCount);
    if (escReason) {
      diaryEvent.escalated = true;
      // Send customer-facing message about operator handoff
      const lang = convo.language || 'en';
      const handoffMessages: Record<string, string> = {
        en: "I'm connecting you with our team for better assistance. A staff member will reply to you shortly.",
        ms: "Saya menghubungkan anda dengan pasukan kami untuk bantuan yang lebih baik. Staf akan membalas anda tidak lama lagi.",
        zh: "我正在为您联系我们的团队以提供更好的帮助。工作人员将很快回复您。"
      };
      state.response = handoffMessages[lang] || handoffMessages.en;
      await context.escalateToStaff({
        phone, pushName: msg.pushName, reason: escReason,
        recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
        originalMessage: text, instanceId: msg.instanceId,
      });
      context.resetUnknown(phone);
      console.log(`[Dispatch] Unknown escalation: ${unknownCount} consecutive unknowns → forwarded to operator`);
    }
  } else {
    context.resetUnknown(phone);
  }
}

/**
 * Helper: log language resolution when tier differs from conversation state
 */
function logLanguageResolution(
  context: string,
  lang: 'en' | 'ms' | 'zh',
  responseLang: 'en' | 'ms' | 'zh',
  result: ClassificationResult
): void {
  if (responseLang !== lang && result.detectedLanguage !== 'unknown') {
    console.log(`[Dispatch] Language resolved (${context}): '${lang}' → '${responseLang}'`);
  }
}
