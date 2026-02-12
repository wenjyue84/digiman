/**
 * Intent Routing Module
 * Manages intent routing configuration, templates, and classification testing
 */

import { api } from '../api.js';
import { toast } from '../toast.js';
import { escapeHtml as esc } from '../core/utils.js';

// Cached data
let cachedRouting = {};
let cachedKnowledge = {};
let cachedWorkflows = {};
let cachedSettings = {};
let cachedIntentNames = [];

// Intent → Workflow mapping (based on available workflows)
const INTENT_WORKFLOW_MAP = {
  'booking': 'booking_payment_handler',
  'payment_made': 'forward_payment',
  'check_in_arrival': 'checkin_full',
  'lower_deck_preference': 'lower_deck_preference',
  'tourist_guide': 'tourist_guide',
  'climate_control_complaint': 'complaint_handling',
  'noise_complaint': 'complaint_handling',
  'cleanliness_complaint': 'complaint_handling',
  'facility_malfunction': 'complaint_handling',
  'card_locked': 'card_locked_troubleshoot',
  'theft_report': 'theft_emergency',
  'contact_staff': 'escalate',
  'post_checkout_complaint': 'complaint_handling',
  'billing_dispute': 'escalate',
  'complaint': 'complaint_handling',
  'theft': 'theft_emergency'
};

// Generic classifier names not in intents.json but returned by classifier
const GENERIC_CLASSIFIER_INTENTS = ['complaint', 'theft', 'payment', 'facilities'];

// Balanced static intents set
const BALANCED_STATIC_INTENTS = new Set([
  'wifi', 'directions', 'pricing', 'checkin_info', 'checkout_info',
  'facilities_info', 'rules_policy', 'payment_info',
  'checkout_procedure', 'luggage_storage', 'greeting', 'thanks',
  'payment', 'facilities'
]);

/**
 * Load and display intents table with routing configuration
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

    const rows = [];

    // Render intents grouped by phase
    for (let i = 0; i < phases.length; i++) {
      const phaseData = phases[i];
      const phaseName = phaseData.phase || 'Uncategorized';
      const phaseDesc = phaseData.description || '';
      const phaseIntents = phaseData.intents || [];

      // Add phase header
      rows.push('<tr class="bg-gradient-to-r from-primary-50 to-transparent border-b-2 border-primary-200">');
      rows.push('  <td colspan="6" class="py-3 px-3">');
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
        const hasStatic = staticIntentNames.has(intent);
        const needsStatic = route === 'static_reply';
        const isUnknown = intent === 'unknown';

        let warning = '';
        if (needsStatic && !hasStatic) warning = '<span class="badge-warn">No static reply!</span>';
        if (!needsStatic && hasStatic) warning = '<span class="badge-warn">Unused reply</span>';

        const actionOptions = window.ACTIONS.map(a => '<option value="' + a + '" ' + (route === a ? 'selected' : '') + '>' + window.ACTION_LABELS[a] + '</option>').join('');
        const wfOptions = wfList.map(w => '<option value="' + esc(w.id) + '" ' + (wfId === w.id ? 'selected' : '') + '>' + esc(w.name) + '</option>').join('');
        const minConf = intentData.min_confidence !== undefined ? intentData.min_confidence : 0.75;
        const confColor = minConf <= 0.60 ? 'text-danger-500' : minConf <= 0.70 ? 'text-amber-600' : 'text-neutral-700';

        // CSS-safe intent name
        const css = (s) => s.replace(/[^a-zA-Z0-9]/g, '-');

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
              <td class="py-2.5">
                <span class="text-xs px-2 py-1 text-neutral-300 cursor-not-allowed">Protected</span>
              </td>
            </tr>
          `);
        } else {
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
          rows.push('  <td class="py-2.5">');
          rows.push('    <button onclick="deleteIntent(\'' + esc(intent) + '\')" class="text-xs px-2 py-1 text-danger-500 hover:bg-danger-50 rounded">Delete</button>');
          rows.push('  </td>');
          rows.push('</tr>');
        }
      }
    }

    el.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="6" class="text-neutral-400 py-4 text-center">No intents configured</td></tr>';
    renderTemplateButtons();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Change routing action for an intent
 */
