/**
 * Feedback Settings Module
 * Manages guest feedback prompt configuration and UI
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

// All available intent categories
const ALL_INTENTS = [
  'greeting', 'thanks', 'contact_staff', 'pricing', 'availability', 'booking',
  'directions', 'facilities_info', 'rules_policy', 'payment_info', 'payment_made',
  'checkin_info', 'checkout_info', 'check_in_arrival', 'lower_deck_preference',
  'wifi', 'facility_orientation', 'climate_control_complaint', 'noise_complaint',
  'cleanliness_complaint', 'facility_malfunction', 'card_locked', 'theft_report',
  'general_complaint_in_stay', 'extra_amenity_request', 'tourist_guide',
  'checkout_procedure', 'late_checkout_request', 'luggage_storage', 'billing_inquiry',
  'forgot_item_post_checkout', 'post_checkout_complaint', 'billing_dispute',
  'review_feedback', 'general', 'unknown', 'escalate', 'acknowledgment'
];

// Module-level state
let fbSettingsOpen = false;
let fbSettingsLoaded = false;
let fbOriginalSettings = null;

/**
 * Toggle feedback settings panel visibility
 */
export function toggleFeedbackSettings() {
  fbSettingsOpen = !fbSettingsOpen;
  var panel = document.getElementById('fb-settings-panel');
  var chevron = document.getElementById('fb-settings-chevron');
  if (fbSettingsOpen) {
    panel.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
    if (!fbSettingsLoaded) loadFeedbackSettings_();
  } else {
    panel.classList.add('hidden');
    chevron.style.transform = '';
  }
}

/**
 * Load feedback settings from API
 * Populates form with current settings
 */
async function loadFeedbackSettings_() {
  try {
    document.getElementById('fb-settings-loading').classList.remove('hidden');
    document.getElementById('fb-settings-form').classList.add('hidden');

    var res = await api('/feedback/settings');
    var s = res.settings;
    fbOriginalSettings = JSON.parse(JSON.stringify(s));
    fbSettingsLoaded = true;

    // Populate form
    document.getElementById('fb-enabled').checked = s.enabled;
    document.getElementById('fb-frequency').value = s.frequency_minutes;
    document.getElementById('fb-timeout').value = s.timeout_minutes;
    document.getElementById('fb-prompt-en').value = s.prompts.en;
    document.getElementById('fb-prompt-ms').value = s.prompts.ms;
    document.getElementById('fb-prompt-zh').value = s.prompts.zh;

    // Build skip intents checkboxes
    var skipSet = new Set(s.skip_intents || []);
    var container = document.getElementById('fb-skip-intents');
    container.innerHTML = ALL_INTENTS.map(function (intent) {
      var checked = skipSet.has(intent) ? ' checked' : '';
      var label = intent.replace(/_/g, ' ');
      return '<label class="flex items-center gap-1.5 text-xs cursor-pointer py-0.5">' +
        '<input type="checkbox" class="fb-skip-intent w-3.5 h-3.5 rounded border-neutral-300 text-primary-500 focus:ring-primary-500" data-intent="' + esc(intent) + '"' + checked + ' onchange="onFeedbackSettingChange()">' +
        '<span class="text-neutral-700 truncate" title="' + esc(intent) + '">' + esc(label) + '</span>' +
        '</label>';
    }).join('');

    // Update status badge
    updateFbStatusBadge(s.enabled);

    document.getElementById('fb-settings-loading').classList.add('hidden');
    document.getElementById('fb-settings-form').classList.remove('hidden');

    // Reset dirty state
    document.getElementById('fb-settings-dirty').classList.add('hidden');
    document.getElementById('fb-save-btn').disabled = true;
  } catch (err) {
    console.error('[Feedback Settings] Load failed:', err);
    document.getElementById('fb-settings-loading').innerHTML =
      '<div class="text-red-500 text-sm">Failed to load feedback settings</div>';
    toast('Failed to load feedback settings', 'error');
  }
}

/**
 * Get current feedback settings from form
 * @returns {object} Current settings
 */
function getCurrentFbSettings() {
  var skipIntents = [];
  document.querySelectorAll('.fb-skip-intent:checked').forEach(function (el) {
    skipIntents.push(el.dataset.intent);
  });
  return {
    enabled: document.getElementById('fb-enabled').checked,
    frequency_minutes: parseInt(document.getElementById('fb-frequency').value) || 30,
    timeout_minutes: parseInt(document.getElementById('fb-timeout').value) || 2,
    skip_intents: skipIntents,
    prompts: {
      en: document.getElementById('fb-prompt-en').value,
      ms: document.getElementById('fb-prompt-ms').value,
      zh: document.getElementById('fb-prompt-zh').value
    }
  };
}

/**
 * Handle feedback setting change (detect dirty state)
 */
export function onFeedbackSettingChange() {
  if (!fbOriginalSettings) return;
  var current = getCurrentFbSettings();
  var changed = JSON.stringify(current) !== JSON.stringify(fbOriginalSettings);
  document.getElementById('fb-settings-dirty').classList.toggle('hidden', !changed);
  document.getElementById('fb-save-btn').disabled = !changed;
  updateFbStatusBadge(current.enabled);
}

/**
 * Update feedback status badge (enabled/disabled)
 * @param {boolean} enabled - Whether feedback is enabled
 */
function updateFbStatusBadge(enabled) {
  var badge = document.getElementById('fb-settings-status');
  if (enabled) {
    badge.textContent = 'Enabled';
    badge.className = 'text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700';
  } else {
    badge.textContent = 'Disabled';
    badge.className = 'text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500';
  }
}

/**
 * Save feedback settings to API
 */
export async function saveFeedbackSettings() {
  try {
    var btn = document.getElementById('fb-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    var settings = getCurrentFbSettings();
    await api('/feedback/settings', { method: 'PATCH', body: settings });

    fbOriginalSettings = JSON.parse(JSON.stringify(settings));
    document.getElementById('fb-settings-dirty').classList.add('hidden');
    btn.textContent = 'Save Settings';
    toast('Feedback settings saved (hot-reloaded)', 'success');
  } catch (err) {
    console.error('[Feedback Settings] Save failed:', err);
    toast('Failed to save feedback settings: ' + err.message, 'error');
    document.getElementById('fb-save-btn').disabled = false;
    document.getElementById('fb-save-btn').textContent = 'Save Settings';
  }
}
