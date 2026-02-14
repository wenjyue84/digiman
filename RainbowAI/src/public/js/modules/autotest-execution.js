/**
 * @fileoverview Autotest execution core - scenario running, validation, and rule evaluation
 * @module autotest-execution
 */

import { api, toast } from '../core/utils.js';

// ─── State ─────────────────────────────────────────────────────────────
let cachedRouting = null; // Cache routing configuration

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
  'multilingual-chinese-bill': 'billing_inquiry', 'multilingual-malay-wifi': 'wifi',
  'edge-gibberish': 'unknown', 'edge-emoji': 'unknown', 'edge-long-message': 'availability',
  'edge-prompt-injection': 'unknown',
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
  const intentIds = Object.keys(routing).filter(id => routing[id] === action);
  const scenarioIdsForAction = Object.keys(SCENARIO_ID_TO_INTENT).filter(sid => {
    const primaryIntent = SCENARIO_ID_TO_INTENT[sid];
    return intentIds.includes(primaryIntent);
  });
  // Get scenarios from global AUTOTEST_SCENARIOS (will need to import this or pass as parameter)
  // For now, return the scenario IDs
  return scenarioIdsForAction;
}

// ─── Test Execution ────────────────────────────────────────────────────
/**
 * Run autotest with optional filter
 * @param {string} filter - Filter type: 'all', 'static_reply', 'llm_reply', 'workflow', 'escalate', etc.
 */
