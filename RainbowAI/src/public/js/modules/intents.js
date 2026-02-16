/**
 * Intents & Routing Tab Module
 * Manages intent configuration and routing rules
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

// Use global css() function from legacy-functions.js
const css = window.css || ((s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_'));

// Cache keys (centralized via cacheManager)
const CACHE_KEYS = {
  routing:     'intents.routing',
  knowledge:   'intents.knowledge',
  workflows:   'intents.workflows',
  settings:    'intents.settings',
  intentNames: 'intents.intentNames',
};

/**
 * Load and render the Intents & Routing tab
 * Fetches intents, routing, knowledge, workflows, and settings data
 * Renders a table grouped by guest journey phases
 */
export async function loadIntents() {
  try {
    const configs = await window.apiHelpers.loadMultipleConfigs(
      { intentsData: '/intents', routingData: '/routing', knowledgeData: '/knowledge', workflowsData: '/workflows', settingsData: '/settings' },
      { cacheKeys: { routingData: CACHE_KEYS.routing, knowledgeData: CACHE_KEYS.knowledge, workflowsData: CACHE_KEYS.workflows, settingsData: CACHE_KEYS.settings } }
    );
    const { intentsData, routingData, knowledgeData, workflowsData, settingsData } = configs;

    const el = document.getElementById('intents-table-body');
    const phases = intentsData.categories || [];
    // Build canonical intent list from intents.json (source of truth)
    const intentNames = phases.flatMap(p => (p.intents || []).map(i => i.category));
    if (!intentNames.includes('unknown')) intentNames.push('unknown');
    window.cacheManager.set(CACHE_KEYS.intentNames, intentNames);
    const staticIntentNames = new Set(knowledgeData.static.map(e => e.intent));
    const wfList = workflowsData.workflows || [];

    const ACTIONS = ['static_reply', 'llm_reply', 'workflow'];
    const ACTION_LABELS = { static_reply: 'Static Reply', llm_reply: 'LLM Reply', workflow: 'Workflow' };

    const rows = [];

    // Render intents grouped by phase
    for (let i = 0; i < phases.length; i++) {
      const phaseData = phases[i];
      const phaseName = phaseData.phase || 'Uncategorized';
      const phaseDesc = phaseData.description || '';
      const phaseIntents = phaseData.intents || [];

      // Add phase header
      rows.push('<tr class="bg-gradient-to-r from-primary-50 to-transparent border-b-2 border-primary-200">');
      rows.push('  <td colspan="7" class="py-3 px-3">');
      rows.push('    <div class="flex items-center gap-2">');
      rows.push('      <span class="font-semibold text-primary-700 text-sm uppercase tracking-wide">' + esc(phaseName) + '</span>');
      rows.push('      <span class="text-xs text-neutral-500">— ' + esc(phaseDesc) + '</span>');
      rows.push('    </div>');
      rows.push('  </td>');
      rows.push('</tr>');

      // Render intents in this phase
      for (let j = 0; j < phaseIntents.length; j++) {
        const intentData = phaseIntents[j];
        const intent = intentData.category;
        const professionalTerm = intentData.professional_term || intent;
        const route = routingData[intent]?.action || 'llm_reply';
        const wfId = routingData[intent]?.workflow_id || '';
        const enabled = intentData.enabled !== undefined ? intentData.enabled : true;
        const timeSensitive = intentData.time_sensitive === true;
        const hasStatic = staticIntentNames.has(intent);
        const needsStatic = route === 'static_reply';
        const isUnknown = intent === 'unknown';

        let warning = '';
        if (needsStatic && !hasStatic) warning = '<span class="badge-warn">No static reply!</span>';
        if (!needsStatic && hasStatic) warning = '<span class="badge-warn">Unused reply</span>';

        const wfOptions = wfList.map(w =>
          `<option value="${esc(w.id)}" ${wfId === w.id ? 'selected' : ''}>${esc(w.name)}</option>`
        ).join('');

        if (isUnknown) {
          rows.push(`
          <tr class="border-b bg-neutral-50/50 hover:bg-amber-50 cursor-pointer" id="intent-row-${css(intent)}" onclick="editUnknownSettings()">
            <td class="py-2.5 pr-3 font-mono text-sm">
              <span class="relative group">
                ${esc(intent)}
                <span class="inline-block ml-1 text-neutral-400 text-xs align-top">⚙️</span>
                <span class="pointer-events-none absolute left-0 bottom-full mb-2 w-64 px-3 py-2 text-xs text-white bg-neutral-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  Click to edit unknown-intent fallback settings: rephrase count, fallback messages, and operator escalation.
                </span>
              </span>
            </td>
            <td class="py-2.5 pr-3">
              <span class="text-xs px-2 py-0.5 rounded-full bg-success-100 text-success-700 opacity-60">Always On</span>
            </td>
            <td class="py-2.5 pr-3">
              <span class="text-xs border rounded px-2 py-1 bg-neutral-100 text-neutral-500 inline-block">LLM Reply</span>
            </td>
            <td class="py-2.5 pr-3 text-xs"><span class="text-neutral-400">0.50</span></td>
            <td class="py-2.5 pr-3 text-xs"><span class="text-neutral-400">—</span></td>
            <td class="py-2.5 pr-3 text-xs"><span class="text-neutral-400">—</span></td>
            <td class="py-2.5">
              <span class="text-xs px-2 py-1 text-amber-600 hover:text-amber-700">Settings ⚙️</span>
            </td>
          </tr>
        `);
        } else {
          const actionOptions = ACTIONS.map(a => '<option value="' + a + '" ' + (route === a ? 'selected' : '') + '>' + ACTION_LABELS[a] + '</option>').join('');
          const wfOptions = wfList.map(w => '<option value="' + esc(w.id) + '" ' + (wfId === w.id ? 'selected' : '') + '>' + esc(w.name) + '</option>').join('');
          const minConf = intentData.min_confidence !== undefined ? intentData.min_confidence : 0.75;
          const confColor = minConf <= 0.60 ? 'text-danger-500' : minConf <= 0.70 ? 'text-amber-600' : 'text-neutral-700';

          rows.push('<tr class="border-b hover:bg-neutral-50" id="intent-row-' + css(intent) + '">');
          rows.push('  <td class="py-2.5 pr-3 pl-6">');
          rows.push('    <div class="flex flex-col">');
          rows.push('      <span class="font-mono text-sm">' + esc(intent) + '</span>');
          rows.push('      <span class="text-xs text-neutral-500 mt-0.5">' + esc(professionalTerm) + '</span>');
          rows.push('    </div>');
          rows.push('  </td>');
          rows.push('  <td class="py-2.5 pr-3">');
          rows.push('    <button onclick="toggleIntent(\'' + esc(intent) + '\', ' + !enabled + ')" class="text-xs px-2 py-0.5 rounded-full ' + (enabled ? 'bg-success-100 text-success-700' : 'bg-neutral-200 text-neutral-500') + ' hover:opacity-80">' + (enabled ? 'On' : 'Off') + '</button>');
          rows.push('  </td>');
          rows.push('  <td class="py-2.5 pr-3">');
          rows.push('    <div class="flex items-center gap-1">');
          rows.push('      <select onchange="changeRouting(\'' + esc(intent) + '\', this.value, this)" class="text-xs border rounded px-2 py-1">' + actionOptions + '</select>');
          rows.push('      <select onchange="changeWorkflowId(\'' + esc(intent) + '\', this.value)" class="text-xs border rounded px-2 py-1 ' + (route === 'workflow' ? '' : 'hidden') + '" id="wf-pick-' + css(intent) + '">' + wfOptions + '</select>');
          rows.push('    </div>');
          rows.push('  </td>');
          rows.push('  <td class="py-2.5 pr-3">');
          rows.push('    <input type="number" min="0" max="1" step="0.05" value="' + minConf.toFixed(2) + '" onchange="changeConfidence(\'' + esc(intent) + '\', this.value, this)" class="text-xs border rounded px-2 py-1 w-16 text-center font-mono ' + confColor + '">');
          rows.push('  </td>');
          rows.push('  <td class="py-2.5 pr-3 text-xs">' + (warning || (hasStatic ? '<span class="text-success-600">Yes</span>' : '<span class="text-neutral-400">—</span>')) + '</td>');
          rows.push('  <td class="py-2.5 pr-3">');
          rows.push('    <label class="inline-flex items-center gap-1 cursor-pointer"><input type="checkbox" ' + (timeSensitive ? 'checked' : '') + ' onchange="toggleTimeSensitive(\'' + esc(intent) + '\', this.checked)" class="rounded border-neutral-300 text-primary-600"><span class="text-xs text-neutral-600">On</span></label>');
          rows.push('  </td>');
          rows.push('  <td class="py-2.5">');
          rows.push('    <button onclick="deleteIntent(\'' + esc(intent) + '\')" class="text-xs px-2 py-1 text-danger-500 hover:bg-danger-50 rounded">Delete</button>');
          rows.push('  </td>');
          rows.push('</tr>');
        }
      }
    }

    el.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="7" class="text-neutral-400 py-4 text-center">No intents configured</td></tr>';

    // Render template buttons and detect which template is active
    if (window.renderTemplateButtons) window.renderTemplateButtons();
    if (window.detectActiveTemplate) window.detectActiveTemplate();
  } catch (e) { toast(window.apiHelpers.formatApiError(e), 'error'); }
}

