/**
 * Routing Templates Module
 * Manages smart routing templates and custom template management
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';
import {
  getCachedRouting,
  getCachedKnowledge,
  getCachedIntentNames,
  getCachedWorkflows,
  loadIntents
} from './intents.js';

// Use global css() function from legacy-functions.js
const css = window.css || ((s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_'));

// Constants for routing templates
const INTENT_WORKFLOW_MAP = {
  'booking': 'booking_payment_handler',
  'payment_made': 'forward_payment',
  'lost_items': 'lost_found_workflow',
  'theft': 'theft_emergency',
  'fire': 'emergency_evacuation',
  'ambulance': 'medical_emergency',
  'police': 'police_assistance',
  'card_locked': 'card_locked_troubleshoot',
  'complaint': 'complaint_handling',
  'bad_smell': 'complaint_handling',
  'noise': 'complaint_handling',
  'early_checkin': 'checkin_full',
  'late_checkout': 'checkin_full',
  'tourist_info': 'tourist_guide',
  'escalate': 'escalate',
  'unknown': 'escalate'
};

const GENERIC_CLASSIFIER_INTENTS = ['complaint', 'theft', 'payment', 'facilities'];

const BALANCED_STATIC_INTENTS = new Set([
  'wifi', 'directions', 'pricing', 'availability', 'checkin_times', 'checkout_times',
  'parking', 'pets', 'smoking', 'payment_methods', 'refund_policy', 'contact_info',
  'facilities', 'amenities', 'room_types', 'breakfast', 'luggage', 'quiet_hours'
]);

/**
 * Get all intent keys (from cached intents + generic classifiers)
 * @returns {string[]} Array of intent category names
 */
function getIntentKeys() {
  const cachedRouting = getCachedRouting();
  const cachedIntentNames = getCachedIntentNames();
  const names = cachedIntentNames.length > 0 ? [...cachedIntentNames] : Object.keys(cachedRouting);
  for (const g of GENERIC_CLASSIFIER_INTENTS) {
    if (!names.includes(g)) names.push(g);
  }
  return names;
}

/**
 * Build T1 Smartest Routing template (LLM + workflows for complex intents)
 * @returns {Object} Routing configuration object
 */
