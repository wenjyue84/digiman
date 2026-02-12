# Improvement #2: Intent Accuracy Tracking ✅

## Implementation Summary

**Date:** 2026-02-12
**Status:** ✅ Database Ready, API & Integration Needed

---

## What Was Implemented

### 1. Database Table (`intent_predictions`)

✅ **Created and pushed to database**

```sql
CREATE TABLE intent_predictions (
  id UUID PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  message_text TEXT NOT NULL,
  predicted_intent TEXT NOT NULL,
  confidence REAL NOT NULL,
  tier TEXT NOT NULL,  -- T1, T2, T3, T4, llm
  model TEXT,  -- AI model used (if T4)
  actual_intent TEXT,  -- Corrected intent (NULL = unknown)
  was_correct BOOLEAN,  -- true/false/null
  correction_source TEXT,  -- "feedback", "escalation", "manual"
  corrected_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Indexes:** conversation_id, phone_number, predicted_intent, tier, was_correct, created_at

---

## Next Steps (To Complete Improvement #2)

### Step 1: Create Intent Tracking Module

**File:** `mcp-server/src/assistant/intent-tracker.ts`

```typescript
import { db } from '../lib/db.js';
import { intentPredictions } from '../../../shared/schema.js';

export async function trackIntentPrediction(data: {
  conversationId: string;
  phoneNumber: string;
  messageText: string;
  predictedIntent: string;
  confidence: number;
  tier: string;
  model?: string;
}) {
  await db.insert(intentPredictions).values(data);
  console.log(`[Intent Tracker] 📊 Tracked: ${data.predictedIntent} (${data.tier})`);
}

export async function markIntentCorrection(
  conversationId: string,
  actualIntent: string,
  source: 'feedback' | 'escalation' | 'manual'
) {
  const [prediction] = await db
    .select()
    .from(intentPredictions)
    .where(eq(intentPredictions.conversationId, conversationId))
    .orderBy(desc(intentPredictions.createdAt))
    .limit(1);

  if (!prediction) return;

  const wasCorrect = prediction.predictedIntent === actualIntent;

  await db.update(intentPredictions)
    .set({
      actualIntent,
      wasCorrect,
      correctionSource: source,
      correctedAt: new Date()
    })
    .where(eq(intentPredictions.id, prediction.id));

  console.log(`[Intent Tracker] ✅ Corrected: ${prediction.predictedIntent} → ${actualIntent} (was ${wasCorrect ? 'correct' : 'wrong'})`);
}
```

### Step 2: Integrate into Message Router

**File:** `mcp-server/src/assistant/message-router.ts`

Add after intent classification (around line 320):

```typescript
// Track intent prediction for accuracy analytics
import { trackIntentPrediction } from './intent-tracker.js';

// ... after getting result.intent, result.confidence, _devMetadata.source

if (result.intent) {
  await trackIntentPrediction({
    conversationId: `${phone}-${Date.now()}`,
    phoneNumber: phone,
    messageText: text,
    predictedIntent: result.intent,
    confidence: result.confidence,
    tier: _devMetadata.source,
    model: result.model
  });
}
```

### Step 3: Mark Corrections from Escalations

When a guest escalates after a bot response, infer the intent was wrong:

```typescript
// In escalation.ts, after escalating:
import { markIntentCorrection } from './intent-tracker.js';

if (reason === 'complaint' || reason === 'repeat_unknown') {
  // Guest escalated → assume intent was wrong
  await markIntentCorrection(conversationId, 'unknown', 'escalation');
}
```

### Step 4: Create Analytics API Endpoint

**File:** `mcp-server/src/routes/admin/intent-analytics.ts`

```typescript
import { Router } from 'express';
import { db } from '../../lib/db.js';
import { intentPredictions } from '../../../../shared/schema.js';
import { sql, eq, and, gte, lte, isNotNull } from 'drizzle-orm';

const router = Router();

