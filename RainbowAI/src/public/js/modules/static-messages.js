/**
 * Static Messages Tab Module
 * Loads intent replies and system messages with phase grouping
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

/**
 * CSS-safe identifier (replaces non-alphanumeric with underscore)
 */
function css(str) {
  return String(str || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Truncate string to max length
 */
function truncate(str, len) {
  if (!str || str.length <= len) return str;
  return str.substring(0, len) + '...';
}

// ── US-004: Dismissable banners ──────────────────────────────────
const DISMISSED_KEY = 'rainbow-dismissed-banners';

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); }
  catch { return []; }
}

function saveDismissed(arr) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr));
}

export function dismissBanner(id) {
  const list = getDismissed();
  if (!list.includes(id)) list.push(id);
  saveDismissed(list);
  // Re-render warnings section from cached data
  renderWarnings();
}

export function restoreBanner(id) {
  saveDismissed(getDismissed().filter(function(x) { return x !== id; }));
  renderWarnings();
}

export function restoreAllBanners() {
  saveDismissed([]);
  renderWarnings();
}

export function toggleDismissedPanel() {
  var panel = document.getElementById('dismissed-banners-panel');
  if (panel) panel.classList.toggle('hidden');
}

// Cached warning data for re-rendering without refetching
var _cachedWarnings = [];

function renderWarnings() {
  var el = document.getElementById('static-warnings');
  if (!el) return;
  var dismissed = getDismissed();
  var visible = [];
  var dismissedItems = [];

  for (var i = 0; i < _cachedWarnings.length; i++) {
    var w = _cachedWarnings[i];
    if (dismissed.indexOf(w.id) >= 0) {
      dismissedItems.push(w);
    } else {
      visible.push(w);
    }
  }

  var html = '';

  // Visible banners with dismiss button
  for (var j = 0; j < visible.length; j++) {
    var v = visible[j];
    html += '<div class="' + v.cls + ' flex items-center justify-between gap-3 flex-wrap" data-banner-id="' + esc(v.id) + '">'
      + '<span>' + v.content + '</span>'
      + '<div class="flex items-center gap-2 shrink-0">'
      + v.actionBtn
      + '<button onclick="dismissBanner(\'' + esc(v.id) + '\')" class="text-xs px-2 py-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded transition" title="Dismiss this notification">&times;</button>'
      + '</div></div>';
  }

  // Dismissed counter + panel
  if (dismissedItems.length > 0) {
    html += '<div class="flex items-center gap-2 mt-1">'
      + '<button onclick="toggleDismissedPanel()" class="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition">'
      + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18"/></svg>'
      + dismissedItems.length + ' dismissed'
      + '</button>'
      + '<button onclick="restoreAllBanners()" class="text-xs text-primary-500 hover:text-primary-700 transition">Restore all</button>'
      + '</div>';
    html += '<div id="dismissed-banners-panel" class="hidden mt-2 space-y-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">';
    for (var k = 0; k < dismissedItems.length; k++) {
      var d = dismissedItems[k];
      html += '<div class="flex items-center justify-between gap-2 text-xs text-neutral-600">'
        + '<span class="truncate">' + d.summary + '</span>'
        + '<button onclick="restoreBanner(\'' + esc(d.id) + '\')" class="shrink-0 text-primary-500 hover:text-primary-700 transition">Restore</button>'
        + '</div>';
    }
    html += '</div>';
  }

  el.innerHTML = html;
}

/**
 * Load Static Messages tab
 * Shows intent replies grouped by guest journey phase + system message templates
 */
