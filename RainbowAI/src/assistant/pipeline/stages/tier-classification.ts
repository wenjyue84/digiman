/**
 * Pipeline Stage 3: Tier Classification
 *
 * Classifies user messages using 3 routing modes:
 * - Tiered Pipeline (T1-T5): regex → fuzzy → semantic → LLM → full LLM
 * - Split Model: fast 8B classify, then conditional 70B reply
 * - Default: single LLM call (classify + respond)
 *
 * This is the core decision-making stage of the intent pipeline.
 */

import type { IPipelineContext } from '../pipeline-context.js';
import type { PipelineState, DevMetadata } from '../types.js';
import type { ChatMessage } from '../../types.js';

export interface ClassificationResult {
  intent: string;
  action: string;
  response: string;
  confidence: number;
  model?: string;
  responseTime?: number;
  detectedLanguage?: string;
  entities?: Record<string, string>;
}

interface ClassificationInput {
  processText: string;
  contextMessages: ChatMessage[];
  systemPrompt: string;
  lastIntent: string | null;
  devMetadata: DevMetadata;
}

/**
 * Stage 3: Tier Classification
 *
 * Routes message through the configured classification mode:
 * - tieredPipeline: Fast tiers first (regex/fuzzy/semantic), LLM fallback
 * - splitModel: 8B classify → conditional 70B reply
 * - default: Single LLM call for both classify + reply
 *
 * @param input - Classification inputs (text, context, system prompt)
 * @param context - Pipeline context with AI dependencies
 * @param clearAckTimer - Callback to clear the "thinking" timer
 * @returns Classification result with intent, action, response, confidence
 */
export async function classifyWithTiers(
  input: ClassificationInput,
  context: IPipelineContext,
  clearAckTimer: () => void
): Promise<ClassificationResult> {
  const { processText, contextMessages, systemPrompt, lastIntent, devMetadata } = input;
  const settings = context.getSettings();
  const routingMode = settings.routing_mode;
  const isSplitModel = routingMode?.splitModel === true;
  const isTiered = routingMode?.tieredPipeline === true;

  if (isTiered) {
    return classifyTieredPipeline(input, context, clearAckTimer);
  } else if (isSplitModel) {
    return classifySplitModel(input, context, clearAckTimer);
  } else {
    return classifyDefault(input, context, clearAckTimer);
  }
}

/**
 * Tiered Pipeline: Fuzzy → Semantic → LLM
 *
 * Fast tiers (regex/fuzzy/semantic) try to classify without LLM.
 * If a fast tier matches but the action requires a reply, generate one with LLM.
 * If no fast tier matches, fall through to full LLM classify+respond.
 */
