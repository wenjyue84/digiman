// ═══════════════════════════════════════════════════════════════════
// Live Chat Panels - Filters, pin/fav, sidebar, contact, modes, toast
// ═══════════════════════════════════════════════════════════════════

import { $, avatarImg } from './live-chat-state.js';
import { renderList, refreshChat, formatPhoneForDisplay } from './live-chat-core.js';
import { updateHeaderMenuActive, toggleSearch, updateModeSubmenuUI } from './live-chat-features.js';

var api = window.api;

// ─── Filter Chips ────────────────────────────────────────────────

export function setFilter(filter) {
  $.activeFilter = filter;
  var chips = document.querySelectorAll('#lc-filter-chips .lc-chip');
  chips.forEach(function (chip) {
    if (chip.getAttribute('data-filter') === filter) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
  renderList($.conversations);
}

// ─── Pin & Favourite ─────────────────────────────────────────────

export async function togglePinChat(phone) {
  try {
    var result = await api('/conversations/' + encodeURIComponent(phone) + '/pin', { method: 'PATCH' });
    for (var i = 0; i < $.conversations.length; i++) {
      if ($.conversations[i].phone === phone) {
        $.conversations[i].pinned = result.pinned;
        break;
      }
    }
    renderList($.conversations);
    if (window.toast) window.toast(result.pinned ? 'Chat pinned' : 'Chat unpinned', 'success');
  } catch (e) {
    console.error('[LiveChat] Pin toggle failed:', e);
    if (window.toast) window.toast('Pin failed', 'error');
  }
}

export async function toggleFavouriteChat(phone) {
  try {
    var result = await api('/conversations/' + encodeURIComponent(phone) + '/favourite', { method: 'PATCH' });
    for (var i = 0; i < $.conversations.length; i++) {
      if ($.conversations[i].phone === phone) {
        $.conversations[i].favourite = result.favourite;
        break;
      }
    }
    renderList($.conversations);
    if (window.toast) window.toast(result.favourite ? 'Chat starred' : 'Chat unstarred', 'success');
  } catch (e) {
    console.error('[LiveChat] Favourite toggle failed:', e);
    if (window.toast) window.toast('Star failed', 'error');
  }
}

// ─── Sidebar 3-dot Menu ─────────────────────────────────────────

export function toggleSidebarMenu() {
  var menu = document.getElementById('lc-sidebar-dropdown');
  if (!menu) return;
  var isOpen = menu.style.display !== 'none';
  menu.style.display = isOpen ? 'none' : '';
  updateDateFilterBadge();
  if (!isOpen) {
    setTimeout(function () {
      document.addEventListener('click', closeSidebarMenuOnClick, { once: true });
    }, 0);
  }
}

export function closeSidebarMenuOnClick() {
  var menu = document.getElementById('lc-sidebar-dropdown');
  if (menu) menu.style.display = 'none';
}

export function toggleDateFilterPanel() {
  var panel = document.getElementById('lc-date-filter-panel');
  if (!panel) return;
  var menu = document.getElementById('lc-sidebar-dropdown');
  if (menu) menu.style.display = 'none';
  var isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : '';
}

export function updateDateFilterBadge() {
  var badge = document.getElementById('lc-date-filter-badge');
  if (!badge) return;
  var fromInput = document.getElementById('lc-date-from');
  var toInput = document.getElementById('lc-date-to');
  if ((fromInput && fromInput.value) || (toInput && toInput.value)) {
    badge.textContent = 'ON';
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

export function showStarredMessages() {
  var menu = document.getElementById('lc-sidebar-dropdown');
  if (menu) menu.style.display = 'none';
  setFilter('favourites');
}

export async function markAllAsRead() {
  var menu = document.getElementById('lc-sidebar-dropdown');
  if (menu) menu.style.display = 'none';
  var unreadConvos = $.conversations.filter(function (c) { return (c.unreadCount || 0) > 0; });
  for (var i = 0; i < unreadConvos.length; i++) {
    try {
      await api('/conversations/' + encodeURIComponent(unreadConvos[i].phone) + '/read', { method: 'PATCH' });
      unreadConvos[i].unreadCount = 0;
    } catch (e) { }
  }
  renderList($.conversations);
  if (window.toast) window.toast('All conversations marked as read', 'success');
}

// ─── Per-chat chevron dropdown ───────────────────────────────────

export function toggleChatDropdown(phone, btnEl) {
  var existing = document.getElementById('lc-chat-dropdown');
  if (existing) {
    existing.remove();
    if ($.chatDropdownPhone === phone) { $.chatDropdownPhone = null; return; }
  }
  $.chatDropdownPhone = phone;

  var conv = $.conversations.find(function (c) { return c.phone === phone; });
  var isPinned = conv && conv.pinned;
  var isFav = conv && conv.favourite;

  var dropdown = document.createElement('div');
  dropdown.id = 'lc-chat-dropdown';
  dropdown.className = 'lc-chat-dropdown';
  dropdown.innerHTML =
    '<button type="button" onclick="event.stopPropagation();lcTogglePin(\'' + escapeAttr(phone) + '\');lcCloseChatDropdown()">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4v6l-2 4h10l-2-4V4"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="8" y1="4" x2="16" y2="4"/></svg>' +
    '<span>' + (isPinned ? 'Unpin chat' : 'Pin chat') + '</span>' +
    '</button>' +
    '<button type="button" onclick="event.stopPropagation();lcToggleFavourite(\'' + escapeAttr(phone) + '\');lcCloseChatDropdown()">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
    '<span>' + (isFav ? 'Unstar chat' : 'Star chat') + '</span>' +
    '</button>' +
    '<button type="button" onclick="event.stopPropagation();lcMarkOneAsRead(\'' + escapeAttr(phone) + '\');lcCloseChatDropdown()">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
    '<span>Mark as read</span>' +
    '</button>';

  var rect = btnEl.getBoundingClientRect();
  dropdown.style.position = 'fixed';
  dropdown.style.left = (rect.right - 160) + 'px';
  dropdown.style.top = (rect.bottom + 2) + 'px';
  dropdown.style.zIndex = '1000';

  document.body.appendChild(dropdown);
  setTimeout(function () {
    document.addEventListener('click', function handler() {
      closeChatDropdown();
      document.removeEventListener('click', handler);
    }, { once: true });
  }, 0);
}

export function closeChatDropdown() {
  $.chatDropdownPhone = null;
  var el = document.getElementById('lc-chat-dropdown');
  if (el) el.remove();
}

export async function markOneAsRead(phone) {
  try {
    await api('/conversations/' + encodeURIComponent(phone) + '/read', { method: 'PATCH' });
    for (var i = 0; i < $.conversations.length; i++) {
      if ($.conversations[i].phone === phone) {
        $.conversations[i].unreadCount = 0;
        break;
      }
    }
    renderList($.conversations);
    if (window.toast) window.toast('Marked as read', 'success');
  } catch (e) { }
}

// ─── Focus Mode (Maximize) ──────────────────────────────────────

export function toggleMaximize() {
  var isMax = document.body.classList.toggle('lc-maximized');
  var maxIcon = document.getElementById('lc-maximize-icon');
  var minIcon = document.getElementById('lc-minimize-icon');
  var btn = document.getElementById('lc-maximize-btn');
  if (maxIcon) maxIcon.style.display = isMax ? 'none' : '';
  if (minIcon) minIcon.style.display = isMax ? '' : 'none';
  if (btn) {
    btn.title = isMax ? 'Exit focus mode' : 'Focus mode (maximize)';
    if (isMax) btn.classList.add('active'); else btn.classList.remove('active');
  }
}

// ─── Contact Details Panel ───────────────────────────────────────

export function toggleContactPanel() {
  $.contactPanelOpen = !$.contactPanelOpen;
  var panel = document.getElementById('lc-contact-panel');
  if (!panel) return;

  if ($.contactPanelOpen) {
    panel.style.display = 'flex';
    loadContactDetails();
  } else {
    panel.style.display = 'none';
  }
  updateHeaderMenuActive();
}

export async function loadContactDetails() {
  if (!$.activePhone) return;
  try {
    $.contactDetails = await api('/conversations/' + encodeURIComponent($.activePhone) + '/contact');
  } catch (e) {
    $.contactDetails = {};
  }

  // US-088: Auto-detect country from phone prefix if not set
  if (!$.contactDetails.country && $.activePhone) {
    var detected = detectCountryFromPhone($.activePhone);
    if (detected) {
      $.contactDetails.country = detected;
      // Save auto-detected country
      api('/conversations/' + encodeURIComponent($.activePhone) + '/contact', {
        method: 'PATCH',
        body: { country: detected }
      }).catch(function () { });
    }
  }

  // US-088: Auto-detect language from messages (after 3 user messages)
  if (!$.contactDetails.languageLocked && !$.contactDetails.language) {
    try {
      var log = await api('/conversations/' + encodeURIComponent($.activePhone));
      if (log && log.messages) {
        var userMsgs = log.messages.filter(function (m) { return m.role === 'user'; });
        if (userMsgs.length >= 3) {
          var detectedLang = detectLanguageFromMessages(userMsgs);
          if (detectedLang) {
            $.contactDetails.language = detectedLang;
            $.contactDetails.languageLocked = true;
            api('/conversations/' + encodeURIComponent($.activePhone) + '/contact', {
              method: 'PATCH',
              body: { language: detectedLang, languageLocked: true }
            }).catch(function () { });
          }
        }
      }
    } catch (e) { /* ignore */ }
  }

  renderContactFields();
  loadGlobalTags(); // US-008: Fetch global tags for autocomplete
  loadCapsuleUnits(); // US-010: Fetch capsule units for dropdown
  loadPaymentReminder(); // US-022: Load payment reminder for this contact
}

// US-088: Country detection from phone prefix
function detectCountryFromPhone(phone) {
  var clean = formatPhoneForDisplay(phone).replace(/[^0-9+]/g, '');
  if (!clean.startsWith('+') && !clean.match(/^[0-9]/)) return null;
  // Remove leading + if present
  var digits = clean.replace(/^\+/, '');

  var prefixMap = [
    { prefix: '60', country: 'MY' },
    { prefix: '65', country: 'SG' },
    { prefix: '86', country: 'CN' },
    { prefix: '62', country: 'ID' },
    { prefix: '91', country: 'IN' },
    { prefix: '1', country: 'US' },
    { prefix: '44', country: 'GB' },
    { prefix: '61', country: 'AU' },
    { prefix: '81', country: 'JP' },
    { prefix: '82', country: 'KR' },
    { prefix: '66', country: 'TH' },
    { prefix: '84', country: 'VN' },
    { prefix: '63', country: 'PH' },
    { prefix: '886', country: 'TW' },
    { prefix: '852', country: 'HK' }
  ];

  // Sort by prefix length descending (match longer prefixes first)
  prefixMap.sort(function (a, b) { return b.prefix.length - a.prefix.length; });

  for (var i = 0; i < prefixMap.length; i++) {
    if (digits.startsWith(prefixMap[i].prefix)) {
      return prefixMap[i].country;
    }
  }
  return null;
}

// US-088: Language detection from message content
function detectLanguageFromMessages(userMessages) {
  // Simple heuristic: check last 5 messages for language patterns
  var recent = userMessages.slice(-5);
  var text = recent.map(function (m) { return m.content || ''; }).join(' ').toLowerCase();

  // Check for common language indicators
  var langScores = { en: 0, ms: 0, zh: 0, id: 0 };

  // English indicators
  if (/\b(the|is|are|what|how|can|please|thank|hello|hi|do|have|where|when)\b/.test(text)) langScores.en += 3;
  // Malay indicators
  if (/\b(apa|boleh|saya|mau|ada|tidak|terima|kasih|selamat|bagaimana|berapa|nak|macam mana)\b/.test(text)) langScores.ms += 3;
  // Chinese indicators (CJK characters)
  if (/[\u4e00-\u9fff]/.test(text)) langScores.zh += 5;
  // Indonesian indicators
  if (/\b(saya|terima|kasih|bagaimana|bisa|tidak|mau|apakah|tolong)\b/.test(text)) langScores.id += 2;

  var best = 'en';
  var bestScore = 0;
  for (var lang in langScores) {
    if (langScores[lang] > bestScore) {
      bestScore = langScores[lang];
      best = lang;
    }
  }
  return bestScore > 0 ? best : null;
}

// US-088: Toggle language lock
export function toggleLanguageLock() {
  if (!$.contactDetails) return;
  $.contactDetails.languageLocked = !$.contactDetails.languageLocked;
  updateLanguageLockUI();
  var data = collectContactFields();
  data.languageLocked = $.contactDetails.languageLocked;
  saveContactDetailsData(data);
}

function updateLanguageLockUI() {
  var lockBtn = document.getElementById('lc-cd-language-lock');
  var langSelect = document.getElementById('lc-cd-language');
  if (!lockBtn) return;
  var isLocked = $.contactDetails && $.contactDetails.languageLocked;
  lockBtn.innerHTML = isLocked
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>';
  lockBtn.title = isLocked ? 'Language locked (click to unlock)' : 'Language unlocked (click to lock)';
  if (langSelect) langSelect.disabled = isLocked;
}

async function saveContactDetailsData(data) {
  if (!$.activePhone) return;
  try {
    $.contactDetails = await api('/conversations/' + encodeURIComponent($.activePhone) + '/contact', {
      method: 'PATCH',
      body: data
    });
    showSaveIndicator('saved');
  } catch (e) {
    showSaveIndicator('error');
  }
}

function renderContactFields() {
  var d = $.contactDetails || {};
  var avatarEl = document.getElementById('lc-contact-avatar');
  var phoneEl = document.getElementById('lc-contact-phone-display');

  var headerName = document.getElementById('lc-header-name');
  var pushName = headerName ? headerName.textContent : '';
  var displayName = d.name || pushName || '?';
  if (avatarEl) avatarEl.innerHTML = avatarImg($.activePhone || '', displayName.slice(0, 2).toUpperCase());
  if (phoneEl) phoneEl.textContent = '+' + formatPhoneForDisplay($.activePhone || '');

  var nameEl = document.getElementById('lc-cd-name');
  if (nameEl) nameEl.value = d.name || pushName || '';

  var fields = {
    'lc-cd-email': d.email || '',
    'lc-cd-country': d.country || '',
    'lc-cd-language': d.language || '',
    'lc-cd-checkin': d.checkIn || '',
    'lc-cd-checkout': d.checkOut || '',
    'lc-cd-unit': d.unit || '',
    'lc-cd-contact-status': d.contactStatus || '',
    'lc-cd-payment-status': d.paymentStatus || '',
    'lc-cd-notes': d.notes || ''
  };
  for (var id in fields) {
    var el = document.getElementById(id);
    if (el) el.value = fields[id];
  }

  renderTags(d.tags || []);

  // US-088: Update language lock UI
  updateLanguageLockUI();

  // US-005: Check if context file exists and show path
  updateContextFilePath();
}

function collectContactFields() {
  return {
    name: (document.getElementById('lc-cd-name')?.value || '').trim(),
    email: (document.getElementById('lc-cd-email')?.value || '').trim(),
    country: document.getElementById('lc-cd-country')?.value || '',
    language: document.getElementById('lc-cd-language')?.value || '',
    checkIn: document.getElementById('lc-cd-checkin')?.value || '',
    checkOut: document.getElementById('lc-cd-checkout')?.value || '',
    unit: (document.getElementById('lc-cd-unit')?.value || '').trim(),
    contactStatus: document.getElementById('lc-cd-contact-status')?.value || '',
    paymentStatus: document.getElementById('lc-cd-payment-status')?.value || '',
    notes: (document.getElementById('lc-cd-notes')?.value || '').trim(),
    tags: $.contactDetails.tags || []
  };
}

export function contactFieldChanged() {
  clearTimeout($.contactSaveTimer);
  showSaveIndicator('saving');
  $.contactSaveTimer = setTimeout(function () {
    var data = collectContactFields();
    saveContactDetails(data);
  }, 500);
}

async function saveContactDetails(data) {
  if (!$.activePhone) return;
  var prevUnit = $.contactUnitsMap[$.activePhone] || '';
  try {
    $.contactDetails = await api('/conversations/' + encodeURIComponent($.activePhone) + '/contact', {
      method: 'PATCH',
      body: data
    });
    showSaveIndicator('saved');
    // US-012: Sync unit to contactUnitsMap and re-render left pane if unit changed
    var newUnit = (data.unit || '').trim();
    var unitChanged = newUnit !== prevUnit;
    if (unitChanged) {
      if (newUnit) {
        $.contactUnitsMap[$.activePhone] = newUnit;
      } else {
        delete $.contactUnitsMap[$.activePhone];
      }
    }
    // US-014: Sync dates to contactDatesMap and re-render left pane if dates changed
    var prevDates = $.contactDatesMap[$.activePhone] || {};
    var newCheckIn = data.checkIn || '';
    var newCheckOut = data.checkOut || '';
    var datesChanged = newCheckIn !== (prevDates.checkIn || '') || newCheckOut !== (prevDates.checkOut || '');
    if (datesChanged) {
      if (newCheckIn && newCheckOut) {
        $.contactDatesMap[$.activePhone] = { checkIn: newCheckIn, checkOut: newCheckOut };
      } else {
        delete $.contactDatesMap[$.activePhone];
      }
    }
    if (unitChanged || datesChanged) {
      renderList($.conversations);
    }
  } catch (e) {
    showSaveIndicator('error');
  }
}

function showSaveIndicator(state) {
  var el = document.getElementById('lc-contact-save-indicator');
  if (!el) return;
  el.className = 'lc-contact-save-indicator ' + state;
  if (state === 'saving') {
    el.textContent = 'Saving...';
  } else if (state === 'saved') {
    el.textContent = 'Saved';
    setTimeout(function () {
      if (el.textContent === 'Saved') { el.textContent = ''; el.className = 'lc-contact-save-indicator'; }
    }, 2000);
  } else if (state === 'error') {
    el.textContent = 'Save failed';
  }
}

// ─── Global Tags System (US-008) ────────────────────────────────

var _globalTags = [];       // Cached global tag list
var _tagDropdownIdx = -1;   // Keyboard nav index in dropdown

export function loadGlobalTags() {
  api('/tags').then(function (data) {
    _globalTags = (data && Array.isArray(data.tags)) ? data.tags : [];
  }).catch(function () { /* silent — autocomplete degrades gracefully */ });
}

function syncTagToGlobal(tag) {
  api('/tags', { method: 'POST', body: { tag: tag } }).then(function (data) {
    if (data && Array.isArray(data.tags)) _globalTags = data.tags;
  }).catch(function () { /* silent */ });
}

function renderTags(tags) {
  var container = document.getElementById('lc-cd-tags');
  if (!container) return;
  container.innerHTML = tags.map(function (tag, i) {
    return '<span class="lc-tag-chip">' + escapeHtml(tag) +
      '<button onclick="lcRemoveTag(' + i + ')" title="Remove">&times;</button></span>';
  }).join('');
}

function addTag(text) {
  var tag = text.trim();
  if (!tag) return;
  if (!$.contactDetails.tags) $.contactDetails.tags = [];
  // Case-insensitive duplicate check
  var lower = tag.toLowerCase();
  var isDup = $.contactDetails.tags.some(function (t) { return t.toLowerCase() === lower; });
  if (isDup) return;
  $.contactDetails.tags.push(tag);
  renderTags($.contactDetails.tags);
  var data = collectContactFields();
  data.tags = $.contactDetails.tags;
  saveContactDetails(data);
  syncTagToGlobal(tag);
  hideTagDropdown();
  // US-009: Update local tags map for filter
  if ($.activePhone) $.contactTagsMap[$.activePhone] = $.contactDetails.tags.slice();
}

export function removeTag(index) {
  if (!$.contactDetails.tags) return;
  $.contactDetails.tags.splice(index, 1);
  renderTags($.contactDetails.tags);
  var data = collectContactFields();
  data.tags = $.contactDetails.tags;
  saveContactDetails(data);
  // US-009: Update local tags map for filter
  if ($.activePhone) $.contactTagsMap[$.activePhone] = $.contactDetails.tags.slice();
}

export function tagKeydown(event) {
  var dropdown = document.getElementById('lc-tag-dropdown');
  var visible = dropdown && dropdown.style.display !== 'none';
  var items = visible ? dropdown.querySelectorAll('.lc-tag-option') : [];

  if (event.key === 'ArrowDown' && visible && items.length) {
    event.preventDefault();
    _tagDropdownIdx = Math.min(_tagDropdownIdx + 1, items.length - 1);
    updateTagDropdownHighlight(items);
    return;
  }
  if (event.key === 'ArrowUp' && visible && items.length) {
    event.preventDefault();
    _tagDropdownIdx = Math.max(_tagDropdownIdx - 1, 0);
    updateTagDropdownHighlight(items);
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    if (visible && _tagDropdownIdx >= 0 && items[_tagDropdownIdx]) {
      var selected = items[_tagDropdownIdx].getAttribute('data-tag');
      if (selected) {
        addTag(selected);
        var input = document.getElementById('lc-cd-tag-input');
        if (input) input.value = '';
        return;
      }
    }
    var input = document.getElementById('lc-cd-tag-input');
    if (input && input.value.trim()) {
      addTag(input.value);
      input.value = '';
    }
    return;
  }
  if (event.key === 'Escape' && visible) {
    event.preventDefault();
    hideTagDropdown();
    return;
  }
}

export function tagInput() {
  var input = document.getElementById('lc-cd-tag-input');
  if (!input) return;
  var query = input.value.trim().toLowerCase();
  if (!query) { hideTagDropdown(); return; }

  var currentTags = ($.contactDetails.tags || []).map(function (t) { return t.toLowerCase(); });
  var matches = _globalTags.filter(function (t) {
    return t.toLowerCase().indexOf(query) !== -1 && currentTags.indexOf(t.toLowerCase()) === -1;
  });

  if (matches.length === 0) { hideTagDropdown(); return; }

  var dropdown = document.getElementById('lc-tag-dropdown');
  if (!dropdown) return;
  _tagDropdownIdx = -1;
  dropdown.innerHTML = matches.slice(0, 8).map(function (t) {
    return '<div class="lc-tag-option" data-tag="' + escapeAttr(t) + '" onclick="lcSelectTag(this)">' + escapeHtml(t) + '</div>';
  }).join('');
  dropdown.style.display = 'block';
}

function updateTagDropdownHighlight(items) {
  for (var i = 0; i < items.length; i++) {
    items[i].classList.toggle('highlighted', i === _tagDropdownIdx);
  }
}

export function selectTag(el) {
  var tag = el.getAttribute('data-tag');
  if (tag) addTag(tag);
  var input = document.getElementById('lc-cd-tag-input');
  if (input) input.value = '';
}

function hideTagDropdown() {
  var dropdown = document.getElementById('lc-tag-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  _tagDropdownIdx = -1;
}

// ─── Unit / Capsule Dropdown (US-010) ────────────────────────────

var _capsuleUnits = [];      // Cached capsule unit list
var _unitDropdownIdx = -1;   // Keyboard nav index in unit dropdown

export function loadCapsuleUnits() {
  return api('/capsules').then(function (data) {
    _capsuleUnits = (data && Array.isArray(data.units)) ? data.units : [];
  }).catch(function () { /* silent — freeform input still works */ });
}

function syncCustomUnit(unit) {
  api('/capsules/custom', { method: 'POST', body: { unit: unit } }).then(function (data) {
    if (data && Array.isArray(data.units)) _capsuleUnits = data.units;
  }).catch(function () { /* silent */ });
}

export function unitInput() {
  var input = document.getElementById('lc-cd-unit');
  if (!input) return;
  var query = input.value.trim().toLowerCase();

  var matches;
  if (!query) {
    // Show all units when field is focused with no text
    matches = _capsuleUnits.slice(0, 12);
  } else {
    matches = _capsuleUnits.filter(function (u) {
      return u.toLowerCase().indexOf(query) !== -1;
    });
  }

  if (matches.length === 0) { hideUnitDropdown(); return; }

  var dropdown = document.getElementById('lc-unit-dropdown');
  if (!dropdown) return;
  _unitDropdownIdx = -1;
  dropdown.innerHTML = matches.slice(0, 10).map(function (u) {
    return '<div class="lc-tag-option" data-unit="' + escapeAttr(u) + '" onclick="lcSelectUnit(this)">' + escapeHtml(u) + '</div>';
  }).join('');
  dropdown.style.display = 'block';
}

export function selectUnit(el) {
  var unit = el.getAttribute('data-unit');
  if (!unit) return;
  var input = document.getElementById('lc-cd-unit');
  if (input) {
    input.value = unit;
    contactFieldChanged();
  }
  hideUnitDropdown();
}

export function unitKeydown(event) {
  var dropdown = document.getElementById('lc-unit-dropdown');
  var visible = dropdown && dropdown.style.display !== 'none';
  var items = visible ? dropdown.querySelectorAll('.lc-tag-option') : [];

  if (event.key === 'ArrowDown' && visible && items.length) {
    event.preventDefault();
    _unitDropdownIdx = Math.min(_unitDropdownIdx + 1, items.length - 1);
    _updateUnitDropdownHighlight(items);
    return;
  }
  if (event.key === 'ArrowUp' && visible && items.length) {
    event.preventDefault();
    _unitDropdownIdx = Math.max(_unitDropdownIdx - 1, 0);
    _updateUnitDropdownHighlight(items);
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    if (visible && _unitDropdownIdx >= 0 && items[_unitDropdownIdx]) {
      var selected = items[_unitDropdownIdx].getAttribute('data-unit');
      if (selected) {
        var input = document.getElementById('lc-cd-unit');
        if (input) { input.value = selected; contactFieldChanged(); }
        hideUnitDropdown();
        return;
      }
    }
    // If Enter pressed with no dropdown selection, save custom unit and trigger save
    var input = document.getElementById('lc-cd-unit');
    if (input && input.value.trim()) {
      syncCustomUnit(input.value.trim());
      contactFieldChanged();
    }
    hideUnitDropdown();
    return;
  }
  if (event.key === 'Escape' && visible) {
    event.preventDefault();
    hideUnitDropdown();
    return;
  }
}

function _updateUnitDropdownHighlight(items) {
  for (var i = 0; i < items.length; i++) {
    items[i].classList.toggle('highlighted', i === _unitDropdownIdx);
  }
}

export function unitBlur() {
  // Small delay to allow dropdown click to register before hiding
  setTimeout(function () {
    hideUnitDropdown();
    // Sync any typed custom unit to global list
    var input = document.getElementById('lc-cd-unit');
    if (input && input.value.trim()) {
      syncCustomUnit(input.value.trim());
    }
  }, 200);
}

function hideUnitDropdown() {
  var dropdown = document.getElementById('lc-unit-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  _unitDropdownIdx = -1;
}

// ─── Contact Units Map (US-012) ──────────────────────────────────

export function loadContactUnitsMap() {
  return api('/conversations/units-map').then(function (data) {
    $.contactUnitsMap = (data && typeof data === 'object') ? data : {};
  }).catch(function () { $.contactUnitsMap = {}; });
}

// ─── Contact Dates Map (US-014) ─────────────────────────────────

export function loadContactDatesMap() {
  api('/conversations/dates-map').then(function (data) {
    $.contactDatesMap = (data && typeof data === 'object') ? data : {};
  }).catch(function () { $.contactDatesMap = {}; });
}

// ─── Tag Filter (US-009) ────────────────────────────────────────

export function loadContactTagsMap() {
  return api('/conversations/tags-map').then(function (data) {
    $.contactTagsMap = (data && typeof data === 'object') ? data : {};
  }).catch(function () { $.contactTagsMap = {}; });
}

export async function toggleTagFilter() {
  var dropdown = document.getElementById('lc-tag-filter-dropdown');
  if (!dropdown) return;
  var isOpen = dropdown.style.display !== 'none';
  if (isOpen) {
    dropdown.style.display = 'none';
    return;
  }
  // US-006: Ensure tags are loaded before rendering (handles race on first click)
  if (Object.keys($.contactTagsMap).length === 0) {
    await loadContactTagsMap();
  }
  _renderTagFilterDropdown();
  dropdown.style.display = 'block';
}

function _renderTagFilterDropdown() {
  var dropdown = document.getElementById('lc-tag-filter-dropdown');
  if (!dropdown) return;

  // Collect all unique tags from contactTagsMap
  var tagSet = {};
  var phones = Object.keys($.contactTagsMap);
  for (var i = 0; i < phones.length; i++) {
    var tags = $.contactTagsMap[phones[i]];
    if (Array.isArray(tags)) {
      for (var j = 0; j < tags.length; j++) {
        var t = tags[j];
        tagSet[t.toLowerCase()] = t; // Keep original case from first occurrence
      }
    }
  }
  // Also include global tags for completeness
  for (var k = 0; k < _globalTags.length; k++) {
    var gt = _globalTags[k];
    if (!tagSet[gt.toLowerCase()]) tagSet[gt.toLowerCase()] = gt;
  }

  var allTags = Object.keys(tagSet).sort().map(function (k) { return tagSet[k]; });

  if (allTags.length === 0) {
    dropdown.innerHTML = '<div class="lc-tag-filter-empty">No tags yet</div>';
    return;
  }

  var html = '';
  // Clear filter option (only if filter is active)
  if ($.tagFilter.length > 0) {
    html += '<div class="lc-tag-filter-option lc-tag-filter-clear" onclick="lcClearTagFilter()">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      ' Clear filter</div>';
  }

  for (var m = 0; m < allTags.length; m++) {
    var tag = allTags[m];
    var isSelected = $.tagFilter.indexOf(tag) !== -1;
    html += '<div class="lc-tag-filter-option' + (isSelected ? ' selected' : '') +
      '" data-tag="' + escapeAttr(tag) + '" onclick="lcToggleTagSelection(this)">' +
      '<span class="lc-tag-filter-check">' + (isSelected ? '\u2713' : '') + '</span>' +
      escapeHtml(tag) + '</div>';
  }
  dropdown.innerHTML = html;
}

export function toggleTagSelection(el) {
  var tag = el.getAttribute('data-tag');
  if (!tag) return;
  var idx = $.tagFilter.indexOf(tag);
  if (idx === -1) {
    $.tagFilter.push(tag);
  } else {
    $.tagFilter.splice(idx, 1);
  }
  _renderTagFilterDropdown();
  _updateTagFilterBtnLabel();
  renderList($.conversations);
}

export function clearTagFilter() {
  $.tagFilter = [];
  var dropdown = document.getElementById('lc-tag-filter-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  _updateTagFilterBtnLabel();
  renderList($.conversations);
}

function _updateTagFilterBtnLabel() {
  var label = document.getElementById('lc-tag-filter-label');
  var btn = document.getElementById('lc-tag-filter-btn');
  if (!label) return;
  if ($.tagFilter.length === 0) {
    label.textContent = 'Tags';
    if (btn) btn.classList.remove('active');
  } else if ($.tagFilter.length === 1) {
    label.textContent = $.tagFilter[0];
    if (btn) btn.classList.add('active');
  } else {
    label.textContent = $.tagFilter.length + ' tags';
    if (btn) btn.classList.add('active');
  }
}

// ─── Unit Filter (US-013) ────────────────────────────────────────

export async function toggleUnitFilter() {
  var dropdown = document.getElementById('lc-unit-filter-dropdown');
  if (!dropdown) return;
  var isOpen = dropdown.style.display !== 'none';
  if (isOpen) {
    dropdown.style.display = 'none';
    return;
  }
  // US-006: Ensure unit/capsule data is loaded before rendering (handles race on first click)
  if (Object.keys($.contactUnitsMap).length === 0 && _capsuleUnits.length === 0) {
    await Promise.all([loadContactUnitsMap(), loadCapsuleUnits()]);
  }
  _renderUnitFilterDropdown();
  dropdown.style.display = 'block';
}

function _renderUnitFilterDropdown() {
  var dropdown = document.getElementById('lc-unit-filter-dropdown');
  if (!dropdown) return;

  // Collect all unique units from contactUnitsMap
  var unitSet = {};
  var phones = Object.keys($.contactUnitsMap);
  for (var i = 0; i < phones.length; i++) {
    var u = $.contactUnitsMap[phones[i]];
    if (u) unitSet[u.toLowerCase()] = u;
  }
  // Also include capsule units from cache
  for (var j = 0; j < _capsuleUnits.length; j++) {
    var cu = _capsuleUnits[j];
    if (cu && !unitSet[cu.toLowerCase()]) unitSet[cu.toLowerCase()] = cu;
  }

  var allUnits = Object.keys(unitSet).sort().map(function (k) { return unitSet[k]; });

  if (allUnits.length === 0) {
    dropdown.innerHTML = '<div class="lc-tag-filter-empty">No units assigned yet</div>';
    return;
  }

  var html = '';
  // Clear filter option (only if filter is active)
  if ($.unitFilter) {
    html += '<div class="lc-tag-filter-option lc-tag-filter-clear" onclick="lcClearUnitFilter()">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      ' Clear filter</div>';
  }

  for (var m = 0; m < allUnits.length; m++) {
    var unit = allUnits[m];
    var isSelected = $.unitFilter === unit;
    html += '<div class="lc-tag-filter-option' + (isSelected ? ' selected' : '') +
      '" data-unit="' + escapeAttr(unit) + '" onclick="lcSelectUnitFilter(this)">' +
      '<span class="lc-tag-filter-check">' + (isSelected ? '\u2713' : '') + '</span>' +
      escapeHtml(unit) + '</div>';
  }
  dropdown.innerHTML = html;
}

export function selectUnitFilter(el) {
  var unit = el.getAttribute('data-unit');
  if (!unit) return;
  // Toggle: if already selected, clear it
  if ($.unitFilter === unit) {
    $.unitFilter = '';
  } else {
    $.unitFilter = unit;
  }
  _renderUnitFilterDropdown();
  _updateUnitFilterBtnLabel();
  renderList($.conversations);
}

export function clearUnitFilter() {
  $.unitFilter = '';
  var dropdown = document.getElementById('lc-unit-filter-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  _updateUnitFilterBtnLabel();
  renderList($.conversations);
}

function _updateUnitFilterBtnLabel() {
  var label = document.getElementById('lc-unit-filter-label');
  var btn = document.getElementById('lc-unit-filter-btn');
  if (!label) return;
  if (!$.unitFilter) {
    label.textContent = 'Unit';
    if (btn) btn.classList.remove('active');
  } else {
    label.textContent = $.unitFilter;
    if (btn) btn.classList.add('active');
  }
}

// ─── Response Mode Management (Autopilot/Copilot/Manual) ────────

export async function setMode(mode) {
  if (!$.activePhone) return;

  try {
    var setDefaultCheckbox = document.getElementById('lc-mode-set-default');
    var setAsGlobalDefault = setDefaultCheckbox ? setDefaultCheckbox.checked : false;

    await api('/conversations/' + encodeURIComponent($.activePhone) + '/mode', {
      method: 'POST',
      body: {
        mode: mode,
        setAsGlobalDefault: setAsGlobalDefault
      }
    });

    $.currentMode = mode;
    updateModeUI(mode);
    toggleModeMenu();

    if (setDefaultCheckbox) setDefaultCheckbox.checked = false;

    var message = 'Switched to ' + mode + ' mode';
    if (setAsGlobalDefault) {
      message += ' (set as default for all chats)';
    }
    showToast(message, 'success');
  } catch (err) {
    showToast('Failed to change mode: ' + err.message, 'error');
  }
}

export function updateModeUI(mode) {
  var icon = document.getElementById('lc-mode-icon');
  var btn = document.getElementById('lc-mode-btn');
  var icons = {
    autopilot: '\u2708\uFE0F',
    copilot: '\uD83E\uDD1D',
    manual: '\u270D\uFE0F'
  };
  var tooltips = {
    autopilot: 'Autopilot \u2014 AI responds automatically',
    copilot: 'Copilot \u2014 AI suggests, you approve',
    manual: 'Manual \u2014 You write, AI helps on request'
  };
  if (icon) icon.textContent = icons[mode] || '\uD83E\uDD1D';
  if (btn) btn.title = tooltips[mode] || mode;

  document.querySelectorAll('.lc-mode-option').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  var helpBtn = document.getElementById('lc-help-me-btn');
  if (helpBtn) {
    helpBtn.style.display = mode === 'manual' ? '' : 'none';
  }

  updateModeSubmenuUI();

  if (mode === 'copilot') {
    checkPendingApprovals();
  } else {
    var panel = document.getElementById('lc-approval-panel');
    if (panel) panel.style.display = 'none';
  }
}

export function toggleModeMenu() {
  var menu = document.getElementById('lc-mode-dropdown');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' ? '' : 'none';
}

export async function checkPendingApprovals() {
  if (!$.activePhone || $.currentMode !== 'copilot') return;

  try {
    var data = await api('/conversations/' + encodeURIComponent($.activePhone) + '/approvals');
    $.pendingApprovals = data.approvals || [];

    if ($.pendingApprovals.length > 0) {
      showApprovalPanel($.pendingApprovals[0]);
    } else {
      var panel = document.getElementById('lc-approval-panel');
      if (panel) panel.style.display = 'none';
    }
  } catch (err) {
    console.error('[Copilot] Failed to check approvals:', err);
  }
}

function showApprovalPanel(approval) {
  $.currentApprovalId = approval.id;

  var panel = document.getElementById('lc-approval-panel');
  var text = document.getElementById('lc-approval-text');
  var intent = document.getElementById('lc-approval-intent');
  var confidence = document.getElementById('lc-approval-confidence');

  if (panel) panel.style.display = '';
  if (text) text.value = approval.suggestedResponse;
  if (intent) intent.innerHTML = 'Intent: <strong>' + escapeHtml(approval.intent) + '</strong>';
  if (confidence) confidence.innerHTML = 'Confidence: <strong>' + approval.confidence.toFixed(2) + '</strong>';

  var container = document.getElementById('lc-messages');
  if (container) {
    setTimeout(function () {
      container.scrollTop = container.scrollHeight;
    }, 100);
  }
}

export async function approveResponse() {
  if (!$.activePhone || !$.currentApprovalId) return;

  var text = document.getElementById('lc-approval-text');
  var editedResponse = text ? text.value.trim() : '';

  if (!editedResponse) {
    showToast('Response cannot be empty', 'error');
    return;
  }

  try {
    var wasEdited = $.pendingApprovals[0] && editedResponse !== $.pendingApprovals[0].suggestedResponse;
    await api(
      '/conversations/' + encodeURIComponent($.activePhone) + '/approvals/' + $.currentApprovalId + '/approve',
      {
        method: 'POST',
        body: { editedResponse: wasEdited ? editedResponse : null }
      }
    );

    showToast('Response sent', 'success');
    $.currentApprovalId = null;
    var panel = document.getElementById('lc-approval-panel');
    if (panel) panel.style.display = 'none';

    await refreshChat();
    await checkPendingApprovals();
  } catch (err) {
    showToast('Failed to send message: ' + (err.message || 'Unknown error'), 'error');
  }
}

export async function rejectApproval() {
  if (!$.activePhone || !$.currentApprovalId) return;

  try {
    await api(
      '/conversations/' + encodeURIComponent($.activePhone) + '/approvals/' + $.currentApprovalId + '/reject',
      { method: 'POST' }
    );

    showToast('Suggestion rejected', 'info');
    $.currentApprovalId = null;
    var panel = document.getElementById('lc-approval-panel');
    if (panel) panel.style.display = 'none';

    await checkPendingApprovals();
  } catch (err) {
    showToast('Failed to reject: ' + err.message, 'error');
  }
}

export function dismissApproval() {
  var panel = document.getElementById('lc-approval-panel');
  if (panel) panel.style.display = 'none';
  $.currentApprovalId = null;
}

export async function getAIHelp() {
  if (!$.activePhone || $.aiHelpLoading) return;

  var btn = document.getElementById('lc-help-me-btn');
  var input = document.getElementById('lc-input-box');

  $.aiHelpLoading = true;
  if (btn) btn.classList.add('loading');

  try {
    var data = await api('/conversations/' + encodeURIComponent($.activePhone) + '/suggest', {
      method: 'POST',
      body: { context: input ? input.value : null }
    });

    if (input && data.suggestion) {
      input.value = data.suggestion;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      input.focus();
    }

    showToast('AI suggestion generated (edit before sending)', 'success');
  } catch (err) {
    showToast('Failed to generate suggestion: ' + err.message, 'error');
  } finally {
    $.aiHelpLoading = false;
    if (btn) btn.classList.remove('loading');
  }
}

// ─── Clear Chat ──────────────────────────────────────────────────

export async function clearChat() {
  if (!$.activePhone) return;
  if (!confirm('Clear all messages in this conversation? This cannot be undone.')) return;
  try {
    await api('/conversations/' + encodeURIComponent($.activePhone) + '/clear', { method: 'POST' });
    showToast('Chat cleared', 'success');
    await refreshChat();
  } catch (err) {
    showToast('Failed to clear chat: ' + (err.message || 'Unknown error'), 'error');
  }
}

// ─── WA Status Bar Toggle (US-056) ──────────────────────────────

export function toggleWaStatusBar() {
  var bar = document.getElementById('lc-wa-status-bar');
  if (!bar) return;
  var isCollapsed = bar.classList.toggle('wa-collapsed');
  try { sessionStorage.setItem('wa-status-collapsed', isCollapsed ? '1' : '0'); } catch (e) { }
}

export function restoreWaStatusBarState() {
  var bar = document.getElementById('lc-wa-status-bar');
  if (!bar) return;
  try {
    var stored = sessionStorage.getItem('wa-status-collapsed');
    if (stored === '0') {
      bar.classList.remove('wa-collapsed');
    } else {
      bar.classList.add('wa-collapsed');
    }
  } catch (e) {
    bar.classList.add('wa-collapsed');
  }
}

// ─── Resizable Divider (US-072) ──────────────────────────────────

var _dividerInitialized = false;

export function initResizableDivider() {
  if (_dividerInitialized) return;
  var divider = document.getElementById('lc-divider');
  var sidebar = document.getElementById('lc-sidebar');
  var main = document.getElementById('lc-main');
  if (!divider || !sidebar || !main) return;
  _dividerInitialized = true;

  var MIN_LEFT = 200;
  var MIN_RIGHT = 300;
  var startX = 0;
  var startWidth = 0;
  var maxLeft = 0;
  var dragging = false;
  var rafId = 0;
  var pendingWidth = 0;

  // Restore saved width
  try {
    var saved = localStorage.getItem('lc-pane-width');
    if (saved) {
      var w = parseInt(saved, 10);
      if (w >= MIN_LEFT) {
        sidebar.style.width = w + 'px';
        sidebar.style.flex = '0 0 ' + w + 'px';
      }
    }
  } catch (e) { }

  function applyWidth() {
    rafId = 0;
    sidebar.style.width = pendingWidth + 'px';
    sidebar.style.flex = '0 0 ' + pendingWidth + 'px';
  }

  function onPointerDown(e) {
    e.preventDefault();
    dragging = true;
    startX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    startWidth = sidebar.getBoundingClientRect().width;

    // Cache layout values once at drag start (they don't change during drag)
    var container = sidebar.parentElement;
    var containerWidth = container ? container.getBoundingClientRect().width : window.innerWidth;
    var contactPanel = document.getElementById('lc-contact-panel');
    var contactWidth = (contactPanel && contactPanel.style.display !== 'none') ? contactPanel.getBoundingClientRect().width : 0;
    maxLeft = containerWidth - 4 - MIN_RIGHT - contactWidth;

    divider.classList.add('active');
    document.body.classList.add('lc-resizing');
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('touchend', onPointerUp);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    e.preventDefault();
    var clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    pendingWidth = Math.max(MIN_LEFT, Math.min(maxLeft, startWidth + (clientX - startX)));

    // Throttle DOM writes to one per animation frame
    if (!rafId) {
      rafId = requestAnimationFrame(applyWidth);
    }
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    // Apply final width synchronously
    applyWidth();
    divider.classList.remove('active');
    document.body.classList.remove('lc-resizing');
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    document.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('touchend', onPointerUp);

    // Save width to localStorage
    try {
      localStorage.setItem('lc-pane-width', Math.round(pendingWidth).toString());
    } catch (e) { }
  }

  divider.addEventListener('mousedown', onPointerDown);
  divider.addEventListener('touchstart', onPointerDown, { passive: false });
}

// ─── Toast ───────────────────────────────────────────────────────

export function showToast(message, type) {
  var toast = document.createElement('div');
  toast.className = 'lc-toast lc-toast-' + type;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(function () {
    toast.classList.add('lc-toast-show');
  }, 10);

  setTimeout(function () {
    toast.classList.remove('lc-toast-show');
    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// ─── US-090: AI-Generated Notes ─────────────────────────────────

export async function generateAINotes() {
  if (!$.activePhone) return;

  var btn = document.getElementById('lc-cd-generate-notes');
  var textarea = document.getElementById('lc-cd-notes');
  if (!btn || !textarea) return;

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    var result = await api('/conversations/' + encodeURIComponent($.activePhone) + '/generate-notes', {
      method: 'POST'
    });

    if (result && result.notes) {
      textarea.value = result.notes;
      // Auto-expand to show full content without truncation (US-008)
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
      // Scroll the contact body so the expanded textarea is visible
      var body = textarea.closest('.lc-contact-body');
      if (body) body.scrollTop = body.scrollHeight;
      showToast('AI notes generated (review before saving)', 'success');
      contactFieldChanged();
    }
  } catch (err) {
    showToast('Failed to generate notes: ' + (err.message || 'Unknown error'), 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ─── US-091: Guest Context File ─────────────────────────────────

// US-005: Check if context file exists for current contact and show path
export async function updateContextFilePath() {
  var pathEl = document.getElementById('lc-context-filepath');
  if (!pathEl) return;

  if (!$.activePhone) {
    pathEl.style.display = 'none';
    return;
  }

  try {
    var result = await api('/conversations/' + encodeURIComponent($.activePhone) + '/context');
    if (result && result.exists && result.filename) {
      pathEl.textContent = '\u{1F4C4} ' + result.filename;
      pathEl.style.display = '';
    } else {
      pathEl.style.display = 'none';
    }
  } catch (err) {
    pathEl.style.display = 'none';
  }
}

export async function openGuestContext() {
  if (!$.activePhone) return;

  var modal = document.getElementById('lc-context-modal');
  var editor = document.getElementById('lc-context-editor');
  var filenameEl = document.getElementById('lc-context-filename');
  if (!modal || !editor) return;

  editor.value = 'Loading...';
  modal.style.display = '';

  try {
    var result = await api('/conversations/' + encodeURIComponent($.activePhone) + '/context');
    if (result) {
      editor.value = result.content || '';
      if (filenameEl) filenameEl.textContent = result.filename || '';
    }
  } catch (err) {
    editor.value = '# Error loading context file\n\nPlease try again.';
    showToast('Failed to load context: ' + (err.message || 'Unknown error'), 'error');
  }
}

export function closeContextModal() {
  var modal = document.getElementById('lc-context-modal');
  if (modal) modal.style.display = 'none';
}

export async function saveGuestContext() {
  if (!$.activePhone) return;

  var editor = document.getElementById('lc-context-editor');
  if (!editor) return;

  try {
    var result = await api('/conversations/' + encodeURIComponent($.activePhone) + '/context', {
      method: 'PUT',
      body: { content: editor.value }
    });
    showToast('Guest context saved', 'success');
    closeContextModal();

    // US-005: Show the saved file path below the button
    var pathEl = document.getElementById('lc-context-filepath');
    if (pathEl && result && result.filename) {
      pathEl.textContent = '\u{1F4C4} ' + result.filename;
      pathEl.style.display = '';
    }
  } catch (err) {
    showToast('Failed to save context: ' + (err.message || 'Unknown error'), 'error');
  }
}

// ─── Mobile Navigation (US-092) ──────────────────────────────────

/**
 * Navigate back to sidebar on mobile (hides conversation, shows chat list)
 */
export function mobileBack() {
  var container = document.querySelector('.lc-container');
  if (container) container.classList.remove('lc-mobile-show-chat');
}

/**
 * Show conversation view on mobile (hides sidebar, shows chat)
 * Called from openConversation() when on mobile viewport
 */
export function mobileShowChat() {
  var container = document.querySelector('.lc-container');
  if (container && window.innerWidth <= 768) {
    container.classList.add('lc-mobile-show-chat');
  }
}

// ─── Payment Reminders (US-022) ─────────────────────────────────

var _currentReminder = null; // Active reminder for current contact

export async function loadPaymentReminder() {
  _currentReminder = null;
  var activeEl = document.getElementById('lc-payment-reminder-active');
  var newEl = document.getElementById('lc-payment-reminder-new');
  if (!activeEl || !newEl) return;

  if (!$.activePhone) {
    activeEl.style.display = 'none';
    newEl.style.display = '';
    return;
  }

  try {
    var result = await api('/payment-reminders?phone=' + encodeURIComponent($.activePhone));
    var reminders = result.reminders || [];
    var active = reminders.find(function (r) { return r.status === 'active' || r.status === 'snoozed'; });

    if (active) {
      _currentReminder = active;
      activeEl.style.display = '';
      newEl.style.display = 'none';
      var dueEl = document.getElementById('lc-payment-reminder-due');
      if (dueEl) dueEl.textContent = 'Due: ' + active.dueDate;
      var autoEl = document.getElementById('lc-payment-reminder-auto');
      if (autoEl) autoEl.textContent = active.autoSend ? '(auto-send)' : '';
      // Add overdue styling
      var today = new Date().toISOString().split('T')[0];
      if (active.dueDate <= today) {
        activeEl.classList.add('lc-reminder-overdue');
      } else {
        activeEl.classList.remove('lc-reminder-overdue');
      }
    } else {
      activeEl.style.display = 'none';
      newEl.style.display = '';
    }
  } catch {
    activeEl.style.display = 'none';
    newEl.style.display = '';
  }
}

export async function setPaymentReminder() {
  if (!$.activePhone) return;
  var dateInput = document.getElementById('lc-payment-due-date');
  var autoInput = document.getElementById('lc-payment-autosend');
  if (!dateInput || !dateInput.value) {
    if (window.toast) window.toast('Pick a due date', 'error');
    return;
  }

  try {
    await api('/payment-reminders', {
      method: 'POST',
      body: {
        phone: $.activePhone,
        dueDate: dateInput.value,
        autoSend: autoInput ? autoInput.checked : false
      }
    });
    if (window.toast) window.toast('Payment reminder set for ' + dateInput.value, 'success');
    dateInput.value = '';
    if (autoInput) autoInput.checked = false;
    loadPaymentReminder();
    refreshOverdueBell();
  } catch (err) {
    if (window.toast) window.toast('Failed: ' + (err.message || 'error'), 'error');
  }
}

export async function dismissReminder() {
  if (!_currentReminder) return;
  try {
    await api('/payment-reminders/' + encodeURIComponent(_currentReminder.id) + '/dismiss', { method: 'POST' });
    if (window.toast) window.toast('Reminder dismissed', 'success');
    loadPaymentReminder();
    refreshOverdueBell();
  } catch (err) {
    if (window.toast) window.toast('Failed: ' + (err.message || 'error'), 'error');
  }
}

export async function snoozeReminder() {
  if (!_currentReminder) return;
  try {
    await api('/payment-reminders/' + encodeURIComponent(_currentReminder.id) + '/snooze', {
      method: 'POST',
      body: { days: 3 }
    });
    if (window.toast) window.toast('Reminder snoozed for 3 days', 'success');
    loadPaymentReminder();
    refreshOverdueBell();
  } catch (err) {
    if (window.toast) window.toast('Failed: ' + (err.message || 'error'), 'error');
  }
}

// Overdue bell + badge in sidebar header
export async function refreshOverdueBell() {
  try {
    var result = await api('/payment-reminders/overdue');
    var count = result.count || 0;
    var bell = document.getElementById('lc-reminder-bell');
    var countEl = document.getElementById('lc-reminder-bell-count');
    if (bell) bell.style.display = count > 0 ? '' : 'none';
    if (countEl) countEl.textContent = String(count);
  } catch {
    // Non-critical
  }
}

export async function showOverdueReminders() {
  try {
    var result = await api('/payment-reminders/overdue');
    var reminders = result.reminders || [];
    if (reminders.length === 0) {
      if (window.toast) window.toast('No overdue payment reminders', 'info');
      return;
    }
    var lines = reminders.map(function (r) {
      var phone = r.phone.replace(/^\d{1,3}/, function (cc) { return '+' + cc + ' '; });
      return phone + ' — due ' + r.dueDate;
    });
    alert('Overdue Payment Reminders:\n\n' + lines.join('\n'));
  } catch (err) {
    if (window.toast) window.toast('Failed to load reminders', 'error');
  }
}

// Add overdue badge to left-pane conversation items
export function addOverdueBadgeToList() {
  api('/payment-reminders/overdue').then(function (result) {
    var reminders = result.reminders || [];
    var overduePhones = {};
    for (var i = 0; i < reminders.length; i++) {
      overduePhones[reminders[i].phone] = true;
    }
    // Find chat list items and add badge
    var items = document.querySelectorAll('.lc-chat-item');
    for (var j = 0; j < items.length; j++) {
      var phone = items[j].getAttribute('data-phone');
      var existingBadge = items[j].querySelector('.lc-overdue-badge');
      if (phone && overduePhones[phone]) {
        if (!existingBadge) {
          var badge = document.createElement('span');
          badge.className = 'lc-overdue-badge';
          badge.title = 'Payment overdue';
          badge.textContent = '$';
          var nameEl = items[j].querySelector('.lc-chat-name');
          if (nameEl) nameEl.appendChild(badge);
        }
      } else if (existingBadge) {
        existingBadge.remove();
      }
    }
  }).catch(function () { /* silent */ });
}