// GET /api/rainbow/intent/accuracy
router.get('/rainbow/intent/accuracy', async (req, res) => {
  const { startDate, endDate, tier, intent } = req.query;

  // Build filters
  let filters: any[] = [isNotNull(intentPredictions.wasCorrect)];
  if (startDate) filters.push(gte(intentPredictions.createdAt, new Date(startDate)));
  if (endDate) filters.push(lte(intentPredictions.createdAt, new Date(endDate)));
  if (tier) filters.push(eq(intentPredictions.tier, tier));
  if (intent) filters.push(eq(intentPredictions.predictedIntent, intent));

  const whereClause = and(...filters);

  // Overall accuracy
  const overall = await db
    .select({
      total: sql<number>`count(*)::int`,
      correct: sql<number>`count(*) filter (where was_correct = true)::int`,
      incorrect: sql<number>`count(*) filter (where was_correct = false)::int`,
      accuracy: sql<number>`(count(*) filter (where was_correct = true)::float / count(*)::float) * 100`
    })
    .from(intentPredictions)
    .where(whereClause);

  // By intent
  const byIntent = await db
    .select({
      intent: intentPredictions.predictedIntent,
      total: sql<number>`count(*)::int`,
      correct: sql<number>`count(*) filter (where was_correct = true)::int`,
      incorrect: sql<number>`count(*) filter (where was_correct = false)::int`,
      accuracy: sql<number>`(count(*) filter (where was_correct = true)::float / count(*)::float) * 100`,
      avgConfidence: sql<number>`avg(confidence)`
    })
    .from(intentPredictions)
    .where(whereClause)
    .groupBy(intentPredictions.predictedIntent)
    .orderBy(sql`count(*) DESC`);

  // By tier
  const byTier = await db
    .select({
      tier: intentPredictions.tier,
      total: sql<number>`count(*)::int`,
      correct: sql<number>`count(*) filter (where was_correct = true)::int`,
      accuracy: sql<number>`(count(*) filter (where was_correct = true)::float / count(*)::float) * 100`
    })
    .from(intentPredictions)
    .where(whereClause)
    .groupBy(intentPredictions.tier);

  res.json({
    success: true,
    stats: {
      overall: overall[0],
      byIntent,
      byTier
    }
  });
});

// GET /api/rainbow/intent/misclassified
router.get('/rainbow/intent/misclassified', async (req, res) => {
  const { limit = 50 } = req.query;

  const misclassified = await db
    .select()
    .from(intentPredictions)
    .where(eq(intentPredictions.wasCorrect, false))
    .orderBy(desc(intentPredictions.createdAt))
    .limit(parseInt(limit));

  res.json({
    success: true,
    misclassified
  });
});