/**
 * Change the routing action for an intent
 * @param {string} intent - Intent category name
 * @param {string} action - New action ('static_reply', 'llm_reply', 'workflow')
 * @param {HTMLSelectElement} selectEl - The select element that triggered the change
 */
export async function changeRouting(intent, action, selectEl) {
  if (intent === 'unknown') { toast('"unknown" intent routing cannot be changed.', 'error'); loadIntents(); return; }
  try {
    const body = { action };
    // Show/hide workflow picker
    const wfPick = document.getElementById('wf-pick-' + css(intent));
    if (action === 'workflow') {
      if (wfPick) {
        wfPick.classList.remove('hidden');
        body.workflow_id = wfPick.value || (window.cacheManager.get(CACHE_KEYS.workflows)?.workflows[0]?.id);
      }
    } else {
      if (wfPick) wfPick.classList.add('hidden');
    }
    await api('/routing/' + encodeURIComponent(intent), { method: 'PATCH', body });
    toast(`${intent} → ${action}${body.workflow_id ? ' (' + body.workflow_id + ')' : ''}`);
    const routing = window.cacheManager.get(CACHE_KEYS.routing);
    if (routing) routing[intent] = { action, workflow_id: body.workflow_id };

    // Call detectActiveTemplate if it exists (from responses-helpers.js)
    if (window.detectActiveTemplate) window.detectActiveTemplate();
  } catch (e) { toast(e.message, 'error'); loadIntents(); }
}

