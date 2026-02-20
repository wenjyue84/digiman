// ═══════════════════════════════════════════════════════════════════
// Live Chat Core - Connection, init, list/chat rendering
// ═══════════════════════════════════════════════════════════════════

import { $, avatarImg } from './live-chat-state.js';
import { handleMessageChevronClick, bindContextMenuActions, clearFile, cancelReply, loadMessageMetadata, updateMessageIndicators, loadCmdTemplates, showReconnectionModal } from './live-chat-actions.js';
import { hideTranslatePreview, updateTranslateIndicator, updateModeSubmenuUI } from './live-chat-features.js';
import { loadContactDetails, updateModeUI, checkPendingApprovals, restoreWaStatusBarState, initResizableDivider, mobileShowChat, loadContactTagsMap, loadContactUnitsMap, loadContactDatesMap, loadCapsuleUnits, refreshOverdueBell, addOverdueBadgeToList } from './live-chat-panels.js';

var api = window.api;

// ─── WhatsApp connection status ──────────────────────────────────

export function updateConnectionStatus(statusData) {
  var instances = (statusData && statusData.whatsappInstances) || [];
  var connected = instances.some(function (i) { return i.state === 'open'; });
  var connecting = !connected && instances.some(function (i) { return i.state === 'connecting'; });

  // Derive a 3-state status: 'connected' | 'connecting' | 'disconnected'
  var waState = connected ? 'connected' : (connecting ? 'connecting' : 'disconnected');

  // Update the small status dot in sidebar header (US-077, US-007)
  var dot = document.getElementById('lc-wa-dot');
  if (dot) {
    dot.classList.remove('lc-wa-connected', 'lc-wa-disconnected', 'lc-wa-checking');
    var dotClass = waState === 'connected' ? 'lc-wa-connected'
      : waState === 'connecting' ? 'lc-wa-checking'
      : 'lc-wa-disconnected';
    dot.classList.add(dotClass);
    var dotTitle = waState === 'connected' ? 'WhatsApp Connected'
      : waState === 'connecting' ? 'WhatsApp Connecting...'
      : 'WhatsApp Disconnected';
    dot.title = dotTitle;
  }

  // Update tooltip content
  var tooltipStatus = document.getElementById('lc-wa-tooltip-status');
  var tooltipPhone = document.getElementById('lc-wa-tooltip-phone');
  if (tooltipStatus) {
    var statusLabel = waState === 'connected' ? 'Connected'
      : waState === 'connecting' ? 'Connecting...'
      : 'Disconnected';
    var statusColor = waState === 'connected' ? '#25d366'
      : waState === 'connecting' ? '#f59e0b'
      : '#ea0038';
    tooltipStatus.textContent = statusLabel;
    tooltipStatus.style.color = statusColor;
  }
  if (tooltipPhone) {
    var phoneNumbers = instances
      .filter(function (i) { return i.state === 'open' && i.user && i.user.phone; })
      .map(function (i) { return '+' + i.user.phone; });
    var phoneText = phoneNumbers.length > 0 ? phoneNumbers.join(', ')
      : waState === 'connecting' ? 'Reconnecting...'
      : (connected ? 'Connected' : 'No active connections');
    tooltipPhone.textContent = phoneText;
  }

  if ($.waWasConnected === true && !connected) {
    $.waWasConnected = false;
    showReconnectionModal();
  } else {
    $.waWasConnected = connected;
  }
}

export async function pollConnectionStatus() {
  var section = document.getElementById('tab-live-chat');
  if (section && section.classList.contains('hidden')) return;
  try {
    var statusData = await api('/status');
    updateConnectionStatus(statusData);
  } catch (e) { }
}

// ─── Staff Name Editing (US-011) ────────────────────────────────

export function editStaffName() {
  var el = document.getElementById('lc-staff-name');
  if (!el) return;
  var current = $.staffName || 'Staff';
  var newName = prompt('Enter your display name (shown on manual messages):', current);
  if (newName === null) return; // cancelled
  newName = newName.trim();
  if (!newName) newName = 'Staff';
  $.staffName = newName;
  el.textContent = newName;
  // Persist to settings
  api('/settings', {
    method: 'PATCH',
    body: { staffName: newName }
  }).catch(function (err) {
    console.warn('[US-011] Failed to save staff name:', err);
  });
}

// ─── Date Filter Functions ──────────────────────────────────────

