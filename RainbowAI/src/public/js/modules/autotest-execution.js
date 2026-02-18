/**
 * @fileoverview Autotest execution core - scenario running, validation, rule evaluation,
 * and UI bridge functions for the Chat Simulator tab.
 * @module autotest-execution
 */

import { api, toast } from '../core/utils.js';

// ─── State ─────────────────────────────────────────────────────────────
let cachedRouting = null;

// ─── Constants ─────────────────────────────────────────────────────────
// Map scenario id → primary intent (for filtering by current template routing)
const SCENARIO_ID_TO_INTENT = {
  'general-greeting-en': 'greeting', 'general-greeting-ms': 'greeting',
  'general-thanks': 'thanks', 'general-contact-staff': 'contact_staff',
  'prearrival-pricing': 'pricing', 'prearrival-availability': 'availability',
  'prearrival-booking': 'booking', 'prearrival-directions': 'directions',
  'prearrival-facilities': 'facilities_info', 'prearrival-rules': 'rules_policy',
  'prearrival-rules-pets': 'rules_policy', 'prearrival-payment-info': 'payment_info',
  'prearrival-payment-made': 'payment_made', 'prearrival-checkin-info': 'checkin_info',
  'prearrival-checkout-info': 'checkout_info', 'arrival-checkin': 'check_in_arrival',
  'arrival-lower-deck': 'lower_deck_preference', 'arrival-wifi': 'wifi',
  'arrival-facility-orientation': 'facility_orientation',
  'duringstay-climate-too-cold': 'climate_control_complaint', 'duringstay-climate-too-hot': 'climate_control_complaint',
  'duringstay-noise-neighbors': 'noise_complaint', 'duringstay-noise-construction': 'noise_complaint', 'duringstay-noise-baby': 'noise_complaint',
  'duringstay-cleanliness-room': 'cleanliness_complaint', 'duringstay-cleanliness-bathroom': 'cleanliness_complaint',
  'duringstay-facility-ac': 'facility_malfunction', 'duringstay-card-locked': 'card_locked',
  'duringstay-theft-laptop': 'theft_report', 'duringstay-theft-jewelry': 'theft_report',
  'duringstay-general-complaint': 'complaint', 'duringstay-extra-towel': 'extra_amenity_request',
  'duringstay-extra-pillow': 'extra_amenity_request', 'duringstay-tourist-guide': 'tourist_guide',
  'checkout-procedure': 'checkout_procedure', 'checkout-late-request': 'late_checkout_request',
  'checkout-late-denied': 'late_checkout_request', 'checkout-luggage-storage': 'luggage_storage',
  'checkout-billing': 'billing_inquiry', 'postcheckout-forgot-charger': 'forgot_item_post_checkout',
  'postcheckout-forgot-passport': 'forgot_item_post_checkout', 'postcheckout-forgot-clothes': 'forgot_item_post_checkout',
  'postcheckout-complaint-food': 'post_checkout_complaint', 'postcheckout-complaint-service': 'post_checkout_complaint',
  'postcheckout-billing-dispute': 'billing_dispute', 'postcheckout-billing-minor': 'billing_inquiry',
  'postcheckout-review-positive': 'review_feedback', 'postcheckout-review-negative': 'review_feedback',
  'multilingual-chinese-greeting': 'greeting', 'multilingual-mixed-booking': 'booking',
  'multilingual-chinese-bill': 'billing_dispute', 'multilingual-malay-wifi': 'wifi',
  'edge-gibberish': 'unknown', 'edge-emoji': 'greeting', 'edge-long-message': 'booking',
  'edge-prompt-injection': 'greeting',
  // Paraphrase resilience
  'paraphrase-pricing-colloquial': 'pricing', 'paraphrase-pricing-formal': 'pricing',
  'paraphrase-wifi-indirect': 'wifi', 'paraphrase-checkin-time-informal': 'checkin_info',
  'paraphrase-checkout-time-informal': 'checkout_info', 'paraphrase-directions-taxi': 'directions',
  'paraphrase-booking-want-stay': 'booking', 'paraphrase-complaint-rude': 'complaint',
  'paraphrase-amenity-blanket': 'climate_control_complaint', 'paraphrase-lower-deck-question': 'lower_deck_preference',
  // Typo tolerance
  'typo-wifi-pasword': 'wifi', 'typo-checkin-chekin': 'check_in_arrival',
  'typo-booking-bokking': 'booking', 'typo-thnks': 'thanks',
  'typo-towl': 'extra_amenity_request', 'typo-lugage-storage': 'luggage_storage',
  // Abbreviation/slang
  'slang-tq': 'thanks', 'slang-tqvm': 'thanks', 'slang-brp-harga': 'pricing',
  'slang-bole-checkin': 'checkin_info', 'slang-thx': 'thanks', 'slang-nk-tny-harga': 'pricing',
  // Multilingual expanded
  'ml-malay-pricing': 'pricing', 'ml-malay-directions': 'directions',
  'ml-malay-complaint': 'cleanliness_complaint', 'ml-malay-checkout-time': 'checkout_info',
  'ml-chinese-pricing': 'pricing', 'ml-chinese-wifi': 'wifi',
  'ml-chinese-checkin': 'check_in_arrival', 'ml-chinese-complaint': 'noise_complaint',
  // Capsule specific
  'capsule-which-lower': 'lower_deck_preference', 'capsule-is-c4-lower': 'lower_deck_preference',
  'capsule-bottom-bunk': 'lower_deck_preference', 'capsule-female-section': 'facilities_info',
  // Context switching
  'context-greeting-then-price': 'pricing', 'context-thanks-then-question': 'wifi',
  'context-double-intent': 'pricing', 'context-complaint-then-wifi': 'wifi',
  // Edge cases expanded
  'edge-single-word': 'pricing', 'edge-single-word-wifi': 'wifi',
  'edge-question-marks-only': 'unknown', 'edge-repeated-word': 'greeting',
  'edge-numbers-only': 'unknown', 'edge-prompt-injection-v2': 'greeting',
  // Multi-turn intent scenarios
  'mt-noise-followup': 'noise_complaint', 'mt-booking-full-flow': 'pricing',
  'mt-complaint-escalation': 'cleanliness_complaint', 'mt-checkin-flow': 'checkin_info',
  'mt-billing-dispute': 'billing_inquiry', 'mt-checkout-luggage': 'checkout_info',
  'workflow-booking-payment-full': 'booking', 'workflow-checkin-full': 'check_in_arrival',
  'workflow-lower-deck-full': 'lower_deck_preference', 'workflow-complaint-full': 'complaint',
  'workflow-theft-emergency-full': 'theft_report', 'workflow-card-locked-full': 'card_locked',
  'workflow-tourist-guide-full': 'tourist_guide',
  'conv-long-conversation': 'checkin_info', 'conv-context-preservation': 'booking',
  'conv-coherent-responses': 'availability', 'conv-performance-check': 'greeting',
  'sentiment-frustrated-guest': 'complaint', 'sentiment-angry-complaint': 'complaint',
  'sentiment-consecutive-negative': 'complaint', 'sentiment-cooldown-period': 'complaint'
};

