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
  else if (tabId === 'failover') renderFailoverTab(container);
  else if (tabId === 'scheduled-rules') renderScheduledRulesTab(container);
  else if (tabId === 'custom-fields') renderCustomFieldsTab(container);
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

// ─── Scheduled Rules Tab ──────────────────────────────────────────

let _scheduledRules = [];

export async function renderScheduledRulesTab(container) {
  container.innerHTML =
    '<div class="bg-white border rounded-2xl p-6">' +
      '<div class="flex items-center justify-between mb-1">' +
        '<h3 class="font-semibold text-lg flex items-center gap-2">' +
          '<span>⏰</span> Scheduled Messages' +
        '</h3>' +
        '<button onclick="showScheduledRuleForm()" class="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-bold text-sm">+ New Rule</button>' +
      '</div>' +
      '<p class="text-sm text-neutral-500 mb-6 font-medium">Auto-send WhatsApp messages based on contact date fields (e.g. check-in reminders, checkout thank-you).</p>' +
      '<div id="sr-list" class="space-y-3"><div class="text-sm text-neutral-400 text-center py-8">Loading rules...</div></div>' +
      '<div id="sr-form-modal" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"></div>' +
    '</div>';
  await loadScheduledRules();
}
window.renderScheduledRulesTab = renderScheduledRulesTab;

async function loadScheduledRules() {
  try {
    _scheduledRules = await api('/scheduled-rules');
    renderRulesList();
  } catch (e) {
    var el = document.getElementById('sr-list');
    if (el) el.innerHTML = '<div class="text-sm text-red-500 text-center py-4">Failed to load rules: ' + esc(e.message) + '</div>';
  }
}

