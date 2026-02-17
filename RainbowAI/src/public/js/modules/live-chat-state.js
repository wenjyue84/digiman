// ═══════════════════════════════════════════════════════════════════
// Live Chat State - Shared mutable state for all live-chat sub-modules
// ═══════════════════════════════════════════════════════════════════
//
// All sub-modules import $ and mutate the same object.
// ES6 module imports are live bindings — changes visible everywhere.
//
// Globals from utils-global.js (loaded before modules):
//   api, escapeHtml, escapeAttr, formatRelativeTime
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate avatar HTML: <img> with onerror fallback to initials <span>.
 * @param {string} phone - Phone number (may include @s.whatsapp.net)
 * @param {string} fallbackInitials - Text to show if image fails
 */
export function avatarImg(phone, fallbackInitials) {
  var clean = (phone || '').replace(/@s\.whatsapp\.net$/i, '').replace(/[^0-9]/g, '');
  var src = '/api/rainbow/whatsapp/avatar/' + encodeURIComponent(clean);
  // onerror: retry once after 3s (avatar may be fetching in background), then show initials
  return '<img src="' + src +
    '" onerror="var i=this;if(!i.dataset.retried){i.dataset.retried=1;setTimeout(function(){i.src=\'' + src + '?\'+Date.now()},3000)}else{i.style.display=\'none\';i.nextElementSibling.style.display=\'\'}" loading="lazy">' +
    '<span style="display:none">' + escapeHtml(fallbackInitials) + '</span>';
}

export var $ = {
  conversations: [],
  activePhone: null,
  autoRefresh: null,
  instances: {},
  pendingTranslation: null,
  translateMode: false,
  translateLang: 'ms',
  translatePreview: null,
  translateDebounce: null,
  selectedFile: null,
  searchOpen: false,
  searchQuery: '',
  searchMatches: [],
  searchCurrent: -1,
  lastMessages: [],
  searchDebounce: null,
  activeFilter: 'all',
  contactPanelOpen: false,
  contactDetails: {},
  contactSaveTimer: null,
  contextMenuMsgIdx: null,
  contextMenuCloseHandler: null,
  replyingToMsgIdx: null,
  replyingToContent: '',
  currentMode: 'autopilot',
  pendingApprovals: [],
  currentApprovalId: null,
  aiHelpLoading: false,
  waStatusPoll: null,
  waWasConnected: null,
  chatDropdownPhone: null,
  dateFilterFrom: null,
  dateFilterTo: null,
  sidebarSearchDebounce: null,
  messageMetadata: { pinned: [], starred: [] },
  /** @type {Map<string, {log: object, cachedAt: number}>} conversation cache for instant switching (US-006) */
  conversationCache: new Map()
};