// ─── Routing Configuration ────────────────────────────────────────────

/**
 * Get routing configuration for autotest (cached)
 */
export async function getRoutingForAutotest() {
  if (cachedRouting && Object.keys(cachedRouting).length > 0) return cachedRouting;
  try {
    const r = await api('/routing');
    cachedRouting = r;
    return r;
  } catch (e) { return {}; }
}

/**
 * Get scenarios that match a specific action (for "Run All X" dropdowns)
 */
export function getAutotestScenariosByAction(action) {
  const routing = cachedRouting || {};
  const intentIds = Object.keys(routing).filter(id => {
    const route = routing[id];
    const routeAction = typeof route === 'string' ? route : route?.action;
    return routeAction === action;
  });
  const scenarioIdsForAction = Object.keys(SCENARIO_ID_TO_INTENT).filter(sid => {
    const primaryIntent = SCENARIO_ID_TO_INTENT[sid];
    return intentIds.includes(primaryIntent);
  });
  return scenarioIdsForAction;
}

// ─── Test Execution ────────────────────────────────────────────────────

/**
 * Run autotest scenarios with concurrency and live UI updates.
 * Uses DOM element IDs from chat-simulator.html.
 *
 * @param {string} filter - 'all', 'static_reply', 'llm_reply', 'workflow', 'escalate'
 */
