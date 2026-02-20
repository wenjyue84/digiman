// ═══════════════════════════════════════════════════════════════════
// Prisma AI — Floating assistant window for staff (US-009 to US-013)
// ═══════════════════════════════════════════════════════════════════

import { $ } from './live-chat-state.js';

var api = window.api;

// Session state
var prismaHistory = [];      // { role: 'user'|'assistant', content: string }[]
var prismaSource = 'knowledge_base';
var _prismaOpen = false;

// ─── On-demand panel creation (for tabs other than live-chat) ───────

function _ensurePrismaPanel() {
  if (document.getElementById('prisma-panel')) return;
  var panel = document.createElement('div');
  panel.id = 'prisma-panel';
  panel.className = 'prisma-panel';
  panel.style.display = 'none';
  panel.innerHTML =
    '<div class="prisma-header" id="prisma-header">' +
      '<div class="prisma-title">✦ Prisma AI</div>' +
      '<div class="prisma-header-actions">' +
        '<button class="prisma-btn-icon" onclick="lcMinimisePrisma()" title="Minimise">—</button>' +
        '<button class="prisma-btn-icon" onclick="lcClosePrismaWindow()" title="Close">✕</button>' +
      '</div>' +
    '</div>' +
    '<div class="prisma-sources">' +
      '<button class="prisma-source-chip active" data-source="knowledge_base" onclick="lcPrismaSetSource(\'knowledge_base\')">Knowledge Base</button>' +
      '<button class="prisma-source-chip" data-source="mcp_server" onclick="lcPrismaSetSource(\'mcp_server\')">MCP Server</button>' +
      '<button class="prisma-source-chip" data-source="all_history" onclick="lcPrismaSetSource(\'all_history\')">All History</button>' +
      '<button class="prisma-source-chip" data-source="internet" onclick="lcPrismaSetSource(\'internet\')">Internet</button>' +
    '</div>' +
    '<div class="prisma-messages" id="prisma-messages">' +
      '<div class="prisma-welcome">Ask me anything about the hostel, guests, or bookings.</div>' +
    '</div>' +
    '<div class="prisma-input-area">' +
      '<textarea class="prisma-input" id="prisma-input" rows="1" placeholder="Ask Prisma..." onkeydown="lcPrismaKeydown(event)" oninput="lcPrismaAutoResize(this)"></textarea>' +
      '<button class="prisma-send-btn" onclick="lcPrismaSend()" title="Send">' +
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/></svg>' +
      '</button>' +
    '</div>';
  document.body.appendChild(panel);

  var fab = document.createElement('button');
  fab.id = 'prisma-fab';
  fab.className = 'prisma-fab';
  fab.style.display = 'none';
  fab.title = 'Ask Prisma AI';
  fab.textContent = '✦ Prisma';
  fab.addEventListener('click', openPrismaWindow);
  document.body.appendChild(fab);

  initPrismaPanel();
}

// ─── Open / Close / Minimise ────────────────────────────────────────

