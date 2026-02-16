import { readFileSync, readdirSync, existsSync, watch, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { configStore } from './config-store.js';
import { notifyAdminConfigError } from '../lib/admin-notifier.js';

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
 */
export function guessTopicFiles(text: string): string[] {
  const topicFileMap = getTopicFileMap();
  const files = new Set<string>();
  for (const [pattern, fileList] of Object.entries(topicFileMap)) {
    if (new RegExp(pattern, 'i').test(text)) {
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
    const filePath = join(RAINBOW_KB_DIR, filename);
    if (existsSync(filePath)) {
      kbCache.set(filename.replace(/\\/g, '/'), readFileSync(filePath, 'utf-8'));
      console.log(`[KnowledgeBase] Reloaded ${filename}`);
    }
    return;
  }
  const filePath = join(RAINBOW_KB_DIR, filename);
  if (existsSync(filePath)) {
    kbCache.set(filename, readFileSync(filePath, 'utf-8'));
    console.log(`[KnowledgeBase] Reloaded ${filename}`);
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

// ─── Initialization ─────────────────────────────────────────────────

export function initKnowledgeBase(): void {
  reloadAllKB();
  watchKBDirectory();

  // Also reload when admin triggers a knowledgeBase reload event
  configStore.on('reload', (domain: string) => {
    if (domain === 'knowledgeBase' || domain === 'all') {
      reloadAllKB();
      console.log('[KnowledgeBase] Reloaded all KB files (config event)');
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

// ─── System Prompt Builder ──────────────────────────────────────────

export function buildSystemPrompt(basePersona: string, topicFiles: string[] = []): string {
  // Build intent list + routing rules from config
  const routing = configStore.getRouting();
  const intents = Object.keys(routing);

  const staticIntents = intents.filter(i => routing[i]?.action === 'static_reply');
  const llmIntents = intents.filter(i => routing[i]?.action === 'llm_reply');
  const specialIntents = intents.filter(i => !['static_reply', 'llm_reply'].includes(routing[i]?.action));

  const routingLines = intents.map(i => `  - "${i}" → ${routing[i].action}`).join('\n');

  // Assemble KB content: core files always, topic files per message
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
  const today = getTodayDate();
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

  const missingTopicFiles = topicFiles.filter(f => !kbCache.get(f));
  if (missingTopicFiles.length > 0) {
    console.warn(`[KnowledgeBase] Missing topic files: ${missingTopicFiles.join(', ')} — responses may lack detail`);
  }

  const topicContent = topicFiles
    .map(f => kbCache.get(f) || '')
    .filter(Boolean)
    .join('\n\n---\n\n');

  return `${basePersona}

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

CONFIDENCE SCORING:
- Include a confidence score (0.0-1.0) for your response
- Set confidence < 0.5 if: answer is partial, information is incomplete, or you're not sure
- Set confidence < 0.7 if: answer requires interpretation or combines multiple KB sections
- Set confidence >= 0.7 if: answer is directly stated in KB and complete
- Set confidence >= 0.9 if: answer is exact quote from KB with no ambiguity

Return JSON: { "intent": "<one of the defined intents>", "action": "<routing action>", "response": "<your response or empty for static_reply>", "confidence": 0.0-1.0 }

<knowledge_base>
${coreContent}${memoryContent}${topicContent ? `\n\n---\n\n${topicContent}` : ''}
</knowledge_base>`;
}