export function initializeDateFilters() {
  var fromInput = document.getElementById('lc-date-from');
  var toInput = document.getElementById('lc-date-to');
  if (!fromInput || !toInput) return;

  fromInput.value = '';
  toInput.value = '';
  $.dateFilterFrom = null;
  $.dateFilterTo = null;
}

export function resetDateFilter() {
  var fromInput = document.getElementById('lc-date-from');
  var toInput = document.getElementById('lc-date-to');
  if (fromInput) fromInput.value = '';
  if (toInput) toInput.value = '';
  $.dateFilterFrom = null;
  $.dateFilterTo = null;
  filterConversations();
}

export function updateDateFilterFromInputs() {
  var fromInput = document.getElementById('lc-date-from');
  var toInput = document.getElementById('lc-date-to');

  if (fromInput && fromInput.value) {
    $.dateFilterFrom = new Date(fromInput.value);
  } else {
    $.dateFilterFrom = null;
  }

  if (toInput && toInput.value) {
    var toDate = new Date(toInput.value);
    toDate.setHours(23, 59, 59, 999);
    $.dateFilterTo = toDate;
  } else {
    $.dateFilterTo = null;
  }
}

// ─── Main Load ───────────────────────────────────────────────────

export async function loadLiveChat() {
  // Fetch bot avatar + staff name settings (US-087, US-011)
  try {
    var settingsData = await api('/settings');
    if (settingsData && settingsData.botAvatar) {
      window._botAvatar = settingsData.botAvatar;
    }
    // US-011: Load staff name
    if (settingsData && settingsData.staffName) {
      $.staffName = settingsData.staffName;
      var staffEl = document.getElementById('lc-staff-name');
      if (staffEl) staffEl.textContent = settingsData.staffName;
    }
  } catch (e) { /* fallback to default */ }

  // Restore translate state (flag selector, US-096)
  var translateBtn = document.getElementById('lc-translate-toggle');
  var flagWrap = document.getElementById('lc-flag-selector-wrap');
  if ($.translateMode && translateBtn) {
    translateBtn.classList.add('active');
    if (flagWrap) flagWrap.style.display = '';
  }

  // Initialize date filters (default: last 7 days)
  initializeDateFilters();

  // Restore WA status bar collapse state (US-056)
  restoreWaStatusBarState();

  // Initialize resizable divider (US-072) — must run after template is in DOM
  initResizableDivider();

  // Initialize translate indicator and mode submenu label
  updateTranslateIndicator();
  updateModeSubmenuUI();

  // Show skeleton loading indicator (US-145)
  var skeletonWrap = document.getElementById('lc-skeleton-wrap');
  var emptyState = document.getElementById('lc-sidebar-empty');
  if (skeletonWrap) skeletonWrap.style.display = '';
  if (emptyState) emptyState.style.display = 'none';

  try {
    var results = await Promise.all([
      api('/conversations'),
      api('/status')
    ]);
    $.conversations = results[0];
    var statusData = results[1];

    // Hide skeleton once data arrives (US-145)
    if (skeletonWrap) skeletonWrap.style.display = 'none';

    $.instances = {};
    if (statusData.whatsappInstances) {
      for (var i = 0; i < statusData.whatsappInstances.length; i++) {
        var inst = statusData.whatsappInstances[i];
        $.instances[inst.id] = inst.label || inst.id;
      }
    }
    updateConnectionStatus(statusData);
    buildInstanceFilter();
    loadContactTagsMap(); // US-009: Fetch phone→tags map for tag filtering
    loadContactUnitsMap(); // US-012: Fetch phone→unit map for left pane prefix
    loadContactDatesMap(); // US-014: Fetch phone→dates map for left pane date suffix
    loadCapsuleUnits(); // US-010: Pre-fetch capsule units for dropdown
    loadCmdTemplates(); // US-015: Pre-fetch command palette templates
    renderList($.conversations);
    refreshOverdueBell(); // US-022: Update payment reminder bell
    addOverdueBadgeToList(); // US-022: Add overdue badges to left pane

    // WhatsApp Web style: show last active conversation when none selected
    if ($.conversations.length > 0 && $.activePhone === null) {
      openConversation($.conversations[0].phone);
    }

    var container = document.getElementById('lc-messages');
    if (container && !container._lcContextMenuBound) {
      container._lcContextMenuBound = true;
      container.addEventListener('click', handleMessageChevronClick);
      bindContextMenuActions();
    }

    clearInterval($.autoRefresh);
    $.autoRefresh = setInterval(async function () {
      var section = document.getElementById('tab-live-chat');
      if (section && section.classList.contains('hidden')) {
        clearInterval($.autoRefresh);
        return;
      }
      try {
        var fresh = await api('/conversations');
        $.conversations = fresh;
        buildInstanceFilter();
        if ($.tagFilter && $.tagFilter.length > 0) loadContactTagsMap(); // US-009: Refresh tags map when filter active
        renderList($.conversations);
        if ($.activePhone) {
          await refreshChat();
          if ($.currentMode === 'copilot') {
            await checkPendingApprovals();
          }
        }
      } catch (e) { }
    }, 10000);

    clearInterval($.waStatusPoll);
    $.waStatusPoll = setInterval(pollConnectionStatus, 15000);

    // US-017: SSE connection for real-time read receipts
    initMessageStatusSSE();
  } catch (err) {
    console.error('[LiveChat] Load failed:', err);
    // Hide skeleton on error too (US-145)
    if (skeletonWrap) skeletonWrap.style.display = 'none';
  }
}

