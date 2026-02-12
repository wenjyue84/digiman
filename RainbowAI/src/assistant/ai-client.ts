import Groq from 'groq-sdk';
import axios from 'axios';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { AIClassifyResult, IntentCategory, ChatMessage } from './types.js';
import { configStore, type AIProvider } from './config-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getAISettings() {
  return configStore.getSettings().ai;
}

/** Get enabled providers sorted by priority (lowest first = highest priority) */
function getProviders(): AIProvider[] {
  const ai = getAISettings();
  const providers = ai.providers || [];
  return providers
    .filter(p => p.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/** Resolve API key for a provider: direct value > env var > null */
function resolveApiKey(provider: AIProvider): string | null {
  if (provider.api_key) return provider.api_key;
  if (provider.api_key_env) return process.env[provider.api_key_env] || null;
  if (provider.type === 'ollama') return 'ollama'; // Ollama doesn't need a key
  return null;
}

// Groq SDK instance cache
let groqInstances = new Map<string, Groq>();

export function initAIClient(): void {
  const providers = getProviders();
  if (providers.length === 0) {
    console.warn('[AI] No AI providers configured');
    return;
  }

  for (const p of providers) {
    const key = resolveApiKey(p);
    if (p.type === 'groq' && key) {
      groqInstances.set(p.id, new Groq({ apiKey: key }));
    }
    const status = key ? 'ready' : 'no key';
    console.log(`[AI] Provider "${p.name}" (priority ${p.priority}) — ${status}`);
  }

  configStore.on('reload', (domain: string) => {
    if (domain === 'settings' || domain === 'all') {
      // Rebuild Groq instances on settings change
      groqInstances.clear();
      for (const p of getProviders()) {
        const key = resolveApiKey(p);
        if (p.type === 'groq' && key) {
          groqInstances.set(p.id, new Groq({ apiKey: key }));
        }
      }
      console.log('[AI] Settings reloaded — providers refreshed');
    }
  });
}

export function isAIAvailable(): boolean {
  return getProviders().some(p => resolveApiKey(p) !== null);
}

// ─── Timeout wrapper helper ──────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ]);
}

// ─── Generic provider chat call ──────────────────────────────────────
async function providerChat(
  provider: AIProvider,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number,
  jsonMode: boolean = false
): Promise<string | null> {
  const apiKey = resolveApiKey(provider);
  if (!apiKey && provider.type !== 'ollama') return null;

  if (provider.type === 'groq') {
    const groq = groqInstances.get(provider.id);
    if (!groq) return null;
    const body: any = {
      model: provider.model,
      messages,
      max_tokens: maxTokens,
      temperature
    };
    if (jsonMode) body.response_format = { type: 'json_object' };

    // Wrap Groq SDK call with 60-second timeout (same as axios)
    const response = await withTimeout(
      groq.chat.completions.create(body),
      60000,
      `${provider.name} request timeout after 60s`
    );
    return response.choices[0]?.message?.content?.trim() || null;
  }

  // openai-compatible & ollama both use axios (better Windows compatibility than fetch)
  const body: any = {
    model: provider.model,
    messages,
    max_tokens: maxTokens,
    temperature
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey && provider.type !== 'ollama') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await axios.post(`${provider.base_url}/chat/completions`, body, {
    headers,
    timeout: 60000,
    validateStatus: () => true // Don't throw on non-2xx status
  });

  if (res.status !== 200) {
    const errText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

    // Enhanced logging for rate limits (429) and quota errors
    if (res.status === 429) {
      console.error(`[AI] ⚠️  RATE LIMIT HIT - ${provider.name}`);
      console.error(`[AI] Provider: ${provider.id} (${provider.type})`);
      console.error(`[AI] Status: ${res.status} - Rate limit exceeded`);
      console.error(`[AI] Details: ${errText.slice(0, 500)}`);
      console.error(`[AI] 💡 Tip: Disable this provider or wait for limit reset (usually 24h)`);
    }

    throw new Error(`${provider.name} ${res.status}: ${errText.slice(0, 200)}`);
  }

  return res.data.choices?.[0]?.message?.content?.trim() || null;
}

/** Try all providers in priority order, return first success */
async function chatWithFallback(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number,
  jsonMode: boolean = false,
  providerIds?: string[]
): Promise<{ content: string | null; provider: AIProvider | null }> {
  let providers = getProviders();

  if (providerIds && providerIds.length > 0) {
    const idOrder = new Map(providerIds.map((id, i) => [id, i]));
    providers = providers
      .filter(p => idOrder.has(p.id))
      .sort((a, b) => (idOrder.get(a.id)!) - (idOrder.get(b.id)!));
  }

  for (const provider of providers) {
    try {
      const content = await providerChat(provider, messages, maxTokens, temperature, jsonMode);
      if (content) {
        console.log(`[AI] ✅ Success using: ${provider.name} (${provider.id})`);
        return { content, provider };
      }
    } catch (err: any) {
      // Enhanced error logging with rate limit detection
      const isRateLimit = err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit');
      if (isRateLimit) {
        console.warn(`[AI] ⚠️  ${provider.name} RATE LIMITED — falling back to next provider`);
      } else {
        console.warn(`[AI] ${provider.name} failed, trying next:`, err.message);
      }
    }
  }

  console.error(`[AI] ❌ All providers failed - no response generated`);
  return { content: null, provider: null };
}

// ─── Layer 2: Smart Fallback for Low-Confidence Responses ─────────────────

/**
 * Fallback handler for low-confidence responses (Layer 2).
 * Uses smartest available models + increased context for full re-classification.
 *
 * @param systemPrompt - System prompt for classification
 * @param history - Conversation history (will be expanded to 20 messages)
 * @param userMessage - Current user message
 * @returns AIResponse with improved confidence (or same if fallback failed)
 */
export async function classifyAndRespondWithSmartFallback(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<AIResponse> {
  const startTime = Date.now();

  // 1. Filter to high-capability providers
  const allProviders = getProviders();
  const smartProviders = allProviders.filter(p =>
    // DeepSeek 671B, Kimi K2.5, GPT-OSS 120B, or priority <= 1
    p.id === 'deepseek-r1-distill-70b' ||
    p.id === 'kimi-k2.5' ||
    p.id === 'gpt-oss-120b' ||
    p.priority <= 1
  );

  if (smartProviders.length === 0) {
    console.warn('[AI] No smart providers available for fallback, using all enabled');
    // Fall back to regular classification
    return classifyAndRespond(systemPrompt, history, userMessage);
  }

  // 2. Double context size (10 → 20 messages)
  const expandedHistory = history.slice(-20);

  console.log(
    `[AI] 🧠 Smart fallback: ${smartProviders.length} providers, ` +
    `${expandedHistory.length} context messages`
  );

  // 3. Build messages with expanded context
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...expandedHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage }
  ];

  // 4. Try smart providers in priority order
  const ai = getAISettings();
  let lastError: Error | null = null;

  for (const provider of smartProviders) {
    try {
      const apiKey = resolveApiKey(provider);
      if (!apiKey && provider.type !== 'ollama') continue;

      let content: string | null = null;

      if (provider.type === 'groq') {
        const groq = groqInstances.get(provider.id);
        if (!groq) continue;

        const completion = await groq.chat.completions.create({
          model: provider.model,
          messages,
          max_tokens: Math.floor(ai.max_chat_tokens * 1.5), // 800 → 1200 tokens
          temperature: ai.chat_temperature,
          response_format: { type: 'json_object' }
        });

        content = completion.choices[0]?.message?.content?.trim() || null;
      } else {
        // openai-compatible & ollama
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
          timeout: 90000, // 90s timeout for smart models
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
        `[AI] ✅ Smart fallback success: ${provider.name} (${responseTime}ms) ` +
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

  // All smart providers failed - return error result
  console.error('[AI] ❌ Smart fallback exhausted all providers');
  return {
    intent: 'unknown',
    action: 'reply',
    response: '',
    confidence: 0,
    responseTime: Date.now() - startTime
  };
}

/** Read T4 selected provider IDs from llm-settings.json */
function getT4ProviderIds(): string[] | undefined {
  try {
    const raw = readFileSync(join(__dirname, 'data', 'llm-settings.json'), 'utf-8');
    const settings = JSON.parse(raw);
    const selected = settings.selectedProviders;
    if (Array.isArray(selected) && selected.length > 0) {
      return selected
        .sort((a: any, b: any) => a.priority - b.priority)
        .map((s: any) => s.id);
    }
  } catch {
    // Fall through — use all providers
  }
  return undefined;
}

const VALID_CATEGORIES: IntentCategory[] = [
  'greeting', 'thanks', 'wifi', 'directions', 'checkin_info', 'checkout_info',
  'pricing', 'availability', 'booking', 'complaint', 'contact_staff',
  'facilities', 'rules', 'payment', 'general', 'unknown'
];

// DEPRECATED: System prompt is now generated dynamically from intent-keywords.json
// const CLASSIFY_SYSTEM_PROMPT = `...`;

/**
 * Dynamically generates the intent classification system prompt
 * based on current intent definitions from JSON files.
 *
 * @param intents - Array of intent definitions with keywords
 * @param examples - Array of intent examples (optional, for few-shot learning)
 * @returns Formatted system prompt string
 */
function buildClassifySystemPrompt(
  intents: Array<{ intent: string; keywords: Record<string, string[]> }>,
  examples?: Array<{ intent: string; examples: string[] }>
): string {
  // Extract unique intent names from keywords and sort alphabetically
  const intentNames = intents.map(i => i.intent).sort();

  // Add 'general' and 'unknown' as fallback categories (not in JSON)
  if (!intentNames.includes('general')) intentNames.push('general');
  if (!intentNames.includes('unknown')) intentNames.push('unknown');
  intentNames.sort();

  // Build comma-separated list: "greeting, thanks, wifi, ..."
  const categoriesList = intentNames.join(', ');

  // Optional: Add few-shot examples if provided
  let examplesSection = '';
  if (examples && examples.length > 0) {
    examplesSection = '\n\nExample classifications:\n';
    // Take first 3 examples as demonstrations
    examples.slice(0, 3).forEach(ex => {
      const firstExample = ex.examples[0];
      if (firstExample) {
        examplesSection += `- "${firstExample}" → ${ex.intent}\n`;
      }
    });
  }

  return `You are an intent classifier for a capsule hostel WhatsApp bot.
Given the user message, classify it into exactly ONE category and extract entities.

Categories: ${categoriesList}

Extract entities when present: dates (check_in, check_out), guest_count, language.${examplesSection}

Respond with ONLY valid JSON (no markdown):
{"category":"<category>","confidence":<0-1>,"entities":{}}`;
}

// Cache for system prompt (performance optimization)
let cachedSystemPrompt: string | null = null;
let lastIntentCount = 0;

/**
 * Get system prompt with caching.
 * Rebuilds only when intent count changes.
 */
async function getSystemPrompt(): Promise<string> {
  try {
    const intentKeywordsData = await import('./data/intent-keywords.json', { assert: { type: 'json' } });
    const currentIntentCount = intentKeywordsData.default?.intents?.length || 0;

    // Rebuild only if intent count changed
    if (!cachedSystemPrompt || currentIntentCount !== lastIntentCount) {
      const intentExamplesData = await import('./data/intent-examples.json', { assert: { type: 'json' } });
      cachedSystemPrompt = buildClassifySystemPrompt(
        intentKeywordsData.default?.intents || [],
        intentExamplesData.default?.intents || []
      );
      lastIntentCount = currentIntentCount;
      console.log(`[AI] System prompt built with ${currentIntentCount} intents`);
    }

    return cachedSystemPrompt;
  } catch (error) {
    console.error('[AI] Failed to load intent data, using fallback prompt:', error);
    // Fallback to minimal prompt if JSON loading fails
    return `You are an intent classifier for a capsule hostel WhatsApp bot.
Given the user message, classify it into exactly ONE category and extract entities.

Categories: greeting, thanks, wifi, directions, checkin_info, checkout_info, pricing, availability, booking, complaint, contact_staff, facilities, rules, payment, general, unknown

Extract entities when present: dates (check_in, check_out), guest_count, language.

Respond with ONLY valid JSON (no markdown):
{"category":"<category>","confidence":<0-1>,"entities":{}}`;
  }
}

export async function classifyIntent(
  text: string,
  history: ChatMessage[] = []
): Promise<AIClassifyResult> {
  if (!isAIAvailable()) {
    return { category: 'unknown', confidence: 0, entities: {} };
  }

  // Get dynamic system prompt (cached, rebuilds only when intents change)
  const systemPrompt = await getSystemPrompt();

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  // Use only 5 recent messages for classification (less noise, faster)
  const recentHistory = history.slice(-5);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: text });

  const aiCfg = getAISettings();
  const t4Ids = getT4ProviderIds();
  const { content } = await chatWithFallback(messages, aiCfg.max_classify_tokens, aiCfg.classify_temperature, true, t4Ids);

  if (content) {
    try {
      const parsed = JSON.parse(content);
      return parseClassifyResult(parsed);
    } catch {
      console.error('[AI] Failed to parse classify result:', content);
    }
  }

  return { category: 'unknown', confidence: 0, entities: {} };
}

function parseClassifyResult(parsed: any): AIClassifyResult {
  const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'unknown';
  const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5;
  const entities = typeof parsed.entities === 'object' && parsed.entities !== null ? parsed.entities : {};
  return { category, confidence, entities };
}

export async function chat(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  if (!isAIAvailable()) {
    throw new Error('AI not available');
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const chatCfg = getAISettings();
  const { content } = await chatWithFallback(messages, chatCfg.max_chat_tokens, chatCfg.chat_temperature);

  if (content) return content;
  throw new Error('AI temporarily unavailable');
}

// ─── Unified classify + respond (LLM-first) ────────────────────────

export type AIAction = 'reply' | 'static_reply' | 'start_booking' | 'escalate' | 'forward_payment' | 'llm_reply';

export interface AIResponse {
  intent: string;
  action: AIAction;
  response: string;
  confidence: number;
  model?: string;
  responseTime?: number; // Time in milliseconds
}

const VALID_ACTIONS: AIAction[] = ['reply', 'static_reply', 'llm_reply', 'start_booking', 'escalate', 'forward_payment'];

export async function classifyAndRespond(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<AIResponse> {
  if (!isAIAvailable()) {
    return { intent: 'unknown', action: 'reply', response: '', confidence: 0, model: 'none' };
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const aiCfg = getAISettings();
  const startTime = Date.now();
  const { content, provider } = await chatWithFallback(messages, aiCfg.max_chat_tokens, aiCfg.chat_temperature, true);
  const responseTime = Date.now() - startTime;

  if (content) {
    const result = parseAIResponse(content);
    result.model = provider?.name || provider?.model || 'unknown';
    result.responseTime = responseTime;
    return result;
  }

  return { intent: 'unknown', action: 'reply', response: '', confidence: 0, model: 'failed', responseTime };
}

function parseAIResponse(raw: string): AIResponse {
  try {
    const parsed = JSON.parse(raw);

    const routing = configStore.getRouting();
    const definedIntents = Object.keys(routing);
    const intent = typeof parsed.intent === 'string' && definedIntents.includes(parsed.intent)
      ? parsed.intent
      : 'general';

    return {
      intent,
      action: VALID_ACTIONS.includes(parsed.action) ? parsed.action : 'reply',
      response: typeof parsed.response === 'string' ? parsed.response : '',
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5
    };
  } catch {
    return { intent: 'general', action: 'reply', response: raw, confidence: 0.5 };
  }
}

// ─── Split-Model: Classify-Only (fast 8B model) ─────────────────────

export interface ClassifyOnlyResult {
  intent: string;
  confidence: number;
  model?: string;
  responseTime?: number;
}

/**
 * Classify intent using a specific fast provider (e.g., groq-llama-8b).
 * Returns only the classification — no response generation.
 * Used by T4 Smart-Fast template to split classify (8B) from reply (70B).
 */
export async function classifyOnly(
  text: string,
  history: ChatMessage[] = [],
  classifyProviderId?: string
): Promise<ClassifyOnlyResult> {
  if (!isAIAvailable()) {
    return { intent: 'unknown', confidence: 0, model: 'none' };
  }

  const systemPrompt = await getSystemPrompt();
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  const recentHistory = history.slice(-5);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: text });

  const aiCfg = getAISettings();
  const startTime = Date.now();

  // Use specific provider if given, otherwise use T4 or default providers
  const providerIds = classifyProviderId ? [classifyProviderId] : getT4ProviderIds();
  const { content, provider } = await chatWithFallback(
    messages,
    aiCfg.max_classify_tokens,
    aiCfg.classify_temperature,
    true,
    providerIds
  );
  const responseTime = Date.now() - startTime;

  if (content) {
    try {
      const parsed = JSON.parse(content);
      const routing = configStore.getRouting();
      const definedIntents = Object.keys(routing);
      const intent = typeof parsed.category === 'string' && definedIntents.includes(parsed.category)
        ? parsed.category
        : (typeof parsed.intent === 'string' && definedIntents.includes(parsed.intent)
          ? parsed.intent
          : 'general');
      const confidence = typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5;

      return {
        intent,
        confidence,
        model: provider?.name || provider?.model || 'unknown',
        responseTime
      };
    } catch {
      console.error('[AI] Failed to parse classifyOnly result:', content);
    }
  }

  return { intent: 'unknown', confidence: 0, model: 'failed', responseTime };
}

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

  // Augment the system prompt to skip classification and request confidence
  const replyPrompt = systemPrompt + `\n\nThe user's intent has been classified as "${intent}". Generate a helpful response. Reply in the same language as the user.

IMPORTANT: Include a confidence score for your response:
- Set confidence < 0.5 if: answer is partial, information is incomplete, or you're not sure
- Set confidence < 0.7 if: answer requires interpretation or combines multiple KB sections
- Set confidence >= 0.7 if: answer is directly stated in KB and complete
- Set confidence >= 0.9 if: answer is exact quote from KB with no ambiguity

Respond with ONLY valid JSON: {"response":"<your reply>", "confidence": 0.0-1.0}`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: replyPrompt }
  ];

  const recentHistory = history.slice(-10);
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
        : 0.7; // Default confidence if not provided

      return {
        response: typeof parsed.response === 'string' ? parsed.response : content,
        confidence,
        model: provider?.name || provider?.model || 'unknown',
        responseTime
      };
    } catch {
      // Raw text response — use as-is with low confidence
      return {
        response: content,
        confidence: 0.5, // Low confidence for unparseable responses
        model: provider?.name || 'unknown',
        responseTime
      };
    }
  }

  return { response: '', confidence: 0, model: 'failed', responseTime };
}