export function buildSmartestRouting() {
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
 * Build T2 Performance Routing template (static replies for speed)
 * @returns {Object} Routing configuration object
 */
export function buildPerformanceRouting() {
  const cachedKnowledge = getCachedKnowledge();
  const staticIntents = new Set((cachedKnowledge?.static || []).map(e => e.intent));
  const routing = {};
  for (const intent of getIntentKeys()) {
    if (staticIntents.has(intent)) {
      routing[intent] = { action: 'static_reply' };
    } else if (INTENT_WORKFLOW_MAP[intent]) {
      routing[intent] = { action: 'workflow', workflow_id: INTENT_WORKFLOW_MAP[intent] };
    } else {
      routing[intent] = { action: 'llm_reply' };
    }
  }
  return routing;
}

/**
 * Build T3 Balanced Routing template (static for FAQ, LLM for complex)
 * @returns {Object} Routing configuration object
 */
export function buildBalancedRouting() {
  const routing = {};
  for (const intent of getIntentKeys()) {
    if (BALANCED_STATIC_INTENTS.has(intent)) {
      routing[intent] = { action: 'static_reply' };
    } else if (INTENT_WORKFLOW_MAP[intent]) {
      routing[intent] = { action: 'workflow', workflow_id: INTENT_WORKFLOW_MAP[intent] };
    } else {
      routing[intent] = { action: 'llm_reply' };
    }
  }
  return routing;
}

/**
 * Check if current routing matches a template
 * @param {string} templateName - Template name ('smartest', 'performance', 'balanced')
 * @returns {boolean} True if routing matches template
 */
export function routingMatchesTemplate(templateName) {
  const cachedRouting = getCachedRouting();
  if (!cachedRouting) return false;
  let template;
  if (templateName === 'smartest') template = buildSmartestRouting();
  else if (templateName === 'performance') template = buildPerformanceRouting();
  else if (templateName === 'balanced') template = buildBalancedRouting();
  else return false;
  return JSON.stringify(cachedRouting) === JSON.stringify(template);
}

/**
 * Get saved custom templates from localStorage
 * @returns {Array} Array of custom template objects
 */
export function getSavedTemplates() {
  try {
    const saved = localStorage.getItem('rainbow_custom_templates');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(t => ({
      name: t.name || 'Unnamed',
      description: t.description || '',
      routing: t.routing || {},
      created: t.created || Date.now()
    }));
  } catch (e) {
    console.error('Failed to load custom templates:', e);
    return [];
  }
}

/**
 * Save custom templates to localStorage
 * @param {Array} templates - Array of template objects
 */
export function saveTemplates(templates) {
  localStorage.setItem('rainbow_custom_templates', JSON.stringify(templates));
}

/**
 * Render template buttons UI
 * Displays built-in templates (T1-T5) and custom saved templates
 */
export function renderTemplateButtons() {
  const container = document.getElementById('template-buttons-container');
  if (!container) return;

  const customTemplates = getSavedTemplates();
  const cachedRouting = getCachedRouting();
  const currentJson = JSON.stringify(cachedRouting);

  const isT1 = routingMatchesTemplate('smartest');
  const isT2 = routingMatchesTemplate('performance');
  const isT3 = routingMatchesTemplate('balanced');

  const buttons = [];

  // Built-in templates
  buttons.push('<div class="flex flex-wrap gap-2 mb-4">');

  // T1 Smartest
  buttons.push('<button onclick="applyTemplate(\'smartest\')" class="px-4 py-2 rounded-lg border transition-all ' + (isT1 ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-neutral-700 border-neutral-300 hover:border-primary-400') + '">');
  buttons.push('  <div class="flex items-center gap-2">');
  buttons.push('    <span class="text-xl">🚀</span>');
  buttons.push('    <div class="text-left">');
  buttons.push('      <div class="font-semibold text-sm">T1 Smartest</div>');
  buttons.push('      <div class="text-xs opacity-70">LLM + workflows</div>');
  buttons.push('    </div>');
  if (isT1) buttons.push('    <span class="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">Active</span>');
  buttons.push('  </div>');
  buttons.push('</button>');

  // T2 Performance
  buttons.push('<button onclick="applyTemplate(\'performance\')" class="px-4 py-2 rounded-lg border transition-all ' + (isT2 ? 'bg-success-600 text-white border-success-600' : 'bg-white text-neutral-700 border-neutral-300 hover:border-success-400') + '">');
  buttons.push('  <div class="flex items-center gap-2">');
  buttons.push('    <span class="text-xl">⚡</span>');
  buttons.push('    <div class="text-left">');
  buttons.push('      <div class="font-semibold text-sm">T2 Performance</div>');
  buttons.push('      <div class="text-xs opacity-70">Static + workflows</div>');
  buttons.push('    </div>');
  if (isT2) buttons.push('    <span class="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">Active</span>');
  buttons.push('  </div>');
  buttons.push('</button>');

  // T3 Balanced
  buttons.push('<button onclick="applyTemplate(\'balanced\')" class="px-4 py-2 rounded-lg border transition-all ' + (isT3 ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-neutral-700 border-neutral-300 hover:border-amber-400') + '">');
  buttons.push('  <div class="flex items-center gap-2">');
  buttons.push('    <span class="text-xl">⚖️</span>');
  buttons.push('    <div class="text-left">');
  buttons.push('      <div class="font-semibold text-sm">T3 Balanced</div>');
  buttons.push('      <div class="text-xs opacity-70">Static FAQ + LLM complex</div>');
  buttons.push('    </div>');
  if (isT3) buttons.push('    <span class="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">Active</span>');
  buttons.push('  </div>');
  buttons.push('</button>');

  buttons.push('</div>');

  // Custom templates
  if (customTemplates.length > 0) {
    buttons.push('<div class="mt-4 pt-4 border-t border-neutral-200">');
    buttons.push('  <div class="text-sm font-semibold text-neutral-700 mb-2">Custom Templates</div>');
    buttons.push('  <div class="flex flex-wrap gap-2">');

    for (const tpl of customTemplates) {
      const isActive = JSON.stringify(tpl.routing) === currentJson;
      buttons.push('    <div class="relative group">');
      buttons.push('      <button onclick="applyTemplate(\'custom\', \'' + esc(tpl.name) + '\')" class="px-3 py-2 rounded-lg border transition-all ' + (isActive ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-neutral-700 border-neutral-300 hover:border-purple-400') + '">');
      buttons.push('        <div class="flex items-center gap-2">');
      buttons.push('          <span class="text-lg">📋</span>');
      buttons.push('          <div class="text-left">');
      buttons.push('            <div class="font-semibold text-sm">' + esc(tpl.name) + '</div>');
      if (tpl.description) buttons.push('            <div class="text-xs opacity-70">' + esc(tpl.description) + '</div>');
      buttons.push('          </div>');
      if (isActive) buttons.push('          <span class="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">Active</span>');
      buttons.push('        </div>');
      buttons.push('      </button>');
      buttons.push('      <button onclick="deleteTemplate(\'' + esc(tpl.name) + '\')" class="absolute -top-2 -right-2 w-6 h-6 bg-danger-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-danger-600">×</button>');
      buttons.push('    </div>');
    }

    buttons.push('  </div>');
    buttons.push('</div>');
  }

  // Save current button
  buttons.push('<div class="mt-4 pt-4 border-t border-neutral-200">');
  buttons.push('  <button onclick="showSaveTemplateModal()" class="text-sm px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors">💾 Save Current as Template</button>');
  buttons.push('</div>');

  container.innerHTML = buttons.join('');
}

/**
 * Show intents template help modal
 */
export function showIntentsTemplateHelp() {
  if (window.openModal) window.openModal('intents-template-help');
}

/**
 * Detect which template (if any) is currently active
 * Updates the UI to highlight the active template
 */
export function detectActiveTemplate() {
  const cachedRouting = getCachedRouting();
  if (!cachedRouting) return;

  const isT1 = routingMatchesTemplate('smartest');
  const isT2 = routingMatchesTemplate('performance');
  const isT3 = routingMatchesTemplate('balanced');

  const customTemplates = getSavedTemplates();
  const currentJson = JSON.stringify(cachedRouting);
  const activeCustom = customTemplates.find(t => JSON.stringify(t.routing) === currentJson);

  // Update template status display (if exists)
  const statusEl = document.getElementById('active-template-status');
  if (statusEl) {
    if (isT1) statusEl.textContent = '🚀 T1 Smartest';
    else if (isT2) statusEl.textContent = '⚡ T2 Performance';
    else if (isT3) statusEl.textContent = '⚖️ T3 Balanced';
    else if (activeCustom) statusEl.textContent = '📋 ' + activeCustom.name;
    else statusEl.textContent = '🔧 Custom Configuration';
  }

  // Re-render template buttons to update active state
  renderTemplateButtons();
}

/**
 * Apply a routing template
 * @param {string} templateName - Template name ('smartest', 'performance', 'balanced', or 'custom')
 * @param {string} customName - Custom template name (if templateName is 'custom')
 */
export async function applyTemplate(templateName, customName = null) {
  let routing;
  let displayName;

  if (templateName === 'smartest') {
    routing = buildSmartestRouting();
    displayName = 'T1 Smartest';
  } else if (templateName === 'performance') {
    routing = buildPerformanceRouting();
    displayName = 'T2 Performance';
  } else if (templateName === 'balanced') {
    routing = buildBalancedRouting();
    displayName = 'T3 Balanced';
  } else if (templateName === 'custom' && customName) {
    const templates = getSavedTemplates();
    const found = templates.find(t => t.name === customName);
    if (!found) {
      toast('Template not found: ' + customName, 'error');
      return;
    }
    routing = found.routing;
    displayName = customName;
  } else {
    toast('Invalid template', 'error');
    return;
  }

  if (!confirm('Apply template "' + displayName + '"? This will overwrite all current routing rules.')) return;

  try {
    await api('/routing', { method: 'PUT', body: routing });
    toast('Template applied: ' + displayName);
    loadIntents(); // Reload intents table
    detectActiveTemplate(); // Update active template display
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Show save template modal
 */
export function showSaveTemplateModal() {
  if (window.openModal) window.openModal('save-template-modal');
  // Focus template name input
  setTimeout(() => {
    const input = document.getElementById('new-template-name');
    if (input) input.focus();
  }, 100);
}

/**
 * Submit save template form
 * Saves current routing configuration as a custom template
 */
export async function submitSaveTemplate(event) {
  if (event) event.preventDefault();
  const nameInput = document.getElementById('save-template-name');

  if (!nameInput) {
    toast('Form elements not found', 'error');
    return;
  }

  const name = nameInput.value.trim();
  const description = '';

  if (!name) {
    toast('Template name is required', 'error');
    nameInput.focus();
    return;
  }

  const cachedRouting = getCachedRouting();
  if (!cachedRouting || Object.keys(cachedRouting).length === 0) {
    toast('No routing configuration to save', 'error');
    return;
  }

  const templates = getSavedTemplates();

  // Check if name already exists
  const existingIndex = templates.findIndex(t => t.name === name);
  if (existingIndex >= 0) {
    if (!confirm('A template named "' + name + '" already exists. Overwrite it?')) return;
    templates[existingIndex] = {
      name,
      description,
      routing: { ...cachedRouting },
      created: Date.now()
    };
  } else {
    templates.push({
      name,
      description,
      routing: { ...cachedRouting },
      created: Date.now()
    });
  }

  saveTemplates(templates);
  toast('Template saved: ' + name);

  // Clear form
  nameInput.value = '';
  descInput.value = '';

  // Close modal
  if (window.closeModal) window.closeModal();

  // Re-render template buttons
  renderTemplateButtons();
}

/**
 * Delete a custom template
 * @param {string} name - Template name to delete
 */
export function deleteTemplate(name) {
  if (!confirm('Delete template "' + name + '"?')) return;

  let templates = getSavedTemplates();
  templates = templates.filter(t => t.name !== name);
  saveTemplates(templates);

  toast('Template deleted: ' + name);
  renderTemplateButtons();
}

/**
 * Save current routing as a custom template
 * Quick-save without modal (prompts for name)
 */
export function saveCurrentAsCustom() {
  const name = prompt('Enter template name:');
  if (!name || !name.trim()) return;

  const cachedRouting = getCachedRouting();
  if (!cachedRouting || Object.keys(cachedRouting).length === 0) {
    toast('No routing configuration to save', 'error');
    return;
  }

  const templates = getSavedTemplates();

  // Check if name already exists
  const existingIndex = templates.findIndex(t => t.name === name.trim());
  if (existingIndex >= 0) {
    if (!confirm('A template named "' + name.trim() + '" already exists. Overwrite it?')) return;
    templates[existingIndex] = {
      name: name.trim(),
      description: '',
      routing: { ...cachedRouting },
      created: Date.now()
    };
  } else {
    templates.push({
      name: name.trim(),
      description: '',
      routing: { ...cachedRouting },
      created: Date.now()
    });
  }

  saveTemplates(templates);
  toast('Template saved: ' + name.trim());
  renderTemplateButtons();
}