// ─── Cleanup (US-160) ─────────────────────────────────────────────
// Called when navigating away from the live-chat tab to stop background polling

export function cleanupLiveChat() {
  if ($.autoRefresh) {
    clearInterval($.autoRefresh);
    $.autoRefresh = null;
  }
  if ($.waStatusPoll) {
    clearInterval($.waStatusPoll);
    $.waStatusPoll = null;
  }
  // US-017: Close read receipt SSE
  if ($._statusSSE) {
    $._statusSSE.close();
    $._statusSSE = null;
  }
  console.log('[LiveChat] Cleanup: cleared all intervals');
}

/** Strip @s.whatsapp.net / @g.us from phone for display only. */
export function formatPhoneForDisplay(phone) {
  if (!phone || typeof phone !== 'string') return phone || '';
  return phone.replace(/@s\.whatsapp\.net$/i, '').replace(/@g\.us$/i, '');
}

// ─── Instance Filter ─────────────────────────────────────────────

export function buildInstanceFilter() {
  var select = document.getElementById('lc-instance-filter');
  if (!select) return;
  var instanceIds = new Set();
  for (var i = 0; i < $.conversations.length; i++) {
    if ($.conversations[i].instanceId) instanceIds.add($.conversations[i].instanceId);
  }
  var keys = Object.keys($.instances);
  for (var k = 0; k < keys.length; k++) {
    instanceIds.add(keys[k]);
  }

  var currentVal = select.value;
  var html = '<option value="">All (' + $.conversations.length + ')</option>';
  instanceIds.forEach(function (id) {
    var fullLabel = $.instances[id] || id;
    var count = $.conversations.filter(function (c) { return c.instanceId === id; }).length;
    var shortLabel = fullLabel.replace(/\s*\([0-9]+\)\s*/g, ' ').trim();
    if (shortLabel.length > 30) shortLabel = shortLabel.substring(0, 27) + '...';
    html += '<option value="' + escapeHtml(id) + '" title="' + escapeAttr(fullLabel) + '">' +
      escapeHtml(shortLabel) + ' (' + count + ')</option>';
  });
  var unknownCount = $.conversations.filter(function (c) { return !c.instanceId; }).length;
  if (unknownCount > 0) {
    html += '<option value="__unknown__">Unknown (' + unknownCount + ')</option>';
  }
  select.innerHTML = html;
  select.value = currentVal;
}

// ─── Display Name Helper (US-012) ────────────────────────────────

/**
 * Build display name for left pane: [Unit]-[Name] - [DateCode]
 * Unit prefix and date suffix only appear in left pane conversation list.
 * Date code format: [checkInDay][checkOutDay][checkInMonth] (all zero-padded)
 * Example: check-in 2025-01-31, check-out 2025-02-01 → "310101"
 * @param {string} phone - Contact phone number
 * @param {string} name - Push name or fallback
 * @returns {string} Formatted display name
 */
export function getDisplayName(phone, name) {
  var unit = $.contactUnitsMap[phone] || '';
  var result = unit ? unit + '-' + name : name;
  var dates = $.contactDatesMap[phone];
  if (dates && dates.checkIn && dates.checkOut) {
    var dateCode = buildDateCode(dates.checkIn, dates.checkOut);
    if (dateCode) result = result + ' - ' + dateCode;
  }
  return result;
}

