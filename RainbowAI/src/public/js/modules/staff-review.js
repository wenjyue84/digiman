/**
 * Staff Review Module
 * Allows staff to review unvalidated intent predictions and mark them correct/incorrect.
 * Supports: single review, bulk approve/reject, filter by intent, filter by confidence.
 */

import { api, toast, escapeHtml as esc } from '../core/utils.js';

var TIER_LABELS = {
  't1': '🚨 T1',
  't2': '⚡ T2',
  't3': '📚 T3',
  't4': '🤖 T4',
  't5': '🧠 T5',
  'llm': '🤖 LLM'
};

// Module state
var cachedIntents = null;
var currentPredictions = []; // full list currently displayed
var pendingCount = 0;        // tracks the live pending count
var isFirstLoad = true;      // prevents flashing on re-load
var currentView = 'pending'; // 'pending' | 'history'

// ─── Main loader ─────────────────────────────────────────────────────

export async function loadStaffReview() {
  // If we are in history view, load history instead
  if (currentView === 'history') {
    return loadHistory();
  }

  var loading = document.getElementById('sr-loading');
  var empty = document.getElementById('sr-empty');
  var tableContainer = document.getElementById('sr-table-container');
  var toolbar = document.getElementById('sr-toolbar');

  updateTabUI();

  try {
    // Only show loading spinner on first load (prevents content flash on re-entry)
    if (isFirstLoad) {
      if (loading) loading.classList.remove('hidden');
      if (empty) empty.classList.add('hidden');
      if (tableContainer) tableContainer.classList.add('hidden');
      if (toolbar) toolbar.classList.add('hidden');
    }

    var data = await api('/intent/predictions/pending?limit=100');

    if (loading) loading.classList.add('hidden');
    isFirstLoad = false;

    if (!data || !data.predictions || data.predictions.length === 0) {
      if (tableContainer) tableContainer.classList.add('hidden');
      if (toolbar) toolbar.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
      // Update empty message for pending view
      empty.querySelector('.text-neutral-500').textContent = 'All predictions reviewed!';
      currentPredictions = [];
      pendingCount = 0;
      updateStats();
      return;
    }

    currentPredictions = data.predictions;
    pendingCount = data.total;

    if (empty) empty.classList.add('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');
    if (toolbar) toolbar.classList.remove('hidden');

    updateStats();
    renderTable(currentPredictions);
    populateIntentFilter(currentPredictions);
    ensureIntentsLoaded();
  } catch (err) {
    console.error('[Staff Review] Failed to load:', err);
    if (loading) loading.classList.add('hidden');
    // Don't hide existing content on error — keep stale data visible
    if (isFirstLoad) {
      if (empty) empty.classList.remove('hidden');
    }
    isFirstLoad = false;
    toast('Failed to load pending predictions', 'error');
  }
}

export async function loadHistory() {
  currentView = 'history';
  updateTabUI();

  var loading = document.getElementById('sr-loading');
  var empty = document.getElementById('sr-empty');
  var tableContainer = document.getElementById('sr-table-container');
  var toolbar = document.getElementById('sr-toolbar');

  // Hide toolbar in history view for now
  if (toolbar) toolbar.classList.add('hidden');

  if (loading) loading.classList.remove('hidden');
  if (tableContainer) tableContainer.classList.add('hidden');
  if (empty) empty.classList.add('hidden');

  try {
    var data = await api('/intent/predictions/validated?limit=100');

    if (loading) loading.classList.add('hidden');

    if (!data || !data.predictions || data.predictions.length === 0) {
      if (empty) {
        empty.classList.remove('hidden');
        empty.querySelector('.text-neutral-500').textContent = 'No history found';
      }
      return;
    }

    currentPredictions = data.predictions;

    if (tableContainer) tableContainer.classList.remove('hidden');

    // Render table with history columns
    renderTable(currentPredictions, true);
    ensureIntentsLoaded();
  } catch (err) {
    console.error('[Staff Review] Failed to load history:', err);
    if (loading) loading.classList.add('hidden');
    toast('Failed to load history', 'error');
  }
}