// ─── Translation ───────────────────────────────────────────────────
export async function translateText(
  text: string,
  fromLang: string,
  toLang: string
): Promise<string | null> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a translator. Translate the following text from ${fromLang} to ${toLang}. Return ONLY the translated text, no explanations.`
    },
    { role: 'user' as const, content: text }
  ];

  const transCfg = getAISettings();
  const { content } = await chatWithFallback(messages, transCfg.max_chat_tokens, 0.3);
  return content;
}

// ─── Test a specific provider by ID ─────────────────────────────────
export async function testProvider(providerId: string): Promise<{
  ok: boolean;
  model?: string;
  reply?: string;
  responseTime?: number;
  error?: string;
}> {
  const ai = getAISettings();
  const provider = (ai.providers || []).find(p => p.id === providerId);
  if (!provider) return { ok: false, error: `Provider "${providerId}" not found` };

  const startTime = Date.now();
  try {
    const messages = [{ role: 'user', content: 'Say OK' }];
    // Use 100 tokens and temperature 1.0 (required by Kimi K2.5)
    const content = await providerChat(provider, messages, 100, 1.0);
    const elapsed = Date.now() - startTime;
    return { ok: true, model: provider.model, reply: content || '', responseTime: elapsed };
  } catch (e: any) {
    const elapsed = Date.now() - startTime;
    return { ok: false, error: e.message, responseTime: elapsed };
  }
}
