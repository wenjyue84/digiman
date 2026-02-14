import type { ConversationState, ChatMessage } from './types.js';
import { detectLanguage } from './formatter.js';
import { StateManager } from './state-manager.js';
import {
  initStatePersistence, loadActiveStates,
  schedulePersist, deletePersistedState
} from './state-persistence.js';

const TTL_MS = 3_600_000; // 1 hour
const MAX_MESSAGES = 20;
const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes

// Use generic StateManager to handle TTL, cleanup, and lastActiveAt tracking
// StateManager adds 'lastActiveAt' automatically, so we omit it from the type
const conversationManager = new StateManager<Omit<ConversationState, 'lastActiveAt'>>(
  TTL_MS,
  CLEANUP_INTERVAL_MS,
  {
    onExpire: (key) => {
      deletePersistedState(key).catch(() => { });
    }
  }
);

/**
 * Initialize conversations — loads active states from DB on startup.
 */
export async function initConversations(): Promise<void> {
  await initStatePersistence();

  const savedStates = await loadActiveStates(TTL_MS);
  for (const { phone, state } of savedStates) {
    // Add empty messages array since messages are stored separately in conversation log
    conversationManager.set(phone, { ...state, messages: [] });
  }

  if (savedStates.length > 0) {
    console.log(`[Conversations] Restored ${savedStates.length} conversation(s) from database`);
  }
}

export function destroyConversations(): void {
  conversationManager.destroy();
}

export function getOrCreate(phone: string, pushName: string): ConversationState {
  const now = Date.now();

  // StateManager.getOrCreate() handles TTL checking and lastActiveAt updates
  return conversationManager.getOrCreate(phone, () => ({
    phone,
    pushName,
    messages: [],
    language: 'en' as const,
    bookingState: null,
    workflowState: null,
    unknownCount: 0,
    createdAt: now,
    // lastActiveAt is added automatically by StateManager
    lastIntent: null,
    lastIntentConfidence: null,
    lastIntentTimestamp: null,
    slots: {},
    repeatCount: 0
  }));
}

export function addMessage(phone: string, role: 'user' | 'assistant', content: string): void {
  // StateManager.update() automatically updates lastActiveAt
  conversationManager.update(phone, (convo) => {
    convo.messages.push({
      role,
      content,
      timestamp: Math.floor(Date.now() / 1000)
    });

    // Trim to max messages
    if (convo.messages.length > MAX_MESSAGES) {
      convo.messages = convo.messages.slice(-MAX_MESSAGES);
    }

    // Update language detection from user messages
    if (role === 'user') {
      convo.language = detectLanguage(content);
    }
  });

  // Debounced persist (messages not stored in DB, but metadata updates)
  const state = conversationManager.get(phone);
  if (state) schedulePersist(phone, state as ConversationState);
}

export function getMessages(phone: string): ChatMessage[] {
  return conversationManager.get(phone)?.messages || [];
}

export function updateBookingState(phone: string, bookingState: ConversationState['bookingState']): void {
  conversationManager.update(phone, (convo) => {
    convo.bookingState = bookingState;
  });

  // Critical state — persist immediately
  const state = conversationManager.get(phone);
  if (state) schedulePersist(phone, state as ConversationState, true);
}

export function updateWorkflowState(phone: string, workflowState: ConversationState['workflowState']): void {
  conversationManager.update(phone, (convo) => {
    convo.workflowState = workflowState;
  });

  // Critical state — persist immediately
  const state = conversationManager.get(phone);
  if (state) schedulePersist(phone, state as ConversationState, true);
}

export function incrementUnknown(phone: string): number {
  let count = 0;
  conversationManager.update(phone, (convo) => {
    convo.unknownCount++;
    count = convo.unknownCount;
  });
  return count;
}

export function resetUnknown(phone: string): void {
  conversationManager.update(phone, (convo) => {
    convo.unknownCount = 0;
  });
}

export function clearConversation(phone: string): void {
  conversationManager.delete(phone);
  deletePersistedState(phone).catch(() => { });
}

// ─── Context-Aware Intent Tracking ──────────────────────────────────

export function updateLastIntent(
  phone: string,
  intent: string,
  confidence: number
): void {
  conversationManager.update(phone, (convo) => {
    convo.lastIntent = intent;
    convo.lastIntentConfidence = confidence;
    convo.lastIntentTimestamp = Date.now();
  });

  // Debounced persist
  const state = conversationManager.get(phone);
  if (state) schedulePersist(phone, state as ConversationState);
}

export function checkRepeatIntent(
  phone: string,
  intent: string,
  windowMs: number = 120_000
): { isRepeat: boolean; count: number } {
  const convo = conversationManager.get(phone);
  if (!convo || !convo.lastIntent || !convo.lastIntentTimestamp) {
    return { isRepeat: false, count: 0 };
  }

  const elapsed = Date.now() - convo.lastIntentTimestamp;
  if (convo.lastIntent === intent && elapsed < windowMs) {
    convo.repeatCount++;
    return { isRepeat: true, count: convo.repeatCount };
  }

  // Different intent or expired window → reset
  convo.repeatCount = 0;
  return { isRepeat: false, count: 0 };
}

export function getLastIntent(phone: string): string | null {
  return conversationManager.get(phone)?.lastIntent || null;
}

export function updateSlots(
  phone: string,
  newSlots: Record<string, any>
): void {
  conversationManager.update(phone, (convo) => {
    // Merge new slots with existing ones
    convo.slots = { ...convo.slots, ...newSlots };
  });

  // Debounced persist
  const state = conversationManager.get(phone);
  if (state) schedulePersist(phone, state as ConversationState);
}

export function getSlots(phone: string): Record<string, any> {
  return conversationManager.get(phone)?.slots || {};
}

export function clearSlots(phone: string): void {
  conversationManager.update(phone, (convo) => {
    convo.slots = {};
  });
}

// ─── Cleanup ────────────────────────────────────────────────────────
// Cleanup is now handled automatically by StateManager
// On expire, onExpire callback deletes from DB

// For testing
export function _getConversationsSize(): number {
  return conversationManager.size();
}
