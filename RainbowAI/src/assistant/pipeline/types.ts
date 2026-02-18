/**
 * Shared types for the message processing pipeline.
 *
 * RouterContext holds injected dependencies (sendMessage, callAPI).
 * PipelineState carries data between pipeline phases.
 */
import type { SendMessageFn, CallAPIFn, IncomingMessage, ConversationState } from '../types.js';
import type { ConversationEvent } from '../memory-writer.js';

export interface RouterContext {
  sendMessage: SendMessageFn;
  callAPI: CallAPIFn;
  jayLID: string | null;
}

export interface DevMetadata {
  source?: string;
  model?: string;
  responseTime?: number;
  kbFiles: string[];
  routedAction?: string;
  workflowId?: string;
  stepId?: string;
  multiIntent?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export interface PipelineState {
  requestId: string;
  msg: IncomingMessage;
  phone: string;
  text: string;
  processText: string;
  foreignLang: string | null;
  convo: ConversationState;
  lang: 'en' | 'ms' | 'zh';
  diaryEvent: ConversationEvent;
  devMetadata: DevMetadata;
  response: string | null;
  imageUrl?: string | null;
}

export type ValidationResult =
  | { continue: false; reason: string }
  | { continue: true; state: PipelineState };

export type StateResult =
  | { handled: true }
  | { handled: false };
