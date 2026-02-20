/**
 * Pipeline Phase 3: Intent Classification & Action Dispatch (Orchestrator)
 *
 * Thin orchestrator that calls pipeline stages in sequence:
 * 1. Summarization — reduce conversation context
 * 2. KB Loading — select relevant topic files, build system prompt
 * 3. Tier Classification — classify intent via tiered/split/default mode
 * 4. Layer 2 Fallback — retry with smarter model if confidence too low
 * 5. Routing — resolve intent → action mapping
 * 6. Action Dispatch — execute the routed action
 *
 * Mutates state.response, state.diaryEvent, state.devMetadata.
 */

import type { RouterContext, PipelineState } from './types.js';
import { createPipelineContext } from './pipeline-context.js';
import { applySummarization } from './stages/summarization.js';
import { loadKnowledgeBase } from './stages/kb-loading.js';
import { classifyWithTiers } from './stages/tier-classification.js';
import { applyLayer2Fallback } from './stages/layer2-fallback.js';
import { resolveRouting } from './stages/routing.js';
import { dispatchAction } from './stages/action-dispatch.js';

export async function classifyAndRoute(
  state: PipelineState, ctx: RouterContext
): Promise<void> {
  const { phone, processText, convo, lang, msg, devMetadata } = state;

  const context = await createPipelineContext(ctx);

  // ─── Guard: AI availability ─────────────────────────────────────
  if (!context.isAIAvailable()) {
    state.response = context.getTemplate('unavailable', lang);
    return;
  }

  // Send typing indicator
  context.sendWhatsAppTypingIndicator(phone, msg.instanceId).catch(() => {});

  // ─── Stage 1: Conversation Summarization ─────────────────────────
  const summarization = await applySummarization(state, context);

  // ─── Stage 2: Knowledge Base Loading ─────────────────────────────
  const kb = loadKnowledgeBase(state, context);

  // ─── Ack Timer: send "thinking" message if LLM takes >3s ────────
  let ackSent = false;
  const ackTimer = setTimeout(async () => {
    ackSent = true;
    try {
      await context.sendWhatsAppTypingIndicator(phone, msg.instanceId);
      const ackText = context.getTemplate('thinking', lang);
      await ctx.sendMessage(phone, ackText, msg.instanceId);
      context.logMessage(phone, msg.pushName ?? 'Guest', 'assistant', ackText, {
        action: 'thinking', instanceId: msg.instanceId,
      }).catch(() => {});
      console.log(`[Router] Sent thinking ack to ${phone} (LLM taking >3s)`);
    } catch { /* non-fatal */ }
  }, 3000);

  // ─── Stage 3: Tier Classification ─────────────────────────────────
  let result = await classifyWithTiers(
    {
      processText,
      contextMessages: summarization.contextMessages,
      systemPrompt: kb.systemPrompt,
      lastIntent: convo.lastIntent,
      devMetadata,
    },
    context,
    () => clearTimeout(ackTimer)
  );

  devMetadata.model = result.model;
  devMetadata.responseTime = result.responseTime;
  devMetadata.usage = result.usage;

  // ─── Stage 4: Layer 2 Fallback ────────────────────────────────────
  result = await applyLayer2Fallback(
    result, kb.systemPrompt, summarization.contextMessages,
    processText, devMetadata, context
  );

  // ─── Stage 5: Routing ─────────────────────────────────────────────
  const routing = await resolveRouting(state, result, ackSent, context);

  // ─── Stage 6: Action Dispatch ─────────────────────────────────────
  await dispatchAction(state, result, routing, context);
}
