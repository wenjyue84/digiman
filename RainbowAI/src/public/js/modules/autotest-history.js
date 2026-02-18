/**
 * @fileoverview Autotest history and imported reports management
 * @module autotest-history
 */

// ─── State ─────────────────────────────────────────────────────────────
let autotestHistory = []; // Store history of test runs
let importedReports = []; // Store imported HTML reports

// ─── History Loading ───────────────────────────────────────────────────
/**
 * Load autotest history from localStorage on page load
 */
export async function loadAutotestHistory() {
  try {
    const saved = localStorage.getItem('rainbow-autotest-history');
    if (saved) {
      autotestHistory = JSON.parse(saved);
      // Keep only last 20 reports to avoid excessive storage
      if (autotestHistory.length > 20) {
        autotestHistory = autotestHistory.slice(-20);
        saveAutotestHistory();
      }
    }
  } catch (e) {
    console.error('Error loading autotest history:', e);
    autotestHistory = [];
  }

  // Load imported reports (async - scans for new reports)
  await loadImportedReports();
}

/**
 * Load imported reports from localStorage + scan for new reports
 */
export async function loadImportedReports() {
  try {
    const saved = localStorage.getItem('rainbow-imported-reports');
    if (saved) {
      importedReports = JSON.parse(saved);
    } else {
      // Initialize with existing report files
      importedReports = [
        {
          id: 'imported-2026-02-10-2017',
          filename: 'rainbow-autotest-2026-02-10-2017.html',
          timestamp: '2026-02-10T20:17:00.000Z',
          total: 34,
          passed: 9,
          warnings: 18,
          failed: 7,
          imported: true
        },
        {
          id: 'imported-2026-02-10-2025',
          filename: 'rainbow-autotest-2026-02-10-2025.html',
          timestamp: '2026-02-10T20:25:00.000Z',
          total: 34,
          passed: 9,
          warnings: 18,
          failed: 7,
          imported: true
        },
        {
          id: 'imported-2026-02-10-2042',
          filename: 'rainbow-autotest-2026-02-10-2042.html',
          timestamp: '2026-02-10T20:42:00.000Z',
          total: 34,
          passed: 14,
          warnings: 18,
          failed: 2,
          imported: true
        },
        {
          id: 'imported-2026-02-11-1648',
          filename: 'rainbow-autotest-2026-02-11-1648.html',
          timestamp: '2026-02-11T16:48:00.000Z',
          total: 38,
          passed: 38,
          warnings: 0,
          failed: 0,
          imported: true
        },
        {
          id: 'imported-2026-02-12-0954',
          filename: 'rainbow-autotest-2026-02-12-0954.html',
          timestamp: '2026-02-12T09:54:00.000Z',
          total: 38,
          passed: 38,
          warnings: 0,
          failed: 0,
          imported: true
        },
        {
          id: 'imported-2026-02-12-1010',
          filename: 'rainbow-autotest-2026-02-12-1010.html',
          timestamp: '2026-02-12T10:10:00.000Z',
          total: 38,
          passed: 38,
          warnings: 0,
          failed: 0,
          imported: true
        }
      ];
      saveImportedReports();
    }

    // Auto-import new reports from scripts/autotest/ directory
    try {
      const res = await fetch('/api/rainbow/autotest/reports');
      if (res.ok) {
        const availableFiles = await res.json();
        let newCount = 0;

        // Check for files not in importedReports
        for (const file of availableFiles) {
          const existingId = 'imported-' + file.id;
          if (!importedReports.find(r => r.id === existingId)) {
            importedReports.push({
              id: existingId,
              filename: file.filename,
              timestamp: file.timestamp,
              total: file.total || 0,
              passed: file.passed || 0,
              warnings: file.warnings || 0,
              failed: file.failed || 0,
              imported: true
            });
            newCount++;
          }
        }

        if (newCount > 0) {
          // Sort by timestamp descending (newest first)
          importedReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          // Keep only last 20
          if (importedReports.length > 20) {
            importedReports = importedReports.slice(0, 20);
          }
          saveImportedReports();
          console.log(`[Test History] Auto-imported ${newCount} new reports from scripts`);
        }
      }
    } catch (e) {
      // Silently fail if endpoint not available or server error
      console.warn('Could not auto-import reports:', e.message);
    }
  } catch (e) {
    console.error('Error loading imported reports:', e);
    importedReports = [];
  }
}

// ─── History Saving ────────────────────────────────────────────────────
/**
 * Save imported reports to localStorage
 */
export function saveImportedReports() {
  try {
    localStorage.setItem('rainbow-imported-reports', JSON.stringify(importedReports));
  } catch (e) {
    console.error('Error saving imported reports:', e);
  }
}

/**
 * Save autotest history to localStorage.
 * Stores only summary data (without full results array) to avoid quota errors.
 * Full results stay in-memory for within-session loadHistoricalReport.
 */
export function saveAutotestHistory() {
  try {
    const summaries = autotestHistory.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp,
      totalTime: entry.totalTime,
      passed: entry.passed,
      warnings: entry.warnings,
      failed: entry.failed,
      total: Array.isArray(entry.results) ? entry.results.length : (entry.total || 0)
    }));
    localStorage.setItem('rainbow-autotest-history', JSON.stringify(summaries));
  } catch (e) {
    console.error('Error saving autotest history:', e);
  }
}

// ─── UI Visibility Updates ─────────────────────────────────────────────
/**
 * Update history button visibility across all locations
 */
export function updateHistoryButtonVisibility() {
  const hasHistory = autotestHistory.length > 0 || importedReports.length > 0;
  const historyBtn = document.getElementById('view-history-btn');
  const historyBtnPreview = document.getElementById('view-history-btn-preview');

  // Always show the preview button (it's in the main view)
  // Show/hide based on whether history exists
  if (historyBtnPreview) {
    if (hasHistory) {
      historyBtnPreview.classList.remove('hidden');
      historyBtnPreview.disabled = false;
      historyBtnPreview.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      // Show but disabled if no history
      historyBtnPreview.classList.remove('hidden');
      historyBtnPreview.disabled = true;
      historyBtnPreview.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }

  // Autotest panel History button is always visible so users can view (or open empty) history even while a run is in progress
  if (historyBtn) {
    historyBtn.classList.remove('hidden');
  }
}

// ─── Exports for state access (read-only) ──────────────────────────────
/**
 * Get current autotest history (read-only)
 */
export function getAutotestHistory() {
  return [...autotestHistory];
}

/**
 * Get current imported reports (read-only)
 */
export function getImportedReports() {
  return [...importedReports];
}

/**
 * Add entry to autotest history
 */
export function addToAutotestHistory(entry) {
  autotestHistory.push(entry);
  if (autotestHistory.length > 20) {
    autotestHistory = autotestHistory.slice(-20);
  }
  saveAutotestHistory();
}

/**
 * Clear all history
 */
export function clearAutotestHistory() {
  autotestHistory = [];
  saveAutotestHistory();
  updateHistoryButtonVisibility();
}

/**
 * Clear imported reports
 */
export function clearImportedReports() {
  importedReports = [];
  saveImportedReports();
  updateHistoryButtonVisibility();
}
