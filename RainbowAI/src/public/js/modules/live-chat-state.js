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

// US-007: Color palette for initials avatars (no red/green — avoid status confusion)
var AVATAR_COLORS = ['#1abc9c','#3498db','#9b59b6','#e67e22','#e91e63','#00bcd4','#ff5722','#607d8b'];

function avatarColorFromPhone(phone) {
  var sum = 0;
  for (var i = 0; i < phone.length; i++) sum += phone.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  var parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

/**
 * Generate avatar HTML: <img> with onerror fallback to colored initials circle.
 * @param {string} phone - Phone number (may include @s.whatsapp.net)
 * @param {string} fallbackInitials - Display name or text for initials
 */
export function avatarImg(phone, fallbackInitials) {
  var clean = (phone || '').replace(/@s\.whatsapp\.net$/i, '').replace(/[^0-9]/g, '');
  var src = '/api/rainbow/whatsapp/avatar/' + encodeURIComponent(clean);
  var bgColor = avatarColorFromPhone(clean);
  var initials = getInitials(fallbackInitials);
  // onerror: retry once after 3s (avatar may be fetching in background), then show colored initials
  return '<img src="' + src +
    '" onerror="var i=this;if(!i.dataset.retried){i.dataset.retried=1;setTimeout(function(){i.src=\'' + src + '?\'+Date.now()},3000)}else{i.style.display=\'none\';i.nextElementSibling.style.display=\'\'}" loading="lazy">' +
    '<span class="avatar-initials" style="display:none;background:' + bgColor + '">' + escapeHtml(initials) + '</span>';
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
  conversationCache: new Map(),
  /** @type {Object<string, string[]>} phone→tags[] map for tag filtering (US-009) */
  contactTagsMap: {},
  /** @type {string[]} Currently selected tags for filtering (US-009) */
  tagFilter: [],
  /** @type {Object<string, string>} phone→unit map for unit prefix display (US-012) */
  contactUnitsMap: {},
  /** @type {string} Currently selected unit for filtering (US-013) */
  unitFilter: '',
  /** @type {Object<string, {checkIn: string, checkOut: string}>} phone→dates map for date suffix display (US-014) */
  contactDatesMap: {},
  /** @type {string} Current staff display name for manual message attribution (US-011) */
  staffName: 'Staff',
  /** @type {Object<string, Object<string, string>>} phone→{ field_key: value } map for custom field filtering (Homestay) */
  contactCustomFieldsMap: {},
  /** @type {Object<string, string>} Unified custom field filters: { fieldKey: value } */
  customFieldFilters: {},
  /** @type {boolean} Note mode — input sends internal comment instead of WhatsApp message */
  noteMode: false,
  /** @type {Array} Loaded comments for current conversation */
  comments: [],
  /** @type {string[]} Active quick filters: ['today_stay', 'today_checkin', ...] */
  quickFilters: [],
  /** @type {boolean} Filter panel open/closed */
  filterPanelOpen: false
};
