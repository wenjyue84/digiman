/**
 * Pipeline Stage 4: Layer 2 Fallback
 *
 * When classification confidence falls below threshold, retries with
 * a smarter/larger model and expanded context (smart fallback).
 * Only replaces the original result if the fallback improves confidence.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { IPipelineContext } from '../pipeline-context.js';
import type { DevMetadata } from '../types.js';
import type { ChatMessage } from '../../types.js';
import type { ClassificationResult } from './tier-classification.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSISTANT_DATA_DIR = join(__dirname, '..', '..', 'data');

/**
 * Stage 4: Layer 2 Fallback
 *
 * Checks if classification confidence is below the configured threshold.
 * If so, retries with classifyAndRespondWithSmartFallback (larger model, more context).
 * Returns the better result (original or fallback).
 *
 * @param result - Original classification result from tier classification
 * @param systemPrompt - System prompt for the retry
 * @param contextMessages - Conversation context
 * @param processText - Processed user message
 * @param devMetadata - Dev metadata to update source/model/responseTime
 * @param context - Pipeline context with AI dependencies
 * @returns Updated classification result (may be original or improved)
 */
export async function applyLayer2Fallback(
  result: ClassificationResult,
  systemPrompt: string,
  contextMessages: ChatMessage[],
  processText: string,
  devMetadata: DevMetadata,
  context: IPipelineContext
): Promise<ClassificationResult> {
  const llmSettings = JSON.parse(
    readFileSync(join(ASSISTANT_DATA_DIR, 'llm-settings.json'), 'utf-8')
  );
  const layer2Threshold = llmSettings.thresholds?.layer2 ?? 0.80;

  // Skip if confidence is already above threshold or AI unavailable
  if (result.confidence >= layer2Threshold || !context.isAIAvailable()) {
    return result;
  }

  console.log(
    `[Layer2] confidence ${result.confidence.toFixed(2)} < ${layer2Threshold.toFixed(2)} → retrying with smart fallback`
  );

  const fallbackResult = await context.classifyAndRespondWithSmartFallback(
    systemPrompt, contextMessages, processText
  );

  if (fallbackResult.confidence > result.confidence) {
    console.log(
      `[Layer2] Improved confidence: ${result.confidence.toFixed(2)} → ${fallbackResult.confidence.toFixed(2)} (${fallbackResult.model})`
    );

    devMetadata.source = (devMetadata.source || 'llm') + '+layer2';
    devMetadata.model = fallbackResult.model;
    devMetadata.responseTime = (result.responseTime || 0) + (fallbackResult.responseTime || 0);

    return {
      intent: fallbackResult.intent,
      action: fallbackResult.action,
      response: fallbackResult.response,
      confidence: fallbackResult.confidence,
      model: fallbackResult.model,
      responseTime: (result.responseTime || 0) + (fallbackResult.responseTime || 0),
      detectedLanguage: result.detectedLanguage,
    };
  }

  console.log(`[Layer2] Fallback did not improve confidence (${fallbackResult.confidence.toFixed(2)})`);
  return result;
}
