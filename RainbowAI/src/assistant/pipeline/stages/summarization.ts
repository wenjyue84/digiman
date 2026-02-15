/**
 * Pipeline Stage 1: Conversation Summarization
 *
 * Applies conversation summarization to reduce token usage while preserving context.
 * Excludes the current user message from summarization.
 */

import type { ChatMessage } from '../../types.js';
import type { IPipelineContext } from '../pipeline-context.js';
import type { PipelineState } from '../types.js';

export interface SummarizationResult {
  contextMessages: ChatMessage[];
  wasSummarized: boolean;
  originalCount: number;
  reducedCount: number;
}

/**
 * Stage 1: Conversation Summarization
 *
 * Applies conversation summarization to reduce token usage.
 * Uses context to call applyConversationSummarization.
 *
 * @param state - Pipeline state containing conversation messages
 * @param context - Pipeline context with summarization dependency
 * @returns Summarization result with context messages and metrics
 */
export async function applySummarization(
  state: PipelineState,
  context: IPipelineContext
): Promise<SummarizationResult> {
  const { convo } = state;

  // Exclude last message (current user message) from summarization
  const summarizationResult = await context.applyConversationSummarization(
    convo.messages.slice(0, -1)
  );

  if (summarizationResult.wasSummarized) {
    const reductionPercent = Math.round(
      (1 - summarizationResult.reducedCount / summarizationResult.originalCount) * 100
    );

    console.log(
      `[Summarization] 📝 Conversation summarized: ${summarizationResult.originalCount} → ${summarizationResult.reducedCount} messages ` +
      `(${reductionPercent}% reduction)`
    );
  }

  return {
    contextMessages: summarizationResult.messages,
    wasSummarized: summarizationResult.wasSummarized,
    originalCount: summarizationResult.originalCount,
    reducedCount: summarizationResult.reducedCount,
  };
}