export function switchStaffReviewTab(tab) {
  currentView = tab;
  if (tab === 'history') {
    loadHistory();
  } else {
    loadStaffReview();
  }
}

function updateTabUI() {
  var btnPending = document.getElementById('sr-tab-pending');
  var btnHistory = document.getElementById('sr-tab-history');

  if (currentView === 'pending') {
    if (btnPending) {
      btnPending.classList.remove('text-neutral-500', 'hover:text-neutral-700', 'hover:bg-neutral-50');
      btnPending.classList.add('text-primary-700', 'bg-primary-50');
    }
    if (btnHistory) {
      btnHistory.classList.remove('text-primary-700', 'bg-primary-50');
      btnHistory.classList.add('text-neutral-500', 'hover:text-neutral-700', 'hover:bg-neutral-50');
    }
  } else {
    if (btnHistory) {
      btnHistory.classList.remove('text-neutral-500', 'hover:text-neutral-700', 'hover:bg-neutral-50');
      btnHistory.classList.add('text-primary-700', 'bg-primary-50');
    }
    if (btnPending) {
      btnPending.classList.remove('text-primary-700', 'bg-primary-50');
      btnPending.classList.add('text-neutral-500', 'hover:text-neutral-700', 'hover:bg-neutral-50');
    }
  }
}

// ─── Stats display ───────────────────────────────────────────────────

function updateStats() {
  var el = document.getElementById('sr-stats');
  if (!el) return;
  if (pendingCount > 0) {
    el.innerHTML = '<span class="inline-flex items-center gap-1.5">' +
      '<span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>' +
      '<strong>' + pendingCount + '</strong> pending review</span>';
  } else {
    el.textContent = '0 pending';
  }
}

// ─── Table rendering ─────────────────────────────────────────────────

