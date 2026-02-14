/**
 * T4 LLM Settings Management Module
 * Manages T4 tier LLM provider selection and threshold configuration for intent classification
 */

import { toast, escapeHtml as esc } from '../core/utils.js';

// Module-level state
let imLLMSettings = {};
let t4SelectedProviders = [];   // Array of { id, priority }
let t4AllProviders = [];        // All providers from settings.json

// Update T4 provider status summary
export function updateT4ProviderStatus(selectedCount, enabledCount, totalCount) {
  const statusEl = document.getElementById('t4-provider-status-text');
  if (!statusEl) return;

  if (totalCount === 0) {
    statusEl.innerHTML = 'No providers configured. <a href="#" onclick="switchTab(\'settings\');scrollToProviders();return false" class="text-primary-500 underline font-medium">Add providers in Settings</a>';
    return;
  }

  if (selectedCount === 0) {
    statusEl.innerHTML = `Using <strong class="text-neutral-600">${enabledCount} active providers</strong> from Global Settings <span class="text-xs text-neutral-400">(fallback mode)</span>`;
  } else {
    statusEl.innerHTML = `Using <strong class="text-success-600">${selectedCount} selected providers</strong> <span class="text-xs text-neutral-400">(overriding Global Settings)</span>`;
  }
}

// Scroll to any element by ID
export function scrollToElement(elementId) {
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add highlight effect
      element.style.backgroundColor = '#fef3c7';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 2000);
    }
  }, 100);
}

// Scroll to AI Models section in Settings tab
export function scrollToProviders() {
  setTimeout(() => {
    const providersSection = document.getElementById('providers-list');
    if (providersSection) {
      providersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add highlight effect
      const parent = providersSection.closest('.bg-white');
      if (parent) {
        parent.style.transition = 'box-shadow 0.3s ease';
        parent.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.3)';
        setTimeout(() => {
          parent.style.boxShadow = '';
        }, 2000);
      }
    }
  }, 100);
}

export async function loadLLMSettings() {
  try {
    const [settingsRes, providersRes] = await Promise.all([
      fetch('/api/rainbow/intent-manager/llm-settings'),
      fetch('/api/rainbow/intent-manager/llm-settings/available-providers')
    ]);
    imLLMSettings = settingsRes.ok ? await settingsRes.json() : { thresholds: {}, selectedProviders: [], defaultProviderId: '' };
    if (!settingsRes.ok) {
      toast('Could not load LLM settings', 'error');
    }
    const providersBody = await providersRes.json();
    t4AllProviders = Array.isArray(providersBody) ? providersBody : [];
    if (!providersRes.ok || !Array.isArray(providersBody)) {
      if (!providersRes.ok) toast('Could not load model list', 'error');
      t4AllProviders = [];
    }
    t4SelectedProviders = Array.isArray(imLLMSettings.selectedProviders) ? [...imLLMSettings.selectedProviders] : [];

    // Populate default model dropdown (single choice, like Settings)
    const defaultSelect = document.getElementById('t4-default-provider');
    if (defaultSelect) {
      defaultSelect.innerHTML = '<option value="">Use master (Settings → AI Models)</option>' +
        (t4AllProviders.map(p => `<option value="${esc(p.id)}">${esc(p.name)}${p.enabled ? '' : ' (disabled)'}</option>`).join('') || '');
      defaultSelect.value = imLLMSettings.defaultProviderId || '';
    }

    // Populate form fields
    document.getElementById('llm-threshold-fuzzy').value = imLLMSettings.thresholds?.fuzzy || 0.80;
    document.getElementById('llm-threshold-semantic').value = imLLMSettings.thresholds?.semantic || 0.70;
    document.getElementById('llm-threshold-layer2').value = imLLMSettings.thresholds?.layer2 || 0.80;
    document.getElementById('llm-threshold-llm').value = imLLMSettings.thresholds?.llm || 0.60;
    document.getElementById('llm-threshold-low-confidence').value = imLLMSettings.thresholds?.lowConfidence || 0.50;
    document.getElementById('llm-threshold-medium-confidence').value = imLLMSettings.thresholds?.mediumConfidence || 0.70;
    document.getElementById('llm-max-tokens').value = imLLMSettings.maxTokens || 500;
    document.getElementById('llm-temperature').value = imLLMSettings.temperature || 0.3;
    document.getElementById('llm-system-prompt').value = imLLMSettings.systemPrompt || '';
    document.getElementById('llm-fallback-unknown').checked = imLLMSettings.fallbackUnknown !== false;
    document.getElementById('llm-log-failures').checked = imLLMSettings.logFailures !== false;
    document.getElementById('llm-enable-context').checked = imLLMSettings.enableContext !== false;

    renderT4ProvidersList();
  } catch (err) {
    console.error('Failed to load LLM settings:', err);
  }
}

