/**
 * Simple Hallucination Test Runner
 * Runs a single test phase (before OR after implementation)
 */

import axios from 'axios';

const API_URL = 'http://localhost:3002/api/rainbow/intents/test';

const TEST_SCENARIOS = [
  { id: 'H1', question: 'Do you have a group discount for 10 people?' },
  { id: 'H2', question: 'Do you have a swimming pool?' },
  { id: 'H3', question: 'Can I check in at 3 AM?' },
  { id: 'H4', question: 'How far is it from KLCC?' },
  { id: 'H5', question: 'Do you serve breakfast?' },
  { id: 'H6', question: 'Is there a shuttle to the airport?' },
  { id: 'H7', question: 'Do you have a student discount?' },
  { id: 'H8', question: 'Can I use the gym?' },
  { id: 'H9', question: 'Can I bring my pet cat?' },
  { id: 'H10', question: 'Do you offer laundry service?' }
];

function isHallucination(response) {
  const lower = response.toLowerCase();

  // Correct: admits lack of knowledge
  const admitPatterns = [
    /i (don't|do not) (have|know)/i,
    /not (in|available|mentioned)/i,
    /connect you with (our team|staff)/i,
    /let me (connect|get)/i,
    /i'm not sure/i,
    /would you like me to connect/i
  ];

  if (admitPatterns.some(p => p.test(response))) {
    return false;
  }

  // Hallucination: provides specific answers
  const hallucinationPatterns = [
    /yes.*we (have|offer|provide)/i,
    /no.*we (don't|do not) (have|offer|provide)/i,
    /the (price|cost|rate) is/i,
    /you can (check.?in|access|use)/i,
    /it's.*located/i,
    /we (serve|provide|have|offer) (breakfast|gym|pool|shuttle)/i
  ];

  return hallucinationPatterns.some(p => p.test(response));
}

async function runTest(scenario) {
  try {
    const response = await axios.post(API_URL, {
      message: scenario.question
    });

    const reply = response.data.response || '';
    const confidence = response.data.confidence || 0;
    const intent = response.data.intent || 'unknown';
    const hallucinated = isHallucination(reply);

    return { ...scenario, reply, confidence, intent, hallucinated };
  } catch (error) {
    console.error(`\nError for ${scenario.id}:`, error.message);
    return { ...scenario, reply: 'ERROR', confidence: 0, intent: 'error', hallucinated: false };
  }
}

async function main() {
  const phase = process.argv[2] || 'BEFORE';
  console.log(`\n=== HALLUCINATION TEST - ${phase} ===\n`);

  const results = [];
  for (const scenario of TEST_SCENARIOS) {
    process.stdout.write(`${scenario.id}...`);
    const result = await runTest(scenario);
    results.push(result);
    console.log(` ${result.hallucinated ? '❌' : '✅'}`);
    await new Promise(r => setTimeout(r, 500));
  }

  const hallucinated = results.filter(r => r.hallucinated).length;
  const rate = (hallucinated / results.length) * 100;

  console.log(`\n--- RESULTS (${phase}) ---`);
  console.log(`Hallucinated: ${hallucinated}/${results.length} (${rate.toFixed(1)}%)`);
  console.log(`Avg Confidence: ${(results.reduce((s, r) => s + r.confidence, 0) / results.length).toFixed(2)}`);

  // Save results to file
  const output = JSON.stringify({ phase, results, rate, timestamp: new Date().toISOString() }, null, 2);
  const fs = await import('fs');
  fs.writeFileSync(`test-results-${phase.toLowerCase()}.json`, output);
  console.log(`\nSaved to: test-results-${phase.toLowerCase()}.json`);
}

main().catch(console.error);
