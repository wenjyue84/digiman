/**
 * @fileoverview Intent Manager — keyword/example CRUD, tier management, threshold overrides
 * @module intent-manager
 */

import { toast } from '../core/utils.js';

// ─── Utility ─────────────────────────────────────────────────────────────
function esc(s) { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

// ─── State ───────────────────────────────────────────────────────────────
let imKeywordsData = null;
let imExamplesData = null;
let imCurrentIntent = null;
let imCurrentExampleIntent = null;
let imCurrentLang = 'en';
let imIntentsData = null; // Store intents.json data for threshold management

// ─── Load Intent Manager Data ────────────────────────────────────────────

export async function loadIntentManagerData() {
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

    // Populate quick-add intent select dropdown
    renderQuickAddIntentSelect();

    // Load T1 regex patterns
    if (window.loadRegexPatterns) await window.loadRegexPatterns();

    // Load T4 LLM settings
    if (window.loadLLMSettings) await window.loadLLMSettings();

    // Load tier enabled states
    loadTierStates();

    // Set up tier toggle event listeners
    setupTierToggles();
  } catch (err) {
    console.error('Failed to load Intent Manager data:', err);
    toast('Failed to load data', 'error');
  }
}

// ─── Tier Expand/Collapse ────────────────────────────────────────────────

export function toggleTier(tierId, updateHash = true) {
  const content = document.getElementById(tierId + '-content');
  const btn = document.getElementById(tierId + '-toggle-btn');
  if (!content || !btn) return;

  const isExpanded = content.classList.contains('hidden');
  if (isExpanded) {
    content.classList.remove('hidden');
    btn.classList.add('is-expanded');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Collapse section');

    if (updateHash) {
      const newHash = 'understanding/' + tierId;
      if (window.location.hash.slice(1) !== newHash) {
        window.location.hash = newHash;
      }
    }
  } else {
    content.classList.add('hidden');
    btn.classList.remove('is-expanded');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Expand section');

    if (updateHash) {
      const currentHash = window.location.hash.slice(1);
      if (currentHash === 'understanding/' + tierId) {
        window.location.hash = 'understanding';
      }
    }
  }
}

// ─── Tier State Management ───────────────────────────────────────────────

