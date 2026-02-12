/**
 * Main Orchestrator
 * Imports all modules and exposes functions to global scope for HTML onclick handlers
 */

// Import utilities
import { api } from './api.js';
import { toast } from './toast.js';

// Import module functions
import { reloadConfig } from './modules/config.js';
import { initHelp } from './modules/help.js';
import { loadStatus, testAIProvider } from './modules/status.js';
import { showAddInstance, onPhoneInput, submitAddInstance, logoutInstance, removeInstance } from './modules/instances.js';
import {
  loadIntents,
  changeRouting,
  changeWorkflowId,
  toggleIntent,
  changeConfidence,
  deleteIntent,
  applyTemplate,
  saveCurrentAsCustom,
  deleteTemplate,
  submitSaveTemplate,
  showAddIntent,
  submitAddIntent
} from './modules/intent-router.js';
import { loadStaticReplies, editStaticReply } from './modules/knowledge.js';
import { loadWorkflow, editWorkflow } from './modules/workflows.js';
import { loadSettings, toggleProvider } from './modules/settings.js';
import { loadIntentManagerData } from './modules/intent-classifier.js';
import { loadFeedbackStats } from './modules/feedback.js';
import { loadIntentAccuracy } from './modules/intent-analytics.js';
import { loadPreview, sendPreviewMessage } from './modules/preview.js';

// Expose utilities to global scope
window.api = api;
window.toast = toast;

// Expose functions to global scope for HTML onclick handlers
window.reloadConfig = reloadConfig;
window.initHelp = initHelp;
window.loadStatus = loadStatus;
window.testAIProvider = testAIProvider;
window.showAddInstance = showAddInstance;
window.onPhoneInput = onPhoneInput;
window.submitAddInstance = submitAddInstance;
window.logoutInstance = logoutInstance;
window.removeInstance = removeInstance;
window.loadIntents = loadIntents;
window.changeRouting = changeRouting;
window.changeWorkflowId = changeWorkflowId;
window.toggleIntent = toggleIntent;
window.changeConfidence = changeConfidence;
window.deleteIntent = deleteIntent;
window.applyTemplate = applyTemplate;
window.saveCurrentAsCustom = saveCurrentAsCustom;
window.deleteTemplate = deleteTemplate;
window.submitSaveTemplate = submitSaveTemplate;
window.showAddIntent = showAddIntent;
window.submitAddIntent = submitAddIntent;
window.loadStaticReplies = loadStaticReplies;
window.editStaticReply = editStaticReply;
window.loadWorkflow = loadWorkflow;
window.editWorkflow = editWorkflow;
window.loadSettings = loadSettings;
window.toggleProvider = toggleProvider;
window.loadIntentManagerData = loadIntentManagerData;
window.loadFeedbackStats = loadFeedbackStats;
window.loadIntentAccuracy = loadIntentAccuracy;
window.loadPreview = loadPreview;
window.sendPreviewMessage = sendPreviewMessage;

console.log('[Main] Rainbow dashboard modules loaded successfully');