async function classifyTieredPipeline(
  input: ClassificationInput,
  context: IPipelineContext,
  clearAckTimer: () => void
): Promise<ClassificationResult> {
  const { processText, contextMessages, systemPrompt, lastIntent, devMetadata } = input;

  const startTime = Date.now();
  const tierResult = await context.classifyMessageWithContext(processText, contextMessages, lastIntent);
  const classifyTime = Date.now() - startTime;

  const routingConfig = context.getRouting();
  const route = routingConfig[tierResult.category];
  const routedAction: string = route?.action || 'llm_reply';

  const caughtByFastTier = tierResult.source === 'fuzzy' || tierResult.source === 'semantic' || tierResult.source === 'regex';

  // Fast path: non-LLM action caught by fast tier → skip LLM entirely
  if (caughtByFastTier && routedAction !== 'llm_reply' && routedAction !== 'reply') {
    clearAckTimer();
    devMetadata.source = tierResult.source;
    console.log(`[Tier] T5 fast path: ${tierResult.source} → ${tierResult.category} (${classifyTime}ms, zero LLM)`);

    return {
      intent: tierResult.category,
      action: routedAction,
      response: '',
      confidence: tierResult.confidence,
      model: 'none (tiered)',
      responseTime: classifyTime,
      detectedLanguage: tierResult.detectedLanguage,
      entities: tierResult.entities,
    };
  }

  // Fast tier caught it, but action needs LLM reply → generate reply only
  if (caughtByFastTier) {
    const timeSensitiveSet = context.getTimeSensitiveIntentSet();
    const replyPrompt = timeSensitiveSet.has(tierResult.category)
      ? systemPrompt + '\n\n' + context.getTimeContext()
      : systemPrompt;
    const replyResult = await context.generateReplyOnly(replyPrompt, contextMessages, processText, tierResult.category);
    clearAckTimer();

    const finalConfidence = replyResult.confidence !== undefined
      ? replyResult.confidence
      : tierResult.confidence;

    devMetadata.source = `${tierResult.source}+llm-reply`;

    return {
      intent: tierResult.category,
      action: routedAction,
      response: replyResult.response,
      confidence: finalConfidence,
      model: replyResult.model,
      responseTime: classifyTime + (replyResult.responseTime || 0),
      detectedLanguage: tierResult.detectedLanguage,
      entities: tierResult.entities,
    };
  }

  // No fast tier match → full LLM classify + respond
  const llmResult = await context.classifyAndRespond(systemPrompt, contextMessages, processText);
  clearAckTimer();
  devMetadata.source = 'tiered-llm-fallback';

  return {
    intent: llmResult.intent,
    action: llmResult.action,
    response: llmResult.response,
    confidence: llmResult.confidence,
    model: llmResult.model,
    responseTime: classifyTime + (llmResult.responseTime || 0),
    detectedLanguage: tierResult.detectedLanguage,
    entities: tierResult.entities,
  };
}

/**
 * Split Model: Fast 8B classify, then conditional 70B reply
 *
 * Uses a small/fast model for classification, then if the action
 * requires a reply, uses a larger model for response generation.
 */
async function classifySplitModel(
  input: ClassificationInput,
  context: IPipelineContext,
  clearAckTimer: () => void
): Promise<ClassificationResult> {
  const { processText, contextMessages, systemPrompt, devMetadata } = input;
  const settings = context.getSettings();
  const routingMode = settings.routing_mode;

  const classifyResult = await context.classifyOnly(processText, contextMessages, routingMode?.classifyProvider);
  clearAckTimer();

  const routingConfig = context.getRouting();
  const route = routingConfig[classifyResult.intent];
  const routedAction: string = route?.action || 'llm_reply';

  // If action needs a reply, generate with larger model
  if (routedAction === 'llm_reply' || routedAction === 'reply') {
    const timeSensitiveSet = context.getTimeSensitiveIntentSet();
    const replyPrompt = timeSensitiveSet.has(classifyResult.intent)
      ? systemPrompt + '\n\n' + context.getTimeContext()
      : systemPrompt;
    const replyResult = await context.generateReplyOnly(replyPrompt, contextMessages, processText, classifyResult.intent);

    const finalConfidence = replyResult.confidence !== undefined
      ? replyResult.confidence
      : classifyResult.confidence;

    devMetadata.source = 'split-model';

    return {
      intent: classifyResult.intent,
      action: routedAction,
      response: replyResult.response,
      confidence: finalConfidence,
      model: `${classifyResult.model} → ${replyResult.model}`,
      responseTime: (classifyResult.responseTime || 0) + (replyResult.responseTime || 0),
    };
  }

  // Non-reply action: classification-only result
  devMetadata.source = 'split-model-fast';

  return {
    intent: classifyResult.intent,
    action: routedAction,
    response: '',
    confidence: classifyResult.confidence,
    model: classifyResult.model,
    responseTime: classifyResult.responseTime,
  };
}

/**
 * Default: Single LLM call for classify + respond
 */
async function classifyDefault(
  input: ClassificationInput,
  context: IPipelineContext,
  clearAckTimer: () => void
): Promise<ClassificationResult> {
  const { processText, contextMessages, systemPrompt, devMetadata } = input;

  const result = await context.classifyAndRespond(systemPrompt, contextMessages, processText);
  clearAckTimer();
  devMetadata.source = 'llm';

  return {
    intent: result.intent,
    action: result.action,
    response: result.response,
    confidence: result.confidence,
    model: result.model,
    responseTime: result.responseTime,
  };
}
