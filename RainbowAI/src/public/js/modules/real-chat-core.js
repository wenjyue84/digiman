// ═══════════════════════════════════════════════════════════════════
// Real Chat Core - Init, dev mode, connection, list, chat rendering
// ═══════════════════════════════════════════════════════════════════

import { $, translationHelper } from './real-chat-state.js';
import { avatarImg } from './live-chat-state.js';
import { refreshActiveChat } from './real-chat-messaging.js';

const api = window.api;
const linkifyUrls = window.linkifyUrls || function(h) { return h; };

// US-001: Format token count for display (1234 → '1.2K', 89 → '89')
function fmtTokenCount(n) {
  if (n == null) return 'N/A';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

// ─── SSE fallback polling interval (US-159) ─────────────────────
const SSE_FALLBACK_POLL_MS = 15000; // 15s polling when SSE is disconnected

// ─── Auto-refresh UI helpers ─────────────────────────────────────

function updateRefreshTimestamp() {
  const el = document.getElementById('rc-last-refresh');
  if (!el) return;

  const elapsed = Math.floor((Date.now() - $.lastRefreshAt) / 1000);
  if (elapsed < 2) {
    el.textContent = 'Updated just now';
  } else if (elapsed < 60) {
    el.textContent = 'Updated ' + elapsed + 's ago';
  } else {
    el.textContent = 'Updated ' + Math.floor(elapsed / 60) + 'm ago';
  }
}

function flashNewMessages(count) {
  const container = document.getElementById('rc-messages');
  if (!container) return;

  const bubbles = container.querySelectorAll('.rc-bubble-wrap');
  if (bubbles.length < count) return;

  for (let i = bubbles.length - count; i < bubbles.length; i++) {
    const bubble = bubbles[i];
    bubble.classList.add('rc-message-flash');
    setTimeout(() => bubble.classList.remove('rc-message-flash'), 1200);
  }
}

// ─── Developer Mode ──────────────────────────────────────────────

export function toggleDevMode() {
  const currentMode = StateManager.get('realChat.devMode');
  const newMode = !currentMode;
  StateManager.set('realChat.devMode', newMode);

  const btn = document.getElementById('rc-dev-toggle');
  if (newMode) {
    btn.classList.add('active');
    btn.textContent = '🔧 Dev ✓';
  } else {
    btn.classList.remove('active');
    btn.textContent = '🔧 Dev';
  }

  const searchToggle = document.getElementById('rc-search-toggle');
  if (searchToggle) searchToggle.style.display = newMode ? '' : 'none';

  if (!newMode && $.searchOpen) {
    toggleRcSearch();
  }

  if ($.activePhone) refreshActiveChat();
}

export function toggleRcSearch() {
  $.searchOpen = !$.searchOpen;
  if (typeof SearchPanel !== 'undefined') {
    if ($.searchOpen) {
      SearchPanel.init({ containerId: 'rc-search-container', messagesContainerId: 'rc-messages' });
      SearchPanel.open();
    } else {
      SearchPanel.close();
    }
  }
}

// ─── WhatsApp connection status ──────────────────────────────────

function updateRcConnectionStatus(statusData) {
  const bar = document.getElementById('rc-wa-status-bar');
  if (!bar) return;
  const instances = (statusData && statusData.whatsappInstances) || [];
  const connected = instances.some(i => i.state === 'open');
  const connecting = !connected && instances.some(i => i.state === 'connecting');

  bar.classList.remove('wa-connected', 'wa-disconnected', 'wa-connecting');
  const barClass = connected ? 'wa-connected' : connecting ? 'wa-connecting' : 'wa-disconnected';
  bar.classList.add(barClass);

  const text = bar.querySelector('.wa-connection-text');
  if (text) {
    text.textContent = connected ? 'WhatsApp Connected'
      : connecting ? 'Connecting...'
      : 'Disconnected';
  }
  if ($.waWasConnected === true && !connected) {
    $.waWasConnected = false;
    alert('WhatsApp disconnected. Messages cannot be sent. Check Connect \u2192 Dashboard or scan QR at /admin/whatsapp-qr.');
  } else {
    $.waWasConnected = connected;
  }
}

async function pollRcConnectionStatus() {
  const content = document.getElementById('live-simulation-content');
  if (content && content.classList.contains('hidden')) return;
  try {
    const statusData = await api('/status');
    updateRcConnectionStatus(statusData);
  } catch (e) { }
}

// ─── Shared refresh logic (used by SSE handler and polling fallback) ──

async function doConversationRefresh() {
  // Skip if tab is hidden
  if (document.getElementById('live-simulation-content')?.classList.contains('hidden')) {
    return;
  }

  const indicator = document.getElementById('rc-refresh-indicator');
  if (indicator) indicator.classList.add('refreshing');

  try {
    const fresh = await api('/conversations');
    $.conversations = fresh;
    buildInstanceFilter();
    renderConversationList($.conversations);

    if ($.activePhone) {
      const oldCount = $.lastLog?.messages.length || 0;
      await refreshActiveChat();
      const newCount = $.lastLog?.messages.length || 0;
      if (newCount > oldCount) {
        flashNewMessages(newCount - oldCount);
      }
    }

    updateRefreshTimestamp();
  } catch (e) {
    console.error('[RealChat] Refresh error:', e);
  } finally {
    if (indicator) indicator.classList.remove('refreshing');
  }
}

// ─── SSE Connection (US-159) ─────────────────────────────────────
// Connects to /api/rainbow/conversations/events for real-time push
// notifications. Falls back to 15s polling if SSE fails.

function connectConversationSSE() {
  // Tear down any existing connection or polling
  disconnectConversationSSE();

  const baseUrl = window.location.origin;
  const sseUrl = baseUrl + '/api/rainbow/conversations/events';

  try {
    $.eventSource = new EventSource(sseUrl);
    console.log('[RealChat] SSE connecting to', sseUrl);

    $.eventSource.addEventListener('connected', function() {
      $.sseConnected = true;
      console.log('[RealChat] SSE connected — real-time updates active');
      // Clear fallback polling if it was running
      if ($.autoRefresh) {
        clearInterval($.autoRefresh);
        $.autoRefresh = null;
      }
    });

    $.eventSource.addEventListener('conversation_update', function(e) {
      try {
        const data = JSON.parse(e.data);
        console.log('[RealChat] SSE conversation_update:', data.type, data.phone);
      } catch (err) {
        console.warn('[RealChat] SSE parse error:', err);
      }
      // Trigger a full refresh (fetches data via existing REST API)
      doConversationRefresh();
    });

    $.eventSource.onerror = function() {
      $.sseConnected = false;
      console.warn('[RealChat] SSE error — falling back to 15s polling');
      // EventSource will auto-reconnect, but start fallback polling meanwhile
      startFallbackPolling();
    };

    $.eventSource.onopen = function() {
      $.sseConnected = true;
      // SSE reconnected — stop fallback polling
      if ($.autoRefresh) {
        clearInterval($.autoRefresh);
        $.autoRefresh = null;
        console.log('[RealChat] SSE reconnected — stopped fallback polling');
      }
    };
  } catch (err) {
    console.error('[RealChat] SSE init failed, using 15s polling:', err);
    startFallbackPolling();
  }
}

function startFallbackPolling() {
  // Don't start if already polling
  if ($.autoRefresh) return;

  $.autoRefresh = setInterval(function() {
    if (document.getElementById('live-simulation-content')?.classList.contains('hidden')) {
      clearInterval($.autoRefresh);
      $.autoRefresh = null;
      return;
    }
    doConversationRefresh();
  }, SSE_FALLBACK_POLL_MS);

  console.log('[RealChat] Fallback polling started (' + SSE_FALLBACK_POLL_MS / 1000 + 's interval)');
}

function disconnectConversationSSE() {
  if ($.eventSource) {
    $.eventSource.close();
    $.eventSource = null;
    $.sseConnected = false;
  }
  if ($.autoRefresh) {
    clearInterval($.autoRefresh);
    $.autoRefresh = null;
  }
}

// ─── Main Load Function ──────────────────────────────────────────

export async function loadRealChat() {
  // Set up translationHelper.onSend callback
  translationHelper.onSend = async () => await refreshActiveChat();

  const devMode = StateManager.get('realChat.devMode');
  const devBtn = document.getElementById('rc-dev-toggle');
  if (devMode) {
    devBtn.classList.add('active');
    devBtn.textContent = '🔧 Dev ✓';
  }

  const searchToggle = document.getElementById('rc-search-toggle');
  if (searchToggle) searchToggle.style.display = devMode ? '' : 'none';

  if (typeof SearchPanel !== 'undefined') {
    SearchPanel.init({ containerId: 'rc-search-container', messagesContainerId: 'rc-messages' });
  }

  // US-182: Scroll-to-bottom button — show when user scrolls up
  const rcMsgs = document.getElementById('rc-messages');
  const rcScrollBtn = document.getElementById('rc-scroll-bottom');
  if (rcMsgs && rcScrollBtn) {
    rcMsgs.addEventListener('scroll', function() {
      const distFromBottom = rcMsgs.scrollHeight - rcMsgs.scrollTop - rcMsgs.clientHeight;
      rcScrollBtn.style.display = distFromBottom > 200 ? 'flex' : 'none';
    });
  }

  const translateMode = StateManager.get('realChat.translateMode');
  const translateLang = StateManager.get('realChat.translateLang');
  const translateBtn = document.getElementById('rc-translate-toggle');
  const langSelector = document.getElementById('rc-lang-selector');
  if (translateMode) {
    translateBtn.classList.add('active');
    translateBtn.textContent = '🌐 Translate ✓';
    langSelector.style.display = '';
    langSelector.value = translateLang;
  }

  try {
    const [convos, statusData] = await Promise.all([
      api('/conversations'),
      api('/status')
    ]);
    $.conversations = convos;

    $.instances = {};
    if (statusData.whatsappInstances) {
      for (const inst of statusData.whatsappInstances) {
        $.instances[inst.id] = inst.label || inst.id;
      }
    }
    updateRcConnectionStatus(statusData);
    buildInstanceFilter();
    renderConversationList(convos);
    $.lastRefreshAt = Date.now();
    updateRefreshTimestamp();

    // US-015: Load contact tags + units for filter chips (mirrors US-004)
    loadRcContactMaps();

    if ($.conversations.length > 0 && $.activePhone === null) {
      openConversation($.conversations[0].phone);
    }

    // US-159: Connect SSE for real-time updates (replaces 3s polling)
    connectConversationSSE();

    clearInterval($.waStatusPoll);
    $.waStatusPoll = setInterval(pollRcConnectionStatus, 15000);

    clearInterval(window._rcTimestampUpdater);
    window._rcTimestampUpdater = setInterval(() => {
      if (document.getElementById('live-simulation-content')?.classList.contains('hidden')) {
        clearInterval(window._rcTimestampUpdater);
        return;
      }
      updateRefreshTimestamp();
    }, 1000);
  } catch (err) {
    console.error('[RealChat] Failed to load conversations:', err);
  }
}

// ─── Instance Filter ─────────────────────────────────────────────

export function buildInstanceFilter() {
  const select = document.getElementById('rc-instance-filter');
  const instanceIds = new Set();
  for (const c of $.conversations) {
    if (c.instanceId) instanceIds.add(c.instanceId);
  }
  for (const id of Object.keys($.instances)) {
    instanceIds.add(id);
  }

  const currentVal = select.value;
  let html = '<option value="">All Instances (' + $.conversations.length + ')</option>';
  for (const id of instanceIds) {
    const fullLabel = $.instances[id] || id;
    const count = $.conversations.filter(c => c.instanceId === id).length;

    let shortLabel = fullLabel.replace(/\s*\([0-9]+\)\s*/g, ' ').trim();
    if (shortLabel.length > 30) {
      shortLabel = shortLabel.substring(0, 27) + '...';
    }

    html += '<option value="' + escapeHtml(id) + '" title="' + escapeAttr(fullLabel) + '">' +
      escapeHtml(shortLabel) + ' (' + count + ')</option>';
  }
  const unknownCount = $.conversations.filter(c => !c.instanceId).length;
  if (unknownCount > 0) {
    html += '<option value="__unknown__">Unknown Instance (' + unknownCount + ')</option>';
  }
  select.innerHTML = html;
  select.value = currentVal;
}

// ─── Conversation List ───────────────────────────────────────────

export function renderConversationList(conversations) {
  const list = document.getElementById('rc-chat-list');
  if (!list) return;
  let empty = document.getElementById('rc-sidebar-empty');

  if (empty && empty.parentNode) {
    empty.parentNode.removeChild(empty);
  }

  if (!conversations.length) {
    list.innerHTML = '';
    if (empty) {
      empty.style.display = '';
      list.appendChild(empty);
    }
    return;
  }

  const searchVal = (document.getElementById('rc-search').value || '').toLowerCase();
  const instanceVal = document.getElementById('rc-instance-filter').value;

  let filtered = conversations;
  if (instanceVal === '__unknown__') {
    filtered = filtered.filter(c => !c.instanceId);
  } else if (instanceVal) {
    filtered = filtered.filter(c => c.instanceId === instanceVal);
  }
  if (searchVal) {
    filtered = filtered.filter(c =>
      (c.pushName || '').toLowerCase().includes(searchVal) ||
      c.phone.toLowerCase().includes(searchVal) ||
      (c.lastMessage || '').toLowerCase().includes(searchVal)
    );
  }

  // US-015: Apply chip filter (mirrors US-003/US-004)
  if ($.activeFilter === 'waiting') {
    filtered = filtered.filter(c => c.lastMessageRole === 'user');
  }
  if ($.tagFilter && $.tagFilter.length > 0) {
    filtered = filtered.filter(c => {
      var tags = $.contactTagsMap[c.phone] || [];
      return $.tagFilter.some(t => tags.indexOf(t) >= 0);
    });
  }
  if ($.unitFilter) {
    filtered = filtered.filter(c => $.contactUnitsMap[c.phone] === $.unitFilter);
  }

  if (!filtered.length) {
    list.innerHTML = '<div class="rc-sidebar-empty"><p>No matching conversations.</p></div>';
    return;
  }

  list.innerHTML = filtered.map(c => {
    const initials = (c.pushName || '?').slice(0, 2).toUpperCase();
    const time = formatRelativeTime(c.lastMessageAt);
    const preview = c.lastMessageRole === 'assistant' ? '🤖 ' + c.lastMessage : c.lastMessage;
    const isActive = c.phone === $.activePhone ? ' active' : '';
    const instanceLabel = c.instanceId ? ($.instances[c.instanceId] || c.instanceId) : '';
    const instanceBadge = instanceLabel ? '<span class="rc-instance-badge">' + escapeHtml(instanceLabel) + '</span>' : '';
    return '<div class="rc-chat-item' + isActive + '" onclick="openConversation(\'' + escapeAttr(c.phone) + '\')">' +
      '<div class="rc-avatar">' + avatarImg(c.phone, initials) + '</div>' +
      '<div class="rc-chat-info">' +
      '<div class="rc-chat-name">' + escapeHtml(c.pushName || c.phone) + ' ' + instanceBadge + '</div>' +
      '<div class="rc-chat-preview">' + escapeHtml(preview) + '</div>' +
      '</div>' +
      '<div class="rc-chat-meta">' +
      '<div class="rc-chat-time">' + time + '</div>' +
      '<div class="rc-chat-count">' + c.messageCount + '</div>' +
      '</div>' +
      '</div>';
  }).join('');

  if (empty) {
    empty.style.display = 'none';
    list.appendChild(empty);
  }
}

let _filterDebounceTimer = null;

export function filterConversations() {
  clearTimeout(_filterDebounceTimer);
  _filterDebounceTimer = setTimeout(() => {
    console.log('[RealChat] Filter triggered');
    renderConversationList($.conversations);
  }, 300);
}

// ─── US-015: Filter Chips (mirrors US-003/US-004) ───────────────

/** Load contact tags + units maps from API */
async function loadRcContactMaps() {
  try {
    const [tagsMap, unitsMap] = await Promise.all([
      api('/contacts/tags-map').catch(() => ({})),
      api('/contacts/units-map').catch(() => ({}))
    ]);
    $.contactTagsMap = tagsMap || {};
    $.contactUnitsMap = unitsMap || {};
  } catch (e) {
    console.warn('[RealChat] Failed to load contact maps:', e);
  }
}

export function setRcFilter(filter) {
  $.activeFilter = filter;
  // Update chip UI
  document.querySelectorAll('#rc-filter-bar .lc-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === filter);
  });
  renderConversationList($.conversations);
}

