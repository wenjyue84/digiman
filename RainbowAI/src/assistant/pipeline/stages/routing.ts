/**
 * Pipeline Stage 5: Route Resolution
 *
 * Maps classification result to a routed action via routing.json,
 * handles missing routes gracefully, resolves response language,
 * tracks intent predictions, and updates conversation language.
 */

import type { IPipelineContext } from '../pipeline-context.js';
import type { PipelineState } from '../types.js';
import type { ClassificationResult } from './tier-classification.js';

export interface RoutingResult {
  routedAction: string;
  responseLang: 'en' | 'ms' | 'zh';
  messageType: string;
  repeatCheck: { isRepeat: boolean; count: number };
}

/**
 * Resolve the best language for response selection.
 * Priority: tier result (high confidence) > conversation state > default 'en'
 */
export function resolveResponseLanguage(
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

/**
 * Stage 5: Route Resolution
 *
 * Looks up the intent in routing.json to determine the action.
 * Handles missing routes with admin notification and graceful fallback.
 * Tracks intent classification and predictions.
 * Updates conversation language when tier detection is more confident.
 *
 * @param state - Pipeline state
 * @param result - Classification result from tier classification
 * @param ackSent - Whether the "thinking" ack was already sent
 * @param context - Pipeline context with dependencies
 * @returns Routing result with action, language, message type, repeat check
 */
export async function resolveRouting(
  state: PipelineState,
  result: ClassificationResult,
  ackSent: boolean,
  context: IPipelineContext
): Promise<RoutingResult> {
  const { requestId, phone, text, processText, convo, lang, msg, diaryEvent, devMetadata } = state;
  const settings = context.getSettings();
  const isSplitModel = settings.routing_mode?.splitModel === true;

  const routingConfig = context.getRouting();
  const route = routingConfig[result.intent];

  let routedAction: string;
  if (!route) {
    console.error(`[Routing] CRITICAL: Intent "${result.intent}" not in routing.json`);
    console.error(`[Routing] Available routes: ${Object.keys(routingConfig).slice(0, 10).join(', ')}...`);

    context.notifyAdminConfigError(
      `Intent "${result.intent}" classified but missing from routing.json.\n\n` +
      `Add this intent to routing.json with appropriate action.`
    ).catch(() => {});

    routedAction = 'llm_reply';
    diaryEvent.configError = `missing_route:${result.intent}`;
    console.warn(`[Routing] Using llm_reply fallback for missing route`);
  } else {
    routedAction = route.action;
  }

  const messageType = context.detectMessageType(processText);
  const repeatCheck = context.checkRepeatIntent(phone, result.intent);

  console.log(
    `[Routing] [${requestId}] Intent: ${result.intent} | Action: ${result.action} | Routed: ${routedAction} | ` +
    `msgType: ${messageType} | repeat: ${repeatCheck.count} | Confidence: ${result.confidence.toFixed(2)}` +
    `${ackSent ? ' | ack sent' : ''}${isSplitModel ? ' | split-model' : ''}`
  );

  context.trackIntentClassified(result.intent, result.confidence, devMetadata.source || 'unknown');

  // Update diary and dev metadata
  diaryEvent.intent = result.intent;
  diaryEvent.action = routedAction;
  diaryEvent.messageType = messageType;
  diaryEvent.confidence = result.confidence;
  devMetadata.routedAction = routedAction;
  if (result.entities?.multiIntent === 'true') {
    devMetadata.multiIntent = result.entities.allIntents;
  }

  // Track prediction asynchronously
  const conversationId = `${phone}-${Date.now()}`;
  context.trackIntentPrediction(
    conversationId, phone, text, result.intent, result.confidence,
    devMetadata.source || 'unknown', result.model
  ).catch(() => {});

  context.updateLastIntent(phone, result.intent, result.confidence);

  // Update conversation language with tier result if more confident
  if (result.detectedLanguage &&
    result.detectedLanguage !== 'unknown' &&
    result.confidence >= 0.8 &&
    result.detectedLanguage !== lang) {
    const updatedConvo = context.getOrCreate(phone, msg.pushName);
    if (updatedConvo && (result.detectedLanguage === 'en' ||
      result.detectedLanguage === 'ms' ||
      result.detectedLanguage === 'zh')) {
      updatedConvo.language = result.detectedLanguage as 'en' | 'ms' | 'zh';
      console.log(`[Routing] Updated conversation language: ${lang} → ${result.detectedLanguage}`);
    }
  }

  const responseLang = resolveResponseLanguage(result.detectedLanguage, lang, result.confidence);

  return {
    routedAction,
    responseLang,
    messageType,
    repeatCheck,
  };
}
