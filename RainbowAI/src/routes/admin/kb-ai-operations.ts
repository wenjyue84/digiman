import { Router } from 'express';
import type { Request, Response } from 'express';
import { configStore } from '../../assistant/config-store.js';
import { getKnowledgeMarkdown } from '../../assistant/knowledge-base.js';
import { isAIAvailable, chat } from '../../assistant/ai-client.js';
import { ok, badRequest, serverError } from './http-utils.js';

const router = Router();

// Valid guest journey phases (for generate-draft category suggestion)
const GUEST_PHASES = ['GENERAL_SUPPORT', 'PRE_ARRIVAL', 'ARRIVAL_CHECKIN', 'DURING_STAY', 'CHECKOUT_DEPARTURE', 'POST_CHECKOUT'];

const LANG_ORDER: Array<'en' | 'ms' | 'zh'> = ['en', 'ms', 'zh'];
const LANG_NAMES = { en: 'English', ms: 'Malay', zh: 'Chinese' };

// ─── LLM JSON Parsing Helpers ───────────────────────────────────────

/** Repair LLM JSON: escape control chars and unescaped " inside string values so JSON.parse succeeds. */
function repairJsonFromLLM(s: string): string {
  let out = '';
  let i = 0;
  let inString = false;
  while (i < s.length) {
    const c = s[i];
    if (!inString) {
      out += c;
      if (c === '"') inString = true;
      i++;
      continue;
    }
    if (c === '\\') {
      out += c;
      if (i + 1 < s.length) {
        out += s[i + 1];
        i += 2;
      } else {
        i++;
      }
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < s.length && /[\s]/.test(s[j])) j++;
      const next = j < s.length ? s[j] : '';
      if (next === ',' || next === '}' || next === '"' || next === ':') {
        out += c;
        inString = false;
        i++;
        continue;
      }
      out += '\\"';
      i++;
      continue;
    }
    if (c === '\n') {
      out += '\\n';
      i++;
      continue;
    }
    if (c === '\r') {
      out += '\\r';
      i++;
      continue;
    }
    if (c === '\t') {
      out += '\\t';
      i++;
      continue;
    }
    const code = c.charCodeAt(0);
    if (code < 32 && c !== '\n' && c !== '\r' && c !== '\t') {
      out += ' ';
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Extract the first JSON object from a string (handles trailing text after JSON).
 * Returns the substring from first '{' to matching '}'.
 */
function extractJsonObject(s: string): string {
  const start = s.indexOf('{');
  if (start === -1) return s;
  let depth = 0;
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth === 0) return s.substring(start, i + 1); }
  }
  // Incomplete JSON — return from start and attempt repair
  return s.substring(start);
}

/**
 * Attempt to close truncated JSON by appending missing closing quotes/braces.
 */
function closeTruncatedJson(s: string): string {
  let trimmed = s.trimEnd();
  // If it doesn't start with '{', wrap
  if (!trimmed.startsWith('{')) return trimmed;
  // Try to close: strip trailing comma, close open strings, close braces
  // Remove trailing comma
  if (trimmed.endsWith(',')) trimmed = trimmed.slice(0, -1);
  // Count unmatched quotes (simplistic: if odd number of unescaped quotes, add one)
  let quoteCount = 0;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '"' && (i === 0 || trimmed[i - 1] !== '\\')) quoteCount++;
  }
  if (quoteCount % 2 !== 0) trimmed += '"';
  // Count unmatched braces
  let braces = 0;
  let inStr = false;
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') braces++;
    if (c === '}') braces--;
  }
  while (braces > 0) { trimmed += '}'; braces--; }
  return trimmed;
}

/**
 * Extract field values using regex as last resort.
 * Looks for patterns like "en": "value" in the raw text.
 */
function extractFieldsViaRegex(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const fieldPattern = /"(en|ms|zh|intent|phase)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = fieldPattern.exec(raw)) !== null) {
    if (!result[match[1]]) {
      result[match[1]] = match[2].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
  }
  return result;
}

