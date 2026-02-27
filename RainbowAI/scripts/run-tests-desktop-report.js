#!/usr/bin/env node
/**
 * Run all Rainbow AI test scenarios and save error report to Desktop.
 *
 * Usage:
 *   node scripts/run-tests-desktop-report.js
 *   node scripts/run-tests-desktop-report.js --port=3002
 *   node scripts/run-tests-desktop-report.js --wait-for-server
 *
 * Output:
 *   - Console: live progress + summary
 *   - Desktop: ~/Desktop/rainbow-test-errors.txt (failures + warnings)
 *   - Reports: reports/autotest/full-<count>-<timestamp>.json (full JSON)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const PORT = args.find(a => a.startsWith('--port='))?.split('=')[1] || '3002';
const CONCURRENCY = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '1');
const WAIT_FOR_SERVER = args.includes('--wait-for-server');
const API_BASE = `http://localhost:${PORT}/api/rainbow`;
const DESKTOP = path.join(os.homedir(), 'Desktop');

// ─── Load scenarios ──────────────────────────────────────────────────────────

function extractArray(content, varName) {
  const re = new RegExp(`(?:export\\s+const|const)\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
  const m = content.match(re);
  if (!m) throw new Error(`Cannot find ${varName}`);
  return eval(m[1]); // eslint-disable-line no-eval
}

const singlePath = path.join(__dirname, '../src/public/js/modules/autotest-scenarios-single.js');
const workflowPath = path.join(__dirname, '../src/public/js/modules/autotest-scenarios-workflow.js');

const SINGLE_TURN_SCENARIOS = extractArray(fs.readFileSync(singlePath, 'utf8'), 'SINGLE_TURN_SCENARIOS');
const WORKFLOW_SCENARIOS = extractArray(fs.readFileSync(workflowPath, 'utf8'), 'WORKFLOW_SCENARIOS');
const ALL_SCENARIOS = [...SINGLE_TURN_SCENARIOS, ...WORKFLOW_SCENARIOS];

// ─── Wait for server ─────────────────────────────────────────────────────────

async function waitForServer(maxWaitMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const h = await fetch(`http://localhost:${PORT}/health`);
      if (h.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
    process.stdout.write('.');
  }
  return false;
}

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
      r.message = `${responseTime}ms ${r.passed ? '<=' : '>'} ${rule.max}ms`;
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

// ─── Run scenario ────────────────────────────────────────────────────────────

async function runScenario(scenario) {
  const messages = scenario.messages;
  const validates = scenario.validate || [];
  const startTotal = Date.now();

  const rulesByTurn = {};
  for (const v of validates) rulesByTurn[v.turn] = v.rules;

  const maxTurn = messages.length - 1;
  const history = [];
  const turnResults = {};

  try {
    for (let turn = 0; turn <= maxTurn; turn++) {
      const t0 = Date.now();
      const res = await fetch(`${API_BASE}/preview/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messages[turn].text, history }),
      });

      if (!res.ok) {
        return { scenario, status: 'fail', error: `HTTP ${res.status} on turn ${turn}`, totalTime: Date.now() - startTotal, turnResults };
      }

      const data = await res.json();
      const rt = Date.now() - t0;
      const reply = data.message || '';

      history.push({ role: 'user', content: messages[turn].text });
      history.push({ role: 'assistant', content: reply });

      if (rulesByTurn[turn]) {
        const ruleResults = rulesByTurn[turn].map(rule =>
          ({ ...validateRule(rule, reply, data.intent || '', rt), critical: rule.critical })
        );
        turnResults[turn] = {
          message: messages[turn].text,
          reply,
          intent: data.intent || '',
          action: data.routedAction || data.action || '',
          source: data.source || '',
          responseTime: rt,
          ruleResults,
        };
      }

      if (messages.length === 1) break;
    }

    let criticalFail = false, nonCriticalFail = false;
    for (const t of Object.values(turnResults)) {
      for (const r of t.ruleResults) {
        if (!r.passed) {
          if (r.critical) criticalFail = true;
          else nonCriticalFail = true;
        }
      }
    }

    return { scenario, status: criticalFail ? 'fail' : nonCriticalFail ? 'warn' : 'pass', totalTime: Date.now() - startTotal, turnResults };
  } catch (err) {
    return { scenario, status: 'fail', error: err.message, totalTime: Date.now() - startTotal, turnResults };
  }
}

// ─── Rolling queue ───────────────────────────────────────────────────────────

async function runAll(scenarios, concurrency) {
  const results = [];
  let completed = 0, running = 0;
  const queue = [...scenarios];
  const total = scenarios.length;

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
          process.stdout.write(`\r[${completed}/${total}] ${((completed / total) * 100).toFixed(0)}% | P:${p} W:${w} F:${f} | running:${running}   `);
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

// ─── Build desktop error report ──────────────────────────────────────────────

function buildDesktopReport(results, duration) {
  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);
  const now = new Date();
  const ts = now.toISOString().replace('T', ' ').slice(0, 19);

  const lines = [];
  lines.push('='.repeat(70));
  lines.push(`  RAINBOW AI TEST REPORT — ${ts}`);
  lines.push('='.repeat(70));
  lines.push('');
  lines.push(`  Total:    ${total} scenarios`);
  lines.push(`  Passed:   ${passed} (${passRate}%)`);
  lines.push(`  Warned:   ${warned}`);
  lines.push(`  Failed:   ${failed}`);
  lines.push(`  Duration: ${duration.toFixed(1)}s`);
  lines.push(`  Server:   localhost:${PORT}`);
  lines.push(`  Concurrency: ${CONCURRENCY}`);
  lines.push('');

  if (failed > 0) {
    lines.push('='.repeat(70));
    lines.push('  FAILURES');
    lines.push('='.repeat(70));
    lines.push('');

    results.filter(r => r.status === 'fail').forEach((r, i) => {
      lines.push(`--- [${i + 1}] ${r.scenario.name} (${r.scenario.category}) ---`);
      lines.push(`    ID: ${r.scenario.id}`);
      lines.push(`    Time: ${r.totalTime}ms`);
      if (r.error) lines.push(`    Error: ${r.error}`);

      for (const [turn, t] of Object.entries(r.turnResults || {})) {
        const failedRules = t.ruleResults.filter(x => !x.passed);
        if (failedRules.length === 0) continue;

        lines.push(`    Turn ${turn}:`);
        lines.push(`      User:     ${t.message}`);
        lines.push(`      Reply:    ${t.reply?.slice(0, 200) || '(empty)'}`);
        lines.push(`      Intent:   ${t.intent} | Action: ${t.action} | Source: ${t.source}`);
        failedRules.forEach(fr => {
          lines.push(`      FAIL [${fr.critical ? 'CRITICAL' : 'warning'}] ${fr.rule}: ${fr.message}`);
        });
      }
      lines.push('');
    });
  }

  if (warned > 0) {
    lines.push('='.repeat(70));
    lines.push('  WARNINGS');
    lines.push('='.repeat(70));
    lines.push('');

    results.filter(r => r.status === 'warn').forEach((r, i) => {
      lines.push(`--- [${i + 1}] ${r.scenario.name} (${r.scenario.category}) ---`);
      lines.push(`    ID: ${r.scenario.id}`);
      for (const [turn, t] of Object.entries(r.turnResults || {})) {
        const warnRules = t.ruleResults.filter(x => !x.passed);
        if (warnRules.length === 0) continue;
        lines.push(`    Turn ${turn}:`);
        lines.push(`      User:  ${t.message}`);
        lines.push(`      Reply: ${t.reply?.slice(0, 200) || '(empty)'}`);
        warnRules.forEach(wr => {
          lines.push(`      WARN ${wr.rule}: ${wr.message}`);
        });
      }
      lines.push('');
    });
  }

  if (failed === 0 && warned === 0) {
    lines.push('  ALL TESTS PASSED! No errors to report.');
    lines.push('');
  }

  lines.push('='.repeat(70));
  lines.push(`  Report generated: ${ts}`);
  lines.push('='.repeat(70));

  return lines.join('\n');
}

// ─── Save JSON report (same format as test-all-133.js) ───────────────────────

function saveJsonReport(results, duration) {
  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  const report = {
    timestamp: new Date().toISOString(),
    total, passed, warned, failed, passRate,
    durationSec: duration.toFixed(1),
    concurrency: CONCURRENCY,
    failures: results.filter(r => r.status === 'fail').map(r => ({
      id: r.scenario.id, name: r.scenario.name, category: r.scenario.category,
      time: r.totalTime, error: r.error || null,
      turns: Object.entries(r.turnResults || {}).map(([turn, t]) => ({
        turn: +turn, message: t.message, reply: t.reply?.slice(0, 300),
        intent: t.intent, action: t.action,
        failedRules: t.ruleResults.filter(x => !x.passed).map(x => ({
          rule: x.rule, critical: x.critical, message: x.message
        }))
      }))
    })),
    warnings: results.filter(r => r.status === 'warn').map(r => ({
      id: r.scenario.id, name: r.scenario.name, category: r.scenario.category,
      turns: Object.entries(r.turnResults || {}).map(([turn, t]) => ({
        turn: +turn, message: t.message, reply: t.reply?.slice(0, 300),
        warnedRules: t.ruleResults.filter(x => !x.passed).map(x => ({
          rule: x.rule, critical: x.critical, message: x.message
        }))
      }))
    }))
  };

  const tsFile = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-');
  const reportDir = path.join(__dirname, '../reports/autotest');
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `full-${total}-${tsFile}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  return outPath;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Rainbow AI — Full Test Run + Desktop Error Report\n');

  // Health check (with optional wait)
  try {
    const h = await fetch(`http://localhost:${PORT}/health`);
    if (!h.ok) throw new Error(`HTTP ${h.status}`);
    console.log('Server healthy\n');
  } catch (e) {
    if (WAIT_FOR_SERVER) {
      process.stdout.write(`Waiting for server on port ${PORT}`);
      const ok = await waitForServer(60000);
      if (!ok) {
        console.error(`\nServer not reachable after 60s. Start it first: cd RainbowAI && npm run dev`);
        process.exit(1);
      }
      console.log(' ready!\n');
    } else {
      console.error(`Server unreachable at port ${PORT}: ${e.message}`);
      console.error('Start the server first, or use --wait-for-server flag.');
      process.exit(1);
    }
  }

  console.log(`Scenarios: ${ALL_SCENARIOS.length} (${SINGLE_TURN_SCENARIOS.length} single + ${WORKFLOW_SCENARIOS.length} multi-turn)`);
  console.log(`Concurrency: ${CONCURRENCY} | API: ${API_BASE}\n`);

  const t0 = Date.now();
  const results = await runAll(ALL_SCENARIOS, CONCURRENCY);
  const duration = (Date.now() - t0) / 1000;
  console.log('\n');

  // Save JSON report
  const jsonPath = saveJsonReport(results, duration);

  // Build and save desktop error report
  const desktopReport = buildDesktopReport(results, duration);
  const desktopPath = path.join(DESKTOP, 'rainbow-test-errors.txt');
  fs.writeFileSync(desktopPath, desktopReport, 'utf8');

  // Console summary
  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log('='.repeat(60));
  console.log(`TEST SUMMARY — ${total} SCENARIOS`);
  console.log('='.repeat(60));
  console.log(`  Passed:   ${passed} (${passRate}%)`);
  console.log(`  Warned:   ${warned}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Duration: ${duration.toFixed(1)}s`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\nFAILED:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  [${r.scenario.category}] ${r.scenario.name}`);
      for (const [turn, t] of Object.entries(r.turnResults || {})) {
        t.ruleResults.filter(x => !x.passed).forEach(fr => {
          console.log(`    turn ${turn} | ${fr.rule} (${fr.critical ? 'CRITICAL' : 'warn'}): ${fr.message}`);
        });
      }
    });
  }

  console.log(`\nJSON report: ${jsonPath}`);
  console.log(`Desktop report: ${desktopPath}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
