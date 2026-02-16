/**
 * ai-response-generator.ts — Response generation + parsing
 * (Single Responsibility: generate AI responses for classified intents)
 */
import axios from 'axios';
import type { ChatMessage } from './types.js';
import { configStore } from './config-store.js';
import { getContextWindows } from './context-windows.js';
import {
  isAIAvailable, getAISettings, getProviders, resolveApiKey,
  getGroqInstance, providerChat, chatWithFallback
} from './ai-provider-manager.js';
import { aiResponseSchema, aiResponseActionSchema } from './schemas.js';
import type { AIAction, AIResponse as ZodAIResponse } from './schemas.js';

// ─── Types ──────────────────────────────────────────────────────────

// Re-export from schemas for backward compatibility
export type { AIAction } from './schemas.js';

export interface AIResponse extends ZodAIResponse {
  model?: string;
  responseTime?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const VALID_ACTIONS = aiResponseActionSchema.options;

// ─── Static fallback messages (trilingual) ────────────────────────
// Used when ALL LLMs fail or for unknown/gibberish input
// Reads from settings.json (unknownFallback) if configured, otherwise uses defaults

const DEFAULT_FALLBACK_MESSAGES = {
  en: "I'm sorry, I didn't quite understand that. Could you rephrase your question? I can help with bookings, check-in/out, amenities, and general hostel information.",
  ms: "Maaf, saya tidak faham mesej anda. Boleh anda tulis semula soalan anda? Saya boleh bantu dengan tempahan, daftar masuk/keluar, kemudahan, dan maklumat am hostel.",
  zh: "抱歉，我没有理解您的意思。您能重新表述一下您的问题吗？我可以帮助您处理预订、入住/退房、设施和旅舍的一般信息。"
} as const;

export function getUnknownFallbackMessages(): Record<string, string> {
  const settings = configStore.getSettings();
  const custom = (settings as any)?.unknownFallback;
  if (custom && (custom.en || custom.ms || custom.zh)) {
    return {
      en: custom.en || DEFAULT_FALLBACK_MESSAGES.en,
      ms: custom.ms || DEFAULT_FALLBACK_MESSAGES.ms,
      zh: custom.zh || DEFAULT_FALLBACK_MESSAGES.zh,
    };
  }
  return { ...DEFAULT_FALLBACK_MESSAGES };
}

export const UNKNOWN_FALLBACK_MESSAGES = DEFAULT_FALLBACK_MESSAGES;

// ─── Chat (simple prompt → response) ────────────────────────────────

export async function chat(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  if (!isAIAvailable()) {
    throw new Error('AI not available');
  }

  const cw = getContextWindows();
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  const recentHistory = history.slice(-cw.combined);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const chatCfg = getAISettings();
  const { content } = await chatWithFallback(messages, chatCfg.max_chat_tokens, chatCfg.chat_temperature);

  if (content) return content;
  throw new Error('AI temporarily unavailable');
}

// ─── Classify + Respond (unified LLM call) ──────────────────────────

export async function classifyAndRespond(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<AIResponse> {
  try {
    if (!isAIAvailable()) {
      return { intent: 'unknown', action: 'reply', response: '', confidence: 0, model: 'none' };
    }

    const cw = getContextWindows();
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    const recentHistory = history.slice(-cw.combined);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: userMessage });

    const aiCfg = getAISettings();
    const startTime = Date.now();
    const { content, provider, usage } = await chatWithFallback(messages, aiCfg.max_chat_tokens, aiCfg.chat_temperature, true);
    const responseTime = Date.now() - startTime;

    if (content) {
      const result = parseAIResponse(content);
      result.model = provider?.name || provider?.model || 'unknown';
      result.responseTime = responseTime;
      result.usage = usage;
      return result;
    }

    console.warn('[AI] classifyAndRespond: all LLMs failed, using static fallback (all_llm_failed)');
    return { intent: 'unknown', action: 'reply', response: UNKNOWN_FALLBACK_MESSAGES.en, confidence: 0, model: 'all_llm_failed', responseTime };
  } catch (err: any) {
    console.error('[AI] classifyAndRespond error:', err);
    return {
      intent: 'unknown',
      action: 'reply',
      response: UNKNOWN_FALLBACK_MESSAGES.en,
      confidence: 0,
      model: 'error',
      responseTime: 0
    };
  }
}

// ─── Smart Fallback (Layer 2) ───────────────────────────────────────

/**
 * Fallback handler for low-confidence responses (Layer 2).
 * Uses smartest available models + increased context for full re-classification.
 */