export async function runAutotest(filter) {
  if (window.autotestRunning) {
    toast('Tests already running. Stop current run first.', 'error');
    return;
  }

  // Determine scenarios
  let scenarios = [];
  if (filter === 'all' || !filter) {
    scenarios = window.AUTOTEST_SCENARIOS || [];
  } else if (filter === 'checkin_process') {
    // Check-in Process suite: scenarios tagged with suite='checkin_process' or ARRIVAL_CHECKIN category
    scenarios = (window.AUTOTEST_SCENARIOS || []).filter(s =>
      s.suite === 'checkin_process' || s.category === 'ARRIVAL_CHECKIN'
    );
  } else {
    await getRoutingForAutotest();
    const scenarioIds = getAutotestScenariosByAction(filter);
    scenarios = (window.AUTOTEST_SCENARIOS || []).filter(s => scenarioIds.includes(s.id));
  }

  if (scenarios.length === 0) {
    toast('No scenarios match the selected filter', 'error');
    return;
  }

  // Mark as running
  window.autotestRunning = true;
  window.autotestAbortRequested = false;

  // Get concurrency setting
  const concurrencyInput = document.getElementById('autotest-concurrency');
  const concurrency = concurrencyInput ? Math.max(1, Math.min(20, parseInt(concurrencyInput.value) || 6)) : 6;

  // DOM elements
  const progressEl = document.getElementById('autotest-progress');
  const progressBar = document.getElementById('at-progress-bar');
  const progressText = document.getElementById('at-progress-text');
  const summaryEl = document.getElementById('autotest-summary');
  const resultsEl = document.getElementById('autotest-results');
  const runBtn = document.getElementById('run-all-btn');
  const stopBtn = document.getElementById('stop-autotest-btn');
  const exportDropdown = document.getElementById('export-report-dropdown');
  const livePass = document.getElementById('at-live-pass');
  const liveWarn = document.getElementById('at-live-warn');
  const liveFail = document.getElementById('at-live-fail');

  // Show progress, hide summary and export
  if (progressEl) progressEl.classList.remove('hidden');
  if (summaryEl) summaryEl.classList.add('hidden');
  if (exportDropdown) exportDropdown.classList.add('hidden');
  if (resultsEl) resultsEl.innerHTML = '';
  if (runBtn) { runBtn.disabled = true; runBtn.innerHTML = '<span>Running...</span>'; }
  if (stopBtn) stopBtn.classList.remove('hidden');
  if (progressBar) progressBar.style.width = '0%';
  if (progressText) progressText.textContent = 'Starting...';
  if (livePass) livePass.textContent = '0';
  if (liveWarn) liveWarn.textContent = '0';
  if (liveFail) liveFail.textContent = '0';

  const results = [];
  const totalStart = Date.now();
  let completedCount = 0;
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  // Run with concurrency
  let idx = 0;
  const runNext = async () => {
    while (idx < scenarios.length && !window.autotestAbortRequested) {
      const currentIdx = idx++;
      const scenario = scenarios[currentIdx];

      if (progressText) {
        progressText.textContent = 'Running ' + (completedCount + 1) + '/' + scenarios.length + ': ' + scenario.name;
      }

      try {
        const result = await runScenario(scenario);
        results[currentIdx] = result;

        if (result.status === 'pass') passCount++;
        else if (result.status === 'warn') warnCount++;
        else failCount++;
      } catch (err) {
        results[currentIdx] = {
          scenario,
          status: 'fail',
          turns: [],
          time: 0,
          ruleResults: [{ rule: { type: 'execution', critical: true }, passed: false, detail: err.message }]
        };
        failCount++;
      }

      completedCount++;

      // Update progress bar and live counters
      const pct = ((completedCount / scenarios.length) * 100).toFixed(0);
      if (progressBar) progressBar.style.width = pct + '%';
      if (livePass) livePass.textContent = String(passCount);
      if (liveWarn) liveWarn.textContent = String(warnCount);
      if (liveFail) liveFail.textContent = String(failCount);

      // Render result card immediately
      if (resultsEl && window.renderScenarioCard) {
        resultsEl.insertAdjacentHTML('beforeend', window.renderScenarioCard(results[currentIdx]));
      }
    }
  };

  // Launch concurrent workers
  const workers = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push(runNext());
  }
  await Promise.all(workers);

  const totalTime = Date.now() - totalStart;

  // Finalize progress
  if (progressBar) progressBar.style.width = '100%';
  if (progressText) progressText.textContent = 'Complete!';
  setTimeout(() => { if (progressEl) progressEl.classList.add('hidden'); }, 1500);

  // Update summary cards
  const totalEl = document.getElementById('at-total');
  const passedEl = document.getElementById('at-passed');
  const warningsEl = document.getElementById('at-warnings');
  const failedEl = document.getElementById('at-failed');
  const timeEl = document.getElementById('at-time');
  if (totalEl) totalEl.textContent = String(results.length);
  if (passedEl) passedEl.textContent = String(passCount);
  if (warningsEl) warningsEl.textContent = String(warnCount);
  if (failedEl) failedEl.textContent = String(failCount);
  if (timeEl) timeEl.textContent = (totalTime / 1000).toFixed(1) + 's';
  if (summaryEl) summaryEl.classList.remove('hidden');

  // Show export button
  if (exportDropdown) exportDropdown.classList.remove('hidden');

  // Restore run button
  if (runBtn) {
    runBtn.disabled = false;
    runBtn.innerHTML = 'Run All <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
  }
  if (stopBtn) stopBtn.classList.add('hidden');

  // Save results
  window.autotestRunning = false;
  window.lastAutotestResults = { results, totalTime, timestamp: new Date().toISOString(), passed: passCount, warnings: warnCount, failed: failCount };

  // Save to history
  if (window.addToAutotestHistory) {
    window.addToAutotestHistory({
      id: Date.now(),
      results,
      totalTime,
      timestamp: window.lastAutotestResults.timestamp,
      passed: passCount,
      warnings: warnCount,
      failed: failCount
    });
  }
  if (window.updateHistoryButtonVisibility) window.updateHistoryButtonVisibility();

  toast('Tests completed: ' + passCount + ' passed, ' + failCount + ' failed', failCount === 0 ? 'success' : 'error');
}

