/**
 * WhatsApp Instance Management Module
 * Handles adding, removing, and managing WhatsApp instances
 */

import { api } from '../api.js';
import { toast } from '../toast.js';

/**
 * Show add instance modal
 * Initializes form and displays modal for adding a new WhatsApp instance
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
 * Handle phone number input validation and formatting
 * @param {HTMLInputElement} el - Phone input element
 */
export function onPhoneInput(el) {
  el.value = el.value.replace(/\D/g, '');
  const raw = el.value;
  const errEl = document.getElementById('add-inst-phone-error');
  const previewEl = document.getElementById('add-inst-preview');
  const submitBtn = document.getElementById('add-inst-submit');

  if (raw.startsWith('0')) {
    el.value = raw.slice(1);
    errEl.textContent = 'Leading 0 removed automatically';
    errEl.classList.remove('hidden', 'text-danger-500');
    errEl.classList.add('text-warning-600');
    setTimeout(() => errEl.classList.add('hidden'), 3000);
  }

  const phone = el.value;
  const fullNumber = '60' + phone;

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

  errEl.classList.add('hidden');
  const label = document.getElementById('add-inst-label').value.trim();
  document.getElementById('add-inst-preview-id').textContent = fullNumber;
  document.getElementById('add-inst-preview-label').textContent = label || 'WhatsApp +60' + phone;
  previewEl.classList.remove('hidden');
  submitBtn.disabled = false;
}

/**
 * Submit new WhatsApp instance
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
    loadStatus();
    setTimeout(() => showInstanceQR(fullNumber, label), 500);
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Logout WhatsApp instance
 * @param {string} id - Instance ID
 */
export async function logoutInstance(id) {
  if (!confirm('Logout this WhatsApp instance?')) return;
  try {
    await api('/whatsapp/instances/' + encodeURIComponent(id) + '/logout', { method: 'POST' });
    toast('Instance logged out');
    loadStatus();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/**
 * Remove WhatsApp instance
 * @param {string} id - Instance ID
 */
export async function removeInstance(id) {
  if (!confirm('Remove instance "' + id + '"?')) return;
  try {
    await api('/whatsapp/instances/' + encodeURIComponent(id), { method: 'DELETE' });
    toast('Instance removed');
    loadStatus();
  } catch (e) {
    toast(e.message, 'error');
  }
}
