/**
 * Chat Preview Module
 * Manages chat sessions for Preview tab (chat simulator)
 * - Session persistence (localStorage)
 * - Session switching, creation, deletion
 * - Message rendering with metadata badges
 * - Inline edit support for quick replies/workflows
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

/** Linkify URLs — uses global from utils-global.js */
var linkifyUrls = window.linkifyUrls || function(h) { return h; };

/**
 * Format a token count for display: 1234 -> '1.2K', 89 -> '89'
 */
function fmtTokens(n) {
  if (n == null || n === undefined) return 'N/A';
  if (typeof n !== 'number') return 'N/A';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

/**
 * Build a clickable token usage badge with popover breakdown.
 * Returns HTML string. Usage must be non-null for clickable version.
 */
function buildTokenBadge(usage, tokenBreakdown, badgeId) {
  if (!usage) return '';
  const prompt = usage.prompt_tokens;
  const completion = usage.completion_tokens;
  const total = usage.total_tokens || ((prompt || 0) + (completion || 0));
  const label = fmtTokens(prompt) + ' in / ' + fmtTokens(completion) + ' out';

  if (!tokenBreakdown) {
    return '<span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono text-xs" title="Token usage: prompt in / completion out">' + label + '</span>';
  }

  const tb = tokenBreakdown;
  const totalInput = (tb.systemPrompt || 0) + (tb.kbContext || 0) + (tb.conversationHistory || 0) + (tb.userMessage || 0);
  const pct = (v) => totalInput > 0 ? ((v / totalInput) * 100).toFixed(0) + '%' : '0%';

  const popoverHtml = '<div id="' + badgeId + '-pop" class="hidden absolute z-50 bottom-full left-0 mb-1 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg p-3 text-xs text-neutral-700">'
    + '<div class="font-semibold text-neutral-800 mb-2">Token Breakdown</div>'
    + '<div class="space-y-1">'
    + '<div class="flex justify-between"><span>System Prompt</span><span class="font-mono">' + fmtTokens(tb.systemPrompt) + ' <span class="text-neutral-400">(' + pct(tb.systemPrompt || 0) + ')</span></span></div>'
    + '<div class="flex justify-between"><span>KB Context</span><span class="font-mono">' + fmtTokens(tb.kbContext) + ' <span class="text-neutral-400">(' + pct(tb.kbContext || 0) + ')</span></span></div>'
    + '<div class="flex justify-between"><span>Conv History</span><span class="font-mono">' + fmtTokens(tb.conversationHistory) + ' <span class="text-neutral-400">(' + pct(tb.conversationHistory || 0) + ')</span></span></div>'
    + '<div class="flex justify-between"><span>User Message</span><span class="font-mono">' + fmtTokens(tb.userMessage) + ' <span class="text-neutral-400">(' + pct(tb.userMessage || 0) + ')</span></span></div>'
    + '<div class="border-t border-neutral-100 mt-1 pt-1 flex justify-between font-semibold"><span>AI Response</span><span class="font-mono">' + fmtTokens(tb.aiResponse) + '</span></div>'
    + '<div class="border-t border-neutral-100 mt-1 pt-1 flex justify-between font-semibold"><span>Total</span><span class="font-mono">' + fmtTokens(total) + '</span></div>'
    + '</div>'
    + '</div>';

  return '<span class="relative inline-block">'
    + '<span id="' + badgeId + '" class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-mono text-xs cursor-pointer hover:bg-blue-100 transition" '
    + 'onclick="toggleTokenPopover(\'' + badgeId + '-pop\')" '
    + 'title="Click for token breakdown">' + label + '</span>'
    + popoverHtml
    + '</span>';
}

/**
 * Toggle a token breakdown popover visibility
 */
export function toggleTokenPopover(popoverId) {
  const el = document.getElementById(popoverId);
  if (!el) return;
  // Close all other popovers first
  document.querySelectorAll('[id$="-pop"].token-popover-open').forEach(p => {
    if (p.id !== popoverId) {
      p.classList.add('hidden');
      p.classList.remove('token-popover-open');
    }
  });
  el.classList.toggle('hidden');
  el.classList.toggle('token-popover-open');
}

// Module-level state (referenced by global chat functions)
// NOTE: chatSessions and currentSessionId must be accessible to preview tab
export let chatSessions = [];
export let currentSessionId = null;

// Initialize from localStorage
function initializeChatSessions() {
  const saved = localStorage.getItem('rainbowChatSessions');
  if (saved) {
    chatSessions = JSON.parse(saved);
  } else {
    chatSessions = [{
      id: Date.now().toString(),
      title: 'New Chat',
      history: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    }];
  }
  currentSessionId = localStorage.getItem('rainbowCurrentSession') || chatSessions[0].id;
}

initializeChatSessions();

/**
 * Save chat sessions to localStorage
 */
export function saveSessions() {
  localStorage.setItem('rainbowChatSessions', JSON.stringify(chatSessions));
  localStorage.setItem('rainbowCurrentSession', currentSessionId);
}

/**
 * Get current active session
 */
export function getCurrentSession() {
  return chatSessions.find(s => s.id === currentSessionId) || chatSessions[0];
}

/**
 * Update session title from first user message
 */
export function updateSessionTitle(sessionId) {
  const session = chatSessions.find(s => s.id === sessionId);
  if (!session) return;
  const firstUserMsg = session.history.find(m => m.role === 'user');
  if (firstUserMsg) {
    session.title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
  }
  renderSessionsList();
  saveSessions();
}

/**
 * Render sessions list sidebar
 */
export function renderSessionsList() {
  const container = document.getElementById('chat-sessions');
  if (!container) return;
  const sortedSessions = [...chatSessions].sort((a, b) => b.lastActivity - a.lastActivity);
  container.innerHTML = sortedSessions.map(function(session) {
    const isActive = session.id === currentSessionId;
    const messageCount = session.history.length;
    const initial = session.title.charAt(0).toUpperCase() || '?';
    return '<div class="cs-session-item' + (isActive ? ' active' : '') + '" onclick="switchToSession(\'' + session.id + '\')">'
      + '<div class="cs-session-avatar">' + esc(initial) + '</div>'
      + '<div class="cs-session-info">'
      + '<div class="cs-session-title">' + esc(session.title) + '</div>'
      + '<div class="cs-session-meta">'
      + '<span>' + messageCount + ' msgs</span>'
      + (!isActive ? '<button class="cs-session-delete" onclick="deleteSession(event, \'' + session.id + '\')" title="Delete session"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button>' : '')
      + '</div></div></div>';
  }).join('');
}

/**
 * Switch to a different session
 */
export function switchToSession(sessionId) {
  currentSessionId = sessionId;
  const session = getCurrentSession();
  session.lastActivity = Date.now();
  saveSessions();
  renderSessionsList();
  renderChatMessages();
}

/**
 * Create a new chat session
 */
export function createNewChat() {
  const newSession = {
    id: Date.now().toString(),
    title: 'New Chat',
    history: [],
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  chatSessions.push(newSession);
  currentSessionId = newSession.id;
  saveSessions();
  renderSessionsList();
  renderChatMessages();
  document.getElementById('chat-input').focus();
}

/**
 * Delete a chat session
 */
export function deleteSession(event, sessionId) {
  event.stopPropagation();
  if (chatSessions.length === 1) {
    toast('Cannot delete the last session', 'error');
    return;
  }
  if (!confirm('Delete this chat session?')) return;
  chatSessions = chatSessions.filter(s => s.id !== sessionId);
  if (currentSessionId === sessionId) {
    currentSessionId = chatSessions[0].id;
  }
  saveSessions();
  renderSessionsList();
  renderChatMessages();
}

/**
 * Clear current chat session history
 */
export function clearCurrentChat() {
  const session = getCurrentSession();
  session.history = [];
  session.title = 'New Chat';
  saveSessions();
  renderChatMessages();
  renderSessionsList();
}

/**
 * Alias for clearCurrentChat (used by onclick handlers)
 */
export function clearChat() {
  clearCurrentChat();
}

/**
 * Toggle dev badges visibility on a simulator bot bubble.
 * Saves preference to sessionStorage.
 */
export function toggleDevBadges(btnEl) {
  var wrap = btnEl.previousElementSibling;
  if (!wrap || !wrap.classList.contains('cs-dev-badges-wrap')) return;
  var expanded = wrap.classList.toggle('expanded');
  btnEl.textContent = expanded ? 'Dev \u25B2' : 'Dev \u25BC';
  try { sessionStorage.setItem('cs-dev-expanded', expanded ? '1' : '0'); } catch(e) {}
}

/**
 * Build timestamp + checkmark meta HTML matching Live Chat .lc-bubble-meta
 */
function buildBubbleMeta(msg) {
  var ts = '';
  if (msg.meta && msg.meta.responseTime != null) {
    ts = msg.meta.responseTime >= 1000
      ? (msg.meta.responseTime / 1000).toFixed(1) + 's'
      : msg.meta.responseTime + 'ms';
  }
  if (!ts) {
    var d = new Date();
    ts = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  var checkmark = '<svg class="lc-checkmark" viewBox="0 0 16 11" fill="currentColor">'
    + '<path d="M11.07.65l-6.53 6.53L1.97 4.6l-.72.72 3.29 3.29 7.25-7.25-.72-.71z"/>'
    + '<path d="M5.54 7.18L4.82 6.46l-.72.72 1.44 1.44.72-.72-.72-.72z"/></svg>';
  return '<div class="lc-bubble-meta">'
    + '<span class="lc-bubble-time">' + ts + '</span>'
    + checkmark
    + '</div>';
}

/**
 * Render chat messages in current session
 * Supports inline editing for quick replies/workflows
 */
export function renderChatMessages() {
  const messagesEl = document.getElementById('chat-messages');
  const metaEl = document.getElementById('chat-meta');
  const session = getCurrentSession();

  if (session.history.length === 0) {
    messagesEl.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#667781;">'
      + '<div style="font-size:14px;font-weight:500;margin-bottom:4px;">Start a conversation</div>'
      + '<div style="font-size:12px;">Try: "What\'s the wifi password?" or "I want to book a room"</div>'
      + '</div>';
    metaEl.innerHTML = '';
    return;
  }

  // Render messages in reverse order (newest at top)
  const historyLen = session.history.length;
  messagesEl.innerHTML = session.history.slice().reverse().map(function(msg, idx) {
    // Determine dev badges collapsed/expanded state from sessionStorage
    var devExpanded = false;
    try { devExpanded = sessionStorage.getItem('cs-dev-expanded') === '1'; } catch(e) {}
    var devWrapClass = 'cs-dev-badges-wrap' + (devExpanded ? ' expanded' : '');
    var devToggleLabel = devExpanded ? 'Dev \u25B2' : 'Dev \u25BC';
    // Bot avatar prefix (matches live-chat-core.js)
    var avatarEmoji = window._botAvatar || '\uD83E\uDD16';
    var botAvatarPrefix = '<span class="lc-bot-avatar">' + avatarEmoji + ' </span>';

    if (msg.role === 'user') {
      // Guest bubble (left, white) — matches live-chat .lc-bubble.guest
      var guestMeta = '<div class="lc-bubble-meta">'
        + '<span class="lc-bubble-time">' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false}) + '</span>'
        + '</div>';
      return '<div class="lc-bubble-wrap guest">'
        + '<div class="lc-bubble guest">'
        + '<div class="lc-bubble-text" style="white-space:pre-wrap;">' + linkifyUrls(esc(msg.content)) + '</div>'
        + guestMeta
        + '</div></div>';
    } else {
      // Use shared MetadataBadges component for badge generation
      var sourceBadge = window.MetadataBadges.getTierBadge(msg.meta?.source);
      var kbBadges = window.MetadataBadges.getKBFilesBadge(msg.meta?.kbFiles);
      var hMsgTypeBadge = window.MetadataBadges.getMessageTypeBadge(msg.meta?.messageType);
      var hOverrideBadge = window.MetadataBadges.getOverrideBadge(msg.meta?.problemOverride);

      // Editable static reply / workflow / system message: full inline-edit UI + clickable message body
      var em = msg.meta?.editMeta;
      if (em) {
        var editId = msg.meta.messageId || ('edit-msg-' + (historyLen - 1 - idx));
        var editLabel = '';
        var editBadgeColor = '';
        if (em.type === 'knowledge') { editLabel = 'Quick Reply'; editBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'; }
        if (em.type === 'workflow') { editLabel = 'Workflow Step'; editBadgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200'; }
        if (em.type === 'template') { editLabel = 'System Message'; editBadgeColor = 'bg-sky-50 text-sky-700 border-sky-200'; }
        var langs = em.languages || { en: '', ms: '', zh: '' };
        var sourceLabel = em.type === 'knowledge' ? 'Quick Reply: ' + em.intent : em.type === 'workflow' ? (em.workflowName || em.workflowId) + ' > Step ' + ((em.stepIndex || 0) + 1) : 'Template: ' + (em.templateKey || '');
        var editBtnHtml = '<button onclick="toggleInlineEdit(\'' + editId + '\')" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 ' + editBadgeColor + ' border rounded text-xs cursor-pointer hover:opacity-80 transition" title="Click to edit this ' + (editLabel || 'reply') + '" role="button" tabindex="0">✏️ ' + editLabel + '</button>';
        var alsoTemplateHtml = (em.alsoTemplate)
          ? '<button onclick="toggleInlineEdit(\'' + editId + '-tmpl\')" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-xs cursor-pointer hover:opacity-80 transition" title="Also edit the System Message version">✏️ System Message</button>'
          : '';
        var langBadge = window.MetadataBadges.getLanguageBadge(msg.meta.detectedLanguage);
        var editPanelHtml = '<div id="' + editId + '" class="hidden mt-2 pt-2 border-t border-dashed" data-edit-meta=\'' + JSON.stringify(em).replace(/'/g, "&#39;") + '\'>'
          + '<div class="flex items-center justify-between mb-1.5"><span class="text-xs font-semibold text-neutral-600">Editing ' + editLabel + ': <span class="font-mono">' + esc(sourceLabel) + '</span></span></div>'
          + '<div class="space-y-1.5">'
          + '<div><label class="text-xs text-neutral-400 font-medium">English</label><textarea data-lang="en" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="3">' + esc(langs.en) + '</textarea></div>'
          + '<div><label class="text-xs text-neutral-400 font-medium">Malay</label><textarea data-lang="ms" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">' + esc(langs.ms) + '</textarea></div>'
          + '<div><label class="text-xs text-neutral-400 font-medium">Chinese</label><textarea data-lang="zh" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">' + esc(langs.zh) + '</textarea></div>'
          + '</div>'
          + '<div class="flex gap-2 mt-2 flex-wrap">'
          + '<button type="button" onclick="translateInlineEditPanel(\'' + editId + '\')" class="px-3 py-1 bg-success-500 text-white text-xs rounded-lg hover:bg-success-600 transition font-medium" title="Fill missing languages (same AI as LLM reply)">Translate</button>'
          + '<button onclick="saveInlineEdit(\'' + editId + '\')" class="px-3 py-1 bg-primary-500 text-white text-xs rounded-lg hover:bg-primary-600 transition font-medium">Save</button>'
          + '<button onclick="toggleInlineEdit(\'' + editId + '\')" class="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-lg hover:bg-neutral-200 transition">Cancel</button>'
          + '</div></div>';
        var alsoTemplatePanelHtml = '';
        if (em.alsoTemplate) {
          var tLangs = em.alsoTemplate.languages || { en: '', ms: '', zh: '' };
          var tmplMeta = JSON.stringify({ type: 'template', templateKey: em.alsoTemplate.key, languages: em.alsoTemplate.languages }).replace(/'/g, "&#39;");
          alsoTemplatePanelHtml = '<div id="' + editId + '-tmpl" class="hidden mt-2 pt-2 border-t border-dashed" data-edit-meta=\'' + tmplMeta + '\'>'
            + '<div class="flex items-center justify-between mb-1.5"><span class="text-xs font-semibold text-neutral-600">Editing System Message: <span class="font-mono">' + esc(em.alsoTemplate.key) + '</span></span></div>'
            + '<div class="space-y-1.5">'
            + '<div><label class="text-xs text-neutral-400 font-medium">English</label><textarea data-lang="en" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="3">' + esc(tLangs.en) + '</textarea></div>'
            + '<div><label class="text-xs text-neutral-400 font-medium">Malay</label><textarea data-lang="ms" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">' + esc(tLangs.ms) + '</textarea></div>'
            + '<div><label class="text-xs text-neutral-400 font-medium">Chinese</label><textarea data-lang="zh" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">' + esc(tLangs.zh) + '</textarea></div>'
            + '</div>'
            + '<div class="flex gap-2 mt-2 flex-wrap">'
            + '<button type="button" onclick="translateInlineEditPanel(\'' + editId + '-tmpl\')" class="px-3 py-1 bg-success-500 text-white text-xs rounded-lg hover:bg-success-600 transition font-medium" title="Fill missing languages (same AI as LLM reply)">Translate</button>'
            + '<button onclick="saveInlineEdit(\'' + editId + '-tmpl\')" class="px-3 py-1 bg-sky-500 text-white text-xs rounded-lg hover:bg-sky-600 transition font-medium">Save System Message</button>'
            + '<button onclick="toggleInlineEdit(\'' + editId + '-tmpl\')" class="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-lg hover:bg-neutral-200 transition">Cancel</button>'
            + '</div></div>';
        }
        var editBadgeUid = 'tkn-' + editId;
        var usageBadge = msg.meta.usage ? buildTokenBadge(msg.meta.usage, msg.meta.tokenBreakdown, editBadgeUid) : (msg.meta.source === 'llm' ? '' : '<span class="px-1.5 py-0.5 bg-neutral-50 text-neutral-400 rounded text-xs">Tokens: N/A</span>');
        var contentClickable = 'cursor-pointer hover:bg-neutral-50 rounded -mx-1 px-1 py-0.5 transition';
        var contentOnclick = 'onclick="toggleInlineEdit(\'' + editId + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toggleInlineEdit(\'' + editId + '\')}" title="Click to edit this ' + (editLabel || 'reply') + '" role="button" tabindex="0"';
        // Bot bubble (right, green) with collapsible dev badges + bubble meta
        var editDevBadgesHtml = '<div class="cs-dev-badges">' + sourceBadge + hMsgTypeBadge + hOverrideBadge
          + '<span class="px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded font-mono" style="font-size:10px;">' + esc(msg.meta.intent) + '</span>'
          + '<span class="px-1.5 py-0.5 bg-success-50 text-success-700 rounded" style="font-size:10px;">' + esc(msg.meta.routedAction) + '</span>'
          + langBadge
          + (msg.meta.model ? '<span class="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-mono" style="font-size:10px;">' + esc(msg.meta.model) + '</span>' : '')
          + (msg.meta.responseTime ? '<span class="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded" style="font-size:10px;">' + (msg.meta.responseTime >= 1000 ? (msg.meta.responseTime / 1000).toFixed(1) + 's' : msg.meta.responseTime + 'ms') + '</span>' : '')
          + (msg.meta.confidence ? '<span style="font-size:10px;">' + (msg.meta.confidence * 100).toFixed(0) + '%</span>' : '')
          + usageBadge + editBtnHtml + alsoTemplateHtml
          + '</div>'
          + (kbBadges || '');
        return '<div class="lc-bubble-wrap bot">'
          + '<div class="lc-bubble bot">'
          + '<div id="' + editId + '-text" class="lc-bubble-text ' + contentClickable + '" ' + contentOnclick + ' style="white-space:pre-wrap;">' + botAvatarPrefix + linkifyUrls(esc(msg.content)) + '</div>'
          + buildBubbleMeta(msg)
          + '<div class="' + devWrapClass + '">' + editDevBadgesHtml + '</div>'
          + '<button type="button" class="cs-dev-toggle-btn" onclick="toggleDevBadges(this)">' + devToggleLabel + '</button>'
          + editPanelHtml + alsoTemplatePanelHtml
          + '</div></div>';
      }

      var isSystem = window.hasSystemContent(msg.content);
      var displayContent = isSystem ? window.formatSystemContent(msg.content) : window.getUserMessage(msg.content);
      var systemClass = isSystem ? ' lc-system-msg' : '';

      var langBadge2 = window.MetadataBadges.getLanguageBadge(msg.meta?.detectedLanguage);
      var intentBadge = window.MetadataBadges.getIntentBadge(msg.meta?.intent);
      var actionBadge = window.MetadataBadges.getActionBadge(msg.meta?.routedAction);
      var modelBadge = window.MetadataBadges.getModelBadge(msg.meta?.model);
      var timeBadge = window.MetadataBadges.getResponseTimeBadge(msg.meta?.responseTime);
      var confBadge = window.MetadataBadges.getConfidenceBadge(msg.meta?.confidence);
      var nonEditBadgeUid = 'tkn-ne-' + (historyLen - 1 - idx);
      var usageBadge2 = msg.meta?.usage ? buildTokenBadge(msg.meta.usage, msg.meta.tokenBreakdown, nonEditBadgeUid) : '';

      var contentHtml = '<div class="lc-bubble-text" style="white-space:pre-wrap;">' + botAvatarPrefix + (isSystem ? displayContent : linkifyUrls(esc(displayContent))) + '</div>';

      // Bot bubble (right, green) with collapsible dev badges + bubble meta
      var nonEditDevHtml = msg.meta
        ? '<div class="cs-dev-badges">' + sourceBadge + hMsgTypeBadge + hOverrideBadge + intentBadge + actionBadge + langBadge2 + modelBadge + timeBadge + confBadge + usageBadge2 + '</div>' + (kbBadges || '')
        : '';
      return '<div class="lc-bubble-wrap bot">'
        + '<div class="lc-bubble bot' + systemClass + '">'
        + contentHtml
        + buildBubbleMeta(msg)
        + (nonEditDevHtml ? '<div class="' + devWrapClass + '">' + nonEditDevHtml + '</div>'
          + '<button type="button" class="cs-dev-toggle-btn" onclick="toggleDevBadges(this)">' + devToggleLabel + '</button>' : '')
        + '</div></div>';
    }
  }).join('');
  messagesEl.scrollTop = 0;

  const lastMsg = session.history[session.history.length - 1];
  if (lastMsg.role === 'assistant' && lastMsg.meta) {
    const timeStr = lastMsg.meta.responseTime ? (lastMsg.meta.responseTime >= 1000 ? (lastMsg.meta.responseTime / 1000).toFixed(1) + 's' : lastMsg.meta.responseTime + 'ms') : 'N/A';

    // Get detection method label (using shared component)
    const detectionMethod = window.MetadataBadges.getTierLabel(lastMsg.meta.source);
    const detectionPrefix = detectionMethod ? `Detection: <b>${detectionMethod}</b> | ` : '';
    const kbFilesStr = lastMsg.meta.kbFiles && lastMsg.meta.kbFiles.length > 0 ? ` | KB: <b>${lastMsg.meta.kbFiles.join(', ')}</b>` : '';
    const hMsgTypeStr = lastMsg.meta.messageType ? ` | Type: <b>${lastMsg.meta.messageType}</b>` : '';
    const hOverrideStr = lastMsg.meta.problemOverride ? ' | <b style="color:#d97706">🔀 Problem Override</b>' : '';

    const usageStr = lastMsg.meta.usage
      ? ' | Tokens: <b>' + (lastMsg.meta.usage.prompt_tokens || 'N/A') + 'p + ' + (lastMsg.meta.usage.completion_tokens || 'N/A') + 'c = ' + (lastMsg.meta.usage.total_tokens || 'N/A') + '</b>'
      : '';

    metaEl.innerHTML = `${detectionPrefix}Intent: <b>${esc(lastMsg.meta.intent)}</b> | Routed to: <b>${esc(lastMsg.meta.routedAction)}</b>${hMsgTypeStr}${hOverrideStr}${lastMsg.meta.model ? ` | Model: <b>${esc(lastMsg.meta.model)}</b>` : ''} | Time: <b>${timeStr}</b> | Confidence: ${lastMsg.meta.confidence ? (lastMsg.meta.confidence * 100).toFixed(0) + '%' : 'N/A'}${kbFilesStr}${usageStr}`;
  }
}

/**
 * Load preview tab (initialize sessions list and messages)
 */
export function loadPreview() {
  renderSessionsList();
  renderChatMessages();
}
