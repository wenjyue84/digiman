/**
 * Responses Tab Loader
 *
 * Main loader for the Responses tab
 * Handles sub-tab initialization (Knowledge Base, Quick Replies, Workflows, System Messages)
 */

/**
 * Main loader for Responses tab
 * Handles sub-tab initialization
 * @param {string} subTab - Sub-tab to load ('knowledge-base', 'quick-replies', 'workflows', 'system-messages')
 */
export async function loadResponses(subTab = 'quick-replies') {
  // Ensure sub-tab content is visible
  if (typeof window.switchResponseTab === 'function') {
    window.switchResponseTab(subTab, false);
  }
}