export function renderT4ProvidersList() {
  const el = document.getElementById('t4-providers-list');
  if (!el) return;

  if (t4AllProviders.length === 0) {
    el.innerHTML = '<p class="text-sm text-neutral-400 italic">No providers configured in Settings. <a href="#" onclick="switchTab(\'settings\');scrollToProviders();return false" class="text-primary-500 underline">Add providers</a> first.</p>';
    updateT4ProviderStatus(0, 0, 0);
    return;
  }

  const selectedIds = new Set(t4SelectedProviders.map(s => s.id));
  const selected = t4SelectedProviders
    .sort((a, b) => a.priority - b.priority)
    .map(s => t4AllProviders.find(p => p.id === s.id))
    .filter(Boolean);
  const available = t4AllProviders.filter(p => !selectedIds.has(p.id));

  // Update status summary
  const enabledCount = t4AllProviders.filter(p => p.enabled).length;
  const selectedCount = selected.length;
  updateT4ProviderStatus(selectedCount, enabledCount, t4AllProviders.length);

  // Separate active and inactive available providers
  const availableActive = available.filter(p => p.enabled);
  const availableInactive = available.filter(p => !p.enabled);

  const typeBadge = (type) => ({
    'openai-compatible': 'bg-blue-100 text-blue-700',
    'groq': 'bg-purple-100 text-purple-700',
    'ollama': 'bg-green-100 text-green-700'
  }[type] || 'bg-neutral-100 text-neutral-600');

  let html = '';

  // Selected providers with rank badges
  if (selected.length > 0) {
    html += '<div class="mb-2"><span class="text-xs font-medium text-neutral-500">Selected (fallback order)</span></div>';
    selected.forEach((p, i) => {
      html += `
        <div class="flex items-center gap-2 p-2.5 border rounded-xl bg-primary-50 border-primary-200">
          <div class="flex flex-col gap-0.5">
            <button onclick="moveT4Provider('${esc(p.id)}', -1)" class="text-neutral-400 hover:text-neutral-700 text-xs leading-none" ${i === 0 ? 'disabled style="opacity:0.3;cursor:default"' : ''}>&#9650;</button>
            <button onclick="moveT4Provider('${esc(p.id)}', 1)" class="text-neutral-400 hover:text-neutral-700 text-xs leading-none" ${i === selected.length - 1 ? 'disabled style="opacity:0.3;cursor:default"' : ''}>&#9660;</button>
          </div>
          <span class="text-xs font-bold text-primary-600 bg-primary-100 rounded-full w-6 h-6 flex items-center justify-center shrink-0">#${i + 1}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-medium text-sm text-neutral-800">${esc(p.name)}</span>
              <span class="text-xs px-1.5 py-0.5 rounded ${typeBadge(p.type)}">${esc(p.type)}</span>
              ${!p.enabled ? '<span class="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">disabled</span>' : ''}
            </div>
            <div class="text-xs text-neutral-500 mt-0.5 truncate">${esc(p.model)}</div>
          </div>
          <button onclick="testT4Provider('${esc(p.id)}')" id="t4-test-${css(p.id)}" class="text-xs px-2 py-1 rounded border hover:bg-white transition shrink-0">Test</button>
          <button onclick="toggleT4Provider('${esc(p.id)}')" class="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 transition shrink-0">Remove</button>
        </div>`;
    });
  }

  // Active available providers
  if (availableActive.length > 0) {
    html += '<div class="mt-3 mb-2"><span class="text-xs font-medium text-neutral-500">Available</span></div>';
    availableActive.forEach(p => {
      html += `
        <div class="flex items-center gap-2 p-2.5 border rounded-xl bg-white">
          <div class="w-6"></div>
          <div class="w-6"></div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-medium text-sm text-neutral-600">${esc(p.name)}</span>
              <span class="text-xs px-1.5 py-0.5 rounded ${typeBadge(p.type)}">${esc(p.type)}</span>
            </div>
            <div class="text-xs text-neutral-500 mt-0.5 truncate">${esc(p.model)}</div>
          </div>
          <button onclick="toggleT4Provider('${esc(p.id)}')" class="text-xs px-2 py-1 rounded border border-primary-200 text-primary-600 hover:bg-primary-50 transition shrink-0">+ Add</button>
        </div>`;
    });
  }

  // Inactive available providers (collapsible)
  if (availableInactive.length > 0) {
    html += `
      <div class="mt-3">
        <button onclick="toggleT4InactiveProviders()" class="w-full text-left flex items-center justify-between p-2 hover:bg-neutral-50 rounded-lg transition">
          <span class="text-xs font-medium text-neutral-500">
            Inactive Providers (${availableInactive.length})
          </span>
          <svg id="t4-inactive-chevron" class="w-4 h-4 text-neutral-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div id="t4-inactive-providers" class="hidden space-y-2 mt-2">`;

    availableInactive.forEach(p => {
      html += `
        <div class="flex items-center gap-2 p-2.5 border rounded-xl bg-white opacity-50">
          <div class="w-6"></div>
          <div class="w-6"></div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-medium text-sm text-neutral-600">${esc(p.name)}</span>
              <span class="text-xs px-1.5 py-0.5 rounded ${typeBadge(p.type)}">${esc(p.type)}</span>
              <span class="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">disabled in Settings</span>
            </div>
            <div class="text-xs text-neutral-500 mt-0.5 truncate">${esc(p.model)}</div>
          </div>
          <button onclick="toggleT4Provider('${esc(p.id)}')" class="text-xs px-2 py-1 rounded border border-neutral-200 text-neutral-400 cursor-not-allowed transition shrink-0" disabled title="Enable in Settings first">+ Add</button>
        </div>`;
    });

    html += `
        </div>
      </div>`;
  }

  el.innerHTML = html;
}

