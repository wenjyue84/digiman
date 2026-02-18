/**
 * testing-chunk.js — Lazy-loaded modules for the Automated Tests tab
 * Extracted from module-registry.js (Phases 30, 31, 32, 33) and main.js
 */

import {
  runTests, runCoverage, loadTesting,
  showVitestHistory, closeVitestHistory, clearVitestHistory,
  loadHistoricalVitestRun, exportHistoricalVitestRun,
  exportVitestReport, toggleVitestExportDropdown
} from '/public/js/modules/testing.js';

import {
  loadAutotestHistory,
  loadImportedReports,
  saveImportedReports,
  saveAutotestHistory,
  updateHistoryButtonVisibility,
  getAutotestHistory,
  getImportedReports,
  addToAutotestHistory,
  clearAutotestHistory,
  clearImportedReports
} from '/public/js/modules/autotest-history.js';

import {
  getRoutingForAutotest,
  getAutotestScenariosByAction,
  runAutotest,
  runScenario,
  validateScenario,
  evaluateRule,
  SCENARIO_ID_TO_INTENT,
  toggleAutotest,
  runAutotestWithFilter,
  toggleRunAllDropdown,
  closeRunAllDropdown,
  stopAutotest,
  testIntentClassifier
} from '/public/js/modules/autotest-execution.js';

import { AUTOTEST_SCENARIOS } from '/public/js/modules/autotest-scenarios.js';

import {
  renderScenarioCard,
  showAutotestHistory,
  closeAutotestHistory,
  openImportedReport,
  loadHistoricalReport,
  exportHistoricalReport,
  clearAutotestHistoryUI,
  toggleExportDropdown,
  exportAutotestReport
} from '/public/js/modules/autotest-ui.js';

// ─── Window globals ──────────────────────────────────────────────

// From main.js (testing.js exports)
window.runTests = runTests;
window.runCoverage = runCoverage;
window.loadTesting = loadTesting;
window.showVitestHistory = showVitestHistory;
window.closeVitestHistory = closeVitestHistory;
window.clearVitestHistory = clearVitestHistory;
window.loadHistoricalVitestRun = loadHistoricalVitestRun;
window.exportHistoricalVitestRun = exportHistoricalVitestRun;
window.exportVitestReport = exportVitestReport;
window.toggleVitestExportDropdown = toggleVitestExportDropdown;

// Phase 30: Autotest History Management
window.loadAutotestHistory = loadAutotestHistory;
window.loadImportedReports = loadImportedReports;
window.saveImportedReports = saveImportedReports;
window.saveAutotestHistory = saveAutotestHistory;
window.updateHistoryButtonVisibility = updateHistoryButtonVisibility;
window.getAutotestHistory = getAutotestHistory;
window.getImportedReports = getImportedReports;
window.addToAutotestHistory = addToAutotestHistory;
window.clearAutotestHistoryData = clearAutotestHistory;
window.clearImportedReports = clearImportedReports;

// Phase 31: Autotest Execution Core
window.getRoutingForAutotest = getRoutingForAutotest;
window.getAutotestScenariosByAction = getAutotestScenariosByAction;
window.runAutotest = runAutotest;
window.runScenario = runScenario;
window.validateScenario = validateScenario;
window.evaluateRule = evaluateRule;
window.SCENARIO_ID_TO_INTENT = SCENARIO_ID_TO_INTENT;
window.toggleAutotest = toggleAutotest;
window.runAutotestWithFilter = runAutotestWithFilter;
window.toggleRunAllDropdown = toggleRunAllDropdown;
window.closeRunAllDropdown = closeRunAllDropdown;
window.stopAutotest = stopAutotest;
window.testIntentClassifier = testIntentClassifier;

// Phase 32: Autotest Scenarios Data
window.AUTOTEST_SCENARIOS = AUTOTEST_SCENARIOS;

// Phase 33: Autotest UI (clearAutotestHistory overrides Phase 30's version)
window.renderScenarioCard = renderScenarioCard;
window.showAutotestHistory = showAutotestHistory;
window.closeAutotestHistory = closeAutotestHistory;
window.openImportedReport = openImportedReport;
window.loadHistoricalReport = loadHistoricalReport;
window.exportHistoricalReport = exportHistoricalReport;
window.clearAutotestHistory = clearAutotestHistoryUI;
window.toggleExportDropdown = toggleExportDropdown;
window.exportAutotestReport = exportAutotestReport;

// Load autotest history from localStorage on chunk load
// Must happen AFTER window registrations so autotest-ui.js auto-init can find them
loadAutotestHistory().then(() => {
  updateHistoryButtonVisibility();
});

console.log('[LazyChunk] Testing modules registered');