/** Parse JSON from LLM output with multiple fallback strategies. */
export function parseJsonFromLLM<T = unknown>(cleaned: string): T {
  // Attempt 1: direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch { /* continue */ }

  // Attempt 2: extract JSON object then parse
  const extracted = extractJsonObject(cleaned);
  try {
    return JSON.parse(extracted) as T;
  } catch { /* continue */ }

  // Attempt 3: repair escape issues then parse
  try {
    return JSON.parse(repairJsonFromLLM(extracted)) as T;
  } catch { /* continue */ }

  // Attempt 4: close truncated JSON then repair and parse
  const closed = closeTruncatedJson(extracted);
  try {
    return JSON.parse(closed) as T;
  } catch { /* continue */ }
  try {
    return JSON.parse(repairJsonFromLLM(closed)) as T;
  } catch { /* continue */ }

  // Attempt 5: regex field extraction as last resort
  const fields = extractFieldsViaRegex(cleaned);
  if (Object.keys(fields).length > 0) {
    return fields as unknown as T;
  }

  // All attempts failed — throw with context
  throw new Error('Unexpected end of JSON input');
}

// ─── Generate Static Reply via AI (for a given intent) ─────────────────

router.post('/knowledge/generate', async (req: Request, res: Response) => {
  const { intent } = req.body;
  if (!intent || typeof intent !== 'string') {
    badRequest(res, 'intent (string) required');
    return;
  }
  if (!isAIAvailable()) {
    res.status(503).json({ error: 'AI not available — configure NVIDIA or Groq API key' });
    return;
  }

  const kb = getKnowledgeMarkdown();
  const isUnknown = intent === 'unknown' || intent === 'unknown_intent';
  const intentGuidance = isUnknown
    ? `This is the "unknown" intent — the guest said something Rainbow AI couldn't understand.
Generate a polite, helpful clarification message that:
- Acknowledges the guest's message warmly
- Asks them to rephrase or choose from common topics (check-in, pricing, facilities, directions)
- Mentions they can also contact staff directly if needed
- Does NOT say "I'm just a bot" or similar dismissive language`
    : `This is for the "${intent}" intent. Generate a reply that:
- Directly answers the guest's likely question for this intent
- References specific Pelangi Capsule Hostel details from the knowledge base (prices, times, policies, location)
- Is helpful and actionable (include specific info like times, prices, instructions)
- If the KB lacks info for this intent, write a reasonable hostel-specific response`;

  const prompt = `You are Rainbow AI, the WhatsApp concierge for Pelangi Capsule Hostel — a capsule hostel in Johor Bahru, Malaysia.

${intentGuidance}

Rules:
- Keep each response under 300 characters
- Be warm, concise, and professional — suitable for WhatsApp
- Include specific details (prices, times, locations) when available
- Do NOT sign off as "Rainbow" or use excessive emojis
- Each language version should feel natural, not machine-translated

<knowledge_base>
${kb}
</knowledge_base>

CRITICAL: Return ONLY a single-line valid JSON object (no markdown, no code fences, no explanation before or after):
{"en": "English reply", "ms": "Malay reply", "zh": "Chinese reply"}

Keep each translation UNDER 200 characters to fit in the response.`;

  try {
    const raw = await chat(prompt, [], `Generate static reply for intent: ${intent}`);
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = parseJsonFromLLM<{ en?: string; ms?: string; zh?: string }>(cleaned);
    const response = {
      en: typeof parsed.en === 'string' ? parsed.en : '',
      ms: typeof parsed.ms === 'string' ? parsed.ms : '',
      zh: typeof parsed.zh === 'string' ? parsed.zh : '',
    };
    ok(res, { intent, response });
  } catch (err: any) {
    serverError(res, `AI generation failed: ${err.message}`);
  }
});

// ─── Translate one language to the other two (same model as LLM reply) ───

