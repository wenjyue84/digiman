import { api } from '../api.js';
import { toast } from '../toast.js';
import { escapeHtml as esc } from '../core/utils.js';
import { renderContextWindowsCard } from './context-windows-ui.js';

/**
 * Global state for settings
 */
let settingsData = null;
let adminNotifsData = null;

/**
 * Test session state for batching latency test errors
 */
let testSession = {
  active: false,
  total: 0,
  completed: 0,
  errors: []
};

/**
 * Load settings panel
 */
/**
 * Load settings panel
 * @param {string|null} subTab - Optional sub-tab ID
 */
export async function loadSettings(subTab) {
  try {
    settingsData = await api('/settings');
    adminNotifsData = await api('/admin-notifications');

    // Store operators in global variable for easy access
    window.currentOperators = adminNotifsData.operators || [];

    // Prioritize passed subTab, then stored state, then default
    const activeTab = subTab || window.activeSettingsTab || 'ai-models';

    // Update hash only if we are applying a default (and not already on a sub-route)
    // If subTab is provided, the URL is already correct (#settings/subTab)
    const shouldUpdateHash = !subTab;

    switchSettingsTab(activeTab, shouldUpdateHash);
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.loadSettings = loadSettings;

/**
 * Switch settings sub-tab
 * @param {string} tabId - 'ai-models', 'notifications', or 'operators'
 * @param {boolean} updateHash - Whether to update the URL hash
 */
export function switchSettingsTab(tabId, updateHash = true) {
  window.activeSettingsTab = tabId;

  // Update URL hash if requested
  if (updateHash) {
    // This will trigger hashchange -> loadTab -> loadSettings
    // But loadTab checks if hash matches effective tab. 
    // Here we are setting a sub-route.
    const newHash = `settings/${tabId}`;
    if (window.location.hash.slice(1) !== newHash) {
      window.location.hash = newHash;
      return; // Let route handler take over
    }
  }

  // Update button styles
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    const isMatched = btn.dataset.settingsTab === tabId;
    btn.classList.toggle('text-primary-600', isMatched);
    btn.classList.toggle('border-primary-500', isMatched);
    btn.classList.toggle('text-neutral-500', !isMatched);
    btn.classList.toggle('border-transparent', !isMatched);
  });

  // Render tab content
  const container = document.getElementById('settings-tab-content');
  if (!container) return;

  // 3. Render (Ensure data is loaded)
  if (!settingsData || !adminNotifsData) return;

  // Clear previous content before rendering new
  container.innerHTML = '';

  if (tabId === 'ai-models') renderAiModelsTab(container);
  else if (tabId === 'notifications') renderNotificationsTab(container);
  else if (tabId === 'operators') renderOperatorsTab(container);
}
window.switchSettingsTab = switchSettingsTab;

