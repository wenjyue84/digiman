/**
 * Admin Notification Settings Module
 * Manages system admin phone, notification preferences, and operator escalation list
 */

import { api, toast } from '../core/utils.js';

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
  } catch (e) {
    toast(e.message, 'error');
  }
}

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
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Render operators list UI
 */
export function renderOperatorsList() {
  const container = document.getElementById('operators-list');
  if (!container || !window.currentOperators) return;

  if (window.currentOperators.length === 0) {
    container.innerHTML = `
      <div class="text-center text-neutral-500 py-4 text-sm">
        No operators configured. Click "Add Operator" to get started.
      </div>
    `;
    return;
  }

  container.innerHTML = window.currentOperators.map((op, index) => `
    <div class="bg-white border rounded-lg p-3 flex items-center gap-3">
      <div class="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
        ${index + 1}
      </div>
      <div class="flex-1 grid grid-cols-3 gap-2">
        <input
          type="tel"
          placeholder="Phone (60XXXXXXXXX)"
          value="${op.phone || ''}"
          onchange="updateOperatorField(${index}, 'phone', this.value)"
          class="px-2 py-1 border rounded text-sm"
        />
        <input
          type="text"
          placeholder="Label"
          value="${op.label || ''}"
          onchange="updateOperatorField(${index}, 'label', this.value)"
          class="px-2 py-1 border rounded text-sm"
        />
        <input
          type="number"
          min="1"
          max="60"
          placeholder="Fallback (min)"
          value="${op.fallbackMinutes || 5}"
          onchange="updateOperatorField(${index}, 'fallbackMinutes', parseInt(this.value))"
          class="px-2 py-1 border rounded text-sm"
        />
      </div>
      <button
        onclick="removeOperator(${index})"
        class="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition flex items-center justify-center"
        title="Remove operator"
      >
        ×
      </button>
    </div>
  `).join('');
}

/**
 * Add a new operator to the list
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

/**
 * Remove an operator from the list
 * @param {number} index - Operator index
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

/**
 * Update a specific operator field
 * @param {number} index - Operator index
 * @param {string} field - Field name (phone, label, fallbackMinutes)
 * @param {any} value - New value
 */
export function updateOperatorField(index, field, value) {
  if (!window.currentOperators || !window.currentOperators[index]) return;

  window.currentOperators[index][field] = value;
  saveOperators();
}

/**
 * Save operators list to API
 */
async function saveOperators() {
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