router.post('/knowledge/translate', async (req: Request, res: Response) => {
  const { en, ms, zh } = req.body || {};
  const current = {
    en: typeof en === 'string' ? en.trim() : '',
    ms: typeof ms === 'string' ? ms.trim() : '',
    zh: typeof zh === 'string' ? zh.trim() : '',
  };
  const sourceLang = LANG_ORDER.find(l => current[l].length > 0);
  if (!sourceLang) {
    badRequest(res, 'At least one of en, ms, or zh must be non-empty');
    return;
  }
  const sourceText = current[sourceLang];
  if (!isAIAvailable()) {
    res.status(503).json({ error: 'AI not available — configure an AI provider for LLM reply' });
    return;
  }

  const targetLangs = LANG_ORDER.filter(l => l !== sourceLang);
  const prompt = `You are a translator for a hostel WhatsApp bot. The following message is in ${LANG_NAMES[sourceLang]}.

Translate it to ${targetLangs.map(l => LANG_NAMES[l]).join(' and ')}. Keep the same tone (warm, concise). Suitable for guest messages. No emoji unless the original has them.

CRITICAL: Return ONLY a single-line valid JSON object (no markdown, no code fence, no explanation). Use exactly three keys: "en", "ms", "zh". Use the EXACT original text for the "${sourceLang}" key. For the other two keys, provide your translation. Inside JSON string values, escape double quotes as \\" and newlines as \\n. Keep translations UNDER 300 characters each.

Original (${LANG_NAMES[sourceLang]}):
${sourceText}

JSON:`;

  try {
    const raw = await chat(prompt, [], 'Translate quick reply to EN/MS/ZH');
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = parseJsonFromLLM<{ en?: string; ms?: string; zh?: string }>(cleaned);
    // Keep existing non-empty; fill missing from LLM
    const result = {
      en: current.en || (typeof parsed.en === 'string' ? parsed.en.trim() : ''),
      ms: current.ms || (typeof parsed.ms === 'string' ? parsed.ms.trim() : ''),
      zh: current.zh || (typeof parsed.zh === 'string' ? parsed.zh.trim() : ''),
    };
    ok(res, { en: result.en, ms: result.ms, zh: result.zh });
  } catch (err: any) {
    serverError(res, `Translation failed: ${err.message}`);
  }
});

// ─── Generate draft reply + suggested intent & category (for approval) ──

router.post('/knowledge/generate-draft', async (req: Request, res: Response) => {
  try {
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
    if (!isAIAvailable()) {
      res.status(503).json({ error: 'AI not available — configure NVIDIA or Groq API key' });
      return;
    }

    const kb = getKnowledgeMarkdown();
    const topicHint = topic
      ? `The user wants a reply for: "${topic}". `
      : 'The user wants a new static reply. Choose a useful topic that fits the knowledge base (e.g. breakfast, parking, luggage storage). ';

    const prompt = `You are a helpful assistant for Pelangi Capsule Hostel (capsule hostel in Johor Bahru). Your task is to propose ONE intent reply for their WhatsApp bot, based ONLY on the knowledge base below.

${topicHint}

Rules:
1. Identify the most specific "intent" key for this request. Use snake_case (e.g. breakfast_info, luggage_storage, extra_amenity_request). You MAY use an existing intent key if it fits the topic efficiently.
2. Suggest a "phase" — the guest journey category this reply belongs to. Use exactly one of: GENERAL_SUPPORT, PRE_ARRIVAL, ARRIVAL_CHECKIN, DURING_STAY, CHECKOUT_DEPARTURE, POST_CHECKOUT.
3. Generate "response" with three keys: "en" (English), "ms" (Malay), "zh" (Chinese). Use ONLY information from the knowledge base. Keep each under 300 characters. Be warm and concise; suitable for WhatsApp. Do not sign as Rainbow or overuse emojis.

<knowledge_base>
${kb}
</knowledge_base>

CRITICAL: Return ONLY a single-line valid JSON object (no markdown, no code fences, no explanation before or after). Keep each response UNDER 200 characters.
{"intent":"snake_case_key","phase":"ONE_OF_THE_PHASES_ABOVE","response":{"en":"English text","ms":"Malay text","zh":"Chinese text"}}`;

    const raw = await chat(prompt, [], 'Generate draft intent reply with category');
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = parseJsonFromLLM<{ intent?: string; phase?: string; response?: { en?: string; ms?: string; zh?: string }; en?: string }>(cleaned);

    const intent = (typeof parsed.intent === 'string' ? parsed.intent.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase() : '') || 'custom_reply';
    let phase = typeof parsed.phase === 'string' ? parsed.phase.toUpperCase() : 'GENERAL_SUPPORT';
    if (!GUEST_PHASES.includes(phase)) phase = 'GENERAL_SUPPORT';

    const response = {
      en: typeof parsed.response?.en === 'string' ? parsed.response.en : '',
      ms: typeof parsed.response?.ms === 'string' ? parsed.response.ms : '',
      zh: typeof parsed.response?.zh === 'string' ? parsed.response.zh : '',
    };
    // Fallback: if regex extraction returned flat fields (en/ms/zh at top level)
    if (!response.en) response.en = (parsed as any).en || '';
    if (!response.ms) response.ms = (parsed as any).ms || '';
    if (!response.zh) response.zh = (parsed as any).zh || '';

    ok(res, { intent, phase, response });
  } catch (err: any) {
    if (res.headersSent) return;
    serverError(res, err?.message ? `AI generation failed: ${err.message}` : 'AI generation failed');
  }
});

