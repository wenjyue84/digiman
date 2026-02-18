// ═══════════════════════════════════════════════════════════════════
// Live Chat Module - Orchestrator
// ═══════════════════════════════════════════════════════════════════
//
// Imports all sub-modules and wires window.* exports for template
// onclick handlers. Also registers global event listeners.
//
// Sub-modules:
//   live-chat-state.js   - Shared mutable state object
//   live-chat-core.js    - Connection, init, list/chat rendering
//   live-chat-actions.js - Send/reply, context menu, file attachment
//   live-chat-features.js - Translation, header menu, message search
//   live-chat-panels.js  - Filters, pin/fav, contacts, modes, toast
// ═══════════════════════════════════════════════════════════════════

import { $ } from './live-chat-state.js';
import {
  loadLiveChat, filterConversations, openConversation, refreshChat, resetDateFilter, debouncedSearch,
  cleanupLiveChat, editStaffName
} from './live-chat-core.js';
import {
  deleteChat, sendReply, toggleAttachMenu, pickFile, fileSelected, clearFile,
  autoResize, handleKeydown, cancelReply, closeForwardModal,
  toggleVoiceRecording, cancelVoiceRecording,
  onInputCmd, loadCmdTemplates, hideCmdPalette, cmdPaletteClick, cmdAddTemplate,
  loadWorkflows, showWorkflowPalette, hideWorkflowPalette, wfPaletteClick,
  toggleSchedulePopover, hideSchedulePopover, confirmSchedule, toggleRepeatEndDate,
  showScheduledPanel, closeScheduledPanel, cancelScheduled, editScheduled, updateScheduledBadge,
  showReconnectionModal, reconnectInstance, addNewWhatsApp, closeReconnectionModal
} from './live-chat-actions.js';
import {
  toggleTranslate, handleLangChange, closeTranslateModal, confirmTranslation,
  onInputTranslate, toggleSearch, msgSearchInput, msgSearchNav, msgSearchKeydown,
  toggleHeaderMenu, onMenuContactInfo, onMenuSearch,
  onMenuTranslate, onMenuMode, updateTranslateIndicator,
  toggleFlagMenu, selectLang
} from './live-chat-features.js';
import {
  setFilter, togglePinChat, toggleFavouriteChat, toggleMaximize,
  toggleContactPanel, contactFieldChanged, tagKeydown, removeTag,
  tagInput, selectTag, loadGlobalTags,
  toggleSidebarMenu, showStarredMessages, markAllAsRead,
  toggleChatDropdown, closeChatDropdown, markOneAsRead,
  setMode, toggleModeMenu, approveResponse, rejectApproval, dismissApproval, getAIHelp,
  toggleDateFilterPanel, clearChat, toggleWaStatusBar, restoreWaStatusBarState,
  initResizableDivider, toggleLanguageLock,
  generateAINotes, openGuestContext, closeContextModal, saveGuestContext,
  updateContextFilePath, mobileBack,
  toggleTagFilter, toggleTagSelection, clearTagFilter, loadContactTagsMap,
  loadContactUnitsMap, loadContactDatesMap,
  toggleUnitFilter, selectUnitFilter, clearUnitFilter,
  unitInput, selectUnit, unitKeydown, unitBlur, loadCapsuleUnits,
  loadPaymentReminder, setPaymentReminder, dismissReminder, snoozeReminder,
  refreshOverdueBell, showOverdueReminders, addOverdueBadgeToList
} from './live-chat-panels.js';

// ─── Window exports for template onclick handlers ────────────────