/**
 * Change the workflow ID for an intent with workflow routing
 * @param {string} intent - Intent category name
 * @param {string} workflowId - New workflow ID
 */
export async function changeWorkflowId(intent, workflowId) {
  try {
    await api('/routing/' + encodeURIComponent(intent), { method: 'PATCH', body: { action: 'workflow', workflow_id: workflowId } });
    toast(`${intent} → workflow (${workflowId})`);
    const routing = window.cacheManager.get(CACHE_KEYS.routing);
    if (routing) routing[intent] = { action: 'workflow', workflow_id: workflowId };

    // Call detectActiveTemplate if it exists (from responses-helpers.js)
    if (window.detectActiveTemplate) window.detectActiveTemplate();
  } catch (e) { toast(e.message, 'error'); }
}

/**
 * Toggle an intent on or off
 * @param {string} category - Intent category name
 * @param {boolean} enabled - New enabled state
 */
export async function toggleIntent(category, enabled) {
  if (category === 'unknown') { toast('"unknown" intent is always enabled.', 'error'); return; }
  try {
    await api('/intents/' + encodeURIComponent(category), { method: 'PUT', body: { enabled } });
    toast(category + ': ' + (enabled ? 'enabled' : 'disabled'));
    loadIntents();
  } catch (e) { toast(e.message, 'error'); }
}

/**
 * Toggle time-sensitive flag for an intent
 * @param {string} category - Intent category name
 * @param {boolean} timeSensitive - New time-sensitive state
 */
export async function toggleTimeSensitive(category, timeSensitive) {
  try {
    await api('/intents/' + encodeURIComponent(category), { method: 'PUT', body: { time_sensitive: timeSensitive } });
    toast(category + ': time-sensitive ' + (timeSensitive ? 'on' : 'off'));
    loadIntents();
  } catch (e) { toast(e.message, 'error'); }
}

/**
 * Change the minimum confidence threshold for an intent
 * @param {string} category - Intent category name
 * @param {string} value - New confidence value (0-1)
 * @param {HTMLInputElement} inputEl - The input element that triggered the change
 */
