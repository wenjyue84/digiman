import { readFileSync, readdirSync, existsSync, watch, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { configStore } from './config-store.js';
import { notifyAdminConfigError } from '../lib/admin-notifier.js';
import { loadAllKBFromDB, saveKBFileToDB } from '../lib/config-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .rainbow-kb/ lives at RainbowAI root (2 levels up from src/assistant/)
const RAINBOW_KB_DIR = process.env.RAINBOW_KB_DIR || resolve(__dirname, '..', '..', '.rainbow-kb');
const MEMORY_DIR = join(RAINBOW_KB_DIR, 'memory');
const DURABLE_MEMORY_FILE = 'memory.md';

// In-memory cache of all KB files
let kbCache: Map<string, string> = new Map();

// ─── KB Pattern Config (loaded from kb-patterns.json) ────────────────

interface KBPatternEntry {
  comment: string;
  regex: string;
  files: string[];
}

interface KBPatternsConfig {
  description?: string;
  coreFiles: string[];
  defaultFallback: string;
  patterns: KBPatternEntry[];
}

let kbPatternsConfig: KBPatternsConfig | null = null;

// Pre-compiled topic patterns: built once at first load, reused every message
let COMPILED_TOPIC_PATTERNS: Array<{ pattern: RegExp; files: string[] }> | null = null;

function loadKBPatterns(): KBPatternsConfig {
  if (kbPatternsConfig) return kbPatternsConfig;
  try {
    const configPath = resolve(__dirname, 'data', 'kb-patterns.json');
    kbPatternsConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    console.log(`[KnowledgeBase] Loaded ${kbPatternsConfig!.patterns.length} topic patterns from kb-patterns.json`);
    return kbPatternsConfig!;
  } catch (err: any) {
    console.warn(`[KnowledgeBase] Failed to load kb-patterns.json: ${err.message} — using empty pattern map`);
    kbPatternsConfig = {
      coreFiles: ['AGENTS.md', 'soul.md'],
      defaultFallback: 'faq.md',
      patterns: []
    };
    return kbPatternsConfig;
  }
}

/**
 * Build and cache pre-compiled RegExp objects from kb-patterns.json.
 * Called once at first use; avoids `new RegExp()` on every message.
 */
function getCompiledTopicPatterns(): Array<{ pattern: RegExp; files: string[] }> {
  if (COMPILED_TOPIC_PATTERNS) return COMPILED_TOPIC_PATTERNS;
  const config = loadKBPatterns();
  COMPILED_TOPIC_PATTERNS = config.patterns.map(entry => ({
    pattern: new RegExp(entry.regex, 'i'),
    files: entry.files
  }));
  console.log(`[KnowledgeBase] Compiled ${COMPILED_TOPIC_PATTERNS.length} topic regex patterns`);
  return COMPILED_TOPIC_PATTERNS;
}

// Always injected into every prompt (loaded from config)
function getCoreFiles(): string[] {
  return loadKBPatterns().coreFiles;
}

// Build TOPIC_FILE_MAP from config patterns
function getTopicFileMap(): Record<string, string[]> {
  const config = loadKBPatterns();
  const map: Record<string, string[]> = {};
  for (const entry of config.patterns) {
    map[entry.regex] = entry.files;
  }
  return map;
}

// Default fallback file when no patterns match
function getDefaultFallback(): string {
  return loadKBPatterns().defaultFallback;
}

/**
 * Scan message text and return which topic files should be loaded.
 * Falls back to defaultFallback (faq.md) if no keywords match.
 * Uses pre-compiled regex patterns to avoid per-message RegExp construction.
 */
export function guessTopicFiles(text: string): string[] {
  const compiledPatterns = getCompiledTopicPatterns();
  const files = new Set<string>();
  for (const { pattern, files: fileList } of compiledPatterns) {
    if (pattern.test(text)) {
      fileList.forEach(f => files.add(f));
    }
  }
  // Default fallback
  if (files.size === 0) files.add(getDefaultFallback());
  return Array.from(files);
}

// ─── Timezone Helpers (MYT = Asia/Kuala_Lumpur, UTC+8) ──────────────

export function getTodayDate(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kuala_Lumpur' });
}

export function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Kuala_Lumpur' });
}

