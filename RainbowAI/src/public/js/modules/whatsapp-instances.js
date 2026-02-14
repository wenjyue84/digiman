/**
 * WhatsApp Instance Management Module
 * Handles WhatsApp instance CRUD operations (add, logout, remove)
 */

import { api, toast } from '../core/utils.js';

// Use global functions from legacy-functions.js
const closeModal = window.closeModal || ((id) => document.getElementById(id)?.classList.add('hidden'));
const showInstanceQR = window.showInstanceQR || (() => {});
const loadDashboard = window.loadDashboard || (() => {});
const loadStatus = window.loadStatus || (() => {});

/**
 * Show the "Add WhatsApp Instance" modal
 */
export function showAddInstance() {
  document.getElementById('add-inst-phone').value = '';
  document.getElementById('add-inst-label').value = '';
  document.getElementById('add-inst-phone-error').classList.add('hidden');
  document.getElementById('add-inst-preview').classList.add('hidden');
  document.getElementById('add-inst-submit').disabled = true;
  document.getElementById('add-instance-modal').classList.remove('hidden');
  document.getElementById('add-inst-phone').focus();
}

/**
 * Handle phone number input (validation, formatting, preview)
 * Malaysian phone numbers: 60 + 1XXXXXXXX (8-10 digits after country code)
 * @param {HTMLInputElement} el - Phone input element
 */
export function onPhoneInput(el) {
  // Remove non-digits
  el.value = el.value.replace(/\D/g, '');
  const raw = el.value;
  const errEl = document.getElementById('add-inst-phone-error');
  const previewEl = document.getElementById('add-inst-preview');
  const submitBtn = document.getElementById('add-inst-submit');

  // Auto-remove leading 0
  if (raw.startsWith('0')) {
    el.value = raw.slice(1);
    errEl.textContent = 'Leading 0 removed automatically';
    errEl.classList.remove('hidden', 'text-danger-500');
    errEl.classList.add('text-warning-600');
    setTimeout(() => errEl.classList.add('hidden'), 3000);
  }

  const phone = el.value;
  const fullNumber = '60' + phone;

  // Validation
  if (phone.length === 0) {
    errEl.classList.add('hidden');
    previewEl.classList.add('hidden');
    submitBtn.disabled = true;
    return;
  }

  if (!phone.startsWith('1')) {
    errEl.textContent = 'Malaysian mobile numbers start with 1';
    errEl.classList.remove('hidden', 'text-warning-600');
    errEl.classList.add('text-danger-500');
    previewEl.classList.add('hidden');
    submitBtn.disabled = true;
    return;
  }

  if (phone.length < 8 || phone.length > 10) {
    errEl.textContent = phone.length < 8 ? 'Number too short' : 'Number too long';
    errEl.classList.remove('hidden', 'text-warning-600');
    errEl.classList.add('text-danger-500');
    previewEl.classList.add('hidden');
    submitBtn.disabled = true;
    return;
  }

  // Valid phone number - show preview
  errEl.classList.add('hidden');
  const label = document.getElementById('add-inst-label').value.trim();
  document.getElementById('add-inst-preview-id').textContent = fullNumber;
  document.getElementById('add-inst-preview-label').textContent = label || 'WhatsApp +60' + phone;
  previewEl.classList.remove('hidden');
  submitBtn.disabled = false;
}

/**
 * Refresh WhatsApp instance list in the UI
 * Calls loadDashboard or loadStatus depending on which page is active
 */
export function refreshWhatsAppList() {
  if (document.getElementById('dashboard-wa-status')) loadDashboard();
  else if (document.getElementById('wa-instances')) loadStatus();
}

/**
 * Submit the "Add WhatsApp Instance" form
 * Creates a new instance and shows QR code for pairing
 * @param {Event} e - Form submit event
 */
export async function submitAddInstance(e) {
  e.preventDefault();
  const phone = document.getElementById('add-inst-phone').value.trim();
  const fullNumber = '60' + phone;
  const label = document.getElementById('add-inst-label').value.trim() || 'WhatsApp +60' + phone;

  try {
    await api('/whatsapp/instances', { method: 'POST', body: { id: fullNumber, label } });
    toast('Instance created: ' + label);
    closeModal('add-instance-modal');
    refreshWhatsAppList();
    // Show QR code modal after a short delay
    setTimeout(() => showInstanceQR(fullNumber, label), 500);
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Logout a WhatsApp instance
 * @param {string} id - Instance ID (phone number)
 */
export async function logoutInstance(id) {
  if (!confirm('Logout this WhatsApp instance?')) return;

  try {
    await api('/whatsapp/instances/' + encodeURIComponent(id) + '/logout', { method: 'POST' });
    toast('Instance logged out');
    refreshWhatsAppList();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Remove a WhatsApp instance
 * Shows a warning if this is the last instance on the system
 * @param {string} id - Instance ID (phone number)
 * @param {number} totalCount - Total number of instances (for warning)
 */
export async function removeInstance(id, totalCount) {
  let msg = 'Remove instance "' + id + '"?';

  // Warning for last instance
  if (totalCount === 1) {
    msg = '⚠️ WARNING: This is the LAST WhatsApp instance on this system.\n\n' +
      'If you remove it, Rainbow will NOT receive or reply to any guest messages until you add and pair a new number. Guests may be unable to reach the hostel.\n\n' +
      'Are you sure you want to remove it?';
  }

  if (!confirm(msg)) return;

  try {
    await api('/whatsapp/instances/' + encodeURIComponent(id), { method: 'DELETE' });
    toast('Instance removed');
    refreshWhatsAppList();
  } catch (e) {
    toast(e.message, 'error');
  }
}
