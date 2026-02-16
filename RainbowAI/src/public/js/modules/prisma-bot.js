/**
 * prisma-bot.js — Prisma Bot chat panel for AI workflow generation
 * (Single Responsibility: floating button + slide-up chat + workflow preview + import)
 *
 * Visible only on the Responses > Smart Workflows sub-tab.
 */
import { api } from '../api.js';
import { toast } from '../toast.js';
import { escapeHtml as esc } from '../core/utils.js';

// ─── State ──────────────────────────────────────────────────────────

let panelOpen = false;
let chatHistory = [];     // { role: 'user'|'assistant', content: string }
let lastWorkflow = null;  // last generated workflow JSON
let generating = false;

// ─── Panel HTML ─────────────────────────────────────────────────────

function buildPanelHTML() {
  return '<div id="prisma-bot-panel" class="fixed bottom-20 right-6 w-96 bg-white border border-neutral-200 rounded-2xl shadow-xl flex flex-col z-50 overflow-hidden" style="height:520px;display:none;">'
    + '<div class="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between flex-shrink-0">'
    +   '<div class="flex items-center gap-2">'
    +     '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.04A1.5 1.5 0 0119.756 22h-7.512a1.5 1.5 0 01-1.446-1.66L12.2 15.3"/></svg>'
    +     '<span class="font-semibold text-sm">Prisma Bot</span>'
    +   '</div>'
    +   '<div class="flex items-center gap-1">'
    +     '<button onclick="clearPrismaBotChat()" class="text-white/70 hover:text-white p-1 rounded transition" title="Clear chat">'
    +       '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>'
    +     '</button>'
    +     '<button onclick="togglePrismaBotPanel()" class="text-white/70 hover:text-white p-1 rounded transition" title="Close">'
    +       '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
    +     '</button>'
    +   '</div>'
    + '</div>'
    + '<div id="prisma-bot-messages" class="flex-1 overflow-y-auto px-4 py-3 space-y-3" style="scroll-behavior:smooth;">'
    +   '<div class="flex gap-2">'
    +     '<div class="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">'
    +       '<svg class="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.04A1.5 1.5 0 0119.756 22h-7.512a1.5 1.5 0 01-1.446-1.66L12.2 15.3"/></svg>'
    +     '</div>'
    +     '<div class="bg-violet-50 border border-violet-100 rounded-2xl rounded-tl-md px-3 py-2 text-sm text-violet-900 max-w-[85%]">'
    +       'Hi! I\'m Prisma Bot. Describe a workflow in plain English, and I\'ll generate the JSON for you.<br><br>'
    +       '<span class="text-xs text-violet-500">Try: "Create a workflow that asks the guest for their name, check-in date, and number of guests, then notifies the admin"</span>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div id="prisma-bot-workflow-preview" class="hidden border-t bg-neutral-50 px-4 py-3 flex-shrink-0 max-h-48 overflow-y-auto">'
    +   '<div class="flex items-center justify-between mb-2">'
    +     '<span class="text-xs font-semibold text-neutral-600">Generated Workflow</span>'
    +     '<div class="flex gap-1">'
    +       '<button onclick="copyPrismaBotWorkflow()" class="text-xs bg-white border text-neutral-600 hover:bg-neutral-50 px-2 py-1 rounded-lg transition">Copy JSON</button>'
    +       '<button onclick="importPrismaBotWorkflow()" class="text-xs bg-violet-600 hover:bg-violet-700 text-white px-2 py-1 rounded-lg transition">Import</button>'
    +     '</div>'
    +   '</div>'
    +   '<div id="prisma-bot-workflow-summary" class="text-xs text-neutral-500"></div>'
    + '</div>'
    + '<div class="border-t px-3 py-3 flex gap-2 flex-shrink-0">'
    +   '<input type="text" id="prisma-bot-input" placeholder="Describe a workflow..." '
    +     'class="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" '
    +     'onkeydown="if(event.key===\'Enter\' && !event.shiftKey){event.preventDefault();sendPrismaBotMessage()}" />'
    +   '<button onclick="sendPrismaBotMessage()" id="prisma-bot-send-btn" '
    +     'class="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-xl transition text-sm font-medium">'
    +     'Send'
    +   '</button>'
    + '</div>'
    + '</div>';
}

function buildFloatingButtonHTML() {
  return '<button id="prisma-bot-fab" onclick="togglePrismaBotPanel()" '
    + 'class="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-all hover:scale-110" '
    + 'title="Prisma Bot — AI Workflow Generator" style="display:none;">'
    + '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.04A1.5 1.5 0 0119.756 22h-7.512a1.5 1.5 0 01-1.446-1.66L12.2 15.3"/></svg>'
    + '</button>';
}

