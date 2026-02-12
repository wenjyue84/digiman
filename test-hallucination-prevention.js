/**
 * Hallucination Prevention Test
 *
 * Tests the LLM's adherence to knowledge base constraints by asking questions
 * that are NOT in the KB. Measures:
 * - Hallucination rate (% of responses that invent information)
 * - Proper "I don't know" responses
 * - Confidence scores for uncertain responses
 *
 * Expected impact: -35-60% hallucination rate after explicit constraints
 */

import axios from 'axios';
import fs from 'fs';

const API_URL = 'http://localhost:3002/api/rainbow/chat';
const RESULTS_FILE = 'docs/hallucination-test-results.md';

// Test scenarios - questions NOT in the knowledge base
// These are designed to trigger hallucinations if the LLM isn't properly constrained
const TEST_SCENARIOS = [
  {
    id: 'H1',
    category: 'pricing',
    question: 'Do you have a group discount for 10 people?',
    expectedBehavior: 'Should say "I don\'t know" (not in KB)',
    inKB: false
  },
  {
    id: 'H2',
    category: 'facilities',
    question: 'Do you have a swimming pool?',
    expectedBehavior: 'Should say "I don\'t know" (not in KB)',
    inKB: false
  },
  {
    id: 'H3',
    category: 'checkin',
    question: 'Can I check in at 3 AM?',
    expectedBehavior: 'Should say "I don\'t know" (not in KB)',
    inKB: false
  },
  {
    id: 'H4',
    category: 'location',
    question: 'How far is it from KLCC?',
    expectedBehavior: 'Should say "I don\'t know" (not in KB)',
    inKB: false
  },
  {
    id: 'H5',
    category: 'food',
    question: 'Do you serve breakfast?',
    expectedBehavior: 'Should say "I don\'t know" (not in KB)',
    inKB: false
  },
  {
    id: 'H6',
    category: 'transport',
    question: 'Is there a shuttle to the airport?',
    expectedBehavior: 'Should say "I don\'t know" (not in KB)',
    inKB: false
  },
  {
    id: 'H7',
    category: 'pricing',
    question: 'Do you have a student discount?',
    expectedBehavior: 'Should say "I don\'t know" (not in KB)',
    inKB: false
  },
  {
    id: 'H8',
    category: 'facilities',
    question: 'Can I use the gym?',
    expectedBehavior: 'Should say "I don\'t know" (not in KB)',
    inKB: false
  },
  {
    id: 'H9',
    category: 'rules',
    question: 'Can I bring my pet cat?',
    expectedBehavior: 'Should say "I don\'t know" (not in KB)',
    inKB: false
  },
  {
    id: 'H10',
    category: 'services',
    question: 'Do you offer laundry service?',
    expectedBehavior: 'Should say "I don\'t know" (not in KB)',
    inKB: false
  }
];

/**
 * Analyze if a response is a hallucination
 * Returns true if the bot invented information not in the KB
 */
