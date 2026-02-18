/**
 * chat-simulator-chunk.js — Lazy-loaded modules for the Chat Simulator tab
 * Extracted from module-registry.js (Phases 3-partial, 22, 24, 24b)
 * Also includes real-chat.js (self-registering) for live-simulation sub-tab
 */

import { switchSimulatorTab } from '/public/js/modules/chat-simulator-helpers.js';
import { loadChatSimulator } from '/public/js/modules/chat-simulator.js';

// real-chat.js self-registers window.loadRealChat etc. (used by live-simulation sub-tab)
import '/public/js/modules/real-chat.js';

import {
  loadWorkflowTestSteps,
  resetWorkflowTest,
  beginWorkflowTest,
  executeWorkflowStep,
  sendTestMessage,
  appendTestMessage,
  updateWorkflowTestSelect
} from '/public/js/modules/workflow-testing.js';

import {
  saveSessions,
  getCurrentSession,
  updateSessionTitle,
  renderSessionsList,
  switchToSession,
  createNewChat,
  deleteSession,
  clearCurrentChat,
  clearChat,
  renderChatMessages,
  loadPreview,
  toggleTokenPopover,
  toggleDevBadges
} from '/public/js/modules/chat-preview.js';

import { sendChatMessage, showQuickTestHistory, closeQuickTestHistory, clearQuickTestHistory } from '/public/js/modules/chat-send.js';

// Load testing-chunk eagerly so autotest panel buttons (toggleAutotest, showAutotestHistory, etc.)
// work when accessed from the Chat Simulator tab without visiting the Testing tab first
import '/public/js/module-chunks/testing-chunk.js';

// ─── Window globals ──────────────────────────────────────────────

window.switchSimulatorTab = switchSimulatorTab;
window.loadChatSimulator = loadChatSimulator;
window.loadWorkflowTestSteps = loadWorkflowTestSteps;
window.resetWorkflowTest = resetWorkflowTest;
window.beginWorkflowTest = beginWorkflowTest;
window.executeWorkflowStep = executeWorkflowStep;
window.sendTestMessage = sendTestMessage;
window.appendTestMessage = appendTestMessage;
window.updateWorkflowTestSelect = updateWorkflowTestSelect;
window.saveSessions = saveSessions;
window.getCurrentSession = getCurrentSession;
window.updateSessionTitle = updateSessionTitle;
window.renderSessionsList = renderSessionsList;
window.switchToSession = switchToSession;
window.createNewChat = createNewChat;
window.deleteSession = deleteSession;
window.clearCurrentChat = clearCurrentChat;
window.clearChat = clearChat;
window.renderChatMessages = renderChatMessages;
window.loadPreview = loadPreview;
window.sendChatMessage = sendChatMessage;
window.showQuickTestHistory = showQuickTestHistory;
window.closeQuickTestHistory = closeQuickTestHistory;
window.clearQuickTestHistory = clearQuickTestHistory;
window.toggleTokenPopover = toggleTokenPopover;
window.toggleDevBadges = toggleDevBadges;

console.log('[LazyChunk] Chat Simulator modules registered');