export async function loadTierStates() {
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

export async function resetToDefaults() {
  if (!confirm('Reset all layers to default settings?\n\nThis will:\n- Enable Priority Keywords\n- Enable Smart Matching\n- Enable Learning Examples\n- Enable AI Fallback')) return;

  const defaults = { tier1: true, tier2: true, tier3: true, tier4: true };
  localStorage.setItem('tierStates', JSON.stringify(defaults));

  // Update UI
  document.getElementById('tier1-enabled').checked = true;
  document.getElementById('tier2-enabled').checked = true;
  document.getElementById('tier3-enabled').checked = true;
  document.getElementById('tier4-enabled').checked = true;
  updateTier4StatusLabel(true);

  // Save to backend
  try {
    const promises = [
      saveTierState('tier1', true),
      saveTierState('tier2', true),
      saveTierState('tier3', true),
      saveTierState('tier4', true)
    ];
    await Promise.all(promises);
    toast('Reset to defaults', 'success');
  } catch (e) {
    console.error('Failed to reset:', e);
    toast('Failed to reset', 'error');
  }
}

export function updateTier4StatusLabel(enabled) {
  const el = document.getElementById('tier4-status-label');
  if (el) el.textContent = enabled ? 'Enabled' : 'Disabled';
}

export function setupTierToggles() {
  document.getElementById('tier1-enabled').addEventListener('change', (e) => {
    saveTierState('tier1', e.target.checked);
    toast('Priority Keywords ' + (e.target.checked ? 'Enabled' : 'Disabled'), 'info');
  });

  document.getElementById('tier2-enabled').addEventListener('change', (e) => {
    saveTierState('tier2', e.target.checked);
    toast('Smart Matching ' + (e.target.checked ? 'Enabled' : 'Disabled'), 'info');
  });

  document.getElementById('tier3-enabled').addEventListener('change', (e) => {
    saveTierState('tier3', e.target.checked);
    toast('Learning Examples ' + (e.target.checked ? 'Enabled' : 'Disabled'), 'info');
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
    toast('AI Fallback ' + (enabled ? 'Enabled' : 'Disabled'), enabled ? 'success' : 'info');
  });
}

export async function saveTierState(tier, enabled) {
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

// ─── Intent List Rendering ───────────────────────────────────────────────

export function renderIntentList() {
  const list = document.getElementById('im-intent-list');
  if (!imKeywordsData) return;

  list.innerHTML = imKeywordsData.intents.map(intent => {
    const totalKeywords = Object.values(intent.keywords).flat().length;
    return '<button onclick="selectIntent(\'' + intent.intent + '\')" class="im-intent-btn w-full text-left px-3 py-2 rounded-2xl text-sm hover:bg-neutral-100 transition" data-intent="' + intent.intent + '">'
      + '<div class="font-medium">' + intent.intent + '</div>'
      + '<div class="text-xs text-neutral-500">' + totalKeywords + ' keywords</div>'
      + '</button>';
  }).join('');

  // Auto-select the first intent on load
  if (imKeywordsData.intents && imKeywordsData.intents.length > 0) {
    selectIntent(imKeywordsData.intents[0].intent);
  }
}

export function getExampleCount(examples) {
  if (!examples) return 0;
  if (Array.isArray(examples)) return examples.length;
  if (typeof examples === 'object') return Object.values(examples).flat().length;
  return 0;
}

export function getExamplesList(examples) {
  if (!examples) return [];
  if (Array.isArray(examples)) return examples.slice();
  if (typeof examples === 'object') return Object.values(examples).flat();
  return [];
}

export function renderExampleIntentList() {
  const list = document.getElementById('im-example-intent-list');
  if (!imExamplesData) return;

  list.innerHTML = imExamplesData.intents.map(intent => {
    const count = getExampleCount(intent.examples);
    return '<button onclick="selectExampleIntent(\'' + intent.intent + '\')" class="im-example-intent-btn w-full text-left px-3 py-2 rounded-2xl text-sm hover:bg-neutral-100 transition" data-intent="' + intent.intent + '">'
      + '<div class="font-medium">' + intent.intent + '</div>'
      + '<div class="text-xs text-neutral-500">' + count + ' examples</div>'
      + '</button>';
  }).join('');

  // Auto-select the first intent on load
  if (imExamplesData.intents && imExamplesData.intents.length > 0) {
    selectExampleIntent(imExamplesData.intents[0].intent);
  }
}

// ─── Intent Selection ────────────────────────────────────────────────────

export function selectIntent(intent) {
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

  renderKeywords();
  loadTierThresholds(intent, 't2');
}

export function selectExampleIntent(intent) {
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

  renderExamples();
  loadTierThresholds(intent, 't3');
}

// ─── Keywords CRUD ───────────────────────────────────────────────────────

export function renderKeywords() {
  const intentData = imKeywordsData.intents.find(i => i.intent === imCurrentIntent);
  if (!intentData) return;

  ['en', 'ms', 'zh'].forEach(lang => {
    const keywords = intentData.keywords[lang] || [];
    const listEl = document.getElementById('im-keyword-list-' + lang);
    const countEl = document.getElementById('im-count-' + lang);

    countEl.textContent = keywords.length;
    listEl.innerHTML = keywords.map(kw =>
      '<span class="inline-flex items-center gap-1 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm">'
      + esc(kw)
      + '<button onclick="removeKeyword(\'' + lang + '\', \'' + esc(kw) + '\')" class="hover:text-danger-500 transition">×</button>'
      + '</span>'
    ).join('');
  });
}

export function renderExamples() {
  const intentData = imExamplesData.intents.find(i => i.intent === imCurrentExampleIntent);
  if (!intentData) return;

  const examples = getExamplesList(intentData.examples);
  const listEl = document.getElementById('im-example-list');
  const countEl = document.getElementById('im-example-count');

  if (countEl) countEl.textContent = examples.length;
  listEl.innerHTML = examples.map(ex =>
    '<span class="inline-flex items-center gap-1 bg-success-50 text-success-700 px-3 py-1 rounded-full text-sm">'
    + esc(ex)
    + '<button onclick="removeExample(\'' + esc(ex) + '\')" class="hover:text-danger-500 transition">×</button>'
    + '</span>'
  ).join('');
}

export function addKeyword(lang) {
  const input = document.getElementById('im-keyword-input-' + lang);
  const keyword = input.value.trim();
  if (!keyword) return;

  const intentData = imKeywordsData.intents.find(i => i.intent === imCurrentIntent);
  if (!intentData) return;

  if (!intentData.keywords[lang]) intentData.keywords[lang] = [];
  if (intentData.keywords[lang].includes(keyword)) {
    toast('Keyword already exists', 'error');
    return;
  }

  intentData.keywords[lang].push(keyword);
  input.value = '';
  renderKeywords();
}

export function removeKeyword(lang, keyword) {
  const intentData = imKeywordsData.intents.find(i => i.intent === imCurrentIntent);
  if (!intentData) return;
  intentData.keywords[lang] = intentData.keywords[lang].filter(k => k !== keyword);
  renderKeywords();
}

export function addExample() {
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

export function removeExample(example) {
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

export async function saveKeywords() {
  if (!imCurrentIntent) return;

  const intentData = imKeywordsData.intents.find(i => i.intent === imCurrentIntent);
  if (!intentData) return;

  try {
    const res = await fetch('/api/rainbow/intent-manager/keywords/' + imCurrentIntent, {
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

export async function saveExamples() {
  if (!imCurrentExampleIntent) return;

  const intentData = imExamplesData.intents.find(i => i.intent === imCurrentExampleIntent);
  if (!intentData) return;

  try {
    const res = await fetch('/api/rainbow/intent-manager/examples/' + imCurrentExampleIntent, {
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

// ─── Tier Threshold Overrides ────────────────────────────────────────────

export async function loadTierThresholds(intent, tier) {
  if (!imIntentsData) {
    try {
      const res = await fetch('/api/rainbow/intents');
      imIntentsData = await res.json();
    } catch (err) {
      console.error('Failed to load intents data:', err);
      return;
    }
  }

  let intentData = null;
  for (const category of (imIntentsData.categories || [])) {
    const found = category.intents.find(i => i.category === intent);
    if (found) { intentData = found; break; }
  }
  if (!intentData) return;

  const inputEl = document.getElementById('im-' + tier + '-threshold');
  const statusEl = document.getElementById('im-' + tier + '-status');
  const resetBtn = document.getElementById('im-' + tier + '-reset-btn');

  const defaultValue = tier === 't2' ? 0.80 : 0.70;
  const thresholdKey = tier === 't2' ? 't2_fuzzy_threshold' : 't3_semantic_threshold';
  const currentValue = intentData[thresholdKey];

  if (currentValue !== undefined && currentValue !== null) {
    inputEl.value = currentValue.toFixed(2);
    statusEl.textContent = 'Override active: ' + currentValue.toFixed(2);
    statusEl.classList.add('font-semibold', 'text-primary-600');
    resetBtn.classList.remove('hidden');
  } else {
    inputEl.value = '';
    inputEl.placeholder = 'Use default (' + defaultValue.toFixed(2) + ')';
    statusEl.textContent = 'Using default: ' + defaultValue.toFixed(2);
    statusEl.classList.remove('font-semibold', 'text-primary-600');
    resetBtn.classList.add('hidden');
  }
}

export async function handleTierThresholdChange(tier, value) {
  const intent = tier === 't2' ? imCurrentIntent : imCurrentExampleIntent;
  if (!intent) return;

  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue < 0 || numValue > 1) {
    toast('Threshold must be between 0 and 1', 'error');
    return;
  }

  const defaultValue = tier === 't2' ? 0.80 : 0.70;
  const tierName = tier === 't2' ? 'Smart Matching' : 'Learning Examples';

  const confirmed = confirm(
    'Override ' + tierName + ' Threshold for "' + intent + '"?\n\n'
    + 'You\'re setting a custom threshold of ' + numValue.toFixed(2) + ' for this intent.\n\n'
    + 'IMPLICATIONS:\n'
    + '  Default: ' + defaultValue.toFixed(2) + ' (global threshold)\n'
    + '  New: ' + numValue.toFixed(2) + ' (' + (numValue > defaultValue ? 'STRICTER' : 'LOOSER') + ' matching)\n\n'
    + (numValue > defaultValue
      ? '-> STRICTER: This intent will be HARDER to match. Use if you want to avoid false positives.'
      : '-> LOOSER: This intent will be EASIER to match. Use if you want to catch more variations.') + '\n\n'
    + 'This override applies ONLY to this intent. Other intents use the global threshold.\n\n'
    + 'Click OK to confirm, or Cancel to abort.'
  );

  if (!confirmed) {
    await loadTierThresholds(intent, tier);
    return;
  }

  try {
    const thresholdKey = tier === 't2' ? 't2_fuzzy_threshold' : 't3_semantic_threshold';
    const res = await fetch('/api/rainbow/intents/' + encodeURIComponent(intent), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [thresholdKey]: numValue })
    });
    if (!res.ok) throw new Error('Failed to save threshold');

    toast(tierName + ' threshold set to ' + numValue.toFixed(2) + ' for "' + intent + '"', 'success');
    imIntentsData = null; // Invalidate cache
    await loadTierThresholds(intent, tier);
  } catch (err) {
    console.error('Failed to save threshold:', err);
    toast('Failed to save threshold', 'error');
    await loadTierThresholds(intent, tier);
  }
}

export async function resetTierThreshold(tier) {
  const intent = tier === 't2' ? imCurrentIntent : imCurrentExampleIntent;
  if (!intent) return;

  const tierName = tier === 't2' ? 'Smart Matching' : 'Learning Examples';
  const defaultValue = tier === 't2' ? 0.80 : 0.70;

  const confirmed = confirm(
    'Reset ' + tierName + ' threshold for "' + intent + '" to default?\n\n'
    + 'This will remove the custom override and use the global threshold (' + defaultValue.toFixed(2) + ') instead.'
  );
  if (!confirmed) return;

  try {
    const thresholdKey = tier === 't2' ? 't2_fuzzy_threshold' : 't3_semantic_threshold';
    const res = await fetch('/api/rainbow/intents/' + encodeURIComponent(intent), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [thresholdKey]: null })
    });
    if (!res.ok) throw new Error('Failed to reset threshold');

    toast(tierName + ' threshold reset to default (' + defaultValue.toFixed(2) + ')', 'success');
    imIntentsData = null;
    await loadTierThresholds(intent, tier);
  } catch (err) {
    console.error('Failed to reset threshold:', err);
    toast('Failed to reset threshold', 'error');
  }
}

// ─── Test Intent ─────────────────────────────────────────────────────────

export async function testIntentManager() {
  const input = document.getElementById('im-test-input');
  const text = input.value.trim();
  if (!text) return;

  try {
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

export async function exportIntentData(format) {
  try {
    const url = '/api/rainbow/intent-manager/export?format=' + format;
    window.open(url, '_blank');
    toast('Exporting as ' + format.toUpperCase() + '...', 'success');
  } catch (err) {
    console.error('Failed to export:', err);
    toast('Failed to export', 'error');
  }
}

// ─── Quick Add Keywords/Examples (from message text) ────────────────────

export function renderQuickAddIntentSelect() {
  const select = document.getElementById('im-quick-intent-select');
  if (!select || !imKeywordsData) return;

  const options = '<option value="">Select Intent</option>' + imKeywordsData.intents.map(function(intent) {
    return '<option value="' + esc(intent.intent) + '">' + esc(intent.intent) + '</option>';
  }).join('');

  select.innerHTML = options;
}

export async function quickAddKeyword() {
  const intentSelect = document.getElementById('im-quick-intent-select');
  const textInput = document.getElementById('im-quick-text-input');
  const langSelect = document.getElementById('im-quick-lang-select');

  const intent = intentSelect.value;
  const text = textInput.value.trim();
  const lang = langSelect.value;

  if (!intent || !text) {
    toast('Please select an intent and enter text', 'error');
    return;
  }

  try {
    const res = await fetch('/api/rainbow/intent-manager/keywords');
    const data = await res.json();

    const intentData = data.intents.find(function(i) { return i.intent === intent; });
    if (!intentData) {
      toast('Intent not found', 'error');
      return;
    }

    if (!intentData.keywords[lang]) intentData.keywords[lang] = [];

    const normalized = text.toLowerCase().trim();
    const existing = intentData.keywords[lang].map(function(k) { return k.toLowerCase().trim(); });

    if (existing.indexOf(normalized) !== -1) {
      toast('Keyword "' + text + '" already exists for ' + intent + ' (' + lang + ')', 'error');
      return;
    }

    intentData.keywords[lang].push(text);

    const saveRes = await fetch('/api/rainbow/intent-manager/keywords/' + encodeURIComponent(intent), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: intentData.keywords })
    });

    if (!saveRes.ok) throw new Error('Failed to save');

    toast('Keyword "' + text + '" added to ' + intent + ' (' + lang + ')', 'success');
    textInput.value = '';

    if (imCurrentIntent === intent) {
      imKeywordsData = data;
      renderKeywords();
      renderIntentList();
    }
  } catch (err) {
    console.error('Failed to add keyword:', err);
    toast('Failed to add keyword', 'error');
  }
}

export async function quickAddExample() {
  const intentSelect = document.getElementById('im-quick-intent-select');
  const textInput = document.getElementById('im-quick-text-input');

  const intent = intentSelect.value;
  const text = textInput.value.trim();

  if (!intent || !text) {
    toast('Please select an intent and enter text', 'error');
    return;
  }

  try {
    const res = await fetch('/api/rainbow/intent-manager/examples');
    const data = await res.json();

    const intentData = data.intents.find(function(i) { return i.intent === intent; });
    if (!intentData) {
      toast('Intent not found', 'error');
      return;
    }

    const ex = intentData.examples;
    const normalized = text.toLowerCase().trim();

    if (Array.isArray(ex)) {
      const existingNorm = ex.map(function(e) { return e.toLowerCase().trim(); });
      if (existingNorm.indexOf(normalized) !== -1) {
        toast('Example "' + text + '" already exists for ' + intent, 'error');
        return;
      }
      ex.push(text);
    } else if (ex && typeof ex === 'object') {
      const flat = getExamplesList(ex);
      const existingNorm = flat.map(function(e) { return e.toLowerCase().trim(); });
      if (existingNorm.indexOf(normalized) !== -1) {
        toast('Example "' + text + '" already exists for ' + intent, 'error');
        return;
      }
      if (!ex.en) ex.en = [];
      ex.en.push(text);
    } else {
      intentData.examples = [text];
    }

    const saveRes = await fetch('/api/rainbow/intent-manager/examples/' + encodeURIComponent(intent), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examples: intentData.examples })
    });

    if (!saveRes.ok) throw new Error('Failed to save');

    toast('Example "' + text + '" added to ' + intent, 'success');
    textInput.value = '';

    if (imCurrentExampleIntent === intent) {
      imExamplesData = data;
      renderExamples();
      renderExampleIntentList();
    }
  } catch (err) {
    console.error('Failed to add example:', err);
    toast('Failed to add example', 'error');
  }
}

// ─── Tier UI Helper ──────────────────────────────────────────────────────

export function updateTierUI(tiers) {
  if (tiers.tier1_emergency) {
    document.getElementById('tier1-enabled').checked = tiers.tier1_emergency.enabled;
  }
  if (tiers.tier2_fuzzy) {
    document.getElementById('tier2-enabled').checked = tiers.tier2_fuzzy.enabled;
  }
  if (tiers.tier3_semantic) {
    document.getElementById('tier3-enabled').checked = tiers.tier3_semantic.enabled;
  }
  if (tiers.tier4_llm) {
    document.getElementById('tier4-enabled').checked = tiers.tier4_llm.enabled;
  }
}

// ─── Help Guide Toggle (lazy-loaded from partial) ───────────────────────

let _imHelpLoaded = false;

export function toggleHelp() {
  const content = document.getElementById('intent-help-content');
  const icon = document.getElementById('help-toggle-icon');
  const text = document.getElementById('help-toggle-text');
  if (!content || !icon || !text) return;

  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    icon.textContent = '\u25BC';
    text.textContent = 'Collapse Guide';
    if (!_imHelpLoaded) {
      fetch('/api/rainbow/templates/intent-manager-help')
        .then(function(r) { return r.ok ? r.text() : Promise.reject('Failed to load'); })
        .then(function(html) { content.innerHTML = html; _imHelpLoaded = true; })
        .catch(function() { content.innerHTML = '<div class="text-center py-8 text-danger-500">Failed to load guide. Please refresh the page.</div>'; });
    }
  } else {
    content.classList.add('hidden');
    icon.textContent = '\u25B6';
    text.textContent = 'Expand Guide';
  }
}

// ─── Event Delegation (language tabs, dropdown close) ────────────────────

// Run All dropdown close (uses event delegation)
document.addEventListener('click', (e) => {
  const container = document.getElementById('run-all-dropdown');
  const menu = document.getElementById('run-all-dropdown-menu');
  if (container && menu && !menu.classList.contains('hidden') && !container.contains(e.target)) {
    if (window.closeRunAllDropdown) window.closeRunAllDropdown();
  }
});

// Language tab switching (event delegation for dynamically loaded Understanding template)