// Toggle inactive providers visibility
export function toggleT4InactiveProviders() {
  const container = document.getElementById('t4-inactive-providers');
  const chevron = document.getElementById('t4-inactive-chevron');
  if (!container || !chevron) return;

  if (container.classList.contains('hidden')) {
    container.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
  } else {
    container.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
}

export function toggleT4Provider(id) {
  const idx = t4SelectedProviders.findIndex(s => s.id === id);
  if (idx >= 0) {
    t4SelectedProviders.splice(idx, 1);
  } else {
    t4SelectedProviders.push({ id, priority: t4SelectedProviders.length });
  }
  // Re-normalize priorities
  t4SelectedProviders.forEach((s, i) => { s.priority = i; });
  renderT4ProvidersList();
  // Auto-save changes
  autoSaveT4Providers();
}

export function moveT4Provider(id, direction) {
  const sorted = t4SelectedProviders.sort((a, b) => a.priority - b.priority);
  const idx = sorted.findIndex(s => s.id === id);
  if (idx < 0) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= sorted.length) return;
  // Swap priorities
  const tmp = sorted[idx].priority;
  sorted[idx].priority = sorted[newIdx].priority;
  sorted[newIdx].priority = tmp;
  renderT4ProvidersList();
  // Auto-save changes
  autoSaveT4Providers();
}

