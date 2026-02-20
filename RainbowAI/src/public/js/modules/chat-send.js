/**
 * Chat Send Module
 * Handles sending messages in the Quick Test (Guest Simulation) chat.
 * Extracted from legacy-functions.js during refactoring.
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';
import {
    getCurrentSession,
    saveSessions,
    updateSessionTitle,
    renderSessionsList,
    renderChatMessages
} from './chat-preview.js';

// ─── Quick Test History ────────────────────────────────────────────
const QT_HISTORY_KEY = 'rainbow-quick-test-history';
const QT_HISTORY_MAX = 100;

function loadQuickTestHistory() {
    try {
        return JSON.parse(localStorage.getItem(QT_HISTORY_KEY) || '[]');
    } catch { return []; }
}

function saveQuickTestEntry(message, result) {
    const history = loadQuickTestHistory();
    history.unshift({
        timestamp: new Date().toISOString(),
        message,
        intent: result.intent || 'unknown',
        confidence: result.confidence || 0,
        tier: result.source || 'unknown',
        responseTime: result.responseTime || 0,
        action: result.routedAction || 'unknown'
    });
    // Keep max entries
    if (history.length > QT_HISTORY_MAX) history.length = QT_HISTORY_MAX;
    localStorage.setItem(QT_HISTORY_KEY, JSON.stringify(history));
}

export function showQuickTestHistory() {
    const modal = document.getElementById('qt-history-modal');
    if (!modal) return;
    const listEl = document.getElementById('qt-history-list');
    if (!listEl) return;

    const history = loadQuickTestHistory();
    if (history.length === 0) {
        listEl.innerHTML = '<div class="text-center text-neutral-400 text-sm py-12"><p>No quick test history yet</p><p class="text-xs mt-1">Send messages in Quick Test to build history</p></div>';
    } else {
        listEl.innerHTML = history.map(function(entry) {
            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            const confPct = entry.confidence ? (entry.confidence * 100).toFixed(0) + '%' : 'N/A';
            const respTime = entry.responseTime >= 1000 ? (entry.responseTime / 1000).toFixed(1) + 's' : entry.responseTime + 'ms';
            const tierLabel = entry.tier === 'fuzzy' ? 'T2 Fuzzy' : entry.tier === 'semantic' ? 'T3 Semantic' : entry.tier === 'llm' ? 'T4 LLM' : entry.tier === 'regex' ? 'T1 Regex' : entry.tier;
            return '<div class="bg-white border rounded-xl p-3 hover:border-primary-200 transition">' +
                '<div class="flex items-center justify-between mb-1.5">' +
                    '<span class="text-xs text-neutral-400">' + esc(timeStr) + '</span>' +
                    '<span class="text-xs font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">' + esc(respTime) + '</span>' +
                '</div>' +
                '<div class="text-sm text-neutral-800 mb-1.5 font-medium truncate" title="' + esc(entry.message) + '">' + esc(entry.message) + '</div>' +
                '<div class="flex items-center gap-2 flex-wrap">' +
                    '<span class="text-xs px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded font-mono">' + esc(entry.intent) + '</span>' +
                    '<span class="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">' + esc(tierLabel) + '</span>' +
                    '<span class="text-xs px-1.5 py-0.5 bg-success-50 text-success-700 rounded">' + confPct + '</span>' +
                    '<span class="text-xs px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded">' + esc(entry.action) + '</span>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    modal.classList.remove('hidden');
}

export function closeQuickTestHistory() {
    const modal = document.getElementById('qt-history-modal');
    if (modal) modal.classList.add('hidden');
}

export function clearQuickTestHistory() {
    if (!confirm('Clear all quick test history? This cannot be undone.')) return;
    localStorage.removeItem(QT_HISTORY_KEY);
    closeQuickTestHistory();
    toast('Quick test history cleared');
}

/**
 * Send a chat message in the Guest Simulation (Quick Test) tab.
 * Called from: chat-simulator.html onsubmit="sendChatMessage(event)"
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

    // Add user message to UI (guest bubble — left, white)
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'lc-bubble-wrap guest';
    userMsgEl.innerHTML = '<div class="lc-bubble guest"><div class="lc-bubble-text" style="white-space:pre-wrap;">' + esc(message) + '</div></div>';
    messagesEl.prepend(userMsgEl);
    messagesEl.scrollTop = 0;

    // Update session title if it's the first message
    if (session.history.length === 1) {
        updateSessionTitle(session.id);
    }

    // Clear input and disable button
    input.value = '';
    sendBtn.disabled = true;
    const origBtnHtml = sendBtn.innerHTML;
    sendBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" style="animation:spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/></svg>';

    // Show typing indicator (bot bubble style)
    const typingEl = document.createElement('div');
    typingEl.className = 'lc-bubble-wrap bot';
    typingEl.id = 'typing-indicator';
    typingEl.innerHTML = '<div class="lc-bubble bot" style="padding:10px 14px;">'
      + '<div style="display:flex;gap:4px;">'
      + '<div style="width:8px;height:8px;background:#667781;border-radius:50%;animation:bounce 1.4s infinite ease-in-out;animation-delay:0ms;"></div>'
      + '<div style="width:8px;height:8px;background:#667781;border-radius:50%;animation:bounce 1.4s infinite ease-in-out;animation-delay:150ms;"></div>'
      + '<div style="width:8px;height:8px;background:#667781;border-radius:50%;animation:bounce 1.4s infinite ease-in-out;animation-delay:300ms;"></div>'
      + '</div></div>';
    messagesEl.prepend(typingEl);
    messagesEl.scrollTop = 0;

    try {
        // Send to API (exclude last user message from history)
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

        // Inline edit: generate stable id
        const em = result.editMeta;
        const isEditable = !!em;
        const editId = isEditable ? `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : '';

        // Add assistant message to session history with metadata
        session.history.push({
            role: 'assistant',
            content: result.message,
            meta: {
                intent: result.intent,
                source: result.source,
                routedAction: result.routedAction,
                confidence: result.confidence,
                model: result.model,
                responseTime: result.responseTime,
                kbFiles: result.kbFiles || [],
                messageType: result.messageType || 'info',
                problemOverride: result.problemOverride || false,
                sentiment: result.sentiment || null,
                editMeta: result.editMeta || null,
                messageId: editId || undefined,
                usage: result.usage || null,
                tokenBreakdown: result.tokenBreakdown || null,
                contextCount: result.contextCount ?? null
            }
        });

        // Save sessions
        saveSessions();
        renderSessionsList();

        // Save to quick test history
        saveQuickTestEntry(message, result);

        // Re-render all messages (reuse existing rendering logic from chat-preview)
        renderChatMessages();

        // Update meta info bar
        const metaEl = document.getElementById('chat-meta');
        if (metaEl && window.MetadataBadges) {
            const timeStr = result.responseTime
                ? (result.responseTime >= 1000 ? (result.responseTime / 1000).toFixed(1) + 's' : result.responseTime + 'ms')
                : 'N/A';
            const detectionMethod = window.MetadataBadges.getTierLabel(result.source) || result.source || 'Unknown';
            const langMap = { 'en': 'EN', 'ms': 'BM', 'zh': 'ZH' };
            const langCode = result.detectedLanguage;
            const langDisplay = langCode ? (langMap[langCode] || langCode.toUpperCase()) : '?';
            const kbFilesStr = result.kbFiles && result.kbFiles.length > 0
                ? ` | KB: <b>${result.kbFiles.join(', ')}</b>`
                : '';
            const msgTypeStr = result.messageType ? ` | Type: <b>${result.messageType}</b>` : '';
            const sentimentStr = result.sentiment
                ? ` | Sentiment: <b>${result.sentiment === 'positive' ? '😊 positive' : result.sentiment === 'negative' ? '😠 negative' : '😐 neutral'}</b>`
                : '';
            const overrideStr = result.problemOverride ? ' | <b style="color:#d97706">🔀 Problem Override</b>' : '';

            const usageStr = result.usage
                ? ` | Tokens: <b>${result.usage.prompt_tokens || 'N/A'}p + ${result.usage.completion_tokens || 'N/A'}c = ${result.usage.total_tokens || 'N/A'}</b>`
                : '';
            const contextStr = result.contextCount != null ? ` | Context: <b>${result.contextCount} msgs</b>` : '';

            metaEl.innerHTML = `Detection: <b>${detectionMethod}</b> | Lang: <b>${langDisplay}</b> | Intent: <b>${esc(result.intent)}</b> | Routed to: <b>${esc(result.routedAction)}</b>${msgTypeStr}${sentimentStr}${overrideStr}${result.model ? ` | Model: <b>${esc(result.model)}</b>` : ''} | Time: <b>${timeStr}</b> | Confidence: ${result.confidence ? (result.confidence * 100).toFixed(0) + '%' : 'N/A'}${kbFilesStr}${usageStr}${contextStr}`;
        }

    } catch (error) {
        // Remove typing indicator
        typingEl.remove();

        // Show error inline (bot bubble with error styling)
        const errorMsgEl = document.createElement('div');
        errorMsgEl.className = 'lc-bubble-wrap bot';
        errorMsgEl.innerHTML = '<div class="lc-bubble bot" style="background:#fee2e2;border:1px solid #fecaca;">'
          + '<div class="lc-bubble-text" style="color:#991b1b;">Error: ' + esc(error.message || 'Failed to get response') + '</div>'
          + '</div>';
        messagesEl.prepend(errorMsgEl);
        messagesEl.scrollTop = 0;

        toast(error.message || 'Failed to send message', 'error');

    } finally {
        // Re-enable button
        sendBtn.disabled = false;
        sendBtn.innerHTML = origBtnHtml;
        input.focus();
    }
}