export default router;
```

Register in `mcp-server/src/routes/admin/index.ts`:
```typescript
import intentAnalyticsRoutes from './intent-analytics.js';
router.use(intentAnalyticsRoutes);
```

---

## How It Works

### Tracking Flow

1. **User sends message** → "How much is a bed?"
2. **Bot classifies intent** → `pricing` (confidence: 0.85, tier: T3)
3. **Tracker logs prediction** → Saves to `intent_predictions` table
4. **Bot responds** → "Our beds cost RM35/night"
5. **User provides feedback** → Thumbs down 👎
6. **Mark as incorrect** → Update `was_correct = false`, `correction_source = 'feedback'`

### Correction Sources

1. **Feedback:** User gave thumbs down → infer intent was wrong
2. **Escalation:** User escalated to staff → intent likely wrong
3. **Manual:** Admin manually corrects via dashboard (future feature)

### Accuracy Calculation

```sql
Accuracy = (Correct Predictions / Total Predictions with Known Outcome) * 100
```

- **Correct:** `was_correct = true`
- **Incorrect:** `was_correct = false`
- **Unknown:** `was_correct = NULL` (no correction yet)

---

## Expected Results

### Target Metrics

✅ **Overall Accuracy:** >95% (production-grade)
✅ **By Tier:**
  - T1 (Emergency): 100% (regex-based, deterministic)
  - T2 (Fuzzy): 85-90% (keyword matching)
  - T3 (Semantic): 90-95% (embeddings)
  - T4 (LLM): 95%+ (most flexible)

✅ **By Intent:**
  - High accuracy (>95%): pricing, wifi, facilities
  - Medium accuracy (85-95%): availability, check_in
  - Low accuracy (<85%): complex multi-intent queries

### Weekly Review Process

1. **Check overall accuracy:**
   ```bash
   curl "http://localhost:3002/api/rainbow/intent/accuracy"
   ```

2. **Find weak intents (<85% accuracy):**
   - Review misclassified examples
   - Add more keywords to `intent-keywords.json`
   - Add more examples to `intent-examples.json`

3. **Compare tier performance:**
   - If T2 (fuzzy) < 80% → improve keywords
   - If T3 (semantic) < 85% → add examples
   - If T4 (LLM) < 90% → improve system prompt

4. **Test improvements:**
   - Update keywords/examples
   - Monitor accuracy change week-over-week

---

## API Endpoints (To Be Created)

### GET `/api/rainbow/intent/accuracy`

**Query params:** `?startDate=2026-02-01&endDate=2026-02-12&tier=T3&intent=pricing`

**Response:**
```json
{
  "success": true,
  "stats": {
    "overall": {
      "total": 100,
      "correct": 92,
      "incorrect": 8,
      "accuracy": 92.00
    },
    "byIntent": [
      {
        "intent": "pricing",
        "total": 25,
        "correct": 24,
        "incorrect": 1,
        "accuracy": 96.00,
        "avgConfidence": 0.87
      },
      {
        "intent": "wifi",
        "total": 20,
        "correct": 18,
        "incorrect": 2,
        "accuracy": 90.00,
        "avgConfidence": 0.82
      }
    ],
    "byTier": [
      {
        "tier": "T3",
        "total": 50,
        "correct": 47,
        "accuracy": 94.00
      },
      {
        "tier": "llm",
        "total": 30,
        "correct": 29,
        "accuracy": 96.67
      }
    ]
  }
}
```

### GET `/api/rainbow/intent/misclassified?limit=50`

Returns list of misclassified intents for review.

---

## Status Summary

### ✅ Completed
- Database table created and pushed
- Schema validation added
- Indexes optimized for queries

### 🚧 TODO (Next Session)
1. Create `intent-tracker.ts` module
2. Integrate tracking into `message-router.ts`
3. Mark corrections from feedback (thumbs down)
4. Mark corrections from escalations
5. Create `intent-analytics.ts` API endpoints
6. Test end-to-end accuracy tracking
7. Create weekly review dashboard (optional UI)

---

## Testing Plan (After Implementation)

### Test 1: Basic Tracking
1. Send message: "How much?"
2. Check database: `SELECT * FROM intent_predictions ORDER BY created_at DESC LIMIT 1;`
3. Verify: predicted_intent, confidence, tier recorded ✅

### Test 2: Feedback Correction
1. Send message: "wifi password?"
2. Bot responds with wifi info
3. Reply: "👎" (thumbs down)
4. Check database: `was_correct = false`, `correction_source = 'feedback'` ✅

### Test 3: Escalation Correction
1. Send message that triggers escalation
2. Check database: `was_correct = false`, `correction_source = 'escalation'` ✅

### Test 4: Accuracy Analytics
1. Collect 100+ predictions over 1 week
2. Call API: `GET /api/rainbow/intent/accuracy`
3. Verify accuracy >95% target ✅

---

## Files to Create/Modify

1. ✅ `shared/schema.ts` - Added `intent_predictions` table
2. 🚧 `mcp-server/src/assistant/intent-tracker.ts` - NEW tracking module
3. 🚧 `mcp-server/src/assistant/message-router.ts` - Add tracking call
4. 🚧 `mcp-server/src/assistant/escalation.ts` - Mark corrections
5. 🚧 `mcp-server/src/routes/admin/intent-analytics.ts` - NEW API endpoints
6. 🚧 `mcp-server/src/routes/admin/index.ts` - Register analytics routes

---

## Key Insights

**Accuracy tracking enables:**
- Data-driven improvement (identify weak intents)
- Tier comparison (which detection method works best)
- Model comparison (which AI models perform best)
- Confidence calibration (are high-confidence predictions actually correct?)
- A/B testing (test keyword/example changes)

**Next:** Complete implementation, test, and measure baseline accuracy!
