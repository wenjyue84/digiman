/**
 * ai-classification.ts — Intent classification + system prompt generation
 * (Single Responsibility: classify user messages into intents)
 */
import type { AIClassifyResult, IntentCategory, ChatMessage } from './types.js';
import { configStore } from './config-store.js';
import { getContextWindows } from './context-windows.js';
import { isAIAvailable, getAISettings, chatWithFallback, getProviders } from './ai-provider-manager.js';
import { getLLMSettings } from './llm-settings-loader.js';

// ─── Constants ───────────────────────────────────────────────────────

export const VALID_CATEGORIES: IntentCategory[] = [
  // General support
  'greeting', 'thanks', 'contact_staff', 'unknown',
  // Pre-arrival
  'pricing', 'availability', 'booking', 'directions', 'facilities_info',
  'rules_policy', 'payment_info', 'payment_made', 'checkin_info', 'checkout_info',
  // Arrival & check-in
  'check_in_arrival', 'lower_deck_preference', 'wifi', 'facility_orientation',
  // During stay
  'climate_control_complaint', 'noise_complaint', 'cleanliness_complaint',
  'facility_malfunction', 'card_locked', 'theft_report', 'general_complaint_in_stay',
  'extra_amenity_request', 'tourist_guide',
  // Checkout
  'checkout_procedure', 'late_checkout_request', 'luggage_storage', 'billing_inquiry',
  // Post-checkout
  'forgot_item_post_checkout', 'post_checkout_complaint', 'billing_dispute', 'review_feedback',
  // Legacy generic categories (for backward compatibility)
  'complaint', 'facilities', 'rules', 'payment', 'general', 'checkin', 'checkout'
];

// ─── T4 Provider Selection ───────────────────────────────────────────

/**
 * Read T4 (intent classification) provider IDs.
 * - If Understanding tab has a default model (defaultProviderId), use that single model.
 * - Else if selectedProviders list is set, use those in order.
 * - Else master setting: Settings → routing_mode.classifyProvider, or all enabled by priority.
 */
export function getT4ProviderIds(): string[] | undefined {
  try {
    const settings = getLLMSettings();
    const defaultId = settings.defaultProviderId;
    if (defaultId && typeof defaultId === 'string') {
      return [defaultId];
    }
    const selected = settings.selectedProviders;
    if (Array.isArray(selected) && selected.length > 0) {
      return selected
        .sort((a: any, b: any) => a.priority - b.priority)
        .map((s: any) => s.id);
    }
  } catch {
    // Fall through to master default
  }
  try {
    const master = configStore.getSettings();
    const classifyProvider = master.routing_mode?.classifyProvider;
    if (classifyProvider) {
      return [classifyProvider];
    }
    const ids = getProviders().map(p => p.id);
    return ids.length > 0 ? ids : undefined;
  } catch {
    return undefined;
  }
}

// ─── System Prompt Generation ────────────────────────────────────────

/**
 * Dynamically generates the intent classification system prompt
 * based on current intent definitions from JSON files.
 */
export function buildClassifySystemPrompt(
  intents: Array<{ intent: string; keywords: Record<string, string[]> }>,
  examples?: Array<{ intent: string; examples: Record<string, string[]> }>
): string {
  const intentNames = intents.map(i => i.intent).sort();

  if (!intentNames.includes('general')) intentNames.push('general');
  if (!intentNames.includes('unknown')) intentNames.push('unknown');
  intentNames.sort();

  const categoriesList = intentNames.join(', ');

  let examplesSection = '';
  if (examples && examples.length > 0) {
    examplesSection = '\n\nExample classifications:\n';
    examples.slice(0, 3).forEach(ex => {
      const allExamples = Object.values(ex.examples).flat();
      const firstExample = allExamples[0];
      if (firstExample) {
        examplesSection += `- "${firstExample}" → ${ex.intent}\n`;
      }
    });
  }

  return `You are an intent classifier for a unit hostel WhatsApp bot.
Given the user message, classify it into exactly ONE category and extract entities.

Categories: ${categoriesList}

Extract entities when present: dates (check_in, check_out), guest_count, language.${examplesSection}

Respond with ONLY valid JSON (no markdown):
{"category":"<category>","confidence":<0-1>,"entities":{}}`;
}

// Cache for system prompt (performance optimization)
let cachedSystemPrompt: string | null = null;
let lastIntentCount = 0;

/** Get system prompt with caching. Rebuilds only when intent count changes. */
export async function getSystemPrompt(): Promise<string> {
  try {
    const intentKeywordsData = await import('./data/intent-keywords.json', { assert: { type: 'json' } });
    const currentIntentCount = intentKeywordsData.default?.intents?.length || 0;

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
    return `You are an intent classifier for a unit hostel WhatsApp bot.
Given the user message, classify it into exactly ONE category and extract entities.

Categories: greeting, thanks, wifi, directions, checkin_info, checkout_info, pricing, availability, booking, complaint, contact_staff, facilities, rules, payment, general, unknown

Extract entities when present: dates (check_in, check_out), guest_count, language.

Respond with ONLY valid JSON (no markdown):
{"category":"<category>","confidence":<0-1>,"entities":{}}`;
  }
}

// ─── Classification Functions ────────────────────────────────────────

export function parseClassifyResult(parsed: any): AIClassifyResult {
  const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'unknown';
  const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5;
  const entities = typeof parsed.entities === 'object' && parsed.entities !== null ? parsed.entities : {};
  return { category, confidence, entities };
}

export async function classifyIntent(
  text: string,
  history: ChatMessage[] = []
): Promise<AIClassifyResult> {
  if (!isAIAvailable()) {
    return { category: 'unknown', confidence: 0, entities: {} };
  }

  const systemPrompt = await getSystemPrompt();

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  const cw = getContextWindows();
  const recentHistory = history.slice(-cw.classify);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: text });

  const aiCfg = getAISettings();
  const t4Ids = getT4ProviderIds();
  const { content, usage } = await chatWithFallback(messages, aiCfg.max_classify_tokens, aiCfg.classify_temperature, true, t4Ids);

  if (content) {
    try {
      const parsed = JSON.parse(content);
      const result = parseClassifyResult(parsed);
      return { ...result, usage };
    } catch {
      console.error('[AI] Failed to parse classify result:', content);
    }
  }

  return { category: 'unknown', confidence: 0, entities: {} };
}

// ─── Split-Model: Classify-Only (fast 8B model) ─────────────────────

export interface ClassifyOnlyResult {
  intent: string;
  confidence: number;
  model?: string;
  responseTime?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Classify intent using a specific fast provider (e.g., groq-llama-8b).
 * Returns only the classification — no response generation.
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
  const cw = getContextWindows();
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  const recentHistory = history.slice(-cw.classify);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: text });

  const aiCfg = getAISettings();
  const startTime = Date.now();

  const providerIds = classifyProviderId ? [classifyProviderId] : getT4ProviderIds();
  const { content, provider, usage } = await chatWithFallback(
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
        responseTime,
        usage
      };
    } catch {
      console.error('[AI] Failed to parse classifyOnly result:', content);
    }
  }

  return { intent: 'unknown', confidence: 0, model: 'failed', responseTime };
}
