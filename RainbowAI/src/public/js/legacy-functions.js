// Note: Core + High-isolation modules (Testing, Real Chat, KB Editor) loaded from external files
// Remaining inline code will be refactored in phases 4-6

// ─── Modal helpers ──────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ─── Reload Config ──────────────────────────────────────────────────
async function reloadConfig() {
  try {
    await api('/reload', { method: 'POST' });
    toast('Config reloaded from disk');
    const activeTab = document.querySelector('.tab-active')?.dataset.tab || 'dashboard';
    loadTab(activeTab);
  } catch (e) { toast(e.message, 'error'); }
}


// ═════════════════════════════════════════════════════════════════════
// Status Tab — EXTRACTED to modules/status.js (Phase 18)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// WhatsApp Instance Management — EXTRACTED to modules/whatsapp-instances.js (Phase 8)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Intents & Routing Tab — EXTRACTED to modules/intents.js (Phase 5)
// ═════════════════════════════════════════════════════════════════════
// Intent Management Helpers — EXTRACTED to modules/intent-helpers.js (Phase 10)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Routing Templates — EXTRACTED to modules/routing-templates.js (Phase 6)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Static Messages Tab — EXTRACTED to modules/static-messages.js (Phase 19)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Translation Helpers — EXTRACTED to modules/translation-helpers.js (Phase 12)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Responses CRUD — EXTRACTED to modules/responses-crud.js (Phase 7)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Static Replies Filter — EXTRACTED to modules/responses-filter.js (Phase 9)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Settings Tab — EXTRACTED to modules/settings.js (Phase 28)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Admin Notification Settings — EXTRACTED to modules/admin-notifications.js (Phase 16)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Workflow Tab — EXTRACTED to modules/workflows.js (Phase 29)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Preview Tab — EXTRACTED to modules/chat-preview.js (Phase 24)
// ═════════════════════════════════════════════════════════════════════
// Chat Message Handler — EXTRACTED to modules/chat-message-handler.js (Phase 25)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Inline Edit Functions — EXTRACTED to modules/inline-edit.js (Phase 20)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Autotest Functions
// ═════════════════════════════════════════════════════════════════════

let lastAutotestResults = null;
let autotestRunning = false;
let autotestAbortRequested = false;
let autotestHistory = []; // Store history of test runs
let importedReports = []; // Store imported HTML reports

// ─── History Management Functions ──────────────────────────────────────
// EXTRACTED to modules/autotest-history.js (Phase 30):
// - loadAutotestHistory()
// - loadImportedReports()
// - saveImportedReports()
// - saveAutotestHistory()
// - updateHistoryButtonVisibility()
// NOTE: State variables (autotestHistory, importedReports) remain here temporarily
// for other autotest functions. Will be refactored in future phases.

// ─── Scenario Definitions ──────────────────────────────────────────
// EXTRACTED to modules/autotest-scenarios.js (Phase 32):
// - AUTOTEST_SCENARIOS constant (~1,150 lines of test scenario data)

// ─── Test Execution Core Functions ─────────────────────────────────
// EXTRACTED to modules/autotest-execution.js (Phase 31):
// - SCENARIO_ID_TO_INTENT, getRoutingForAutotest, getAutotestScenariosByAction
// - runAutotest, runScenario, validateScenario, evaluateRule
// and global state variables for now. Will be refactored in future phases.

// ─── Autotest UI Functions ────────────────────────────────────────
// EXTRACTED to modules/autotest-ui.js (Phase 33):
// - renderScenarioCard, showAutotestHistory, closeAutotestHistory,
// - openImportedReport, loadHistoricalReport, exportHistoricalReport,
// - clearAutotestHistory, toggleExportDropdown, exportAutotestReport, escHtml
// Intent Manager — EXTRACTED to modules/intent-manager.js (Phase 34)
// DOMContentLoaded init moved to autotest-ui.js and intent-manager.js
// ═════════════════════════════════════════════════════════════════════
// Dashboard Templates — EXTRACTED to modules/dashboard-templates.js (Phase 35)
// Intent Templates (T1-T7) + Settings Templates (T1-T5) + all template functions
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Regex Patterns — EXTRACTED to modules/regex-patterns.js (Phase 11)
// ═════════════════════════════════════════════════════════════════════

// ─── T4: LLM Settings Management — EXTRACTED to modules/llm-settings.js (Phase 23) ───

// ═════════════════════════════════════════════════════════════════════
// Workflow Testing — EXTRACTED to modules/workflow-testing.js (Phase 22)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Performance Stats — EXTRACTED to modules/performance-stats.js (Phase 15)
// ═════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════
// Feedback Settings — EXTRACTED to modules/feedback-settings.js (Phase 14/21)
// ═════════════════════════════════════════════════════════════════════



// ═════════════════════════════════════════════════════════════════════
// Utils
// ═════════════════════════════════════════════════════════════════════
function esc(s) { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
function css(s) { return String(s).replace(/[^a-zA-Z0-9_-]/g, '_'); }
function truncate(s, n) { return s.length > n ? s.slice(0, n) + '...' : s; }

// ─── Init ───────────────────────────────────────────────────────────
// Add Enter key handler for workflow test input
setTimeout(() => {
  const testInput = document.getElementById('test-user-input');
  if (testInput) {
    testInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !testInput.disabled) {
        sendTestMessage();
      }
    });
  }
}, 100);

// switchTab/getTabFromURL removed - tabs.js handles initialization via loadTab/initTabs
// Alias switchTab to loadTab for onclick handlers in templates
window.switchTab = function (tab) { if (window.loadTab) window.loadTab(tab); };

// ═════════════════════════════════════════════════════════════════════
// Response Tab Switcher — EXTRACTED to modules/responses-tab-switcher.js (Phase 13)
// ═════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// NEW TAB LOADER FUNCTIONS (Redesign - 2026-02-12)
// ═══════════════════════════════════════════════════════════════

/**
 * Load Testing tab
 */
async function loadTesting() {
  // Initialize test runner (existing testing tab functionality)
  console.log('[Testing] Tab loaded');
}

// Export to global scope
window.loadTesting = loadTesting;
// NOTE: toggleFeedbackSettings, onFeedbackSettingChange, saveFeedbackSettings
// are now exposed via module-registry.js (Phase 14 feedback-settings.js module)

// ─── Development Auto-Reload ────────────────────────────────────────
// Check for updates every 2 seconds in development mode
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  let lastCheck = Date.now();
  setInterval(() => {
    fetch(window.location.href, {
      method: 'HEAD',
      cache: 'no-cache',
      headers: { 'Cache-Control': 'no-cache' }
    }).then(response => {
      const lastModified = response.headers.get('Last-Modified');
      if (lastModified) {
        const serverTime = new Date(lastModified).getTime();
        if (serverTime > lastCheck) {
          console.log('[Dev] Page updated, reloading...');
          window.location.reload();
        }
      }
    }).catch(() => {
      // Silently fail - server might be restarting
    });
  }, 2000);
}