export async function changeConfidence(category, value, inputEl) {
  const val = parseFloat(value);
  if (isNaN(val) || val < 0 || val > 1) {
    toast('Confidence must be between 0 and 1.', 'error');
    loadIntents();
    return;
  }
  const rounded = Math.round(val * 100) / 100;
  try {
    await api('/intents/' + encodeURIComponent(category), { method: 'PUT', body: { min_confidence: rounded } });
    toast(category + ' min confidence: ' + (rounded * 100).toFixed(0) + '%');
    // Update color based on new value
    inputEl.className = inputEl.className.replace(/text-\S+/g, '');
    inputEl.classList.add(rounded <= 0.60 ? 'text-danger-500' : rounded <= 0.70 ? 'text-amber-600' : 'text-neutral-700');
    inputEl.classList.add('text-xs', 'border', 'rounded', 'px-2', 'py-1', 'w-16', 'text-center', 'font-mono');
  } catch (e) { toast(e.message, 'error'); loadIntents(); }
}

/**
 * Delete an intent (removes from both intents.json and routing.json)
 * @param {string} category - Intent category name
 */
export async function deleteIntent(category) {
  if (category === 'unknown') { toast('"unknown" is a protected system intent and cannot be deleted.', 'error'); return; }
  if (!confirm('Delete intent "' + category + '"? This also removes its routing rule.')) return;
  try {
    // Delete from intents.json
    try { await api('/intents/' + encodeURIComponent(category), { method: 'DELETE' }); } catch { }
    // Delete from routing.json
    const routing = { ...window.cacheManager.get(CACHE_KEYS.routing) };
    delete routing[category];
    await api('/routing', { method: 'PUT', body: routing });
    toast('Deleted: ' + category);
    loadIntents();
  } catch (e) { toast(e.message, 'error'); }
}

/**
 * Open modal to edit unknown-intent fallback settings
 * Configures: rephrase count, fallback messages (en/ms/zh), operator escalation
 */
