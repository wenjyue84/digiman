/**
 * module-registry.js — ES Module bridge to global scope
 * (Single Responsibility: import all tab modules and expose them as window globals)
 *
 * Required because tabs.js and HTML onclick handlers use global function calls,
 * but all new modules are ES6 modules. This file bridges the two worlds.
 */

// Phase 1: Trivial Loaders
import { loadWhatsappAccounts } from '/public/js/modules/whatsapp-accounts.js';
import { loadUnderstanding } from '/public/js/modules/understanding.js';
import { loadPerformance } from '/public/js/modules/performance.js';

// Phase 2: Dashboard Helpers
import {
  restartServer,
  runDashboardProviderSpeedTest,
  initActivityStream,
  disconnectActivityStream,
  toggleActivityExpand
} from '/public/js/modules/dashboard-helpers.js';

// Phase 3: Medium Complexity Loaders
import { loadStaticTemplates } from '/public/js/modules/responses-helpers.js';
import { switchSimulatorTab } from '/public/js/modules/chat-simulator-helpers.js';
import { loadResponses } from '/public/js/modules/responses.js';
import { loadChatSimulator } from '/public/js/modules/chat-simulator.js';

// Phase 4: Complex Loaders
import { loadSystemStatus, testAIProvider } from '/public/js/modules/system-status.js';
import {
  loadDashboard,
  dismissChecklist,
  quickActionAddWhatsApp,
  quickActionTrainIntent,
  quickActionTestChat,
  refreshDashboard
} from '/public/js/modules/dashboard.js';

// Phase 5: Intents & Routing Tab
import {
  loadIntents,
  changeRouting,
  changeWorkflowId,
  toggleIntent,
  toggleTimeSensitive,
  changeConfidence,
  deleteIntent
} from '/public/js/modules/intents.js';

// Phase 6: Routing Templates Module
import {
  buildSmartestRouting,
  buildPerformanceRouting,
  buildBalancedRouting,
  routingMatchesTemplate,
  getSavedTemplates,
  saveTemplates,
  renderTemplateButtons,
  showIntentsTemplateHelp,
  detectActiveTemplate,
  applyTemplate,
  showSaveTemplateModal,
  submitSaveTemplate,
  deleteTemplate as deleteRoutingTemplate,
  saveCurrentAsCustom
} from '/public/js/modules/routing-templates.js';

// Phase 7: Responses CRUD Module
import {
  editKnowledgeStatic,
  cancelEditKnowledge,
  saveKnowledgeStatic,
  deleteKnowledge,
  showAddKnowledge,
  submitAddKnowledge,
  showGenerateByLLMModal,
  showGenerateByLLMModalWithIntent,
  closeGenerateByLLMModal,
  callGenerateDraft,
  approveGeneratedReply,
  generateAIReply,
  editTemplate,
  cancelEditTemplate,
  saveTemplate,
  deleteTemplate as deleteMessageTemplate,
  showAddTemplate,
  submitAddTemplate
} from '/public/js/modules/responses-crud.js';

// Phase 8: WhatsApp Instance Management Module
import {
  showAddInstance,
  onPhoneInput,
  refreshWhatsAppList,
  submitAddInstance,
  logoutInstance,
  removeInstance
} from '/public/js/modules/whatsapp-instances.js';

// Phase 9: Static Replies Filter Module
import {
  filterStaticReplies,
  filterStaticCategory
} from '/public/js/modules/responses-filter.js';

// Phase 10: Intent Management Helpers Module
import {
  showAddIntent,
  onAddIntentRoutingChange,
  submitAddIntent,
  testClassifier
} from '/public/js/modules/intent-helpers.js';

// Phase 11: Regex Patterns Module
import {
  loadRegexPatterns,
  renderRegexPatterns,
  addRegexPattern,
  removeRegexPattern,
  saveRegexPatterns
} from '/public/js/modules/regex-patterns.js';

// Phase 12: Translation Helpers Module
import {
  translateQuickReplyFields,
  translateInlineEditPanel
} from '/public/js/modules/translation-helpers.js';

// Phase 13: Response Tab Switcher Module
import {
  switchResponseTab
} from '/public/js/modules/responses-tab-switcher.js';

// Phase 14: Feedback Settings Module
import {
  toggleFeedbackSettings,
  onFeedbackSettingChange,
  saveFeedbackSettings
} from '/public/js/modules/feedback-settings.js';

// Phase 15: Performance Stats Module
import {
  loadFeedbackStats,
  refreshFeedbackStats,
  loadIntentAccuracy,
  refreshIntentAccuracy,
  refreshPerformanceData
} from '/public/js/modules/performance-stats.js';

// Phase 16: Admin Notification Settings Module
import {
  updateSystemAdminPhone,
  updateAdminNotifPrefs,
  renderOperatorsList,
  addOperator,
  removeOperator,
  updateOperatorField
} from '/public/js/modules/admin-notifications.js';

// Phase 17: Staff Review Module
import {
  loadStaffReview,
  markPredictionCorrect,
  showCorrectionDropdown,
  submitCorrection,
  refreshStaffReview
} from '/public/js/modules/staff-review.js';

// Phase 18: Status Tab Module
import {
  loadStatus
} from '/public/js/modules/status.js';

