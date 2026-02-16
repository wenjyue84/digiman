/**
 * @fileoverview Multi-step workflow CRUD, node-based editor, and advanced settings
 * @module workflows
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';
import { updateWorkflowTestSelect } from './workflow-testing.js';

// ─── State ─────────────────────────────────────────────────────────────
// Cache key for centralized cacheManager (API-fetched data)
const WF_CACHE_KEY = 'workflows.list';
// Initialize cache with default value
window.cacheManager.set(WF_CACHE_KEY, { workflows: [] });

let currentWorkflowId = null;
let currentWorkflowSteps = [];

// Node-related state
let currentWorkflowFormat = 'steps';
let currentWorkflowNodes = [];
let currentStartNodeId = '';

// Node type metadata
const NODE_TYPES = {
  message:       { label: 'Message',       color: 'blue',   icon: '\u{1F4AC}' },
  wait_reply:    { label: 'Wait Reply',    color: 'purple', icon: '\u{23F3}' },
  whatsapp_send: { label: 'WhatsApp Send', color: 'green',  icon: '\u{1F4F1}' },
  pelangi_api:   { label: 'API Call',      color: 'orange', icon: '\u{1F50C}' },
  condition:     { label: 'Condition',     color: 'amber',  icon: '\u{1F500}' },
};

// ─── Exported Getters (for workflow-testing.js) ──────────────────────────
export function getCachedWorkflows() { return window.cacheManager.get(WF_CACHE_KEY); }

// ─── Main Loader ───────────────────────────────────────────────────────
export async function loadWorkflow() {
  try {
    const configs = await window.apiHelpers.loadMultipleConfigs(
      { workflowsData: '/workflows', advancedData: '/workflow' },
      { cacheKeys: { workflowsData: WF_CACHE_KEY } }
    );
    const { workflowsData, advancedData } = configs;
    renderWorkflowList();
    renderAdvancedSettings(advancedData);
    updateWorkflowTestSelect();
    if (currentWorkflowId) {
      const still = workflowsData.workflows.find(w => w.id === currentWorkflowId);
      if (still) selectWorkflow(currentWorkflowId);
      else { currentWorkflowId = null; hideWorkflowEditor(); }
    }
  } catch (e) { toast(window.apiHelpers.formatApiError(e), 'error'); }
}

// ─── Workflow List ─────────────────────────────────────────────────────
export function renderWorkflowList() {
  const el = document.getElementById('workflow-list');
  const wfs = window.cacheManager.get(WF_CACHE_KEY).workflows || [];
  if (wfs.length === 0) {
    el.innerHTML = '<p class="text-neutral-400 text-sm">No workflows yet</p>';
    return;
  }
  let html = '';
  wfs.forEach(function(w) {
    const isNodes = w.format === 'nodes' && Array.isArray(w.nodes);
    const count = isNodes ? w.nodes.length : (w.steps ? w.steps.length : 0);
    const unit = isNodes ? 'node' : 'step';
    const countText = count + ' ' + unit + (count !== 1 ? 's' : '');

    const isActive = currentWorkflowId === w.id;
    let cls = 'card-hover border rounded-xl p-3 relative cursor-pointer ';
    if (isActive) cls += 'border-primary-500 bg-primary-50';
    else if (w.featured) cls += 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-400';
    else cls += 'hover:border-neutral-300';

    html += '<div onclick="selectWorkflow(\'' + esc(w.id) + '\')" class="' + cls + '">';
    if (w.featured) {
      html += '<span class="absolute -top-1.5 -right-1.5 text-[10px] px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-semibold shadow-md">\u2B50 MOST USED</span>';
    }
    html += '<div class="font-medium text-sm ' + (w.featured ? 'text-green-900' : 'text-neutral-800') + '">' + esc(w.name) + '</div>';
    if (w.description) {
      html += '<div class="text-xs text-neutral-600 mt-0.5 line-clamp-2">' + esc(w.description) + '</div>';
    }
    html += '<div class="flex items-center gap-2 mt-1.5">';
    html += '<span class="text-xs font-mono text-neutral-400">' + esc(w.id) + '</span>';
    if (isNodes) {
      html += '<span class="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded font-medium">NODES</span>';
    }
    html += '<span class="text-xs ' + (w.featured ? 'text-green-600' : 'text-neutral-500') + '">' + countText + '</span>';
    html += '</div></div>';
  });
  el.innerHTML = html;
  updateWorkflowTestSelect();
}

export function hideWorkflowEditor() {
  document.getElementById('workflow-editor').classList.add('hidden');
  document.getElementById('workflow-editor-placeholder').classList.remove('hidden');
}

// ─── Select Workflow ───────────────────────────────────────────────────
export async function selectWorkflow(id) {
  currentWorkflowId = id;
  const wf = window.cacheManager.get(WF_CACHE_KEY).workflows.find(w => w.id === id);
  if (!wf) return;

  currentWorkflowSteps = JSON.parse(JSON.stringify(wf.steps || []));

  // Detect format
  const isNodes = wf.format === 'nodes' && Array.isArray(wf.nodes) && wf.nodes.length > 0;
  currentWorkflowFormat = isNodes ? 'nodes' : 'steps';
  currentWorkflowNodes = isNodes ? JSON.parse(JSON.stringify(wf.nodes)) : [];
  currentStartNodeId = wf.startNodeId || '';

  document.getElementById('wf-edit-name').value = wf.name;
  document.getElementById('wf-edit-id').textContent = wf.id;
  document.getElementById('workflow-editor').classList.remove('hidden');
  document.getElementById('workflow-editor-placeholder').classList.add('hidden');

  applyFormatToggle();
  renderWorkflowList();

  if (currentWorkflowFormat === 'nodes') {
    renderNodes();
  } else {
    renderSteps();
  }
}

// ─── Format Toggle ────────────────────────────────────────────────────
function applyFormatToggle() {
  const stepsBtn = document.getElementById('wf-format-steps-btn');
  const nodesBtn = document.getElementById('wf-format-nodes-btn');
  const stepsEditor = document.getElementById('wf-steps-editor');
  const nodesEditor = document.getElementById('wf-nodes-editor');

  if (currentWorkflowFormat === 'nodes') {
    stepsBtn.className = 'px-2.5 py-1 rounded-md transition font-medium text-neutral-500';
    nodesBtn.className = 'px-2.5 py-1 rounded-md transition font-medium bg-white shadow-sm text-primary-600';
    stepsEditor.classList.add('hidden');
    nodesEditor.classList.remove('hidden');
  } else {
    stepsBtn.className = 'px-2.5 py-1 rounded-md transition font-medium bg-white shadow-sm text-primary-600';
    nodesBtn.className = 'px-2.5 py-1 rounded-md transition font-medium text-neutral-500';
    stepsEditor.classList.remove('hidden');
    nodesEditor.classList.add('hidden');
  }
}

export function switchWorkflowFormat(format) {
  if (format === currentWorkflowFormat) return;
  currentWorkflowFormat = format;
  applyFormatToggle();
  if (format === 'nodes') renderNodes();
  else renderSteps();
}

// ─── Steps Editor (legacy) ─────────────────────────────────────────────
export function renderSteps() {
  const container = document.getElementById('wf-steps-container');
  if (currentWorkflowSteps.length === 0) {
    container.innerHTML = '<p class="text-neutral-400 text-sm text-center py-4">No steps yet. Click "+ Add Step" to begin.</p>';
    return;
  }
  let html = '';
  currentWorkflowSteps.forEach(function(step, idx) {
    let card = '<div class="relative">';
    if (idx > 0) card += '<div class="absolute left-5 -top-3 w-0.5 h-3 bg-neutral-300"></div>';
    card += '<div class="border rounded-xl p-3 bg-neutral-50 mb-1">';
    // Header
    card += '<div class="flex items-center justify-between mb-2"><div class="flex items-center gap-2">';
    card += '<span class="w-7 h-7 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">' + (idx + 1) + '</span>';
    card += '<span class="text-xs font-mono text-neutral-400">' + esc(step.id) + '</span>';
    card += '</div><div class="flex items-center gap-1">';
    if (idx > 0) card += '<button onclick="moveStep(' + idx + ', -1)" class="text-xs px-1.5 py-0.5 text-neutral-500 hover:bg-neutral-200 rounded" title="Move up">&#9650;</button>';
    if (idx < currentWorkflowSteps.length - 1) card += '<button onclick="moveStep(' + idx + ', 1)" class="text-xs px-1.5 py-0.5 text-neutral-500 hover:bg-neutral-200 rounded" title="Move down">&#9660;</button>';
    card += '<button onclick="removeStep(' + idx + ')" class="text-xs px-1.5 py-0.5 text-danger-500 hover:bg-danger-50 rounded" title="Delete step">&#10005;</button>';
    card += '</div></div>';
    // Messages
    card += '<div class="grid grid-cols-3 gap-2 mb-2">';
    card += '<div><label class="text-xs text-neutral-500">EN</label>';
    card += '<textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="step-en-' + idx + '" onchange="updateStepMessage(' + idx + ')">' + esc(step.message?.en || '') + '</textarea></div>';
    card += '<div><label class="text-xs text-neutral-500">MS</label>';
    card += '<textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="step-ms-' + idx + '" onchange="updateStepMessage(' + idx + ')">' + esc(step.message?.ms || '') + '</textarea></div>';
    card += '<div><label class="text-xs text-neutral-500">ZH</label>';
    card += '<textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="step-zh-' + idx + '" onchange="updateStepMessage(' + idx + ')">' + esc(step.message?.zh || '') + '</textarea></div>';
    card += '</div>';
    // Wait checkbox
    card += '<label class="flex items-center gap-2 text-xs text-neutral-600">';
    card += '<input type="checkbox" ' + (step.waitForReply ? 'checked' : '') + ' onchange="updateStepWait(' + idx + ', this.checked)" />';
    card += 'Wait for reply</label>';
    card += '</div></div>';
    html += card;
  });
  container.innerHTML = html;
}

export function updateStepMessage(idx) {
  currentWorkflowSteps[idx].message = {
    en: document.getElementById('step-en-' + idx).value,
    ms: document.getElementById('step-ms-' + idx).value,
    zh: document.getElementById('step-zh-' + idx).value
  };
}

export function updateStepWait(idx, checked) {
  currentWorkflowSteps[idx].waitForReply = checked;
}

export function addStep() {
  const id = 's' + (currentWorkflowSteps.length + 1);
  currentWorkflowSteps.push({ id, message: { en: '', ms: '', zh: '' }, waitForReply: true });
  renderSteps();
}

export function removeStep(idx) {
  currentWorkflowSteps.splice(idx, 1);
  renderSteps();
}

export function moveStep(idx, direction) {
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= currentWorkflowSteps.length) return;
  for (let i = 0; i < currentWorkflowSteps.length; i++) {
    const enEl = document.getElementById('step-en-' + i);
    if (enEl) updateStepMessage(i);
  }
  const tmp = currentWorkflowSteps[idx];
  currentWorkflowSteps[idx] = currentWorkflowSteps[newIdx];
  currentWorkflowSteps[newIdx] = tmp;
  renderSteps();
}

// ─── Nodes Editor (n8n-inspired) ────────────────────────────────────────

export function renderNodes() {
  const container = document.getElementById('wf-nodes-container');
  const countEl = document.getElementById('wf-node-count');
  const startSelect = document.getElementById('wf-start-node');

  countEl.textContent = currentWorkflowNodes.length + ' node' + (currentWorkflowNodes.length !== 1 ? 's' : '');

  // Start node dropdown
  let startOpts = '';
  currentWorkflowNodes.forEach(function(n) {
    startOpts += '<option value="' + esc(n.id) + '"' + (n.id === currentStartNodeId ? ' selected' : '') + '>' + esc(n.label || n.id) + '</option>';
  });
  startSelect.innerHTML = startOpts;

  if (currentWorkflowNodes.length === 0) {
    container.innerHTML = '<p class="text-neutral-400 text-sm text-center py-4">No nodes yet. Click a button below to add your first node.</p>';
    return;
  }

  let html = '';
  currentWorkflowNodes.forEach(function(node, idx) {
    html += renderNodeCard(node, idx);
  });
  container.innerHTML = html;
}

function renderNodeCard(node, idx) {
  var typeInfo = NODE_TYPES[node.type] || { label: node.type, color: 'gray', icon: '?' };
  var color = typeInfo.color;

  // Connection line between cards
  var line = '';
  if (idx > 0) {
    line = '<div class="flex justify-center my-0.5"><div class="w-0.5 h-3 bg-neutral-300"></div></div>';
  }

  var isStart = (node.id === currentStartNodeId);

  // Header row
  var header = '<div class="flex items-center justify-between mb-2">';
  header += '<div class="flex items-center gap-2 flex-wrap">';
  header += '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-' + color + '-100 text-' + color + '-700 uppercase tracking-wide">' + typeInfo.icon + ' ' + esc(typeInfo.label) + '</span>';
  if (isStart) header += '<span class="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-semibold">START</span>';
  header += '<input class="text-sm font-medium border-b border-transparent hover:border-neutral-300 focus:border-primary-500 outline-none px-1 w-28" value="' + esc(node.label || '') + '" onchange="updateNodeField(' + idx + ', \'label\', this.value)" placeholder="Label" />';
  header += '<span class="text-[10px] font-mono text-neutral-400">' + esc(node.id) + '</span>';
  header += '</div>';
  header += '<div class="flex items-center gap-0.5">';
  if (idx > 0) header += '<button onclick="moveNode(' + idx + ', -1)" class="text-xs px-1.5 py-0.5 text-neutral-500 hover:bg-neutral-200 rounded" title="Move up">&#9650;</button>';
  if (idx < currentWorkflowNodes.length - 1) header += '<button onclick="moveNode(' + idx + ', 1)" class="text-xs px-1.5 py-0.5 text-neutral-500 hover:bg-neutral-200 rounded" title="Move down">&#9660;</button>';
  header += '<button onclick="removeNode(' + idx + ')" class="text-xs px-1.5 py-0.5 text-danger-500 hover:bg-danger-50 rounded" title="Delete node">&#10005;</button>';
  header += '</div></div>';

  // Type-specific config
  var config = renderNodeConfig(node, idx);

  // Next pointer(s)
  var nextSection = renderNodeNext(node, idx);

  // Card wrapper
  var card = line;
  card += '<div class="border-2 border-' + color + '-200 rounded-xl p-3 bg-gradient-to-br from-' + color + '-50/40 to-white">';
  card += header;
  card += config;
  card += nextSection;
  card += '</div>';

  return card;
}

function renderNodeConfig(node, idx) {
  var cfg = node.config || {};
  switch (node.type) {
    case 'message': return renderMessageConfig(cfg, idx);
    case 'wait_reply': return renderWaitReplyConfig(cfg, idx);
    case 'whatsapp_send': return renderWhatsAppConfig(cfg, idx);
    case 'pelangi_api': return renderApiConfig(cfg, idx);
    case 'condition': return renderConditionConfig(cfg, idx);
    default: return '<div class="text-xs text-neutral-400">Unknown type: ' + esc(node.type) + '</div>';
  }
}

function renderMessageConfig(cfg, idx) {
  var msg = cfg.message || {};
  var html = '<div class="grid grid-cols-3 gap-2">';
  html += '<div><label class="text-xs text-neutral-500">EN</label>';
  html += '<textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="node-msg-en-' + idx + '" onchange="updateNodeConfig(' + idx + ', \'message.en\', this.value)">' + esc(msg.en || '') + '</textarea></div>';
  html += '<div><label class="text-xs text-neutral-500">MS</label>';
  html += '<textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="node-msg-ms-' + idx + '" onchange="updateNodeConfig(' + idx + ', \'message.ms\', this.value)">' + esc(msg.ms || '') + '</textarea></div>';
  html += '<div><label class="text-xs text-neutral-500">ZH</label>';
  html += '<textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="node-msg-zh-' + idx + '" onchange="updateNodeConfig(' + idx + ', \'message.zh\', this.value)">' + esc(msg.zh || '') + '</textarea></div>';
  html += '</div>';
  return html;
}

function renderWaitReplyConfig(cfg, idx) {
  var varName = cfg.storeAs || cfg.variableName || '';
  var html = '<div class="grid grid-cols-2 gap-2">';
  html += '<div><label class="text-xs text-neutral-500">Store reply as variable</label>';
  html += '<input class="w-full border rounded px-2 py-1 text-xs" value="' + esc(varName) + '" onchange="updateNodeConfig(' + idx + ', \'storeAs\', this.value)" placeholder="e.g. guest_name" /></div>';
  html += '<div><label class="text-xs text-neutral-500">Timeout (ms, optional)</label>';
  html += '<input type="number" class="w-full border rounded px-2 py-1 text-xs" value="' + (cfg.timeout || '') + '" onchange="updateNodeConfig(' + idx + ', \'timeout\', parseInt(this.value) || null)" placeholder="300000" /></div>';
  html += '</div>';
  return html;
}

function renderWhatsAppConfig(cfg, idx) {
  var content = cfg.content || {};
  var html = '<div class="mb-2"><label class="text-xs text-neutral-500">Receiver</label>';
  html += '<input class="w-full border rounded px-2 py-1 text-xs" value="' + esc(cfg.receiver || '') + '" onchange="updateNodeConfig(' + idx + ', \'receiver\', this.value)" placeholder="{{guest.phone}} or +60123456789" /></div>';
  html += '<div class="grid grid-cols-3 gap-2">';
  html += '<div><label class="text-xs text-neutral-500">EN</label>';
  html += '<textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="node-wa-en-' + idx + '" onchange="updateNodeConfig(' + idx + ', \'content.en\', this.value)">' + esc(content.en || '') + '</textarea></div>';
  html += '<div><label class="text-xs text-neutral-500">MS</label>';
  html += '<textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="node-wa-ms-' + idx + '" onchange="updateNodeConfig(' + idx + ', \'content.ms\', this.value)">' + esc(content.ms || '') + '</textarea></div>';
  html += '<div><label class="text-xs text-neutral-500">ZH</label>';
  html += '<textarea rows="2" class="w-full border rounded px-2 py-1 text-xs" id="node-wa-zh-' + idx + '" onchange="updateNodeConfig(' + idx + ', \'content.zh\', this.value)">' + esc(content.zh || '') + '</textarea></div>';
  html += '</div>';
  return html;
}

function renderApiConfig(cfg, idx) {
  var actions = ['check_availability', 'create_checkin_link', 'book_capsule'];
  var html = '<div class="grid grid-cols-2 gap-2">';
  html += '<div><label class="text-xs text-neutral-500">Action</label>';
  html += '<select class="w-full border rounded px-2 py-1 text-xs" onchange="updateNodeConfig(' + idx + ', \'action\', this.value)">';
  actions.forEach(function(a) {
    html += '<option value="' + a + '"' + (cfg.action === a ? ' selected' : '') + '>' + a.replace(/_/g, ' ') + '</option>';
  });
  html += '</select></div>';
  html += '<div><label class="text-xs text-neutral-500">Params (JSON)</label>';
  var paramsStr = cfg.params ? JSON.stringify(cfg.params) : '{}';
  html += '<input class="w-full border rounded px-2 py-1 text-xs font-mono" value=\'' + esc(paramsStr) + '\' onchange="updateNodeConfigJSON(' + idx + ', \'params\', this.value)" placeholder=\'{"key":"value"}\' /></div>';
  html += '</div>';
  return html;
}

function renderConditionConfig(cfg, idx) {
  var ops = ['==', '!=', '>', '<', '>=', '<=', 'gt', 'lt', 'gte', 'lte'];
  var html = '<div class="grid grid-cols-3 gap-2">';
  html += '<div><label class="text-xs text-neutral-500">Field</label>';
  html += '<input class="w-full border rounded px-2 py-1 text-xs" value="' + esc(cfg.field || '') + '" onchange="updateNodeConfig(' + idx + ', \'field\', this.value)" placeholder="e.g. pelangi.count" /></div>';
  html += '<div><label class="text-xs text-neutral-500">Operator</label>';
  html += '<select class="w-full border rounded px-2 py-1 text-xs" onchange="updateNodeConfig(' + idx + ', \'operator\', this.value)">';
  ops.forEach(function(op) {
    html += '<option value="' + esc(op) + '"' + (cfg.operator === op ? ' selected' : '') + '>' + esc(op) + '</option>';
  });
  html += '</select></div>';
  html += '<div><label class="text-xs text-neutral-500">Value</label>';
  html += '<input class="w-full border rounded px-2 py-1 text-xs" value="' + esc(String(cfg.value != null ? cfg.value : '')) + '" onchange="updateNodeConfig(' + idx + ', \'value\', this.value)" placeholder="e.g. 0" /></div>';
  html += '</div>';
  return html;
}

function buildNodeOptions(currentNodeId, selectedId) {
  var opts = '<option value="">(end / none)</option>';
  currentWorkflowNodes.forEach(function(n) {
    if (n.id === currentNodeId) return;
    opts += '<option value="' + esc(n.id) + '"' + (selectedId === n.id ? ' selected' : '') + '>' + esc(n.label || n.id) + '</option>';
  });
  return opts;
}

function renderNodeNext(node, idx) {
  // Condition: outputs { "true": ..., "false": ... } or config.trueNext/falseNext
  if (node.type === 'condition') {
    var outputs = node.outputs || {};
    // Fallback: read from config if outputs are empty
    if (!outputs['true'] && node.config && node.config.trueNext) outputs['true'] = node.config.trueNext;
    if (!outputs['false'] && node.config && node.config.falseNext) outputs['false'] = node.config.falseNext;
    var html = '<div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-200">';
    html += '<div><label class="text-xs text-green-600 font-medium">\u2714 Then &rarr;</label>';
    html += '<select class="w-full border rounded px-2 py-1 text-xs" onchange="updateNodeOutput(' + idx + ', \'true\', this.value)">';
    html += buildNodeOptions(node.id, outputs['true'] || '');
    html += '</select></div>';
    html += '<div><label class="text-xs text-red-600 font-medium">\u2716 Else &rarr;</label>';
    html += '<select class="w-full border rounded px-2 py-1 text-xs" onchange="updateNodeOutput(' + idx + ', \'false\', this.value)">';
    html += buildNodeOptions(node.id, outputs['false'] || '');
    html += '</select></div>';
    html += '</div>';
    return html;
  }

  // API node: next { success, error }
  if (node.type === 'pelangi_api') {
    var next = node.next || {};
    var isObj = typeof next === 'object' && next !== null && !Array.isArray(next);
    var successId = isObj ? (next.success || '') : (typeof next === 'string' ? next : '');
    var errorId = isObj ? (next.error || '') : '';
    var html = '<div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-200">';
    html += '<div><label class="text-xs text-green-600 font-medium">\u2714 Success &rarr;</label>';
    html += '<select class="w-full border rounded px-2 py-1 text-xs" onchange="updateNodeNext(' + idx + ', \'success\', this.value)">';
    html += buildNodeOptions(node.id, successId);
    html += '</select></div>';
    html += '<div><label class="text-xs text-red-600 font-medium">\u2716 Error &rarr;</label>';
    html += '<select class="w-full border rounded px-2 py-1 text-xs" onchange="updateNodeNext(' + idx + ', \'error\', this.value)">';
    html += buildNodeOptions(node.id, errorId);
    html += '</select></div>';
    html += '</div>';
    return html;
  }

  // Simple next (message, wait_reply, whatsapp_send)
  var nextId = typeof node.next === 'string' ? node.next : '';
  var html = '<div class="mt-2 pt-2 border-t border-neutral-200">';
  html += '<label class="text-xs text-neutral-500 font-medium">Next &rarr;</label>';
  html += '<select class="w-full border rounded px-2 py-1 text-xs" onchange="updateNodeNext(' + idx + ', null, this.value)">';
  html += buildNodeOptions(node.id, nextId);
  html += '</select></div>';
  return html;
}

// ─── Node CRUD ──────────────────────────────────────────────────────────

export function addNode(type) {
  // Generate unique ID
  var count = currentWorkflowNodes.filter(function(n) { return n.type === type; }).length + 1;
  var id = type + '_' + count;
  // Ensure uniqueness
  while (currentWorkflowNodes.some(function(n) { return n.id === id; })) {
    count++;
    id = type + '_' + count;
  }
  var label = (NODE_TYPES[type] ? NODE_TYPES[type].label : type) + ' ' + count;

  var node = { id: id, type: type, label: label, config: {}, next: '' };

  if (type === 'message') {
    node.config = { message: { en: '', ms: '', zh: '' } };
  } else if (type === 'wait_reply') {
    node.config = { storeAs: '' };
  } else if (type === 'whatsapp_send') {
    node.config = { receiver: '', content: { en: '', ms: '', zh: '' } };
  } else if (type === 'pelangi_api') {
    node.config = { action: 'check_availability', params: {} };
    node.next = { success: '', error: '' };
  } else if (type === 'condition') {
    node.config = { field: '', operator: '==', value: '' };
    node.outputs = { 'true': '', 'false': '' };
    delete node.next;
  }

  currentWorkflowNodes.push(node);
  if (!currentStartNodeId || currentWorkflowNodes.length === 1) {
    currentStartNodeId = id;
  }
  renderNodes();
}

export function removeNode(idx) {
  var removedId = currentWorkflowNodes[idx].id;
  currentWorkflowNodes.splice(idx, 1);

  // Clean up references
  currentWorkflowNodes.forEach(function(n) {
    if (typeof n.next === 'string' && n.next === removedId) n.next = '';
    if (typeof n.next === 'object' && n.next) {
      if (n.next.success === removedId) n.next.success = '';
      if (n.next.error === removedId) n.next.error = '';
    }
    if (n.outputs) {
      Object.keys(n.outputs).forEach(function(k) {
        if (n.outputs[k] === removedId) n.outputs[k] = '';
      });
    }
  });

  if (currentStartNodeId === removedId) {
    currentStartNodeId = currentWorkflowNodes.length > 0 ? currentWorkflowNodes[0].id : '';
  }
  renderNodes();
}

export function moveNode(idx, direction) {
  var newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= currentWorkflowNodes.length) return;
  collectNodeValues();
  var tmp = currentWorkflowNodes[idx];
  currentWorkflowNodes[idx] = currentWorkflowNodes[newIdx];
  currentWorkflowNodes[newIdx] = tmp;
  renderNodes();
}

export function updateNodeField(idx, field, value) {
  currentWorkflowNodes[idx][field] = value;
}

export function updateNodeConfig(idx, path, value) {
  var node = currentWorkflowNodes[idx];
  if (!node.config) node.config = {};
  var parts = path.split('.');
  var target = node.config;
  for (var i = 0; i < parts.length - 1; i++) {
    if (!target[parts[i]]) target[parts[i]] = {};
    target = target[parts[i]];
  }
  target[parts[parts.length - 1]] = value;
}

export function updateNodeConfigJSON(idx, field, value) {
  var node = currentWorkflowNodes[idx];
  if (!node.config) node.config = {};
  try { node.config[field] = JSON.parse(value); }
  catch (e) { /* keep old value */ }
}