// Auto-save T4 provider selection (debounced)
let autoSaveT4Timer = null;
export async function autoSaveT4Providers() {
  // Clear existing timer
  if (autoSaveT4Timer) clearTimeout(autoSaveT4Timer);

  // Debounce for 500ms to avoid excessive API calls
  autoSaveT4Timer = setTimeout(async () => {
    try {
      const defaultEl = document.getElementById('t4-default-provider');
      const settings = {
        thresholds: {
          fuzzy: parseFloat(document.getElementById('llm-threshold-fuzzy').value),
          semantic: parseFloat(document.getElementById('llm-threshold-semantic').value),
          layer2: parseFloat(document.getElementById('llm-threshold-layer2').value),
          llm: parseFloat(document.getElementById('llm-threshold-llm').value)
        },
        defaultProviderId: (defaultEl && defaultEl.value) ? defaultEl.value : '',
        selectedProviders: t4SelectedProviders.sort((a, b) => a.priority - b.priority),
        maxTokens: parseInt(document.getElementById('llm-max-tokens').value),
        temperature: parseFloat(document.getElementById('llm-temperature').value),
        systemPrompt: document.getElementById('llm-system-prompt').value,
        fallbackUnknown: document.getElementById('llm-fallback-unknown').checked,
        logFailures: document.getElementById('llm-log-failures').checked,
        enableContext: document.getElementById('llm-enable-context').checked
      };

      const res = await fetch('/api/rainbow/intent-manager/llm-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!res.ok) throw new Error('Failed to save settings');

      // Show subtle feedback
      const statusEl = document.getElementById('t4-provider-status');
      if (statusEl) {
        statusEl.style.transition = 'background-color 0.3s ease';
        statusEl.style.backgroundColor = 'rgb(220, 252, 231)'; // green-100
        setTimeout(() => {
          statusEl.style.backgroundColor = '';
        }, 1000);
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
      toast('Failed to save provider selection', 'error');
    }
  }, 500);
}

export async function testT4Provider(id) {
  const btn = document.getElementById('t4-test-' + css(id));
  if (btn) { btn.textContent = '...'; btn.disabled = true; btn.style.color = ''; btn.style.borderColor = ''; }
  try {
    const r = await api(`/test-ai/${id}`, { method: 'POST' });
    if (r.ok) {
      toast(`${id}: OK (${r.responseTime}ms)`);
      if (btn) { btn.textContent = r.responseTime + 'ms'; btn.style.color = '#16a34a'; btn.style.borderColor = '#16a34a'; }
    } else {
      toast(`${id}: ${r.error}`, 'error');
      if (btn) { btn.textContent = 'Fail'; btn.style.color = '#dc2626'; btn.style.borderColor = '#dc2626'; }
    }
  } catch (e) {
    toast(e.message, 'error');
    if (btn) { btn.textContent = 'Err'; btn.style.color = '#dc2626'; btn.style.borderColor = '#dc2626'; }
  }
  if (btn) btn.disabled = false;
}

export async function saveLLMSettings() {
  const defaultEl = document.getElementById('t4-default-provider');
  const settings = {
    thresholds: {
      fuzzy: parseFloat(document.getElementById('llm-threshold-fuzzy').value),
      semantic: parseFloat(document.getElementById('llm-threshold-semantic').value),
      layer2: parseFloat(document.getElementById('llm-threshold-layer2').value),
      llm: parseFloat(document.getElementById('llm-threshold-llm').value),
      lowConfidence: parseFloat(document.getElementById('llm-threshold-low-confidence').value),
      mediumConfidence: parseFloat(document.getElementById('llm-threshold-medium-confidence').value)
    },
    defaultProviderId: (defaultEl && defaultEl.value) ? defaultEl.value : '',
    selectedProviders: t4SelectedProviders.sort((a, b) => a.priority - b.priority),
    maxTokens: parseInt(document.getElementById('llm-max-tokens').value),
    temperature: parseFloat(document.getElementById('llm-temperature').value),
    systemPrompt: document.getElementById('llm-system-prompt').value,
    fallbackUnknown: document.getElementById('llm-fallback-unknown').checked,
    logFailures: document.getElementById('llm-log-failures').checked,
    enableContext: document.getElementById('llm-enable-context').checked
  };

  // Preserve contextWindows from server (managed by Settings tab)
  try {
    const current = await fetch('/api/rainbow/intent-manager/llm-settings').then(r => r.json());
    if (current && current.contextWindows) settings.contextWindows = current.contextWindows;
  } catch (_) { /* contextWindows will use defaults if missing */ }

  try {
    const res = await fetch('/api/rainbow/intent-manager/llm-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    if (!res.ok) throw new Error('Failed to save');

    toast('LLM settings saved!', 'success');
  } catch (err) {
    console.error('Failed to save LLM settings:', err);
    toast('Failed to save LLM settings', 'error');
  }
}
