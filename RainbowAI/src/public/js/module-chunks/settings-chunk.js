/**
 * settings-chunk.js — Lazy-loaded modules for the Settings tab
 * Extracted from module-registry.js (Phases 16, 23, 28)
 *
 * Note: settings-ai-models.js self-registers on window.* when imported by settings.js
 */

import {
  loadSettings,
  switchSettingsTab,
  renderFailoverTab,
  loadFailoverStatus,
  toggleHandbackGrace,
  saveFailoverSettings,
  failoverPromote,
  failoverDemote
} from '/public/js/modules/settings.js';

import {
  updateSystemAdminPhone,
  updateAdminNotifPrefs,
  renderOperatorsList,
  addOperator,
  removeOperator,
  updateOperatorField
} from '/public/js/modules/admin-notifications.js';

import {
  updateT4ProviderStatus,
  scrollToElement,
  scrollToProviders,
  loadLLMSettings,
  renderT4ProvidersList,
  toggleT4InactiveProviders,
  toggleT4Provider,
  moveT4Provider,
  autoSaveT4Providers,
  testT4Provider,
  saveLLMSettings
} from '/public/js/modules/llm-settings.js';

// ─── Window globals ──────────────────────────────────────────────

window.loadSettings = loadSettings;
window.switchSettingsTab = switchSettingsTab;
window.renderFailoverTab = renderFailoverTab;
window.loadFailoverStatus = loadFailoverStatus;
window.toggleHandbackGrace = toggleHandbackGrace;
window.saveFailoverSettings = saveFailoverSettings;
window.failoverPromote = failoverPromote;
window.failoverDemote = failoverDemote;
window.updateSystemAdminPhone = updateSystemAdminPhone;
window.updateAdminNotifPrefs = updateAdminNotifPrefs;
window.renderOperatorsList = renderOperatorsList;
window.addOperator = addOperator;
window.removeOperator = removeOperator;
window.updateOperatorField = updateOperatorField;
window.updateT4ProviderStatus = updateT4ProviderStatus;
window.scrollToElement = scrollToElement;
window.scrollToProviders = scrollToProviders;
window.loadLLMSettings = loadLLMSettings;
window.renderT4ProvidersList = renderT4ProvidersList;
window.toggleT4InactiveProviders = toggleT4InactiveProviders;
window.toggleT4Provider = toggleT4Provider;
window.moveT4Provider = moveT4Provider;
window.autoSaveT4Providers = autoSaveT4Providers;
window.testT4Provider = testT4Provider;
window.saveLLMSettings = saveLLMSettings;

console.log('[LazyChunk] Settings modules registered');