export function getMYTTimestamp(): string {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Current date and time in Malaysia (Asia/Kuala_Lumpur) for LLM context.
 * Use when replying to time-sensitive intents (e.g. early check-in, late checkout).
 */
export function getTimeContext(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `CURRENT DATE AND TIME (Malaysia, Asia/Kuala_Lumpur): ${dateStr}, ${timeStr}. Use this when answering questions about check-in times, check-out times, early arrival, or late checkout.`;
}

// ─── Memory Helpers ─────────────────────────────────────────────────

export function getMemoryDir(): string {
  return MEMORY_DIR;
}

export function getDurableMemory(): string {
  return kbCache.get(DURABLE_MEMORY_FILE) || '';
}

export function listMemoryDays(): string[] {
  if (!existsSync(MEMORY_DIR)) return [];
  return readdirSync(MEMORY_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .map(f => f.replace('.md', ''))
    .sort()
    .reverse();
}

// ─── Loading & Caching ──────────────────────────────────────────────

export function reloadKBFile(filename: string): void {
  // Handle memory/ subdirectory paths
  if (filename.startsWith('memory/') || filename.startsWith('memory\\')) {
    const normalizedName = filename.replace(/\\/g, '/');
    const filePath = join(RAINBOW_KB_DIR, filename);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      kbCache.set(normalizedName, content);
      // Fire-and-forget DB sync
      saveKBFileToDB(normalizedName, content).catch(() => {});
      console.log(`[KnowledgeBase] Reloaded ${filename}`);
      // Memory files are part of the cached base prompt — invalidate
      invalidateSystemPromptCache();
    }
    return;
  }
  const filePath = join(RAINBOW_KB_DIR, filename);
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    kbCache.set(filename, content);
    // Fire-and-forget DB sync
    saveKBFileToDB(filename, content).catch(() => {});
    console.log(`[KnowledgeBase] Reloaded ${filename}`);
    // Core files (AGENTS.md, soul.md) and durable memory are part of the cached base prompt.
    // Invalidate for any KB file change since topic files could also affect future caching.
    const CORE_FILES = getCoreFiles();
    if (CORE_FILES.includes(filename) || filename === DURABLE_MEMORY_FILE) {
      invalidateSystemPromptCache();
    }
  }
}

export function reloadAllKB(): void {
  if (!existsSync(RAINBOW_KB_DIR)) {
    console.warn(`[KnowledgeBase] .rainbow-kb/ not found at ${RAINBOW_KB_DIR}`);
    return;
  }
  const files = readdirSync(RAINBOW_KB_DIR).filter(f => f.endsWith('.md'));
  for (const file of files) {
    kbCache.set(file, readFileSync(join(RAINBOW_KB_DIR, file), 'utf-8'));
  }

  // Also load today + yesterday daily logs from memory/
  if (existsSync(MEMORY_DIR)) {
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    for (const date of [today, yesterday]) {
      const memFile = join(MEMORY_DIR, `${date}.md`);
      if (existsSync(memFile)) {
        kbCache.set(`memory/${date}.md`, readFileSync(memFile, 'utf-8'));
      }
    }
  }

  // Invalidate system prompt cache — KB content has changed
  invalidateSystemPromptCache();

  console.log(`[KnowledgeBase] Loaded ${kbCache.size} KB files from .rainbow-kb/`);
}

