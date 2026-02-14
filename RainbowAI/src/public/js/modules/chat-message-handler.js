/**
 * Chat Message Handler Module
 * Handles chat message submission for Preview tab (chat simulator)
 * - API integration with /preview/chat endpoint
 * - Typing indicators and UI updates
 * - Session history management
 * - Metadata badges and inline edit support
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';
import { getCurrentSession, saveSessions, renderSessionsList, updateSessionTitle } from './chat-preview.js';

/**
 * Send chat message to API and display response
 * Main handler for Preview tab chat functionality
 */
export async function sendChatMessage(event) {
  event.preventDefault();

  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  const sendBtn = document.getElementById('send-btn');
  const messagesEl = document.getElementById('chat-messages');
  const session = getCurrentSession();

  // Update session activity
  session.lastActivity = Date.now();

  // Clear placeholder if first message
  if (session.history.length === 0) {
    messagesEl.innerHTML = '';
  }

  // Add user message to session history
  session.history.push({ role: 'user', content: message });

  // Add user message to UI
  const userMsgEl = document.createElement('div');
  userMsgEl.className = 'flex justify-end';
  userMsgEl.innerHTML = `
    <div class="bg-primary-500 text-white rounded-2xl px-4 py-2 max-w-md">
      <div class="text-sm">${esc(message)}</div>
    </div>
  `;
  messagesEl.prepend(userMsgEl);
  messagesEl.scrollTop = 0;

  // Update session title if it's the first message
  if (session.history.length === 1) {
    updateSessionTitle(session.id);
  }

  // Clear input and disable button
  input.value = '';
  sendBtn.disabled = true;
  sendBtn.textContent = 'Thinking...';

  // Show typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'flex justify-start';
  typingEl.id = 'typing-indicator';
  typingEl.innerHTML = `
    <div class="bg-white border rounded-2xl px-4 py-2">
      <div class="flex gap-1">
        <div class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
        <div class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
        <div class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
      </div>
    </div>
  `;
  messagesEl.prepend(typingEl);
  messagesEl.scrollTop = 0;

  try {
    // Send to API (exclude last user message from history)
    // Use 90s timeout for long messages/conversations
    const result = await api('/preview/chat', {
      method: 'POST',
      body: {
        message,
        history: session.history.slice(0, -1),
        sessionId: session.id
      },
      timeout: 90000
    });

    // Remove typing indicator
    typingEl.remove();

    // Inline edit: generate stable id before push so re-renders can show edit UI
    const em = result.editMeta;
    const isEditable = !!em;
    const editId = isEditable ? `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : '';

    // Add assistant message to session history with metadata (include editMeta + messageId for click-to-edit on re-render)
    session.history.push({
      role: 'assistant',
      content: result.message,
      meta: {
        intent: result.intent,
        source: result.source, // Detection method: regex | fuzzy | semantic | llm
        routedAction: result.routedAction,
        confidence: result.confidence,
        model: result.model,
        responseTime: result.responseTime,
        kbFiles: result.kbFiles || [],
        messageType: result.messageType || 'info',
        problemOverride: result.problemOverride || false,
        sentiment: result.sentiment || null,
        editMeta: result.editMeta || null,
        messageId: editId || undefined
      }
    });

    // Save sessions
    saveSessions();
    renderSessionsList();

    // Add assistant message to UI
    const assistantMsgEl = document.createElement('div');
    assistantMsgEl.className = 'flex justify-start';

    // Detection method badge with display names
    const sourceLabelsMsg = {
      'regex': '🚨 Priority Keywords',
      'fuzzy': '⚡ Smart Matching',
      'semantic': '📚 Learning Examples',
      'llm': '🤖 AI Fallback'
    };
    const sourceColorsMsg = {
      'regex': 'bg-red-50 text-red-700',
      'fuzzy': 'bg-yellow-50 text-yellow-700',
      'semantic': 'bg-purple-50 text-purple-700',
      'llm': 'bg-blue-50 text-blue-700'
    };
    const sourceLabelMsg = result.source ? (sourceLabelsMsg[result.source] || result.source) : '';
    const sourceColorMsg = result.source ? sourceColorsMsg[result.source] || 'bg-neutral-50 text-neutral-700' : '';
    const sourceBadgeMsg = sourceLabelMsg ? `<span class="px-1.5 py-0.5 ${sourceColorMsg} rounded font-medium text-xs">${sourceLabelMsg}</span>` : '';

    // Use shared MetadataBadges component for badge generation
    const msgTypeBadge = window.MetadataBadges.getMessageTypeBadge(result.messageType);
    const overrideBadge = result.problemOverride ? '<span class="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-medium text-xs">🔀 Override → LLM</span>' : '';
    const sentimentBadge = window.MetadataBadges.getSentimentBadge(result.sentiment);
    const kbFilesBadge = window.MetadataBadges.getKBFilesBadge(result.kbFiles);

    // ── Inline Edit Support (em, isEditable, editId already set above) ──

    // Determine edit label using shared component
    const editTypeInfo2 = em ? (window.MetadataBadges.EDIT_TYPES[em.type] || { label: 'Edit', color: 'bg-neutral-50 text-neutral-700 border-neutral-200' }) : null;
    const editLabel = editTypeInfo2 ? editTypeInfo2.label : '';

    // Build edit button using shared component
    const editBtnHtml = isEditable ? window.MetadataBadges.getEditButton(em, editId) : '';

    // Also-template edit link using shared component
    const alsoTemplateHtml = (em && em.alsoTemplate) ? window.MetadataBadges.getAlsoTemplateButton(em.alsoTemplate, editId) : '';

    // Build inline edit panel (hidden by default)
    let editPanelHtml = '';
    if (isEditable) {
      const langs = em.languages || { en: '', ms: '', zh: '' };
      const sourceLabel = em.type === 'knowledge' ? `Quick Reply: ${em.intent}` : em.type === 'workflow' ? `${em.workflowName || em.workflowId} → Step ${(em.stepIndex || 0) + 1}` : `Template: ${em.templateKey || ''}`;
      editPanelHtml = `
        <div id="${editId}" class="hidden mt-2 pt-2 border-t border-dashed" data-edit-meta='${JSON.stringify(em).replace(/'/g, "&#39;")}'>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold text-neutral-600">Editing ${editLabel}: <span class="font-mono">${esc(sourceLabel)}</span></span>
          </div>
          <div class="space-y-1.5">
            <div>
              <label class="text-xs text-neutral-400 font-medium">English</label>
              <textarea data-lang="en" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="3">${esc(langs.en)}</textarea>
            </div>
            <div>
              <label class="text-xs text-neutral-400 font-medium">Malay</label>
              <textarea data-lang="ms" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">${esc(langs.ms)}</textarea>
            </div>
            <div>
              <label class="text-xs text-neutral-400 font-medium">Chinese</label>
              <textarea data-lang="zh" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">${esc(langs.zh)}</textarea>
            </div>
          </div>
          <div class="flex gap-2 mt-2 flex-wrap">
            <button type="button" onclick="translateInlineEditPanel('${editId}')" class="px-3 py-1 bg-success-500 text-white text-xs rounded-lg hover:bg-success-600 transition font-medium" title="Fill missing languages (same AI as LLM reply)">Translate</button>
            <button onclick="saveInlineEdit('${editId}')" class="px-3 py-1 bg-primary-500 text-white text-xs rounded-lg hover:bg-primary-600 transition font-medium">Save</button>
            <button onclick="toggleInlineEdit('${editId}')" class="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-lg hover:bg-neutral-200 transition">Cancel</button>
          </div>
        </div>`;
    }

    // Build also-template edit panel
    let alsoTemplatePanelHtml = '';
    if (em && em.alsoTemplate) {
      const tLangs = em.alsoTemplate.languages || { en: '', ms: '', zh: '' };
      const tmplMeta = JSON.stringify({ type: 'template', templateKey: em.alsoTemplate.key, languages: em.alsoTemplate.languages }).replace(/'/g, "&#39;");
      alsoTemplatePanelHtml = `
        <div id="${editId}-tmpl" class="hidden mt-2 pt-2 border-t border-dashed" data-edit-meta='${tmplMeta}'>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold text-neutral-600">Editing System Message: <span class="font-mono">${esc(em.alsoTemplate.key)}</span></span>
          </div>
          <div class="space-y-1.5">
            <div>
              <label class="text-xs text-neutral-400 font-medium">English</label>
              <textarea data-lang="en" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="3">${esc(tLangs.en)}</textarea>
            </div>
            <div>
              <label class="text-xs text-neutral-400 font-medium">Malay</label>
              <textarea data-lang="ms" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">${esc(tLangs.ms)}</textarea>
            </div>
            <div>
              <label class="text-xs text-neutral-400 font-medium">Chinese</label>
              <textarea data-lang="zh" class="w-full text-xs border border-neutral-200 rounded-lg p-2 resize-y focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none" rows="2">${esc(tLangs.zh)}</textarea>
            </div>
          </div>
          <div class="flex gap-2 mt-2 flex-wrap">
            <button type="button" onclick="translateInlineEditPanel('${editId}-tmpl')" class="px-3 py-1 bg-success-500 text-white text-xs rounded-lg hover:bg-success-600 transition font-medium" title="Fill missing languages (same AI as LLM reply)">Translate</button>
            <button onclick="saveInlineEdit('${editId}-tmpl')" class="px-3 py-1 bg-sky-500 text-white text-xs rounded-lg hover:bg-sky-600 transition font-medium">Save System Message</button>
            <button onclick="toggleInlineEdit('${editId}-tmpl')" class="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-lg hover:bg-neutral-200 transition">Cancel</button>
          </div>
        </div>`;
    }

    const langMap = { 'en': 'EN', 'ms': 'BM', 'zh': 'ZH' };
    const langCode = result.detectedLanguage;
    const langBadge = langCode ? `<span class="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded font-medium text-xs">${langMap[langCode] || langCode.toUpperCase()}</span>` : '';

    const isSystem = window.hasSystemContent(result.message);
    const displayContent = isSystem ? window.formatSystemContent(result.message) : window.getUserMessage(result.message);
    const systemClass = isSystem ? ' lc-system-msg' : '';

    assistantMsgEl.innerHTML = `
      <div class="bg-white border rounded-2xl px-4 py-2 max-w-md ${isEditable ? 'group' : ''}${systemClass}">
        <div id="${editId}-text" class="text-sm whitespace-pre-wrap ${isEditable ? 'cursor-pointer hover:bg-neutral-50 rounded -mx-1 px-1 py-0.5 transition' : ''}" ${isEditable ? `onclick="toggleInlineEdit('${editId}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleInlineEdit('${editId}')}" title="Click to edit this ${editLabel || 'reply'}" role="button" tabindex="0"` : ''}>${isSystem ? displayContent : esc(displayContent)}</div>
        <div class="mt-2 pt-2 border-t flex items-center gap-1.5 text-xs text-neutral-500 flex-wrap">
          ${sourceBadgeMsg}
          ${msgTypeBadge}
          ${sentimentBadge}
          ${overrideBadge}
          <span class="px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded font-mono">${esc(result.intent)}</span>
          <span class="px-1.5 py-0.5 bg-success-50 text-success-700 rounded">${esc(result.routedAction)}</span>
          ${langBadge}
          ${result.model && result.model !== 'none' ? `<span class="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-mono text-xs">${esc(result.model)}</span>` : ''}
          ${result.responseTime ? `<span class="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded">${result.responseTime >= 1000 ? (result.responseTime / 1000).toFixed(1) + 's' : result.responseTime + 'ms'}</span>` : ''}
          ${result.confidence ? `<span>${(result.confidence * 100).toFixed(0)}%</span>` : ''}
          ${editBtnHtml}
          ${alsoTemplateHtml}
        </div>
        ${kbFilesBadge}
        ${editPanelHtml}
        ${alsoTemplatePanelHtml}
      </div>
    `;
    messagesEl.prepend(assistantMsgEl);
    messagesEl.scrollTop = 0;

    // Update meta info
    const metaEl = document.getElementById('chat-meta');
    const timeStr = result.responseTime ? (result.responseTime >= 1000 ? (result.responseTime / 1000).toFixed(1) + 's' : result.responseTime + 'ms') : 'N/A';

    // Get detection method badge (display names)
    const sourceLabelsDetection = {
      'regex': '🚨 Priority Keywords',
      'fuzzy': '⚡ Smart Matching',
      'semantic': '📚 Learning Examples',
      'llm': '🤖 AI Fallback'
    };
    const detectionMethod = sourceLabelsDetection[result.source] || result.source || 'Unknown';

    const kbFilesStr = result.kbFiles && result.kbFiles.length > 0
      ? ` | KB: <b>${result.kbFiles.join(', ')}</b>`
      : '';
    const msgTypeStr = result.messageType ? ` | Type: <b>${result.messageType}</b>` : '';
    const sentimentStr = result.sentiment ? ` | Sentiment: <b>${result.sentiment === 'positive' ? '😊 positive' : result.sentiment === 'negative' ? '😠 negative' : '😐 neutral'}</b>` : '';
    const overrideStr = result.problemOverride ? ' | <b style="color:#d97706">🔀 Problem Override</b>' : '';

    const langDisplay = langCode ? (langMap[langCode] || langCode.toUpperCase()) : '?';
    const langStr = ` | Lang: <b>${langDisplay}</b>`;
    metaEl.innerHTML = `Detection: <b>${detectionMethod}</b>${langStr} | Intent: <b>${esc(result.intent)}</b> | Routed to: <b>${esc(result.routedAction)}</b>${msgTypeStr}${sentimentStr}${overrideStr}${result.model ? ` | Model: <b>${esc(result.model)}</b>` : ''} | Time: <b>${timeStr}</b> | Confidence: ${result.confidence ? (result.confidence * 100).toFixed(0) + '%' : 'N/A'}${kbFilesStr}`;

  } catch (error) {
    // Remove typing indicator
    typingEl.remove();

    // Show error message
    const errorMsgEl = document.createElement('div');
    errorMsgEl.className = 'flex justify-start';
    errorMsgEl.innerHTML = `
      <div class="bg-danger-50 border border-red-200 text-danger-800 rounded-2xl px-4 py-2 max-w-md">
        <div class="text-sm">❌ Error: ${esc(error.message || 'Failed to get response')}</div>
      </div>
    `;
    messagesEl.prepend(errorMsgEl);
    messagesEl.scrollTop = 0;

    toast(error.message || 'Failed to send message', 'error');

  } finally {
    // Re-enable button
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
    input.focus();
  }
}