function renderAiModelsTab(container) {
  const providers = (settingsData.ai?.providers || []).sort((a, b) => a.priority - b.priority);

  // Model descriptions mapping
  const descriptions = {
    'groq-llama': 'Ultra-fast, open-source model optimized for speed. Best for quick chat interactions.',
    'openai-gpt4o': 'High intelligence, reasoning, and instruction following. Best for complex queries.',
    'deepseek-r1': 'Powerful open-weights model with strong reasoning capabilities.',
    'google-gemini': 'Google\'s multimodal model with large context window.',
    'anthropic-claude': 'Excel at nuanced conversation and coding tasks.'
  };

  container.innerHTML = `
    <div class="bg-white border rounded-2xl p-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="font-semibold text-lg">AI Models</h3>
          <p class="text-sm text-neutral-500 font-medium">Rainbow uses these models to generate responses when no pre-written reply is found. Enable multiple to create a robust fallback chain.</p>
        </div>
      </div>
      
      <div id="ai-providers-list" class="space-y-3">
        ${providers.map((p, index) => {
    const isDefault = p.priority === 0;
    return `
          <div 
            class="provider-card border rounded-2xl p-4 hover:border-primary-200 transition-colors bg-neutral-50/50 cursor-move relative group"
            draggable="true"
            data-provider-id="${esc(p.id)}"
            ondragstart="handleProviderDragStart(event)"
            ondragover="handleProviderDragOver(event)"
            ondrop="handleProviderDrop(event)"
            ondragend="handleProviderDragEnd(event)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-4 flex-1">
                <div class="w-12 h-12 rounded-2xl bg-white border shadow-soft flex items-center justify-center font-bold text-lg text-primary-500 flex-shrink-0 mt-1">
                  ${p.name.charAt(0)}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-neutral-800">${esc(p.name)}</span>
                    <span class="text-[10px] font-mono bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded uppercase tracking-wider">${esc(p.id)}</span>
                    ${isDefault ? `
                      <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border border-amber-200 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.227-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        Default
                      </span>
                    ` : ''}
                  </div>
                  <p class="text-xs text-neutral-500 mt-1 leading-relaxed max-w-lg">
                    ${descriptions[p.id] || p.description || 'General purpose AI model.'}
                  </p>
                  <div class="flex items-center gap-3 mt-2 flex-wrap">
                    <span class="text-xs ${p.available ? 'text-success-600' : 'text-danger-500'} font-medium bg-white px-2 py-0.5 rounded border border-neutral-100 shadow-sm inline-flex items-center gap-1">
                      ${p.available ? '✓ Ready' : '✗ Missing Key'}
                    </span>
                    ${!p.available ? `
                    <button type="button" onclick="troubleshootProvider('${esc(p.id)}', this)" class="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-2 py-0.5 rounded transition inline-flex items-center gap-1 font-medium">
                      Troubleshoot
                    </button>
                    ` : ''}
                    <span id="latency-${p.id}" class="text-xs text-neutral-400 font-mono hidden"></span>
                    
                    <span class="text-[10px] text-neutral-400 font-medium bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                      Priority ${p.priority + 1}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="flex flex-col items-end gap-3 flex-shrink-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-medium ${p.enabled ? 'text-primary-600' : 'text-neutral-400'}">${p.enabled ? 'Active' : 'Off'}</span>
                  <input type="checkbox" class="w-10 h-6 rounded-full border-neutral-300 text-primary-600 focus:ring-primary-500 transition cursor-pointer appearance-none bg-neutral-200 checked:bg-primary-500 relative after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all checked:after:translate-x-4" ${p.enabled ? 'checked' : ''} onchange="toggleProvider('${esc(p.id)}', this.checked)">
                </div>
                <div class="flex gap-2">
                  ${!isDefault ? `
                    <button onclick="setAsDefaultProvider('${esc(p.id)}')" class="text-[10px] bg-white hover:bg-amber-50 border border-neutral-200 hover:border-amber-200 text-neutral-600 hover:text-amber-700 px-2 py-1 rounded transition flex items-center gap-1 font-medium">
                      Set as Default
                    </button>
                  ` : ''}
                  ${p.available ? `
                    <button onclick="testModelLatency('${esc(p.id)}')" class="text-[10px] bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 px-2 py-1 rounded transition flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      Test Speed
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
            
            <!-- Drag Handle indicator (visible on hover) -->
            <div class="absolute left-[-8px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-300 flex flex-col gap-0.5">
              <div class="flex gap-0.5"><span>●</span><span>●</span></div>
              <div class="flex gap-0.5"><span>●</span><span>●</span></div>
              <div class="flex gap-0.5"><span>●</span><span>●</span></div>
            </div>
          </div>
        `;
  }).join('')}
      </div>
      
      <div class="mt-8 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex gap-3">
        <span class="text-blue-500 text-xl">💡</span>
        <div class="text-xs text-blue-700 leading-relaxed">
          <p><strong>Note:</strong> Drag and drop models to change their <strong>fallback priority</strong>. The top-most model is used first.</p>
          <p class="mt-1">The <strong>Default</strong> model is the primary choice, while others act as secondary and tertiary fallbacks if the primary is slow or offline.</p>
        </div>
      </div>
    </div>
  `;

  // Append Context Windows card (loads current values from API)
  api('/intent-manager/llm-settings').then(llm => {
    container.insertAdjacentHTML('beforeend', renderContextWindowsCard(llm.contextWindows));
  }).catch(() => {
    container.insertAdjacentHTML('beforeend', renderContextWindowsCard(null));
  });

  // Stagger auto speed tests (one every 600ms) so providers aren't hit concurrently.
  const available = providers.filter(p => p.available);
  testSession = { active: true, total: available.length, completed: 0, errors: [] };
  available.forEach((p, i) => {
    setTimeout(() => testModelLatency(p.id, true), i * 600);
  });
}

/**
 * Troubleshoot a provider showing "Missing Key" — runs diagnostic and can fix (e.g. Ollama needs no key).
 * @param {string} providerId
 * @param {HTMLElement} btn - Button element to show loading state
 */
export async function troubleshootProvider(providerId, btn) {
  const origText = btn?.textContent || 'Troubleshoot';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '…';
  }
  try {
    const r = await api('/troubleshoot-provider', {
      method: 'POST',
      body: { providerId }
    });
    const msg = r.hint ? `${r.message} ${r.hint}` : r.message;
    if (r.ok) {
      toast(msg, 'success');
      // Reload settings and re-render so Ollama shows "Ready" without full page refresh
      settingsData = await api('/settings');
      const container = document.getElementById('settings-tab-content');
      if (container && window.activeSettingsTab === 'ai-models') {
        renderAiModelsTab(container);
      }
    } else {
      toast(msg, 'error');
    }
  } catch (e) {
    toast(e.message || 'Troubleshoot failed', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }
}
window.troubleshootProvider = troubleshootProvider;

/**
 * Drag and Drop Handlers for AI Providers
 */
let draggedProviderId = null;

export function handleProviderDragStart(e) {
  draggedProviderId = e.currentTarget.dataset.providerId;
  e.currentTarget.classList.add('opacity-40', 'border-primary-500', 'border-dashed');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedProviderId);
}
window.handleProviderDragStart = handleProviderDragStart;

export function handleProviderDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.currentTarget;
  if (target.dataset.providerId !== draggedProviderId) {
    target.classList.add('border-primary-300', 'bg-primary-50/30');
  }
}
window.handleProviderDragOver = handleProviderDragOver;

export function handleProviderDragEnd(e) {
  e.currentTarget.classList.remove('opacity-40', 'border-primary-500', 'border-dashed');
  document.querySelectorAll('.provider-card').forEach(c => {
    c.classList.remove('border-primary-300', 'bg-primary-50/30');
  });
}
window.handleProviderDragEnd = handleProviderDragEnd;

export async function handleProviderDrop(e) {
  e.preventDefault();
  const targetId = e.currentTarget.dataset.providerId;
  if (targetId === draggedProviderId) return;

  const providers = settingsData.ai.providers || [];
  const draggedIdx = providers.findIndex(p => p.id === draggedProviderId);
  const targetIdx = providers.findIndex(p => p.id === targetId);

  if (draggedIdx === -1 || targetIdx === -1) return;

  // Reorder in array
  const [draggedItem] = providers.splice(draggedIdx, 1);
  providers.splice(targetIdx, 0, draggedItem);

  // Update priorities based on new order
  providers.forEach((p, i) => { p.priority = i; });

  // Optimistic UI update
  renderAiModelsTab(document.getElementById('settings-tab-content'));

  // Save to server
  try {
    await api('/settings/providers', {
      method: 'PUT',
      body: providers
    });
    toast('Fallback priority updated');
  } catch (err) {
    toast(err.message, 'error');
    // Reload if failed
    settingsData = await api('/settings');
    renderAiModelsTab(document.getElementById('settings-tab-content'));
  }
}
window.handleProviderDrop = handleProviderDrop;

export async function setAsDefaultProvider(id) {
  const providers = settingsData.ai.providers || [];
  const idx = providers.findIndex(p => p.id === id);
  if (idx === -1) return;

  // Move to front
  const [item] = providers.splice(idx, 1);
  providers.unshift(item);

  // Update priorities
  providers.forEach((p, i) => { p.priority = i; });

  // Re-render
  renderAiModelsTab(document.getElementById('settings-tab-content'));

  // Save
  try {
    await api('/settings/providers', {
      method: 'PUT',
      body: providers
    });
    toast(`Model "${item.name}" set as default`);
  } catch (err) {
    toast(err.message, 'error');
    settingsData = await api('/settings');
    renderAiModelsTab(document.getElementById('settings-tab-content'));
  }
}
window.setAsDefaultProvider = setAsDefaultProvider;

/**
 * Test latency for a specific model
 */
export async function testModelLatency(providerId, isAutoTest = false) {
  const latencyBadge = document.getElementById(`latency-${providerId}`);
  if (!latencyBadge) return;

  latencyBadge.classList.remove('hidden', 'text-success-600', 'text-warning-600', 'text-danger-500');
  latencyBadge.classList.add('text-neutral-400', 'animate-pulse');
  latencyBadge.textContent = 'Testing...';

  const startTime = performance.now();
  try {
    // Send a minimal ping to the model
    await api('/test/llm-latency', {
      method: 'POST',
      body: { providerId }
    });

    const duration = Math.round(performance.now() - startTime);
    latencyBadge.classList.remove('animate-pulse', 'text-neutral-400');

    // Color code based on speed
    if (duration < 800) latencyBadge.classList.add('text-success-600');
    else if (duration < 2000) latencyBadge.classList.add('text-warning-600');
    else latencyBadge.classList.add('text-danger-500');

    latencyBadge.textContent = `${duration}ms`;
  } catch (e) {
    latencyBadge.classList.remove('animate-pulse', 'text-neutral-400');
    latencyBadge.classList.add('text-danger-500');
    latencyBadge.textContent = 'Error';

    if (isAutoTest) {
      testSession.errors.push({ id: providerId, error: e.message });
    } else {
      toast(`Test failed: ${e.message}`, 'error');
    }
  } finally {
    if (isAutoTest) {
      testSession.completed++;
      if (testSession.completed === testSession.total && testSession.errors.length > 0) {
        showTestSummaryToast();
        testSession.active = false; // Reset session
      }
    }
  }
}
window.testModelLatency = testModelLatency;

function showTestSummaryToast() {
  const count = testSession.errors.length;
  const msg = `<div class="flex items-center gap-2">
    <span>⚠️ ${count} model${count > 1 ? 's' : ''} failed speed test.</span>
    <button onclick="viewDiagnosticDetails()" class="underline font-bold hover:text-white transition">View Details</button>
  </div>`;
  toast(msg, 'error', true);
}
window.showTestSummaryToast = showTestSummaryToast;

export function viewDiagnosticDetails() {
  const container = document.getElementById('diagnostic-content');
  const providers = settingsData.ai?.providers || [];

  container.innerHTML = testSession.errors.map(err => {
    const p = providers.find(x => x.id === err.id);
    return `
      <div class="p-3 bg-danger-50 border border-danger-100 rounded-xl">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-bold text-danger-700">${p ? esc(p.name) : err.id}</span>
          <span class="text-[10px] font-mono bg-danger-100 text-danger-700 px-1.5 py-0.5 rounded uppercase">${esc(err.id)}</span>
        </div>
        <p class="text-xs text-danger-600 leading-relaxed">${esc(err.error)}</p>
      </div>
    `;
  }).join('');

  window.openModal('diagnostic-modal');
}
window.viewDiagnosticDetails = viewDiagnosticDetails;

function renderNotificationsTab(container) {
  container.innerHTML = `
    <div class="bg-white border rounded-2xl p-6">
      <h3 class="font-semibold text-lg mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        System Admin Notifications
      </h3>
      <p class="text-sm text-neutral-600 mb-6">Receive critical technical alerts directly on WhatsApp. Keep your system running smoothly with real-time status updates.</p>

      <div class="space-y-8">
        <div class="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
          <label class="block text-sm font-bold text-neutral-800 mb-3">
            System Admin Phone Number
          </label>
          <div class="flex gap-2">
            <input
              type="tel"
              id="system-admin-phone-input"
              value="${esc(adminNotifsData.systemAdminPhone || '')}"
              placeholder="60127088789"
              class="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white shadow-soft"
            />
            <button
              onclick="updateSystemAdminPhone()"
              class="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-medium font-bold"
            >
              Save
            </button>
          </div>
          <p class="text-[11px] text-neutral-500 mt-2.5 flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Enter with country code, no "+" or spaces. e.g. 60123456789
          </p>
        </div>

        <div class="space-y-4">
          <label class="block text-sm font-bold text-neutral-800 mb-2">
            Notification Subscriptions
          </label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label class="flex items-center gap-4 p-4 rounded-2xl border bg-white hover:border-blue-200 transition cursor-pointer shadow-soft">
              <input
                type="checkbox"
                id="notify-enabled"
                ${adminNotifsData.enabled ? 'checked' : ''}
                onchange="updateAdminNotifPrefs()"
                class="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span class="block text-sm font-bold text-neutral-800">Global Enable</span>
                <span class="block text-xs text-neutral-500">Master toggle for all alerts</span>
              </div>
            </label>
            
            <label class="flex items-center gap-4 p-4 rounded-2xl border bg-white hover:border-blue-200 transition cursor-pointer shadow-soft">
              <input
                type="checkbox"
                id="notify-disconnect"
                ${adminNotifsData.notifyOnDisconnect ? 'checked' : ''}
                onchange="updateAdminNotifPrefs()"
                class="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span class="block text-sm font-bold text-neutral-800">Connection Drops</span>
                <span class="block text-xs text-neutral-500">Alert when instance goes offline</span>
              </div>
            </label>

            <label class="flex items-center gap-4 p-4 rounded-2xl border bg-white hover:border-blue-200 transition cursor-pointer shadow-soft">
              <input
                type="checkbox"
                id="notify-unlink"
                ${adminNotifsData.notifyOnUnlink ? 'checked' : ''}
                onchange="updateAdminNotifPrefs()"
                class="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span class="block text-sm font-bold text-neutral-800">Unlink Events</span>
                <span class="block text-xs text-neutral-500">Alert if WhatsApp is logged out</span>
              </div>
            </label>

            <label class="flex items-center gap-4 p-4 rounded-2xl border bg-white hover:border-blue-200 transition cursor-pointer shadow-soft">
              <input
                type="checkbox"
                id="notify-reconnect"
                ${adminNotifsData.notifyOnReconnect ? 'checked' : ''}
                onchange="updateAdminNotifPrefs()"
                class="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span class="block text-sm font-bold text-neutral-800">Health Checks</span>
                <span class="block text-xs text-neutral-500">Alert on successful reconnections</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderOperatorsTab(container) {
  container.innerHTML = `
    <div class="bg-white border rounded-2xl p-6">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h3 class="font-semibold text-lg flex items-center gap-2">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Capsule Operators
          </h3>
          <p class="text-sm text-neutral-500 mt-1 font-medium">Manage human operators who handle escalations and live requests.</p>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-2 px-4 py-2 bg-neutral-100 rounded-t-xl text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
        <div class="col-span-1">Pos</div>
        <div class="col-span-4">Label / Name</div>
        <div class="col-span-4">WhatsApp Phone</div>
        <div class="col-span-2">Fallback (min)</div>
        <div class="col-span-1 text-right">Action</div>
      </div>
      <div id="operators-list" class="space-y-px border-x border-b rounded-b-xl overflow-hidden mb-8">
        <!-- Will be populated by renderOperatorsList() -->
      </div>

      <button
        onclick="addOperator()"
        class="w-full px-4 py-4 border-2 border-dashed border-neutral-200 text-neutral-500 rounded-2xl hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition flex items-center justify-center gap-3 font-bold"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add New Operator
      </button>
      
      <div class="mt-8 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 flex gap-4">
        <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-600">
           <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <p class="text-xs text-green-800 leading-relaxed font-medium">
          <strong>How it works:</strong> If a guest triggers an escalation or "human" intent, Rainbow notifies the first operator. If they don't respond within the set <strong>Fallback Minutes</strong>, the notification moves to the next operator.
        </p>
      </div>
    </div>
  `;
  renderOperatorsList();
}

