/**
 * @fileoverview Shared report utilities for test history and export
 * @module report-utils
 *
 * Provides reusable helpers for:
 * - localStorage-backed history stores (with max item limits)
 * - HTML blob download (for exporting reports)
 * - History card rendering (consistent UI across autotest + vitest)
 */

import { escapeHtml } from './utils.js';

/**
 * Create a localStorage-backed history store with max item limit.
 *
 * @param {string} storageKey - localStorage key name
 * @param {number} [maxItems=20] - Maximum number of records to keep
 * @returns {{ save(record: object): void, load(): object[], clear(): void }}
 */
export function createHistoryStore(storageKey, maxItems = 20) {
  return {
    save(record) {
      const items = this.load();
      items.unshift(record);
      if (items.length > maxItems) items.length = maxItems;
      try {
        localStorage.setItem(storageKey, JSON.stringify(items));
      } catch (e) {
        console.warn('[report-utils] Failed to save history:', e.message);
      }
    },
    load() {
      try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    },
    clear() {
      localStorage.removeItem(storageKey);
    }
  };
}

/**
 * Download an HTML string as a file via Blob + temporary anchor click.
 *
 * @param {string} html - Full HTML document string
 * @param {string} filename - Download filename (e.g., "report-2026-02-15.html")
 */
export function downloadHtmlBlob(html, filename) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Render a list of history cards as an HTML string.
 * Works for both autotest and vitest history entries.
 *
 * @param {object[]} reports - Array of history records
 * @param {object} opts
 * @param {function(object): void} [opts.onClickFn] - Global function name for card click
 * @param {function(object): void} [opts.onExportFn] - Global function name for export click
 * @param {function(object): string} opts.statsLine - Returns the stats HTML for a card
 * @returns {string} HTML string of history cards
 */
export function renderHistoryCards(reports, opts = {}) {
  if (!reports || reports.length === 0) {
    return '<div class="text-center text-neutral-400 py-12">' +
      '<p>No test history available</p>' +
      '<p class="text-xs mt-1">Run tests to start building history</p>' +
      '</div>';
  }

  return reports.map(report => {
    const date = new Date(report.timestamp);
    const total = report.numTotalTests ?? report.total ?? 0;
    const passed = report.numPassedTests ?? report.passed ?? 0;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    const passColor = passRate >= 75 ? 'text-green-600' : passRate >= 50 ? 'text-yellow-600' : 'text-red-600';

    const statsHtml = opts.statsLine ? opts.statsLine(report) : '';
    const clickAttr = opts.onClickFn ? ' onclick="' + opts.onClickFn + '(' + report.id + ')"' : '';
    const exportAttr = opts.onExportFn
      ? '<button onclick="event.stopPropagation(); ' + opts.onExportFn + '(' + report.id + ')" class="text-xs text-indigo-500 hover:text-indigo-600 transition">Export &rarr;</button>'
      : '';

    return '<div class="bg-white border border-neutral-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition cursor-pointer"' + clickAttr + '>' +
      '<div class="flex items-start justify-between mb-2">' +
        '<div class="flex-1">' +
          '<div class="flex items-center gap-2 mb-1">' +
            '<span class="font-semibold text-neutral-800">' +
              escapeHtml(date.toLocaleDateString()) + ' at ' + escapeHtml(date.toLocaleTimeString()) +
            '</span>' +
            (report.project ? '<span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">' + escapeHtml(report.project) + '</span>' : '') +
          '</div>' +
          '<div class="flex gap-4 text-sm">' + statsHtml + '</div>' +
        '</div>' +
        '<div class="flex flex-col items-end gap-1">' +
          '<span class="text-sm font-semibold ' + passColor + '">' + passRate + '% pass</span>' +
          exportAttr +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}
