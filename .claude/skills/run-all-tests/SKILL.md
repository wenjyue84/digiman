# Run All Tests — Rainbow AI Chat Simulator Autotest

> Programmatic equivalent of clicking "Run All" in the Chat Simulator at
> `http://localhost:3002/#chat-simulator`. Runs all 58+ AI-pipeline integration
> tests and generates an HTML report.

## Quick Reference

| Item | Value |
|------|-------|
| Test runner script | `RainbowAI/scripts/test-autotest-optimized.js` |
| Test scenarios | `RainbowAI/src/public/js/data/autotest-scenarios.js` |
| Test endpoint | `POST /api/rainbow/preview/chat` |
| Optimal concurrency | **2** (higher = rate-limited, pass rate drops to ~0%) |
| Total scenarios | 58 (as of 2026-02) |
| Expected duration | ~5 min at concurrency 2 |
| Report output | `RainbowAI/reports/autotest/` + `RainbowAI/src/public/reports/autotest/` |

---

## Step 1 — Verify Rainbow AI Server is Running

```bash
curl -s http://localhost:3002/health
```

If it fails:
```bash
# Start Rainbow AI (from project root)
cd RainbowAI && npm run dev
```

Wait for `🌈 Rainbow AI server running on port 3002` before continuing.

---

## Step 2 — Run All Tests

```bash
# From project root — optimal settings (concurrency 2)
cd RainbowAI && node scripts/test-autotest-optimized.js

# Custom concurrency (only lower if still rate-limited)
cd RainbowAI && node scripts/test-autotest-optimized.js --concurrency=1

# Different port
cd RainbowAI && node scripts/test-autotest-optimized.js --port=3003
```

**DO NOT use `--concurrency` above 2** — AI provider rate limits will cause mass failures.

---

## Step 3 — Interpret Results

The script prints live progress during the run:

```
[12/58] 21% | ✅ 9 ⚠️ 1 ❌ 2 | Running: 2/2
```

Final summary:

```
============================================================
📊 TEST SUMMARY
============================================================
Total:       58 tests
✅ Passed:    48 (82.8%)
⚠️  Warned:    4
❌ Failed:    6
⏱️  Duration:  287.4s
🚀 Speed:     0.2 tests/sec
⚙️  Concurrency: 2 (rolling queue)
============================================================
```

### Status Meanings

| Status | Meaning |
|--------|---------|
| `pass` | All critical validation rules passed |
| `warn` | Critical rules passed, non-critical warnings present |
| `fail` | One or more CRITICAL rules failed |

### Validation Rule Types

| Rule | What it checks |
|------|---------------|
| `not_empty` | AI returned a non-blank response |
| `contains_any` | Response includes at least one expected keyword |
| `not_contains` | Response does NOT include forbidden words |
| `response_time` | Response completed within N milliseconds |
| `intent_match` | Detected intent equals expected intent |

---

## Step 4 — View HTML Report

Reports are auto-saved in two locations:

```
RainbowAI/reports/autotest/rainbow-autotest-optimized-YYYY-MM-DD-HH-MM-SS.html
RainbowAI/src/public/reports/autotest/rainbow-autotest-optimized-YYYY-MM-DD-HH-MM-SS.html
```

View in browser:
```
http://localhost:3002/public/reports/autotest/rainbow-autotest-optimized-<timestamp>.html
```

Or open in Test History tab in the dashboard:
```
http://localhost:3002/#chat-simulator  →  Test History button
```

---

## Test Scenario Categories

| Category | Count | Covers |
|----------|-------|--------|
| `GENERAL_SUPPORT` | 4 | Greetings, thanks, contact staff |
| `PRE_ARRIVAL` | 11 | Pricing, availability, booking, amenities |
| `ARRIVAL_CHECKIN` | 4 | Check-in process, late arrival |
| `DURING_STAY` | 18+ | WiFi, noise, housekeeping, facilities |
| `CHECKOUT` | 5 | Check-out time, bill, luggage |
| `POST_CHECKOUT` | 6 | Reviews, lost items, receipts |
| `MULTILINGUAL` | 4 | Malay and Chinese language queries |
| `EDGE_CASES` | 5+ | Abusive messages, gibberish, escalation |
| `WORKFLOW` | 7+ | Multi-step booking workflows |
| `SENTIMENT` | 4+ | Complaint detection, negative sentiment |

---

## Run a Filter Subset (Faster)

The browser UI supports suite filters. For CLI, filter manually:

```bash
# Run only quick unit tests (Vitest, ~2s, not AI pipeline)
cd RainbowAI && npx vitest run --project unit

# Run multilingual tests only
cd RainbowAI && node scripts/test-multilingual-concurrent.js --concurrency 2

# Run intent accuracy test
cd RainbowAI && node scripts/intent-accuracy-test.js
```

---

## Benchmark Concurrency (Rarely Needed)

Re-run if AI provider changes or rate limits change:

```bash
cd RainbowAI && node scripts/test-autotest-optimized.js --benchmark
```

Results are printed for concurrency levels 2, 4, 6, 8, 10, 12. The optimal level is printed at the end.

---

## Common Failures & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| All tests fail immediately | Server not running | `cd RainbowAI && npm run dev` |
| >50% failures with concurrency 2 | AI provider rate-limited | Try `--concurrency=1` or wait 60s |
| `intent_match` failures | Intent routing changed | Check `routing.json` and `intent-keywords.json` |
| `contains_any` failures | AI response changed vocabulary | Update scenario validation values in `autotest-scenarios.js` |
| Report not in dashboard | Public dir missing | Check `src/public/reports/autotest/` exists |
| Script hangs | Zombie node process | `powershell.exe -Command "Stop-Process -Name node -Force"` then restart |

---

## Architecture Notes

- Tests call `POST /api/rainbow/preview/chat` (the same endpoint the Live Simulation tab uses)
- This goes through the **full AI pipeline**: T1 static → T2 fuzzy → T3 semantic → LLM
- Each scenario can have multiple message turns (multi-turn conversation tests)
- Only turn 0 is tested by the CLI runner; multi-turn is browser-only
- The rolling queue pattern: as soon as one test finishes, the next immediately starts (not batched)
- Results file: `reports/autotest/programmatic-<timestamp>.json` for raw data