function renderTable(predictions, isHistory) {
  var tbody = document.getElementById('sr-tbody');
  var thead = document.querySelector('#sr-table-container thead tr');
  if (!tbody || !thead) return;

  // Update headers if needed
  if (isHistory) {
    thead.innerHTML =
      '<th class="px-4 py-3 font-medium">Time</th>' +
      '<th class="px-4 py-3 font-medium">Message</th>' +
      '<th class="px-4 py-3 font-medium">Predicted</th>' +
      '<th class="px-4 py-3 font-medium">Actual</th>' +
      '<th class="px-4 py-3 font-medium text-center">Confidence</th>' +
      '<th class="px-4 py-3 font-medium text-center">Status</th>' +
      '<th class="px-4 py-3 font-medium text-center">Action</th>';
  } else {
    thead.innerHTML =
      '<th class="px-4 py-3 font-medium">Time</th>' +
      '<th class="px-4 py-3 font-medium">Message</th>' +
      '<th class="px-4 py-3 font-medium">Predicted Intent</th>' +
      '<th class="px-4 py-3 font-medium text-center">Confidence</th>' +
      '<th class="px-4 py-3 font-medium text-center">Tier</th>' +
      '<th class="px-4 py-3 font-medium text-center">Action</th>';
  }

  var rows = predictions.map(function (p) {
    var date = new Date(p.createdAt);
    var timeStr = date.toLocaleString('en-MY', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    var msg = p.messageText || '';
    var truncMsg = msg.length > 80 ? msg.substring(0, 77) + '...' : msg;

    var conf = p.confidence || 0;
    var confPct = Math.round(conf * 100);
    var confColor = conf >= 0.8 ? 'text-green-600' : (conf >= 0.5 ? 'text-amber-600' : 'text-red-500');
    var confBg = conf >= 0.8 ? 'bg-green-50' : (conf >= 0.5 ? 'bg-amber-50' : 'bg-red-50');

    var tierLabel = TIER_LABELS[p.tier] || esc(p.tier || '-');

    if (isHistory) {
      var statusHtml = p.wasCorrect
        ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium">Correct</span>'
        : '<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg font-medium">Fixed</span>';

      var editAction = '<button onclick="showCorrectionDropdown(\'' + esc(p.id) + '\')" ' +
        'class="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-3 py-1.5 rounded-lg transition font-medium">' +
        'Edit</button>';

      var actualDisplay = p.wasCorrect ? '<span class="text-neutral-400">-</span>' : '<span class="text-teal-600 font-medium">' + esc(p.actualIntent) + '</span>';

      return '<tr id="sr-row-' + esc(p.id) + '" class="border-b last:border-b-0 hover:bg-neutral-50 transition-all">' +
        '<td class="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">' + timeStr + '</td>' +
        '<td class="px-4 py-3 text-neutral-700" title="' + esc(msg) + '">' + esc(truncMsg) + '</td>' +
        '<td class="px-4 py-3 text-xs">' + esc(p.predictedIntent) + '</td>' +
        '<td class="px-4 py-3 text-xs">' + actualDisplay + '</td>' +
        '<td class="px-4 py-3 text-center"><span class="inline-block ' + confBg + ' ' + confColor + ' text-xs font-bold px-2 py-1 rounded-lg">' + confPct + '%</span></td>' +
        '<td class="px-4 py-3 text-center">' + statusHtml + '</td>' +
        '<td class="px-4 py-3 text-center">' +
        '<div id="sr-actions-' + esc(p.id) + '">' + editAction + '</div>' +
        '<div id="sr-dropdown-' + esc(p.id) + '" class="hidden min-w-[150px] relative z-10">' +
        '<select id="sr-select-' + esc(p.id) + '" onchange="submitCorrection(\'' + esc(p.id) + '\')" ' +
        'class="text-xs border rounded-lg px-2 py-1.5 w-full focus:ring-2 focus:ring-primary-500">' +
        '<option value="">-- Change Intent --</option>' +
        '</select>' +
        '</div>' +
        '</td>' +
        '</tr>';
    } else {
      // Pending View
      // Store confidence as data attribute for filtering
      return '<tr id="sr-row-' + esc(p.id) + '" class="border-b last:border-b-0 hover:bg-neutral-50 transition-all" ' +
        'data-intent="' + esc(p.predictedIntent) + '" data-conf="' + conf + '" data-id="' + esc(p.id) + '">' +
        '<td class="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">' + timeStr + '</td>' +
        '<td class="px-4 py-3 text-neutral-700" title="' + esc(msg) + '">' + esc(truncMsg) + '</td>' +
        '<td class="px-4 py-3"><span class="inline-block bg-primary-50 text-primary-700 text-xs font-medium px-2 py-1 rounded-lg">' + esc(p.predictedIntent) + '</span></td>' +
        '<td class="px-4 py-3 text-center"><span class="inline-block ' + confBg + ' ' + confColor + ' text-xs font-bold px-2 py-1 rounded-lg">' + confPct + '%</span></td>' +
        '<td class="px-4 py-3 text-center text-xs">' + tierLabel + '</td>' +
        '<td class="px-4 py-3 text-center">' +
        '<div id="sr-actions-' + esc(p.id) + '" class="flex items-center justify-center gap-1">' +
        '<button onclick="markPredictionCorrect(\'' + esc(p.id) + '\')" ' +
        'class="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition font-medium" ' +
        'title="Mark as correct">Correct</button>' +
        '<button onclick="showCorrectionDropdown(\'' + esc(p.id) + '\')" ' +
        'class="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition font-medium" ' +
        'title="Mark as wrong and pick correct intent">Wrong</button>' +
        '</div>' +
        '<div id="sr-dropdown-' + esc(p.id) + '" class="hidden">' +
        '<select id="sr-select-' + esc(p.id) + '" onchange="submitCorrection(\'' + esc(p.id) + '\')" ' +
        'class="text-xs border rounded-lg px-2 py-1.5 w-full max-w-[200px] focus:ring-2 focus:ring-primary-500">' +
        '<option value="">-- Pick correct intent --</option>' +
        '</select>' +
        '</div>' +
        '</td>' +
        '</tr>';
    }
  });

  tbody.innerHTML = rows.join('');
}

// ─── Populate intent filter from current predictions ─────────────────

function populateIntentFilter(predictions) {
  var select = document.getElementById('sr-intent-filter');
  if (!select) return;

  var intentSet = {};
  predictions.forEach(function (p) {
    var intent = p.predictedIntent;
    if (!intentSet[intent]) intentSet[intent] = 0;
    intentSet[intent]++;
  });

  var options = '<option value="">-- select intent --</option>';
  Object.keys(intentSet).sort().forEach(function (intent) {
    options += '<option value="' + esc(intent) + '">' + esc(intent) + ' (' + intentSet[intent] + ')</option>';
  });
  select.innerHTML = options;
}

// ─── Pre-load intents for correction dropdowns ──────────────────────

var _intentsPromise = null;

function ensureIntentsLoaded() {
  if (cachedIntents) return Promise.resolve(cachedIntents);
  if (_intentsPromise) return _intentsPromise;
  _intentsPromise = api('/intents').then(function (data) {
    if (data && Array.isArray(data.categories)) {
      // Format: { categories: [{ phase, intents: [{ category, ... }] }] }
      var names = [];
      data.categories.forEach(function (cat) {
        if (Array.isArray(cat.intents)) {
          cat.intents.forEach(function (intent) {
            if (intent.category) names.push(intent.category);
          });
        }
      });
      cachedIntents = names;
    } else if (data && data.intents) {
      cachedIntents = Object.keys(data.intents);
    } else if (data && Array.isArray(data)) {
      cachedIntents = data.map(function (i) { return i.id || i.name || i; });
    } else {
      cachedIntents = [];
    }
    _intentsPromise = null;
    return cachedIntents;
  }).catch(function () {
    cachedIntents = [];
    _intentsPromise = null;
    return cachedIntents;
  });
  return _intentsPromise;
}

// ─── Single row actions ─────────────────────────────────────────────

export async function markPredictionCorrect(id) {
  var row = document.getElementById('sr-row-' + id);
  var actionsEl = document.getElementById('sr-actions-' + id);
  if (actionsEl) actionsEl.innerHTML = '<span class="text-xs text-neutral-400">Saving...</span>';

  // Read predicted intent from data-intent attribute (reliable) with DOM fallback
  var predictedIntent = '';
  if (row && row.dataset.intent) {
    predictedIntent = row.dataset.intent;
  } else if (row) {
    var cells = row.querySelectorAll('td');
    var intentSpan = cells.length >= 3 ? cells[2].querySelector('span') : null;
    predictedIntent = intentSpan ? intentSpan.textContent.trim() : '';
  }

  if (!predictedIntent) {
    // Also check currentPredictions array as final fallback
    var pred = currentPredictions.find(function (p) { return p.id === id; });
    if (pred) predictedIntent = pred.predictedIntent;
  }

  if (!predictedIntent) {
    toast('Could not determine intent for this prediction', 'error');
    if (actionsEl) actionsEl.innerHTML = '<span class="text-xs text-red-500">Error</span>';
    return;
  }

  // Instant counter update
  pendingCount = Math.max(0, pendingCount - 1);
  updateStats();

  try {
    var result = await api('/intent/predictions/' + id, {
      method: 'PATCH',
      body: { actualIntent: predictedIntent }
    });

    if (result && result.success) {
      fadeOutRow(id);
      toast('Marked correct', 'success');
    } else {
      pendingCount++; updateStats();
      toast('Failed to save', 'error');
      if (actionsEl) actionsEl.innerHTML = '<span class="text-xs text-red-500">Failed</span>';
    }
  } catch (err) {
    console.error('[Staff Review] Error marking correct:', err, 'id:', id, 'intent:', predictedIntent);
    pendingCount++; updateStats();
    toast('Failed to mark prediction: ' + (err.message || err), 'error');
    if (actionsEl) actionsEl.innerHTML = '<span class="text-xs text-red-500">Error</span>';
  }
}

export async function showCorrectionDropdown(id) {
  var actionsEl = document.getElementById('sr-actions-' + id);
  var dropdownEl = document.getElementById('sr-dropdown-' + id);
  var selectEl = document.getElementById('sr-select-' + id);
  if (!actionsEl || !dropdownEl || !selectEl) return;

  actionsEl.classList.add('hidden');
  dropdownEl.classList.remove('hidden');

  // Show loading state while fetching intents
  if (!cachedIntents) {
    selectEl.innerHTML = '<option value="">Loading intents...</option>';
    selectEl.disabled = true;
    await ensureIntentsLoaded();
    selectEl.disabled = false;
  }

  var intents = cachedIntents || [];
  var options = '<option value="">-- Pick correct intent --</option>';
  intents.forEach(function (intent) {
    options += '<option value="' + esc(intent) + '">' + esc(intent) + '</option>';
  });
  selectEl.innerHTML = options;
  selectEl.focus();
}

export async function submitCorrection(id) {
  var selectEl = document.getElementById('sr-select-' + id);
  if (!selectEl) return;
  var actualIntent = selectEl.value;
  if (!actualIntent) return;

  var dropdownEl = document.getElementById('sr-dropdown-' + id);
  if (dropdownEl) dropdownEl.innerHTML = '<span class="text-xs text-neutral-400">Saving...</span>';

  // Instant counter update
  pendingCount = Math.max(0, pendingCount - 1);
  updateStats();

  try {
    var result = await api('/intent/predictions/' + id, {
      method: 'PATCH',
      body: { actualIntent: actualIntent }
    });

    if (result && result.success) {
      fadeOutRow(id);
      toast('Corrected to: ' + actualIntent, 'success');
    } else {
      pendingCount++; updateStats();
      toast('Failed to save correction', 'error');
    }
  } catch (err) {
    console.error('[Staff Review] Error submitting correction:', err);
    pendingCount++; updateStats();
    toast('Failed to submit correction', 'error');
  }
}

// ─── Bulk actions ───────────────────────────────────────────────────

export async function bulkApproveAll() {
  var ids = getVisibleRowIds();
  if (ids.length === 0) { toast('No predictions to approve', 'info'); return; }
  if (!confirm('Approve all ' + ids.length + ' visible predictions as correct?')) return;
  await doBulkValidate(ids, true, null, 'Approved ' + ids.length + ' predictions');
}

export async function bulkRejectAll() {
  var ids = getVisibleRowIds();
  if (ids.length === 0) { toast('No predictions to reject', 'info'); return; }
  if (!confirm('Reject all ' + ids.length + ' visible predictions as wrong?')) return;
  await doBulkValidate(ids, false, null, 'Rejected ' + ids.length + ' predictions');
}

export async function bulkApproveAboveThreshold() {
  var threshold = getThresholdValue();
  var ids = getRowIdsByConfidence(function (conf) { return conf >= threshold; });
  if (ids.length === 0) { toast('No predictions above ' + Math.round(threshold * 100) + '%', 'info'); return; }
  await doBulkValidate(ids, true, null, 'Approved ' + ids.length + ' high-confidence predictions');
}

export async function bulkRejectBelowThreshold() {
  var threshold = getThresholdValue();
  var ids = getRowIdsByConfidence(function (conf) { return conf < threshold; });
  if (ids.length === 0) { toast('No predictions below ' + Math.round(threshold * 100) + '%', 'info'); return; }
  await doBulkValidate(ids, false, null, 'Rejected ' + ids.length + ' low-confidence predictions');
}

export async function bulkApproveByIntent() {
  var intent = getSelectedIntent();
  if (!intent) { toast('Select an intent first', 'info'); return; }
  var ids = getRowIdsByIntent(intent);
  if (ids.length === 0) { toast('No predictions for ' + intent, 'info'); return; }
  await doBulkValidate(ids, true, null, 'Approved ' + ids.length + ' "' + intent + '" predictions');
}

export async function bulkRejectByIntent() {
  var intent = getSelectedIntent();
  if (!intent) { toast('Select an intent first', 'info'); return; }
  var ids = getRowIdsByIntent(intent);
  if (ids.length === 0) { toast('No predictions for ' + intent, 'info'); return; }
  await doBulkValidate(ids, false, null, 'Rejected ' + ids.length + ' "' + intent + '" predictions');
}

// ─── Bulk API call + UI update ──────────────────────────────────────

async function doBulkValidate(ids, wasCorrect, actualIntent, successMsg) {
  // Immediately mark rows as processing
  ids.forEach(function (id) {
    var actionsEl = document.getElementById('sr-actions-' + id);
    if (actionsEl) actionsEl.innerHTML = '<span class="text-xs text-neutral-400">...</span>';
    var dropdownEl = document.getElementById('sr-dropdown-' + id);
    if (dropdownEl) dropdownEl.classList.add('hidden');
  });

  // Instant counter update
  pendingCount = Math.max(0, pendingCount - ids.length);
  updateStats();

  try {
    var result = await api('/intent/predictions/bulk-validate', {
      method: 'POST',
      body: { ids: ids, wasCorrect: wasCorrect, actualIntent: actualIntent }
    });

    if (result && result.success) {
      // Fade out all affected rows
      ids.forEach(function (id) { fadeOutRow(id); });
      toast(successMsg, 'success');
    } else {
      pendingCount += ids.length; updateStats();
      toast('Bulk operation failed', 'error');
    }
  } catch (err) {
    console.error('[Staff Review] Bulk error:', err);
    pendingCount += ids.length; updateStats();
    toast('Bulk operation failed', 'error');
    // Reload to restore state
    await loadStaffReview();
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function fadeOutRow(id) {
  var row = document.getElementById('sr-row-' + id);
  if (!row) return;
  row.style.opacity = '0';
  row.style.transition = 'opacity 0.3s ease';
  setTimeout(function () {
    row.remove();
    // Remove from currentPredictions array
    currentPredictions = currentPredictions.filter(function (p) { return p.id !== id; });
    checkIfEmpty();
  }, 300);
}

function checkIfEmpty() {
  var tbody = document.getElementById('sr-tbody');
  var remaining = tbody ? tbody.querySelectorAll('tr').length : 0;

  if (remaining === 0) {
    var tableContainer = document.getElementById('sr-table-container');
    var toolbar = document.getElementById('sr-toolbar');
    var empty = document.getElementById('sr-empty');
    if (tableContainer) tableContainer.classList.add('hidden');
    if (toolbar) toolbar.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
  }
}

function getVisibleRowIds() {
  var rows = document.querySelectorAll('#sr-tbody tr[data-id]');
  var ids = [];
  rows.forEach(function (row) { ids.push(row.getAttribute('data-id')); });
  return ids;
}

function getRowIdsByConfidence(filterFn) {
  var rows = document.querySelectorAll('#sr-tbody tr[data-id]');
  var ids = [];
  rows.forEach(function (row) {
    var conf = parseFloat(row.getAttribute('data-conf') || '0');
    if (filterFn(conf)) ids.push(row.getAttribute('data-id'));
  });
  return ids;
}

function getRowIdsByIntent(intent) {
  var rows = document.querySelectorAll('#sr-tbody tr[data-id]');
  var ids = [];
  rows.forEach(function (row) {
    if (row.getAttribute('data-intent') === intent) ids.push(row.getAttribute('data-id'));
  });
  return ids;
}

function getThresholdValue() {
  var input = document.getElementById('sr-conf-threshold');
  var val = input ? parseInt(input.value, 10) : 80;
  return (isNaN(val) ? 80 : val) / 100;
}

function getSelectedIntent() {
  var select = document.getElementById('sr-intent-filter');
  return select ? select.value : '';
}

// ─── Refresh ────────────────────────────────────────────────────────

export async function refreshStaffReview() {
  toast('Refreshing...', 'info');
  cachedIntents = null;
  isFirstLoad = false; // prevent flash on refresh
  await loadStaffReview();
  toast('Updated', 'success');
}