function watchKBDirectory(): void {
  if (!existsSync(RAINBOW_KB_DIR)) return;
  try {
    watch(RAINBOW_KB_DIR, (eventType, filename) => {
      if (filename && filename.endsWith('.md')) {
        console.log(`[KnowledgeBase] File changed: ${filename}, reloading...`);
        reloadKBFile(filename);
      }
    });
    console.log(`[KnowledgeBase] Watching .rainbow-kb/ for changes`);
  } catch (err: any) {
    console.warn(`[KnowledgeBase] Could not watch .rainbow-kb/: ${err.message}`);
  }

  // Also watch memory/ subdirectory
  if (!existsSync(MEMORY_DIR)) {
    try { mkdirSync(MEMORY_DIR, { recursive: true }); } catch {}
  }
  try {
    watch(MEMORY_DIR, (eventType, filename) => {
      if (filename && filename.endsWith('.md')) {
        console.log(`[KnowledgeBase] Memory file changed: ${filename}, reloading...`);
        reloadKBFile(`memory/${filename}`);
      }
    });
    console.log(`[KnowledgeBase] Watching .rainbow-kb/memory/ for changes`);
  } catch (err: any) {
    console.warn(`[KnowledgeBase] Could not watch memory/: ${err.message}`);
  }
}

/**
 * Try loading KB files from DB first. Falls back to local files.
 * Called once at startup after ensureConfigTables().
 */
export async function initKBFromDB(): Promise<void> {
  try {
    const dbKB = await loadAllKBFromDB();
    if (dbKB && dbKB.size > 0) {
      // Merge DB KB into cache (DB is authoritative)
      for (const [filename, content] of dbKB) {
        kbCache.set(filename, content);
      }
      invalidateSystemPromptCache();
      console.log(`[KnowledgeBase] Loaded ${dbKB.size} KB files from DB`);
      return;
    }
  } catch (err: any) {
    console.warn('[KnowledgeBase] DB KB load failed:', err.message);
  }
  console.log('[KnowledgeBase] No KB files in DB, using local files');
}

// ─── Initialization ─────────────────────────────────────────────────

export function initKnowledgeBase(): void {
  reloadAllKB();
  watchKBDirectory();

  // Also reload when admin triggers a knowledgeBase reload event
  configStore.on('reload', (domain: string) => {
    if (domain === 'knowledgeBase' || domain === 'all') {
      reloadAllKB(); // This also invalidates the system prompt cache
      console.log('[KnowledgeBase] Reloaded all KB files (config event)');
    }
    // Routing and settings changes affect the cached base prompt
    // (routing rules, intent lists, and persona are baked into it)
    if (domain === 'routing' || domain === 'settings') {
      invalidateSystemPromptCache();
      console.log(`[KnowledgeBase] System prompt cache invalidated (${domain} config changed)`);
    }
  });
}

// ─── Legacy compat: get/set for the old monolithic KB ────────────────
// These are used by knowledge.ts / admin routes that still reference
// the old single-file KB. They now read/write from the cache.

export function getKnowledgeMarkdown(): string {
  // Return all cached KB content concatenated (for backward compat)
  return Array.from(kbCache.values()).join('\n\n---\n\n');
}

export function setKnowledgeMarkdown(content: string): void {
  // Legacy: not used in progressive mode, but keep for compat
  console.warn('[KnowledgeBase] setKnowledgeMarkdown called — this is a legacy no-op in progressive mode');
}

// ─── System Prompt Cache ─────────────────────────────────────────────
//
// The system prompt has two parts:
//   1. BASE PROMPT (semi-static) — persona, routing rules, core KB, memory, constraints.
//      Changes only when config reloads, KB files change, or a new day starts.
//   2. TOPIC CONTENT (per-message) — selected topic files based on guessTopicFiles().
//      Varies with every incoming message.
//
// We cache the base prompt and only recompute it when the cache is invalidated.
// The per-message topic content is appended fresh each time.

interface SystemPromptCache {
  /** The cached base prompt string (everything except topic content) */
  basePrompt: string;
  /** The basePersona value used to build this cache */
  persona: string;
  /** The date (YYYY-MM-DD) when this cache was built (memory changes daily) */
  dateBuilt: string;
  /** Version counter — incremented on any invalidating change */
  version: number;
}

/** Current cache version — incremented by invalidateSystemPromptCache() */
let systemPromptCacheVersion = 0;

/** The cached base prompt, or null if not yet built / invalidated */
let systemPromptCache: SystemPromptCache | null = null;

/**
 * Invalidate the system prompt cache.
 * Called when KB files, routing, settings, or other config changes.
 */