export function toggleRcTagDropdown() {
  var dd = document.getElementById('rc-tag-dropdown');
  if (!dd) return;
  if (dd.style.display !== 'none') { dd.style.display = 'none'; return; }
  // Build tag list from contactTagsMap
  var tagSet = new Set();
  Object.values($.contactTagsMap).forEach(function(tags) {
    if (Array.isArray(tags)) tags.forEach(function(t) { tagSet.add(t); });
  });
  var tags = Array.from(tagSet).sort();
  dd.innerHTML = tags.length === 0
    ? '<div style="padding:8px 12px;font-size:12px;color:#9ca3af;">No tags found</div>'
    : tags.map(function(t) {
      var isActive = $.tagFilter.indexOf(t) >= 0;
      return '<button onclick="toggleRcTag(\'' + escapeAttr(t) + '\')" style="display:block;width:100%;text-align:left;padding:6px 12px;font-size:12px;border:none;background:' + (isActive ? '#e7fce3' : 'transparent') + ';cursor:pointer;">' + escapeHtml(t) + (isActive ? ' ✓' : '') + '</button>';
    }).join('');
  dd.style.display = '';
}

export function toggleRcTag(tag) {
  var idx = $.tagFilter.indexOf(tag);
  if (idx >= 0) $.tagFilter.splice(idx, 1); else $.tagFilter.push(tag);
  var chip = document.getElementById('rc-tag-chip');
  if (chip) chip.textContent = $.tagFilter.length ? 'Tags (' + $.tagFilter.length + ')' : 'Tags ▾';
  if ($.tagFilter.length) chip.classList.add('active'); else chip.classList.remove('active');
  toggleRcTagDropdown(); // refresh dropdown
  renderConversationList($.conversations);
}

