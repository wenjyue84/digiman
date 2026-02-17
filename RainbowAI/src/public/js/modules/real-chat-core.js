// ═══════════════════════════════════════════════════════════════════
// Real Chat Core - Init, dev mode, connection, list, chat rendering
// ═══════════════════════════════════════════════════════════════════

import { $, translationHelper } from './real-chat-state.js';
import { avatarImg } from './live-chat-state.js';
import { refreshActiveChat } from './real-chat-messaging.js';

const api = window.api;
const linkifyUrls = window.linkifyUrls || function(h) { return h; };

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
  bar.classList.remove('wa-connected', 'wa-disconnected');
  bar.classList.add(connected ? 'wa-connected' : 'wa-disconnected');
  const text = bar.querySelector('.wa-connection-text');
  if (text) {
    text.textContent = connected ? 'WhatsApp Connected' : 'Disconnected';
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
      html += '<div class="rc-date-sep"><span>' + msgDate + '</span></div>';
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

    let devMeta = '';
    let kbFilesBadge = '';
    if (devMode && !isGuest && !msg.manual && typeof MetadataBadges !== 'undefined') {
      var badges = MetadataBadges.getMetadataBadges(msg, {
        showSentiment: true,
        kbClickHandler: 'openKBFileFromPreview'
      });

      var detailsId = 'rc-meta-details-' + i;
      var detailRows = [];
      if (msg.source)    detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Tier:</span><span class="rc-detail-value">' + escapeHtml(MetadataBadges.getTierLabel(msg.source)) + ' (' + escapeHtml(msg.source) + ')</span></div>');
      if (msg.intent)    detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Intent:</span><span class="rc-detail-value">' + escapeHtml(msg.intent) + '</span></div>');
      if (msg.routedAction) detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Action:</span><span class="rc-detail-value">' + escapeHtml(msg.routedAction) + '</span></div>');
      if (msg.messageType) detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Type:</span><span class="rc-detail-value">' + escapeHtml(msg.messageType) + '</span></div>');
      if (msg.model)     detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Model:</span><span class="rc-detail-value">' + escapeHtml(msg.model) + '</span></div>');
      if (msg.responseTime) detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Time:</span><span class="rc-detail-value">' + (msg.responseTime / 1000).toFixed(2) + 's (' + msg.responseTime + 'ms)</span></div>');
      if (msg.confidence !== undefined) detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">Confidence:</span><span class="rc-detail-value">' + (msg.confidence * 100).toFixed(1) + '%</span></div>');
      if (msg.kbFiles && msg.kbFiles.length > 0) detailRows.push('<div class="rc-detail-row"><span class="rc-detail-label">KB Files:</span><span class="rc-detail-value">' + msg.kbFiles.map(function(f){ return escapeHtml(f); }).join(', ') + '</span></div>');

      var expandBtn = detailRows.length > 0
        ? '<button class="rc-dev-expand-btn" onclick="toggleMetaDetails(\'' + detailsId + '\')" title="Show/hide details">&#9660; Details</button>'
        : '';
      var detailsPanel = detailRows.length > 0
        ? '<div id="' + detailsId + '" class="rc-dev-details" style="display:none;">' + detailRows.join('') + '</div>'
        : '';

      if (badges.inline) {
        devMeta = '<div class="rc-dev-meta"><div class="rc-dev-badges">' + badges.inline + expandBtn + '</div>' + detailsPanel + '</div>';
      }
      kbFilesBadge = badges.kbFiles || '';
    } else if (devMode && !isGuest && !msg.manual) {
      var parts = [];
      if (msg.source) { var sl = { regex: '🚨 Priority Keywords', fuzzy: '⚡ Smart Matching', semantic: '📚 Learning Examples', llm: '🤖 AI Fallback' }; parts.push('Detection: ' + (sl[msg.source] || msg.source)); }
      if (msg.intent) parts.push('Intent: ' + escapeHtml(msg.intent));
      if (msg.routedAction) parts.push('Routed to: ' + escapeHtml(msg.routedAction));
      if (msg.model) parts.push('Model: ' + escapeHtml(msg.model));
      if (msg.responseTime) parts.push('Time: ' + (msg.responseTime / 1000).toFixed(1) + 's');
      if (msg.confidence !== undefined) parts.push('Confidence: ' + Math.round(msg.confidence * 100) + '%');
      if (parts.length > 0) devMeta = '<div class="rc-dev-meta">' + parts.join(' | ') + '</div>';
    }

    const isSystem = hasSystemContent(msg.content);
    const displayContent = formatMessage(msg.content);
    const systemClass = isSystem ? ' lc-system-msg' : '';

    const textExtra = canEdit ? ' rc-bubble-text-editable cursor-pointer hover:opacity-90' : '';
    const textOnclick = canEdit ? ' onclick="openRcEditModal(' + i + ')"' : '';
    html += '<div class="rc-bubble-wrap ' + side + continuationClass + '">' +
      '<div class="rc-bubble ' + side + systemClass + '">' +
      '<div class="rc-bubble-text' + textExtra + '"' + textOnclick + ' title="' + (canEdit ? 'Click to edit and save to Responses' : '') + '">' + displayContent + '</div>' +
      '<div class="rc-bubble-footer">' + footerInner + '</div>' +
      actionsHtml +
      devMeta +
      kbFilesBadge +
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