export function updateNodeNext(idx, branch, value) {
  var node = currentWorkflowNodes[idx];
  if (branch === null) {
    node.next = value;
  } else {
    if (typeof node.next !== 'object' || node.next === null) {
      node.next = { success: '', error: '' };
    }
    node.next[branch] = value;
  }
}

export function updateNodeOutput(idx, key, value) {
  var node = currentWorkflowNodes[idx];
  if (!node.outputs) node.outputs = {};
  node.outputs[key] = value;
  // Sync to config.trueNext/falseNext for backward compat
  if (node.config) {
    if (key === 'true') node.config.trueNext = value;
    if (key === 'false') node.config.falseNext = value;
  }
}

export function updateStartNodeId() {
  currentStartNodeId = document.getElementById('wf-start-node').value;
}

function collectNodeValues() {
  currentWorkflowNodes.forEach(function(node, idx) {
    // Collect message textareas
    var msgEn = document.getElementById('node-msg-en-' + idx);
    if (msgEn) {
      if (!node.config) node.config = {};
      if (!node.config.message) node.config.message = {};
      node.config.message.en = msgEn.value;
      var msgMs = document.getElementById('node-msg-ms-' + idx);
      var msgZh = document.getElementById('node-msg-zh-' + idx);
      node.config.message.ms = msgMs ? msgMs.value : '';
      node.config.message.zh = msgZh ? msgZh.value : '';
    }
    // Collect WhatsApp content textareas
    var waEn = document.getElementById('node-wa-en-' + idx);
    if (waEn) {
      if (!node.config) node.config = {};
      if (!node.config.content) node.config.content = {};
      node.config.content.en = waEn.value;
      var waMs = document.getElementById('node-wa-ms-' + idx);
      var waZh = document.getElementById('node-wa-zh-' + idx);
      node.config.content.ms = waMs ? waMs.value : '';
      node.config.content.zh = waZh ? waZh.value : '';
    }
  });
}

