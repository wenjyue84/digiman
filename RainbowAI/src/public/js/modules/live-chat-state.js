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
  return '<img src="/api/rainbow/whatsapp/avatar/' + encodeURIComponent(clean) +
    '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'\'" loading="lazy">' +
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
  messageMetadata: { pinned: [], starred: [] }
};
