/**
 * ai-provider-manager.ts — Provider lifecycle + execution infrastructure
 * (Single Responsibility: manage AI provider connections and execute requests)
 */
import Groq from 'groq-sdk';
import axios from 'axios';
import type { AIProvider } from './config-store.js';
import { configStore } from './config-store.js';
import { circuitBreakerRegistry } from './circuit-breaker.js';
import { rateLimitManager } from './rate-limit-manager.js';
import { notifyAdminRateLimit } from '../lib/admin-notifier.js';

// ─── Provider Configuration ──────────────────────────────────────────

export function getAISettings() {
  return configStore.getSettings().ai;
}

/** Get enabled providers sorted by priority (lowest first = highest priority) */
export function getProviders(): AIProvider[] {
  const ai = getAISettings();
  const providers = ai.providers || [];
  return providers
    .filter(p => p.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/** Resolve API key for a provider: direct value > env var > null. Trims whitespace to avoid 401s. */
export function resolveApiKey(provider: AIProvider): string | null {
  let key: string | undefined;
  if (provider.api_key) key = provider.api_key;
  else if (provider.api_key_env) key = process.env[provider.api_key_env];
  else if (provider.type === 'ollama') return 'ollama'; // Ollama doesn't need a key
  else return null;
  const trimmed = typeof key === 'string' ? key.trim() : '';
  return trimmed || null;
}

// ─── Groq SDK Instance Cache ─────────────────────────────────────────

let groqInstances = new Map<string, Groq>();

export function getGroqInstance(providerId: string): Groq | undefined {
  return groqInstances.get(providerId);
}

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

// ─── Timeout Wrapper ─────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ]);
}

// ─── Generic Provider Chat Call ──────────────────────────────────────

export async function providerChat(
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

    const response = await withTimeout(
      groq.chat.completions.create(body),
      60000,
      `${provider.name} request timeout after 60s`
    );
    return response.choices[0]?.message?.content?.trim() || null;
  }

  // google-gemini uses native Gemini API format
  if (provider.type === 'google-gemini') {
    // Convert OpenAI-style messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature
      }
    };

    // Add JSON response format if requested
    if (jsonMode) {
      body.generationConfig.responseMimeType = 'application/json';
    }

    const url = `${provider.base_url}/models/${provider.model}:generateContent?key=${apiKey}`;
    const res = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
      validateStatus: () => true
    });

    if (res.status !== 200) {
      const errText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      if (res.status === 429) {
        console.error(`[AI] ⚠️  RATE LIMIT HIT - ${provider.name}`);
      }
      throw new Error(`${provider.name} ${res.status}: ${errText.slice(0, 200)}`);
    }

    return res.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  }

  // openai-compatible & ollama both use axios
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
  if (provider.base_url?.includes('openrouter.ai')) {
    headers['Referer'] = process.env.OPENROUTER_REFERER || 'https://pelangi-capsule.local';
    headers['X-Title'] = process.env.OPENROUTER_APP_TITLE || 'Rainbow AI Pelangi';
  }

  const res = await axios.post(`${provider.base_url}/chat/completions`, body, {
    headers,
    timeout: 60000,
    validateStatus: () => true
  });

  if (res.status !== 200) {
    const errText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

    if (res.status === 401 && provider.base_url?.includes('openrouter.ai')) {
      const hint = 'Get a valid key at https://openrouter.ai/keys and set OPENROUTER_API_KEY in .env, then restart.';
      throw new Error(`${provider.name} 401 (invalid API key). ${hint}`);
    }

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

// ─── Fallback Chain ──────────────────────────────────────────────────

/** Try all providers in priority order, return first success */
export async function chatWithFallback(
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
    const breaker = circuitBreakerRegistry.getOrCreate(provider.id);
    if (breaker.isOpen()) {
      const status = breaker.getStatus();
      const cooldownSec = Math.ceil(status.cooldownRemaining / 1000);
      console.log(`[AI] ⚡ Circuit breaker OPEN for ${provider.name}, skipping (cooldown: ${cooldownSec}s)`);
      continue;
    }

    // Check rate limit cooldown
    if (rateLimitManager.isInCooldown(provider.id)) {
      const cooldownMs = rateLimitManager.getCooldownRemaining(provider.id);
      const cooldownSec = (cooldownMs / 1000).toFixed(1);
      console.log(`[AI] ⏱️  Rate limit cooldown active for ${provider.name}, skipping (${cooldownSec}s remaining)`);
      continue;
    }

    try {
      const content = await providerChat(provider, messages, maxTokens, temperature, jsonMode);
      if (content) {
        breaker.recordSuccess();
        rateLimitManager.recordSuccess(provider.id);
        console.log(`[AI] ✅ Success using: ${provider.name} (${provider.id})`);
        return { content, provider };
      }
    } catch (err: any) {
      breaker.recordFailure();

      const isRateLimit = err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit');
      if (isRateLimit) {
        rateLimitManager.recordRateLimit(provider.id);
        console.warn(`[AI] ⚠️  ${provider.name} RATE LIMITED — falling back to next provider`);

        // Check if we should notify admin
        if (rateLimitManager.shouldNotifyAdmin(provider.id)) {
          const state = rateLimitManager.getState(provider.id);
          if (state) {
            notifyAdminRateLimit(provider.id, provider.name, state.errorCount, state.totalErrors).catch(notifyErr => {
              console.warn(`[AI] Failed to send rate limit notification:`, notifyErr.message);
            });
          }
        }
      } else {
        console.warn(`[AI] ${provider.name} failed, trying next:`, err.message);
      }
    }
  }

  console.error(`[AI] ❌ All providers failed - no response generated`);
  return { content: null, provider: null };
}