export function invalidateSystemPromptCache(): void {
  systemPromptCacheVersion++;
  systemPromptCache = null;
  console.log(`[KnowledgeBase] System prompt cache invalidated (v${systemPromptCacheVersion})`);
}

/**
 * Build (or return cached) base prompt — everything except per-message topic content.
 * The base prompt includes: persona, routing rules, core KB, memory, constraints template.
 */
function getOrBuildBasePrompt(basePersona: string): string {
  const today = getTodayDate();

  // Return cached version if still valid
  if (
    systemPromptCache &&
    systemPromptCache.version === systemPromptCacheVersion &&
    systemPromptCache.persona === basePersona &&
    systemPromptCache.dateBuilt === today
  ) {
    return systemPromptCache.basePrompt;
  }

  // --- Rebuild the base prompt ---

  // Build intent list + routing rules from config
  const routing = configStore.getRouting();
  const intents = Object.keys(routing);

  const staticIntents = intents.filter(i => routing[i]?.action === 'static_reply');
  const llmIntents = intents.filter(i => routing[i]?.action === 'llm_reply');
  const specialIntents = intents.filter(i => !['static_reply', 'llm_reply'].includes(routing[i]?.action));

  const routingLines = intents.map(i => `  - "${i}" → ${routing[i].action}`).join('\n');

  // Assemble KB content: core files always loaded
  const CORE_FILES = getCoreFiles();
  const missingCoreFiles = CORE_FILES.filter(f => !kbCache.get(f));
  if (missingCoreFiles.length > 0) {
    console.warn(`[KnowledgeBase] Missing core KB files: ${missingCoreFiles.join(', ')}`);
    notifyAdminConfigError(
      `Missing core knowledge base files: ${missingCoreFiles.join(', ')}\n\n` +
      `Location: RainbowAI/.rainbow-kb/\n` +
      `AI responses will be degraded without these files.`
    ).catch(() => {});
  }

  const coreContent = CORE_FILES
    .map(f => kbCache.get(f) || '')
    .filter(Boolean)
    .join('\n\n---\n\n');

  // Build operational memory section (durable + today + yesterday)
  // Inspired by OpenClaw's progressive disclosure: always load today + yesterday,
  // with explicit recency weighting so the bot pays more attention to recent events
  const memoryParts: string[] = [];
  const durableMemory = kbCache.get(DURABLE_MEMORY_FILE);
  if (durableMemory) {
    memoryParts.push(durableMemory);
  }
  const yesterday = getYesterdayDate();
  const todayLog = kbCache.get(`memory/${today}.md`);
  if (todayLog) {
    memoryParts.push(`--- TODAY (${today}) — HIGH PRIORITY ---\n${todayLog}`);
  }
  const yesterdayLog = kbCache.get(`memory/${yesterday}.md`);
  if (yesterdayLog) {
    memoryParts.push(`--- Yesterday (${yesterday}) ---\n${yesterdayLog}`);
  }

  const memoryContent = memoryParts.length > 0
    ? `\n\n<operational_memory>
MEMORY PRIORITY: Today's entries are MOST relevant. Give them highest attention when answering.
Yesterday's entries provide continuity. Durable memory contains permanent facts.
If a guest's issue was logged today, reference it naturally (e.g., "I see we had a report about X earlier").

${memoryParts.join('\n\n')}
</operational_memory>`
    : '';

  const basePrompt = `${basePersona}

INTENT CLASSIFICATION:
You must classify the guest's message into exactly ONE of these intents:
${intents.map(i => `"${i}"`).join(', ')}

ROUTING RULES (admin-controlled):
${routingLines}

RESPONSE INSTRUCTIONS:
- For intents routed to "static_reply" (${staticIntents.join(', ')}): STILL generate a helpful response. The system may use it as a fallback if the pre-written reply isn't appropriate for the guest's situation (e.g., when the guest reports a problem rather than asking for info).
- For intents routed to "llm_reply" (${llmIntents.join(', ')}): Generate a helpful response using the Knowledge Base below.
- For intents routed to "start_booking", "escalate", or "forward_payment" (${specialIntents.map(i => i).join(', ')}): Generate an appropriate response AND the system will trigger the corresponding workflow.

⚠️ CRITICAL KNOWLEDGE CONSTRAINTS - READ THIS FIRST ⚠️

YOU ARE STRICTLY LIMITED TO THE KNOWLEDGE BASE BELOW. THIS IS ABSOLUTE.

MANDATORY RULES:
1. **ONLY use information explicitly stated in the Knowledge Base**
2. **If the answer is NOT in the Knowledge Base, you MUST say: "I don't have that information. Let me connect you with our team."**
3. **DO NOT provide tangentially related information when the specific answer isn't available**
4. **DO NOT guess, infer, or use external knowledge**
5. **DO NOT use common sense to fill gaps in the Knowledge Base**
6. **When in doubt, ALWAYS say "I don't know" rather than risk providing incorrect information**

Examples of CORRECT behavior:
- Question: "Do you have a swimming pool?" → If not in KB: "I don't have that information. Let me connect you with our team."
- Question: "Do you serve breakfast?" → If not in KB: "I don't have that information. Let me connect you with our team."
- Question: "Do you have group discounts?" → If not in KB: "I don't have that information. Let me connect you with our team."

Examples of INCORRECT behavior (NEVER do this):
- ❌ Providing facility list when asked about specific facility not listed
- ❌ Providing general prices when asked about specific discount not in KB
- ❌ Providing location when asked about specific transport not in KB
- ❌ Answering "yes" or "no" based on assumptions

GENERAL RULES:
- Respond in the same language the guest uses (English, Malay, Chinese, or any other language)
- Be warm, concise, and helpful (under 500 chars unless details are needed)
- Sign off as "— Rainbow 🌈" (only for llm_reply intents)
- NEVER invent prices, availability, or policies
- Do not provide info about other hotels or hostels
- Use operational memory for context about current operations, known issues, and staff notes
- CONVERSATION MEMORY: Always use the conversation history to recall guest details (name, booking dates, capsule number, previous requests). If the guest told you their name earlier, remember and use it. The KB constraint applies to hostel facts and policies, NOT to information the guest has shared in this conversation.

CONFIDENCE SCORING:
- Include a confidence score (0.0-1.0) for your response
- Set confidence < 0.5 if: answer is partial, information is incomplete, or you're not sure
- Set confidence < 0.7 if: answer requires interpretation or combines multiple KB sections
- Set confidence >= 0.7 if: answer is directly stated in KB and complete
- Set confidence >= 0.9 if: answer is exact quote from KB with no ambiguity

Return JSON: { "intent": "<one of the defined intents>", "action": "<routing action>", "response": "<your response or empty for static_reply>", "confidence": 0.0-1.0 }

<knowledge_base>
${coreContent}${memoryContent}`;

  // Store in cache
  systemPromptCache = {
    basePrompt,
    persona: basePersona,
    dateBuilt: today,
    version: systemPromptCacheVersion,
  };

  console.log(`[KnowledgeBase] System prompt base cached (v${systemPromptCacheVersion}, ${basePrompt.length} chars)`);

  return basePrompt;
}

// ─── System Prompt Builder ──────────────────────────────────────────

export function buildSystemPrompt(basePersona: string, topicFiles: string[] = []): string {
  // Get the cached base prompt (persona + routing + core KB + memory + constraints)
  const basePrompt = getOrBuildBasePrompt(basePersona);

  // Per-message: append only the topic-specific content
  const missingTopicFiles = topicFiles.filter(f => !kbCache.get(f));
  if (missingTopicFiles.length > 0) {
    console.warn(`[KnowledgeBase] Missing topic files: ${missingTopicFiles.join(', ')} — responses may lack detail`);
  }

  const topicContent = topicFiles
    .map(f => kbCache.get(f) || '')
    .filter(Boolean)
    .join('\n\n---\n\n');

  // Assemble final prompt: cached base + per-message topics + closing tag
  return `${basePrompt}${topicContent ? `\n\n---\n\n${topicContent}` : ''}
</knowledge_base>`;
}
