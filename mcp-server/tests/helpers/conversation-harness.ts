/**
 * ConversationTestHarness — Multi-turn testing engine.
 * Maintains history automatically, hitting the live preview chat API.
 */
import type { ChatMessage } from '../../src/assistant/types.js';
import { postPreviewChat, type PreviewChatResponse } from './api-client.js';

export class ConversationTestHarness {
  private history: ChatMessage[] = [];
  private lastResponse: PreviewChatResponse | null = null;

  /**
   * Send a message and record both user message and assistant reply in history.
   */
  async sendMessage(msg: string): Promise<PreviewChatResponse> {
    const response = await postPreviewChat(msg, this.history);

    // Record user message
    this.history.push({
      role: 'user',
      content: msg,
      timestamp: Math.floor(Date.now() / 1000),
    });

    // Record assistant reply
    this.history.push({
      role: 'assistant',
      content: response.message,
      timestamp: Math.floor(Date.now() / 1000),
    });

    this.lastResponse = response;
    return response;
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  getLastResponse(): PreviewChatResponse | null {
    return this.lastResponse;
  }

  reset(): void {
    this.history = [];
    this.lastResponse = null;
  }
}
