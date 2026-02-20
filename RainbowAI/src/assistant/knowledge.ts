import type { IntentCategory, KnowledgeEntry, CallAPIFn } from './types.js';
import { configStore } from './config-store.js';

type Language = 'en' | 'ms' | 'zh';

// ─── In-memory caches (synced from config-store) ────────────────────
let faq: KnowledgeEntry[] = [];
const dynamicKnowledge = new Map<string, string>();

function loadFromConfig(): void {
  const data = configStore.getKnowledge();
  faq = data.static.map(e => ({
    intent: e.intent as IntentCategory,
    response: e.response
  }));
  dynamicKnowledge.clear();
  for (const [k, v] of Object.entries(data.dynamic)) {
    dynamicKnowledge.set(k, v);
  }
}

// ─── Dynamic Knowledge Store (staff-editable via WhatsApp) ──────────

export function setDynamicKnowledge(topic: string, content: string): void {
  const key = topic.toLowerCase();
  dynamicKnowledge.set(key, content);
  // Persist to config-store
  const data = configStore.getKnowledge();
  data.dynamic[key] = content;
  configStore.setKnowledge(data);
  console.log(`[Knowledge] Dynamic entry updated: ${topic}`);
}

export function getDynamicKnowledge(topic: string): string | undefined {
  return dynamicKnowledge.get(topic.toLowerCase());
}

export function deleteDynamicKnowledge(topic: string): boolean {
  const key = topic.toLowerCase();
  if (dynamicKnowledge.has(key)) {
    dynamicKnowledge.delete(key);
    // Persist to config-store
    const data = configStore.getKnowledge();
    delete data.dynamic[key];
    configStore.setKnowledge(data);
    console.log(`[Knowledge] Dynamic entry deleted: ${topic}`);
    return true;
  }
  return false;
}

export function listDynamicKnowledge(): string[] {
  return Array.from(dynamicKnowledge.keys());
}

export function initKnowledge(_callAPI: CallAPIFn): void {
  // Load from config-store
  loadFromConfig();
  // Subscribe to reload events
  configStore.on('reload', (domain: string) => {
    if (domain === 'knowledge' || domain === 'all') {
      loadFromConfig();
      console.log('[Knowledge] Reloaded from config-store');
    }
  });
}

export function destroyKnowledge(): void {
  // no-op — kept for API compatibility
}

export function getAnswer(intent: IntentCategory, lang: Language): string | null {
  const entry = faq.find(e => e.intent === intent);
  if (!entry) return null;
  return entry.response[lang] || entry.response.en;
}

/**
 * Get a static reply for an intent in a given language.
 * Checks knowledge.json static entries first, then falls back to templates.json.
 */
export function getStaticReply(intent: string, lang: Language): string | null {
  // 1. Check knowledge.json static entries
  const entry = faq.find(e => e.intent === intent);
  if (entry) {
    return entry.response[lang] || entry.response.en || null;
  }

  // 2. Fallback to templates.json
  const templates = configStore.getTemplates();
  const template = templates[intent];
  if (template) {
    return template[lang] || template.en || null;
  }

  return null;
}

/**
 * Get the imageUrl for a static reply intent (if any).
 */
export function getStaticReplyImageUrl(intent: string): string | null {
  const entry = faq.find(e => e.intent === intent);
  return (entry as any)?.imageUrl || null;
}