// ─── Bulk Translate: fill missing languages for all intents ───────────

router.post('/knowledge/translate-all', async (req: Request, res: Response) => {
  if (!isAIAvailable()) {
    res.status(503).json({ error: 'AI not available — configure an AI provider' });
    return;
  }

  const data = configStore.getKnowledge();
  const entries = data.static || [];
  const results: Array<{ intent: string; status: string }> = [];
  let translated = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of entries) {
    const en = (entry.response?.en || '').trim();
    const ms = (entry.response?.ms || '').trim();
    const zh = (entry.response?.zh || '').trim();

    // Skip if all three languages are present
    if (en && ms && zh) {
      skipped++;
      results.push({ intent: entry.intent, status: 'complete' });
      continue;
    }

    // Need at least one language to translate from
    const sourceLang = LANG_ORDER.find(l => (entry.response?.[l] || '').trim().length > 0);
    if (!sourceLang) {
      skipped++;
      results.push({ intent: entry.intent, status: 'no_source' });
      continue;
    }

    const sourceText = (entry.response[sourceLang] || '').trim();
    const targetLangs = LANG_ORDER.filter(l => !(entry.response?.[l] || '').trim());

    try {
      const prompt = `You are a translator for a hostel WhatsApp bot. Translate the following ${LANG_NAMES[sourceLang]} message to ${targetLangs.map(l => LANG_NAMES[l]).join(' and ')}.

CRITICAL: Return ONLY a single-line valid JSON object with keys: "en", "ms", "zh". Use the original text for "${sourceLang}". Escape quotes as \\" and newlines as \\n. Keep translations UNDER 300 characters.

Original (${LANG_NAMES[sourceLang]}):
${sourceText}

JSON:`;

      const raw = await chat(prompt, [], 'Bulk translate: ' + entry.intent);
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = parseJsonFromLLM<{ en?: string; ms?: string; zh?: string }>(cleaned);

      // Fill missing only
      if (!en && typeof parsed.en === 'string' && parsed.en.trim()) entry.response.en = parsed.en.trim();
      if (!ms && typeof parsed.ms === 'string' && parsed.ms.trim()) entry.response.ms = parsed.ms.trim();
      if (!zh && typeof parsed.zh === 'string' && parsed.zh.trim()) entry.response.zh = parsed.zh.trim();

      translated++;
      results.push({ intent: entry.intent, status: 'translated' });
    } catch (err: any) {
      failed++;
      results.push({ intent: entry.intent, status: 'error: ' + (err.message || 'unknown') });
    }

    // Small delay between API calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Save updated data
  if (translated > 0) {
    configStore.setKnowledge(data);
  }

  ok(res, { translated, skipped, failed, total: entries.length, results });
});

export default router;
