/**
 * @fileoverview Autotest UI — scenario card rendering, history modal, and report export
 * @module autotest-ui
 */

// ─── Utility ─────────────────────────────────────────────────────────────
function esc(s) { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Render Scenario Card ────────────────────────────────────────────────

export function renderScenarioCard(result) {
  const s = result.scenario;
  const statusColors = { pass: 'bg-green-500', warn: 'bg-yellow-500', fail: 'bg-red-500' };
  const statusLabels = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
  const catColors = {
    'Core Info': 'bg-blue-100 text-blue-700',
    'Booking Flow': 'bg-purple-100 text-purple-700',
    'Problems': 'bg-orange-100 text-orange-700',
    'Multilingual': 'bg-teal-100 text-teal-700',
    'Edge Cases': 'bg-red-100 text-red-700'
  };

  const passedRules = result.ruleResults.filter(r => r.passed).length;
  const totalRules = result.ruleResults.length;

  let turnsHtml = '';
  if (result.turns) {
    for (let i = 0; i < result.turns.length; i++) {
      const t = result.turns[i];
      const srcLabels = { 'regex': '🚨 Priority Keywords', 'fuzzy': '⚡ Smart Matching', 'semantic': '📚 Learning Examples', 'llm': '🤖 AI Fallback' };
      const srcColors = { 'regex': 'bg-red-50 text-red-700', 'fuzzy': 'bg-yellow-50 text-yellow-700', 'semantic': 'bg-purple-50 text-purple-700', 'llm': 'bg-blue-50 text-blue-700' };
      const srcLabel = t.source ? (srcLabels[t.source] || t.source) : '';
      const srcColor = srcColors[t.source] || 'bg-neutral-100 text-neutral-700';
      const mtIcons = { 'info': 'ℹ️', 'problem': '⚠️', 'complaint': '🔴' };
      const mtColors = { 'info': 'bg-green-50 text-green-700', 'problem': 'bg-orange-50 text-orange-700', 'complaint': 'bg-red-50 text-red-700' };
      const kbBadges = t.kbFiles && t.kbFiles.length > 0
        ? '<div class="flex items-center gap-1 flex-wrap mt-1"><span class="text-neutral-400">📂</span>' + t.kbFiles.map(f => '<span class="px-1 py-0.5 bg-violet-50 text-violet-700 rounded font-mono text-xs">' + esc(f) + '</span>').join('') + '</div>'
        : '';
      turnsHtml += '<div class="mb-3">'
        + '<div class="flex justify-end mb-1">'
        + '<div class="bg-indigo-500 text-white rounded-2xl px-3 py-1.5 text-xs max-w-xs">' + esc(t.userMessage) + '</div>'
        + '</div>'
        + '<div class="flex justify-start mb-1">'
        + '<div class="bg-white border rounded-2xl px-3 py-1.5 text-xs max-w-sm">'
        + '<div class="whitespace-pre-wrap">' + esc(t.response) + '</div>'
        + '<div class="mt-1 pt-1 border-t flex flex-wrap gap-1 items-center text-xs text-neutral-500">'
        + (t.source ? '<span class="px-1 py-0.5 ' + srcColor + ' rounded font-medium text-xs">' + srcLabel + '</span>' : '')
        + (t.intent ? '<span class="px-1 py-0.5 bg-primary-50 text-primary-700 rounded font-mono text-xs">' + esc(t.intent) + '</span>' : '')
        + (t.routedAction ? '<span class="px-1 py-0.5 bg-success-50 text-success-700 rounded text-xs">' + esc(t.routedAction) + '</span>' : '')
        + (t.messageType ? '<span class="px-1 py-0.5 ' + (mtColors[t.messageType] || 'bg-green-50 text-green-700') + ' rounded font-medium text-xs">' + (mtIcons[t.messageType] || 'ℹ️') + ' ' + t.messageType + '</span>' : '')
        + (t.model ? '<span class="px-1 py-0.5 bg-purple-50 text-purple-700 rounded font-mono text-xs">' + esc(t.model) + '</span>' : '')
        + (t.responseTime ? '<span class="px-1 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">' + (t.responseTime >= 1000 ? (t.responseTime / 1000).toFixed(1) + 's' : t.responseTime + 'ms') + '</span>' : '')
        + (t.confidence ? '<span class="text-xs">' + (t.confidence * 100).toFixed(0) + '%</span>' : '')
        + '</div>'
        + kbBadges
        + '</div></div></div>';
    }
  }

  let rulesHtml = '';
  for (const r of result.ruleResults) {
    const icon = r.passed ? '✅' : (r.rule.critical ? '❌' : '⚠️');
    rulesHtml += '<div class="flex items-start gap-2 text-xs py-0.5">'
      + '<span>' + icon + '</span>'
      + '<span class="' + (r.passed ? 'text-green-700' : r.rule.critical ? 'text-red-700' : 'text-yellow-700') + '">'
      + '<b>' + r.rule.type + '</b>' + (r.turn !== undefined ? ' (turn ' + r.turn + ')' : '') + ': ' + esc(r.detail)
      + '</span></div>';
  }

  return '<div class="border rounded-2xl overflow-hidden">'
    + '<button onclick="this.nextElementSibling.classList.toggle(\'hidden\')" class="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 transition text-left">'
    + '<div class="w-3 h-3 rounded-full ' + (statusColors[result.status] || 'bg-neutral-400') + ' flex-shrink-0"></div>'
    + '<div class="flex-1 min-w-0"><span class="font-medium text-sm text-neutral-800">' + esc(s.name) + '</span></div>'
    + '<span class="px-2 py-0.5 ' + (catColors[s.category] || 'bg-neutral-100 text-neutral-700') + ' rounded text-xs flex-shrink-0">' + esc(s.category) + '</span>'
    + '<span class="text-xs text-neutral-500 flex-shrink-0">' + (result.time / 1000).toFixed(1) + 's</span>'
    + '<span class="text-xs font-medium ' + (result.status === 'pass' ? 'text-green-600' : result.status === 'warn' ? 'text-yellow-600' : 'text-red-600') + ' flex-shrink-0">' + statusLabels[result.status] + '</span>'
    + '<span class="text-xs text-neutral-400 flex-shrink-0">' + passedRules + '/' + totalRules + '</span>'
    + '</button>'
    + '<div class="hidden border-t bg-neutral-50 px-4 py-3">'
    + '<div class="mb-3">' + turnsHtml + '</div>'
    + '<div class="border-t pt-2"><p class="text-xs font-medium text-neutral-600 mb-1">Validation Rules:</p>' + rulesHtml + '</div>'
    + '</div></div>';
}

// ─── Autotest History UI ─────────────────────────────────────────────────

export function showAutotestHistory() {
  const modal = document.getElementById('autotest-history-modal');
  const listEl = document.getElementById('autotest-history-list');

  if (!modal || !listEl) return;

  const historyArr = window.getAutotestHistory ? window.getAutotestHistory() : [];
  const importedArr = window.getImportedReports ? window.getImportedReports() : [];

  // Combine and sort all reports by timestamp (newest first)
  const allReports = [
    ...historyArr.map(r => ({ ...r, source: 'local' })),
    ...importedArr.map(r => ({ ...r, source: 'imported' }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (allReports.length === 0) {
    listEl.innerHTML = '<div class="text-center text-neutral-400 py-12">'
      + '<p>No test history available</p>'
      + '<p class="text-xs mt-1">Run tests to start building history</p>'
      + '</div>';
  } else {
    listEl.innerHTML = allReports.map((report) => {
      const date = new Date(report.timestamp);
      // total: use report.total (summary key) or results.length (in-memory) or report.results?.length
      const total = report.source === 'imported'
        ? (report.total || 0)
        : (report.total || (Array.isArray(report.results) ? report.results.length : 0));
      const passRate = total > 0 ? ((report.passed / total) * 100).toFixed(1) : '0.0';
      const isImported = report.source === 'imported';
      // Local reports only allow restore if full results are still in memory
      const hasResults = !isImported && Array.isArray(report.results) && report.results.length > 0;

      return '<div class="bg-white border border-neutral-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition' + (isImported || hasResults ? ' cursor-pointer' : ' cursor-default opacity-75') + '" onclick="' + (isImported ? "openImportedReport('" + report.filename + "')" : hasResults ? 'loadHistoricalReport(' + report.id + ')' : 'void(0)') + '">'
        + '<div class="flex items-start justify-between mb-2">'
        + '<div class="flex-1">'
        + '<div class="flex items-center gap-2 mb-1">'
        + '<span class="font-semibold text-neutral-800">' + date.toLocaleDateString() + ' at ' + date.toLocaleTimeString() + '</span>'
        + (isImported ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Imported</span>' : '')
        + '</div>'
        + '<div class="flex gap-4 text-sm">'
        + '<span class="text-green-600">✓ ' + report.passed + '</span>'
        + '<span class="text-yellow-600">⚠ ' + report.warnings + '</span>'
        + '<span class="text-red-600">✗ ' + report.failed + '</span>'
        + (!isImported ? '<span class="text-neutral-500">⏱ ' + (report.totalTime / 1000).toFixed(1) + 's</span>' : '')
        + '</div></div>'
        + '<div class="flex flex-col items-end gap-1">'
        + '<span class="text-sm font-semibold ' + (passRate >= 75 ? 'text-green-600' : passRate >= 50 ? 'text-yellow-600' : 'text-red-600') + '">' + passRate + '% pass</span>'
        + (isImported
          ? '<span class="text-xs text-indigo-500">View Report →</span>'
          : hasResults
            ? '<button onclick="event.stopPropagation(); exportHistoricalReport(' + report.id + ')" class="text-xs text-indigo-500 hover:text-indigo-600 transition">Export →</button>'
            : '<span class="text-xs text-neutral-400">Summary only</span>')
        + '</div></div></div>';
    }).join('');
  }

  modal.classList.remove('hidden');
}

export function closeAutotestHistory() {
  const modal = document.getElementById('autotest-history-modal');
  if (modal) modal.classList.add('hidden');
}

export function openImportedReport(filename) {
  const reportPath = '/public/reports/autotest/' + filename;
  window.open(reportPath, '_blank');
}

export function loadHistoricalReport(reportId) {
  const historyArr = window.getAutotestHistory ? window.getAutotestHistory() : [];
  const report = historyArr.find(r => r.id === reportId);
  if (!report) return;

  // Set as current report
  window.lastAutotestResults = report;

  // Update UI
  const summaryEl = document.getElementById('autotest-summary');
  const resultsEl = document.getElementById('autotest-results');

  document.getElementById('at-total').textContent = report.results.length;
  document.getElementById('at-passed').textContent = report.passed;
  document.getElementById('at-warnings').textContent = report.warnings;
  document.getElementById('at-failed').textContent = report.failed;
  document.getElementById('at-time').textContent = (report.totalTime / 1000).toFixed(1) + 's';

  // Render results
  resultsEl.innerHTML = '';
  for (const r of report.results) {
    const card = renderScenarioCard(r);
    if (typeof card === 'string') {
      resultsEl.insertAdjacentHTML('beforeend', card);
    } else if (card instanceof Node) {
      resultsEl.appendChild(card);
    }
  }

  summaryEl.classList.remove('hidden');
  closeAutotestHistory();

  const date = new Date(report.timestamp);
  alert('Loaded report from ' + date.toLocaleDateString() + ' at ' + date.toLocaleTimeString());
}

export function exportHistoricalReport(reportId) {
  const historyArr = window.getAutotestHistory ? window.getAutotestHistory() : [];
  const report = historyArr.find(r => r.id === reportId);
  if (!report) return;
  exportAutotestReport(report, 'all');
}

export function clearAutotestHistoryUI() {
  if (!confirm('Are you sure you want to clear all autotest history? This cannot be undone.')) {
    return;
  }
  if (window.clearAutotestHistoryData) window.clearAutotestHistoryData();
  if (window.updateHistoryButtonVisibility) window.updateHistoryButtonVisibility();
  closeAutotestHistory();
}

// ─── Export Report ───────────────────────────────────────────────────────

export function toggleExportDropdown() {
  const menu = document.getElementById('export-dropdown-menu');
  menu.classList.toggle('hidden');
}

export function exportAutotestReport(data, filterType = 'all') {
  if (!data || !data.results) return;

  let { results, totalTime, timestamp } = data;

  // Filter results based on filterType
  let filteredResults = results;
  let filterLabel = '';

  if (filterType === 'warnings-failed') {
    filteredResults = results.filter(r => r.status === 'warn' || r.status === 'fail');
    filterLabel = ' (Warnings & Failed Only)';
  } else if (filterType === 'failed') {
    filteredResults = results.filter(r => r.status === 'fail');
    filterLabel = ' (Failed Only)';
  }

  // Close dropdown after selection
  const menu = document.getElementById('export-dropdown-menu');
  if (menu) menu.classList.add('hidden');

  if (filteredResults.length === 0) {
    alert('No ' + (filterType === 'failed' ? 'failed' : 'warnings or failed') + ' results to export.');
    return;
  }

  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const passRate = ((passed / results.length) * 100).toFixed(1);
  const avgTime = (results.reduce((a, r) => a + r.time, 0) / results.length / 1000).toFixed(1);

  let scenariosHtml = '';
  for (const r of filteredResults) {
    const s = r.scenario;
    const statusColor = r.status === 'pass' ? '#16a34a' : r.status === 'warn' ? '#ca8a04' : '#dc2626';
    const statusBg = r.status === 'pass' ? '#f0fdf4' : r.status === 'warn' ? '#fefce8' : '#fef2f2';
    const statusLabel = r.status.toUpperCase();

    let turnsSection = '';
    if (r.turns) {
      for (let i = 0; i < r.turns.length; i++) {
        const t = r.turns[i];
        turnsSection += '<div style="margin-bottom:12px">'
          + '<div style="text-align:right;margin-bottom:4px">'
          + '<span style="background:#6366f1;color:#fff;padding:6px 12px;border-radius:16px;font-size:13px;display:inline-block;max-width:70%">' + escHtml(t.userMessage) + '</span>'
          + '</div>'
          + '<div style="text-align:left;margin-bottom:4px">'
          + '<span style="background:#f5f5f5;border:1px solid #e5e5e5;padding:6px 12px;border-radius:16px;font-size:13px;display:inline-block;max-width:80%;white-space:pre-wrap">' + escHtml(t.response) + '</span>'
          + '</div>'
          + '<div style="font-size:11px;color:#888;margin-left:8px">'
          + (t.source ? 'Detection: <b>' + ({ 'regex': '🚨 Priority Keywords', 'fuzzy': '⚡ Smart Matching', 'semantic': '📚 Learning Examples', 'llm': '🤖 AI Fallback' }[t.source] || t.source) + '</b>' : '')
          + (t.intent ? ' | Intent: <b>' + escHtml(t.intent) + '</b>' : '')
          + (t.routedAction ? ' | Routed to: <b>' + escHtml(t.routedAction) + '</b>' : '')
          + (t.messageType ? ' | Type: <b>' + t.messageType + '</b>' : '')
          + (t.sentiment ? ' | Sentiment: <b>' + (t.sentiment === 'positive' ? '😊 positive' : t.sentiment === 'negative' ? '😠 negative' : '😐 neutral') + '</b>' : '')
          + (t.model ? ' | Model: <b>' + escHtml(t.model) + '</b>' : '')
          + (t.responseTime ? ' | Time: <b>' + (t.responseTime >= 1000 ? (t.responseTime / 1000).toFixed(1) + 's' : t.responseTime + 'ms') + '</b>' : '')
          + (t.confidence ? ' | Confidence: <b>' + (t.confidence * 100).toFixed(0) + '%</b>' : '')
          + (t.kbFiles && t.kbFiles.length > 0 ? ' | KB: <b>' + t.kbFiles.join(', ') + '</b>' : '')
          + '</div></div>';
      }
    }

    let rulesSection = '';
    for (const rv of r.ruleResults) {
      const icon = rv.passed ? '&#10003;' : (rv.rule.critical ? '&#10007;' : '&#9888;');
      const rColor = rv.passed ? '#16a34a' : rv.rule.critical ? '#dc2626' : '#ca8a04';
      rulesSection += '<div style="font-size:12px;padding:2px 0;color:' + rColor + '">' + icon + ' <b>' + rv.rule.type + '</b>' + (rv.turn !== undefined ? ' (turn ' + rv.turn + ')' : '') + ': ' + escHtml(rv.detail) + '</div>';
    }

    scenariosHtml += '<div style="border:1px solid #e5e5e5;border-radius:12px;margin-bottom:16px;overflow:hidden">'
      + '<div style="padding:12px 16px;background:' + statusBg + ';display:flex;align-items:center;gap:12px">'
      + '<span style="background:' + statusColor + ';color:#fff;padding:2px 10px;border-radius:8px;font-size:12px;font-weight:700">' + statusLabel + '</span>'
      + '<b style="font-size:14px">' + escHtml(s.name) + '</b>'
      + '<span style="font-size:12px;color:#888;margin-left:auto">' + s.category + ' | ' + (r.time / 1000).toFixed(1) + 's</span>'
      + '</div>'
      + '<div style="padding:16px">'
      + turnsSection
      + '<div style="border-top:1px solid #e5e5e5;margin-top:8px;padding-top:8px">'
      + '<div style="font-size:12px;font-weight:600;color:#555;margin-bottom:4px">Validation Rules</div>'
      + rulesSection
      + '</div></div></div>';
  }

  const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Rainbow AI Autotest Report' + filterLabel + '</title>\n<style></style>\n</head>\n<body>\n'
    + '<h1>Rainbow AI Autotest Report' + filterLabel + '</h1>\n'
    + '<p style="color:#888;font-size:14px">' + new Date(timestamp).toLocaleString() + ' | Pass rate: <b>' + passRate + '%</b> | Showing: <b>' + filteredResults.length + ' of ' + results.length + '</b> results</p>\n\n'
    + '<div class="summary">'
    + '<div class="summary-card"><div class="num" style="color:#333">' + results.length + '</div><div class="label">Total</div></div>'
    + '<div class="summary-card"><div class="num" style="color:#16a34a">' + passed + '</div><div class="label">Passed</div></div>'
    + '<div class="summary-card"><div class="num" style="color:#ca8a04">' + warnings + '</div><div class="label">Warnings</div></div>'
    + '<div class="summary-card"><div class="num" style="color:#dc2626">' + failed + '</div><div class="label">Failed</div></div>'
    + '<div class="summary-card"><div class="num" style="color:#6366f1">' + avgTime + 's</div><div class="label">Avg Time</div></div>'
    + '</div>\n\n'
    + scenariosHtml + '\n\n'
    + '<p style="text-align:center;color:#aaa;font-size:12px;margin-top:32px">Generated by Rainbow AI Dashboard</p>\n'
    + '</body>\n</html>';

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');

  let filenameSuffix = '';
  if (filterType === 'warnings-failed') filenameSuffix = '-warnings-failed';
  else if (filterType === 'failed') filenameSuffix = '-failed-only';

  a.download = 'rainbow-autotest' + filenameSuffix + '-' + now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '-' + pad(now.getHours()) + pad(now.getMinutes()) + '.html';
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Event Listeners ─────────────────────────────────────────────────────

// Close dropdown when clicking outside
document.addEventListener('click', function (event) {
  const dropdown = document.getElementById('export-report-dropdown');
  const menu = document.getElementById('export-dropdown-menu');
  if (dropdown && menu && !dropdown.contains(event.target)) {
    menu.classList.add('hidden');
  }
});

// Close history modal when clicking outside
document.addEventListener('click', function (event) {
  const modal = document.getElementById('autotest-history-modal');
  if (modal && event.target === modal) {
    closeAutotestHistory();
  }
});

// ─── Auto-Init ───────────────────────────────────────────────────────────
// Note: loadAutotestHistory() is called in testing-chunk.js AFTER window registrations.
// The previous auto-init here ran before window.* was set, so it was a dead call.

// ─── Scenario Count ──────────────────────────────────────────────────────

/**
 * Update scenario count spans from window.AUTOTEST_SCENARIOS.
 * Must be called AFTER testing-chunk.js sets window.AUTOTEST_SCENARIOS.
 */
export function updateScenarioCount() {
  const scenarios = window.AUTOTEST_SCENARIOS;
  if (!scenarios || !scenarios.length) return;
  const total = scenarios.length;
  const categories = new Set(scenarios.map(s => s.category)).size;
  // Update all matching spans on the page (chat-simulator and preview tabs both have these)
  document.querySelectorAll('#scenario-total-count').forEach(el => { el.textContent = total; });
  document.querySelectorAll('#scenario-category-count').forEach(el => { el.textContent = categories; });
  // Also update the run-all placeholder (#scenario-count is in the results area)
  document.querySelectorAll('#scenario-count').forEach(el => { el.textContent = total; });
}