// ─── Initialize (inject DOM elements) ───────────────────────────────

export function initPrismaBot() {
  // Remove existing elements if re-initializing
  var existing = document.getElementById('prisma-bot-fab');
  if (existing) existing.remove();
  var existingPanel = document.getElementById('prisma-bot-panel');
  if (existingPanel) existingPanel.remove();

  // Inject floating button and panel into body
  document.body.insertAdjacentHTML('beforeend', buildFloatingButtonHTML());
  document.body.insertAdjacentHTML('beforeend', buildPanelHTML());
}

// ─── Show/Hide FAB (only on workflows sub-tab) ─────────────────────

export function showPrismaBotFab() {
  var fab = document.getElementById('prisma-bot-fab');
  if (!fab) initPrismaBot();
  fab = document.getElementById('prisma-bot-fab');
  if (fab) fab.style.display = 'flex';
}

export function hidePrismaBotFab() {
  var fab = document.getElementById('prisma-bot-fab');
  if (fab) fab.style.display = 'none';
  var panel = document.getElementById('prisma-bot-panel');
  if (panel) panel.style.display = 'none';
  panelOpen = false;
}

// ─── Toggle Panel ───────────────────────────────────────────────────

export function togglePrismaBotPanel() {
  var panel = document.getElementById('prisma-bot-panel');
  if (!panel) {
    initPrismaBot();
    panel = document.getElementById('prisma-bot-panel');
  }
  panelOpen = !panelOpen;
  panel.style.display = panelOpen ? 'flex' : 'none';

  if (panelOpen) {
    var input = document.getElementById('prisma-bot-input');
    if (input) setTimeout(function() { input.focus(); }, 100);
  }
}

// ─── Send Message ───────────────────────────────────────────────────

export async function sendPrismaBotMessage() {
  if (generating) return;

  var input = document.getElementById('prisma-bot-input');
  var text = (input.value || '').trim();
  if (!text) return;

  input.value = '';

  // Add user message to chat
  chatHistory.push({ role: 'user', content: text });
  appendMessage('user', text);

  // Show loading
  generating = true;
  var sendBtn = document.getElementById('prisma-bot-send-btn');
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = '...';
  }

  appendMessage('assistant', '<span class="text-violet-400 animate-pulse">Generating workflow...</span>', true);

  try {
    var result = await api('/prisma-bot/generate', {
      method: 'POST',
      body: { description: text, history: chatHistory.slice(0, -1) }
    });

    // Remove loading message
    removeLastMessage();

    if (result.workflow) {
      lastWorkflow = result.workflow;
      var summary = buildWorkflowSummary(result.workflow);
      var responseText = 'Generated workflow: **' + esc(result.workflow.name || result.workflow.id) + '**'
        + '\n' + esc(String(result.workflow.nodes ? result.workflow.nodes.length : 0)) + ' nodes'
        + (result.model ? ' (via ' + esc(result.model) + ')' : '');
      chatHistory.push({ role: 'assistant', content: responseText });
      appendMessage('assistant', responseText);
      showWorkflowPreview(result.workflow);
    } else if (result.raw) {
      // AI responded but JSON parsing failed — show raw response
      chatHistory.push({ role: 'assistant', content: result.raw });
      appendMessage('assistant', esc(result.raw));
      if (result.parseError) {
        appendMessage('assistant', '<span class="text-amber-600 text-xs">JSON parse error: ' + esc(result.parseError) + '. Try asking me to fix the format.</span>', true);
      }
    } else {
      var errMsg = result.error || 'Failed to generate workflow';
      appendMessage('assistant', '<span class="text-red-500">' + esc(errMsg) + '</span>', true);
    }
  } catch (err) {
    removeLastMessage();
    appendMessage('assistant', '<span class="text-red-500">Error: ' + esc(err.message || 'Request failed') + '</span>', true);
  } finally {
    generating = false;
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
    }
  }
}

// ─── Chat Message Rendering ─────────────────────────────────────────

