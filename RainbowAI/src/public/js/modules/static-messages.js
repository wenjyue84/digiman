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

    // Validation warnings
    const warnings = [];
    const staticIntents = new Set((knowledgeData.static || []).map(e => e.intent));
    for (const [intent, cfg] of Object.entries(routingData)) {
      if (cfg.action === 'static_reply' && !staticIntents.has(intent)) {
        warnings.push(`<div class="bg-warning-50 border border-yellow-200 rounded-2xl px-4 py-3 text-sm text-warning-800 flex items-center justify-between gap-3 flex-wrap">
          <span>⚠️ Intent <b>"${esc(intent)}"</b> is routed to Static Reply but has no reply configured. <button onclick="switchTab('intents')" class="text-primary-600 underline">Change routing</button> or add a reply below.</span>
          <button onclick="generateAIReply('${esc(intent)}')" id="gen-btn-${css(intent)}" class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors shadow-sm">✨ Generate by AI</button>
        </div>`);
      }
    }
    for (const entry of (knowledgeData.static || [])) {
      if (routingData[entry.intent] && routingData[entry.intent].action !== 'static_reply') {
        warnings.push(`<div class="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-800 flex items-center justify-between gap-3 flex-wrap">
          <span>ℹ️ Reply for <b>"${esc(entry.intent)}"</b> exists but intent is routed to <b>${routingData[entry.intent].action}</b>, not static_reply. This reply won't be used.</span>
          <button onclick="showGenerateByLLMModalWithIntent('${esc(entry.intent)}')" class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors shadow-sm">✨ Generate by LLM</button>
        </div>`);
      }
    }
    document.getElementById('static-warnings').innerHTML = warnings.join('');

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
