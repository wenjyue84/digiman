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

// ─── Render Scenario Card ──────────────────────────────────────────

function renderScenarioCard(result) {
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
        ? `<div class="flex items-center gap-1 flex-wrap mt-1"><span class="text-neutral-400">📂</span>${t.kbFiles.map(f => `<span class="px-1 py-0.5 bg-violet-50 text-violet-700 rounded font-mono text-xs">${esc(f)}</span>`).join('')}</div>`
        : '';
      turnsHtml += `
        <div class="mb-3">
          <div class="flex justify-end mb-1">
            <div class="bg-indigo-500 text-white rounded-2xl px-3 py-1.5 text-xs max-w-xs">${esc(t.userMessage)}</div>
          </div>
          <div class="flex justify-start mb-1">
            <div class="bg-white border rounded-2xl px-3 py-1.5 text-xs max-w-sm">
              <div class="whitespace-pre-wrap">${esc(t.response)}</div>
              <div class="mt-1 pt-1 border-t flex flex-wrap gap-1 items-center text-xs text-neutral-500">
                ${t.source ? `<span class="px-1 py-0.5 ${srcColor} rounded font-medium text-xs">${srcLabel}</span>` : ''}
                ${t.intent ? `<span class="px-1 py-0.5 bg-primary-50 text-primary-700 rounded font-mono text-xs">${esc(t.intent)}</span>` : ''}
                ${t.routedAction ? `<span class="px-1 py-0.5 bg-success-50 text-success-700 rounded text-xs">${esc(t.routedAction)}</span>` : ''}
                ${t.messageType ? `<span class="px-1 py-0.5 ${mtColors[t.messageType] || 'bg-green-50 text-green-700'} rounded font-medium text-xs">${mtIcons[t.messageType] || 'ℹ️'} ${t.messageType}</span>` : ''}
                ${t.model ? `<span class="px-1 py-0.5 bg-purple-50 text-purple-700 rounded font-mono text-xs">${esc(t.model)}</span>` : ''}
                ${t.responseTime ? `<span class="px-1 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">${t.responseTime >= 1000 ? (t.responseTime / 1000).toFixed(1) + 's' : t.responseTime + 'ms'}</span>` : ''}
                ${t.confidence ? `<span class="text-xs">${(t.confidence * 100).toFixed(0)}%</span>` : ''}
              </div>
              ${kbBadges}
            </div>
          </div>
        </div>`;
    }
  }

  let rulesHtml = '';
  for (const r of result.ruleResults) {
    const icon = r.passed ? '✅' : (r.rule.critical ? '❌' : '⚠️');
    rulesHtml += `<div class="flex items-start gap-2 text-xs py-0.5">
      <span>${icon}</span>
      <span class="${r.passed ? 'text-green-700' : r.rule.critical ? 'text-red-700' : 'text-yellow-700'}">
        <b>${r.rule.type}</b>${r.turn !== undefined ? ` (turn ${r.turn})` : ''}: ${esc(r.detail)}
      </span>
    </div>`;
  }

  return `
    <div class="border rounded-2xl overflow-hidden">
      <button onclick="this.nextElementSibling.classList.toggle('hidden')" class="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 transition text-left">
        <div class="w-3 h-3 rounded-full ${statusColors[result.status] || 'bg-neutral-400'} flex-shrink-0"></div>
        <div class="flex-1 min-w-0">
          <span class="font-medium text-sm text-neutral-800">${esc(s.name)}</span>
        </div>
        <span class="px-2 py-0.5 ${catColors[s.category] || 'bg-neutral-100 text-neutral-700'} rounded text-xs flex-shrink-0">${esc(s.category)}</span>
        <span class="text-xs text-neutral-500 flex-shrink-0">${(result.time / 1000).toFixed(1)}s</span>
        <span class="text-xs font-medium ${result.status === 'pass' ? 'text-green-600' : result.status === 'warn' ? 'text-yellow-600' : 'text-red-600'} flex-shrink-0">${statusLabels[result.status]}</span>
        <span class="text-xs text-neutral-400 flex-shrink-0">${passedRules}/${totalRules}</span>
      </button>
      <div class="hidden border-t bg-neutral-50 px-4 py-3">
        <div class="mb-3">${turnsHtml}</div>
        <div class="border-t pt-2">
          <p class="text-xs font-medium text-neutral-600 mb-1">Validation Rules:</p>
          ${rulesHtml}
        </div>
      </div>
    </div>`;
}

// ─── Autotest History Functions ────────────────────────────────────