function appendMessage(role, content, isHTML) {
  var container = document.getElementById('prisma-bot-messages');
  if (!container) return;

  var div = document.createElement('div');
  div.className = 'flex gap-2' + (role === 'user' ? ' justify-end' : '');

  if (role === 'user') {
    div.innerHTML = '<div class="bg-violet-600 text-white rounded-2xl rounded-tr-md px-3 py-2 text-sm max-w-[85%]">'
      + (isHTML ? content : esc(content))
      + '</div>';
  } else {
    div.innerHTML = '<div class="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">'
      + '<svg class="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.04A1.5 1.5 0 0119.756 22h-7.512a1.5 1.5 0 01-1.446-1.66L12.2 15.3"/></svg>'
      + '</div>'
      + '<div class="bg-violet-50 border border-violet-100 rounded-2xl rounded-tl-md px-3 py-2 text-sm text-violet-900 max-w-[85%]">'
      + (isHTML ? content : esc(content))
      + '</div>';
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeLastMessage() {
  var container = document.getElementById('prisma-bot-messages');
  if (container && container.lastChild) {
    container.removeChild(container.lastChild);
  }
}

// ─── Workflow Preview ───────────────────────────────────────────────

function showWorkflowPreview(workflow) {
  var preview = document.getElementById('prisma-bot-workflow-preview');
  var summary = document.getElementById('prisma-bot-workflow-summary');
  if (!preview || !summary) return;

  preview.classList.remove('hidden');
  summary.innerHTML = buildWorkflowSummary(workflow);
}

function buildWorkflowSummary(workflow) {
  var nodes = workflow.nodes || [];
  var parts = [];
  parts.push('<div class="font-semibold text-neutral-700 mb-1">' + esc(workflow.name || workflow.id) + '</div>');
  parts.push('<div class="space-y-1">');
  for (var i = 0; i < nodes.length && i < 8; i++) {
    var n = nodes[i];
    var icon = getNodeIcon(n.type);
    var label = n.label || n.id;
    parts.push('<div class="flex items-center gap-1.5">'
      + '<span class="text-xs">' + icon + '</span>'
      + '<span class="text-xs text-neutral-600">' + esc(label) + '</span>'
      + '<span class="text-[10px] text-neutral-400 font-mono">(' + esc(n.type) + ')</span>'
      + '</div>');
  }
  if (nodes.length > 8) {
    parts.push('<div class="text-[10px] text-neutral-400">+ ' + (nodes.length - 8) + ' more nodes</div>');
  }
  parts.push('</div>');
  return parts.join('');
}

function getNodeIcon(type) {
  switch (type) {
    case 'message': return '<span class="text-blue-500">&#9993;</span>';
    case 'wait_reply': return '<span class="text-purple-500">&#8987;</span>';
    case 'whatsapp_send': return '<span class="text-green-500">&#9993;</span>';
    case 'pelangi_api': return '<span class="text-orange-500">&#9881;</span>';
    case 'condition': return '<span class="text-amber-500">&#9055;</span>';
    default: return '<span class="text-neutral-400">&#8226;</span>';
  }
}

// ─── Import Workflow ────────────────────────────────────────────────

export async function importPrismaBotWorkflow() {
  if (!lastWorkflow) {
    toast('No workflow to import', 'error');
    return;
  }

  var wf = lastWorkflow;
  if (!wf.id || !wf.name) {
    toast('Generated workflow is missing id or name', 'error');
    return;
  }

  try {
    var body = {
      id: wf.id,
      name: wf.name,
      steps: wf.steps || [],
      format: wf.format || 'nodes',
      nodes: wf.nodes || [],
      startNodeId: wf.startNodeId || ''
    };

    await api('/workflows/' + encodeURIComponent(wf.id), { method: 'PUT', body: body });
    toast('Workflow imported: ' + wf.name);

    // Reload workflows list and select the new one
    if (window.loadWorkflow) await window.loadWorkflow();
    if (window.selectWorkflow) window.selectWorkflow(wf.id);
  } catch (err) {
    toast('Import failed: ' + (err.message || err), 'error');
  }
}

// ─── Copy Workflow JSON ─────────────────────────────────────────────

export function copyPrismaBotWorkflow() {
  if (!lastWorkflow) {
    toast('No workflow to copy', 'error');
    return;
  }

  var json = JSON.stringify(lastWorkflow, null, 2);
  navigator.clipboard.writeText(json).then(function() {
    toast('Workflow JSON copied to clipboard');
  }).catch(function() {
    toast('Failed to copy', 'error');
  });
}

// ─── Clear Chat ─────────────────────────────────────────────────────

export function clearPrismaBotChat() {
  chatHistory = [];
  lastWorkflow = null;

  var container = document.getElementById('prisma-bot-messages');
  if (container) {
    container.innerHTML = '<div class="flex gap-2">'
      + '<div class="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">'
      + '<svg class="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 5.04A1.5 1.5 0 0119.756 22h-7.512a1.5 1.5 0 01-1.446-1.66L12.2 15.3"/></svg>'
      + '</div>'
      + '<div class="bg-violet-50 border border-violet-100 rounded-2xl rounded-tl-md px-3 py-2 text-sm text-violet-900 max-w-[85%]">'
      + 'Chat cleared. Describe a new workflow to get started!'
      + '</div>'
      + '</div>';
  }

  var preview = document.getElementById('prisma-bot-workflow-preview');
  if (preview) preview.classList.add('hidden');
}