export async function editUnknownSettings() {
  // Fetch current workflow config for escalation threshold
  let wfConfig = {};
  try { wfConfig = await api('/workflow'); } catch { }
  const threshold = wfConfig?.escalation?.unknown_threshold ?? 3;
  const escalateEnabled = wfConfig?.escalation?.enabled !== false;

  // Get fallback messages from settings (or defaults)
  const cachedSettings = window.cacheManager.get(CACHE_KEYS.settings);
  const fb = cachedSettings?.unknownFallback || {};
  const msgEn = fb.en || "I'm sorry, I didn't quite understand that. Could you rephrase your question? I can help with bookings, check-in/out, amenities, and general hostel information.";
  const msgMs = fb.ms || 'Maaf, saya tidak faham mesej anda. Boleh anda tulis semula soalan anda? Saya boleh bantu dengan tempahan, daftar masuk/keluar, kemudahan, dan maklumat am hostel.';
  const msgZh = fb.zh || '抱歉，我没有理解您的意思。您能重新表述一下您的问题吗？我可以帮助您处理预订、入住/退房、设施和旅舍的一般信息。';

  // Remove existing modal if any
  let modal = document.getElementById('unknown-settings-modal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'unknown-settings-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40';
  modal.onclick = function (e) { if (e.target === modal) closeUnknownSettings(); };

  var html = [];
  html.push('<div class="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">');
  html.push('  <div class="px-6 py-4 border-b flex items-center justify-between">');
  html.push('    <h3 class="font-semibold text-lg text-neutral-800">Unknown Intent Fallback Settings</h3>');
  html.push('    <button onclick="closeUnknownSettings()" class="text-neutral-400 hover:text-neutral-600 text-xl">&times;</button>');
  html.push('  </div>');
  html.push('  <div class="px-6 py-4 space-y-4">');

  // Rephrase count
  html.push('    <div>');
  html.push('      <label class="block text-sm font-medium text-neutral-700 mb-1">Max Rephrase Attempts</label>');
  html.push('      <p class="text-xs text-neutral-500 mb-2">Number of times Rainbow asks the guest to rephrase before escalating to staff.</p>');
  html.push('      <input type="number" id="unk-threshold" min="1" max="10" value="' + threshold + '" class="border rounded px-3 py-2 w-20 text-center font-mono">');
  html.push('    </div>');

  // Escalation toggle
  html.push('    <div>');
  html.push('      <label class="inline-flex items-center gap-2 cursor-pointer">');
  html.push('        <input type="checkbox" id="unk-escalate" ' + (escalateEnabled ? 'checked' : '') + ' class="rounded border-neutral-300 text-primary-600">');
  html.push('        <span class="text-sm font-medium text-neutral-700">Escalate to operator after max attempts</span>');
  html.push('      </label>');
  html.push('      <p class="text-xs text-neutral-500 mt-1">When enabled, Rainbow forwards the conversation to staff after the guest hits the rephrase limit.</p>');
  html.push('    </div>');

  // Separator
  html.push('    <hr class="border-neutral-200">');
  html.push('    <h4 class="font-medium text-sm text-neutral-700">Fallback Messages</h4>');
  html.push('    <p class="text-xs text-neutral-500">Shown to guests when their message is not understood.</p>');

  // EN
  html.push('    <div>');
  html.push('      <label class="block text-xs font-medium text-neutral-600 mb-1">English</label>');
  html.push('      <textarea id="unk-msg-en" rows="3" class="w-full border rounded px-3 py-2 text-sm">' + esc(msgEn) + '</textarea>');
  html.push('    </div>');

  // MS
  html.push('    <div>');
  html.push('      <label class="block text-xs font-medium text-neutral-600 mb-1">Bahasa Melayu</label>');
  html.push('      <textarea id="unk-msg-ms" rows="3" class="w-full border rounded px-3 py-2 text-sm">' + esc(msgMs) + '</textarea>');
  html.push('    </div>');

  // ZH
  html.push('    <div>');
  html.push('      <label class="block text-xs font-medium text-neutral-600 mb-1">Chinese</label>');
  html.push('      <textarea id="unk-msg-zh" rows="3" class="w-full border rounded px-3 py-2 text-sm">' + esc(msgZh) + '</textarea>');
  html.push('    </div>');

  html.push('  </div>');
  html.push('  <div class="px-6 py-4 border-t flex justify-end gap-2">');
  html.push('    <button onclick="closeUnknownSettings()" class="px-4 py-2 text-sm rounded border hover:bg-neutral-50">Cancel</button>');
  html.push('    <button onclick="saveUnknownSettings()" class="px-4 py-2 text-sm rounded bg-primary-600 text-white hover:bg-primary-700">Save</button>');
  html.push('  </div>');
  html.push('</div>');

  modal.innerHTML = html.join('');
  document.body.appendChild(modal);
}

/**
 * Save unknown-intent fallback settings
 * Writes to both settings.json (messages) and workflow.json (threshold)
 */
export async function saveUnknownSettings() {
  const threshold = parseInt(document.getElementById('unk-threshold')?.value || '3', 10);
  const escalateEnabled = document.getElementById('unk-escalate')?.checked ?? true;
  const en = document.getElementById('unk-msg-en')?.value || '';
  const ms = document.getElementById('unk-msg-ms')?.value || '';
  const zh = document.getElementById('unk-msg-zh')?.value || '';

  try {
    // Save fallback messages to settings.json
    await api('/settings', { method: 'PATCH', body: { unknownFallback: { en, ms, zh } } });

    // Save escalation threshold to workflow config
    await api('/workflow', { method: 'PATCH', body: { escalation: { unknown_threshold: threshold, enabled: escalateEnabled } } });

    toast('Unknown fallback settings saved');
    closeUnknownSettings();

    // Update cached settings
    const cachedSettings = window.cacheManager.get(CACHE_KEYS.settings);
    if (cachedSettings) cachedSettings.unknownFallback = { en, ms, zh };
  } catch (e) { toast(e.message, 'error'); }
}

/**
 * Close the unknown settings modal
 */
export function closeUnknownSettings() {
  const modal = document.getElementById('unknown-settings-modal');
  if (modal) modal.remove();
}

/**
 * Getter functions for shared state (used by routing-templates.js, intent-helpers.js)
 * Now backed by the centralized cacheManager.
 */
export function getCachedRouting() {
  return window.cacheManager.get(CACHE_KEYS.routing);
}

export function getCachedKnowledge() {
  return window.cacheManager.get(CACHE_KEYS.knowledge);
}

export function getCachedIntentNames() {
  return window.cacheManager.get(CACHE_KEYS.intentNames) || [];
}

export function getCachedWorkflows() {
  return window.cacheManager.get(CACHE_KEYS.workflows);
}
