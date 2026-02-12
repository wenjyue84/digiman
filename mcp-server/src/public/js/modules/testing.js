/**
 * @fileoverview Module functionality
 * @module testing
 */

import { escapeHtml, api, toast } from '../core/utils.js';

/**
 * Global flag to prevent concurrent test runs
 * @type {boolean}
 */
let _testRunning = false;

/**
 * Runs the test suite for the selected project
 *
 * Executes tests via the `/tests/run` API endpoint, displays running state,
 * and renders results or error messages upon completion.
 *
 * @async
 * @returns {Promise<void>}
 */
export async function runTests() {
  if (_testRunning) return;
  _testRunning = true;
  const project = document.getElementById('test-project-select').value;
  const btnRun = document.getElementById('btn-run-tests');
  const btnCov = document.getElementById('btn-run-coverage');
  btnRun.disabled = true;
  btnCov.disabled = true;
  btnRun.textContent = 'Running...';

  // Show running state, hide others
  document.getElementById('test-empty').classList.add('hidden');
  document.getElementById('test-summary').classList.add('hidden');
  document.getElementById('test-status-banner').classList.add('hidden');
  document.getElementById('test-results').innerHTML = '';
  document.getElementById('coverage-results').classList.add('hidden');
  document.getElementById('test-running').classList.remove('hidden');

  try {
    const data = await api('/tests/run', { method: 'POST', body: { project } });
    document.getElementById('test-running').classList.add('hidden');
    renderTestResults(data);
  } catch (e) {
    document.getElementById('test-running').classList.add('hidden');
    document.getElementById('test-status-banner').classList.remove('hidden');
    document.getElementById('test-status-banner').className = 'mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3';
    document.getElementById('test-status-icon').textContent = '!';
    document.getElementById('test-status-text').textContent = 'Test run failed';
    document.getElementById('test-status-sub').textContent = e.message;
    toast(e.message, 'error');
  } finally {
    _testRunning = false;
    btnRun.disabled = false;
    btnCov.disabled = false;
    btnRun.textContent = 'Run Tests';
  }
}

/**
 * Runs coverage analysis for all tests
 *
 * Executes coverage reporting via the `/tests/coverage` API endpoint,
 * displays running state, and renders coverage results upon completion.
 *
 * @async
 * @returns {Promise<void>}
 */
export async function runCoverage() {
  if (_testRunning) return;
  _testRunning = true;
  const btnRun = document.getElementById('btn-run-tests');
  const btnCov = document.getElementById('btn-run-coverage');
  btnRun.disabled = true;
  btnCov.disabled = true;
  btnCov.textContent = 'Running...';

  document.getElementById('test-empty').classList.add('hidden');
  document.getElementById('test-summary').classList.add('hidden');
  document.getElementById('test-status-banner').classList.add('hidden');
  document.getElementById('test-results').innerHTML = '';
  document.getElementById('coverage-results').classList.add('hidden');
  document.getElementById('test-running').classList.remove('hidden');

  try {
    const data = await api('/tests/coverage', { method: 'POST' });
    document.getElementById('test-running').classList.add('hidden');
    renderCoverageResults(data);
  } catch (e) {
    document.getElementById('test-running').classList.add('hidden');
    toast(e.message, 'error');
  } finally {
    _testRunning = false;
    btnRun.disabled = false;
    btnCov.disabled = false;
    btnCov.textContent = 'Coverage';
  }
}

/**
 * Renders test execution results in the UI
 *
 * Displays summary statistics (total, passed, failed, duration),
 * status banner (success/failure), and expandable test file cards
 * with individual test results and failure messages.
 *
 * @param {Object} data - Test results from the API
 * @param {number} data.numTotalTests - Total number of tests executed
 * @param {number} data.numPassedTests - Number of tests that passed
 * @param {number} data.numFailedTests - Number of tests that failed
 * @param {number} data.duration - Total execution time in milliseconds
 * @param {boolean} data.success - Overall test run success status
 * @param {Array} data.testFiles - Array of test file results
 * @param {string} [data.raw] - Raw output if structured data unavailable
 */