export function openPrismaWindow() {
  _ensurePrismaPanel(); // Create panel DOM on-demand if not yet present
  var panel = document.getElementById('prisma-panel');
  var fab = document.getElementById('prisma-fab');
  if (!panel) return;
  panel.style.display = 'flex';
  if (fab) fab.style.display = 'none';
  _prismaOpen = true;
  // Close header menu if open
  var dropdown = document.getElementById('lc-header-dropdown');
  if (dropdown) dropdown.classList.remove('open');
  var btn = document.getElementById('lc-header-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  // Focus input
  var inp = document.getElementById('prisma-input');
  if (inp) inp.focus();
}

export function closePrismaWindow() {
  var panel = document.getElementById('prisma-panel');
  var fab = document.getElementById('prisma-fab');
  if (panel) panel.style.display = 'none';
  if (fab) fab.style.display = 'none';
  _prismaOpen = false;
  // Reset session history on close
  prismaHistory = [];
  var msgs = document.getElementById('prisma-messages');
  if (msgs) msgs.innerHTML = '<div class="prisma-welcome">Ask me anything about the hostel, guests, or bookings.</div>';
}

export function minimisePrisma() {
  var panel = document.getElementById('prisma-panel');
  var fab = document.getElementById('prisma-fab');
  if (panel) panel.style.display = 'none';
  if (fab) fab.style.display = 'flex';
}

// ─── Source selector ────────────────────────────────────────────────

export function prismaSetSource(src) {
  prismaSource = src;
  document.querySelectorAll('.prisma-source-chip').forEach(function (chip) {
    chip.classList.toggle('active', chip.getAttribute('data-source') === src);
  });
}

// ─── Send message ───────────────────────────────────────────────────

export async function prismaSend() {
  var inp = document.getElementById('prisma-input');
  if (!inp) return;
  var question = inp.value.trim();
  if (!question) return;
  inp.value = '';
  inp.style.height = '';

  _appendPrismaMsg('user', question);
  prismaHistory.push({ role: 'user', content: question });

  // Trim to last 40 items (20 exchanges) — US-013
  if (prismaHistory.length > 40) prismaHistory = prismaHistory.slice(-40);

  // Show typing indicator
  var typingId = _showPrismaTyping();

  try {
    var body = {
      question: question,
      source: prismaSource,
      conversationHistory: prismaHistory.slice(0, -1) // exclude current msg (already added)
    };
    // US-012: include current conversation messages for all_history source
    if (prismaSource === 'all_history' && $.activePhone) {
      body.activePhone = $.activePhone;
    }

    var result = await api('/prisma/ask', { method: 'POST', body: body });
    _removePrismaTyping(typingId);

    var answer = result.answer || 'No answer received.';
    var sourceUsed = result.sourceUsed || prismaSource;
    _appendPrismaMsg('assistant', answer, sourceUsed);
    prismaHistory.push({ role: 'assistant', content: answer });
    if (prismaHistory.length > 40) prismaHistory = prismaHistory.slice(-40);
  } catch (err) {
    _removePrismaTyping(typingId);
    var errMsg = "I couldn't find an answer. Try asking differently or choose a different source.";
    _appendPrismaMsg('assistant', errMsg, null, true);
  }
}

export function prismaKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    prismaSend();
  }
}

export function prismaAutoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ─── DOM helpers ────────────────────────────────────────────────────

function _appendPrismaMsg(role, content, sourceLabel, isError) {
  var msgs = document.getElementById('prisma-messages');
  if (!msgs) return;
  var el = document.createElement('div');
  el.className = 'prisma-msg prisma-msg-' + role;
  var escapeHtml = window.escapeHtml || function (s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var html = '<div class="prisma-bubble' + (isError ? ' prisma-bubble-error' : '') + '">' + escapeHtml(content).replace(/\n/g, '<br>') + '</div>';
  if (sourceLabel && role === 'assistant') {
    html += '<div class="prisma-source-label">via ' + escapeHtml(_sourceDisplayName(sourceLabel)) + '</div>';
  }
  el.innerHTML = html;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function _showPrismaTyping() {
  var msgs = document.getElementById('prisma-messages');
  if (!msgs) return null;
  var id = 'prisma-typing-' + Date.now();
  var el = document.createElement('div');
  el.id = id;
  el.className = 'prisma-msg prisma-msg-assistant';
  el.innerHTML = '<div class="prisma-bubble prisma-typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function _removePrismaTyping(id) {
  if (!id) return;
  var el = document.getElementById(id);
  if (el) el.remove();
}

function _sourceDisplayName(src) {
  var map = { knowledge_base: 'Knowledge Base', mcp_server: 'MCP Server', all_history: 'All History', internet: 'Internet' };
  return map[src] || src;
}

// ─── Drag support ───────────────────────────────────────────────────

export function initPrismaPanel() {
  var header = document.getElementById('prisma-header');
  var panel = document.getElementById('prisma-panel');
  if (!header || !panel) return;

  var dragging = false;
  var startX, startY, initLeft, initTop;

  header.addEventListener('mousedown', function (e) {
    if (e.target.closest('.prisma-btn-icon')) return;
    dragging = true;
    var rect = panel.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    initLeft = rect.left;
    initTop = rect.top;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    panel.style.left = Math.max(0, Math.min(window.innerWidth - 340, initLeft + dx)) + 'px';
    panel.style.top = Math.max(0, Math.min(window.innerHeight - 100, initTop + dy)) + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  function onMouseUp() {
    dragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}
