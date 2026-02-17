// ═══════════════════════════════════════════════════════════════════
// Chat Renderer Component - Reusable message bubble rendering
// ═══════════════════════════════════════════════════════════════════
//
// Purpose: Centralized message bubble generation for WhatsApp-style chats
//          across Live Chat, Quick Test, and Live Simulation tabs.
//
// Main Function:
// - renderMessageBubble(message, options) - Generate complete message bubble HTML
//
// Options:
// - side: 'left'|'right'|'guest'|'ai' - Bubble alignment and styling
// - devMode: boolean - Show AI metadata badges below message
// - enableEdit: boolean - Show inline edit panel for static replies/workflows
// - enableContextMenu: boolean - Show context menu button
// - searchQuery: string - Highlight search query in text
// - searchFocus: boolean - Highlight as current search match
// - timestamp: boolean - Show timestamp in footer
// - showFooter: boolean - Show bubble footer (default: true)
// - messageIndex: number - Index in conversation (for edit modal callbacks)
//
// ═══════════════════════════════════════════════════════════════════

import { getMetadataBadges, getTierBadge, getConfidenceBadge, getResponseTimeBadge } from './metadata-badges.js';

/**
 * HTML escape utility
 * @param {string} str - String to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Detect if message contains system-formatted content (markdown-style)
 * @param {string} content - Message content
 * @returns {boolean} True if contains system markdown
 */