/**
 * Toggle AI provider
 */
export async function toggleProvider(id, enabled) {
  try {
    await api('/settings/providers/' + id, { method: 'PATCH', body: { enabled } });
    toast(`Model ${id}: ${enabled ? 'enabled' : 'disabled'}`);
    // Update local state and re-render tab if needed, but since checkbox is already updated by user click, 
    // we just need to ensure settingsData is fresh for next render
    settingsData = await api('/settings');
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.toggleProvider = toggleProvider;

/**
 * Update system admin phone number
 */
export async function updateSystemAdminPhone() {
  try {
    const input = document.getElementById('system-admin-phone-input');
    const phone = input.value.trim();
    if (!phone) {
      toast('Please enter a phone number', 'error');
      return;
    }
    await api('/admin-notifications/system-admin-phone', { method: 'PUT', body: { phone } });
    toast('System admin phone updated successfully');
    adminNotifsData.systemAdminPhone = phone;
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.updateSystemAdminPhone = updateSystemAdminPhone;

/**
 * Render the operators list
 */
export function renderOperatorsList() {
  const container = document.getElementById('operators-list');
  if (!container || !window.currentOperators) return;

  if (window.currentOperators.length === 0) {
    container.innerHTML = `
      <div class="text-center text-neutral-400 py-12 text-sm bg-white">
        No operators configured. Click "Add New Operator" to get started.
      </div>
    `;
    return;
  }

  container.innerHTML = window.currentOperators.map((op, index) => `
    <div class="bg-white p-4 flex items-center gap-2 group hover:bg-neutral-50 transition-colors">
      <div class="w-1/12">
        <span class="text-xs font-bold text-neutral-400">#${index + 1}</span>
      </div>
      <div class="w-4/12">
        <input
          type="text"
          value="${esc(op.label)}"
          placeholder="e.g. Reception A"
          onchange="updateOperatorField(${index}, 'label', this.value)"
          class="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
        />
      </div>
      <div class="w-4/12">
        <input
          type="tel"
          value="${esc(op.phone)}"
          placeholder="60127088789"
          onchange="updateOperatorField(${index}, 'phone', this.value)"
          class="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-mono"
        />
      </div>
      <div class="w-2/12 flex items-center gap-2">
        <input
          type="number"
          value="${op.fallbackMinutes}"
          min="1"
          onchange="updateOperatorField(${index}, 'fallbackMinutes', parseInt(this.value))"
          class="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-center"
        />
      </div>
      <div class="w-1/12 text-right">
        <button
          onclick="removeOperator(${index})"
          class="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          title="Remove operator"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}
window.renderOperatorsList = renderOperatorsList;

/**
 * Add a new operator
 */
export function addOperator() {
  if (!window.currentOperators) window.currentOperators = [];

  const newOperator = {
    phone: '',
    label: `Operator ${window.currentOperators.length + 1}`,
    fallbackMinutes: 5
  };

  window.currentOperators.push(newOperator);
  renderOperatorsList();
  saveOperators();
}
window.addOperator = addOperator;

/**
 * Remove an operator
 */
export function removeOperator(index) {
  if (!window.currentOperators) return;

  if (window.currentOperators.length === 1) {
    toast('You must have at least one operator', 'error');
    return;
  }

  if (confirm(`Remove ${window.currentOperators[index].label}?`)) {
    window.currentOperators.splice(index, 1);
    renderOperatorsList();
    saveOperators();
  }
}
window.removeOperator = removeOperator;

/**
 * Update a field in an operator
 */
export function updateOperatorField(index, field, value) {
  if (!window.currentOperators || !window.currentOperators[index]) return;

  window.currentOperators[index][field] = value;
  saveOperators();
}
window.updateOperatorField = updateOperatorField;

/**
 * Save operators to server
 */
export async function saveOperators() {
  try {
    await api('/admin-notifications/operators', {
      method: 'PUT',
      body: { operators: window.currentOperators }
    });
    toast('Operators saved');
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.saveOperators = saveOperators;

/**
 * Update admin notification preferences
 */
export async function updateAdminNotifPrefs() {
  try {
    const enabled = document.getElementById('notify-enabled').checked;
    const notifyDisconnect = document.getElementById('notify-disconnect').checked;
    const notifyUnlink = document.getElementById('notify-unlink').checked;
    const notifyReconnect = document.getElementById('notify-reconnect').checked;

    await api('/admin-notifications/preferences', {
      method: 'PUT',
      body: { enabled, notifyDisconnect, notifyUnlink, notifyReconnect }
    });
    toast('Notification preferences updated');
    adminNotifsData.enabled = enabled;
    adminNotifsData.notifyOnDisconnect = notifyDisconnect;
    adminNotifsData.notifyOnUnlink = notifyUnlink;
    adminNotifsData.notifyOnReconnect = notifyReconnect;
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.updateAdminNotifPrefs = updateAdminNotifPrefs;