// ─── Save (handles both formats) ──────────────────────────────────────

export async function saveCurrentWorkflow() {
  if (!currentWorkflowId) return;

  if (currentWorkflowFormat === 'nodes') {
    collectNodeValues();
  } else {
    for (var i = 0; i < currentWorkflowSteps.length; i++) {
      var enEl = document.getElementById('step-en-' + i);
      if (enEl) updateStepMessage(i);
    }
  }

  try {
    var name = document.getElementById('wf-edit-name').value.trim();
    var body = { name: name, steps: currentWorkflowSteps };

    if (currentWorkflowFormat === 'nodes') {
      body.format = 'nodes';
      body.nodes = currentWorkflowNodes;
      body.startNodeId = currentStartNodeId;
    }

    await api('/workflows/' + encodeURIComponent(currentWorkflowId), {
      method: 'PUT',
      body: body
    });
    toast('Workflow saved: ' + name);
    var wfData = await api('/workflows');
    window.cacheManager.set(WF_CACHE_KEY, wfData);
    renderWorkflowList();
  } catch (e) { toast(e.message, 'error'); }
}

export async function createWorkflow() {
  var name = prompt('Workflow name:');
  if (!name) return;
  var id = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (!id) { toast('Invalid name', 'error'); return; }
  try {
    await api('/workflows', { method: 'POST', body: { id: id, name: name.trim(), steps: [] } });
    toast('Created: ' + name);
    var wfData = await api('/workflows');
    window.cacheManager.set(WF_CACHE_KEY, wfData);
    renderWorkflowList();
    selectWorkflow(id);
  } catch (e) { toast(e.message, 'error'); }
}