export async function changeRouting(intent, action, selectEl) {
  if (intent === 'unknown') {
    toast('"unknown" intent routing cannot be changed.', 'error');
    loadIntents();
    return;
  }
  try {
    const body = { action };
    // Show/hide workflow picker
    const css = (s) => s.replace(/[^a-zA-Z0-9]/g, '-');
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
    detectActiveTemplate(); // Update template highlighting
  } catch (e) {
    toast(e.message, 'error');
    loadIntents();
  }
}

/**
 * Change workflow ID for an intent
 */
export async function changeWorkflowId(intent, workflowId) {
  try {
    await api('/routing/' + encodeURIComponent(intent), { method: 'PATCH', body: { action: 'workflow', workflow_id: workflowId } });
    toast(`${intent} → workflow (${workflowId})`);
    cachedRouting[intent] = { action: 'workflow', workflow_id: workflowId };
    detectActiveTemplate(); // Update template highlighting
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Toggle intent enabled/disabled
 */
export async function toggleIntent(category, enabled) {
  if (category === 'unknown') {
    toast('"unknown" intent is always enabled.', 'error');
    return;
  }
  try {
    await api('/intents/' + encodeURIComponent(category), { method: 'PUT', body: { enabled } });
    toast(category + ': ' + (enabled ? 'enabled' : 'disabled'));
    loadIntents();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Change minimum confidence threshold for intent
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
  } catch (e) {
    toast(e.message, 'error');
    loadIntents();
  }
}

/**
 * Delete an intent
 */
export async function deleteIntent(category) {
  if (category === 'unknown') {
    toast('"unknown" is a protected system intent and cannot be deleted.', 'error');
    return;
  }
  if (!confirm('Delete intent "' + category + '"? This also removes its routing rule.')) return;
  try {
    // Delete from intents.json
    try {
      await api('/intents/' + encodeURIComponent(category), { method: 'DELETE' });
    } catch {}
    // Delete from routing.json
    const routing = { ...cachedRouting };
    delete routing[category];
    await api('/routing', { method: 'PUT', body: routing });
    toast('Deleted: ' + category);
    loadIntents();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ─── Routing Templates ──────────────────────────────────────────────

/**
 * Get all intent keys (from intents.json + generic classifier names)
 */
function getIntentKeys() {
  const names = cachedIntentNames.length > 0 ? [...cachedIntentNames] : Object.keys(cachedRouting);
  for (const g of GENERIC_CLASSIFIER_INTENTS) {
    if (!names.includes(g)) names.push(g);
  }
  return names;
}

/**
 * Build T1 Smartest routing (Workflow for structured, LLM for rest)
 */
function buildSmartestRouting() {
  const routing = {};
  for (const intent of getIntentKeys()) {
    if (INTENT_WORKFLOW_MAP[intent]) {
      routing[intent] = { action: 'workflow', workflow_id: INTENT_WORKFLOW_MAP[intent] };
    } else {
      routing[intent] = { action: 'llm_reply' };
    }
  }
  return routing;
}

/**
 * Build T2 Performance routing (Static KB, Workflow, minimal LLM)
 */
function buildPerformanceRouting() {
  const staticIntentNames = new Set((cachedKnowledge.static || []).map(e => e.intent));
  const routing = {};
  for (const intent of getIntentKeys()) {
    if (INTENT_WORKFLOW_MAP[intent]) {
      routing[intent] = { action: 'workflow', workflow_id: INTENT_WORKFLOW_MAP[intent] };
    } else if (intent === 'unknown') {
      routing[intent] = { action: 'llm_reply' };
    } else if (staticIntentNames.has(intent)) {
      routing[intent] = { action: 'static_reply' };
    } else {
      routing[intent] = { action: 'llm_reply' };
    }
  }
  return routing;
}

/**
 * Build T3/T4/T5 Balanced routing (Static factual, Workflow structured, LLM conversational)
 */
function buildBalancedRouting() {
  const routing = {};
  for (const intent of getIntentKeys()) {
    if (INTENT_WORKFLOW_MAP[intent]) {
      routing[intent] = { action: 'workflow', workflow_id: INTENT_WORKFLOW_MAP[intent] };
    } else if (BALANCED_STATIC_INTENTS.has(intent)) {
      routing[intent] = { action: 'static_reply' };
    } else {
      routing[intent] = { action: 'llm_reply' };
    }
  }
  return routing;
}

/**
 * Check if current routing matches a template
 */
function routingMatchesTemplate(current, template) {
  const tplKeys = Object.keys(template);
  return tplKeys.every(k => {
    const curAction = current[k]?.action || 'llm_reply';
    const tplAction = template[k]?.action || 'llm_reply';
    if (curAction !== tplAction) return false;
    if (curAction === 'workflow' && current[k]?.workflow_id !== template[k]?.workflow_id) return false;
    return true;
  });
}

// ─── Template Management ──────────────────────────────────────────────

/**
 * Get saved custom templates from localStorage
 */
function getSavedTemplates() {
  const saved = localStorage.getItem('rainbow_saved_templates');
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

/**
 * Save templates to localStorage
 */
function saveTemplates(templates) {
  localStorage.setItem('rainbow_saved_templates', JSON.stringify(templates));
}

/**
 * Render template selection buttons
 */
function renderTemplateButtons() {
  const container = document.getElementById('template-buttons-container');
  const savedTemplates = getSavedTemplates();

  // System templates HTML (simplified for brevity)
  let html = `
    <button id="tpl-btn-smartest" onclick="applyTemplate('smartest')" class="template-btn text-xs px-3 py-1.5 rounded-2xl border bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition">T1 Smartest</button>
    <button id="tpl-btn-performance" onclick="applyTemplate('performance')" class="template-btn text-xs px-3 py-1.5 rounded-2xl border bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition">T2 Performance</button>
    <button id="tpl-btn-balanced" onclick="applyTemplate('balanced')" class="template-btn text-xs px-3 py-1.5 rounded-2xl border bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition">T3 Balanced</button>
    <button id="tpl-btn-smartfast" onclick="applyTemplate('smartfast')" class="template-btn text-xs px-3 py-1.5 rounded-2xl border bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition">T4 Smart-Fast</button>
    <button id="tpl-btn-tiered" onclick="applyTemplate('tiered')" class="template-btn text-xs px-3 py-1.5 rounded-2xl border bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition">T5 Tiered-Hybrid</button>
    <span class="text-neutral-300">|</span>
    <button id="tpl-btn-custom" onclick="saveCurrentAsCustom()" class="template-btn text-xs px-3 py-1.5 rounded-2xl border bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition">Save Custom</button>
  `;

  // Saved custom templates
  if (savedTemplates.length > 0) {
    html += '<span class="text-neutral-300">|</span>';
    savedTemplates.forEach(tpl => {
      html += `
        <button id="tpl-btn-${esc(tpl.id)}" onclick="applyTemplate('${esc(tpl.id)}')" class="template-btn text-xs px-3 py-1.5 rounded-2xl border bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition">${esc(tpl.name)}</button>
      `;
    });
  }

  container.innerHTML = html;
  detectActiveTemplate();
}

/**
 * Detect and highlight active template
 */
function detectActiveTemplate() {
  const btns = document.querySelectorAll('.template-btn');
  const activeClasses = 'bg-primary-50 text-primary-700 border-primary-300';
  const defaultClasses = 'bg-neutral-100 text-neutral-600';
  btns.forEach(b => {
    b.className = b.className.replace(activeClasses, defaultClasses);
  });

  let matched = null;

  // Check system templates
  if (routingMatchesTemplate(cachedRouting, buildSmartestRouting())) {
    matched = 'smartest';
  } else if (routingMatchesTemplate(cachedRouting, buildPerformanceRouting())) {
    matched = 'performance';
  } else if (routingMatchesTemplate(cachedRouting, buildBalancedRouting())) {
    const mode = cachedSettings?.routing_mode;
    if (mode?.splitModel) matched = 'smartfast';
    else if (mode?.tieredPipeline) matched = 'tiered';
    else matched = 'balanced';
  } else {
    // Check saved templates
    const savedTemplates = getSavedTemplates();
    for (const tpl of savedTemplates) {
      if (routingMatchesTemplate(cachedRouting, tpl.routing)) {
        matched = tpl.id;
        break;
      }
    }
  }

  if (matched) {
    const btn = document.getElementById('tpl-btn-' + matched);
    if (btn) btn.className = btn.className.replace(defaultClasses, activeClasses);
  }
}

/**
 * Apply a routing template
 */
export async function applyTemplate(name) {
  let routing;
  let label;

  if (name === 'smartest') {
    routing = buildSmartestRouting();
    label = 'T1 Smartest';
  } else if (name === 'performance') {
    routing = buildPerformanceRouting();
    label = 'T2 Performance';
  } else if (name === 'balanced') {
    routing = buildBalancedRouting();
    label = 'T3 Balanced';
  } else if (name === 'smartfast') {
    routing = buildBalancedRouting();
    label = 'T4 Smart-Fast';
  } else if (name === 'tiered') {
    routing = buildBalancedRouting();
    label = 'T5 Tiered-Hybrid';
  } else {
    // Check saved templates
    const savedTemplates = getSavedTemplates();
    const template = savedTemplates.find(t => t.id === name);
    if (!template) {
      toast('Template not found.', 'error');
      return;
    }
    routing = template.routing;
    label = template.name;
  }

  const changes = Object.keys(routing).filter(k => {
    return routing[k]?.action !== cachedRouting[k]?.action ||
      (routing[k]?.action === 'workflow' && routing[k]?.workflow_id !== cachedRouting[k]?.workflow_id);
  });

  if (changes.length === 0) {
    toast(label + ' is already active.', 'info');
    return;
  }

  if (!confirm('Apply ' + label + '? This will change ' + changes.length + ' intent(s).')) return;

  try {
    await api('/routing', { method: 'PUT', body: routing });
    toast(label + ' applied — ' + changes.length + ' intent(s) updated.');
    await loadIntents();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Save current routing as custom template
 */
export function saveCurrentAsCustom() {
  const name = prompt('Save current routing as a custom template.\n\nTemplate name:');
  if (!name || !name.trim()) return;

  const trimmedName = name.trim();
  const templates = getSavedTemplates();
  const id = 'custom_' + Date.now();

  if (templates.some(t => t.name === trimmedName)) {
    toast('A template with this name already exists.', 'error');
    return;
  }

  const newTemplate = {
    id: id,
    name: trimmedName,
    routing: JSON.parse(JSON.stringify(cachedRouting)),
    created: Date.now(),
    system: false
  };

  templates.push(newTemplate);
  saveTemplates(templates);

  toast('Template "' + trimmedName + '" saved successfully.');
  renderTemplateButtons();
}

/**
 * Delete a saved template
 */
export function deleteTemplate(id) {
  const templates = getSavedTemplates();
  const template = templates.find(t => t.id === id);

  if (!template) {
    toast('Template not found.', 'error');
    return;
  }

  if (!confirm('Delete template "' + template.name + '"?')) return;

  const filtered = templates.filter(t => t.id !== id);
  saveTemplates(filtered);

  toast('Template "' + template.name + '" deleted.');
  renderTemplateButtons();
}

/**
 * Show submit save template modal (called from HTML)
 */
export function submitSaveTemplate(e) {
  e.preventDefault();
  const name = document.getElementById('save-template-name').value.trim();
  if (!name) {
    toast('Please enter a template name.', 'error');
    return;
  }

  const templates = getSavedTemplates();
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  if (templates.some(t => t.id === id)) {
    toast('A template with this name already exists.', 'error');
    return;
  }

  const newTemplate = {
    id: id,
    name: name,
    routing: JSON.parse(JSON.stringify(cachedRouting)),
    created: Date.now(),
    system: false
  };

  templates.push(newTemplate);
  saveTemplates(templates);

  toast('Template "' + name + '" saved successfully.');
  closeModal('save-template-modal');
  renderTemplateButtons();
}

// Add intent management functions (simplified)
export function showAddIntent() {
  document.getElementById('add-intent-modal').classList.remove('hidden');
  document.getElementById('add-i-category').focus();
}

export async function submitAddIntent(e) {
  e.preventDefault();
  const category = document.getElementById('add-i-category').value.trim().toLowerCase().replace(/\s+/g, '_');
  const routingAction = document.getElementById('add-i-routing').value;
  try {
    await api('/intents', { method: 'POST', body: { category } });
    await api('/routing/' + encodeURIComponent(category), { method: 'PATCH', body: { action: routingAction } });
    toast('Intent added: ' + category);
    closeModal('add-intent-modal');
    loadIntents();
  } catch (e) {
    toast(e.message, 'error');
  }
}