export async function classifyAndRespondWithSmartFallback(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<AIResponse> {
  const startTime = Date.now();

  const allProviders = getProviders();
  const smartProviders = allProviders.filter(p =>
    p.id === 'deepseek-r1-distill-70b' ||
    p.id === 'kimi-k2.5' ||
    p.id === 'gpt-oss-120b' ||
    p.priority <= 1
  );

  if (smartProviders.length === 0) {
    console.warn('[AI] No smart providers available for fallback, using all enabled');
    return classifyAndRespond(systemPrompt, history, userMessage);
  }

  const cw = getContextWindows();
  const expandedHistory = history.slice(-cw.combined);

  console.log(
    `[AI] Smart fallback: ${smartProviders.length} providers, ` +
    `${expandedHistory.length} context messages`
  );

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...expandedHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage }
  ];

  const ai = getAISettings();
  let lastError: Error | null = null;

  for (const provider of smartProviders) {
    try {
      const apiKey = resolveApiKey(provider);
      if (!apiKey && provider.type !== 'ollama') continue;

      let content: string | null = null;

      if (provider.type === 'groq') {
        const groq = getGroqInstance(provider.id);
        if (!groq) continue;

        const completion = await groq.chat.completions.create({
          model: provider.model,
          messages,
          max_tokens: Math.floor(ai.max_chat_tokens * 1.5),
          temperature: ai.chat_temperature,
          response_format: { type: 'json_object' }
        });

        content = completion.choices[0]?.message?.content?.trim() || null;
      } else {
        const body: any = {
          model: provider.model,
          messages,
          max_tokens: Math.floor(ai.max_chat_tokens * 1.5),
          temperature: ai.chat_temperature,
          response_format: { type: 'json_object' }
        };

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey && provider.type !== 'ollama') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const res = await axios.post(`${provider.base_url}/chat/completions`, body, {
          headers,
          timeout: 15000,
          validateStatus: () => true
        });

        if (res.status === 200) {
          content = res.data.choices?.[0]?.message?.content?.trim() || null;
        } else {
          throw new Error(`${provider.name} ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`);
        }
      }

      if (!content) continue;

      const parsed = JSON.parse(content);
      const responseTime = Date.now() - startTime;

      console.log(
        `[AI] Smart fallback success: ${provider.name} (${responseTime}ms) ` +
        `confidence: ${parsed.confidence}`
      );

      return {
        intent: parsed.intent || 'unknown',
        action: VALID_ACTIONS.includes(parsed.action) ? parsed.action : 'reply',
        response: parsed.response || '',
        confidence: parseFloat(parsed.confidence || 0),
        model: provider.name,
        responseTime
      };
    } catch (error: any) {
      lastError = error;
      console.warn(`[AI] Smart provider ${provider.name} failed: ${error.message}`);
      continue;
    }
  }

  console.error('[AI] Smart fallback exhausted all providers (all_llm_failed)');
  return {
    intent: 'unknown',
    action: 'reply',
    response: UNKNOWN_FALLBACK_MESSAGES.en,
    confidence: 0,
    model: 'all_llm_failed',
    responseTime: Date.now() - startTime
  };
}

// ─── Generate Reply Only (skip classification) ──────────────────────

/**
 * Generate a reply for a known intent without re-classifying.
 * Used by T4 Smart-Fast and T5 Tiered-Hybrid when classification is already done.
 */
export async function generateReplyOnly(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
  intent: string
): Promise<{ response: string; confidence?: number; model?: string; responseTime?: number }> {
  if (!isAIAvailable()) {
    return { response: '', confidence: 0, model: 'none' };
  }

  const replyPrompt = systemPrompt + `\n\nThe user's intent has been classified as "${intent}". Generate a helpful response. Reply in the same language as the user.

IMPORTANT: Include a confidence score for your response:
- Set confidence < 0.5 if: answer is partial, information is incomplete, or you're not sure
- Set confidence < 0.7 if: answer requires interpretation or combines multiple KB sections
- Set confidence >= 0.7 if: answer is directly stated in KB and complete
- Set confidence >= 0.9 if: answer is exact quote from KB with no ambiguity

Respond with ONLY valid JSON: {"response":"<your reply>", "confidence": 0.0-1.0}`;

  const cw = getContextWindows();
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: replyPrompt }
  ];

  const recentHistory = history.slice(-cw.reply);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const aiCfg = getAISettings();
  const startTime = Date.now();
  const { content, provider } = await chatWithFallback(messages, aiCfg.max_chat_tokens, aiCfg.chat_temperature, true);
  const responseTime = Date.now() - startTime;

  if (content) {
    try {
      const parsed = JSON.parse(content);
      const confidence = typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.7;

      const responseText = typeof parsed.response === 'string' ? parsed.response.trim() : '';
      return {
        response: responseText,
        confidence,
        model: provider?.name || provider?.model || 'unknown',
        responseTime
      };
    } catch {
      if (looksLikeJson(content)) {
        console.warn('[AI] generateReplyOnly: LLM returned JSON-like content, using empty response');
        return { response: '', confidence: 0.5, model: provider?.name || 'unknown', responseTime };
      }
      return {
        response: content,
        confidence: 0.5,
        model: provider?.name || 'unknown',
        responseTime
      };
    }
  }

  console.warn('[AI] generateReplyOnly: all LLMs failed, using static fallback');
  return { response: UNKNOWN_FALLBACK_MESSAGES.en, confidence: 0, model: 'all_llm_failed', responseTime };
}