/**
 * Build DDDDMM date code from ISO date strings.
 * @param {string} checkIn - ISO date string (YYYY-MM-DD)
 * @param {string} checkOut - ISO date string (YYYY-MM-DD)
 * @returns {string} Date code e.g. "310101" or empty string if invalid
 */
function buildDateCode(checkIn, checkOut) {
  var ci = parseLocalDate(checkIn);
  var co = parseLocalDate(checkOut);
  if (!ci || !co) return '';
  var ciDay = String(ci.getDate()).padStart(2, '0');
  var coDay = String(co.getDate()).padStart(2, '0');
  var ciMonth = String(ci.getMonth() + 1).padStart(2, '0');
  return ciDay + coDay + ciMonth;
}

/**
 * Parse YYYY-MM-DD as local date (not UTC).
 * @param {string} s - ISO date string
 * @returns {Date|null}
 */
function parseLocalDate(s) {
  if (!s || typeof s !== 'string') return null;
  var parts = s.split('-');
  if (parts.length !== 3) return null;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) - 1;
  var d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

// ─── Conversation List ───────────────────────────────────────────

export function renderList(conversations) {
  var list = document.getElementById('lc-chat-list');
  var empty = document.getElementById('lc-sidebar-empty');
  var skeleton = document.getElementById('lc-skeleton-wrap');
  if (!list) return;

  // Always hide skeleton when rendering real data (US-145)
  if (skeleton) skeleton.style.display = 'none';

  if (!conversations.length) {
    if (empty) empty.style.display = '';
    list.innerHTML = '';
    if (empty) list.appendChild(empty);
    return;
  }
  if (empty) empty.style.display = 'none';

  var searchEl = document.getElementById('lc-search');
  var searchVal = (searchEl ? searchEl.value : '').toLowerCase();
  var instanceEl = document.getElementById('lc-instance-filter');
  var instanceVal = instanceEl ? instanceEl.value : '';

  // Update date filters from inputs
  updateDateFilterFromInputs();

  var filtered = conversations;
  if (instanceVal === '__unknown__') {
    filtered = filtered.filter(function (c) { return !c.instanceId; });
  } else if (instanceVal) {
    filtered = filtered.filter(function (c) { return c.instanceId === instanceVal; });
  }
  if (searchVal) {
    filtered = filtered.filter(function (c) {
      var displayName = getDisplayName(c.phone, c.pushName || '');
      return displayName.toLowerCase().includes(searchVal) ||
        c.phone.toLowerCase().includes(searchVal) ||
        (c.lastMessage || '').toLowerCase().includes(searchVal);
    });
  }

  // Apply date range filter
  if ($.dateFilterFrom || $.dateFilterTo) {
    filtered = filtered.filter(function (c) {
      if (!c.lastMessageAt) return false;
      var msgDate = new Date(c.lastMessageAt);
      if ($.dateFilterFrom && msgDate < $.dateFilterFrom) return false;
      if ($.dateFilterTo && msgDate > $.dateFilterTo) return false;
      return true;
    });
  }

  // Apply filter chips
  if ($.activeFilter === 'unread') {
    filtered = filtered.filter(function (c) { return (c.unreadCount || 0) > 0; });
  } else if ($.activeFilter === 'favourites') {
    filtered = filtered.filter(function (c) { return c.favourite; });
  } else if ($.activeFilter === 'groups') {
    filtered = filtered.filter(function (c) { return c.phone && c.phone.indexOf('@g.us') !== -1; });
  }

  // Apply tag filter (US-009)
  if ($.tagFilter && $.tagFilter.length > 0) {
    filtered = filtered.filter(function (c) {
      var contactTags = $.contactTagsMap[c.phone];
      if (!contactTags || !Array.isArray(contactTags) || contactTags.length === 0) return false;
      var lowerTags = contactTags.map(function (t) { return t.toLowerCase(); });
      // Match if contact has ANY of the selected tags
      return $.tagFilter.some(function (ft) {
        return lowerTags.indexOf(ft.toLowerCase()) !== -1;
      });
    });
  }

  // Apply unit filter (US-013)
  if ($.unitFilter) {
    filtered = filtered.filter(function (c) {
      var contactUnit = $.contactUnitsMap[c.phone];
      return contactUnit && contactUnit.toLowerCase() === $.unitFilter.toLowerCase();
    });
  }

  // Sort: pinned first, then by most recent
  filtered.sort(function (a, b) {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.lastMessageAt - a.lastMessageAt;
  });

  if (!filtered.length) {
    list.innerHTML = '<div class="lc-sidebar-empty"><p>No matching conversations.</p></div>';
    return;
  }

  list.innerHTML = filtered.map(function (c) {
    var initials = (c.pushName || '?').slice(0, 2).toUpperCase();
    var time = formatRelativeTime(c.lastMessageAt);
    var preview = c.lastMessage || '';
    if (c.lastMessageRole === 'assistant') preview = '\uD83E\uDD16 ' + preview;
    if (preview.length > 45) preview = preview.substring(0, 42) + '...';
    var isActive = c.phone === $.activePhone ? ' active' : '';
    var unreadCount = typeof c.unreadCount === 'number' ? c.unreadCount : 0;
    var unread = unreadCount > 0 ? '<div class="lc-unread">' + Math.min(unreadCount, 99) + '</div>' : '';

    var chevronSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    var hoverActions = '<div class="lc-hover-actions">' +
      '<button class="lc-ha-btn lc-ha-menu" onclick="event.stopPropagation();lcToggleChatDropdown(\'' + escapeAttr(c.phone) + '\',this)" title="More options">' + chevronSvg + '</button>' +
      '</div>';

    var bottomIcons = '';
    if (c.favourite) bottomIcons += '<span class="lc-fav-indicator" title="Favourite"><svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>';
    if (c.pinned) bottomIcons += '<span class="lc-pin-indicator" title="Pinned"><svg width="12" height="12" viewBox="0 0 24 24" fill="#8696a0" stroke="none"><path d="M9 4v6l-2 4h10l-2-4V4M12 14v7M8 4h8"/></svg></span>';

    return '<div class="lc-chat-item' + isActive + '" onclick="lcOpenConversation(\'' + escapeAttr(c.phone) + '\')">' +
      '<div class="lc-avatar">' + avatarImg(c.phone, initials) + '</div>' +
      '<div class="lc-chat-info">' +
      '<div class="lc-chat-top">' +
      '<span class="lc-chat-name">' + escapeHtml(getDisplayName(c.phone, c.pushName || formatPhoneForDisplay(c.phone))) + '</span>' +
      '<span class="lc-chat-time">' + time + '</span>' +
      hoverActions +
      '</div>' +
      '<div class="lc-chat-bottom">' +
      '<span class="lc-chat-preview">' + escapeHtml(preview) + '</span>' +
      '<span class="lc-bottom-icons">' + bottomIcons + unread + '</span>' +
      '</div>' +
      '</div>' +
      '</div>';
  }).join('');
}

