/**
 * responses-chunk.js — Lazy-loaded modules for the Responses tab
 * Extracted from module-registry.js (Phases 3-partial, 7, 9, 12, 13, 19, 20, 27, 37)
 */

import { loadStaticTemplates } from '/public/js/modules/responses-helpers.js';
import { loadResponses } from '/public/js/modules/responses.js';

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
  submitAddTemplate,
  translateAllIntents
} from '/public/js/modules/responses-crud.js';

import {
  filterStaticReplies,
  filterStaticCategory,
  filterSystemMessages,
  filterWorkflows,
  filterKBFiles
} from '/public/js/modules/responses-filter.js';

import {
  translateQuickReplyFields,
  translateInlineEditPanel
} from '/public/js/modules/translation-helpers.js';

import {
  switchResponseTab
} from '/public/js/modules/responses-tab-switcher.js';

import {
  loadStaticReplies,
  dismissBanner,
  restoreBanner,
  restoreAllBanners,
  toggleDismissedPanel
} from '/public/js/modules/static-messages.js';

import {
  toggleInlineEdit,
  saveInlineEdit
} from '/public/js/modules/inline-edit.js';

import {
  loadWorkflow,
  renderWorkflowList,
  hideWorkflowEditor,
  selectWorkflow,
  renderSteps,
  updateStepMessage,
  updateStepWait,
  addStep,
  removeStep,
  moveStep,
  saveCurrentWorkflow,
  createWorkflow,
  deleteCurrentWorkflow,
  renderAdvancedSettings,
  saveAdvancedWorkflow,
  switchWorkflowFormat,
  renderNodes,
  addNode,
  removeNode,
  moveNode,
  updateNodeField,
  updateNodeConfig,
  updateNodeConfigJSON,
  updateNodeNext,
  updateNodeOutput,
  updateStartNodeId,
  exportWorkflowJSON,
  importWorkflowJSON,
} from '/public/js/modules/workflows.js';

import {
  initPrismaBot,
  showPrismaBotFab,
  hidePrismaBotFab,
  togglePrismaBotPanel,
  sendPrismaBotMessage,
  importPrismaBotWorkflow,
  copyPrismaBotWorkflow,
  clearPrismaBotChat
} from '/public/js/modules/prisma-bot.js';

// kb-editor.js self-registers on window.*
import '/public/js/modules/kb-editor.js';

// ─── Window globals ──────────────────────────────────────────────

window.loadStaticTemplates = loadStaticTemplates;
window.loadResponses = loadResponses;
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
window.translateAllIntents = translateAllIntents;
window.filterStaticReplies = filterStaticReplies;
window.filterStaticCategory = filterStaticCategory;
window.filterSystemMessages = filterSystemMessages;
window.filterWorkflows = filterWorkflows;
window.filterKBFiles = filterKBFiles;
window.translateQuickReplyFields = translateQuickReplyFields;
window.translateInlineEditPanel = translateInlineEditPanel;
window.switchResponseTab = switchResponseTab;
window.loadStaticReplies = loadStaticReplies;
window.dismissBanner = dismissBanner;
window.restoreBanner = restoreBanner;
window.restoreAllBanners = restoreAllBanners;
window.toggleDismissedPanel = toggleDismissedPanel;
window.toggleInlineEdit = toggleInlineEdit;
window.saveInlineEdit = saveInlineEdit;
window.loadWorkflow = loadWorkflow;
window.renderWorkflowList = renderWorkflowList;
window.hideWorkflowEditor = hideWorkflowEditor;
window.selectWorkflow = selectWorkflow;
window.renderSteps = renderSteps;
window.updateStepMessage = updateStepMessage;
window.updateStepWait = updateStepWait;
window.addStep = addStep;
window.removeStep = removeStep;
window.moveStep = moveStep;
window.saveCurrentWorkflow = saveCurrentWorkflow;
window.createWorkflow = createWorkflow;
window.deleteCurrentWorkflow = deleteCurrentWorkflow;
window.renderAdvancedSettings = renderAdvancedSettings;
window.saveAdvancedWorkflow = saveAdvancedWorkflow;
window.exportWorkflowJSON = exportWorkflowJSON;
window.importWorkflowJSON = importWorkflowJSON;
window.switchWorkflowFormat = switchWorkflowFormat;
window.renderNodes = renderNodes;
window.addNode = addNode;
window.removeNode = removeNode;
window.moveNode = moveNode;
window.updateNodeField = updateNodeField;
window.updateNodeConfig = updateNodeConfig;
window.updateNodeConfigJSON = updateNodeConfigJSON;
window.updateNodeNext = updateNodeNext;
window.updateNodeOutput = updateNodeOutput;
window.updateStartNodeId = updateStartNodeId;
window.initPrismaBot = initPrismaBot;
window.showPrismaBotFab = showPrismaBotFab;
window.hidePrismaBotFab = hidePrismaBotFab;
window.togglePrismaBotPanel = togglePrismaBotPanel;
window.sendPrismaBotMessage = sendPrismaBotMessage;
window.importPrismaBotWorkflow = importPrismaBotWorkflow;
window.copyPrismaBotWorkflow = copyPrismaBotWorkflow;
window.clearPrismaBotChat = clearPrismaBotChat;

console.log('[LazyChunk] Responses modules registered');
