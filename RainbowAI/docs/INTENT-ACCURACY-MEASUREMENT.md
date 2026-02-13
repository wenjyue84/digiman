# Intent Accuracy — How It’s Measured & Proposals

## Where it appears

- **Dashboard** (`http://localhost:3002/#dashboard`): “Intent Accuracy” card shows a single percentage (or “-” when no data).
- **Monitor → Performance**: “Intent Accuracy” section with overall stats (total / correct / incorrect / rate) and breakdowns by intent, tier, and model.

---

## How it’s measured today

1. **Data source**  
   Every classification is logged in `intent_predictions` (shared DB):
   - `predicted_intent`, `confidence`, `tier`, `model`
   - `was_correct`: `true` | `false` | `null` (null = not yet validated)

2. **When `was_correct` gets set**
   - **Thumbs up (👍):** The latest prediction for that conversation is now marked **correct** (`markIntentCorrect`).
   - **Thumbs down (👎):** The latest prediction is marked **incorrect** (`markIntentCorrection` with `actualIntent: 'unknown'`).
   - **Staff / escalation:** (Future) Manual correction or escalation can set `actualIntent` and `was_correct` via `markIntentCorrection` with source `manual` or `escalation`.

3. **Formula**
   - **Validated** = rows where `was_correct` is not null (i.e. had feedback or correction).
   - **Intent Accuracy** = `correct / (correct + incorrect)` over validated rows only, as a percentage.
   - If there are no validated rows, the API returns `accuracyRate: null` and the dashboard shows **“-”**.

4. **API**
   - `GET /api/rainbow/intent/accuracy` → `accuracy.overall.total | correct | incorrect | accuracyRate` and breakdowns `byIntent`, `byTier`, `byModel`.
   - If the DB is unavailable, the route returns empty overall with `accuracyRate: null`.

So: **Intent Accuracy is “% of validated predictions that were correct,” where validation comes from thumbs up/down (and later staff correction).**

---

## Why the card sometimes shows “-”

- **DB not connected:** Intent analytics use the shared PostgreSQL DB; if it’s down, the route returns empty and the card shows “-”.
- **No validated predictions:** If no one has given 👍 or 👎 yet, `correct + incorrect = 0` → `accuracyRate = null` → “-”.
- **No predictions at all:** No rows in `intent_predictions` (e.g. no traffic or logging off) → same effect.

---

## Proposals (implemented / optional)

### ✅ Implemented: Thumbs up counts as “correct”

- **Before:** Only thumbs down updated `was_correct` (to false). Thumbs up did nothing, so “correct” was always 0 and the metric was one-sided or 0%.
- **After:** On thumbs up, the latest prediction for that conversation is marked correct via `markIntentCorrect(conversationId)`. So both 👍 and 👎 feed into Intent Accuracy.

### Optional: Dashboard card when there’s no validation

- Keep showing “-” when `accuracyRate` is null.
- **Option A — Subtitle/tooltip:** e.g. “Based on 👍/👎 feedback” or “Need feedback (👍/👎) to show” so users know why it’s “-”.
- **Option B — Proxy when validated is low:** e.g. show “Est. X%” using average confidence of recent predictions, with a tooltip like “Estimated from confidence; give feedback for true accuracy.” (Can be misleading; use only with clear labeling.)

### Optional: Staff correction

- In Performance or a “Review” tab: for a conversation (or a specific message), let staff choose the “actual” intent. Call `markIntentCorrection(conversationId, actualIntent, 'manual')`. That adds validated rows and improves the accuracy denominator without relying only on thumbs.

### Optional: “Unvalidated” count on Performance tab

- Expose `overall.unvalidated` in the UI (e.g. “N predictions not yet validated”) so operators see how much of the volume has feedback.

---

## Summary

| What | Detail |
|------|--------|
| **Definition** | Intent Accuracy = correct / (correct + incorrect), in %, over predictions that received feedback or correction. |
| **Correct** | Set when user gives 👍 (or staff/manual says “correct”). |
| **Incorrect** | Set when user gives 👎 or staff sets actual intent and it differs from predicted. |
| **“-” on dashboard** | No validated data (no feedback yet or DB down). |
| **Implemented** | Thumbs up now marks the last prediction as correct so the dashboard metric is meaningful as feedback accumulates. |