export function filterConversations() {
  renderList($.conversations);
}

export function debouncedSearch() {
  clearTimeout($.sidebarSearchDebounce);
  $.sidebarSearchDebounce = setTimeout(function () {
    renderList($.conversations);
  }, 300);
}

// ─── Chat View ───────────────────────────────────────────────────

export function hasSystemContent(content) {
  if (!content || typeof content !== 'string') return false;
  return content.indexOf('\n\n{"intent":') > 0 || content.indexOf('Please note: I may not have complete information') > 0;
}

export function getUserMessage(content) {
  if (!content || typeof content !== 'string') return content;
  var s = content;
  var jsonStart = s.indexOf('\n\n{"intent":');
  if (jsonStart > 0) s = s.slice(0, jsonStart).trim();
  var disclaimerIdx = s.indexOf('Please note: I may not have complete information');
  if (disclaimerIdx > 0) s = s.slice(0, disclaimerIdx).replace(/\n+$/, '').trim();
  return s;
}

export function formatSystemContent(content) {
  if (!content || typeof content !== 'string') return linkifyUrls(escapeHtml(content));

  var parts = content.split('\n\n{"intent":');
  if (parts.length === 1) return linkifyUrls(escapeHtml(content));

  var userMsg = parts[0].trim();
  var jsonPart = '{"intent":' + parts[1];

  var prettyJson = jsonPart;
  try {
    var parsed = JSON.parse(jsonPart);
    prettyJson = JSON.stringify(parsed, null, 2);
  } catch (e) { }

  return '<div class="lc-user-msg">' + linkifyUrls(escapeHtml(userMsg)) + '</div>' +
    '<div class="lc-system-data">' +
    '<div class="lc-system-label">System Debug Info:</div>' +
    '<pre class="lc-system-json">' + escapeHtml(prettyJson) + '</pre>' +
    '</div>';
}