export async function deleteCurrentWorkflow() {
  if (!currentWorkflowId) return;
  if (!confirm('Delete workflow "' + currentWorkflowId + '"?')) return;
  try {
    await api('/workflows/' + encodeURIComponent(currentWorkflowId), { method: 'DELETE' });
    toast('Deleted: ' + currentWorkflowId);
    currentWorkflowId = null;
    hideWorkflowEditor();
    var wfData = await api('/workflows');
    window.cacheManager.set(WF_CACHE_KEY, wfData);
    renderWorkflowList();
  } catch (e) { toast(e.message, 'error'); }
}

// ─── Advanced Workflow Settings (workflow.json) ────────────────────────
export function renderAdvancedSettings(d) {
  var el = document.getElementById('workflow-advanced-content');
  var html = '<div class="bg-neutral-50 border rounded-xl p-4 mt-2">';
  html += '<h4 class="font-medium text-neutral-700 text-sm mb-2">Escalation</h4>';
  html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
  html += '<div><label class="text-xs text-neutral-500 block mb-1">Timeout (ms)</label>';
  html += '<input type="number" class="w-full border rounded px-2 py-1.5 text-sm" id="w-esc-timeout" value="' + (d.escalation?.timeout_ms || 0) + '" /></div>';
  html += '<div><label class="text-xs text-neutral-500 block mb-1">Unknown Threshold</label>';
  html += '<input type="number" class="w-full border rounded px-2 py-1.5 text-sm" id="w-esc-threshold" value="' + (d.escalation?.unknown_threshold || 0) + '" /></div>';
  html += '<div><label class="text-xs text-neutral-500 block mb-1">Primary Phone</label>';
  html += '<input class="w-full border rounded px-2 py-1.5 text-sm" id="w-esc-primary" value="' + esc(d.escalation?.primary_phone || '') + '" /></div>';
  html += '<div><label class="text-xs text-neutral-500 block mb-1">Secondary Phone</label>';
  html += '<input class="w-full border rounded px-2 py-1.5 text-sm" id="w-esc-secondary" value="' + esc(d.escalation?.secondary_phone || '') + '" /></div>';
  html += '</div></div>';

  html += '<div class="bg-neutral-50 border rounded-xl p-4">';
  html += '<h4 class="font-medium text-neutral-700 text-sm mb-2">Payment</h4>';
  html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
  html += '<div><label class="text-xs text-neutral-500 block mb-1">Forward To</label>';
  html += '<input class="w-full border rounded px-2 py-1.5 text-sm" id="w-pay-forward" value="' + esc(d.payment?.forward_to || '') + '" /></div>';
  html += '<div><label class="text-xs text-neutral-500 block mb-1">Receipt Patterns (comma-separated)</label>';
  html += '<input class="w-full border rounded px-2 py-1.5 text-sm" id="w-pay-patterns" value="' + esc((d.payment?.receipt_patterns || []).join(', ')) + '" /></div>';
  html += '</div></div>';

  html += '<div class="bg-neutral-50 border rounded-xl p-4">';
  html += '<h4 class="font-medium text-neutral-700 text-sm mb-2">Booking</h4>';
  html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
  html += '<div class="flex items-center gap-2"><input type="checkbox" id="w-book-enabled" ' + (d.booking?.enabled ? 'checked' : '') + ' />';
  html += '<label for="w-book-enabled" class="text-sm text-neutral-700">Enabled</label></div>';
  html += '<div><label class="text-xs text-neutral-500 block mb-1">Max Guests (Auto)</label>';
  html += '<input type="number" class="w-full border rounded px-2 py-1.5 text-sm" id="w-book-max" value="' + (d.booking?.max_guests_auto || 0) + '" /></div>';
  html += '</div></div>';

  html += '<div class="bg-neutral-50 border rounded-xl p-4">';
  html += '<h4 class="font-medium text-neutral-700 text-sm mb-2">Non-Text Handling</h4>';
  html += '<div class="flex items-center gap-2"><input type="checkbox" id="w-nontext-enabled" ' + (d.non_text_handling?.enabled ? 'checked' : '') + ' />';
  html += '<label for="w-nontext-enabled" class="text-sm text-neutral-700">Enabled</label></div>';
  html += '</div>';

  html += '<button onclick="saveAdvancedWorkflow()" class="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-2xl text-sm transition">Save Advanced Settings</button>';
  el.innerHTML = html;
}