/**
 * Run a single scenario against /intents/test API.
 * Returns shape expected by renderScenarioCard:
 *   { scenario, status, turns[], time, ruleResults[] }
 */
export async function runScenario(scenario) {
  const turns = [];
  const scenarioStart = Date.now();

  // Multi-turn workflow scenarios use /preview/chat with session ID to maintain state (US-015)
  const isMultiTurn = scenario.messages.length > 1 && (
    scenario.category === 'WORKFLOW_COMPLETE' || scenario.category === 'ARRIVAL_CHECKIN' || scenario.suite === 'checkin_process'
  );
  const sessionId = isMultiTurn ? ('autotest-' + scenario.id + '-' + Date.now()) : null;
  const chatHistory = [];

  for (let i = 0; i < scenario.messages.length; i++) {
    const msg = scenario.messages[i];
    const turnStart = Date.now();

    try {
      let response;
      if (isMultiTurn) {
        // Use preview/chat to maintain workflow state across turns
        response = await api('/preview/chat', {
          method: 'POST',
          body: { message: msg.text, history: chatHistory, sessionId },
          timeout: 45000
        });
        // Append to local history for next turn
        chatHistory.push({ role: 'user', content: msg.text });
        if (response.response) chatHistory.push({ role: 'assistant', content: response.response });

        const responseTime = Date.now() - turnStart;
        turns.push({
          userMessage: msg.text,
          response: response.response || response.message || '(no response)',
          intent: response.intent || 'unknown',
          source: response.source || 'workflow',
          routedAction: response.action || response.workflowId || 'unknown',
          confidence: response.confidence || 0,
          detectedLanguage: response.detectedLanguage || 'en',
          messageType: response.messageType || 'info',
          model: response.model || null,
          kbFiles: response.kbFiles || [],
          responseTime,
          matchedKeyword: response.matchedKeyword || null
        });
      } else {
        // Single-turn: use intent test endpoint (fast, stateless)
        response = await api('/intents/test', {
          method: 'POST',
          body: { message: msg.text },
          timeout: 30000
        });

        const responseTime = Date.now() - turnStart;
        turns.push({
          userMessage: msg.text,
          response: response.response || '(no response)',
          intent: response.intent || 'unknown',
          source: response.source || 'unknown',
          routedAction: response.action || 'unknown',
          confidence: response.confidence || 0,
          detectedLanguage: response.detectedLanguage || 'en',
          messageType: response.messageType || 'info',
          model: response.model || null,
          kbFiles: response.kbFiles || [],
          responseTime,
          matchedKeyword: response.matchedKeyword || null
        });
      }
    } catch (e) {
      turns.push({
        userMessage: msg.text,
        response: 'Error: ' + (e.message || 'Request failed'),
        intent: 'error',
        source: 'error',
        routedAction: 'error',
        confidence: 0,
        responseTime: Date.now() - turnStart
      });
    }
  }

  const totalTime = Date.now() - scenarioStart;

  // Validate scenario rules
  const ruleResults = [];
  const validations = scenario.validate || [];
  let criticalFailed = false;

  for (const v of validations) {
    const turn = turns[v.turn];
    if (!turn) {
      ruleResults.push({ rule: { type: 'missing_turn', critical: true }, passed: false, turn: v.turn, detail: 'Turn ' + v.turn + ' not found' });
      criticalFailed = true;
      continue;
    }

    for (const rule of (v.rules || [])) {
      const evalResult = evaluateRule(rule, turn);
      ruleResults.push({ ...evalResult, turn: v.turn });
      if (rule.critical && !evalResult.passed) criticalFailed = true;
    }
  }

  const allPassed = ruleResults.length > 0 ? ruleResults.every(r => r.passed) : true;
  const status = criticalFailed ? 'fail' : allPassed ? 'pass' : 'warn';

  return { scenario, status, turns, time: totalTime, ruleResults };
}