export function getNonTextPlaceholder(content) {
  if (!content || typeof content !== 'string') return null;
  var trimmed = content.trim();
  var map = {
    '[Voice message]': { label: 'Voice message', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>' },
    '[Image]': { label: 'Image', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>' },
    '[Video]': { label: 'Video', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>' },
    '[Sticker]': { label: 'Sticker', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>' },
    '[Document]': { label: 'Document', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>' },
    '[Contact]': { label: 'Contact', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
    '[Location]': { label: 'Location', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>' }
  };
  return map[trimmed] || null;
}

export async function openConversation(phone) {
  $.activePhone = phone;
  clearFile();
  cancelReply();
  hideTranslatePreview();
  mobileShowChat(); // US-092: Switch to chat view on mobile
  if ($.contactPanelOpen) loadContactDetails();
  document.querySelectorAll('.lc-chat-item').forEach(function (el) { el.classList.remove('active'); });
  document.querySelectorAll('.lc-chat-item').forEach(function (el) {
    if (el.onclick && el.onclick.toString().includes(phone)) el.classList.add('active');
  });

  // US-006: Optimistic UI — render cached conversation immediately
  var cached = $.conversationCache.get(phone);
  if (cached) {
    renderChat(cached.log);
    updateMessageIndicators();
  }

  // US-006: Show subtle loading spinner if fetch takes >500ms
  var spinnerTimer = null;
  if (!cached) {
    // No cache: show spinner immediately (first load)
    _showChatSpinner(true);
  } else {
    // Have cache: show spinner only if refresh takes >500ms
    spinnerTimer = setTimeout(function () { _showChatSpinner(true); }, 500);
  }

  try {
    var log = await api('/conversations/' + encodeURIComponent(phone));

    // US-006: Clear spinner timer and hide spinner
    if (spinnerTimer) clearTimeout(spinnerTimer);
    _showChatSpinner(false);

    // Only re-render if this is still the active conversation
    if ($.activePhone !== phone) return;

    // US-006: Cache the fresh response
    $.conversationCache.set(phone, { log: log, cachedAt: Date.now() });
    // Limit cache size to 50 conversations to prevent memory bloat
    if ($.conversationCache.size > 50) {
      var oldest = $.conversationCache.keys().next().value;
      $.conversationCache.delete(oldest);
    }

    // Only re-render if data actually changed (skip if cached version was identical)
    var msgCount = (log.messages || []).length;
    var cachedMsgCount = cached ? (cached.log.messages || []).length : -1;
    var lastMsgTs = msgCount > 0 ? log.messages[msgCount - 1].timestamp : 0;
    var cachedLastTs = cachedMsgCount > 0 ? cached.log.messages[cachedMsgCount - 1].timestamp : -1;
    if (!cached || msgCount !== cachedMsgCount || lastMsgTs !== cachedLastTs) {
      renderChat(log);
    }

    await loadMessageMetadata();
    updateMessageIndicators();
    await api('/conversations/' + encodeURIComponent(phone) + '/read', { method: 'PATCH' }).catch(function () { });
    var idx = $.conversations.findIndex(function (c) { return c.phone === phone; });
    if (idx >= 0) $.conversations[idx].unreadCount = 0;
    renderList($.conversations);

    try {
      if (log && log.responseMode) {
        $.currentMode = log.responseMode;
      } else {
        var status = await api('/status');
        $.currentMode = status.response_modes?.default_mode || 'autopilot';
      }
      updateModeUI($.currentMode);

      if ($.currentMode === 'copilot') {
        await checkPendingApprovals();
      }
    } catch (err) {
      console.error('[LiveChat] Failed to load mode:', err);
    }
  } catch (err) {
    if (spinnerTimer) clearTimeout(spinnerTimer);
    _showChatSpinner(false);
    console.error('[LiveChat] Failed to load conversation:', err);
  }
}

/** US-006: Show/hide a subtle loading spinner overlay on the messages area */
function _showChatSpinner(show) {
  var container = document.getElementById('lc-messages');
  if (!container) return;
  var existing = container.querySelector('.lc-chat-spinner');
  if (show && !existing) {
    var spinner = document.createElement('div');
    spinner.className = 'lc-chat-spinner';
    spinner.innerHTML = '<div class="lc-chat-spinner-dot"></div>';
    container.appendChild(spinner);
  } else if (!show && existing) {
    existing.remove();
  }
}

export function renderChat(log) {
  document.getElementById('lc-empty-state').style.display = 'none';
  var chat = document.getElementById('lc-active-chat');
  chat.style.display = 'flex';

  var initials = (log.pushName || '?').slice(0, 2).toUpperCase();
  document.getElementById('lc-header-avatar').innerHTML = avatarImg(log.phone, initials);
  document.getElementById('lc-header-name').textContent = log.pushName || 'Unknown';
  document.getElementById('lc-header-phone').textContent = '+' + formatPhoneForDisplay(log.phone);

  $.lastMessages = log.messages || [];

  var container = document.getElementById('lc-messages');
  var html = '';
  var lastDate = '';
  var query = $.searchOpen ? $.searchQuery.toLowerCase() : '';

  for (var i = 0; i < $.lastMessages.length; i++) {
    var msg = $.lastMessages[i];
    var msgDate = new Date(msg.timestamp).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
    if (msgDate !== lastDate) {
      html += '<div class="lc-date-sep"><span>' + msgDate + '</span></div>';
      lastDate = msgDate;
    }

    var isGuest = msg.role === 'user';
    var side = isGuest ? 'guest' : 'bot';
    var time = new Date(msg.timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
    var content = msg.content || '';
    var isSystemMsg = !isGuest && hasSystemContent(content);
    var displayContent = isGuest ? content : (isSystemMsg ? content : getUserMessage(content));

    var checkmark = '';
    if (!isGuest) {
      // US-017: Status-aware ticks — default to delivered (double grey)
      // Single tick: server acknowledged; Double grey: delivered; Double blue: read
      checkmark = '<span class="lc-ticks lc-ticks-delivered" data-msg-idx-tick="' + i + '">' +
        '<svg viewBox="0 0 16 11" width="16" height="11">' +
        '<path d="M11.07.86l-1.43.77L5.64 7.65 2.7 5.32l-1.08 1.3L5.88 9.9l5.19-9.04z" fill="currentColor"/>' +
        '<path d="M15.07.86l-1.43.77L9.64 7.65 8.8 7.01l-.86 1.5 2.04 1.39 5.09-9.04z" fill="currentColor"/>' +
        '</svg></span>';
    }

    var manualTag = '';
    if (!isGuest && msg.manual) {
      var staffLabel = (msg.staffName ? escapeHtml(msg.staffName) : null) || $.staffName || 'Staff';
      manualTag = '<span class="lc-manual-tag">' + staffLabel + '</span>';
    }

    var isCurrentMatch = $.searchCurrent >= 0 && $.searchMatches[$.searchCurrent] === i;
    var isAnyMatch = query && displayContent.toLowerCase().includes(query);

    var bubbleContent = '';
    var nonTextPlaceholder = getNonTextPlaceholder(displayContent);
    var mediaMatch = displayContent.match(/^\[(photo|video|document):\s*(.+?)\](.*)$/s);

    // Prepend bot avatar emoji for AI/bot messages (not from staff)
    var botAvatarPrefix = '';
    if (!isGuest && !msg.manual) {
      var avatarEmoji = window._botAvatar || '\uD83E\uDD16';
      botAvatarPrefix = '<span class="lc-bot-avatar">' + avatarEmoji + ' </span>';
    }

    if (isSystemMsg) {
      bubbleContent = '<div class="lc-bubble-text">' + botAvatarPrefix + formatSystemContent(displayContent) + '</div>';
    } else if (nonTextPlaceholder) {
      bubbleContent = '<div class="lc-media-placeholder">' + nonTextPlaceholder.icon + '<span class="lc-media-filename">' + escapeHtml(nonTextPlaceholder.label) + '</span></div>';
    } else if (mediaMatch) {
      var mediaType = mediaMatch[1];
      var fileName = mediaMatch[2];
      var caption = mediaMatch[3].trim();
      var icon = mediaType === 'photo' ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>'
        : mediaType === 'video' ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>'
          : '<svg width="32" height="32" viewBox="0 0 24 24" fill="#00a884" opacity="0.6"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>';
      bubbleContent = '<div class="lc-media-placeholder">' + icon + '<span class="lc-media-filename">' + escapeHtml(fileName) + '</span></div>';
      if (caption) {
        bubbleContent += '<div class="lc-bubble-text">' + highlightText(caption, query, isCurrentMatch) + '</div>';
      }
    } else {
      bubbleContent = '<div class="lc-bubble-text">' + botAvatarPrefix + highlightText(displayContent, query, isCurrentMatch) + '</div>';
    }

    var matchClass = isCurrentMatch ? ' lc-search-focus' : (isAnyMatch ? ' lc-search-match' : '');
    var systemClass = isSystemMsg ? ' lc-system-msg' : '';
    var chevronSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';

    html += '<div class="lc-bubble-wrap ' + side + '" data-msg-idx="' + i + '">' +
      '<div class="lc-bubble ' + side + matchClass + systemClass + '">' +
      bubbleContent +
      '<div class="lc-bubble-meta">' +
      manualTag +
      '<span class="lc-bubble-time">' + time + '</span>' +
      checkmark +
      '<button type="button" class="lc-bubble-chevron" data-msg-idx="' + i + '" title="Message options" aria-label="Message options">' + chevronSvg + '</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  container.innerHTML = html;

  if (container && !container._lcContextMenuBound) {
    container._lcContextMenuBound = true;
    container.addEventListener('click', handleMessageChevronClick);
    bindContextMenuActions();
  }

  if ($.searchCurrent >= 0 && $.searchMatches.length > 0) {
    scrollToMatch($.searchMatches[$.searchCurrent]);
  } else {
    container.scrollTop = container.scrollHeight;
  }
}

function scrollToMatch(msgIdx) {
  var container = document.getElementById('lc-messages');
  if (!container) return;
  var el = container.querySelector('[data-msg-idx="' + msgIdx + '"]');
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

/** Convert plain URLs in text to clickable <a> tags — delegates to global utils */
function linkifyUrls(html) {
  return window.linkifyUrls ? window.linkifyUrls(html) : html;
}

export function highlightText(text, query, isFocused) {
  var escaped = escapeHtml(text);
  // Linkify URLs before highlight wrapping
  escaped = linkifyUrls(escaped);
  if (!query) return escaped;
  var escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp('(' + escapedQuery + ')', 'gi');
  var cls = isFocused ? 'lc-hl lc-hl-focus' : 'lc-hl';
  return escaped.replace(re, '<mark class="' + cls + '">$1</mark>');
}

export async function refreshChat() {
  if (!$.activePhone) return;
  try {
    var log = await api('/conversations/' + encodeURIComponent($.activePhone));
    // US-006: Update cache on refresh
    $.conversationCache.set($.activePhone, { log: log, cachedAt: Date.now() });
    renderChat(log);
    updateMessageIndicators();
  } catch (e) { }
}

// ─── US-017: Read Receipts SSE ──────────────────────────────────────

/**
 * Connect to SSE stream for real-time message status updates (read receipts).
 * When a message_status event arrives for the active phone, update the
 * tick icons on bot message bubbles.
 */
function initMessageStatusSSE() {
  if ($._statusSSE) {
    $._statusSSE.close();
    $._statusSSE = null;
  }

  try {
    var baseUrl = (window.API || '').replace(/\/api\/rainbow$/, '');
    var sseUrl = baseUrl + '/api/rainbow/conversations/events';
    $._statusSSE = new EventSource(sseUrl);

    $._statusSSE.addEventListener('message_status', function (e) {
      try {
        var data = JSON.parse(e.data);
        if (!data.phone || !$.activePhone) return;

        // Normalize phone for comparison
        var eventPhone = data.phone.replace(/@s\.whatsapp\.net$/i, '');
        var activePhone = $.activePhone.replace(/@s\.whatsapp\.net$/i, '');
        if (eventPhone !== activePhone) return;

        updateTickStatus(data.status);
      } catch (err) { /* ignore parse errors */ }
    });

    $._statusSSE.onerror = function () {
      // EventSource will auto-reconnect
    };
  } catch (err) {
    console.warn('[LiveChat] Failed to init message status SSE:', err);
  }
}

/**
 * Update all bot tick icons in the current chat view based on status.
 * Status codes: 1=sent (single grey), 2=delivered (double grey), 3=read (double blue)
 * All messages before the latest status are assumed to have the same or higher status.
 */
function updateTickStatus(status) {
  var ticks = document.querySelectorAll('.lc-ticks');
  if (!ticks.length) return;

  for (var i = 0; i < ticks.length; i++) {
    var tick = ticks[i];
    // Remove existing status classes
    tick.classList.remove('lc-ticks-sent', 'lc-ticks-delivered', 'lc-ticks-read');

    if (status >= 3) {
      tick.classList.add('lc-ticks-read');
    } else if (status >= 2) {
      tick.classList.add('lc-ticks-delivered');
    } else {
      tick.classList.add('lc-ticks-sent');
    }
  }
}