function showAutotestHistory() {
  const modal = document.getElementById('autotest-history-modal');
  const listEl = document.getElementById('autotest-history-list');

  if (!modal || !listEl) return;

  // Combine and sort all reports by timestamp (newest first)
  const allReports = [
    ...autotestHistory.map(r => ({ ...r, source: 'local' })),
    ...importedReports.map(r => ({ ...r, source: 'imported' }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (allReports.length === 0) {
    listEl.innerHTML = `
      <div class="text-center text-neutral-400 py-12">
        <p>No test history available</p>
        <p class="text-xs mt-1">Run tests to start building history</p>
      </div>`;
  } else {
    listEl.innerHTML = allReports.map((report) => {
      const date = new Date(report.timestamp);
      const total = report.source === 'local' ? report.results.length : report.total;
      const passRate = ((report.passed / total) * 100).toFixed(1);
      const isImported = report.source === 'imported';

      return `
        <div class="bg-white border border-neutral-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition cursor-pointer" onclick="${isImported ? `openImportedReport('${report.filename}')` : `loadHistoricalReport(${report.id})`}">
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-neutral-800">
                  ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}
                </span>
                ${isImported ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Imported</span>' : ''}
              </div>
              <div class="flex gap-4 text-sm">
                <span class="text-green-600">✓ ${report.passed}</span>
                <span class="text-yellow-600">⚠ ${report.warnings}</span>
                <span class="text-red-600">✗ ${report.failed}</span>
                ${!isImported ? `<span class="text-neutral-500">⏱ ${(report.totalTime / 1000).toFixed(1)}s</span>` : ''}
              </div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <span class="text-sm font-semibold ${passRate >= 75 ? 'text-green-600' : passRate >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                ${passRate}% pass
              </span>
              ${isImported ?
          `<span class="text-xs text-indigo-500">View Report →</span>` :
          `<button onclick="event.stopPropagation(); exportHistoricalReport(${report.id})" class="text-xs text-indigo-500 hover:text-indigo-600 transition">Export →</button>`
        }
            </div>
          </div>
        </div>`;
    }).join('');
  }

  modal.classList.remove('hidden');
}

function closeAutotestHistory() {
  const modal = document.getElementById('autotest-history-modal');
  if (modal) modal.classList.add('hidden');
}

function openImportedReport(filename) {
  // Open the imported HTML report in a new tab
  const reportPath = `/public/reports/autotest/${filename}`;
  window.open(reportPath, '_blank');
}

function loadHistoricalReport(reportId) {
  const report = autotestHistory.find(r => r.id === reportId);
  if (!report) return;

  // Set as current report
  lastAutotestResults = report;

  // Update UI with this report's data
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
    const card = renderAutotestResult(r);
    resultsEl.appendChild(card);
  }

  summaryEl.classList.remove('hidden');

  // Close modal
  closeAutotestHistory();

  // Show notification
  const date = new Date(report.timestamp);
  alert(`Loaded report from ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`);
}

function exportHistoricalReport(reportId) {
  const report = autotestHistory.find(r => r.id === reportId);
  if (!report) return;

  exportAutotestReport(report, 'all');
}

function clearAutotestHistory() {
  if (!confirm('Are you sure you want to clear all autotest history? This cannot be undone.')) {
    return;
  }

  autotestHistory = [];
  saveAutotestHistory();

  // Update button visibility
  updateHistoryButtonVisibility();

  // Close modal
  closeAutotestHistory();
}

// ─── Export Report ──────────────────────────────────────────────────

// Toggle export dropdown menu
function toggleExportDropdown() {
  const menu = document.getElementById('export-dropdown-menu');
  menu.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', function (event) {
  const dropdown = document.getElementById('export-report-dropdown');
  const menu = document.getElementById('export-dropdown-menu');
  if (dropdown && menu && !dropdown.contains(event.target)) {
    menu.classList.add('hidden');
  }
});

function exportAutotestReport(data, filterType = 'all') {
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

  // If no results match the filter, show alert
  if (filteredResults.length === 0) {
    alert(`No ${filterType === 'failed' ? 'failed' : 'warnings or failed'} results to export.`);
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
        turnsSection += `
          <div style="margin-bottom:12px">
            <div style="text-align:right;margin-bottom:4px">
              <span style="background:#6366f1;color:#fff;padding:6px 12px;border-radius:16px;font-size:13px;display:inline-block;max-width:70%">${escHtml(t.userMessage)}</span>
            </div>
            <div style="text-align:left;margin-bottom:4px">
              <span style="background:#f5f5f5;border:1px solid #e5e5e5;padding:6px 12px;border-radius:16px;font-size:13px;display:inline-block;max-width:80%;white-space:pre-wrap">${escHtml(t.response)}</span>
            </div>
            <div style="font-size:11px;color:#888;margin-left:8px">
              ${t.source ? `Detection: <b>${({ 'regex': '🚨 Priority Keywords', 'fuzzy': '⚡ Smart Matching', 'semantic': '📚 Learning Examples', 'llm': '🤖 AI Fallback' })[t.source] || t.source}</b>` : ''}
              ${t.intent ? ` | Intent: <b>${escHtml(t.intent)}</b>` : ''}
              ${t.routedAction ? ` | Routed to: <b>${escHtml(t.routedAction)}</b>` : ''}
              ${t.messageType ? ` | Type: <b>${t.messageType}</b>` : ''}
              ${t.sentiment ? ` | Sentiment: <b>${t.sentiment === 'positive' ? '😊 positive' : t.sentiment === 'negative' ? '😠 negative' : '😐 neutral'}</b>` : ''}
              ${t.model ? ` | Model: <b>${escHtml(t.model)}</b>` : ''}
              ${t.responseTime ? ` | Time: <b>${t.responseTime >= 1000 ? (t.responseTime / 1000).toFixed(1) + 's' : t.responseTime + 'ms'}</b>` : ''}
              ${t.confidence ? ` | Confidence: <b>${(t.confidence * 100).toFixed(0)}%</b>` : ''}
              ${t.kbFiles && t.kbFiles.length > 0 ? ` | KB: <b>${t.kbFiles.join(', ')}</b>` : ''}
            </div>
          </div>`;
      }
    }

    let rulesSection = '';
    for (const rv of r.ruleResults) {
      const icon = rv.passed ? '&#10003;' : (rv.rule.critical ? '&#10007;' : '&#9888;');
      const rColor = rv.passed ? '#16a34a' : rv.rule.critical ? '#dc2626' : '#ca8a04';
      rulesSection += `<div style="font-size:12px;padding:2px 0;color:${rColor}">${icon} <b>${rv.rule.type}</b>${rv.turn !== undefined ? ` (turn ${rv.turn})` : ''}: ${escHtml(rv.detail)}</div>`;
    }

    scenariosHtml += `
      <div style="border:1px solid #e5e5e5;border-radius:12px;margin-bottom:16px;overflow:hidden">
        <div style="padding:12px 16px;background:${statusBg};display:flex;align-items:center;gap:12px">
          <span style="background:${statusColor};color:#fff;padding:2px 10px;border-radius:8px;font-size:12px;font-weight:700">${statusLabel}</span>
          <b style="font-size:14px">${escHtml(s.name)}</b>
          <span style="font-size:12px;color:#888;margin-left:auto">${s.category} | ${(r.time / 1000).toFixed(1)}s</span>
        </div>
        <div style="padding:16px">
          ${turnsSection}
          <div style="border-top:1px solid #e5e5e5;margin-top:8px;padding-top:8px">
            <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:4px">Validation Rules</div>
            ${rulesSection}
          </div>
        </div>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rainbow AI Autotest Report${filterLabel}</title>
<style></style>
</head>
<body>
  <h1>Rainbow AI Autotest Report${filterLabel}</h1>
  <p style="color:#888;font-size:14px">${new Date(timestamp).toLocaleString()} | Pass rate: <b>${passRate}%</b> | Showing: <b>${filteredResults.length} of ${results.length}</b> results</p>

  <div class="summary">
    <div class="summary-card"><div class="num" style="color:#333">${results.length}</div><div class="label">Total</div></div>
    <div class="summary-card"><div class="num" style="color:#16a34a">${passed}</div><div class="label">Passed</div></div>
    <div class="summary-card"><div class="num" style="color:#ca8a04">${warnings}</div><div class="label">Warnings</div></div>
    <div class="summary-card"><div class="num" style="color:#dc2626">${failed}</div><div class="label">Failed</div></div>
    <div class="summary-card"><div class="num" style="color:#6366f1">${avgTime}s</div><div class="label">Avg Time</div></div>
  </div>

  ${scenariosHtml}

  <p style="text-align:center;color:#aaa;font-size:12px;margin-top:32px">Generated by Rainbow AI Dashboard</p>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');

  // Add filter type to filename
  let filenameSuffix = '';
  if (filterType === 'warnings-failed') {
    filenameSuffix = '-warnings-failed';
  } else if (filterType === 'failed') {
    filenameSuffix = '-failed-only';
  }

  a.download = `rainbow-autotest${filenameSuffix}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.html`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═════════════════════════════════════════════════════════════════════
// Intent Manager Functions
// ═════════════════════════════════════════════════════════════════════

let imKeywordsData = null;
let imExamplesData = null;
let imCurrentIntent = null;
let imCurrentExampleIntent = null;
let imCurrentLang = 'en';

// Load Intent Manager data when tab is activated
async function loadIntentManagerData() {
  // Load and show stats first (Rainbow serves stats locally if backend is down)
  try {
    const statsRes = await fetch('/api/rainbow/intent-manager/stats');
    const stats = await statsRes.json();
    const elIntents = document.getElementById('im-stat-intents');
    const elKeywords = document.getElementById('im-stat-keywords');
    const elExamples = document.getElementById('im-stat-examples');
    if (elIntents) elIntents.textContent = String(stats.totalIntents ?? '-');
    if (elKeywords) elKeywords.textContent = String(stats.totalKeywords ?? '-');
    if (elExamples) elExamples.textContent = String(stats.totalExamples ?? '-');
  } catch (e) {
    console.warn('Failed to load stats:', e);
    const elIntents = document.getElementById('im-stat-intents');
    const elKeywords = document.getElementById('im-stat-keywords');
    const elExamples = document.getElementById('im-stat-examples');
    if (elIntents) elIntents.textContent = '-';
    if (elKeywords) elKeywords.textContent = '-';
    if (elExamples) elExamples.textContent = '-';
  }

  try {
    // Load keywords
    const kwRes = await fetch('/api/rainbow/intent-manager/keywords');
    imKeywordsData = await kwRes.json();

    // Load examples
    const exRes = await fetch('/api/rainbow/intent-manager/examples');
    imExamplesData = await exRes.json();

    // Populate intent lists
    renderIntentList();
    renderExampleIntentList();

    // Load T1 regex patterns
    await loadRegexPatterns();

    // Load T4 LLM settings
    await loadLLMSettings();

    // Load tier enabled states
    loadTierStates();

    // Set up tier toggle event listeners
    setupTierToggles();
  } catch (err) {
    console.error('Failed to load Intent Manager data:', err);
    toast('Failed to load data', 'error');
  }
}

// ─── Tier Expand/Collapse ──────────────────────────────────────
function toggleTier(tierId, updateHash = true) {
  const content = document.getElementById(tierId + '-content');
  const btn = document.getElementById(tierId + '-toggle-btn');
  if (!content || !btn) return;

  const isExpanded = content.classList.contains('hidden');
  if (isExpanded) {
    content.classList.remove('hidden');
    btn.classList.add('is-expanded');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Collapse section');

    // Update hash
    if (updateHash) {
      // Only update if we are on the understanding tab
      // (Though toggleTier is likely only used there)
      const newHash = `understanding/${tierId}`;
      if (window.location.hash.slice(1) !== newHash) {
        window.location.hash = newHash;
      }
    }
  } else {
    content.classList.add('hidden');
    btn.classList.remove('is-expanded');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Expand section');

    // Clear hash if it matches this tier
    if (updateHash) {
      const currentHash = window.location.hash.slice(1);
      if (currentHash === `understanding/${tierId}`) {
        window.location.hash = 'understanding';
      }
    }
  }
}

// ─── Tier State Management ─────────────────────────────────────
async function loadTierStates() {
  try {
    const res = await fetch('/api/rainbow/intent-manager/tiers');
    if (res.ok) {
      const tiers = await res.json();
      updateTierUI(tiers);
      updateTier4StatusLabel(document.getElementById('tier4-enabled').checked);
      return;
    }
  } catch (e) {
    console.warn('Could not load tiers from API, using localStorage:', e);
  }

  const savedStates = localStorage.getItem('tierStates');
  const defaultStates = { tier1: true, tier2: true, tier3: true, tier4: true };
  const states = savedStates ? JSON.parse(savedStates) : defaultStates;

  document.getElementById('tier1-enabled').checked = states.tier1;
  document.getElementById('tier2-enabled').checked = states.tier2;
  document.getElementById('tier3-enabled').checked = states.tier3;
  document.getElementById('tier4-enabled').checked = states.tier4;
  updateTier4StatusLabel(states.tier4);
}

function updateTier4StatusLabel(enabled) {
  const el = document.getElementById('tier4-status-label');
  if (el) el.textContent = enabled ? 'Enabled' : 'Disabled';
}

function setupTierToggles() {
  document.getElementById('tier1-enabled').addEventListener('change', (e) => {
    saveTierState('tier1', e.target.checked);
    toast(`Priority Keywords ${e.target.checked ? 'Enabled' : 'Disabled'}`, 'info');
  });

  document.getElementById('tier2-enabled').addEventListener('change', (e) => {
    saveTierState('tier2', e.target.checked);
    toast(`Smart Matching ${e.target.checked ? 'Enabled' : 'Disabled'}`, 'info');
  });

  document.getElementById('tier3-enabled').addEventListener('change', (e) => {
    saveTierState('tier3', e.target.checked);
    toast(`Learning Examples ${e.target.checked ? 'Enabled' : 'Disabled'}`, 'info');
  });

  document.getElementById('tier4-enabled').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    if (!enabled) {
      const msg = 'If you disable AI Fallback, all messages that don\'t match the other tiers will be classified as **Others** (system fallback intent). Others is in GENERAL_SUPPORT and cannot be deleted or turned off.\n\nAre you sure you want to disable AI Fallback?';
      if (!confirm(msg)) {
        e.target.checked = true;
        updateTier4StatusLabel(true);
        return;
      }
    }
    await saveTierState('tier4', enabled);
    updateTier4StatusLabel(enabled);
    toast(`AI Fallback ${enabled ? 'Enabled' : 'Disabled'}`, enabled ? 'success' : 'info');
  });
}

async function saveTierState(tier, enabled) {
  const savedStates = localStorage.getItem('tierStates');
  const states = savedStates ? JSON.parse(savedStates) : {};
  states[tier] = enabled;
  localStorage.setItem('tierStates', JSON.stringify(states));

  const tierPayload = {
    tier1: { tiers: { tier1_emergency: { enabled } } },
    tier2: { tiers: { tier2_fuzzy: { enabled } } },
    tier3: { tiers: { tier3_semantic: { enabled } } },
    tier4: { tiers: { tier4_llm: { enabled } } }
  };
  const body = tierPayload[tier];
  if (body) {
    try {
      const res = await fetch('/api/rainbow/intent-manager/tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to save');
    } catch (err) {
      console.error('Failed to save tier state:', err);
      toast('Failed to save tier state', 'error');
    }
  }
}

function renderIntentList() {
  const list = document.getElementById('im-intent-list');
  if (!imKeywordsData) return;

  list.innerHTML = imKeywordsData.intents.map(intent => {
    const totalKeywords = Object.values(intent.keywords).flat().length;
    return `<button onclick="selectIntent('${intent.intent}')" class="im-intent-btn w-full text-left px-3 py-2 rounded-2xl text-sm hover:bg-neutral-100 transition" data-intent="${intent.intent}">
      <div class="font-medium">${intent.intent}</div>
      <div class="text-xs text-neutral-500">${totalKeywords} keywords</div>
    </button>`;
  }).join('');

  // Auto-select the first intent on load
  if (imKeywordsData.intents && imKeywordsData.intents.length > 0) {
    selectIntent(imKeywordsData.intents[0].intent);
  }
}

function getExampleCount(examples) {
  if (!examples) return 0;
  if (Array.isArray(examples)) return examples.length;
  if (typeof examples === 'object') return Object.values(examples).flat().length;
  return 0;
}

function getExamplesList(examples) {
  if (!examples) return [];
  if (Array.isArray(examples)) return examples.slice();
  if (typeof examples === 'object') return Object.values(examples).flat();
  return [];
}

function renderExampleIntentList() {
  const list = document.getElementById('im-example-intent-list');
  if (!imExamplesData) return;

  list.innerHTML = imExamplesData.intents.map(intent => {
    const count = getExampleCount(intent.examples);
    return `<button onclick="selectExampleIntent('${intent.intent}')" class="im-example-intent-btn w-full text-left px-3 py-2 rounded-2xl text-sm hover:bg-neutral-100 transition" data-intent="${intent.intent}">
      <div class="font-medium">${intent.intent}</div>
      <div class="text-xs text-neutral-500">${count} examples</div>
    </button>`;
  }).join('');

  // Auto-select the first intent on load
  if (imExamplesData.intents && imExamplesData.intents.length > 0) {
    selectExampleIntent(imExamplesData.intents[0].intent);
  }
}

function selectIntent(intent) {
  imCurrentIntent = intent;
  document.getElementById('im-keyword-editor').classList.remove('hidden');
  document.getElementById('im-keyword-empty').classList.add('hidden');
  document.getElementById('im-current-intent').textContent = intent;

  // Highlight selected intent
  document.querySelectorAll('.im-intent-btn').forEach(btn => {
    if (btn.dataset.intent === intent) {
      btn.classList.add('bg-primary-50', 'text-primary-700');
    } else {
      btn.classList.remove('bg-primary-50', 'text-primary-700');
    }
  });

  // Render keywords for all languages
  renderKeywords();

  // Load T2 threshold override for this intent
  loadTierThresholds(intent, 't2');
}

function selectExampleIntent(intent) {
  imCurrentExampleIntent = intent;
  document.getElementById('im-examples-editor').classList.remove('hidden');
  document.getElementById('im-examples-empty').classList.add('hidden');
  document.getElementById('im-current-example-intent').textContent = intent;

  // Highlight selected intent
  document.querySelectorAll('.im-example-intent-btn').forEach(btn => {
    if (btn.dataset.intent === intent) {
      btn.classList.add('bg-success-50', 'text-success-700');
    } else {
      btn.classList.remove('bg-success-50', 'text-success-700');
    }
  });

  // Render examples
  renderExamples();

  // Load T3 threshold override for this intent
  loadTierThresholds(intent, 't3');
}

function renderKeywords() {
  const intentData = imKeywordsData.intents.find(i => i.intent === imCurrentIntent);
  if (!intentData) return;

  ['en', 'ms', 'zh'].forEach(lang => {
    const keywords = intentData.keywords[lang] || [];
    const listEl = document.getElementById(`im-keyword-list-${lang}`);
    const countEl = document.getElementById(`im-count-${lang}`);

    countEl.textContent = keywords.length;
    listEl.innerHTML = keywords.map(kw => `
      <span class="inline-flex items-center gap-1 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm">
        ${esc(kw)}
        <button onclick="removeKeyword('${lang}', '${esc(kw)}')" class="hover:text-danger-500 transition">×</button>
      </span>
    `).join('');
  });
}

function renderExamples() {
  const intentData = imExamplesData.intents.find(i => i.intent === imCurrentExampleIntent);
  if (!intentData) return;

  const examples = getExamplesList(intentData.examples);
  const listEl = document.getElementById('im-example-list');
  const countEl = document.getElementById('im-example-count');

  if (countEl) countEl.textContent = examples.length;
  listEl.innerHTML = examples.map(ex => `
    <span class="inline-flex items-center gap-1 bg-success-50 text-success-700 px-3 py-1 rounded-full text-sm">
      ${esc(ex)}
      <button onclick="removeExample('${esc(ex)}')" class="hover:text-danger-500 transition">×</button>
    </span>
  `).join('');
}

// Close history modal when clicking outside
document.addEventListener('click', function (event) {
  const modal = document.getElementById('autotest-history-modal');
  if (modal && event.target === modal) {
    closeAutotestHistory();
  }
});

// Language tab switching
document.addEventListener('DOMContentLoaded', () => {
  // Initialize autotest history
  loadAutotestHistory();
  updateHistoryButtonVisibility();

  // Update dynamic scenario count
  const scenarioCountEl = document.getElementById('scenario-count');
  if (scenarioCountEl) {
    scenarioCountEl.textContent = AUTOTEST_SCENARIOS.length;
  }
  // Close Run All dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const container = document.getElementById('run-all-dropdown');
    const menu = document.getElementById('run-all-dropdown-menu');
    if (container && menu && !menu.classList.contains('hidden') && !container.contains(e.target)) {
      closeRunAllDropdown();
    }
  });

  // Use event delegation: .im-lang-tab is inside dynamically loaded Understanding template,
  // so it may not exist at DOMContentLoaded. Delegate from document so clicks work after template loads.
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.im-lang-tab');
    if (!tab) return;
    const lang = tab.dataset.lang;
    if (!lang) return;
    imCurrentLang = lang;

    // Update tab styles
    document.querySelectorAll('.im-lang-tab').forEach(t => {
      if (t.dataset.lang === lang) {
        t.classList.add('border-primary-500', 'font-medium', 'text-neutral-800');
        t.classList.remove('text-neutral-500', 'border-transparent');
      } else {
        t.classList.remove('border-primary-500', 'font-medium', 'text-neutral-800');
        t.classList.add('text-neutral-500', 'border-transparent');
      }
    });

    // Show/hide language sections
    document.querySelectorAll('.im-keywords-lang').forEach(section => {
      section.classList.add('hidden');
    });
    const section = document.getElementById(`im-keywords-${lang}`);
    if (section) section.classList.remove('hidden');
  });
});

function addKeyword(lang) {
  const input = document.getElementById(`im-keyword-input-${lang}`);
  const keyword = input.value.trim();
  if (!keyword) return;

  const intentData = imKeywordsData.intents.find(i => i.intent === imCurrentIntent);
  if (!intentData) return;

  if (!intentData.keywords[lang]) {
    intentData.keywords[lang] = [];
  }

  if (intentData.keywords[lang].includes(keyword)) {
    toast('Keyword already exists', 'error');
    return;
  }

  intentData.keywords[lang].push(keyword);
  input.value = '';
  renderKeywords();
}

function removeKeyword(lang, keyword) {
  const intentData = imKeywordsData.intents.find(i => i.intent === imCurrentIntent);
  if (!intentData) return;

  intentData.keywords[lang] = intentData.keywords[lang].filter(k => k !== keyword);
  renderKeywords();
}

function addExample() {
  const input = document.getElementById('im-example-input');
  const example = input.value.trim();
  if (!example) return;

  const intentData = imExamplesData.intents.find(i => i.intent === imCurrentExampleIntent);
  if (!intentData) return;

  const ex = intentData.examples;
  if (Array.isArray(ex)) {
    if (ex.includes(example)) { toast('Example already exists', 'error'); return; }
    ex.push(example);
  } else if (ex && typeof ex === 'object') {
    const flat = getExamplesList(ex);
    if (flat.includes(example)) { toast('Example already exists', 'error'); return; }
    if (!ex.en) ex.en = [];
    ex.en.push(example);
  }
  input.value = '';
  renderExamples();
}

function removeExample(example) {
  const intentData = imExamplesData.intents.find(i => i.intent === imCurrentExampleIntent);
  if (!intentData) return;

  const ex = intentData.examples;
  if (Array.isArray(ex)) {
    intentData.examples = ex.filter(e => e !== example);
  } else if (ex && typeof ex === 'object') {
    for (const lang of Object.keys(ex)) {
      const idx = ex[lang].indexOf(example);
      if (idx !== -1) { ex[lang].splice(idx, 1); break; }
    }
  }
  renderExamples();
}

async function saveKeywords() {
  if (!imCurrentIntent) return;

  const intentData = imKeywordsData.intents.find(i => i.intent === imCurrentIntent);
  if (!intentData) return;

  try {
    const res = await fetch(`/api/rainbow/intent-manager/keywords/${imCurrentIntent}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: intentData.keywords })
    });

    if (!res.ok) throw new Error('Failed to save');

    toast('Keywords saved!', 'success');
    renderIntentList();
  } catch (err) {
    console.error('Failed to save keywords:', err);
    toast('Failed to save keywords', 'error');
  }
}