// ─── Expose to global scope ────────────────────────────────────────
// Required by tabs.js and onclick handlers in HTML templates

window.loadWhatsappAccounts = loadWhatsappAccounts;
window.loadUnderstanding = loadUnderstanding;
window.loadPerformance = loadPerformance;
window.restartServer = restartServer;
window.runDashboardProviderSpeedTest = runDashboardProviderSpeedTest;
window.initActivityStream = initActivityStream;
window.disconnectActivityStream = disconnectActivityStream;
window.toggleActivityExpand = toggleActivityExpand;
window.loadStaticTemplates = loadStaticTemplates;
window.editTemplate = editTemplate;
window.switchSimulatorTab = switchSimulatorTab;
window.loadResponses = loadResponses;
window.loadChatSimulator = loadChatSimulator;
window.loadSystemStatus = loadSystemStatus;
window.testAIProvider = testAIProvider;
window.loadDashboard = loadDashboard;
window.dismissChecklist = dismissChecklist;
window.quickActionAddWhatsApp = quickActionAddWhatsApp;
window.quickActionTrainIntent = quickActionTrainIntent;
window.quickActionTestChat = quickActionTestChat;
window.refreshDashboard = refreshDashboard;
window.loadIntents = loadIntents;
window.changeRouting = changeRouting;
window.changeWorkflowId = changeWorkflowId;
window.toggleIntent = toggleIntent;
window.toggleTimeSensitive = toggleTimeSensitive;
window.changeConfidence = changeConfidence;
window.deleteIntent = deleteIntent;
window.renderTemplateButtons = renderTemplateButtons;
window.showIntentsTemplateHelp = showIntentsTemplateHelp;
window.detectActiveTemplate = detectActiveTemplate;
window.applyTemplate = applyTemplate;
window.showSaveTemplateModal = showSaveTemplateModal;
window.submitSaveTemplate = submitSaveTemplate;
window.deleteTemplate = deleteRoutingTemplate;
window.saveCurrentAsCustom = saveCurrentAsCustom;
window.editKnowledgeStatic = editKnowledgeStatic;
window.cancelEditKnowledge = cancelEditKnowledge;
window.saveKnowledgeStatic = saveKnowledgeStatic;
window.deleteKnowledge = deleteKnowledge;
window.showAddKnowledge = showAddKnowledge;
window.submitAddKnowledge = submitAddKnowledge;
window.showGenerateByLLMModal = showGenerateByLLMModal;
window.showGenerateByLLMModalWithIntent = showGenerateByLLMModalWithIntent;
window.closeGenerateByLLMModal = closeGenerateByLLMModal;
window.callGenerateDraft = callGenerateDraft;
window.approveGeneratedReply = approveGeneratedReply;
window.generateAIReply = generateAIReply;
window.editTemplate = editTemplate;
window.cancelEditTemplate = cancelEditTemplate;
window.saveTemplate = saveTemplate;
window.deleteMessageTemplate = deleteMessageTemplate;
window.showAddTemplate = showAddTemplate;
window.submitAddTemplate = submitAddTemplate;
window.showAddInstance = showAddInstance;
window.onPhoneInput = onPhoneInput;
window.refreshWhatsAppList = refreshWhatsAppList;
window.submitAddInstance = submitAddInstance;
window.logoutInstance = logoutInstance;
window.removeInstance = removeInstance;
window.filterStaticReplies = filterStaticReplies;
window.filterStaticCategory = filterStaticCategory;
window.showAddIntent = showAddIntent;
window.onAddIntentRoutingChange = onAddIntentRoutingChange;
window.submitAddIntent = submitAddIntent;
window.testClassifier = testClassifier;
window.loadRegexPatterns = loadRegexPatterns;
window.renderRegexPatterns = renderRegexPatterns;
window.addRegexPattern = addRegexPattern;
window.removeRegexPattern = removeRegexPattern;
window.saveRegexPatterns = saveRegexPatterns;
window.translateQuickReplyFields = translateQuickReplyFields;
window.translateInlineEditPanel = translateInlineEditPanel;
window.switchResponseTab = switchResponseTab;
window.toggleFeedbackSettings = toggleFeedbackSettings;
window.onFeedbackSettingChange = onFeedbackSettingChange;
window.saveFeedbackSettings = saveFeedbackSettings;
window.loadFeedbackStats = loadFeedbackStats;
window.refreshFeedbackStats = refreshFeedbackStats;
window.loadIntentAccuracy = loadIntentAccuracy;
window.refreshIntentAccuracy = refreshIntentAccuracy;
window.refreshPerformanceData = refreshPerformanceData;
window.updateSystemAdminPhone = updateSystemAdminPhone;
window.updateAdminNotifPrefs = updateAdminNotifPrefs;
window.renderOperatorsList = renderOperatorsList;
window.addOperator = addOperator;
window.removeOperator = removeOperator;
window.updateOperatorField = updateOperatorField;
window.loadStaffReview = loadStaffReview;
window.markPredictionCorrect = markPredictionCorrect;
window.showCorrectionDropdown = showCorrectionDropdown;
window.submitCorrection = submitCorrection;
window.refreshStaffReview = refreshStaffReview;
// Phase 18: Status Tab
window.loadStatus = loadStatus;