export async function runAutotest(filter) {
  // Import state from parent context (will be refactored in future phases)
  // For now, this function needs to be called with proper context
  const autotestRunning = window.autotestRunning || false;
  const autotestAbortRequested = window.autotestAbortRequested || false;

  if (autotestRunning) {
    toast('Tests already running. Stop current run first.', 'error');
    return;
  }

  // Get scenarios based on filter
  let scenarios = [];
  if (filter === 'all') {
    scenarios = window.AUTOTEST_SCENARIOS || [];
  } else {
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

  const startTime = Date.now();
  const results = [];

  // Update UI
  const statusEl = document.getElementById('autotest-status');
  const resultsEl = document.getElementById('autotest-results');
  const progressEl = document.getElementById('autotest-progress');
  const stopBtn = document.getElementById('stop-autotest-btn');
  const startBtn = document.getElementById('start-autotest-btn');

  if (statusEl) statusEl.textContent = `Running ${scenarios.length} tests...`;
  if (resultsEl) resultsEl.innerHTML = '';
  if (progressEl) progressEl.classList.remove('hidden');
  if (stopBtn) stopBtn.classList.remove('hidden');
  if (startBtn) startBtn.classList.add('hidden');

  // Run scenarios sequentially
  for (let i = 0; i < scenarios.length; i++) {
    if (window.autotestAbortRequested) {
      if (statusEl) statusEl.textContent = `Stopped after ${i} tests`;
      break;
    }

    const scenario = scenarios[i];
    if (statusEl) statusEl.textContent = `Running ${i + 1}/${scenarios.length}: ${scenario.name}...`;

    try {
      const result = await runScenario(scenario);
      results.push(result);

      // Render result card (will be extracted to UI module in future phase)
      if (resultsEl && window.renderScenarioCard) {
        resultsEl.insertAdjacentHTML('beforeend', window.renderScenarioCard(result));
      }
    } catch (e) {
      results.push({
        id: scenario.id,
        name: scenario.name,
        status: 'fail',
        error: e.message
      });
    }

    // Small delay between tests
    await new Promise(r => setTimeout(r, 100));
  }

  // Finalize
  const totalTime = Date.now() - startTime;
  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;

  if (statusEl) {
    statusEl.textContent = `Completed ${results.length} tests in ${(totalTime / 1000).toFixed(1)}s - ` +
      `✓ ${passed} pass, ⚠ ${warnings} warn, ✗ ${failed} fail`;
  }

  if (progressEl) progressEl.classList.add('hidden');
  if (stopBtn) stopBtn.classList.add('hidden');
  if (startBtn) startBtn.classList.remove('hidden');

  window.autotestRunning = false;
  window.lastAutotestResults = { results, totalTime, timestamp: new Date().toISOString() };

  // Save to history (using global function temporarily)
  if (window.autotestHistory && window.saveAutotestHistory) {
    window.autotestHistory.push({
      id: Date.now(),
      results,
      totalTime,
      timestamp: window.lastAutotestResults.timestamp,
      passed,
      warnings,
      failed
    });
    window.saveAutotestHistory();
  }

  // Update history button visibility
  if (window.updateHistoryButtonVisibility) {
    window.updateHistoryButtonVisibility();
  }

  toast(`Tests completed: ${passed} passed, ${failed} failed`, failed === 0 ? 'success' : 'error');
}

/**
 * Run a single scenario
 * @param {object} scenario - Scenario configuration
 * @returns {Promise<object>} Test result
 */
export async function runScenario(scenario) {
  const turns = [];

  for (let i = 0; i < scenario.messages.length; i++) {
    const msg = scenario.messages[i];
    const startTime = Date.now();

    try {
      const response = await api('/test-message', {
        method: 'POST',
        body: { message: msg.text }
      });

      const responseTime = Date.now() - startTime;
      turns.push({
        user: msg.text,
        response: response.reply || '',
        intent: response.intent || 'unknown',
        confidence: response.confidence || 0,
        language: response.language || 'en',
        messageType: response.messageType || 'text',
        responseTime
      });
    } catch (e) {
      turns.push({
        user: msg.text,
        response: `Error: ${e.message}`,
        intent: 'error',
        confidence: 0,
        responseTime: Date.now() - startTime
      });
    }
  }

  // Validate scenario
  const validation = validateScenario(scenario, turns);

  return {
    id: scenario.id,
    name: scenario.name,
    category: scenario.category,
    turns,
    validation,
    status: validation.status
  };
}

// ─── Validation ────────────────────────────────────────────────────────
/**
 * Validate scenario results against expected rules
 * @param {object} scenario - Scenario configuration
 * @param {array} turns - Conversation turns
 * @returns {object} Validation results
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

      if (rule.critical && !evalResult.passed) {
        criticalFailed = true;
      }
    }
  }

  const allPassed = results.every(r => r.passed);
  const status = criticalFailed ? 'fail' : allPassed ? 'pass' : 'warn';

  return { results, status };
}

/**
 * Evaluate a single validation rule
 * @param {object} rule - Validation rule
 * @param {object} turn - Conversation turn
 * @returns {object} Evaluation result
 */
export function evaluateRule(rule, turn) {
  const response = (turn.response || '').toLowerCase();

  switch (rule.type) {
    case 'not_empty': {
      const passed = response.length > 0 && !response.includes('ai not available') && !response.includes('error processing');
      return { rule, passed, detail: passed ? 'Response is non-empty' : 'Response is empty or error' };
    }
    case 'contains_any': {
      const found = rule.values.some(v => response.includes(v.toLowerCase()));
      const matched = rule.values.filter(v => response.includes(v.toLowerCase()));
      return { rule, passed: found, detail: found ? `Matched: ${matched.join(', ')}` : `None found from: ${rule.values.join(', ')}` };
    }
    case 'not_contains': {
      const foundBad = rule.values.filter(v => response.includes(v.toLowerCase()));
      const passed = foundBad.length === 0;
      return { rule, passed, detail: passed ? 'No forbidden content' : `Found: ${foundBad.join(', ')}` };
    }
    case 'response_time': {
      const time = turn.responseTime || 0;
      const max = rule.max || 10000;
      const passed = time <= max;
      return { rule, passed, detail: `${time}ms ${passed ? '<=' : '>'} ${max}ms` };
    }
    case 'language': {
      const passed = turn.language === rule.expected;
      return { rule, passed, detail: `Expected ${rule.expected}, got ${turn.language || 'unknown'}` };
    }
    case 'message_type': {
      const passed = turn.messageType === rule.expected;
      return { rule, passed, detail: `Expected ${rule.expected}, got ${turn.messageType}` };
    }
    default:
      return { rule, passed: false, detail: `Unknown rule type: ${rule.type}` };
  }
}

// ─── Exports ───────────────────────────────────────────────────────────
export { SCENARIO_ID_TO_INTENT };