async function saveExamples() {
  if (!imCurrentExampleIntent) return;

  const intentData = imExamplesData.intents.find(i => i.intent === imCurrentExampleIntent);
  if (!intentData) return;

  try {
    const res = await fetch(`/api/rainbow/intent-manager/examples/${imCurrentExampleIntent}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examples: intentData.examples })
    });

    if (!res.ok) throw new Error('Failed to save');

    toast('Examples saved! Restart server to reload semantic matcher.', 'success');
    renderExampleIntentList();
  } catch (err) {
    console.error('Failed to save examples:', err);
    toast('Failed to save examples', 'error');
  }
}

// ─── Per-Intent Tier Threshold Overrides ───────────────────────────────────

let imIntentsData = null; // Store intents.json data for threshold management

async function loadTierThresholds(intent, tier) {
  if (!imIntentsData) {
    try {
      const res = await fetch('/api/rainbow/intents');
      imIntentsData = await res.json();
    } catch (err) {
      console.error('Failed to load intents data:', err);
      return;
    }
  }

  // Find intent in intents.json
  let intentData = null;
  for (const category of (imIntentsData.categories || [])) {
    const found = category.intents.find(i => i.category === intent);
    if (found) {
      intentData = found;
      break;
    }
  }

  if (!intentData) return;

  // Load threshold based on tier
  const inputEl = document.getElementById(`im-${tier}-threshold`);
  const statusEl = document.getElementById(`im-${tier}-status`);
  const resetBtn = document.getElementById(`im-${tier}-reset-btn`);

  const defaultValue = tier === 't2' ? 0.80 : 0.70;
  const thresholdKey = tier === 't2' ? 't2_fuzzy_threshold' : 't3_semantic_threshold';
  const currentValue = intentData[thresholdKey];

  if (currentValue !== undefined && currentValue !== null) {
    inputEl.value = currentValue.toFixed(2);
    statusEl.textContent = `Override active: ${currentValue.toFixed(2)}`;
    statusEl.classList.add('font-semibold', 'text-primary-600');
    resetBtn.classList.remove('hidden');
  } else {
    inputEl.value = '';
    inputEl.placeholder = `Use default (${defaultValue.toFixed(2)})`;
    statusEl.textContent = `Using default: ${defaultValue.toFixed(2)}`;
    statusEl.classList.remove('font-semibold', 'text-primary-600');
    resetBtn.classList.add('hidden');
  }
}

async function handleTierThresholdChange(tier, value) {
  const intent = tier === 't2' ? imCurrentIntent : imCurrentExampleIntent;
  if (!intent) return;

  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue < 0 || numValue > 1) {
    toast('Threshold must be between 0 and 1', 'error');
    return;
  }

  const defaultValue = tier === 't2' ? 0.80 : 0.70;
  const tierName = tier === 't2' ? 'Smart Matching' : 'Learning Examples';

  // Show explanation alert
  const confirmed = confirm(
    `⚠️ Override ${tierName} Threshold for "${intent}"?\n\n` +
    `You're setting a custom threshold of ${numValue.toFixed(2)} for this intent.\n\n` +
    `IMPLICATIONS:\n` +
    `• Default: ${defaultValue.toFixed(2)} (global threshold)\n` +
    `• New: ${numValue.toFixed(2)} (${numValue > defaultValue ? 'STRICTER' : 'LOOSER'} matching)\n\n` +
    `${numValue > defaultValue
      ? '→ STRICTER: This intent will be HARDER to match. Use if you want to avoid false positives.'
      : '→ LOOSER: This intent will be EASIER to match. Use if you want to catch more variations.'}\n\n` +
    `This override applies ONLY to this intent. Other intents use the global threshold.\n\n` +
    `Click OK to confirm, or Cancel to abort.`
  );

  if (!confirmed) {
    // Reset input to previous value
    await loadTierThresholds(intent, tier);
    return;
  }

  // Save threshold to backend
  try {
    const thresholdKey = tier === 't2' ? 't2_fuzzy_threshold' : 't3_semantic_threshold';
    const res = await fetch(`/api/rainbow/intents/${encodeURIComponent(intent)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [thresholdKey]: numValue })
    });

    if (!res.ok) throw new Error('Failed to save threshold');

    toast(`${tierName} threshold set to ${numValue.toFixed(2)} for "${intent}"`, 'success');

    // Update UI
    imIntentsData = null; // Invalidate cache
    await loadTierThresholds(intent, tier);
  } catch (err) {
    console.error('Failed to save threshold:', err);
    toast('Failed to save threshold', 'error');
    await loadTierThresholds(intent, tier);
  }
}

async function resetTierThreshold(tier) {
  const intent = tier === 't2' ? imCurrentIntent : imCurrentExampleIntent;
  if (!intent) return;

  const tierName = tier === 't2' ? 'Smart Matching' : 'Learning Examples';
  const defaultValue = tier === 't2' ? 0.80 : 0.70;

  const confirmed = confirm(
    `Reset ${tierName} threshold for "${intent}" to default?\n\n` +
    `This will remove the custom override and use the global threshold (${defaultValue.toFixed(2)}) instead.`
  );

  if (!confirmed) return;

  try {
    const thresholdKey = tier === 't2' ? 't2_fuzzy_threshold' : 't3_semantic_threshold';
    const res = await fetch(`/api/rainbow/intents/${encodeURIComponent(intent)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [thresholdKey]: null }) // Set to null to remove override
    });

    if (!res.ok) throw new Error('Failed to reset threshold');

    toast(`${tierName} threshold reset to default (${defaultValue.toFixed(2)})`, 'success');

    // Update UI
    imIntentsData = null; // Invalidate cache
    await loadTierThresholds(intent, tier);
  } catch (err) {
    console.error('Failed to reset threshold:', err);
    toast('Failed to reset threshold', 'error');
  }
}

