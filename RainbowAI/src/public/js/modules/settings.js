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
  config: 'settings.config',
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
  else if (tabId === 'failover') renderFailoverTab(container);
  else if (tabId === 'appearance') renderAppearanceTab(container);
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
    presets.map(function (emoji) {
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

// ─── Failover Tab ──────────────────────────────────────────────────

/** Auto-refresh interval handle for the failover panel */
let _failoverRefreshTimer = null;

export function renderFailoverTab(container) {
  container.innerHTML = `
    <div class="bg-white border rounded-2xl p-6">
      <h3 class="font-semibold text-lg mb-1 flex items-center gap-2">
        <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Primary / Standby Failover
      </h3>
      <p class="text-sm text-neutral-500 mb-6 font-medium">
        Coordinates which server (local PC or Lightsail) actively replies to WhatsApp messages.
        The primary sends heartbeats; the standby takes over if heartbeats stop.
      </p>

      <!-- Status card -->
      <div id="failover-status-card" class="mb-6 p-5 rounded-2xl border bg-neutral-50">
        <div class="text-sm text-neutral-500">Loading status...</div>
      </div>

      <!-- Settings form -->
      <div class="mb-6 space-y-4">
        <h4 class="text-sm font-bold text-neutral-800">Thresholds</h4>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-neutral-600 mb-1">Heartbeat interval (ms)</label>
            <input type="number" id="fo-heartbeat-interval" min="5000" step="1000"
              class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition" />
            <p class="text-[11px] text-neutral-400 mt-1">How often primary pings standby. Default: 20000</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-neutral-600 mb-1">Failover threshold (ms)</label>
            <input type="number" id="fo-failover-threshold" min="10000" step="1000"
              class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition" />
            <p class="text-[11px] text-neutral-400 mt-1">Silence before standby activates. Default: 60000</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-neutral-600 mb-1">Handback mode</label>
            <select id="fo-handback-mode"
              class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none transition bg-white"
              onchange="toggleHandbackGrace()">
              <option value="immediate">Immediate</option>
              <option value="grace">Grace period</option>
            </select>
          </div>
          <div id="fo-grace-wrapper">
            <label class="block text-xs font-medium text-neutral-600 mb-1">Grace period (ms)</label>
            <input type="number" id="fo-grace-period" min="0" step="1000"
              class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition" />
            <p class="text-[11px] text-neutral-400 mt-1">Delay before handing back to primary</p>
          </div>
        </div>

        <button onclick="saveFailoverSettings()"
          class="px-8 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition font-bold text-sm shadow-medium">
          Save Thresholds
        </button>
      </div>

      <!-- Force Standby Toggle -->
      <div class="mb-6 p-5 rounded-2xl border bg-amber-50">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-sm font-bold text-neutral-800 mb-1">Force Standby Mode</h4>
            <p class="text-xs text-neutral-500">Stops heartbeats and suppresses replies so Lightsail handles all messages, even when this PC is online.</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="fo-force-standby-toggle" class="sr-only peer" onchange="toggleForceStandby(this.checked)">
            <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>
        <div id="fo-force-standby-status" class="mt-2 text-xs text-neutral-400 hidden"></div>
      </div>

      <!-- Manual controls -->
      <div class="flex gap-3 pt-4 border-t">
        <button onclick="failoverPromote()"
          class="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-bold text-sm">
          ▲ Promote (Force Active)
        </button>
        <button onclick="failoverDemote()"
          class="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-bold text-sm">
          ▼ Demote (Suppress Replies)
        </button>
      </div>
    </div>
  `;

  // Load current settings into form
  const settings = window.cacheManager.get('settings.config');
  if (settings && settings.failover) {
    const fo = settings.failover;
    document.getElementById('fo-heartbeat-interval').value = fo.heartbeatIntervalMs ?? 20000;
    document.getElementById('fo-failover-threshold').value = fo.failoverThresholdMs ?? 60000;
    const modeEl = document.getElementById('fo-handback-mode');
    if (modeEl) modeEl.value = fo.handbackMode ?? 'immediate';
    document.getElementById('fo-grace-period').value = fo.handbackGracePeriodMs ?? 30000;
    toggleHandbackGrace();
  }

  // Start status polling
  if (_failoverRefreshTimer) clearInterval(_failoverRefreshTimer);
  loadFailoverStatus();
  _failoverRefreshTimer = setInterval(loadFailoverStatus, 10000);
}
window.renderFailoverTab = renderFailoverTab;

export async function loadFailoverStatus() {
  const card = document.getElementById('failover-status-card');
  if (!card) {
    if (_failoverRefreshTimer) { clearInterval(_failoverRefreshTimer); _failoverRefreshTimer = null; }
    return;
  }
  try {
    const status = await api('/whatsapp/failover/status');
    renderFailoverStatusCard(card, status);
  } catch (e) {
    card.innerHTML = '<div class="text-sm text-red-500">Failed to load status: ' + esc(e.message) + '</div>';
  }
}
window.loadFailoverStatus = loadFailoverStatus;

function renderFailoverStatusCard(card, s) {
  const roleBadge = s.role === 'primary'
    ? '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide">PRIMARY</span>'
    : s.isActive
      ? '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wide">ACTIVE (took over)</span>'
      : '<span class="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold uppercase tracking-wide">STANDBY</span>';

  const activeBadge = s.isActive
    ? '<span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">Sending replies</span>'
    : '<span class="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">Suppressing replies</span>';

  const lastBeat = s.role === 'standby' && s.secondsSinceLastBeat !== null
    ? '<div class="mt-3 text-sm text-neutral-600">Last heartbeat received: <strong>' + s.secondsSinceLastBeat + 's ago</strong>' + (s.missedBeats > 0 ? ' (' + s.missedBeats + ' missed)' : '') + '</div>'
    : s.role === 'primary' && s.lastHeartbeatSentAt
      ? '<div class="mt-3 text-sm text-neutral-600">Last heartbeat sent: <strong>' + Math.floor((Date.now() - s.lastHeartbeatSentAt) / 1000) + 's ago</strong></div>'
      : '';

  const enabledNote = s.enabled ? '' : '<div class="mt-2 text-xs text-neutral-400">(Failover disabled — always active)</div>';
  const forcedNote = s.forcedStandby ? '<div class="mt-2 text-xs text-amber-600 font-medium">Force Standby active — heartbeats stopped, Lightsail handles messages</div>' : '';

  card.innerHTML =
    '<div class="flex items-center gap-3 flex-wrap">' + roleBadge + activeBadge + '</div>' +
    lastBeat + enabledNote + forcedNote;

  // Sync the force-standby toggle
  const toggle = document.getElementById('fo-force-standby-toggle');
  if (toggle) toggle.checked = !!s.forcedStandby;
}

export function toggleHandbackGrace() {
  const mode = document.getElementById('fo-handback-mode');
  const wrapper = document.getElementById('fo-grace-wrapper');
  if (mode && wrapper) {
    wrapper.style.display = mode.value === 'grace' ? '' : 'none';
  }
}
window.toggleHandbackGrace = toggleHandbackGrace;

export async function saveFailoverSettings() {
  const heartbeatIntervalMs = parseInt(document.getElementById('fo-heartbeat-interval').value, 10);
  const failoverThresholdMs = parseInt(document.getElementById('fo-failover-threshold').value, 10);
  const handbackMode = document.getElementById('fo-handback-mode').value;
  const handbackGracePeriodMs = parseInt(document.getElementById('fo-grace-period').value, 10);

  if (!heartbeatIntervalMs || heartbeatIntervalMs < 5000) { toast('Heartbeat interval must be >= 5000ms', 'error'); return; }
  if (!failoverThresholdMs || failoverThresholdMs < 10000) { toast('Failover threshold must be >= 10000ms', 'error'); return; }

  try {
    await api('/settings', {
      method: 'PATCH',
      body: { failover: { heartbeatIntervalMs, failoverThresholdMs, handbackMode, handbackGracePeriodMs } }
    });
    const settingsData = window.cacheManager.get('settings.config');
    if (settingsData) settingsData.failover = { ...settingsData.failover, heartbeatIntervalMs, failoverThresholdMs, handbackMode, handbackGracePeriodMs };
    toast('Failover thresholds saved');
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.saveFailoverSettings = saveFailoverSettings;

export async function toggleForceStandby(enabled) {
  try {
    await api('/whatsapp/failover/force-standby', {
      method: 'POST',
      body: { enabled }
    });
    const statusEl = document.getElementById('fo-force-standby-status');
    if (statusEl) {
      statusEl.textContent = enabled
        ? 'Standby mode active — Lightsail will take over within 60 seconds'
        : 'Primary mode resumed — this server handles messages';
      statusEl.classList.remove('hidden');
      statusEl.className = 'mt-2 text-xs ' + (enabled ? 'text-amber-600 font-medium' : 'text-green-600 font-medium');
    }
    toast(enabled ? 'Force Standby ON — Lightsail will take over' : 'Force Standby OFF — resuming primary', enabled ? 'warning' : 'success');
    loadFailoverStatus();
  } catch (e) {
    toast(e.message, 'error');
    // Revert toggle
    const toggle = document.getElementById('fo-force-standby-toggle');
    if (toggle) toggle.checked = !enabled;
  }
}
window.toggleForceStandby = toggleForceStandby;

export async function failoverPromote() {
  try {
    await api('/whatsapp/failover/promote', { method: 'POST' });
    toast('Promoted — this server is now active');
    loadFailoverStatus();
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.failoverPromote = failoverPromote;

export async function failoverDemote() {
  if (!confirm('Suppress replies on this server? WhatsApp messages will not be answered until promoted again.')) return;
  try {
    await api('/whatsapp/failover/demote', { method: 'POST' });
    toast('Demoted — replies suppressed on this server');
    loadFailoverStatus();
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.failoverDemote = failoverDemote;

// ─── Appearance Tab ────────────────────────────────────────────────

/**
 * All appearance prefs live in localStorage under one key to avoid
 * polluting settings API with purely cosmetic, per-device preferences.
 */
const APPEARANCE_KEY = 'rainbow.appearance';

function _loadAppearancePrefs() {
  try {
    return JSON.parse(localStorage.getItem(APPEARANCE_KEY) || '{}');
  } catch {
    return {};
  }
}

function _saveAppearancePrefs(prefs) {
  localStorage.setItem(APPEARANCE_KEY, JSON.stringify(prefs));
}

/**
 * Apply persisted appearance settings to the document.
 * Call once on page load and after every change.
 */
export function applyAppearancePrefs() {
  const prefs = _loadAppearancePrefs();
  const root = document.documentElement;

  // ── Theme ──
  const theme = prefs.theme || 'light';
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.setProperty('--app-bg', prefs.bgColor || '#1a1a2e');
    root.style.setProperty('--app-surface', prefs.surfaceColor || '#16213e');
    root.style.setProperty('--app-text', '#e2e8f0');
    root.style.setProperty('--app-text-muted', '#94a3b8');
    root.style.setProperty('--app-border', 'rgba(255,255,255,0.1)');
  } else {
    root.classList.remove('dark');
    root.style.setProperty('--app-bg', prefs.bgColor || '#f8fafc');
    root.style.setProperty('--app-surface', prefs.surfaceColor || '#ffffff');
    root.style.setProperty('--app-text', '#0f172a');
    root.style.setProperty('--app-text-muted', '#64748b');
    root.style.setProperty('--app-border', '#e2e8f0');
  }

  // ── Accent colour ──
  if (prefs.accentHue) {
    root.style.setProperty('--color-primary-500', `hsl(${prefs.accentHue}, 70%, 55%)`);
    root.style.setProperty('--color-primary-600', `hsl(${prefs.accentHue}, 70%, 47%)`);
    root.style.setProperty('--color-primary-100', `hsl(${prefs.accentHue}, 80%, 93%)`);
    root.style.setProperty('--color-primary-50', `hsl(${prefs.accentHue}, 80%, 97%)`);
  }

  // ── Sidebar ──
  if (prefs.sidebarColor) {
    root.style.setProperty('--sidebar-bg', prefs.sidebarColor);
  }

  // ── Font size ──
  if (prefs.fontSize) {
    root.style.fontSize = prefs.fontSize + 'px';
  }

  // ── Background image / gradient ──
  const mainEl = document.querySelector('#main-content') || document.querySelector('main') || document.body;
  if (prefs.bgGradient && prefs.bgGradient !== 'none') {
    mainEl.style.backgroundImage = prefs.bgGradient;
    mainEl.style.backgroundAttachment = 'fixed';
  } else {
    mainEl.style.backgroundImage = '';
  }
}
window.applyAppearancePrefs = applyAppearancePrefs;

function renderAppearanceTab(container) {
  const prefs = _loadAppearancePrefs();

  const ACCENT_PRESETS = [
    { name: 'Indigo', hue: 239 },
    { name: 'Violet', hue: 262 },
    { name: 'Blue', hue: 217 },
    { name: 'Cyan', hue: 188 },
    { name: 'Teal', hue: 168 },
    { name: 'Emerald', hue: 145 },
    { name: 'Rose', hue: 347 },
    { name: 'Orange', hue: 25 },
    { name: 'Amber', hue: 43 },
  ];

  const GRADIENTS = [
    { name: 'None', value: 'none' },
    { name: 'Subtle Blue', value: 'linear-gradient(135deg,#f0f4ff 0%,#fafafa 100%)' },
    { name: 'Lavender', value: 'linear-gradient(135deg,#f3f0ff 0%,#fafafa 100%)' },
    { name: 'Mint', value: 'linear-gradient(135deg,#f0fff4 0%,#fafafa 100%)' },
    { name: 'Peach', value: 'linear-gradient(135deg,#fff5f0 0%,#fafafa 100%)' },
    { name: 'Deep Ocean', value: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)' },
    { name: 'Night Sky', value: 'linear-gradient(135deg,#0d0d1e 0%,#1a0533 100%)' },
  ];

  const accentHue = prefs.accentHue ?? 239;
  const theme = prefs.theme || 'light';
  const fontSize = prefs.fontSize || 14;
  const bgColor = prefs.bgColor || (theme === 'dark' ? '#1a1a2e' : '#f8fafc');
  const sidebarColor = prefs.sidebarColor || '';
  const bgGradient = prefs.bgGradient || 'none';

  const accentBtns = ACCENT_PRESETS.map(p => {
    const isActive = p.hue === accentHue;
    return `<button
      title="${esc(p.name)}"
      onclick="setAppearancePref('accentHue', ${p.hue}); event.currentTarget.closest('#appearance-tab').querySelectorAll('.accent-swatch').forEach(el=>el.classList.remove('ring-2','ring-offset-2','ring-primary-500')); event.currentTarget.classList.add('ring-2','ring-offset-2','ring-primary-500');"
      class="accent-swatch w-8 h-8 rounded-full border-2 border-white shadow transition hover:scale-110 ${isActive ? 'ring-2 ring-offset-2 ring-primary-500' : ''}"
      style="background:hsl(${p.hue},70%,55%)"
    ></button>`;
  }).join('');

  const gradientBtns = GRADIENTS.map(g => {
    const isActive = (prefs.bgGradient || 'none') === g.value;
    const bgStyle = g.value === 'none' ? 'background:#f1f5f9' : `background:${g.value}`;
    return `<button
      title="${esc(g.name)}"
      onclick="setAppearancePref('bgGradient','${g.value.replace(/'/g, '\\\'')}'); event.currentTarget.closest('#appearance-tab').querySelectorAll('.gradient-swatch').forEach(el=>el.classList.remove('ring-2','ring-offset-2','ring-primary-500')); event.currentTarget.classList.add('ring-2','ring-offset-2','ring-primary-500');"
      class="gradient-swatch w-10 h-10 rounded-xl border shadow transition hover:scale-105 ${isActive ? 'ring-2 ring-offset-2 ring-primary-500' : ''}"
      style="${bgStyle}"
    ></button>`;
  }).join('');

  container.innerHTML = `
    <div id="appearance-tab" class="space-y-4">

      <!-- Theme -->
      <div class="bg-white border rounded-2xl p-6">
        <h3 class="font-semibold text-lg mb-1">🌓 Theme</h3>
        <p class="text-sm text-neutral-500 mb-5">Choose how the dashboard looks. Dark mode reduces eye strain in low-light environments.</p>
        <div class="flex gap-3 flex-wrap">
          ${['light', 'dark'].map(t => `
            <label class="flex-1 min-w-[120px] cursor-pointer">
              <input type="radio" name="app-theme" value="${t}" ${theme === t ? 'checked' : ''}
                onchange="setAppearancePref('theme', this.value)" class="sr-only">
              <div class="border-2 rounded-2xl p-4 text-center transition hover:border-primary-400 ${theme === t ? 'border-primary-500 bg-primary-50' : 'border-neutral-200'}">
                <div class="text-2xl mb-1">${t === 'light' ? '☀️' : '🌙'}</div>
                <div class="text-sm font-medium capitalize">${t}</div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Accent Color -->
      <div class="bg-white border rounded-2xl p-6">
        <h3 class="font-semibold text-lg mb-1">🎨 Accent Color</h3>
        <p class="text-sm text-neutral-500 mb-4">Changes buttons, links, and highlights throughout the dashboard.</p>
        <div class="flex gap-3 flex-wrap items-center">
          ${accentBtns}
          <div class="flex items-center gap-2 ml-2">
            <label class="text-xs text-neutral-500">Custom:</label>
            <input type="color"
              value="${`hsl(${accentHue},70%,55%)`}"
              id="accent-custom-color"
              oninput="setAppearancePref('accentHue', null, this.value)"
              class="w-8 h-8 rounded-full border cursor-pointer"
              title="Pick any color">
          </div>
        </div>
      </div>

      <!-- Background -->
      <div class="bg-white border rounded-2xl p-6">
        <h3 class="font-semibold text-lg mb-1">🖼 Background</h3>
        <p class="text-sm text-neutral-500 mb-4">Set a solid background color or pick a gradient for the main content area.</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-xs font-medium text-neutral-600 mb-2">Background Color</label>
            <div class="flex items-center gap-3">
              <input type="color" id="bg-color-picker" value="${esc(bgColor)}"
                oninput="setAppearancePref('bgColor', this.value)"
                class="w-10 h-10 rounded-xl border cursor-pointer">
              <input type="text" id="bg-color-text" value="${esc(bgColor)}"
                oninput="document.getElementById('bg-color-picker').value=this.value; setAppearancePref('bgColor', this.value)"
                class="flex-1 px-3 py-2 border rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-neutral-600 mb-2">Sidebar Color</label>
            <div class="flex items-center gap-3">
              <input type="color" id="sidebar-color-picker" value="${esc(sidebarColor || '#1e293b')}"
                oninput="setAppearancePref('sidebarColor', this.value)"
                class="w-10 h-10 rounded-xl border cursor-pointer">
              <input type="text" id="sidebar-color-text" value="${esc(sidebarColor || '#1e293b')}"
                oninput="document.getElementById('sidebar-color-picker').value=this.value; setAppearancePref('sidebarColor', this.value)"
                class="flex-1 px-3 py-2 border rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
            </div>
          </div>
        </div>
        <div class="mt-5">
          <label class="block text-xs font-medium text-neutral-600 mb-2">Background Gradient</label>
          <div class="flex gap-3 flex-wrap">${gradientBtns}</div>
        </div>
      </div>

      <!-- Font Size -->
      <div class="bg-white border rounded-2xl p-6">
        <h3 class="font-semibold text-lg mb-1">🔤 Font Size</h3>
        <p class="text-sm text-neutral-500 mb-4">Adjusts the base text size across the dashboard.</p>
        <div class="flex items-center gap-4">
          <span class="text-xs text-neutral-400">A</span>
          <input type="range" min="12" max="18" step="1" value="${fontSize}" id="font-size-slider"
            oninput="document.getElementById('font-size-label').textContent=this.value+'px'; setAppearancePref('fontSize', parseInt(this.value))"
            class="flex-1 accent-primary">
          <span class="text-lg text-neutral-600">A</span>
          <span id="font-size-label" class="text-sm font-mono text-neutral-600 w-10">${fontSize}px</span>
        </div>
      </div>

      <!-- Reset -->
      <div class="flex justify-end">
        <button onclick="resetAppearancePrefs()" class="text-sm text-neutral-500 hover:text-red-500 border hover:border-red-200 px-4 py-2 rounded-xl transition">
          Reset to Defaults
        </button>
      </div>

    </div>
  `;
}

export function setAppearancePref(key, value, colorHex) {
  const prefs = _loadAppearancePrefs();

  if (key === 'accentHue' && colorHex) {
    // Convert hex to approximate hue
    const r = parseInt(colorHex.slice(1, 3), 16) / 255;
    const g = parseInt(colorHex.slice(3, 5), 16) / 255;
    const b = parseInt(colorHex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d % 6) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    prefs.accentHue = Math.round((h + 360) % 360);
  } else {
    prefs[key] = value;
  }

  _saveAppearancePrefs(prefs);
  applyAppearancePrefs();

  // Sync text input to color picker and vice-versa
  if (key === 'bgColor') {
    const txt = document.getElementById('bg-color-text');
    if (txt) txt.value = value;
  }
  if (key === 'sidebarColor') {
    const txt = document.getElementById('sidebar-color-text');
    if (txt) txt.value = value;
  }
}
window.setAppearancePref = setAppearancePref;

export function resetAppearancePrefs() {
  if (!confirm('Reset all appearance settings to defaults?')) return;
  localStorage.removeItem(APPEARANCE_KEY);
  // Clear custom CSS vars
  const root = document.documentElement;
  ['--app-bg', '--app-surface', '--app-text', '--app-text-muted', '--app-border',
    '--color-primary-500', '--color-primary-600', '--color-primary-100', '--color-primary-50',
    '--sidebar-bg'].forEach(v => root.style.removeProperty(v));
  root.classList.remove('dark');
  root.style.fontSize = '';
  const mainEl = document.querySelector('#main-content') || document.querySelector('main') || document.body;
  mainEl.style.backgroundImage = '';
  // Re-render tab
  const c = document.getElementById('settings-tab-content');
  if (c && window.activeSettingsTab === 'appearance') renderAppearanceTab(c);
  toast('Appearance reset to defaults');
}
window.resetAppearancePrefs = resetAppearancePrefs;
