/**
 * Pipeline Phase 2: Active State Execution
 *
 * Handles: feedback detection, active workflow continuation,
 * active booking flow, emergency regex detection.
 *
 * If any state handler fires, it sends a response and returns { handled: true }.
 * Otherwise returns { handled: false } to continue to classification.
 */
import axios from 'axios';
import type { RouterContext, PipelineState, StateResult } from './types.js';
import { ensureResponseText } from './input-validator.js';
import { configStore } from '../config-store.js';
import { addMessage, updateBookingState, updateWorkflowState } from '../conversation.js';
import { logMessage } from '../conversation-logger.js';
import { getEmergencyIntent } from '../intents.js';
import { escalateToStaff } from '../escalation.js';
import { handleBookingStep, createBookingState } from '../booking.js';
import { executeWorkflowStep, createWorkflowState, forwardWorkflowSummary } from '../workflow-executor.js';
import {
  isAwaitingFeedback, detectFeedbackResponse, buildFeedbackData,
  clearAwaitingFeedback
} from '../feedback.js';
import { trackIntentPrediction, markIntentCorrection, markIntentCorrect } from '../intent-tracker.js';
import { trackFeedback, trackEmergency, trackWorkflowStarted } from '../../lib/activity-tracker.js';

export async function handleActiveStates(
  state: PipelineState, ctx: RouterContext
): Promise<StateResult> {
  const { phone, processText, convo, lang, text, msg } = state;

  // ─── FEEDBACK DETECTION ─────────────────────────────────────────
  if (isAwaitingFeedback(phone)) {
    const feedbackRating = detectFeedbackResponse(processText);
    if (feedbackRating !== null) {
      console.log(`[Feedback] ${feedbackRating === 1 ? '👍' : '👎'} from ${phone}`);
      trackFeedback(phone, msg.pushName, feedbackRating);

      const feedbackData = buildFeedbackData(phone, feedbackRating, processText);
      if (feedbackData) {
        try {
          const port = process.env.PORT || 3002;
          await axios.post(`http://localhost:${port}/api/rainbow/feedback`, feedbackData);
          console.log(`[Feedback] ✅ Saved to database`);

          if (feedbackData.conversationId) {
            if (feedbackRating === -1) {
              markIntentCorrection(feedbackData.conversationId, 'unknown', 'feedback').catch(() => { });
            } else {
              markIntentCorrect(feedbackData.conversationId).catch(() => { });
            }
          }
        } catch (error) {
          console.error(`[Feedback] ❌ Failed to save:`, error);
        }
      }

      clearAwaitingFeedback(phone);

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
      await ctx.sendMessage(phone, thankYou, msg.instanceId);
      return { handled: true };
    }
  }

  // ─── ACTIVE WORKFLOW ────────────────────────────────────────────
  if (convo.workflowState) {
    const result = await executeWorkflowStep(convo.workflowState, text, lang, phone, msg.pushName, msg.instanceId);

    if (result.newState) {
      updateWorkflowState(phone, result.newState);
      addMessage(phone, 'assistant', result.response);
      logMessage(phone, msg.pushName, 'assistant', result.response, { action: 'workflow', instanceId: msg.instanceId }).catch(() => { });
      const cleanResponse = ensureResponseText(result.response, lang);
      await ctx.sendMessage(phone, cleanResponse, msg.instanceId);
    } else {
      updateWorkflowState(phone, null);
      addMessage(phone, 'assistant', result.response);
      logMessage(phone, msg.pushName, 'assistant', result.response, { action: 'workflow_complete', instanceId: msg.instanceId }).catch(() => { });
      const cleanResponse = ensureResponseText(result.response, lang);
      await ctx.sendMessage(phone, cleanResponse, msg.instanceId);

      if (result.shouldForward && result.conversationSummary) {
        const workflows = configStore.getWorkflows();
        const workflow = workflows.workflows.find(w => w.id === convo.workflowState?.workflowId);
        if (workflow) {
          await forwardWorkflowSummary(phone, msg.pushName, workflow, convo.workflowState, msg.instanceId);
        }
      }
    }
    return { handled: true };
  }

  // ─── ACTIVE BOOKING ─────────────────────────────────────────────
  if (convo.bookingState && !['done', 'cancelled'].includes(convo.bookingState.stage)) {
    const result = await handleBookingStep(convo.bookingState, text, lang, convo.messages);
    updateBookingState(phone, result.newState);
    addMessage(phone, 'assistant', result.response);
    logMessage(phone, msg.pushName, 'assistant', result.response, { action: 'booking', instanceId: msg.instanceId }).catch(() => { });
    await ctx.sendMessage(phone, result.response, msg.instanceId);
    return { handled: true };
  }

  // ─── EMERGENCY CHECK (regex, instant) ───────────────────────────
  const emergencyIntent = getEmergencyIntent(processText);
  if (emergencyIntent !== null) {
    console.log(`[Router] EMERGENCY detected for ${phone}: ${emergencyIntent}`);
    trackEmergency(phone, msg.pushName);
    await escalateToStaff({
      phone, pushName: msg.pushName,
      reason: (emergencyIntent === 'theft' ? 'theft' : 'complaint') as any,
      recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
      originalMessage: text, instanceId: msg.instanceId
    });

    // If the emergency has a dedicated workflow, route directly
    const routingConfig = configStore.getRouting();
    const route = routingConfig[emergencyIntent];
    if (route?.action === 'workflow' && route.workflow_id) {
      const workflows = configStore.getWorkflows();
      const workflow = workflows.workflows.find(w => w.id === route.workflow_id);
      if (workflow) {
        console.log(`[Router] Emergency → workflow: ${workflow.name} (${route.workflow_id})`);
        trackWorkflowStarted(phone, msg.pushName, workflow.name);
        const workflowState = createWorkflowState(route.workflow_id);
        const workflowResult = await executeWorkflowStep(workflowState, null, lang, phone, msg.pushName, msg.instanceId);

        if (workflowResult.newState) {
          updateWorkflowState(phone, workflowResult.newState);
        }

        const cleanResponse = ensureResponseText(workflowResult.response, lang);
        addMessage(phone, 'assistant', cleanResponse);
        logMessage(phone, msg.pushName, 'assistant', cleanResponse, { action: 'workflow', instanceId: msg.instanceId }).catch(() => { });
        await ctx.sendMessage(phone, cleanResponse, msg.instanceId);
        return { handled: true };
      }
    }
    // For other emergencies (fire, medical, etc.), fall through to LLM
  }

  return { handled: false };
}