window.loadLiveChat = loadLiveChat;
window.cleanupLiveChat = cleanupLiveChat;
window.lcFilterConversations = filterConversations;
window.lcDebouncedSearch = debouncedSearch;
window.lcOpenConversation = openConversation;
window.lcRefreshChat = refreshChat;
window.lcDeleteChat = deleteChat;
window.lcResetDateFilter = resetDateFilter;
window.lcEditStaffName = editStaffName;
window.lcSendReply = sendReply;
window.lcToggleTranslate = toggleTranslate;
window.lcHandleLangChange = handleLangChange;
window.lcToggleFlagMenu = toggleFlagMenu;
window.lcSelectLang = selectLang;
window.lcCloseTranslateModal = closeTranslateModal;
window.lcConfirmTranslation = confirmTranslation;
window.lcAutoResize = autoResize;
window.lcHandleKeydown = handleKeydown;
window.lcToggleAttachMenu = toggleAttachMenu;
window.lcPickFile = pickFile;
window.lcFileSelected = fileSelected;
window.lcClearFile = clearFile;
window.lcToggleSearch = toggleSearch;
window.lcMsgSearchInput = msgSearchInput;
window.lcMsgSearchNav = msgSearchNav;
window.lcMsgSearchKeydown = msgSearchKeydown;
window.lcSetFilter = setFilter;
window.lcTogglePin = togglePinChat;
window.lcToggleFavourite = toggleFavouriteChat;
window.lcToggleMaximize = toggleMaximize;
window.lcToggleHeaderMenu = toggleHeaderMenu;
window.lcOnMenuContactInfo = onMenuContactInfo;
window.lcOnMenuSearch = onMenuSearch;
window.lcToggleContactPanel = toggleContactPanel;
window.lcContactFieldChanged = contactFieldChanged;
window.lcTagKeydown = tagKeydown;
window.lcRemoveTag = removeTag;
window.lcTagInput = tagInput;
window.lcSelectTag = selectTag;
window.lcLoadGlobalTags = loadGlobalTags;
window.lcCancelReply = cancelReply;
window.lcToggleVoiceRecording = toggleVoiceRecording;
window.lcCancelVoiceRecording = cancelVoiceRecording;
window.lcCloseForwardModal = closeForwardModal;
window.lcOnInputCmd = onInputCmd;
window.lcLoadCmdTemplates = loadCmdTemplates;
window.lcHideCmdPalette = hideCmdPalette;
window.lcCmdPaletteClick = cmdPaletteClick;
window.lcCmdAddTemplate = cmdAddTemplate;
window.lcLoadWorkflows = loadWorkflows;
window.lcShowWorkflowPalette = showWorkflowPalette;
window.lcHideWorkflowPalette = hideWorkflowPalette;
window.lcWfPaletteClick = wfPaletteClick;
window.lcToggleSchedulePopover = toggleSchedulePopover;
window.lcHideSchedulePopover = hideSchedulePopover;
window.lcConfirmSchedule = confirmSchedule;
window.lcShowScheduledPanel = showScheduledPanel;
window.lcCloseScheduledPanel = closeScheduledPanel;
window.lcCancelScheduled = cancelScheduled;
window.lcEditScheduled = editScheduled;
window.lcToggleRepeatEndDate = toggleRepeatEndDate;
window.lcOnInputTranslate = onInputTranslate;
window.lcToggleSidebarMenu = toggleSidebarMenu;
window.lcShowStarredMessages = showStarredMessages;
window.lcMarkAllAsRead = markAllAsRead;
window.lcToggleChatDropdown = toggleChatDropdown;
window.lcCloseChatDropdown = closeChatDropdown;
window.lcMarkOneAsRead = markOneAsRead;
window.lcSetMode = setMode;
window.lcToggleModeMenu = toggleModeMenu;
window.lcApproveResponse = approveResponse;
window.lcRejectApproval = rejectApproval;
window.lcDismissApproval = dismissApproval;
window.lcGetAIHelp = getAIHelp;
window.lcToggleDateFilterPanel = toggleDateFilterPanel;
window.lcToggleLanguageLock = toggleLanguageLock;
window.lcGenerateAINotes = generateAINotes;
window.lcOpenGuestContext = openGuestContext;
window.lcCloseContextModal = closeContextModal;
window.lcSaveGuestContext = saveGuestContext;
window.lcUpdateContextFilePath = updateContextFilePath;
window.lcMobileBack = mobileBack;
window.lcToggleTagFilter = toggleTagFilter;
window.lcToggleTagSelection = toggleTagSelection;
window.lcClearTagFilter = clearTagFilter;
window.lcLoadContactTagsMap = loadContactTagsMap;
window.lcLoadContactUnitsMap = loadContactUnitsMap;
window.lcLoadContactDatesMap = loadContactDatesMap;
window.lcToggleUnitFilter = toggleUnitFilter;
window.lcSelectUnitFilter = selectUnitFilter;
window.lcClearUnitFilter = clearUnitFilter;
window.lcUnitInput = unitInput;
window.lcSelectUnit = selectUnit;
window.lcUnitKeydown = unitKeydown;
window.lcUnitBlur = unitBlur;
window.lcLoadCapsuleUnits = loadCapsuleUnits;
window.lcSetPaymentReminder = setPaymentReminder;
window.lcDismissReminder = dismissReminder;
window.lcSnoozeReminder = snoozeReminder;
window.lcShowOverdueReminders = showOverdueReminders;
window.lcShowReconnectionModal = showReconnectionModal;
window.lcReconnectInstance = reconnectInstance;
window.lcAddNewWhatsApp = addNewWhatsApp;
window.lcCloseReconnectionModal = closeReconnectionModal;
window.lcOnMenuTranslate = onMenuTranslate;
window.lcOnMenuMode = onMenuMode;
window.lcOnMenuSetMode = function (mode) {
  var submenu = document.getElementById('lc-mode-submenu');
  if (submenu) submenu.style.display = 'none';
  var dropdown = document.getElementById('lc-header-dropdown');
  if (dropdown) dropdown.classList.remove('open');
  var btn = document.getElementById('lc-header-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  setMode(mode);
};
window.lcOnMenuClearChat = function () {
  var dropdown = document.getElementById('lc-header-dropdown');
  if (dropdown) dropdown.classList.remove('open');
  var btn = document.getElementById('lc-header-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  clearChat();
};
// US-077: Show/hide WA status tooltip on dot click
window.lcShowWaStatusTooltip = function (event) {
  event.stopPropagation();
  var tooltip = document.getElementById('lc-wa-tooltip');
  if (!tooltip) return;
  var isVisible = tooltip.style.display !== 'none';
  tooltip.style.display = isVisible ? 'none' : 'block';
};

// US-071: New chat button handler
window.lcNewChat = function () {
  // Focus the search input to start a new chat
  var searchInput = document.getElementById('lc-search');
  if (searchInput) {
    searchInput.focus();
    searchInput.value = '';
    filterConversations();
  }
};

// ─── Global Event Handlers ───────────────────────────────────────

// Escape key exits focus mode; when approval panel visible: Esc=Reject, Ctrl+Enter=Send
document.addEventListener('keydown', function (e) {
  var panel = document.getElementById('lc-approval-panel');
  var panelVisible = panel && panel.style.display !== 'none' && $.currentApprovalId;
  if (panelVisible) {
    if (e.key === 'Escape') {
      e.preventDefault();
      rejectApproval();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      approveResponse();
      return;
    }
  }
  if (e.key === 'Escape' && document.body.classList.contains('lc-maximized')) {
    toggleMaximize();
  }
});

// Close attach menu when clicking outside
document.addEventListener('click', function (e) {
  var menu = document.getElementById('lc-attach-menu');
  var btn = document.getElementById('lc-attach-btn');
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.style.display = 'none';
  }
  // Close header dropdown when clicking outside
  var wrap = document.querySelector('.lc-header-menu-wrap');
  var dropdown = document.getElementById('lc-header-dropdown');
  if (dropdown && dropdown.classList.contains('open') && wrap && !wrap.contains(e.target)) {
    // Import closeHeaderMenu inline to avoid adding another import
    dropdown.classList.remove('open');
    var menuBtn = document.getElementById('lc-header-menu-btn');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  }
  // Close mode dropdown when clicking outside
  var modeMenu = document.getElementById('lc-mode-dropdown');
  var modeBtn = document.getElementById('lc-mode-btn');
  if (modeMenu && modeBtn && !modeMenu.contains(e.target) && !modeBtn.contains(e.target)) {
    modeMenu.style.display = 'none';
  }
  // Close WA status tooltip when clicking outside (US-077)
  var waTooltip = document.getElementById('lc-wa-tooltip');
  var waDot = document.getElementById('lc-wa-dot');
  if (waTooltip && waTooltip.style.display !== 'none' && waDot && !waDot.contains(e.target) && !waTooltip.contains(e.target)) {
    waTooltip.style.display = 'none';
  }
  // Close mode submenu when clicking outside
  var modeSubmenu = document.getElementById('lc-mode-submenu');
  var submenuWrap = document.querySelector('.lc-header-dropdown-submenu-wrap');
  if (modeSubmenu && submenuWrap && !submenuWrap.contains(e.target)) {
    modeSubmenu.style.display = 'none';
  }
  // US-008: Close tag autocomplete dropdown when clicking outside
  var tagDropdown = document.getElementById('lc-tag-dropdown');
  var tagInput = document.getElementById('lc-cd-tag-input');
  if (tagDropdown && tagDropdown.style.display !== 'none' && tagInput && !tagDropdown.contains(e.target) && !tagInput.contains(e.target)) {
    tagDropdown.style.display = 'none';
  }
  // US-010: Close unit dropdown when clicking outside
  var unitDropdown = document.getElementById('lc-unit-dropdown');
  var unitInput = document.getElementById('lc-cd-unit');
  if (unitDropdown && unitDropdown.style.display !== 'none' && unitInput && !unitDropdown.contains(e.target) && !unitInput.contains(e.target)) {
    unitDropdown.style.display = 'none';
  }
  // US-009: Close tag filter dropdown when clicking outside
  var tagFilterDd = document.getElementById('lc-tag-filter-dropdown');
  var tagFilterBtn = document.getElementById('lc-tag-filter-btn');
  if (tagFilterDd && tagFilterDd.style.display !== 'none' && tagFilterBtn && !tagFilterDd.contains(e.target) && !tagFilterBtn.contains(e.target)) {
    tagFilterDd.style.display = 'none';
  }
  // US-013: Close unit filter dropdown when clicking outside
  var unitFilterDd = document.getElementById('lc-unit-filter-dropdown');
  var unitFilterBtn = document.getElementById('lc-unit-filter-btn');
  if (unitFilterDd && unitFilterDd.style.display !== 'none' && unitFilterBtn && !unitFilterDd.contains(e.target) && !unitFilterBtn.contains(e.target)) {
    unitFilterDd.style.display = 'none';
  }
  // US-015: Close command palette when clicking outside
  var cmdPalette = document.getElementById('lc-cmd-palette');
  var cmdInput = document.getElementById('lc-input-box');
  if (cmdPalette && cmdPalette.style.display !== 'none' && cmdInput && !cmdPalette.contains(e.target) && !cmdInput.contains(e.target)) {
    hideCmdPalette();
  }
  // US-020: Close schedule popover when clicking outside
  var schedPop = document.getElementById('lc-schedule-popover');
  var schedBtn = document.getElementById('lc-schedule-btn');
  if (schedPop && schedPop.style.display !== 'none' && schedBtn && !schedPop.contains(e.target) && !schedBtn.contains(e.target)) {
    hideSchedulePopover();
  }
});

// ─── Resizable divider (US-072) ─────────────────────────────────
// NOTE: initResizableDivider() is called inside loadLiveChat() after
// the template HTML is injected into the DOM by tabs.js.