export async function loadStaticReplies() {
  try {
    const configs = await window.apiHelpers.loadMultipleConfigs(
      { knowledgeData: '/knowledge', templatesData: '/templates', routingData: '/routing', intentsData: '/intents' }
    );
    const { knowledgeData, templatesData, routingData, intentsData } = configs;

    window.cachedRouting = routingData;
    window.cachedKnowledge = knowledgeData;

    // Build intent → phase mapping from intents.json
    const intentPhaseMap = {};
    const phases = intentsData.categories || [];
    for (const phaseData of phases) {
      for (const intent of (phaseData.intents || [])) {
        intentPhaseMap[intent.category] = phaseData.phase;
      }
    }

    // Phase display config
    const PHASE_CONFIG = {
      'GENERAL_SUPPORT': { label: 'General Support', icon: '👋', desc: 'Greetings & general inquiries' },
      'PRE_ARRIVAL': { label: 'Pre-Arrival', icon: '🔍', desc: 'Enquiry & booking phase' },
      'ARRIVAL_CHECKIN': { label: 'Arrival & Check-in', icon: '🏨', desc: 'Guest has arrived' },
      'DURING_STAY': { label: 'During Stay', icon: '🛏️', desc: 'Currently staying' },
      'CHECKOUT_DEPARTURE': { label: 'Checkout & Departure', icon: '🚪', desc: 'Checking out' },
      'POST_CHECKOUT': { label: 'Post-Checkout', icon: '📬', desc: 'After departure' },
      'UNCATEGORIZED': { label: 'Uncategorized', icon: '📋', desc: 'Not mapped to a phase' }
    };

    // Validation warnings — build structured data, then render via renderWarnings()
    _cachedWarnings = [];
    const staticIntents = new Set((knowledgeData.static || []).map(e => e.intent));
    for (const [intent, cfg] of Object.entries(routingData)) {
      if (cfg.action === 'static_reply' && !staticIntents.has(intent)) {
        _cachedWarnings.push({
          id: 'warn-no-reply-' + intent,
          cls: 'bg-warning-50 border border-yellow-200 rounded-2xl px-4 py-3 text-sm text-warning-800',
          content: '\u26A0\uFE0F Intent <b>"' + esc(intent) + '"</b> is routed to Static Reply but has no reply configured. <button onclick="switchTab(\'intents\')" class="text-primary-600 underline">Change routing</button> or add a reply below.',
          actionBtn: '<button onclick="generateAIReply(\'' + esc(intent) + '\')" id="gen-btn-' + css(intent) + '" class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors shadow-sm">\u2728 Generate by AI</button>',
          summary: '\u26A0\uFE0F "' + esc(intent) + '" — no reply configured'
        });
      }
    }
    for (const entry of (knowledgeData.static || [])) {
      if (routingData[entry.intent] && routingData[entry.intent].action !== 'static_reply') {
        var action = routingData[entry.intent].action;
        _cachedWarnings.push({
          id: 'info-unused-reply-' + entry.intent,
          cls: 'bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-800',
          content: '\u2139\uFE0F Reply for <b>"' + esc(entry.intent) + '"</b> exists but intent is routed to <b>' + esc(action) + '</b>, not static_reply. This reply won\'t be used.',
          actionBtn: '<button onclick="showGenerateByLLMModalWithIntent(\'' + esc(entry.intent) + '\')" class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors shadow-sm">\u2728 Generate by LLM</button>',
          summary: '\u2139\uFE0F "' + esc(entry.intent) + '" — routed to ' + esc(action)
        });
      }
    }
    renderWarnings();

    // Intent Replies — grouped by phase
    const repliesEl = document.getElementById('static-intent-replies');
    if (!knowledgeData.static || knowledgeData.static.length === 0) {
      repliesEl.innerHTML = '<p class="text-neutral-400 text-sm">No intent replies configured</p>';
    } else {
      // Group replies by phase
      const grouped = {};
      const phaseOrder = ['GENERAL_SUPPORT', 'PRE_ARRIVAL', 'ARRIVAL_CHECKIN', 'DURING_STAY', 'CHECKOUT_DEPARTURE', 'POST_CHECKOUT', 'UNCATEGORIZED'];

      for (const e of knowledgeData.static) {
        const phase = intentPhaseMap[e.intent] || 'UNCATEGORIZED';
        if (!grouped[phase]) grouped[phase] = [];
        grouped[phase].push(e);
      }

      let html = '';
      for (const phase of phaseOrder) {
        const entries = grouped[phase];
        if (!entries || entries.length === 0) continue;

        const cfg = PHASE_CONFIG[phase] || PHASE_CONFIG['UNCATEGORIZED'];

        // Phase section header
        html += `<div class="reply-phase-group" data-phase="${phase}">`;
        html += `<div class="bg-gradient-to-r from-primary-50 to-transparent border border-primary-100 rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">${cfg.icon}</span>
            <span class="font-semibold text-primary-700 text-sm uppercase tracking-wide">${esc(cfg.label)}</span>
            <span class="text-xs text-neutral-500">— ${esc(cfg.desc)}</span>
          </div>
          <span class="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">${entries.length}</span>
        </div>`;

        // Render replies in this phase
        html += `<div class="space-y-3 mb-6 pl-2">`;
        for (const e of entries) {
          const route = routingData[e.intent]?.action;
          const isActive = route === 'static_reply';
          html += `
          <div class="bg-white border rounded-2xl p-4 reply-item" id="k-static-${css(e.intent)}" data-phase="${phase}">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm text-primary-700">${esc(e.intent)}</span>
                ${isActive ? '<span class="badge-info">Active</span>' : `<span class="badge-warn">Not routed (${route || 'none'})</span>`}
              </div>
              <div class="flex gap-1">
                <button onclick="editKnowledgeStatic('${esc(e.intent)}')" class="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                <button onclick="deleteKnowledge('${esc(e.intent)}')" class="text-xs px-2 py-1 text-danger-500 hover:bg-danger-50 rounded">Delete</button>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm" id="k-static-view-${css(e.intent)}">
              <div><span class="text-neutral-400">EN:</span> ${esc(truncate(e.response?.en || '', 120))}</div>
              <div><span class="text-neutral-400">MS:</span> ${esc(truncate(e.response?.ms || '', 120))}</div>
              <div><span class="text-neutral-400">ZH:</span> ${esc(truncate(e.response?.zh || '', 120))}</div>
            </div>
            <div class="hidden mt-2" id="k-static-edit-${css(e.intent)}">
              <div class="grid grid-cols-1 gap-2 mb-2">
                <div><label class="text-xs text-neutral-500">EN</label><textarea class="w-full border rounded px-2 py-1 text-sm" id="k-ed-en-${css(e.intent)}" rows="3">${esc(e.response?.en || '')}</textarea></div>
                <div><label class="text-xs text-neutral-500">MS</label><textarea class="w-full border rounded px-2 py-1 text-sm" id="k-ed-ms-${css(e.intent)}" rows="3">${esc(e.response?.ms || '')}</textarea></div>
                <div><label class="text-xs text-neutral-500">ZH</label><textarea class="w-full border rounded px-2 py-1 text-sm" id="k-ed-zh-${css(e.intent)}" rows="3">${esc(e.response?.zh || '')}</textarea></div>
              </div>
              <div class="flex gap-2 flex-wrap">
                <button type="button" onclick="translateQuickReplyFields('k-ed-en-${css(e.intent)}','k-ed-ms-${css(e.intent)}','k-ed-zh-${css(e.intent)}')" class="text-xs px-3 py-1 bg-success-500 text-white rounded hover:bg-success-600" title="Fill missing languages using the same AI as LLM reply">Translate</button>
                <button onclick="saveKnowledgeStatic('${esc(e.intent)}')" class="text-xs px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600">Save</button>
                <button onclick="cancelEditKnowledge('${css(e.intent)}')" class="text-xs px-3 py-1 border rounded hover:bg-neutral-50">Cancel</button>
              </div>
            </div>
          </div>`;
        }
        html += `</div></div>`;
      }

      repliesEl.innerHTML = html;
    }

    // System Messages
    const tplEl = document.getElementById('static-templates');
    const tplKeys = Object.keys(templatesData);
    if (tplKeys.length === 0) {
      tplEl.innerHTML = '<p class="text-neutral-400 text-sm">No system messages</p>';
    } else {
      tplEl.innerHTML = tplKeys.map(k => `
        <div class="bg-white border rounded-2xl p-4" data-category="system">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium text-sm font-mono text-purple-700">${esc(k)}</span>
            <div class="flex gap-1">
              <button onclick="editTemplate('${esc(k)}')" class="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Edit</button>
              <button onclick="deleteTemplate('${esc(k)}')" class="text-xs px-2 py-1 text-danger-500 hover:bg-danger-50 rounded">Delete</button>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm" id="tpl-view-${css(k)}">
            <div><span class="text-neutral-400">EN:</span> <span class="whitespace-pre-wrap">${esc(truncate(templatesData[k].en, 120))}</span></div>
            <div><span class="text-neutral-400">MS:</span> <span class="whitespace-pre-wrap">${esc(truncate(templatesData[k].ms, 120))}</span></div>
            <div><span class="text-neutral-400">ZH:</span> <span class="whitespace-pre-wrap">${esc(truncate(templatesData[k].zh, 120))}</span></div>
          </div>
          <div class="hidden mt-2" id="tpl-edit-${css(k)}">
            <div class="grid grid-cols-1 gap-2 mb-2">
              <div><label class="text-xs text-neutral-500">EN</label><textarea class="w-full border rounded px-2 py-1 text-sm" id="tpl-ed-en-${css(k)}" rows="3">${esc(templatesData[k].en)}</textarea></div>
              <div><label class="text-xs text-neutral-500">MS</label><textarea class="w-full border rounded px-2 py-1 text-sm" id="tpl-ed-ms-${css(k)}" rows="3">${esc(templatesData[k].ms)}</textarea></div>
              <div><label class="text-xs text-neutral-500">ZH</label><textarea class="w-full border rounded px-2 py-1 text-sm" id="tpl-ed-zh-${css(k)}" rows="3">${esc(templatesData[k].zh)}</textarea></div>
            </div>
            <div class="flex gap-2">
              <button onclick="saveTemplate('${esc(k)}')" class="text-xs px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600">Save</button>
              <button onclick="cancelEditTemplate('${css(k)}')" class="text-xs px-3 py-1 border rounded hover:bg-neutral-50">Cancel</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (e) { toast(window.apiHelpers.formatApiError(e), 'error'); }
}
