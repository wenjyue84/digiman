import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../../lib/db.js';
import { intentPredictions } from '../../../../shared/schema.js';
import { desc, eq, sql, isNotNull } from 'drizzle-orm';

const router = Router();

// ─── GET /api/rainbow/intent/accuracy ───────────────────────────────
// Get intent classification accuracy metrics
router.get('/intent/accuracy', async (req: Request, res: Response) => {
  try {
    // Test database connection first
    try {
      await db.execute(sql`SELECT 1`);
    } catch (connError) {
      console.error('[Intent Analytics] ⚠️ Database not available, returning empty data');
      return res.json({
        success: true,
        accuracy: {
          overall: {
            total: 0,
            correct: 0,
            incorrect: 0,
            unvalidated: 0,
            avgConfidence: null,
            accuracyRate: null,
          },
          byIntent: [],
          byTier: [],
          byModel: [],
        },
        warning: 'Database connection unavailable. Install data when database is connected.',
      });
    }

    // Overall accuracy (only counting predictions that have been validated)
    const overallStats = await db
      .select({
        total: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) filter (where was_correct = true)::int`,
        incorrect: sql<number>`count(*) filter (where was_correct = false)::int`,
        unvalidated: sql<number>`count(*) filter (where was_correct is null)::int`,
        avgConfidence: sql<number>`avg(confidence)`,
      })
      .from(intentPredictions);

    const overall = overallStats[0];
    const validatedTotal = overall.correct + overall.incorrect;
    const accuracyRate = validatedTotal > 0
      ? (overall.correct / validatedTotal) * 100
      : null;

    // Accuracy by intent
    const byIntent = await db
      .select({
        intent: intentPredictions.predictedIntent,
        total: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) filter (where was_correct = true)::int`,
        incorrect: sql<number>`count(*) filter (where was_correct = false)::int`,
        accuracyRate: sql<number>`
          case
            when count(*) filter (where was_correct is not null) > 0
            then (count(*) filter (where was_correct = true)::float /
                  count(*) filter (where was_correct is not null)::float) * 100
            else null
          end
        `,
        avgConfidence: sql<number>`avg(confidence)`,
      })
      .from(intentPredictions)
      .groupBy(intentPredictions.predictedIntent)
      .orderBy(desc(sql`count(*)`));

    // Accuracy by tier
    const byTier = await db
      .select({
        tier: intentPredictions.tier,
        total: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) filter (where was_correct = true)::int`,
        incorrect: sql<number>`count(*) filter (where was_correct = false)::int`,
        accuracyRate: sql<number>`
          case
            when count(*) filter (where was_correct is not null) > 0
            then (count(*) filter (where was_correct = true)::float /
                  count(*) filter (where was_correct is not null)::float) * 100
            else null
          end
        `,
        avgConfidence: sql<number>`avg(confidence)`,
      })
      .from(intentPredictions)
      .groupBy(intentPredictions.tier)
      .orderBy(desc(sql`count(*)`));

    // Accuracy by model (for T4 LLM tier)
    const byModel = await db
      .select({
        model: intentPredictions.model,
        total: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) filter (where was_correct = true)::int`,
        incorrect: sql<number>`count(*) filter (where was_correct = false)::int`,
        accuracyRate: sql<number>`
          case
            when count(*) filter (where was_correct is not null) > 0
            then (count(*) filter (where was_correct = true)::float /
                  count(*) filter (where was_correct is not null)::float) * 100
            else null
          end
        `,
      })
      .from(intentPredictions)
      .where(isNotNull(intentPredictions.model))
      .groupBy(intentPredictions.model)
      .orderBy(desc(sql`count(*)`));

    res.json({
      success: true,
      accuracy: {
        overall: {
          ...overall,
          accuracyRate: accuracyRate !== null ? parseFloat(accuracyRate.toFixed(2)) : null,
        },
        byIntent,
        byTier,
        byModel,
      },
    });
  } catch (error) {
    console.error('[Intent Analytics] ❌ Error fetching accuracy:', error);
    res.status(500).json({ error: 'Failed to fetch intent accuracy' });
  }
});

// ─── GET /api/rainbow/intent/misclassified ──────────────────────────
// Get list of misclassified intents for review
router.get('/intent/misclassified', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const intent = req.query.intent as string | undefined;

    const misclassified = await db
      .select()
      .from(intentPredictions)
      .where(
        intent
          ? sql`was_correct = false AND predicted_intent = ${intent}`
          : eq(intentPredictions.wasCorrect, false)
      )
      .orderBy(desc(intentPredictions.createdAt))
      .limit(limit);

    res.json({
      success: true,
      misclassified,
    });
  } catch (error) {
    console.error('[Intent Analytics] ❌ Error fetching misclassified:', error);
    res.status(500).json({ error: 'Failed to fetch misclassified intents' });
  }
});

// ─── GET /api/rainbow/intent/low-confidence ─────────────────────────
// Get predictions with low confidence (potential issues)
router.get('/intent/low-confidence', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const threshold = parseFloat(req.query.threshold as string) || 0.6;

    const lowConfidence = await db
      .select()
      .from(intentPredictions)
      .where(sql`confidence < ${threshold}`)
      .orderBy(intentPredictions.confidence)
      .limit(limit);

    res.json({
      success: true,
      lowConfidence,
      threshold,
    });
  } catch (error) {
    console.error('[Intent Analytics] ❌ Error fetching low confidence:', error);
    res.status(500).json({ error: 'Failed to fetch low confidence predictions' });
  }
});

export default router;