function hasSystemContent(content) {
  if (!content) return false;
  // Check for markdown-style headers, lists, or special system indicators
  return /^(#{1,6}\s|[-*]\s|\d+\.\s|>\s|🌈|🔔)/.test(content) ||
    content.includes('##') ||
    content.includes('**') ||
    content.includes('- ') ||
    content.includes('> ');
}

/**
 * Format system message content (preserve markdown-like formatting)
 * @param {string} content - System message content
 * @returns {string} Formatted HTML
 */
function formatSystemContent(content) {
  if (!content) return '';
  // Preserve newlines and basic markdown-style formatting
  let html = escapeHtml(content);

  // Convert headers: ## Text -> <strong>Text</strong>
  html = html.replace(/^(#{1,6})\s(.+)$/gm, (_, hashes, text) => {
    return '<strong>' + text + '</strong>';
  });

  // Convert bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert lists: - item -> • item
  html = html.replace(/^[-*]\s(.+)$/gm, '• $1');

  // Convert blockquotes: > text -> indent
  html = html.replace(/^>\s(.+)$/gm, '<span style="padding-left:1em;opacity:0.7;">$1</span>');

  return html;
}

/**
 * Extract user message content (remove any system prefixes)
 * @param {string} content - Message content
 * @returns {string} Cleaned user message
 */
function getUserMessage(content) {
  if (!content) return '';
  // Remove any accidental system markers
  return content.replace(/^(🌈|🔔)\s*/, '');
}

/**
 * Highlight search query in text
 * @param {string} text - Text to search in
 * @param {string} query - Search query
 * @param {boolean} isFocused - Is this the current search match?
 * @returns {string} HTML with highlighted matches
 */
function highlightSearchQuery(text, query, isFocused = false) {
  if (!query || !text) return escapeHtml(text);

  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query);

  // Case-insensitive search
  const regex = new RegExp('(' + escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');

  const highlightClass = isFocused ? 'rc-search-focus' : 'rc-search-match';

  return escapedText.replace(regex, '<mark class="' + highlightClass + '">$1</mark>');
}

/**
 * Generate inline edit panel HTML for editable messages
 * @param {Object} message - Message object
 * @param {string} editId - Unique ID for edit panel
 * @param {Object} editMeta - Edit metadata (type, intent, workflowId, etc.)
 * @returns {string} Edit panel HTML
 */
function generateEditPanel(message, editId, editMeta) {
  if (!editMeta) return '';

  const em = editMeta;
  const langs = em.languages || { en: '', ms: '', zh: '' };

  let editLabel = '';
  let editBadgeColor = '';
  if (em.type === 'knowledge') {
    editLabel = 'Quick Reply';
    editBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (em.type === 'workflow') {
    editLabel = 'Workflow Step';
    editBadgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }
  if (em.type === 'template') {
    editLabel = 'System Message';
    editBadgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
  }

  const sourceLabel = em.type === 'knowledge'
    ? 'Quick Reply: ' + em.intent
    : em.type === 'workflow'
      ? (em.workflowName || em.workflowId) + ' → Step ' + ((em.stepIndex || 0) + 1)
      : 'Template: ' + (em.templateKey || '');

  const editBtnHtml = '<button onclick="toggleInlineEdit(\'' + editId + '\')" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 ' + editBadgeColor + ' border rounded text-xs cursor-pointer hover:opacity-80 transition" title="Click to edit this ' + editLabel + '" role="button" tabindex="0">✏️ ' + editLabel + '</button>';

  const alsoTemplateHtml = em.alsoTemplate
    ? '<button onclick="toggleInlineEdit(\'' + editId + '-tmpl\')" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-xs cursor-pointer hover:opacity-80 transition" title="Also edit the System Message version">✏️ System Message</button>'
    : '';

  const langMap = { 'en': 'EN', 'ms': 'BM', 'zh': 'ZH' };
  const langCode = message.detectedLanguage || em.detectedLanguage || '';
  const langBadge = langCode ? '<span class="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded font-medium text-xs">' + (langMap[langCode] || langCode.toUpperCase()) + '</span>' : '';

  const editPanelHtml = '<div id="' + editId + '" class="hidden mt-2 pt-2 border-t border-dashed" data-edit-meta=\'' + JSON.stringify(em).replace(/'/g, '&#39;') + '\'>' +
    '<div class="flex items-center justify-between mb-1.5">' +
    '<span class="text-xs font-semibold text-neutral-600">Editing ' + editLabel + ': <span class="font-mono">' + escapeHtml(sourceLabel) + '</span></span>' +
    '</div>' +
    '<div class="space-y-1.5">' +
    '<div><label class="text-xs text-neutral-400 font-medium">English</label><textarea data-lang="en" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="3">' + escapeHtml(langs.en) + '</textarea></div>' +
    '<div><label class="text-xs text-neutral-400 font-medium">Malay</label><textarea data-lang="ms" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">' + escapeHtml(langs.ms) + '</textarea></div>' +
    '<div><label class="text-xs text-neutral-400 font-medium">Chinese</label><textarea data-lang="zh" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">' + escapeHtml(langs.zh) + '</textarea></div>' +
    '</div>' +
    '<div class="flex gap-2 mt-2 flex-wrap">' +
    '<button type="button" onclick="translateInlineEditPanel(\'' + editId + '\')" class="px-3 py-1 bg-success-500 text-white text-xs rounded-lg hover:bg-success-600 transition font-medium" title="Fill missing languages (same AI as LLM reply)">Translate</button>' +
    '<button onclick="saveInlineEdit(\'' + editId + '\')" class="px-3 py-1 bg-primary-500 text-white text-xs rounded-lg hover:bg-primary-600 transition font-medium">Save</button>' +
    '<button onclick="toggleInlineEdit(\'' + editId + '\')" class="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-lg hover:bg-neutral-200 transition">Cancel</button>' +
    '</div>' +
    '</div>';

  let alsoTemplatePanelHtml = '';
  if (em.alsoTemplate) {
    const tLangs = em.alsoTemplate.languages || { en: '', ms: '', zh: '' };
    const tmplMeta = JSON.stringify({
      type: 'template',
      templateKey: em.alsoTemplate.key,
      languages: em.alsoTemplate.languages
    }).replace(/'/g, '&#39;');

    alsoTemplatePanelHtml = '<div id="' + editId + '-tmpl" class="hidden mt-2 pt-2 border-t border-dashed" data-edit-meta=\'' + tmplMeta + '\'>' +
      '<div class="flex items-center justify-between mb-1.5"><span class="text-xs font-semibold text-neutral-600">Editing System Message: <span class="font-mono">' + escapeHtml(em.alsoTemplate.key) + '</span></span></div>' +
      '<div class="space-y-1.5">' +
      '<div><label class="text-xs text-neutral-400 font-medium">English</label><textarea data-lang="en" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="3">' + escapeHtml(tLangs.en) + '</textarea></div>' +
      '<div><label class="text-xs text-neutral-400 font-medium">Malay</label><textarea data-lang="ms" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">' + escapeHtml(tLangs.ms) + '</textarea></div>' +
      '<div><label class="text-xs text-neutral-400 font-medium">Chinese</label><textarea data-lang="zh" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">' + escapeHtml(tLangs.zh) + '</textarea></div>' +
      '</div>' +
      '<div class="flex gap-2 mt-2 flex-wrap">' +
      '<button type="button" onclick="translateInlineEditPanel(\'' + editId + '-tmpl\')" class="px-3 py-1 bg-success-500 text-white text-xs rounded-lg hover:bg-success-600 transition font-medium" title="Fill missing languages (same AI as LLM reply)">Translate</button>' +
      '<button onclick="saveInlineEdit(\'' + editId + '-tmpl\')" class="px-3 py-1 bg-sky-500 text-white text-xs rounded-lg hover:bg-sky-600 transition font-medium">Save System Message</button>' +
      '<button onclick="toggleInlineEdit(\'' + editId + '-tmpl\')" class="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-lg hover:bg-neutral-200 transition">Cancel</button>' +
      '</div>' +
      '</div>';
  }

  return {
    editBtnHtml,
    alsoTemplateHtml,
    langBadge,
    editPanelHtml,
    alsoTemplatePanelHtml
  };
}

// Double checkmark SVG for read receipts (US-183)
const CHECKMARK_SVG = '<span class="rc-bubble-check"><svg viewBox="0 0 16 11" width="16" height="11"><path d="M11.07.86l-1.43.77L5.64 7.65 2.7 5.32l-1.08 1.3L5.88 9.9l5.19-9.04z" fill="currentColor"/><path d="M15.07.86l-1.43.77L9.64 7.65 8.8 7.01l-.86 1.5 2.04 1.39 5.09-9.04z" fill="currentColor"/></svg></span>';

/**
 * Render a complete message bubble
 * @param {Object} message - Message object
 * @param {Object} options - Rendering options
 * @returns {string} Complete HTML for message bubble
 */
export function renderMessageBubble(message, options = {}) {
  const opts = {
    side: 'left', // 'left'|'right'|'guest'|'ai'
    devMode: false,
    enableEdit: false,
    enableContextMenu: false,
    searchQuery: '',
    searchFocus: false,
    timestamp: true,
    showFooter: true,
    messageIndex: null,
    isContinuation: false,
    ...options
  };

  // Normalize side ('left'/'right' or 'guest'/'ai')
  const side = opts.side === 'guest' || opts.side === 'left' ? 'guest' : 'ai';
  const isGuest = side === 'guest';

  // Extract metadata (supports both msg.meta and msg.* directly)
  const meta = message.meta || message;

  // Detect system message
  const isSystem = hasSystemContent(message.content);
  const systemClass = isSystem ? ' lc-system-msg' : '';

  // Consecutive message grouping (US-183)
  const continuationClass = opts.isContinuation ? ' continuation' : '';

  // Format content
  let displayContent = isSystem
    ? formatSystemContent(message.content)
    : opts.searchQuery
      ? highlightSearchQuery(message.content, opts.searchQuery, opts.searchFocus)
      : escapeHtml(message.content);

  // Edit panel logic (for AI messages only)
  const editMeta = meta.editMeta;
  const editId = meta.messageId || 'edit-msg-' + (opts.messageIndex || Date.now());
  let editPanelData = null;

  if (opts.enableEdit && editMeta) {
    editPanelData = generateEditPanel(message, editId, editMeta);

    // Make content clickable to toggle edit panel
    const contentClickable = 'cursor-pointer hover:bg-neutral-50 rounded -mx-1 px-1 py-0.5 transition';
    const contentOnclick = 'onclick="toggleInlineEdit(\'' + editId + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toggleInlineEdit(\'' + editId + '\')}" title="Click to edit this reply" role="button" tabindex="0"';

    displayContent = '<div id="' + editId + '-text" class="' + contentClickable + '" ' + contentOnclick + '>' + displayContent + '</div>';
  } else {
    displayContent = '<div class="text-sm whitespace-pre-wrap">' + displayContent + '</div>';
  }

  // Generate metadata panel (dev mode) — US-185 collapsible panel
  let devMetaBadges = '';
  let kbFilesHtml = '';

  if (opts.devMode && !isGuest && meta) {
    const badges = getMetadataBadges(meta, {
      showSentiment: true,
      kbClickHandler: 'openKBFileFromPreview'
    });
    devMetaBadges = badges.inline;
    kbFilesHtml = badges.kbFiles;
  }

  // WhatsApp-style inline footer: timestamp + checkmark/manual (US-183)
  let footerHtml = '';
  if (opts.showFooter) {
    let footerInner = '';

    // Manual flag
    if (!isGuest && message.manual) {
      footerInner += '<span class="rc-bubble-manual-tag">Manual</span>';
    }

    // Timestamp
    if (opts.timestamp && message.timestamp) {
      const time = new Date(message.timestamp).toLocaleTimeString('en-MY', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      footerInner += '<span class="rc-bubble-time">' + time + '</span>';
    }

    // Double checkmark for bot messages (US-183)
    if (!isGuest) {
      footerInner += CHECKMARK_SVG;
    }

    if (footerInner) {
      footerHtml = '<div class="rc-bubble-footer">' + footerInner + '</div>';
    }
  }

  // Hover-only action buttons — only in dev mode (US-185)
  let actionsHtml = '';
  if (opts.devMode || opts.enableEdit) {
    const actionBtns = [];

    if (opts.devMode && isGuest && opts.messageIndex !== null) {
      actionBtns.push('<button type="button" onclick="openAddToTrainingExampleModal(' + opts.messageIndex + ')" title="Add to Training Examples">📚 Add</button>');
    }

    if (opts.devMode && opts.messageIndex !== null && !isGuest && !message.manual) {
      const canEdit = (meta.routedAction === 'static_reply' && meta.intent) ||
        (meta.routedAction === 'workflow' && meta.workflowId && meta.stepId);
      if (canEdit) {
        actionBtns.push('<button type="button" onclick="openRcEditModal(' + opts.messageIndex + ')" title="Save to Responses">✏️ Edit</button>');
      }
    }

    if (opts.enableEdit && editPanelData) {
      actionBtns.push(editPanelData.editBtnHtml);
      if (editPanelData.alsoTemplateHtml) {
        actionBtns.push(editPanelData.alsoTemplateHtml);
      }
    }

    if (actionBtns.length > 0) {
      actionsHtml = '<div class="rc-bubble-actions">' + actionBtns.join('') + '</div>';
    }
  }

  // Dev mode collapsible metadata panel (US-185)
  let devMetaSection = '';
  if (opts.devMode && !isGuest && meta) {
    var panelId = 'rc-devpanel-' + (opts.messageIndex || Date.now());
    var rows = [];
    if (meta.source) rows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Tier</span><span class="rc-dev-panel-value">' + getTierBadge(meta.source) + '</span></div>');
    if (meta.intent) rows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Intent</span><span class="rc-dev-panel-value">' + escapeHtml(meta.intent) + '</span></div>');
    if (meta.confidence != null) rows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Confidence</span><span class="rc-dev-panel-value">' + getConfidenceBadge(meta.confidence) + '</span></div>');
    if (meta.model) rows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Provider</span><span class="rc-dev-panel-value">' + escapeHtml(meta.model) + '</span></div>');
    if (meta.responseTime) rows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Time</span><span class="rc-dev-panel-value">' + getResponseTimeBadge(meta.responseTime) + '</span></div>');
    if (meta.routedAction) rows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Action</span><span class="rc-dev-panel-value">' + escapeHtml(meta.routedAction) + '</span></div>');
    if (meta.sentiment) rows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Sentiment</span><span class="rc-dev-panel-value">' + escapeHtml(meta.sentiment) + '</span></div>');
    // US-001: Token usage row
    if (meta.usage && (meta.usage.prompt_tokens || meta.usage.completion_tokens)) {
      var pt = meta.usage.prompt_tokens || 0;
      var ct = meta.usage.completion_tokens || 0;
      var fmtTk = function(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); };
      var tokenText = fmtTk(pt) + ' in / ' + fmtTk(ct) + ' out';
      if (meta.contextCount != null) tokenText += ' | ' + meta.contextCount + ' msgs context';
      rows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Tokens</span><span class="rc-dev-panel-value"><span class="rc-dev-token-badge">' + tokenText + '</span></span></div>');
    } else if (meta.source === 'llm') {
      rows.push('<div class="rc-dev-panel-row"><span class="rc-dev-panel-label">Tokens</span><span class="rc-dev-panel-value" style="opacity:0.5;">N/A</span></div>');
    }
    if (meta.kbFiles && meta.kbFiles.length > 0) {
      var chips = meta.kbFiles.map(function(f) {
        return '<span class="rc-dev-panel-kb-chip" onclick="openKBFileFromPreview(\'' + escapeHtml(f) + '\')" title="View ' + escapeHtml(f) + '">' + escapeHtml(f) + '</span>';
      }).join('');
      rows.push('<div class="rc-dev-panel-kb"><div class="rc-dev-panel-row"><span class="rc-dev-panel-label">KB Files</span><span class="rc-dev-panel-value">' + chips + '</span></div></div>');
    }

    if (rows.length > 0) {
      devMetaSection = '<div class="rc-dev-panel-toggle" onclick="toggleDevPanel(\'' + panelId + '\', this)">' +
        '<span class="rc-dev-chevron">&#9660;</span>' +
        '<span>' + (meta.source ? getTierBadge(meta.source) : '') + (meta.intent ? ' ' + escapeHtml(meta.intent) : '') + '</span>' +
        '</div>' +
        '<div id="' + panelId + '" class="rc-dev-panel">' + rows.join('') + '</div>';
    }
  }

  // Combine edit panels if present
  let editPanelsHtml = '';
  if (editPanelData) {
    editPanelsHtml = editPanelData.editPanelHtml + editPanelData.alsoTemplatePanelHtml;
  }

  // Assemble complete bubble (US-183: WhatsApp-style layout, US-185: collapsible panel)
  const bubbleHtml = '<div class="rc-bubble-wrap ' + side + continuationClass + '">' +
    '<div class="rc-bubble ' + side + systemClass + '">' +
    displayContent +
    footerHtml +
    actionsHtml +
    devMetaSection +
    editPanelsHtml +
    '</div>' +
    '</div>';

  return bubbleHtml;
}

/**
 * Render multiple message bubbles with date separators
 * @param {Array} messages - Array of message objects
 * @param {Object} options - Rendering options (applied to all messages)
 * @returns {string} Complete HTML for all messages
 */
export function renderMessageList(messages, options = {}) {
  let html = '';
  let lastDate = '';
  let lastSide = '';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const currentSide = msg.role === 'user' || msg.fromMe === false ? 'guest' : 'ai';

    // Date separator
    if (msg.timestamp) {
      const msgDate = new Date(msg.timestamp).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      if (msgDate !== lastDate) {
        html += '<div class="rc-date-sep"><span>' + msgDate + '</span></div>';
        lastDate = msgDate;
        lastSide = '';
      }
    }

    // Consecutive message grouping (US-183)
    const isContinuation = currentSide === lastSide;
    lastSide = currentSide;

    // Render bubble
    const messageOptions = {
      ...options,
      messageIndex: i,
      side: currentSide,
      isContinuation: isContinuation
    };

    html += renderMessageBubble(msg, messageOptions);
  }

  return html;
}
