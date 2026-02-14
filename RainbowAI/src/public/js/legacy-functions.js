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

// Language tab switching
document.addEventListener('DOMContentLoaded', () => {
  // Initialize autotest history (functions now in ES6 modules, use window refs with delay)
  setTimeout(() => {
    if (window.loadAutotestHistory) window.loadAutotestHistory();
    if (window.updateHistoryButtonVisibility) window.updateHistoryButtonVisibility();
    // Update dynamic scenario count
    const scenarioCountEl = document.getElementById('scenario-count');
    if (scenarioCountEl && window.AUTOTEST_SCENARIOS) {
      scenarioCountEl.textContent = window.AUTOTEST_SCENARIOS.length;
    }
  }, 50);
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

