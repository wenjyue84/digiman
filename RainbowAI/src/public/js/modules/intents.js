/**
 * Intents & Routing Tab Module
 * Manages intent configuration and routing rules
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

// Use global css() function from legacy-functions.js
const css = window.css || ((s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_'));

// Module-level state (cached data from API)
let cachedRouting = null;
let cachedKnowledge = null;
let cachedWorkflows = null;
let cachedSettings = null;
let cachedIntentNames = [];

/**
 * Load and render the Intents & Routing tab
 * Fetches intents, routing, knowledge, workflows, and settings data
 * Renders a table grouped by guest journey phases
 */
export async function loadIntents() {
  try {
    const [intentsData, routingData, knowledgeData, workflowsData, settingsData] = await Promise.all([
      api('/intents'),
      api('/routing'),
      api('/knowledge'),
      api('/workflows'),
      api('/settings')
    ]);

    cachedRouting = routingData;
    cachedKnowledge = knowledgeData;
    cachedWorkflows = workflowsData;
    cachedSettings = settingsData;

    const el = document.getElementById('intents-table-body');
    const phases = intentsData.categories || [];
    // Build canonical intent list from intents.json (source of truth)
    cachedIntentNames = phases.flatMap(p => (p.intents || []).map(i => i.category));
    if (!cachedIntentNames.includes('unknown')) cachedIntentNames.push('unknown');
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
          <tr class="border-b bg-neutral-50/50" id="intent-row-${css(intent)}">
            <td class="py-2.5 pr-3 font-mono text-sm">
              <span class="relative group cursor-help">
                ${esc(intent)}
                <span class="inline-block ml-1 text-neutral-400 text-xs align-top">🔒</span>
                <span class="pointer-events-none absolute left-0 bottom-full mb-2 w-64 px-3 py-2 text-xs text-white bg-neutral-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  The "unknown" intent is a system fallback. When the AI cannot classify a message into any known intent, it falls back here. It must always use LLM Reply so the AI can generate a helpful response.
                </span>
              </span>
            </td>
            <td class="py-2.5 pr-3">
              <span class="text-xs px-2 py-0.5 rounded-full bg-success-100 text-success-700 opacity-60 cursor-not-allowed">Always On</span>
            </td>
            <td class="py-2.5 pr-3">
              <span class="text-xs border rounded px-2 py-1 bg-neutral-100 text-neutral-500 cursor-not-allowed inline-block">LLM Reply</span>
            </td>
            <td class="py-2.5 pr-3 text-xs"><span class="text-neutral-400 cursor-not-allowed">0.50</span></td>
            <td class="py-2.5 pr-3 text-xs"><span class="text-neutral-400">—</span></td>
            <td class="py-2.5 pr-3 text-xs"><span class="text-neutral-400">—</span></td>
            <td class="py-2.5">
              <span class="text-xs px-2 py-1 text-neutral-300 cursor-not-allowed">Protected</span>
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

    // Call renderTemplateButtons if it exists (from responses-helpers.js)
    if (window.renderTemplateButtons) window.renderTemplateButtons();
  } catch (e) { toast(e.message, 'error'); }
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
        body.workflow_id = wfPick.value || (cachedWorkflows.workflows[0]?.id);
      }
    } else {
      if (wfPick) wfPick.classList.add('hidden');
    }
    await api('/routing/' + encodeURIComponent(intent), { method: 'PATCH', body });
    toast(`${intent} → ${action}${body.workflow_id ? ' (' + body.workflow_id + ')' : ''}`);
    cachedRouting[intent] = { action, workflow_id: body.workflow_id };

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
    cachedRouting[intent] = { action: 'workflow', workflow_id: workflowId };

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
    const routing = { ...cachedRouting };
    delete routing[category];
    await api('/routing', { method: 'PUT', body: routing });
    toast('Deleted: ' + category);
    loadIntents();
  } catch (e) { toast(e.message, 'error'); }
}

/**
 * Getter functions for shared state (used by routing-templates.js)
 */
export function getCachedRouting() {
  return cachedRouting;
}

export function getCachedKnowledge() {
  return cachedKnowledge;
}

export function getCachedIntentNames() {
  return cachedIntentNames;
}

export function getCachedWorkflows() {
  return cachedWorkflows;
}
