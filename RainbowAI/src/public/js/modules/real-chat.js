// ═══════════════════════════════════════════════════════════════════
// Real Chat Module - Orchestrator
// ═══════════════════════════════════════════════════════════════════
//
// Imports all sub-modules and wires window.* exports for template
// onclick handlers.
//
// Sub-modules:
//   real-chat-state.js      - Shared mutable state object
//   real-chat-core.js       - Init, dev mode, connection, list/chat rendering
//   real-chat-messaging.js  - Translation, send/reply, input, file attachment
//   real-chat-editor.js     - Edit modals, training examples
// ═══════════════════════════════════════════════════════════════════

import {
  toggleDevMode, toggleRcSearch, loadRealChat,
  filterConversations, openConversation,
  toggleMetaDetails, toggleDevPanel, deleteActiveChat,
  cleanup as cleanupRealChat,
  setRcFilter, toggleRcTagDropdown, toggleRcTag, toggleRcUnitDropdown, setRcUnit
} from './real-chat-core.js';
import {
  toggleTranslateMode, handleLangChange,
  closeTranslateModal, confirmTranslation,
  sendManualReply, sendOriginalMessage, refreshActiveChat,
  autoResizeInput, handleInputKeydown,
  toggleRcAttachMenu, pickRcFile, rcFileSelected, clearRcFile,
  toggleRcDateJump, jumpToRcDate,
  toggleRcSchedule, updateRcSchedulePreview, confirmRcSchedule
} from './real-chat-messaging.js';
import {
  openRcEditModal, closeRcEditModal, saveRcEdit,
  openAddToTrainingExampleModal, closeAddToTrainingExampleModal,
  confirmAddToTrainingExample
} from './real-chat-editor.js';

// ─── Window exports for template onclick handlers ────────────────

window.loadRealChat = loadRealChat;
window.toggleDevMode = toggleDevMode;
window.toggleRcSearch = toggleRcSearch;
window.toggleTranslateMode = toggleTranslateMode;
window.handleLangChange = handleLangChange;
window.toggleMetaDetails = toggleMetaDetails;
window.toggleDevPanel = toggleDevPanel;
window.closeTranslateModal = closeTranslateModal;
window.confirmTranslation = confirmTranslation;
window.filterConversations = filterConversations;
window.refreshActiveChat = refreshActiveChat;
window.deleteActiveChat = deleteActiveChat;
window.sendManualReply = sendManualReply;
window.autoResizeInput = autoResizeInput;
window.handleInputKeydown = handleInputKeydown;
window.openConversation = openConversation;
window.openRcEditModal = openRcEditModal;
window.closeRcEditModal = closeRcEditModal;
window.saveRcEdit = saveRcEdit;
window.openAddToTrainingExampleModal = openAddToTrainingExampleModal;
window.closeAddToTrainingExampleModal = closeAddToTrainingExampleModal;
window.confirmAddToTrainingExample = confirmAddToTrainingExample;
window.toggleRcAttachMenu = toggleRcAttachMenu;
window.pickRcFile = pickRcFile;
window.rcFileSelected = rcFileSelected;
window.clearRcFile = clearRcFile;
window.toggleRcDateJump = toggleRcDateJump;
window.jumpToRcDate = jumpToRcDate;
window.cleanupRealChat = cleanupRealChat;
// US-015: Filter chips + schedule message (mirrors live-chat features)
window.setRcFilter = setRcFilter;
window.toggleRcTagDropdown = toggleRcTagDropdown;
window.toggleRcTag = toggleRcTag;
window.toggleRcUnitDropdown = toggleRcUnitDropdown;
window.setRcUnit = setRcUnit;
window.toggleRcSchedule = toggleRcSchedule;
window.updateRcSchedulePreview = updateRcSchedulePreview;
window.confirmRcSchedule = confirmRcSchedule;