export function toggleRcUnitDropdown() {
  var dd = document.getElementById('rc-unit-dropdown');
  if (!dd) return;
  if (dd.style.display !== 'none') { dd.style.display = 'none'; return; }
  var unitSet = new Set(Object.values($.contactUnitsMap));
  var units = Array.from(unitSet).sort();
  dd.innerHTML = '<button onclick="setRcUnit(\'\')" style="display:block;width:100%;text-align:left;padding:6px 12px;font-size:12px;border:none;background:' + (!$.unitFilter ? '#e7fce3' : 'transparent') + ';cursor:pointer;">All Units</button>'
    + (units.length === 0
      ? '<div style="padding:8px 12px;font-size:12px;color:#9ca3af;">No units found</div>'
      : units.map(function(u) {
        return '<button onclick="setRcUnit(\'' + escapeAttr(u) + '\')" style="display:block;width:100%;text-align:left;padding:6px 12px;font-size:12px;border:none;background:' + ($.unitFilter === u ? '#e7fce3' : 'transparent') + ';cursor:pointer;">' + escapeHtml(u) + '</button>';
      }).join(''));
  dd.style.display = '';
}

export function setRcUnit(unit) {
  $.unitFilter = unit;
  var chip = document.getElementById('rc-unit-chip');
  if (chip) chip.textContent = unit ? unit : 'Unit ▾';
  if (unit) chip.classList.add('active'); else chip.classList.remove('active');
  document.getElementById('rc-unit-dropdown').style.display = 'none';
  renderConversationList($.conversations);
}