// ─── Response Parsing ───────────────────────────────────────────────

const FALLBACK_RESPONSE: AIResponse = { intent: 'general', action: 'reply', response: '', confidence: 0.5 };

/**
 * Attempt partial recovery from a raw parsed object.
 * Extracts whatever valid fields exist and fills the rest with safe defaults.
 */
function recoverPartial(obj: Record<string, unknown>): AIResponse {
  const routing = configStore.getRouting();
  const definedIntents = Object.keys(routing);

  const rawIntent = typeof obj.intent === 'string' ? obj.intent : '';
  const intent = rawIntent && definedIntents.includes(rawIntent) ? rawIntent : 'general';

  const rawAction = typeof obj.action === 'string' ? obj.action : '';
  const action: AIAction = (VALID_ACTIONS as readonly string[]).includes(rawAction)
    ? (rawAction as AIAction)
    : 'reply';

  const rawResponse = typeof obj.response === 'string' ? obj.response : '';
  const response = rawResponse && !looksLikeJson(rawResponse) ? rawResponse : '';

  const rawConfidence = typeof obj.confidence === 'number' ? obj.confidence : NaN;
  const confidence = Number.isFinite(rawConfidence) ? Math.min(1, Math.max(0, rawConfidence)) : 0.5;

  return { intent, action, response, confidence };
}

export function parseAIResponse(raw: string): AIResponse {
  // Step 1: Try JSON.parse
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // JSON.parse failed — try to extract JSON from mixed text
    const lastBrace = raw.lastIndexOf('}');
    if (lastBrace >= 0) {
      for (let start = raw.lastIndexOf('{'); start >= 0; start = raw.lastIndexOf('{', start - 1)) {
        if (start > lastBrace) continue;
        try {
          const candidate = raw.slice(start, lastBrace + 1);
          parsed = JSON.parse(candidate);
          // Found valid JSON — validate it below
          break;
        } catch {
          continue;
        }
      }
    }
    // If we still don't have parsed JSON, try plain text extraction
    if (!parsed!) {
      if (lastBrace >= 0) {
        const jsonStart = raw.lastIndexOf('\n\n{');
        if (jsonStart > 0) {
          const stripped = raw.slice(0, jsonStart).trim();
          if (stripped && !looksLikeJson(stripped)) {
            return { intent: 'general', action: 'reply', response: stripped, confidence: 0.5 };
          }
        }
      }
      console.warn('[AI] parseAIResponse: could not parse JSON, using fallback');
      return { ...FALLBACK_RESPONSE };
    }
  }

  // Step 2: Validate with Zod schema
  const result = aiResponseSchema.safeParse(parsed!);
  if (result.success) {
    // Full validation passed — still validate intent against routing
    const routing = configStore.getRouting();
    const definedIntents = Object.keys(routing);
    const intent = definedIntents.includes(result.data.intent) ? result.data.intent : 'general';
    const response = looksLikeJson(result.data.response) ? '' : result.data.response;
    return { ...result.data, intent, response };
  }

  // Step 3: Validation failed — attempt partial recovery
  console.warn('[AI] parseAIResponse: Zod validation failed, attempting partial recovery:', result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '));
  return recoverPartial(parsed!);
}

/** True if the string looks like raw JSON to avoid leaking to guests. */
export function looksLikeJson(s: string): boolean {
  const t = s.trim();
  return (t.startsWith('{') && t.includes('"')) || (t.startsWith('[{') && t.includes('"'));
}
