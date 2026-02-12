/**
 * Shared Constants
 * Global constants used across multiple modules
 */

/**
 * Available intent routing actions
 * @type {string[]}
 */
const ACTIONS = ['static_reply', 'llm_reply', 'workflow'];

/**
 * Human-readable labels for actions
 * @type {Object.<string, string>}
 */
const ACTION_LABELS = {
  static_reply: 'Static Reply',
  llm_reply: 'LLM Reply',
  workflow: 'Workflow'
};

// Export constants to global scope
window.ACTIONS = ACTIONS;
window.ACTION_LABELS = ACTION_LABELS;