// ─── Chat View ───────────────────────────────────────────────────

export async function openConversation(phone) {
  $.activePhone = phone;
  document.querySelectorAll('.rc-chat-item').forEach(el => el.classList.remove('active'));
  const items = document.querySelectorAll('.rc-chat-item');
  items.forEach(el => { if (el.onclick?.toString().includes(phone)) el.classList.add('active'); });

  // Clear any pending file
  const { clearRcFile } = await import('./real-chat-messaging.js');
  clearRcFile();

  try {
    const log = await api('/conversations/' + encodeURIComponent(phone));
    renderChatView(log);
  } catch (err) {
    console.error('[RealChat] Failed to load conversation:', err);
  }
}

export function renderChatView(log) {
  $.lastLog = log;
  document.getElementById('rc-empty-state').style.display = 'none';
  const chat = document.getElementById('rc-active-chat');
  chat.style.display = 'flex';

  const initials = (log.pushName || '?').slice(0, 2).toUpperCase();
  document.getElementById('rc-active-avatar').innerHTML = avatarImg(log.phone, initials);
  document.getElementById('rc-active-name').textContent = log.pushName || 'Unknown';

  const phoneEl = document.getElementById('rc-active-phone');
  const instanceEl = document.getElementById('rc-active-instance');
  phoneEl.firstChild.textContent = log.phone + ' ';
  if (log.instanceId) {
    const label = $.instances[log.instanceId] || log.instanceId;
    instanceEl.textContent = label;
    instanceEl.style.display = '';
  } else {
    instanceEl.style.display = 'none';
  }

  const instanceStat = log.instanceId ? ' | Instance: ' + ($.instances[log.instanceId] || log.instanceId) : '';
  document.getElementById('rc-stat-total').textContent = log.messages.length + ' messages';
  document.getElementById('rc-stat-started').textContent = 'Started: ' + formatDateTime(log.createdAt);
  document.getElementById('rc-stat-last').textContent = 'Last active: ' + formatRelativeTime(log.updatedAt) + instanceStat;

  const container = document.getElementById('rc-messages');
  let html = '';
  let lastDate = '';
  let lastSide = '';

  const devMode = StateManager.get('realChat.devMode');

  // Double checkmark SVG for read receipts (US-183)
  const checkmarkSvg = '<span class="rc-bubble-check"><svg viewBox="0 0 16 11" width="16" height="11"><path d="M11.07.86l-1.43.77L5.64 7.65 2.7 5.32l-1.08 1.3L5.88 9.9l5.19-9.04z" fill="currentColor"/><path d="M15.07.86l-1.43.77L9.64 7.65 8.8 7.01l-.86 1.5 2.04 1.39 5.09-9.04z" fill="currentColor"/></svg></span>';

  for (let i = 0; i < log.messages.length; i++) {
    const msg = log.messages[i];
    const msgDate = new Date(msg.timestamp).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
    if (msgDate !== lastDate) {
      const isoDate = new Date(msg.timestamp).toISOString().slice(0, 10);
      html += '<div class="rc-date-sep" data-date="' + isoDate + '"><span>' + msgDate + '</span></div>';
      lastDate = msgDate;
      lastSide = '';
    }

    const isGuest = msg.role === 'user';
    const side = isGuest ? 'guest' : 'ai';
    const time = new Date(msg.timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Consecutive message grouping (US-183)
    const isContinuation = side === lastSide;
    const continuationClass = isContinuation ? ' continuation' : '';
    lastSide = side;

    // WhatsApp-style inline footer: timestamp + checkmark/manual (US-183)
    let footerInner = '';
    if (!isGuest && msg.manual) {
      footerInner += '<span class="rc-bubble-manual-tag">Manual</span>';
    }
    footerInner += '<span class="rc-bubble-time">' + time + '</span>';
    if (!isGuest) {
      footerInner += checkmarkSvg;
    }

    // Hover-only action buttons
    const canEdit = !isGuest && !msg.manual && (
      (msg.routedAction === 'static_reply' && msg.intent) ||
      (msg.routedAction === 'workflow' && msg.workflowId && msg.stepId)
    );

    let actionsHtml = '';
    const actionBtns = [];
    if (isGuest) {
      actionBtns.push('<button type="button" onclick="openAddToTrainingExampleModal(' + i + ')" title="Add to Training Examples">📚 Add</button>');
    }
    if (canEdit) {
      actionBtns.push('<button type="button" onclick="openRcEditModal(' + i + ')" title="Save to Responses">✏️ Edit</button>');
    }
    if (actionBtns.length > 0) {
      actionsHtml = '<div class="rc-bubble-actions">' + actionBtns.join('') + '</div>';
    }

    // Dev mode collapsible metadata panel (US-185)
    let devMeta = '';
    if (devMode && !isGuest && !msg.manual) {
      var panelId = 'rc-devpanel-' + i;
      var panelRows = [];
      var tierBadge = '';

      if (typeof MetadataBadges !== 'undefined') {
        if (msg.source) { tierBadge = MetadataBadges.getTierBadge(msg.source); panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Tier</span><span class="rc-dev-panel-value">' + tierBadge + '</span></div>'); }
        if (msg.intent) panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Intent</span><span class="rc-dev-panel-value">' + escapeHtml(msg.intent) + '</span></div>');
        if (msg.confidence !== undefined) panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Confidence</span><span class="rc-dev-panel-value">' + MetadataBadges.getConfidenceBadge(msg.confidence) + '</span></div>');
        if (msg.model) panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Provider</span><span class="rc-dev-panel-value">' + escapeHtml(msg.model) + '</span></div>');
        if (msg.responseTime) panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Time</span><span class="rc-dev-panel-value">' + MetadataBadges.getResponseTimeBadge(msg.responseTime) + '</span></div>');
        if (msg.routedAction) panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Action</span><span class="rc-dev-panel-value">' + escapeHtml(msg.routedAction) + '</span></div>');
        if (msg.sentiment) panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Sentiment</span><span class="rc-dev-panel-value">' + escapeHtml(msg.sentiment) + '</span></div>');
        // US-001: Token usage row
        if (msg.usage && (msg.usage.prompt_tokens || msg.usage.completion_tokens)) {
          var pt = msg.usage.prompt_tokens || 0;
          var ct = msg.usage.completion_tokens || 0;
          var tt = msg.usage.total_tokens || (pt + ct);
          var tokenText = fmtTokenCount(pt) + ' in / ' + fmtTokenCount(ct) + ' out';
          if (msg.contextCount != null) tokenText += ' | ' + msg.contextCount + ' msgs context';
          panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Tokens</span><span class="rc-dev-panel-value"><span class="rc-dev-token-badge">' + tokenText + '</span></span></div>');
        } else if (msg.source === 'llm') {
          panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Tokens</span><span class="rc-dev-panel-value" style="opacity:0.5;">N/A</span></div>');
        }
        if (msg.kbFiles && msg.kbFiles.length > 0) {
          var chips = msg.kbFiles.map(function(f) {
            return '<span class="rc-dev-panel-kb-chip" onclick="openKBFileFromPreview(\'' + escapeHtml(f) + '\')" title="View ' + escapeHtml(f) + '">' + escapeHtml(f) + '</span>';
          }).join('');
          panelRows.push('<div class="rc-dev-panel-kb"><div class="rc-dev-panel-row"><span class="rc-dev-panel-label">KB Files</span><span class="rc-dev-panel-value">' + chips + '</span></div></div>');
        }
      } else {
        // Fallback without MetadataBadges
        if (msg.source) { panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Tier</span><span class="rc-dev-panel-value">' + escapeHtml(msg.source) + '</span></div>'); }
        if (msg.intent) panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Intent</span><span class="rc-dev-panel-value">' + escapeHtml(msg.intent) + '</span></div>');
        if (msg.confidence !== undefined) panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Confidence</span><span class="rc-dev-panel-value">' + (msg.confidence * 100).toFixed(1) + '%</span></div>');
        if (msg.model) panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Provider</span><span class="rc-dev-panel-value">' + escapeHtml(msg.model) + '</span></div>');
        if (msg.responseTime) panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Time</span><span class="rc-dev-panel-value">' + (msg.responseTime / 1000).toFixed(2) + 's</span></div>');
        if (msg.routedAction) panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Action</span><span class="rc-dev-panel-value">' + escapeHtml(msg.routedAction) + '</span></div>');
        // US-001: Token usage (fallback path)
        if (msg.usage && (msg.usage.prompt_tokens || msg.usage.completion_tokens)) {
          var pt2 = msg.usage.prompt_tokens || 0;
          var ct2 = msg.usage.completion_tokens || 0;
          var tokenText2 = fmtTokenCount(pt2) + ' in / ' + fmtTokenCount(ct2) + ' out';
          if (msg.contextCount != null) tokenText2 += ' | ' + msg.contextCount + ' msgs context';
          panelRows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Tokens</span><span class="rc-dev-panel-value">' + tokenText2 + '</span></div>');
        }
      }

      if (panelRows.length > 0) {
        var summary = tierBadge || '';
        if (msg.intent) summary += (summary ? ' ' : '') + escapeHtml(msg.intent);
        devMeta = '<div class="rc-dev-panel-toggle" onclick="toggleDevPanel(\'' + panelId + '\', this)">' +
          '<span class="rc-dev-chevron">&#9660;</span>' +
          '<span>' + summary + '</span>' +
          '</div>' +
          '<div id="' + panelId + '" class="rc-dev-panel">' + panelRows.join('') + '</div>';
      }
    }

    const isSystem = hasSystemContent(msg.content);
    const displayContent = formatMessage(msg.content);
    const systemClass = isSystem ? ' lc-system-msg' : '';

    // US-002: Robot icon prefix for AI-generated replies (not manual staff)
    let botAvatarPrefix = '';
    if (!isGuest && !msg.manual) {
      const avatarEmoji = window._botAvatar || '\uD83E\uDD16';
      botAvatarPrefix = '<span class="lc-bot-avatar">' + avatarEmoji + ' </span>';
    }

    const textExtra = canEdit ? ' rc-bubble-text-editable cursor-pointer hover:opacity-90' : '';
    const textOnclick = canEdit ? ' onclick="openRcEditModal(' + i + ')"' : '';
    html += '<div class="rc-bubble-wrap ' + side + continuationClass + '">' +
      '<div class="rc-bubble ' + side + systemClass + '">' +
      '<div class="rc-bubble-text' + textExtra + '"' + textOnclick + ' title="' + (canEdit ? 'Click to edit and save to Responses' : '') + '">' + botAvatarPrefix + displayContent + '</div>' +
      '<div class="rc-bubble-footer">' + footerInner + '</div>' +
      actionsHtml +
      devMeta +
      '</div>' +
      '</div>';
  }

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;

  if ($.searchOpen && typeof SearchPanel !== 'undefined' && SearchPanel.isActive()) {
    SearchPanel.reapply();
  }
}

export function toggleMetaDetails(detailsId) {
  var el = document.getElementById(detailsId);
  if (!el) return;
  var hidden = el.style.display === 'none';
  el.style.display = hidden ? '' : 'none';
  var parent = el.parentElement;
  var btn = parent ? parent.querySelector('.rc-dev-expand-btn') : null;
  if (btn) {
    btn.innerHTML = hidden ? '&#9650; Details' : '&#9660; Details';
  }
}

// US-185: Toggle collapsible dev metadata panel
export function toggleDevPanel(panelId, toggleEl) {
  var panel = document.getElementById(panelId);
  if (!panel) return;
  var isOpen = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
    if (toggleEl) toggleEl.classList.remove('open');
  } else {
    panel.classList.add('open');
    if (toggleEl) toggleEl.classList.add('open');
  }
}

// ─── Message Formatting ──────────────────────────────────────────

function formatMessage(content) {
  if (!content) return '';
  if (hasSystemContent(content)) {
    return formatSystemContent(content);
  }

  const mediaRegex = /^\[(photo|video|document): (.*?)\]/i;
  const match = content.match(mediaRegex);
  if (match) {
    const type = match[1].toLowerCase();
    const filename = match[2];
    let icon = '';
    if (type === 'photo') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
    else if (type === 'video') icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>';
    else icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>';

    return '<div class="rc-media-placeholder">' +
      '<div class="rc-file-thumb-icon" style="width:32px;height:32px;background:#e9edef;color:#54656f;">' + icon + '</div>' +
      '<div class="rc-media-filename">' + escapeHtml(filename) + '</div>' +
      '</div>';
  }

  return linkifyUrls(escapeHtml(content)).replace(/\n/g, '<br>');
}

// ─── Cleanup (US-160) ─────────────────────────────────────────────
// Called when navigating away from the real-chat tab to stop background polling

export function cleanup() {
  // US-159: Disconnect SSE and stop fallback polling
  disconnectConversationSSE();
  if ($.waStatusPoll) {
    clearInterval($.waStatusPoll);
    $.waStatusPoll = null;
  }
  if (window._rcTimestampUpdater) {
    clearInterval(window._rcTimestampUpdater);
    window._rcTimestampUpdater = null;
  }
  console.log('[RealChat] Cleanup: closed SSE + cleared all intervals');
}

export async function deleteActiveChat() {
  if (!$.activePhone) return;
  if (!confirm('Delete this conversation log? This cannot be undone.')) return;
  try {
    await api('/conversations/' + encodeURIComponent($.activePhone), { method: 'DELETE' });
    $.activePhone = null;
    document.getElementById('rc-active-chat').style.display = 'none';
    document.getElementById('rc-empty-state').style.display = '';
    loadRealChat();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}