async function testIntentManager() {
  const input = document.getElementById('im-test-input');
  const text = input.value.trim();
  if (!text) return;

  try {
    // Use the MCP server's existing test endpoint which has proper context
    const res = await fetch('/api/rainbow/intents/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const result = await res.json();

    document.getElementById('im-test-intent').textContent = result.intent || 'unknown';
    document.getElementById('im-test-confidence').textContent = result.confidence ? Math.round(result.confidence * 100) + '%' : '0%';
    document.getElementById('im-test-source').innerHTML = getSourceBadge(result.source);
    document.getElementById('im-test-language').textContent = result.detectedLanguage || 'unknown';
    document.getElementById('im-test-matched').textContent = result.matchedKeyword || result.matchedExample || '-';

    document.getElementById('im-test-result').classList.remove('hidden');
  } catch (err) {
    console.error('Failed to test intent:', err);
    toast('Failed to test intent', 'error');
  }
}

function getSourceBadge(source) {
  const badges = {
    regex: '<span class="bg-danger-100 text-danger-700 px-2 py-0.5 rounded text-xs">🚨 Priority Keywords</span>',
    fuzzy: '<span class="bg-primary-100 text-primary-700 px-2 py-0.5 rounded text-xs">⚡ Smart Matching</span>',
    semantic: '<span class="bg-success-100 text-success-700 px-2 py-0.5 rounded text-xs">📚 Learning Examples</span>',
    llm: '<span class="bg-warning-100 text-warning-700 px-2 py-0.5 rounded text-xs">🤖 AI Fallback</span>'
  };
  return badges[source] || '<span class="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-xs">' + (source || 'unknown') + '</span>';
}

async function exportIntentData(format) {
  try {
    const url = `/api/rainbow/intent-manager/export?format=${format}`;
    window.open(url, '_blank');
    toast(`Exporting as ${format.toUpperCase()}...`, 'success');
  } catch (err) {
    console.error('Failed to export:', err);
    toast('Failed to export', 'error');
  }
}

// ─── Template Management ──────────────────────────────────────────────

const INTENT_TEMPLATES = {
  't1-quality': {
    name: 'T1 Maximum Quality',
    description: 'Highest accuracy, slowest speed, highest cost',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 10, threshold: 0.95 },
      tier3_semantic: { enabled: true, contextMessages: 10, threshold: 0.72 },
      tier4_llm: { enabled: true, contextMessages: 20 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 30,
      contextTTL: 60
    },
    llm: {
      defaultProviderId: 'groq-llama',
      thresholds: { fuzzy: 0.95, semantic: 0.72, layer2: 0.85, llm: 0.65 },
      maxTokens: 300,
      temperature: 0.05
    }
  },
  't2-performance': {
    name: 'T2 High Performance',
    description: 'Maximum speed, minimum cost, good accuracy',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 2, threshold: 0.85 },
      tier3_semantic: { enabled: true, contextMessages: 3, threshold: 0.60 },
      tier4_llm: { enabled: true, contextMessages: 5 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 10,
      contextTTL: 15
    },
    llm: {
      defaultProviderId: 'groq-llama-8b',
      thresholds: { fuzzy: 0.85, semantic: 0.60, layer2: 0.75, llm: 0.55 },
      maxTokens: 100,
      temperature: 0.05
    }
  },
  't3-balanced': {
    name: 'T3 Balanced',
    description: 'Optimal balance of speed, cost, and accuracy',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 3, threshold: 0.80 },
      tier3_semantic: { enabled: true, contextMessages: 5, threshold: 0.67 },
      tier4_llm: { enabled: true, contextMessages: 10 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 20,
      contextTTL: 30
    },
    llm: {
      defaultProviderId: 'groq-llama-8b',
      thresholds: { fuzzy: 0.80, semantic: 0.70, layer2: 0.80, llm: 0.60 },
      maxTokens: 500,
      temperature: 0.1
    }
  },
  't4-smart-fast': {
    name: 'T4 Smart-Fast',
    description: 'AI-optimized thresholds for WhatsApp hostel bot',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 4, threshold: 0.86 },
      tier3_semantic: { enabled: true, contextMessages: 6, threshold: 0.65 },
      tier4_llm: { enabled: true, contextMessages: 8 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 15,
      contextTTL: 25
    },
    llm: {
      defaultProviderId: 'groq-llama-8b',
      thresholds: { fuzzy: 0.86, semantic: 0.65, layer2: 0.80, llm: 0.58 },
      maxTokens: 150,
      temperature: 0.08
    }
  },
  't5-tiered-hybrid': {
    name: 'T5 Tiered-Hybrid',
    description: 'Cascading tiers with uncertainty-based routing',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 0, threshold: 0.90 },
      tier3_semantic: { enabled: true, contextMessages: 3, threshold: 0.671 },
      tier4_llm: { enabled: true, contextMessages: 7 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 15,
      contextTTL: 20
    },
    llm: {
      defaultProviderId: 'groq-llama-8b',
      thresholds: { fuzzy: 0.90, semantic: 0.671, layer2: 0.82, llm: 0.60 },
      maxTokens: 200,
      temperature: 0.08
    }
  },
  't6-emergency': {
    name: 'T6 Emergency-Optimized',
    description: 'Optimized for critical emergency detection',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 5, threshold: 0.75 },
      tier3_semantic: { enabled: false, contextMessages: 0, threshold: 0.67 },
      tier4_llm: { enabled: true, contextMessages: 12 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 25,
      contextTTL: 45
    },
    llm: {
      defaultProviderId: 'groq-llama',
      thresholds: { fuzzy: 0.75, semantic: 0.67, layer2: 0.85, llm: 0.65 },
      maxTokens: 250,
      temperature: 0.05
    }
  },
  't7-multilang': {
    name: 'T7 Multi-Language',
    description: 'Optimized for Chinese, Malay, English code-mixing',
    tiers: {
      tier1_emergency: { enabled: true, contextMessages: 0 },
      tier2_fuzzy: { enabled: true, contextMessages: 6, threshold: 0.82 },
      tier3_semantic: { enabled: true, contextMessages: 8, threshold: 0.63 },
      tier4_llm: { enabled: true, contextMessages: 12 }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 18,
      contextTTL: 35
    },
    llm: {
      defaultProviderId: 'ollama-gemini-flash',
      thresholds: { fuzzy: 0.82, semantic: 0.63, layer2: 0.80, llm: 0.62 },
      maxTokens: 200,
      temperature: 0.1
    }
  }
};

