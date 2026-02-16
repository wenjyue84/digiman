/**
 * settings.js — Settings page coordinator
 * (Single Responsibility: orchestrate settings tabs + notifications/operators rendering)
 *
 * AI Models tab extracted to settings-ai-models.js (SRP Phase 6).
 */
import { api } from '../api.js';
import { toast } from '../toast.js';
import { escapeHtml as esc } from '../core/utils.js';
import {
  initAiModelsState,
  renderAiModelsTab
} from './settings-ai-models.js';

/**
 * Shared state — backed by centralized cacheManager.
 * Accessed by AI Models tab via getter/setter (backed by same cache keys).
 */
const SETTINGS_CACHE_KEYS = {
  config:      'settings.config',
  adminNotifs: 'settings.adminNotifs',
};

// Wire up shared state accessors for the AI Models sub-module
initAiModelsState(
  () => window.cacheManager.get(SETTINGS_CACHE_KEYS.config),
  (v) => { window.cacheManager.set(SETTINGS_CACHE_KEYS.config, v); }
);

/**
 * Load settings panel
 * @param {string|null} subTab - Optional sub-tab ID
 */
export async function loadSettings(subTab) {
  try {
    const configs = await window.apiHelpers.loadMultipleConfigs(
      { config: '/settings', adminNotifs: '/admin-notifications' },
      { cacheKeys: { config: SETTINGS_CACHE_KEYS.config, adminNotifs: SETTINGS_CACHE_KEYS.adminNotifs } }
    );

    // Store operators in global variable for easy access
    const adminNotifsData = window.cacheManager.get(SETTINGS_CACHE_KEYS.adminNotifs);
    window.currentOperators = adminNotifsData.operators || [];

    // Prioritize passed subTab, then stored state, then default
    const activeTab = subTab || window.activeSettingsTab || 'ai-models';

    // Update hash only if we are applying a default (and not already on a sub-route)
    const shouldUpdateHash = !subTab;

    switchSettingsTab(activeTab, shouldUpdateHash);
  } catch (e) {
    toast(window.apiHelpers.formatApiError(e), 'error');
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

  // Update URL hash if requested (replaceState avoids triggering hashchange)
  if (updateHash) {
    const newHash = `settings/${tabId}`;
    if (window.location.hash.slice(1) !== newHash) {
      history.replaceState(null, '', '#' + newHash);
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

  // Ensure data is loaded
  if (!window.cacheManager.get(SETTINGS_CACHE_KEYS.config) || !window.cacheManager.get(SETTINGS_CACHE_KEYS.adminNotifs)) return;

  // Clear previous content before rendering new
  container.innerHTML = '';

  if (tabId === 'ai-models') renderAiModelsTab(container);
  else if (tabId === 'notifications') renderNotificationsTab(container);
  else if (tabId === 'operators') renderOperatorsTab(container);
  else if (tabId === 'bot-avatar') renderBotAvatarTab(container);
}
window.switchSettingsTab = switchSettingsTab;

// ─── Bot Avatar Tab (US-087) ──────────────────────────────────────

function renderBotAvatarTab(container) {
  var settingsData = window.cacheManager.get(SETTINGS_CACHE_KEYS.config);
  var currentAvatar = (settingsData && settingsData.botAvatar) || '\uD83E\uDD16';
  var presets = ['\uD83E\uDD16', '\uD83D\uDCAC', '\u2728', '\uD83C\uDF08', '\uD83D\uDE80', '\uD83D\uDC8E', '\uD83C\uDF1F', '\uD83D\uDC4B', '\uD83E\uDDE0', '\uD83C\uDF3F'];

  container.innerHTML =
    '<div class="bg-white border rounded-2xl p-6">' +
      '<h3 class="font-semibold text-lg mb-2">Bot Avatar</h3>' +
      '<p class="text-sm text-neutral-500 mb-6 font-medium">Customize the icon shown before AI-generated messages in Live Chat. Human staff replies will not have this icon.</p>' +

      '<div class="mb-6">' +
        '<label class="block text-sm font-bold text-neutral-800 mb-3">Current Avatar</label>' +
        '<div class="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border">' +
          '<span id="bot-avatar-preview" class="text-4xl">' + esc(currentAvatar) + '</span>' +
          '<div>' +
            '<div class="text-sm font-medium text-neutral-800">Preview in chat bubble:</div>' +
            '<div class="text-sm text-neutral-500 mt-1"><span id="bot-avatar-inline">' + esc(currentAvatar) + '</span> Hello! Welcome to Pelangi Capsule Hostel...</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="mb-6">' +
        '<label class="block text-sm font-bold text-neutral-800 mb-3">Quick Presets</label>' +
        '<div class="flex flex-wrap gap-2">' +
          presets.map(function(emoji) {
            var isActive = emoji === currentAvatar ? ' ring-2 ring-primary-500 ring-offset-2' : '';
            return '<button onclick="selectBotAvatar(\'' + emoji + '\')" class="w-12 h-12 text-2xl rounded-xl border hover:bg-neutral-50 transition flex items-center justify-center' + isActive + '">' + emoji + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div class="mb-6">' +
        '<label class="block text-sm font-bold text-neutral-800 mb-3">Custom Emoji / Text</label>' +
        '<div class="flex gap-2">' +
          '<input type="text" id="bot-avatar-custom" value="' + esc(currentAvatar) + '" placeholder="Type emoji or short text" class="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-white shadow-soft text-lg" maxlength="4" />' +
          '<button onclick="saveBotAvatar()" class="px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition shadow-medium font-bold">Save</button>' +
        '</div>' +
        '<p class="text-[11px] text-neutral-500 mt-2">Enter any emoji or up to 4 characters. This will appear before every AI message in Live Chat.</p>' +
      '</div>' +
    '</div>';
}

export function selectBotAvatar(emoji) {
  var input = document.getElementById('bot-avatar-custom');
  if (input) input.value = emoji;
  var preview = document.getElementById('bot-avatar-preview');
  if (preview) preview.textContent = emoji;
  var inline = document.getElementById('bot-avatar-inline');
  if (inline) inline.textContent = emoji;
  // Auto-save on preset click
  saveBotAvatarValue(emoji);
}
window.selectBotAvatar = selectBotAvatar;

export async function saveBotAvatar() {
  var input = document.getElementById('bot-avatar-custom');
  var value = input ? input.value.trim() : '';
  if (!value) {
    toast('Please enter an emoji or text', 'error');
    return;
  }
  await saveBotAvatarValue(value);
}
window.saveBotAvatar = saveBotAvatar;

async function saveBotAvatarValue(value) {
  try {
    await api('/settings', { method: 'PATCH', body: { botAvatar: value } });
    var settingsData = window.cacheManager.get(SETTINGS_CACHE_KEYS.config);
    if (settingsData) settingsData.botAvatar = value;
    window._botAvatar = value;
    toast('Bot avatar updated');
    // Update preview
    var preview = document.getElementById('bot-avatar-preview');
    if (preview) preview.textContent = value;
    var inline = document.getElementById('bot-avatar-inline');
    if (inline) inline.textContent = value;
    // Re-render to update preset highlights
    var container = document.getElementById('settings-tab-content');
    if (container && window.activeSettingsTab === 'bot-avatar') {
      renderBotAvatarTab(container);
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ─── Notifications Tab ─────────────────────────────────────────────

function renderNotificationsTab(container) {
  const adminNotifsData = window.cacheManager.get(SETTINGS_CACHE_KEYS.adminNotifs);
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

// ─── Operators Tab ─────────────────────────────────────────────────

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

// ─── Notification Actions ──────────────────────────────────────────

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
    const adminNotifsData = window.cacheManager.get(SETTINGS_CACHE_KEYS.adminNotifs);
    if (adminNotifsData) adminNotifsData.systemAdminPhone = phone;
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.updateSystemAdminPhone = updateSystemAdminPhone;

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
    const adminNotifsData = window.cacheManager.get(SETTINGS_CACHE_KEYS.adminNotifs);
    if (adminNotifsData) {
      adminNotifsData.enabled = enabled;
      adminNotifsData.notifyOnDisconnect = notifyDisconnect;
      adminNotifsData.notifyOnUnlink = notifyUnlink;
      adminNotifsData.notifyOnReconnect = notifyReconnect;
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.updateAdminNotifPrefs = updateAdminNotifPrefs;

// ─── Operator Actions ──────────────────────────────────────────────

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

export function addOperator() {
  if (!window.currentOperators) window.currentOperators = [];

  const newOperator = {
    phone: '',
    label: 'Operator ' + (window.currentOperators.length + 1),
    fallbackMinutes: 5
  };

  window.currentOperators.push(newOperator);
  renderOperatorsList();
  saveOperators();
}
window.addOperator = addOperator;

export function removeOperator(index) {
  if (!window.currentOperators) return;

  if (window.currentOperators.length === 1) {
    toast('You must have at least one operator', 'error');
    return;
  }

  if (confirm(window.currentOperators[index].label + '?')) {
    window.currentOperators.splice(index, 1);
    renderOperatorsList();
    saveOperators();
  }
}
window.removeOperator = removeOperator;

export function updateOperatorField(index, field, value) {
  if (!window.currentOperators || !window.currentOperators[index]) return;

  window.currentOperators[index][field] = value;
  saveOperators();
}
window.updateOperatorField = updateOperatorField;

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