export async function saveAdvancedWorkflow() {
  try {
    await api('/workflow', {
      method: 'PATCH',
      body: {
        escalation: {
          timeout_ms: parseInt(document.getElementById('w-esc-timeout').value) || 0,
          unknown_threshold: parseInt(document.getElementById('w-esc-threshold').value) || 0,
          primary_phone: document.getElementById('w-esc-primary').value,
          secondary_phone: document.getElementById('w-esc-secondary').value
        },
        payment: {
          forward_to: document.getElementById('w-pay-forward').value,
          receipt_patterns: document.getElementById('w-pay-patterns').value.split(',').map(function(s) { return s.trim(); }).filter(Boolean)
        },
        booking: {
          enabled: document.getElementById('w-book-enabled').checked,
          max_guests_auto: parseInt(document.getElementById('w-book-max').value) || 0
        },
        non_text_handling: {
          enabled: document.getElementById('w-nontext-enabled').checked
        }
      }
    });
    toast('Advanced settings saved');
  } catch (e) { toast(e.message, 'error'); }
}

// ─── Export / Import Workflows as JSON ──────────────────────────────────

/**
 * Export the currently selected workflow as a downloadable JSON file
 */
export function exportWorkflowJSON() {
  if (!currentWorkflowId) {
    toast('Select a workflow first', 'error');
    return;
  }
  const wf = window.cacheManager.get(WF_CACHE_KEY).workflows.find(function(w) { return w.id === currentWorkflowId; });
  if (!wf) {
    toast('Workflow not found', 'error');
    return;
  }
  var exportData = {
    id: wf.id,
    name: wf.name,
    format: wf.format || 'steps',
    steps: wf.steps || [],
    nodes: wf.nodes || [],
    startNodeId: wf.startNodeId || '',
    exportedAt: new Date().toISOString(),
    source: 'Rainbow AI'
  };
  var json = JSON.stringify(exportData, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = wf.id + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported: ' + wf.name);
}

/**
 * Import a workflow from a JSON file
 */
export function importWorkflowJSON() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    try {
      var text = await file.text();
      var data = JSON.parse(text);
      if (!data.id || !data.name) {
        toast('Invalid workflow JSON: missing id or name', 'error');
        return;
      }
      // Check for duplicate ID
      var existing = window.cacheManager.get(WF_CACHE_KEY).workflows.find(function(w) { return w.id === data.id; });
      if (existing) {
        if (!confirm('Workflow "' + data.id + '" already exists. Overwrite it?')) return;
      }
      var body = {
        id: data.id,
        name: data.name,
        steps: data.steps || [],
        format: data.format || 'steps',
        nodes: data.nodes || [],
        startNodeId: data.startNodeId || ''
      };
      await api('/workflows/' + encodeURIComponent(data.id), { method: 'PUT', body: body });
      toast('Imported: ' + data.name);
      await loadWorkflow();
      selectWorkflow(data.id);
    } catch (err) {
      toast('Import failed: ' + err.message, 'error');
    }
  };
  input.click();
}