// ─── Validation ────────────────────────────────────────────────────────

/**
 * Validate scenario results against expected rules
 */
export function validateScenario(scenario, turns) {
  const validations = scenario.validate || [];
  const results = [];
  let criticalFailed = false;

  for (const v of validations) {
    const turn = turns[v.turn];
    if (!turn) {
      results.push({ turn: v.turn, error: 'Turn not found', failed: true });
      continue;
    }
    for (const rule of v.rules) {
      const evalResult = evaluateRule(rule, turn);
      results.push({ turn: v.turn, ...evalResult });
      if (rule.critical && !evalResult.passed) criticalFailed = true;
    }
  }

  const allPassed = results.every(r => r.passed);
  const status = criticalFailed ? 'fail' : allPassed ? 'pass' : 'warn';
  return { results, status };
}

/**
 * Evaluate a single validation rule against a turn result
 */
export function evaluateRule(rule, turn) {
  const response = (turn.response || '').toLowerCase();

  switch (rule.type) {
    case 'not_empty': {
      const passed = response.length > 0 && !response.includes('ai not available') && !response.includes('error processing') && !response.includes('error:');
      return { rule, passed, detail: passed ? 'Response is non-empty' : 'Response is empty or error' };
    }
    case 'contains_any': {
      const found = rule.values.some(v => response.includes(v.toLowerCase()));
      const matched = rule.values.filter(v => response.includes(v.toLowerCase()));
      return { rule, passed: found, detail: found ? 'Matched: ' + matched.join(', ') : 'None found from: ' + rule.values.join(', ') };
    }
    case 'not_contains': {
      const foundBad = rule.values.filter(v => response.includes(v.toLowerCase()));
      const passed = foundBad.length === 0;
      return { rule, passed, detail: passed ? 'No forbidden content' : 'Found: ' + foundBad.join(', ') };
    }
    case 'response_time': {
      const time = turn.responseTime || 0;
      const max = rule.max || 10000;
      const passed = time <= max;
      return { rule, passed, detail: time + 'ms ' + (passed ? '<=' : '>') + ' ' + max + 'ms' };
    }
    case 'language': {
      const detected = turn.detectedLanguage || turn.language || 'unknown';
      const passed = detected === rule.expected;
      return { rule, passed, detail: 'Expected ' + rule.expected + ', got ' + detected };
    }
    case 'message_type': {
      const mt = turn.messageType || 'unknown';
      const passed = mt === rule.expected;
      return { rule, passed, detail: 'Expected ' + rule.expected + ', got ' + mt };
    }
    default:
      return { rule, passed: false, detail: 'Unknown rule type: ' + rule.type };
  }
}

