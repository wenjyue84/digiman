import type { ChatMessage } from './types.js';
import { configStore } from './config-store.js';
import { chat } from './ai-client.js';

/**
 * Conversation Summarization Module
 *
 * Reduces context size for long conversations by:
 * 1. Summarizing old messages (e.g., 1-5)
 * 2. Keeping recent messages verbatim (e.g., 6-20)
 * 3. Reduces context overflow by ~50%
 */

export interface SummarizationResult {
  messages: ChatMessage[];
  wasSummarized: boolean;
  originalCount: number;
  reducedCount: number;
  summarizedRange: string;
}

/**
 * Apply conversation summarization based on settings
 * @param messages - Full conversation history
 * @returns Reduced conversation with summary
 */
export async function applyConversationSummarization(
  messages: ChatMessage[]
): Promise<SummarizationResult> {
  const settings = configStore.getSettings();
  const config = settings.conversation_management;

  // Check if summarization is enabled
  if (!config?.enabled) {
    return {
      messages,
      wasSummarized: false,
      originalCount: messages.length,
      reducedCount: messages.length,
      summarizedRange: 'none'
    };
  }

  const {
    summarize_threshold = 10,
    summarize_from_message = 1,
    summarize_to_message = 5,
    keep_verbatim_from = 6,
    keep_verbatim_to = 20
  } = config;

  // Check if conversation exceeds threshold
  if (messages.length < summarize_threshold) {
    return {
      messages,
      wasSummarized: false,
      originalCount: messages.length,
      reducedCount: messages.length,
      summarizedRange: 'none'
    };
  }

  console.log(`[Summarizer] Conversation has ${messages.length} messages (threshold: ${summarize_threshold}) → applying summarization`);

  try {
    // Extract messages to summarize (convert to 0-based index)
    const fromIdx = Math.max(0, summarize_from_message - 1);
    const toIdx = Math.min(messages.length, summarize_to_message);
    const messagesToSummarize = messages.slice(fromIdx, toIdx);

    if (messagesToSummarize.length === 0) {
      console.warn(`[Summarizer] No messages to summarize in range ${summarize_from_message}-${summarize_to_message}`);
      return {
        messages,
        wasSummarized: false,
        originalCount: messages.length,
        reducedCount: messages.length,
        summarizedRange: 'none'
      };
    }

    // Build summarization prompt
    const conversationText = messagesToSummarize
      .map(m => `${m.role === 'user' ? 'Guest' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `You are summarizing a conversation between a guest and a hostel AI assistant.

Summarize the following conversation into 2-3 concise sentences.

CRITICAL: You MUST preserve these named entities exactly as they appear:
- Guest's name (e.g., "The guest's name is John")
- Booking dates and duration
- Capsule/room number
- Complaint details and status
- Phone numbers or reference IDs

Also include:
- Guest's key questions or requests
- Main topics discussed
- Any other important details (dates, numbers, specific requests)

Conversation to summarize (messages ${summarize_from_message}-${summarize_to_message}):
${conversationText}

Summary (include all named entities):`;

    // Call AI to generate summary
    const summaryContent = await chat(
      'You are a helpful assistant that summarizes conversations concisely. You MUST preserve all named entities (guest name, dates, capsule numbers, complaint details) in the summary.',
      [],
      summaryPrompt
    );

    if (!summaryContent) {
      console.error(`[Summarizer] Failed to generate summary`);
      return {
        messages,
        wasSummarized: false,
        originalCount: messages.length,
        reducedCount: messages.length,
        summarizedRange: 'failed'
      };
    }

    // Create summary message
    const summaryMessage: ChatMessage = {
      role: 'assistant',
      content: `[Conversation Summary - Messages ${summarize_from_message}-${summarize_to_message}]: ${summaryContent}`,
      timestamp: messagesToSummarize[0]?.timestamp || Math.floor(Date.now() / 1000)
    };

    // Extract messages to keep verbatim (convert to 0-based index)
    const keepFromIdx = Math.max(0, keep_verbatim_from - 1);
    const keepToIdx = Math.min(messages.length, keep_verbatim_to);
    const verbatimMessages = messages.slice(keepFromIdx, keepToIdx);

    // Reconstruct conversation: summary + verbatim messages
    const reducedMessages = [summaryMessage, ...verbatimMessages];

    console.log(
      `[Summarizer] ✅ Reduced from ${messages.length} to ${reducedMessages.length} messages ` +
      `(~${Math.round((1 - reducedMessages.length / messages.length) * 100)}% reduction)`
    );

    return {
      messages: reducedMessages,
      wasSummarized: true,
      originalCount: messages.length,
      reducedCount: reducedMessages.length,
      summarizedRange: `${summarize_from_message}-${summarize_to_message}`
    };
  } catch (error: any) {
    console.error(`[Summarizer] Error during summarization:`, error.message);
    // On error, return original messages (fail-safe)
    return {
      messages,
      wasSummarized: false,
      originalCount: messages.length,
      reducedCount: messages.length,
      summarizedRange: 'error'
    };
  }
}

/**
 * Get summarization stats for logging/debugging
 */
export function getSummarizationStats(): {
  enabled: boolean;
  threshold: number;
  summarizeRange: string;
  keepRange: string;
} {
  const settings = configStore.getSettings();
  const config = settings.conversation_management;

  return {
    enabled: config?.enabled ?? false,
    threshold: config?.summarize_threshold ?? 10,
    summarizeRange: `${config?.summarize_from_message ?? 1}-${config?.summarize_to_message ?? 5}`,
    keepRange: `${config?.keep_verbatim_from ?? 6}-${config?.keep_verbatim_to ?? 20}`
  };
}