function toggleTemplateHelp() {
  const help = document.getElementById('template-help');
  help.classList.toggle('hidden');
}

async function applyIntentTemplate(templateId, event) {
  const template = INTENT_TEMPLATES[templateId];
  if (!template) {
    toast('Template not found', 'error');
    return;
  }

  if (!confirm('Apply template "' + template.name + '"? This will override current tier settings and the T4 LLM model (AI Fallback).')) {
    return;
  }

  try {
    // Apply tier settings via API
    const res = await fetch('/api/rainbow/intent-manager/apply-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: templateId,
        config: template
      })
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    // Update UI
    updateTierUI(template.tiers);

    // Update current template label
    document.getElementById('current-template-label').textContent = template.name;

    // Highlight selected button
    if (event) {
      document.querySelectorAll('.dashboard-template-btn').forEach(btn => {
        btn.classList.remove('active');
        const check = btn.querySelector('.btn-check');
        if (check) check.remove();
      });
      const clickedBtn = event.target.closest('.dashboard-template-btn');
      if (clickedBtn) {
        clickedBtn.classList.add('active');
        if (!clickedBtn.querySelector('.btn-check')) {
          const check = document.createElement('span');
          check.className = 'btn-check';
          check.textContent = '✓';
          clickedBtn.appendChild(check);
        }
      }
    }

    toast('Template "' + template.name + '" applied successfully!', 'success');

    // Reload to reflect changes
    await loadIntentManagerData();
  } catch (err) {
    console.error('Failed to apply template:', err);
    toast('Failed to apply template: ' + err.message, 'error');
  }
}

