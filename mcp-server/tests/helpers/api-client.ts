/**
 * HTTP helpers for integration tests.
 * Talks to the MCP server running on localhost:3002.
 */
import type { ChatMessage } from '../../src/assistant/types.js';

const BASE_URL = process.env.TEST_SERVER_URL || 'http://localhost:3002';

interface FetchOptions {
  method?: string;
  body?: unknown;
  timeout?: number;
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, timeout = 15_000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await res.json();
    if (!res.ok) {
      throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, data });
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Health Check ───────────────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  try {
    await apiFetch('/health', { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

// ─── Intent Classification API ──────────────────────────────────────

export interface IntentTestResponse {
  intent: string;
  confidence: number;
  source: string;
  matchedKeyword?: string;
  detectedLanguage?: string;
}

export async function postIntentTest(message: string): Promise<IntentTestResponse> {
  return apiFetch<IntentTestResponse>('/api/rainbow/intents/test', {
    method: 'POST',
    body: { message },
  });
}

// ─── Preview Chat API ───────────────────────────────────────────────

export interface PreviewChatResponse {
  message: string;
  intent: string;
  source: string;
  action: string;
  confidence: number;
  responseTime: number;
  kbFiles?: string[];
  messageType?: string;
  detectedLanguage?: string;
}

export async function postPreviewChat(
  message: string,
  history: ChatMessage[] = []
): Promise<PreviewChatResponse> {
  return apiFetch<PreviewChatResponse>('/api/rainbow/preview/chat', {
    method: 'POST',
    body: { message, history },
    timeout: 30_000,
  });
}
