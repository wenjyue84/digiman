/**
 * Responses Tab Switcher Module
 * Handles sub-tab navigation within the Responses tab
 */

/**
 * Switch between sub-tabs in the Responses tab
 * Sub-tabs: knowledge-base, quick-replies, workflows, system-messages
 * @param {string} tabName - Sub-tab name
 * @param {boolean} updateHash - Whether to update URL hash
 */
export function switchResponseTab(tabName, updateHash = true) {
  // Update hash if requested
  if (updateHash) {
    const newHash = `responses/${tabName}`;
    if (window.location.hash.slice(1) !== newHash) {
      history.replaceState(null, '', '#' + newHash);
    }
  }

  // Hide all response tab contents
  document.querySelectorAll('.response-tab-content').forEach(content => {
    content.classList.add('hidden');
  });

  // Remove active state from all response tab buttons
  document.querySelectorAll('[data-response-tab]').forEach(btn => {
    btn.classList.remove('text-primary-600', 'border-primary-500');
    btn.classList.add('text-neutral-500', 'border-transparent');
  });

  // Show selected content (ID format: ${tabName}-tab)
  const content = document.getElementById(`${tabName}-tab`);
  if (content) {
    content.classList.remove('hidden');
  }

  // Highlight active button
  const button = document.querySelector(`[data-response-tab="${tabName}"]`);
  if (button) {
    button.classList.remove('text-neutral-500', 'border-transparent');
    button.classList.add('text-primary-600', 'border-primary-500');
  }

  // Initialize specific tab logic
  if (tabName === 'knowledge-base') {
    if (window.loadKB) window.loadKB();
  } else if (tabName === 'quick-replies') {
    if (window.loadStaticReplies) window.loadStaticReplies();
  } else if (tabName === 'workflows') {
    if (window.loadWorkflow) window.loadWorkflow();
  } else if (tabName === 'system-messages') {
    if (window.loadStaticTemplates) window.loadStaticTemplates();
  }

  // Show/hide Prisma Bot FAB (only on workflows sub-tab)
  if (tabName === 'workflows') {
    if (window.showPrismaBotFab) window.showPrismaBotFab();
  } else {
    if (window.hidePrismaBotFab) window.hidePrismaBotFab();
  }
}