function renderTestResults(data) {
  // Summary cards
  const summary = document.getElementById('test-summary');
  summary.classList.remove('hidden');
  document.getElementById('test-total').textContent = data.numTotalTests ?? 0;
  document.getElementById('test-passed').textContent = data.numPassedTests ?? 0;
  document.getElementById('test-failed').textContent = data.numFailedTests ?? 0;
  const dur = data.duration ? (data.duration / 1000).toFixed(1) + 's' : '—';
  document.getElementById('test-duration').textContent = dur;

  // Status banner
  const banner = document.getElementById('test-status-banner');
  banner.classList.remove('hidden');
  if (data.success) {
    banner.className = 'mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 flex items-center gap-3';
    document.getElementById('test-status-icon').innerHTML = '<svg class="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    document.getElementById('test-status-text').textContent = 'All tests passed';
    document.getElementById('test-status-sub').textContent = `${data.numPassedTests} tests across ${data.numPassedTestSuites} files in ${dur}`;
  } else {
    banner.className = 'mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3';
    document.getElementById('test-status-icon').innerHTML = '<svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    document.getElementById('test-status-text').textContent = `${data.numFailedTests} test${data.numFailedTests !== 1 ? 's' : ''} failed`;
    document.getElementById('test-status-sub').textContent = `${data.numPassedTests} passed, ${data.numFailedTests} failed in ${dur}`;
  }

  // Test file cards
  const container = document.getElementById('test-results');
  container.innerHTML = '';

  if (!data.testFiles || data.testFiles.length === 0) {
    if (data.raw) {
      container.innerHTML = `<div class="bg-white rounded-2xl border p-4"><pre class="text-xs text-neutral-600 whitespace-pre-wrap overflow-auto max-h-96">${escapeHtml(data.raw)}</pre></div>`;
    }
    return;
  }

  for (const file of data.testFiles) {
    const passed = file.tests.filter(t => t.status === 'passed').length;
    const failed = file.tests.filter(t => t.status === 'failed').length;
    const total = file.tests.length;
    const allPassed = failed === 0;
    const fileDur = file.duration ? (file.duration / 1000).toFixed(2) + 's' : '';

    let html = `<div class="bg-white rounded-2xl border overflow-hidden">`;
    html += `<div class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 transition" onclick="this.nextElementSibling.classList.toggle('hidden')">`;
    html += `<div class="flex items-center gap-3">`;
    html += allPassed
      ? `<span class="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"></span>`
      : `<span class="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0"></span>`;
    html += `<span class="font-medium text-sm text-neutral-800">${escapeHtml(file.file)}</span>`;
    html += `</div>`;
    html += `<div class="flex items-center gap-3 text-xs">`;
    if (fileDur) html += `<span class="text-neutral-400">${fileDur}</span>`;
    html += `<span class="text-green-600 font-medium">${passed} passed</span>`;
    if (failed > 0) html += `<span class="text-red-500 font-medium">${failed} failed</span>`;
    html += `<svg class="w-4 h-4 text-neutral-400 transform transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>`;
    html += `</div></div>`;

    // Expandable test list
    html += `<div class="hidden border-t divide-y">`;
    for (const t of file.tests) {
      const isPassed = t.status === 'passed';
      const icon = isPassed
        ? `<svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
        : `<svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
      html += `<div class="px-4 py-2 flex items-start gap-2 text-sm ${isPassed ? '' : 'bg-red-50'}">`;
      html += icon;
      html += `<div class="min-w-0">`;
      html += `<div class="${isPassed ? 'text-neutral-700' : 'text-red-700'}">${escapeHtml(t.name)}</div>`;
      if (t.duration != null) html += `<div class="text-xs text-neutral-400">${t.duration}ms</div>`;
      if (t.failureMessages && t.failureMessages.length > 0) {
        html += `<pre class="mt-1 text-xs text-red-600 whitespace-pre-wrap overflow-auto max-h-40 bg-red-100 rounded p-2">${escapeHtml(t.failureMessages.join('\n'))}</pre>`;
      }
      html += `</div></div>`;
    }
    html += `</div></div>`;
    container.innerHTML += html;
  }
}

/**
 * Renders code coverage results in the UI
 *
 * Displays a table of coverage metrics (statements, branches, functions, lines)
 * for each file, with color-coded percentages based on thresholds.
 * Shows status banner indicating whether coverage thresholds are met.
 *
 * @param {Object} data - Coverage results from the API
 * @param {boolean} data.success - Whether coverage thresholds are met
 * @param {Array} data.coverage - Array of coverage data per file
 * @param {string} data.coverage[].file - File name or "All files" for summary
 * @param {string} data.coverage[].stmts - Statement coverage percentage
 * @param {string} data.coverage[].branch - Branch coverage percentage
 * @param {string} data.coverage[].funcs - Function coverage percentage
 * @param {string} data.coverage[].lines - Line coverage percentage
 */
function renderCoverageResults(data) {
  const covDiv = document.getElementById('coverage-results');
  covDiv.classList.remove('hidden');
  const tbody = document.getElementById('coverage-tbody');
  tbody.innerHTML = '';

  if (!data.coverage || data.coverage.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-3 text-center text-neutral-400 text-sm">No coverage data available</td></tr>';
    return;
  }

  for (const row of data.coverage) {
    const isAll = row.file === 'All files';
    const cls = isAll ? 'font-semibold bg-neutral-50' : '';
    tbody.innerHTML += `<tr class="${cls} border-t">
      <td class="px-4 py-2 ${isAll ? 'text-neutral-800' : 'text-neutral-600'}">${escapeHtml(row.file)}</td>
      <td class="px-4 py-2 text-right ${covColor(row.stmts)}">${row.stmts}</td>
      <td class="px-4 py-2 text-right ${covColor(row.branch)}">${row.branch}</td>
      <td class="px-4 py-2 text-right ${covColor(row.funcs)}">${row.funcs}</td>
      <td class="px-4 py-2 text-right ${covColor(row.lines)}">${row.lines}</td>
    </tr>`;
  }

  // Show status banner for coverage
  const banner = document.getElementById('test-status-banner');
  banner.classList.remove('hidden');
  if (data.success) {
    banner.className = 'mb-4 rounded-2xl border border-green-200 bg-green-50 p-4 flex items-center gap-3';
    document.getElementById('test-status-icon').innerHTML = '<svg class="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    document.getElementById('test-status-text').textContent = 'Coverage thresholds met';
    document.getElementById('test-status-sub').textContent = 'All coverage thresholds are above minimum requirements';
  } else {
    banner.className = 'mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3';
    document.getElementById('test-status-icon').innerHTML = '<svg class="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>';
    document.getElementById('test-status-text').textContent = 'Coverage thresholds not met';
    document.getElementById('test-status-sub').textContent = 'Some files are below minimum coverage requirements';
  }
}

/**
 * Returns CSS class for coverage percentage color coding
 *
 * @param {string} val - Coverage percentage as string (e.g., "85.5")
 * @returns {string} Tailwind CSS class for text color
 * - Green (font-medium) for >= 80%
 * - Amber for >= 50%
 * - Red for < 50%
 * - Neutral for invalid values
 */
function covColor(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return 'text-neutral-500';
  if (n >= 80) return 'text-green-600 font-medium';
  if (n >= 50) return 'text-amber-600';
  return 'text-red-500';
}