function renderRulesList() {
  var el = document.getElementById('sr-list');
  if (!el) return;
  if (!_scheduledRules.length) {
    el.innerHTML = '<div class="text-sm text-neutral-400 text-center py-8">No scheduled rules yet. Click "+ New Rule" to create one.</div>';
    return;
  }
  el.innerHTML = _scheduledRules.map(function(r) {
    var statusBadge = r.isActive
      ? '<span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">Active</span>'
      : '<span class="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-xs font-bold">Paused</span>';
    var conditionLabel;
    if (r.matchValue) {
      conditionLabel = 'equals <span class="font-medium text-primary-600">"' + esc(r.matchValue) + '"</span>';
    } else {
      var oh = r.offsetHours || 0;
      conditionLabel = oh >= 0 ? oh + 'h after' : Math.abs(oh) + 'h before';
    }
    var msgs = r.messages || {};
    var langCount = Object.keys(msgs).filter(function(k) { return k !== 'matchValue' && msgs[k]; }).length;
    return '<div class="p-4 border rounded-xl hover:shadow-sm transition">' +
      '<div class="flex items-center justify-between mb-2">' +
        '<div class="flex items-center gap-2">' +
          '<span class="font-medium text-sm text-neutral-800">' + esc(r.name) + '</span>' +
          statusBadge +
        '</div>' +
        '<div class="flex gap-1">' +
          '<button onclick="toggleScheduledRule(' + r.id + ')" class="px-2 py-1 text-xs rounded-lg border hover:bg-neutral-50 transition" title="' + (r.isActive ? 'Pause' : 'Activate') + '">' +
            (r.isActive ? '⏸️' : '▶️') +
          '</button>' +
          '<button onclick="editScheduledRule(' + r.id + ')" class="px-2 py-1 text-xs rounded-lg border hover:bg-neutral-50 transition" title="Edit">✏️</button>' +
          '<button onclick="deleteScheduledRule(' + r.id + ')" class="px-2 py-1 text-xs rounded-lg border hover:bg-red-50 text-red-500 transition" title="Delete">🗑️</button>' +
        '</div>' +
      '</div>' +
      '<div class="text-xs text-neutral-500 space-y-1">' +
        '<div>Trigger: <span class="font-medium text-neutral-700">' + esc(r.triggerField) + '</span> → ' + conditionLabel + '</div>' +
        '<div>Languages: ' + langCount + ' | Cooldown: ' + (r.cooldownHours || 24) + 'h</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

export function showScheduledRuleForm(editId) {
  var rule = editId ? _scheduledRules.find(function(r) { return r.id === editId; }) : null;
  var modal = document.getElementById('sr-form-modal');
  if (!modal) return;

  // Fetch custom field definitions to populate trigger field dropdown
  api('/contact-fields/definitions').then(function(defs) {
    var allFields = defs || [];
    // Store for onchange lookup
    window._srFieldDefs = allFields;

    var fieldOptions = allFields.map(function(d) {
      var sel = rule && rule.triggerField === d.fieldKey ? ' selected' : '';
      var typeHint = d.fieldType === 'date' ? ' \u2705' : ' (' + d.fieldType + ')';
      return '<option value="' + esc(d.fieldKey) + '" data-type="' + esc(d.fieldType) + '"' + sel + '>' + esc(d.fieldLabel) + typeHint + '</option>';
    }).join('');
    if (!fieldOptions) fieldOptions = '<option value="">No fields defined — create in Fields tab</option>';

    var msgs = rule ? (rule.messages || {}) : {};
    var ruleMatchValue = rule ? (rule.matchValue || '') : '';

    // Determine initial field type for showing offset vs match value
    var initialFieldKey = rule ? rule.triggerField : (allFields.length ? allFields[0].fieldKey : '');
    var initialDef = allFields.find(function(d) { return d.fieldKey === initialFieldKey; });
    var isDate = initialDef && initialDef.fieldType === 'date';

    // Build select options for match value (if field is select type)
    var matchSelectOpts = '';
    if (initialDef && initialDef.fieldType === 'select' && initialDef.fieldOptions) {
      matchSelectOpts = initialDef.fieldOptions.map(function(o) {
        var sel2 = ruleMatchValue === o ? ' selected' : '';
        return '<option value="' + esc(o) + '"' + sel2 + '>' + esc(o) + '</option>';
      }).join('');
    }

    modal.innerHTML =
      '<div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">' +
        '<h3 class="font-semibold text-lg mb-4">' + (rule ? 'Edit Rule' : 'New Scheduled Rule') + '</h3>' +
        '<div class="space-y-4">' +
          '<div>' +
            '<label class="block text-xs font-medium text-neutral-600 mb-1">Rule Name</label>' +
            '<input type="text" id="sr-name" value="' + (rule ? esc(rule.name) : '') + '" placeholder="e.g. Check-in Reminder" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">' +
          '</div>' +
          '<div>' +
            '<label class="block text-xs font-medium text-neutral-600 mb-1">Trigger Field</label>' +
            '<select id="sr-trigger" onchange="srTriggerFieldChanged()" class="w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none">' + fieldOptions + '</select>' +
          '</div>' +
          // Date condition: offset hours
          '<div id="sr-date-condition" class="grid grid-cols-2 gap-4"' + (isDate ? '' : ' style="display:none"') + '>' +
            '<div>' +
              '<label class="block text-xs font-medium text-neutral-600 mb-1">Offset (hours)</label>' +
              '<input type="number" id="sr-offset" value="' + (rule ? rule.offsetHours : 0) + '" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">' +
              '<p class="text-[11px] text-neutral-400 mt-1">Positive = after date, negative = before date</p>' +
            '</div>' +
            '<div>' +
              '<label class="block text-xs font-medium text-neutral-600 mb-1">Cooldown (hours)</label>' +
              '<input type="number" id="sr-cooldown" value="' + (rule ? (rule.cooldownHours || 24) : 24) + '" min="1" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">' +
            '</div>' +
          '</div>' +
          // Non-date condition: match value
          '<div id="sr-match-condition"' + (isDate ? ' style="display:none"' : '') + '>' +
            '<div class="grid grid-cols-2 gap-4">' +
              '<div>' +
                '<label class="block text-xs font-medium text-neutral-600 mb-1">Match Value <span style="font-weight:400;color:#999">(equals)</span></label>' +
                '<div id="sr-match-input-wrap">' +
                  (initialDef && initialDef.fieldType === 'select'
                    ? '<select id="sr-match-value" class="w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none">' + matchSelectOpts + '</select>'
                    : '<input type="text" id="sr-match-value" value="' + esc(ruleMatchValue) + '" placeholder="e.g. Airbnb" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">') +
                '</div>' +
                '<p class="text-[11px] text-neutral-400 mt-1">Send when field value equals this</p>' +
              '</div>' +
              '<div>' +
                '<label class="block text-xs font-medium text-neutral-600 mb-1">Cooldown (hours)</label>' +
                '<input type="number" id="sr-cooldown-match" value="' + (rule ? (rule.cooldownHours || 24) : 24) + '" min="1" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<label class="block text-xs font-medium text-neutral-600 mb-1">Message — English</label>' +
            '<textarea id="sr-msg-en" rows="2" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none">' + esc(msgs.en || '') + '</textarea>' +
          '</div>' +
          '<div>' +
            '<label class="block text-xs font-medium text-neutral-600 mb-1">Message — Malay</label>' +
            '<textarea id="sr-msg-ms" rows="2" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none">' + esc(msgs.ms || '') + '</textarea>' +
          '</div>' +
          '<div>' +
            '<label class="block text-xs font-medium text-neutral-600 mb-1">Message — Chinese</label>' +
            '<textarea id="sr-msg-zh" rows="2" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none">' + esc(msgs.zh || '') + '</textarea>' +
          '</div>' +
        '</div>' +
        '<div class="flex gap-3 mt-6">' +
          '<button onclick="saveScheduledRule(' + (editId || 'null') + ')" class="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-bold text-sm">Save</button>' +
          '<button onclick="closeScheduledRuleForm()" class="px-6 py-2.5 border rounded-xl hover:bg-neutral-50 transition text-sm font-medium">Cancel</button>' +
        '</div>' +
      '</div>';

    modal.classList.remove('hidden');
  }).catch(function() {
    toast('Failed to load field definitions', 'error');
  });
}
window.showScheduledRuleForm = showScheduledRuleForm;

export function closeScheduledRuleForm() {
  var modal = document.getElementById('sr-form-modal');
  if (modal) { modal.classList.add('hidden'); modal.innerHTML = ''; }
}
window.closeScheduledRuleForm = closeScheduledRuleForm;

/**
 * Called when trigger field dropdown changes — toggles date-condition vs match-condition.
 */
export function srTriggerFieldChanged() {
  var sel = document.getElementById('sr-trigger');
  if (!sel) return;
  var opt = sel.options[sel.selectedIndex];
  var fieldType = opt ? opt.getAttribute('data-type') : 'text';
  var fieldKey = sel.value;
  var isDate = fieldType === 'date';

  // Toggle condition sections
  var dateSec = document.getElementById('sr-date-condition');
  var matchSec = document.getElementById('sr-match-condition');
  if (dateSec) dateSec.style.display = isDate ? '' : 'none';
  if (matchSec) matchSec.style.display = isDate ? 'none' : '';

  // For select-type fields, rebuild match input as <select>
  if (!isDate) {
    var wrap = document.getElementById('sr-match-input-wrap');
    if (!wrap) return;
    var def = (window._srFieldDefs || []).find(function(d) { return d.fieldKey === fieldKey; });
    if (def && def.fieldType === 'select' && def.fieldOptions && def.fieldOptions.length) {
      wrap.innerHTML = '<select id="sr-match-value" class="w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none">' +
        def.fieldOptions.map(function(o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('') +
        '</select>';
    } else {
      wrap.innerHTML = '<input type="text" id="sr-match-value" value="" placeholder="e.g. Airbnb" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">';
    }
  }
}
window.srTriggerFieldChanged = srTriggerFieldChanged;

export async function saveScheduledRule(editId) {
  var name = (document.getElementById('sr-name') || {}).value;
  var triggerField = (document.getElementById('sr-trigger') || {}).value;
  var msgEn = (document.getElementById('sr-msg-en') || {}).value;
  var msgMs = (document.getElementById('sr-msg-ms') || {}).value;
  var msgZh = (document.getElementById('sr-msg-zh') || {}).value;

  if (!name) { toast('Name is required', 'error'); return; }
  if (!triggerField) { toast('Trigger field is required', 'error'); return; }
  if (!msgEn) { toast('English message is required', 'error'); return; }

  // Determine if date-based or match-based from visibility
  var dateSec = document.getElementById('sr-date-condition');
  var isDateMode = dateSec && dateSec.style.display !== 'none';

  var offsetHours, cooldownHours, matchValue;
  if (isDateMode) {
    offsetHours = parseInt((document.getElementById('sr-offset') || {}).value, 10);
    cooldownHours = parseInt((document.getElementById('sr-cooldown') || {}).value, 10);
    matchValue = null;
  } else {
    offsetHours = 0;
    cooldownHours = parseInt((document.getElementById('sr-cooldown-match') || {}).value, 10);
    matchValue = (document.getElementById('sr-match-value') || {}).value || '';
    if (!matchValue) { toast('Match value is required for non-date fields', 'error'); return; }
  }

  var body = {
    name: name,
    triggerField: triggerField,
    offsetHours: isNaN(offsetHours) ? 0 : offsetHours,
    cooldownHours: isNaN(cooldownHours) ? 24 : cooldownHours,
    matchValue: matchValue,
    messages: { en: msgEn, ms: msgMs || '', zh: msgZh || '' }
  };

  try {
    if (editId) {
      await api('/scheduled-rules/' + editId, { method: 'PUT', body: body });
      toast('Rule updated');
    } else {
      await api('/scheduled-rules', { method: 'POST', body: body });
      toast('Rule created');
    }
    closeScheduledRuleForm();
    await loadScheduledRules();
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.saveScheduledRule = saveScheduledRule;

export function editScheduledRule(id) {
  showScheduledRuleForm(id);
}
window.editScheduledRule = editScheduledRule;

export async function toggleScheduledRule(id) {
  try {
    var result = await api('/scheduled-rules/' + id + '/toggle', { method: 'PATCH' });
    toast(result.isActive ? 'Rule activated' : 'Rule paused');
    await loadScheduledRules();
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.toggleScheduledRule = toggleScheduledRule;

export async function deleteScheduledRule(id) {
  if (!confirm('Delete this scheduled rule? This cannot be undone.')) return;
  try {
    await api('/scheduled-rules/' + id, { method: 'DELETE' });
    toast('Rule deleted');
    await loadScheduledRules();
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.deleteScheduledRule = deleteScheduledRule;

// ─── Custom Fields Tab ──────────────────────────────────────────

let _customFieldDefs = [];

export async function renderCustomFieldsTab(container) {
  container.innerHTML =
    '<div class="bg-white border rounded-2xl p-6">' +
      '<div class="flex items-center justify-between mb-1">' +
        '<h3 class="font-semibold text-lg flex items-center gap-2">' +
          '<span>📋</span> Custom Contact Fields' +
        '</h3>' +
        '<button onclick="showCustomFieldForm()" class="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-bold text-sm">+ New Field</button>' +
      '</div>' +
      '<p class="text-sm text-neutral-500 mb-6 font-medium">Define custom fields that appear on each contact in the Live Chat panel. Use date fields as triggers for scheduled messages.</p>' +
      '<div id="cf-list" class="space-y-3"><div class="text-sm text-neutral-400 text-center py-8">Loading fields...</div></div>' +
      '<div id="cf-form-modal" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"></div>' +
    '</div>';
  await loadCustomFieldDefs();
}
window.renderCustomFieldsTab = renderCustomFieldsTab;

async function loadCustomFieldDefs() {
  try {
    _customFieldDefs = await api('/contact-fields/definitions');
    renderFieldDefsList();
  } catch (e) {
    var el = document.getElementById('cf-list');
    if (el) el.innerHTML = '<div class="text-sm text-red-500 text-center py-4">Failed to load fields: ' + esc(e.message) + '</div>';
  }
}

function renderFieldDefsList() {
  var el = document.getElementById('cf-list');
  if (!el) return;
  if (!_customFieldDefs.length) {
    el.innerHTML = '<div class="text-sm text-neutral-400 text-center py-8">No custom fields yet. Click "+ New Field" to create one.</div>';
    return;
  }

  var typeIcons = { text: '📝', date: '📅', number: '🔢', select: '📋' };

  el.innerHTML = _customFieldDefs.map(function(d) {
    var icon = typeIcons[d.fieldType] || '📄';
    var builtIn = d.isBuiltIn ? '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold ml-2">Built-in</span>' : '';
    var opts = (d.fieldOptions && d.fieldOptions.length) ? '<div class="text-[11px] text-neutral-400 mt-1">Options: ' + d.fieldOptions.map(function(o) { return esc(o); }).join(', ') + '</div>' : '';
    var deleteBtn = d.isBuiltIn ? '' :
      '<button onclick="deleteCustomField(\'' + esc(d.fieldKey) + '\')" class="px-2 py-1 text-xs rounded-lg border hover:bg-red-50 text-red-500 transition" title="Delete">🗑️</button>';
    return '<div class="p-4 border rounded-xl hover:shadow-sm transition">' +
      '<div class="flex items-center justify-between">' +
        '<div class="flex items-center gap-2">' +
          '<span>' + icon + '</span>' +
          '<span class="font-medium text-sm text-neutral-800">' + esc(d.fieldLabel) + '</span>' +
          '<span class="text-xs text-neutral-400">(' + esc(d.fieldKey) + ')</span>' +
          builtIn +
        '</div>' +
        '<div class="flex gap-1">' +
          '<span class="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold">' + esc(d.fieldType) + '</span>' +
          deleteBtn +
        '</div>' +
      '</div>' +
      opts +
    '</div>';
  }).join('');
}

export function showCustomFieldForm() {
  var modal = document.getElementById('cf-form-modal');
  if (!modal) return;

  modal.innerHTML =
    '<div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">' +
      '<h3 class="font-semibold text-lg mb-4">New Custom Field</h3>' +
      '<div class="space-y-4">' +
        '<div>' +
          '<label class="block text-xs font-medium text-neutral-600 mb-1">Field Label</label>' +
          '<input type="text" id="cf-label" placeholder="e.g. Arrival Date" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">' +
        '</div>' +
        '<div>' +
          '<label class="block text-xs font-medium text-neutral-600 mb-1">Field Key</label>' +
          '<input type="text" id="cf-key" placeholder="e.g. arrival_date" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-neutral-50">' +
          '<p class="text-[11px] text-neutral-400 mt-1">Auto-generated from label. Used in API and filters.</p>' +
        '</div>' +
        '<div>' +
          '<label class="block text-xs font-medium text-neutral-600 mb-1">Field Type</label>' +
          '<select id="cf-type" class="w-full px-4 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none" onchange="toggleCfOptions()">' +
            '<option value="text">Text</option>' +
            '<option value="date">Date</option>' +
            '<option value="number">Number</option>' +
            '<option value="select">Select (dropdown)</option>' +
          '</select>' +
        '</div>' +
        '<div id="cf-options-wrap" class="hidden">' +
          '<label class="block text-xs font-medium text-neutral-600 mb-1">Options (comma-separated)</label>' +
          '<input type="text" id="cf-options" placeholder="e.g. Airbnb, Booking.com, Direct, Walk-in" class="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">' +
        '</div>' +
      '</div>' +
      '<div class="flex gap-3 mt-6">' +
        '<button onclick="saveCustomField()" class="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-bold text-sm">Create</button>' +
        '<button onclick="closeCustomFieldForm()" class="px-6 py-2.5 border rounded-xl hover:bg-neutral-50 transition text-sm font-medium">Cancel</button>' +
      '</div>' +
    '</div>';

  modal.classList.remove('hidden');

  // Auto-generate key from label
  var labelInput = document.getElementById('cf-label');
  var keyInput = document.getElementById('cf-key');
  if (labelInput && keyInput) {
    labelInput.addEventListener('input', function() {
      keyInput.value = labelInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    });
  }
}
window.showCustomFieldForm = showCustomFieldForm;

export function toggleCfOptions() {
  var type = (document.getElementById('cf-type') || {}).value;
  var wrap = document.getElementById('cf-options-wrap');
  if (wrap) wrap.classList.toggle('hidden', type !== 'select');
}
window.toggleCfOptions = toggleCfOptions;

export function closeCustomFieldForm() {
  var modal = document.getElementById('cf-form-modal');
  if (modal) { modal.classList.add('hidden'); modal.innerHTML = ''; }
}
window.closeCustomFieldForm = closeCustomFieldForm;

export async function saveCustomField() {
  var label = (document.getElementById('cf-label') || {}).value;
  var key = (document.getElementById('cf-key') || {}).value;
  var type = (document.getElementById('cf-type') || {}).value;
  var optionsRaw = (document.getElementById('cf-options') || {}).value;

  if (!label || !key) { toast('Label and key are required', 'error'); return; }

  var body = {
    fieldKey: key,
    fieldLabel: label,
    fieldType: type,
    fieldOptions: type === 'select' ? optionsRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : null
  };

  try {
    await api('/contact-fields/definitions', { method: 'POST', body: body });
    toast('Field created');
    closeCustomFieldForm();
    await loadCustomFieldDefs();
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.saveCustomField = saveCustomField;

export async function deleteCustomField(key) {
  if (!confirm('Delete field "' + key + '"? This removes the definition but keeps existing values.')) return;
  try {
    await api('/contact-fields/definitions/' + key, { method: 'DELETE' });
    toast('Field deleted');
    await loadCustomFieldDefs();
  } catch (e) {
    toast(e.message, 'error');
  }
}
window.deleteCustomField = deleteCustomField;