// ─── UI Bridge Functions ────────────────────────────────────────────────

/**
 * Toggle between autotest panel and chat layout (Quick Test)
 */
export function toggleAutotest() {
  const panel = document.getElementById('autotest-panel');
  const chatLayout = document.getElementById('chat-layout');

  if (!panel || !chatLayout) return;

  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    chatLayout.classList.add('hidden');

    // Update scenario count
    const countEl = document.getElementById('scenario-count');
    if (countEl && window.AUTOTEST_SCENARIOS) {
      countEl.textContent = String(window.AUTOTEST_SCENARIOS.length);
    }

    updateFilterCounts();
  } else {
    panel.classList.add('hidden');
    chatLayout.classList.remove('hidden');
  }
}

/**
 * Update the counts in the Run All dropdown filter buttons
 */
async function updateFilterCounts() {
  await getRoutingForAutotest();
  const allScenarios = window.AUTOTEST_SCENARIOS || [];

  const allCountEl = document.getElementById('run-all-count');
  const staticCountEl = document.getElementById('run-static-count');
  const workflowCountEl = document.getElementById('run-workflow-count');
  const llmCountEl = document.getElementById('run-llm-count');

  if (allCountEl) allCountEl.textContent = String(allScenarios.length);

  const staticIds = getAutotestScenariosByAction('static_reply');
  if (staticCountEl) staticCountEl.textContent = String(allScenarios.filter(s => staticIds.includes(s.id)).length);

  const workflowIds = getAutotestScenariosByAction('workflow');
  if (workflowCountEl) workflowCountEl.textContent = String(allScenarios.filter(s => workflowIds.includes(s.id)).length);

  const llmIds = getAutotestScenariosByAction('llm_reply');
  if (llmCountEl) llmCountEl.textContent = String(allScenarios.filter(s => llmIds.includes(s.id)).length);

  const checkinCountEl = document.getElementById('run-checkin-count');
  if (checkinCountEl) {
    const checkinCount = allScenarios.filter(s => s.suite === 'checkin_process' || s.category === 'ARRIVAL_CHECKIN').length;
    checkinCountEl.textContent = String(checkinCount);
  }
}

/**
 * Run autotest with a specific action filter.
 */
export function runAutotestWithFilter(filter) {
  runAutotest(filter);
}

/**
 * Toggle the "Run All" dropdown menu
 */
export function toggleRunAllDropdown() {
  const menu = document.getElementById('run-all-dropdown-menu');
  if (menu) menu.classList.toggle('hidden');
}

/**
 * Close the "Run All" dropdown menu
 */
export function closeRunAllDropdown() {
  const menu = document.getElementById('run-all-dropdown-menu');
  if (menu) menu.classList.add('hidden');
}

/**
 * Stop a running autotest
 */
export function stopAutotest() {
  window.autotestAbortRequested = true;
  toast('Stopping tests after current batch...', 'info');
}

/**
 * Open autotest panel (triggered by "Test Intent Classifier" button)
 */
export function testIntentClassifier() {
  toggleAutotest();
}

// ─── Close dropdown on outside click ────────────────────────────────────
document.addEventListener('click', function (event) {
  const dropdown = document.getElementById('run-all-dropdown');
  const menu = document.getElementById('run-all-dropdown-menu');
  if (dropdown && menu && !dropdown.contains(event.target)) {
    menu.classList.add('hidden');
  }
});

// ─── Exports ───────────────────────────────────────────────────────────
export { SCENARIO_ID_TO_INTENT };
