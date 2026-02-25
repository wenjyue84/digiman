#!/usr/bin/env node
/**
 * Full 133-scenario test runner.
 * Merges SINGLE_TURN_SCENARIOS (112) + WORKFLOW_SCENARIOS (21).
 * Handles multi-turn scenarios by running each message sequentially
 * and validating rules at the specified turn index.
 *
 * Usage:
 *   node scripts/test-all-133.js
 *   node scripts/test-all-133.js --concurrency=2
 *   node scripts/test-all-133.js --port=3002
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const PORT        = args.find(a => a.startsWith('--port='))?.split('=')[1] || '3002';
const CONCURRENCY = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '2');
const API_BASE    = `http://localhost:${PORT}/api/rainbow`;

// ─── Load scenarios ──────────────────────────────────────────────────────────

function extractArray(content, varName) {
  const re = new RegExp(`(?:export\\s+const|const)\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
  const m = content.match(re);
  if (!m) throw new Error(`Cannot find ${varName}`);
  return eval(m[1]); // eslint-disable-line no-eval
}

const singlePath   = path.join(__dirname, '../src/public/js/modules/autotest-scenarios-single.js');
const workflowPath = path.join(__dirname, '../src/public/js/modules/autotest-scenarios-workflow.js');

const SINGLE_TURN_SCENARIOS = extractArray(fs.readFileSync(singlePath, 'utf8'),   'SINGLE_TURN_SCENARIOS');
const WORKFLOW_SCENARIOS    = extractArray(fs.readFileSync(workflowPath, 'utf8'), 'WORKFLOW_SCENARIOS');

const ALL_SCENARIOS = [...SINGLE_TURN_SCENARIOS, ...WORKFLOW_SCENARIOS];

// ─── Validation ──────────────────────────────────────────────────────────────

function validateRule(rule, response, intent, responseTime) {
  const r = { rule: rule.type, passed: false, message: '' };
  switch (rule.type) {
    case 'not_empty':
      r.passed = !!(response && response.trim());
      r.message = r.passed ? 'non-empty' : 'EMPTY response';
      break;
    case 'contains_any': {
      const lo = response.toLowerCase();
      const found = rule.values.filter(v => lo.includes(v.toLowerCase()));
      r.passed = found.length > 0;
      r.message = r.passed ? `matched: ${found.join(', ')}` : `none of [${rule.values.join(', ')}] found`;
      break;
    }
    case 'not_contains': {
      const lo = response.toLowerCase();
      const bad = rule.values.filter(v => lo.includes(v.toLowerCase()));
      r.passed = bad.length === 0;
      r.message = r.passed ? 'no forbidden words' : `forbidden found: ${bad.join(', ')}`;
      break;
    }
    case 'response_time':
      r.passed = responseTime <= rule.max;
      r.message = `${responseTime}ms ${r.passed ? '≤' : '>'} ${rule.max}ms`;
      break;
    case 'intent_match':
      r.passed = intent === rule.expected;
      r.message = r.passed ? `intent matched: ${intent}` : `expected ${rule.expected}, got ${intent}`;
      break;
    default:
      r.message = `unknown rule: ${rule.type}`;
  }
  return r;
}

// ─── Run single scenario (single or multi-turn) ───────────────────────────────

async function runScenario(scenario) {
  const messages   = scenario.messages;
  const validates  = scenario.validate || [];
  const startTotal = Date.now();

  // Build a map: turn index → validation rules
  const rulesByTurn = {};
  for (const v of validates) {
    rulesByTurn[v.turn] = v.rules;
  }

  // For single-turn scenarios we only need turn 0.
  // For multi-turn we execute each message and accumulate history.
  const maxTurn = messages.length - 1;
  const history = [];
  const turnResults = {};

  try {
    for (let turn = 0; turn <= maxTurn; turn++) {
      const t0  = Date.now();
      const res = await fetch(`${API_BASE}/preview/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: messages[turn].text, history }),
      });

      if (!res.ok) {
        return {
          scenario,
          status: 'fail',
          error: `HTTP ${res.status} on turn ${turn}`,
          totalTime: Date.now() - startTotal,
          turnResults,
        };
      }

      const data  = await res.json();
      const rt    = Date.now() - t0;
      const reply = data.message || '';

      // Accumulate history for next turn
      history.push({ role: 'user',      content: messages[turn].text });
      history.push({ role: 'assistant', content: reply });

      // Validate rules for this turn (if any)
      if (rulesByTurn[turn]) {
        const ruleResults = rulesByTurn[turn].map(rule =>
          ({ ...validateRule(rule, reply, data.intent || '', rt), critical: rule.critical })
        );
        turnResults[turn] = {
          message:     messages[turn].text,
          reply,
          intent:      data.intent || '',
          action:      data.routedAction || data.action || '',
          source:      data.source || '',
          responseTime: rt,
          ruleResults,
        };
      }

      // For single-turn scenarios, stop after turn 0
      if (messages.length === 1) break;
    }

    // Determine overall status
    let criticalFail = false;
    let nonCriticalFail = false;

    for (const t of Object.values(turnResults)) {
      for (const r of t.ruleResults) {
        if (!r.passed) {
          if (r.critical) criticalFail = true;
          else nonCriticalFail = true;
        }
      }
    }

    return {
      scenario,
      status:    criticalFail ? 'fail' : nonCriticalFail ? 'warn' : 'pass',
      totalTime: Date.now() - startTotal,
      turnResults,
    };

  } catch (err) {
    return {
      scenario,
      status:    'fail',
      error:     err.message,
      totalTime: Date.now() - startTotal,
      turnResults,
    };
  }
}

// ─── Rolling queue ────────────────────────────────────────────────────────────

async function runAll(scenarios, concurrency) {
  const results = [];
  let completed = 0, running = 0;
  const queue   = [...scenarios];
  const total   = scenarios.length;

  return new Promise(resolve => {
    function next() {
      if (!queue.length && !running) { resolve(results); return; }
      while (running < concurrency && queue.length) {
        const sc = queue.shift();
        running++;
        runScenario(sc).then(r => {
          results.push(r);
          running--;
          completed++;
          const p = results.filter(x => x.status === 'pass').length;
          const w = results.filter(x => x.status === 'warn').length;
          const f = results.filter(x => x.status === 'fail').length;
          process.stdout.write(
            `\r[${completed}/${total}] ${((completed/total)*100).toFixed(0)}% | ✅ ${p} ⚠️ ${w} ❌ ${f} | running: ${running}   `
          );
          next();
        }).catch(err => {
          console.error('\nfatal:', err);
          running--;
          completed++;
          next();
        });
      }
    }
    next();
  });
}

// ─── JSON report ─────────────────────────────────────────────────────────────

function saveReport(results, duration) {
  const passed  = results.filter(r => r.status === 'pass').length;
  const warned  = results.filter(r => r.status === 'warn').length;
  const failed  = results.filter(r => r.status === 'fail').length;
  const total   = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  const report = {
    timestamp:   new Date().toISOString(),
    total, passed, warned, failed, passRate,
    durationSec: duration.toFixed(1),
    concurrency: CONCURRENCY,
    failures: results.filter(r => r.status === 'fail').map(r => ({
      id:       r.scenario.id,
      name:     r.scenario.name,
      category: r.scenario.category,
      time:     r.totalTime,
      error:    r.error || null,
      turns: Object.entries(r.turnResults || {}).map(([turn, t]) => ({
        turn: +turn,
        message:  t.message,
        reply:    t.reply?.slice(0, 300),
        intent:   t.intent,
        action:   t.action,
        failedRules: t.ruleResults.filter(x => !x.passed).map(x => ({
          rule: x.rule, critical: x.critical, message: x.message
        }))
      }))
    })),
    warnings: results.filter(r => r.status === 'warn').map(r => ({
      id:       r.scenario.id,
      name:     r.scenario.name,
      category: r.scenario.category,
      turns: Object.entries(r.turnResults || {}).map(([turn, t]) => ({
        turn: +turn,
        message: t.message,
        reply:   t.reply?.slice(0, 300),
        warnedRules: t.ruleResults.filter(x => !x.passed).map(x => ({
          rule: x.rule, critical: x.critical, message: x.message
        }))
      }))
    }))
  };

  const ts        = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-');
  const reportDir = path.join(__dirname, '../reports/autotest');
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `full-133-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  return { outPath, report, passed, warned, failed, total, passRate };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌈 Rainbow AI — Full 133-Scenario Test Run\n');

  // Health check
  try {
    const h = await fetch(`http://localhost:${PORT}/health`);
    if (!h.ok) throw new Error(`HTTP ${h.status}`);
    console.log('✅ Server healthy\n');
  } catch (e) {
    console.error(`❌ Server unreachable at port ${PORT}: ${e.message}`);
    process.exit(1);
  }

  console.log(`Scenarios: ${ALL_SCENARIOS.length} (${SINGLE_TURN_SCENARIOS.length} single-turn + ${WORKFLOW_SCENARIOS.length} multi-turn)`);
  console.log(`Concurrency: ${CONCURRENCY} | API: ${API_BASE}\n`);

  const t0       = Date.now();
  const results  = await runAll(ALL_SCENARIOS, CONCURRENCY);
  const duration = (Date.now() - t0) / 1000;

  console.log('\n');

  const { outPath, report, passed, warned, failed, total, passRate } = saveReport(results, duration);

  console.log('═'.repeat(60));
  console.log('📊 TEST SUMMARY — ALL 133 SCENARIOS');
  console.log('═'.repeat(60));
  console.log(`Total:     ${total}`);
  console.log(`✅ Passed:  ${passed} (${passRate}%)`);
  console.log(`⚠️  Warned:  ${warned}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log(`⏱  Time:    ${duration.toFixed(1)}s`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    report.failures.forEach(f => {
      console.log(`  • [${f.category}] ${f.name}`);
      f.turns.forEach(t => {
        t.failedRules.forEach(r => {
          console.log(`      turn ${t.turn} | ${r.rule} (critical:${r.critical}): ${r.message}`);
        });
      });
    });
  }

  if (warned > 0) {
    console.log('\n⚠️  WARNED TESTS:');
    report.warnings.forEach(w => {
      console.log(`  • [${w.category}] ${w.name}`);
    });
  }

  console.log(`\n📄 JSON report: ${outPath}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
