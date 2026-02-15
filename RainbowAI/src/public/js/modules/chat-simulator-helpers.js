/**
 * Chat Simulator Tab Helper Functions
 *
 * Utilities for the Chat Simulator tab:
 * - Sub-tab switching (Quick Test / Live Simulation)
 * - Tab state management
 */

/**
 * Switch between sub-tabs in the Chat Simulator tab
 * @param {string} tabName - 'quick-test' or 'live-simulation'
 * @param {boolean} updateHash - Whether to update the URL hash (default: true)
 */
export function switchSimulatorTab(tabName, updateHash = true) {
  // Update hash if requested
  if (updateHash) {
    const newHash = `chat-simulator/${tabName}`;
    if (window.location.hash.slice(1) !== newHash) {
      history.replaceState(null, '', '#' + newHash);
    }
  }

  // Hide all simulator tab contents
  document.querySelectorAll('.simulator-tab-content').forEach(content => {
    content.classList.add('hidden');
  });

  // Remove active state from all simulator tab buttons
  const tabs = ['tab-quick-test', 'tab-live-simulation'];
  tabs.forEach(tabId => {
    const btn = document.getElementById(tabId);
    if (btn) {
      btn.classList.remove('text-primary-600', 'border-b-2', 'border-primary-500', 'bg-primary-50');
      btn.classList.add('text-neutral-600', 'hover:text-neutral-800', 'hover:bg-neutral-50');
    }
  });

  // Show selected content
  const content = document.getElementById(`${tabName}-content`);
  if (content) {
    content.classList.remove('hidden');
  }

  // Reload Real Chat if switching to that tab (restarts auto-refresh)
  if (tabName === 'live-simulation' && typeof window.loadRealChat === 'function') {
    window.loadRealChat();
  }

  // Highlight active button
  const button = document.getElementById(`tab-${tabName}`);
  if (button) {
    button.classList.remove('text-neutral-600', 'hover:text-neutral-800', 'hover:bg-neutral-50');
    button.classList.add('text-primary-600', 'border-b-2', 'border-primary-500', 'bg-primary-50');
  }
}
