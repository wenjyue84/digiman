/**
 * Pipeline Stage 2: Knowledge Base Loading
 *
 * Selects relevant topic files based on message content and builds system prompt.
 */

import type { IPipelineContext } from '../pipeline-context.js';
import type { PipelineState } from '../types.js';

export interface KBLoadingResult {
  systemPrompt: string;
  topicFiles: string[];
  kbFiles: string[];
}

/**
 * Stage 2: Knowledge Base Loading
 *
 * Selects relevant topic files based on message content,
 * builds system prompt with persona + topics.
 *
 * @param state - Pipeline state containing processText and devMetadata
 * @param context - Pipeline context with KB dependencies
 * @returns KB loading result with system prompt and loaded files
 */
export function loadKnowledgeBase(
  state: PipelineState,
  context: IPipelineContext
): KBLoadingResult {
  const { processText, devMetadata } = state;
  const settings = context.getSettings();

  // Guess which topic files are relevant to this message
  const topicFiles = context.guessTopicFiles(processText);

  // Always include core files (AGENTS.md, soul.md, memory.md) + selected topics
  const kbFiles = ['AGENTS.md', 'soul.md', 'memory.md', ...topicFiles];
  devMetadata.kbFiles = kbFiles;

  console.log(`[KB Loading] Topic files: [${topicFiles.join(', ')}]`);

  // Build system prompt with base persona + selected topic content
  const systemPrompt = context.buildSystemPrompt(settings.system_prompt, topicFiles);

  return {
    systemPrompt,
    topicFiles,
    kbFiles,
  };
}
