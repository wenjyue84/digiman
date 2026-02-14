import { api } from '../api.js';
import { toast } from '../toast.js';

const DEFAULTS = { classify: 5, reply: 10, combined: 20 };

/**
 * Render the Context Windows configuration card HTML.
 * @param {{ classify: number, reply: number, combined: number }} cw - Current context window values
 * @returns {string} HTML string
 */
export function renderContextWindowsCard(cw) {
  const vals = cw || DEFAULTS;
  return '<div class="bg-white border rounded-2xl p-6 mt-6">'
    + '<div class="flex items-start justify-between mb-4">'
    + '<div>'
    + '<h3 class="font-semibold text-lg">Context Windows</h3>'
    + '<p class="text-sm text-neutral-500 font-medium">How many conversation messages the LLM reads for each operation. Lower = faster/cheaper, higher = more context.</p>'
    + '</div>'
    + '</div>'
    + '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">'
    + renderInput('cw-classify', 'Classification', vals.classify, 'T4 intent detection + workflow eval')
    + renderInput('cw-reply', 'Reply Generation', vals.reply, 'Reply-only after fast-tier classify')
    + renderInput('cw-combined', 'Combined (Classify + Reply)', vals.combined, 'T5 full classify+reply, chat, smart fallback')
    + '</div>'
    + '<div class="flex items-center gap-3 mt-4">'
    + '<button type="button" onclick="saveContextWindows()" class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-xl transition">Save</button>'
    + '<button type="button" onclick="resetContextWindows()" class="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-xl transition">Reset Defaults</button>'
    + '<span id="cw-status" class="text-xs text-neutral-400 ml-2"></span>'
    + '</div>'
    + '</div>';
}

function renderInput(id, label, value, hint) {
  return '<div>'
    + '<label for="' + id + '" class="block text-sm font-medium text-neutral-700 mb-1">' + label + '</label>'
    + '<input type="number" id="' + id + '" value="' + value + '" min="1" max="50" step="1"'
    + ' class="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-400 transition" />'
    + '<p class="text-[11px] text-neutral-400 mt-1">' + hint + '</p>'
    + '</div>';
}

function readInputs() {
  var classify = parseInt(document.getElementById('cw-classify').value, 10);
  var reply = parseInt(document.getElementById('cw-reply').value, 10);
  var combined = parseInt(document.getElementById('cw-combined').value, 10);
  return { classify: classify, reply: reply, combined: combined };
}

function validate(cw) {
  for (var key of ['classify', 'reply', 'combined']) {
    var v = cw[key];
    if (!Number.isInteger(v) || v < 1 || v > 50) {
      return key + ' must be an integer between 1 and 50';
    }
  }
  return null;
}

export async function saveContextWindows() {
  var cw = readInputs();
  var err = validate(cw);
  if (err) { toast(err, 'error'); return; }

  try {
    // Fetch current settings, merge contextWindows, then PUT
    var current = await api('/intent-manager/llm-settings');
    current.contextWindows = cw;
    await api('/intent-manager/llm-settings', { method: 'PUT', body: current });
    toast('Context windows saved!', 'success');
    var statusEl = document.getElementById('cw-status');
    if (statusEl) statusEl.textContent = 'Saved';
  } catch (e) {
    toast('Failed to save context windows: ' + e.message, 'error');
  }
}
window.saveContextWindows = saveContextWindows;

export async function resetContextWindows() {
  document.getElementById('cw-classify').value = DEFAULTS.classify;
  document.getElementById('cw-reply').value = DEFAULTS.reply;
  document.getElementById('cw-combined').value = DEFAULTS.combined;
  await saveContextWindows();
}
window.resetContextWindows = resetContextWindows;
