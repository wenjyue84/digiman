/**
 * Message Router — Pipeline Orchestrator
 *
 * Reduced from 1,154 lines to ~80 lines. All logic lives in pipeline modules:
 *   1. input-validator.ts   — validation, staff commands, rate limiting, language, sentiment
 *   2. state-executor.ts    — feedback, active workflow/booking, emergency regex
 *   3. intent-classifier.ts — classification, routing, action dispatch
 *   4. response-processor.ts — confidence checks, translation, mode dispatch, feedback
 */
import type { IncomingMessage, SendMessageFn, CallAPIFn } from './types.js';
import type { RouterContext } from './pipeline/types.js';
import { configStore } from './config-store.js';
import { initWorkflowExecutor } from './workflow-executor.js';
import { maybeWriteDiary } from './memory-writer.js';
import { detectLanguage, getTemplate } from './formatter.js';
import { trackError } from '../lib/activity-tracker.js';

import { validateAndPrepare } from './pipeline/input-validator.js';
import { handleActiveStates } from './pipeline/state-executor.js';
import { classifyAndRoute } from './pipeline/intent-classifier.js';
import { processAndSend } from './pipeline/response-processor.js';

// ─── Router context (shared across pipeline) ────────────────────

const ctx: RouterContext = {
  sendMessage: null as unknown as SendMessageFn,
  callAPI: null as unknown as CallAPIFn,
  jayLID: null
};

// ─── Init ────────────────────────────────────────────────────────

export function initRouter(send: SendMessageFn, api: CallAPIFn): void {
  ctx.sendMessage = send;
  ctx.callAPI = api;
  initWorkflowExecutor(send);

  configStore.on('reload', (domain: string) => {
    if (['workflow', 'settings', 'routing', 'all'].includes(domain)) {
      console.log('[Router] Config reloaded');
    }
  });
}

// ─── Main pipeline ──────────────────────────────────────────────

export async function handleIncomingMessage(msg: IncomingMessage): Promise<void> {
  // Phase 1: Validate & preprocess
  const validation = await validateAndPrepare(msg, ctx);
  if (!validation.continue) return;

  const state = validation.state;
  const { phone, text } = state;

  try {
    // Phase 2: Active state handling (feedback, workflow, booking, emergency)
    const stateResult = await handleActiveStates(state, ctx);
    if (stateResult.handled) return;

    // Phase 3: Intent classification & action dispatch
    await classifyAndRoute(state, ctx);

    // Phase 4: Response processing & delivery
    await processAndSend(state, ctx);

    // Auto-diary: write noteworthy events
    try {
      maybeWriteDiary(state.diaryEvent);
    } catch {
      // Non-fatal — never crash the router over diary writes
    }
  } catch (err: any) {
    console.error(`[Router] Error processing message from ${phone}:`, err.message);
    trackError('message-router', err.message);
    try {
      const lang = detectLanguage(text);
      await ctx.sendMessage(phone, getTemplate('error', lang), msg.instanceId);
    } catch {
      // Can't even send error message — give up silently
    }
  }
}