function updateTierUI(tiers) {
  // Update tier enable/disable states
  if (tiers.tier1_emergency) {
    document.getElementById('tier1-enabled').checked = tiers.tier1_emergency.enabled;
  }
  if (tiers.tier2_fuzzy) {
    document.getElementById('tier2-enabled').checked = tiers.tier2_fuzzy.enabled;
    // Note: Threshold and context inputs need to be updated if they exist in the UI
  }
  if (tiers.tier3_semantic) {
    document.getElementById('tier3-enabled').checked = tiers.tier3_semantic.enabled;
  }
  if (tiers.tier4_llm) {
    document.getElementById('tier4-enabled').checked = tiers.tier4_llm.enabled;
  }
}

async function saveCurrentAsCustom() {
  const name = prompt('Enter a name for this custom template:', 'My Custom Template');
  if (!name) return;

  try {
    // Get current configuration from UI
    const currentConfig = {
      name: name,
      description: 'Custom template',
      tiers: {
        tier1_emergency: {
          enabled: document.getElementById('tier1-enabled').checked,
          contextMessages: 0
        },
        tier2_fuzzy: {
          enabled: document.getElementById('tier2-enabled').checked,
          contextMessages: parseInt(document.getElementById('tier2-context')?.value || 3),
          threshold: parseFloat(document.getElementById('tier2-threshold')?.value || 0.80)
        },
        tier3_semantic: {
          enabled: document.getElementById('tier3-enabled').checked,
          contextMessages: parseInt(document.getElementById('tier3-context')?.value || 5),
          threshold: parseFloat(document.getElementById('tier3-threshold')?.value || 0.67)
        },
        tier4_llm: {
          enabled: document.getElementById('tier4-enabled').checked,
          contextMessages: parseInt(document.getElementById('tier4-context')?.value || 10)
        }
      }
    };

    // Save to localStorage
    const customTemplates = JSON.parse(localStorage.getItem('intent_custom_templates') || '{}');
    const customId = 't-custom-' + Date.now();
    customTemplates[customId] = currentConfig;
    localStorage.setItem('intent_custom_templates', JSON.stringify(customTemplates));

    toast('Custom template "' + name + '" saved!', 'success');
  } catch (err) {
    console.error('Failed to save custom template:', err);
    toast('Failed to save custom template', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════
// Settings Templates System for Rainbow Admin Dashboard
// Add this code to rainbow-admin.html before the "Regex Patterns Management" section
// ═══════════════════════════════════════════════════════════════════

const SETTINGS_TEMPLATES = {
  'cost-optimized': {
    name: 'T1 Cost-Optimized',
    description: 'Minimal cost using free models (Ollama cloud → OpenRouter free → Groq fallback)',
    icon: '💰',
    settings: {
      max_classify_tokens: 100,
      max_chat_tokens: 400,
      classify_temperature: 0.1,
      chat_temperature: 0.7,
      rate_limits: { per_minute: 15, per_hour: 80 },
      conversation_management: { enabled: true, summarize_threshold: 6 },
      routing_mode: { splitModel: true, classifyProvider: 'ollama-local', tieredPipeline: true },
      providers: [
        { id: 'ollama-local', enabled: true, priority: 1 },
        { id: 'ollama-gemini-flash', enabled: true, priority: 2 },
        { id: 'ollama-deepseek-v3.2', enabled: true, priority: 3 },
        { id: 'ollama-qwen3-80b', enabled: true, priority: 4 },
        { id: 'openrouter-llama-8b', enabled: true, priority: 5 },
        { id: 'openrouter-gemma-9b', enabled: true, priority: 6 },
        { id: 'openrouter-qwen-32b', enabled: true, priority: 7 },
        { id: 'groq-llama-8b', enabled: true, priority: 8 },
        { id: 'groq-llama', enabled: true, priority: 9 }
      ]
    }
  },
  'quality-optimized': {
    name: 'T2 Quality-Optimized',
    description: 'Maximum quality with premium reasoning models (Kimi K2.5, DeepSeek V3.2, DeepSeek R1)',
    icon: '⭐',
    settings: {
      max_classify_tokens: 300,
      max_chat_tokens: 2000,
      classify_temperature: 0.05,
      chat_temperature: 0.7,
      rate_limits: { per_minute: 30, per_hour: 200 },
      conversation_management: { enabled: true, summarize_threshold: 20 },
      routing_mode: { splitModel: true, classifyProvider: 'groq-deepseek-r1', tieredPipeline: true },
      providers: [
        { id: 'moonshot-kimi', enabled: true, priority: 1 },
        { id: 'ollama-deepseek-v3.2', enabled: true, priority: 2 },
        { id: 'groq-deepseek-r1', enabled: true, priority: 3 },
        { id: 'groq-llama', enabled: true, priority: 4 },
        { id: 'ollama-qwen3-80b', enabled: true, priority: 5 },
        { id: 'groq-qwen3-32b', enabled: true, priority: 6 },
        { id: 'ollama-gemini-flash', enabled: true, priority: 7 },
        { id: 'ollama-local', enabled: true, priority: 8 }
      ]
    }
  },
  'speed-optimized': {
    name: 'T3 Speed-Optimized',
    description: 'Minimum latency with fastest models (Llama 4 Scout 750 tok/s, Llama 8B 560 tok/s)',
    icon: '⚡',
    settings: {
      max_classify_tokens: 100,
      max_chat_tokens: 500,
      classify_temperature: 0.05,
      chat_temperature: 0.7,
      rate_limits: { per_minute: 40, per_hour: 200 },
      conversation_management: { enabled: true, summarize_threshold: 6 },
      routing_mode: { splitModel: true, classifyProvider: 'groq-llama4-scout', tieredPipeline: false },
      providers: [
        { id: 'groq-llama4-scout', enabled: true, priority: 1 },
        { id: 'groq-llama-8b', enabled: true, priority: 2 },
        { id: 'ollama-local', enabled: true, priority: 3 },
        { id: 'groq-qwen3-32b', enabled: true, priority: 4 }
      ]
    }
  },
  'balanced': {
    name: 'T4 Balanced (Recommended)',
    description: 'Optimal balance using free fast models + proven stable fallbacks',
    icon: '⚖️',
    settings: {
      max_classify_tokens: 150,
      max_chat_tokens: 800,
      classify_temperature: 0.1,
      chat_temperature: 0.7,
      rate_limits: { per_minute: 20, per_hour: 100 },
      conversation_management: { enabled: true, summarize_threshold: 10 },
      routing_mode: { splitModel: false, classifyProvider: 'groq-llama-8b', tieredPipeline: true },
      providers: [
        { id: 'ollama-local', enabled: true, priority: 1 },
        { id: 'groq-llama', enabled: true, priority: 2 },
        { id: 'groq-llama-8b', enabled: true, priority: 3 },
        { id: 'groq-qwen3-32b', enabled: true, priority: 4 },
        { id: 'ollama-gemini-flash', enabled: true, priority: 5 }
      ]
    }
  },
  'multilingual': {
    name: 'T5 Multilingual',
    description: 'Optimized for Chinese/Malay/English code-mixing (Qwen, Gemini, DeepSeek)',
    icon: '🌏',
    settings: {
      max_classify_tokens: 200,
      max_chat_tokens: 1000,
      classify_temperature: 0.1,
      chat_temperature: 0.7,
      rate_limits: { per_minute: 20, per_hour: 100 },
      conversation_management: { enabled: true, summarize_threshold: 15 },
      routing_mode: { splitModel: true, classifyProvider: 'groq-qwen3-32b', tieredPipeline: true },
      providers: [
        { id: 'ollama-gemini-flash', enabled: true, priority: 1 },
        { id: 'groq-qwen3-32b', enabled: true, priority: 2 },
        { id: 'ollama-qwen3-80b', enabled: true, priority: 3 },
        { id: 'ollama-deepseek-v3.2', enabled: true, priority: 4 },
        { id: 'groq-llama', enabled: true, priority: 5 }
      ]
    }
  }
};

function renderSettingsTemplateButtons() {
  const container = document.getElementById('settings-template-buttons');
  if (!container) return;

  const buttons = Object.entries(SETTINGS_TEMPLATES).map(([id, tpl]) => {
    const isRecommended = id === 'balanced';
    return `
      <button
        id="settings-tpl-btn-${id}"
        onclick="applySettingsTemplate('${id}')"
        class="settings-template-btn group relative text-xs px-4 py-2.5 rounded-2xl border-2 transition-all
          ${isRecommended
        ? 'bg-primary-100 border-primary-400 shadow-sm'
        : 'bg-white border-neutral-200 hover:border-primary-300 hover:bg-primary-50'}"
        title="${esc(tpl.description)}">
        <span class="font-semibold">${tpl.icon} ${tpl.name}</span>
        ${isRecommended ? '<span class="ml-1 text-xs text-primary-600">✓</span>' : ''}
        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-64">
          <div class="bg-neutral-900 text-white text-xs rounded-lg p-3 shadow-strong">
            <div class="font-semibold mb-1">${tpl.name}</div>
            <div class="text-neutral-300">${esc(tpl.description)}</div>
          </div>
        </div>
      </button>
    `;
  }).join('');

  container.innerHTML = buttons;
  detectActiveSettingsTemplate();
}

async function applySettingsTemplate(templateId) {
  const template = SETTINGS_TEMPLATES[templateId];
  if (!template) {
    toast('Template not found', 'error');
    return;
  }

  if (!confirm(`Apply "${template.name}" template?\n\nThis will update all settings including:\n• Provider selection & priority\n• Token limits\n• Temperature settings\n• Rate limits\n• Conversation management`)) {
    return;
  }

  try {
    const settings = template.settings;

    // Update all form fields
    document.getElementById('s-ai-classify-tokens').value = settings.max_classify_tokens;
    document.getElementById('s-ai-chat-tokens').value = settings.max_chat_tokens;
    document.getElementById('s-ai-classify-temp').value = settings.classify_temperature;
    document.getElementById('s-ai-chat-temp').value = settings.chat_temperature;
    document.getElementById('s-rate-minute').value = settings.rate_limits.per_minute;
    document.getElementById('s-rate-hour').value = settings.rate_limits.per_hour;

    // Update conversation management
    if (settings.conversation_management) {
      document.getElementById('s-conv-enabled').checked = settings.conversation_management.enabled;
      document.getElementById('s-conv-threshold').value = settings.conversation_management.summarize_threshold;
    }

    // Update provider priorities and enabled status
    const currentProviders = [...settingsProviders];
    settings.providers.forEach(tplProvider => {
      const existing = currentProviders.find(p => p.id === tplProvider.id);
      if (existing) {
        existing.enabled = tplProvider.enabled;
        existing.priority = tplProvider.priority;
      }
    });

    // Disable providers not in template
    const templateIds = new Set(settings.providers.map(p => p.id));
    currentProviders.forEach(p => {
      if (!templateIds.has(p.id)) {
        p.enabled = false;
      }
    });

    settingsProviders = currentProviders.sort((a, b) => a.priority - b.priority);

    // Re-render providers list
    renderProvidersList();

    // Highlight the active template button
    detectActiveSettingsTemplate();

    // Save settings
    await saveSettings();

    toast(`Template "${template.name}" applied successfully!`, 'success');
  } catch (err) {
    console.error('Failed to apply template:', err);
    toast('Failed to apply template: ' + err.message, 'error');
  }
}

function detectActiveSettingsTemplate() {
  // Get current settings from form
  const currentSettings = {
    max_classify_tokens: parseInt(document.getElementById('s-ai-classify-tokens')?.value || 0),
    max_chat_tokens: parseInt(document.getElementById('s-ai-chat-tokens')?.value || 0),
    classify_temperature: parseFloat(document.getElementById('s-ai-classify-temp')?.value || 0),
    chat_temperature: parseFloat(document.getElementById('s-ai-chat-temp')?.value || 0),
    rate_limits: {
      per_minute: parseInt(document.getElementById('s-rate-minute')?.value || 0),
      per_hour: parseInt(document.getElementById('s-rate-hour')?.value || 0)
    },
    providers: settingsProviders.filter(p => p.enabled).map(p => ({ id: p.id, priority: p.priority }))
  };

  document.querySelectorAll('.dashboard-template-btn').forEach(btn => {
    btn.classList.remove('active');
    const check = btn.querySelector('.btn-check');
    if (check) check.remove();
  });

  let matchedTemplate = null;
  for (const [id, template] of Object.entries(SETTINGS_TEMPLATES)) {
    if (settingsMatchTemplate(currentSettings, template.settings)) {
      matchedTemplate = id;
      break;
    }
  }

  if (matchedTemplate) {
    const btn = document.getElementById(`settings-tpl-btn-${matchedTemplate}`);
    if (btn) {
      btn.classList.add('active');
      if (!btn.querySelector('.btn-check')) {
        const check = document.createElement('span');
        check.className = 'btn-check';
        check.textContent = '✓';
        btn.appendChild(check);
      }
    }
    const currentLabel = document.getElementById('settings-current-label');
    if (currentLabel) currentLabel.textContent = SETTINGS_TEMPLATES[matchedTemplate].name;
    const indicator = document.getElementById('settings-template-indicator');
    if (indicator) { indicator.classList.add('hidden'); indicator.textContent = ''; }
  } else {
    const currentLabel = document.getElementById('settings-current-label');
    if (currentLabel) currentLabel.textContent = 'Custom';
    const indicator = document.getElementById('settings-template-indicator');
    if (indicator) { indicator.classList.add('hidden'); indicator.textContent = ''; }
  }
}

function settingsMatchTemplate(current, template) {
  // Check if current settings match a template (with some tolerance)
  const tolerance = 0.01; // For temperature comparison

  // Check token limits
  if (current.max_classify_tokens !== template.max_classify_tokens) return false;
  if (current.max_chat_tokens !== template.max_chat_tokens) return false;

  // Check temperatures (with tolerance)
  if (Math.abs(current.classify_temperature - template.classify_temperature) > tolerance) return false;
  if (Math.abs(current.chat_temperature - template.chat_temperature) > tolerance) return false;

  // Check rate limits
  if (current.rate_limits.per_minute !== template.rate_limits.per_minute) return false;
  if (current.rate_limits.per_hour !== template.rate_limits.per_hour) return false;

  // Check provider configuration (enabled providers and priorities)
  const currentProviderMap = new Map(current.providers.map(p => [p.id, p.priority]));
  const templateProviderMap = new Map(template.providers.map(p => [p.id, p.priority]));

  // Must have same enabled providers
  if (currentProviderMap.size !== templateProviderMap.size) return false;

  for (const [id, priority] of templateProviderMap) {
    if (!currentProviderMap.has(id) || currentProviderMap.get(id) !== priority) {
      return false;
    }
  }

  return true;
}

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
window.toggleFeedbackSettings = toggleFeedbackSettings;
window.onFeedbackSettingChange = onFeedbackSettingChange;
window.saveFeedbackSettings = saveFeedbackSettings;

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

