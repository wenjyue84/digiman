/**
 * Modal Helper Functions
 * Generic modal management utilities
 */

// Global QR refresh interval tracking
let qrRefreshInterval = null;

/**
 * Close a modal by ID
 * @param {string} id - Modal element ID
 */
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

/**
 * Open a modal by ID
 * @param {string} id - Modal element ID
 */
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

/**
 * Show QR code modal for WhatsApp instance pairing
 * @param {string} id - Instance ID
 * @param {string} label - Instance display label
 */
function showInstanceQR(id, label) {
  document.getElementById('qr-modal-label').textContent = label;
  document.getElementById('qr-modal-content').innerHTML = '<div class="spinner mx-auto"></div>';
  document.getElementById('qr-modal').classList.remove('hidden');
  if (qrRefreshInterval) clearInterval(qrRefreshInterval);

  async function fetchQR() {
    try {
      const d = await api('/whatsapp/instances/' + encodeURIComponent(id) + '/qr');
      const el = document.getElementById('qr-modal-content');
      if (d.state === 'open') {
        el.innerHTML = '<p class="text-success-600 font-medium py-4">Connected!</p>';
        clearInterval(qrRefreshInterval);
        loadStatus();
      } else if (d.qrDataUrl) {
        el.innerHTML = `<img src="${d.qrDataUrl}" class="w-64 h-64 mx-auto" />`;
      } else {
        el.innerHTML = '<p class="text-neutral-500 text-sm py-4">Waiting for QR code...</p>';
      }
    } catch (e) {
      document.getElementById('qr-modal-content').innerHTML = `<p class="text-danger-500 text-sm">Error: ${e.message}</p>`;
      clearInterval(qrRefreshInterval);
    }
  }
  fetchQR();
  qrRefreshInterval = setInterval(fetchQR, 5000);
}

/**
 * Close QR code modal and stop refresh interval
 */
function closeQRModal() {
  document.getElementById('qr-modal').classList.add('hidden');
  if (qrRefreshInterval) {
    clearInterval(qrRefreshInterval);
    qrRefreshInterval = null;
  }
}

/**
 * Show save template modal
 */
function showSaveTemplateModal() {
  document.getElementById('save-template-modal').classList.remove('hidden');
  document.getElementById('save-template-name').value = '';
  document.getElementById('save-template-name').focus();
}

// Export functions to global scope (for HTML onclick handlers)
window.closeModal = closeModal;
window.openModal = openModal;
window.showInstanceQR = showInstanceQR;
window.closeQRModal = closeQRModal;
window.showSaveTemplateModal = showSaveTemplateModal;