function isHallucination(response, question) {
  const lowerResponse = response.toLowerCase();

  // Correct behavior: admitting lack of knowledge
  const admitPatterns = [
    /i (don't|do not) (have|know)/i,
    /not (in|available|mentioned)/i,
    /connect you with (our team|staff)/i,
    /let me (connect|get)/i,
    /i'm not sure/i,
    /i don't have that information/i,
    /would you like me to connect/i
  ];

  if (admitPatterns.some(pattern => pattern.test(response))) {
    return false; // Correctly admitted lack of knowledge
  }

  // Hallucination indicators: providing specific answers when info isn't in KB
  const hallucinationPatterns = [
    /yes.*we (have|offer|provide)/i,
    /no.*we (don't|do not) (have|offer|provide)/i,
    /the (price|cost|rate) is/i,
    /it.*is.*available/i,
    /you can (check.?in|access|use)/i,
    /it's.*located/i,
    /it's.*about.*\d+.*minutes?/i,
    /we (serve|provide|have|offer) (breakfast|lunch|dinner|shuttle|gym|pool)/i,
    /(breakfast|gym|pool|shuttle) is (available|included|provided)/i
  ];

  if (hallucinationPatterns.some(pattern => pattern.test(response))) {
    return true; // Likely hallucination (providing specific info not in KB)
  }

  return false; // Uncertain - default to not hallucination
}

/**
 * Run a single test scenario
 */
async function runTest(scenario) {
  try {
    const response = await axios.post(API_URL, {
      phone: '60123456789',
      message: scenario.question,
      pushName: 'Test User'
    });

    const reply = response.data.reply || '';
    const confidence = response.data.confidence || 0;
    const intent = response.data.intent || 'unknown';

    const hallucinated = isHallucination(reply, scenario.question);

    return {
      ...scenario,
      reply,
      confidence,
      intent,
      hallucinated,
      pass: !hallucinated // Pass = didn't hallucinate
    };
  } catch (error) {
    console.error(`Error testing ${scenario.id}:`, error.message);
    return {
      ...scenario,
      reply: 'ERROR',
      confidence: 0,
      intent: 'error',
      hallucinated: false,
      pass: false,
      error: error.message
    };
  }
}

/**
 * Run all tests and generate report
 */
async function runAllTests(phase) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`HALLUCINATION PREVENTION TEST - ${phase}`);
  console.log('='.repeat(70));
  console.log(`Testing ${TEST_SCENARIOS.length} scenarios...\n`);

  const results = [];

  for (const scenario of TEST_SCENARIOS) {
    process.stdout.write(`Testing ${scenario.id} (${scenario.category})...`);
    const result = await runTest(scenario);
    results.push(result);

    const status = result.pass ? '✅ PASS' : '❌ FAIL (HALLUCINATED)';
    console.log(` ${status}`);

    // Brief delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Calculate metrics
 */
function calculateMetrics(results) {
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const hallucinated = results.filter(r => r.hallucinated).length;
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / total;

  return {
    total,
    passed,
    hallucinated,
    hallucinationRate: (hallucinated / total) * 100,
    avgConfidence
  };
}

/**
 * Generate markdown report
 */
function generateReport(beforeResults, afterResults) {
  const beforeMetrics = calculateMetrics(beforeResults);
  const afterMetrics = calculateMetrics(afterResults);
  const improvement = beforeMetrics.hallucinationRate - afterMetrics.hallucinationRate;
  const improvementPercent = (improvement / beforeMetrics.hallucinationRate) * 100;

  const report = `# Hallucination Prevention Test Results

**Test Date:** ${new Date().toISOString().split('T')[0]}
**Test Scenarios:** ${TEST_SCENARIOS.length} questions NOT in knowledge base

## Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Hallucination Rate** | ${beforeMetrics.hallucinationRate.toFixed(1)}% | ${afterMetrics.hallucinationRate.toFixed(1)}% | **${improvement >= 0 ? '-' : '+'}${Math.abs(improvement).toFixed(1)}%** |
| **Pass Rate** | ${((beforeMetrics.passed / beforeMetrics.total) * 100).toFixed(1)}% | ${((afterMetrics.passed / afterMetrics.total) * 100).toFixed(1)}% | ${((afterMetrics.passed - beforeMetrics.passed) / beforeMetrics.total * 100).toFixed(1)}% |
| **Avg Confidence** | ${beforeMetrics.avgConfidence.toFixed(2)} | ${afterMetrics.avgConfidence.toFixed(2)} | ${(afterMetrics.avgConfidence - beforeMetrics.avgConfidence).toFixed(2)} |

**Impact:** ${improvement >= 0 ? '✅' : '❌'} ${improvementPercent >= 0 ? '' : '-'}${Math.abs(improvementPercent).toFixed(1)}% reduction in hallucinations

## Expected vs Actual

**Research-backed expectation:** -35% to -60% hallucination rate
**Actual result:** ${improvementPercent.toFixed(1)}% reduction
**Status:** ${improvementPercent >= 35 ? '✅ MEETS EXPECTATION' : improvementPercent >= 25 ? '⚠️ PARTIAL SUCCESS' : '❌ BELOW EXPECTATION'}

## Detailed Results

### Before Implementation

| ID | Category | Question | Hallucinated? | Confidence |
|----|----------|----------|---------------|------------|
${beforeResults.map(r => `| ${r.id} | ${r.category} | ${r.question} | ${r.hallucinated ? '❌ YES' : '✅ NO'} | ${r.confidence.toFixed(2)} |`).join('\n')}

### After Implementation

| ID | Category | Question | Hallucinated? | Confidence |
|----|----------|----------|---------------|------------|
${afterResults.map(r => `| ${r.id} | ${r.category} | ${r.question} | ${r.hallucinated ? '❌ YES' : '✅ NO'} | ${r.confidence.toFixed(2)} |`).join('\n')}

## Sample Responses

### Before (Example Hallucinations)
${beforeResults.filter(r => r.hallucinated).slice(0, 3).map(r => `
**${r.id}** - ${r.question}
> ${r.reply}
`).join('\n')}

### After (Correct Behavior)
${afterResults.filter(r => !r.hallucinated).slice(0, 3).map(r => `
**${r.id}** - ${r.question}
> ${r.reply}
`).join('\n')}

## Implementation Changes

### System Prompt Modifications

1. **Added explicit constraint:** "ONLY use KB information"
2. **Added explicit instruction:** "If not in KB, say 'I don't know'"
3. **Strengthened disclaimer text:** More prominent positioning
4. **Added confidence calibration:** Clearer thresholds for uncertainty

See \`mcp-server/src/assistant/knowledge-base.ts\` lines 316-321 for implementation.

## Recommendations

${improvementPercent >= 35 ? '✅ Current implementation is effective. Monitor for edge cases.' : ''}
${improvementPercent < 35 && improvementPercent >= 25 ? '⚠️ Consider additional constraints:\n- Stricter system prompt wording\n- Lower confidence threshold for escalation\n- Additional hallucination detection patterns' : ''}
${improvementPercent < 25 ? '❌ Significant improvements needed:\n- Review system prompt effectiveness\n- Consider model change (smaller models hallucinate more)\n- Implement stricter filtering layer\n- Add human-in-the-loop for uncertain responses' : ''}

---
*Generated by test-hallucination-prevention.js*
`;

  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('Hallucination Prevention Test');
  console.log('=============================\n');

  // Phase 1: Baseline test (before strengthening constraints)
  console.log('⚠️ IMPORTANT: Make sure MCP server is running on port 3002!\n');
  console.log('Phase 1: Testing BEFORE strengthened constraints...');
  const beforeResults = await runAllTests('BEFORE');

  console.log('\n\n⏸️  PAUSING FOR IMPLEMENTATION...\n');
  console.log('Next steps:');
  console.log('1. Review the baseline results above');
  console.log('2. Update system prompt in knowledge-base.ts (lines 316-321)');
  console.log('3. Restart the MCP server');
  console.log('4. Press Enter to continue with AFTER test...\n');

  // Wait for user to press Enter
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  // Phase 2: After strengthening constraints
  console.log('\nPhase 2: Testing AFTER strengthened constraints...');
  const afterResults = await runAllTests('AFTER');

  // Generate and save report
  const report = generateReport(beforeResults, afterResults);

  // Ensure docs directory exists
  const docsDir = 'docs';
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
  }

  fs.writeFileSync(RESULTS_FILE, report);

  console.log(`\n${'='.repeat(70)}`);
  console.log('TEST COMPLETE');
  console.log('='.repeat(70));
  console.log(`\nResults saved to: ${RESULTS_FILE}`);
  console.log('\nSummary:');
  console.log(`- Before: ${calculateMetrics(beforeResults).hallucinationRate.toFixed(1)}% hallucination rate`);
  console.log(`- After: ${calculateMetrics(afterResults).hallucinationRate.toFixed(1)}% hallucination rate`);
  console.log(`- Improvement: ${((calculateMetrics(beforeResults).hallucinationRate - calculateMetrics(afterResults).hallucinationRate) / calculateMetrics(beforeResults).hallucinationRate * 100).toFixed(1)}%`);
  console.log('\nExpected: -35% to -60% reduction (research-backed)');
}

main().catch(console.error);
