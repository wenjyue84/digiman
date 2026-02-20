// ═══════════════════════════════════════════════════════════════════
// Real Chat State - Shared mutable state for all real-chat sub-modules
// ═══════════════════════════════════════════════════════════════════

import { createTranslationHelper } from '../helpers/translation-helper.js';

export const $ = {
  conversations: [],
  activePhone: null,
  autoRefresh: null,
  instances: {},
  pendingTranslation: null,
  lastLog: null,
  waStatusPoll: null,
  waWasConnected: null,
  selectedFile: null,
  lastRefreshAt: Date.now(),
  searchOpen: false,
  addExampleText: '',
  /** @type {EventSource|null} SSE connection for real-time conversation updates (US-159) */
  eventSource: null,
  /** @type {boolean} Whether SSE is connected (false = using polling fallback) */
  sseConnected: false,
  /** @type {string} Active filter chip for conversation list (US-015) */
  activeFilter: 'all',
  /** @type {Object<string, string[]>} phone→tags[] map for tag filtering (US-015, mirrors US-004) */
  contactTagsMap: {},
  /** @type {string[]} Currently selected tags for filtering (US-015) */
  tagFilter: [],
  /** @type {Object<string, string>} phone→unit map for unit filtering (US-015) */
  contactUnitsMap: {},
  /** @type {string} Currently selected unit for filtering (US-015) */
  unitFilter: '',
  /** @type {boolean} Schedule popover open state (US-015, mirrors US-008) */
  scheduleOpen: false
};

// Translation helper (shared module with live-chat)
export const translationHelper = createTranslationHelper({
  prefix: 'rc-',
  api: typeof api !== 'undefined' ? api : window.api,
  toast: typeof toast !== 'undefined' ? toast : window.toast,
  onSend: null  // Set by core module after init
});
