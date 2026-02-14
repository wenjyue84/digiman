import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../../lib/db.js';
import { intentPredictions } from '../../../../shared/schema.js';
import { desc, eq, sql, isNull, isNotNull } from 'drizzle-orm';
import { serverError, badRequest, notFound } from './http-utils.js';

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
    serverError(res, 'Failed to fetch intent accuracy');
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
    serverError(res, 'Failed to fetch misclassified intents');
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
    serverError(res, 'Failed to fetch low confidence predictions');
  }
});

// ─── GET /api/rainbow/intent/predictions/pending ────────────────────
// List unvalidated predictions for staff review
router.get('/intent/predictions/pending', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const pending = await db
      .select({
        id: intentPredictions.id,
        messageText: intentPredictions.messageText,
        predictedIntent: intentPredictions.predictedIntent,
        confidence: intentPredictions.confidence,
        tier: intentPredictions.tier,
        model: intentPredictions.model,
        phoneNumber: intentPredictions.phoneNumber,
        createdAt: intentPredictions.createdAt,
      })
      .from(intentPredictions)
      .where(isNull(intentPredictions.wasCorrect))
      .orderBy(desc(intentPredictions.createdAt))
      .limit(limit);

    // Count total unvalidated
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(intentPredictions)
      .where(isNull(intentPredictions.wasCorrect));

    res.json({
      success: true,
      predictions: pending,
      total: totalResult[0].count,
    });
  } catch (error) {
    console.error('[Intent Analytics] Error fetching pending predictions:', error);
    serverError(res, 'Failed to fetch pending predictions');
  }
});

// ─── PATCH /api/rainbow/intent/predictions/:id ──────────────────────
// Validate a single prediction (staff marks correct or provides actual intent)
router.patch('/intent/predictions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actualIntent } = req.body;

    if (!actualIntent) {
      return badRequest(res, 'actualIntent is required');
    }

    // Fetch the prediction to compare
    const existing = await db
      .select({ predictedIntent: intentPredictions.predictedIntent })
      .from(intentPredictions)
      .where(eq(intentPredictions.id, id))
      .limit(1);

    if (existing.length === 0) {
      return notFound(res, 'Prediction');
    }

    const wasCorrect = existing[0].predictedIntent === actualIntent;

    await db
      .update(intentPredictions)
      .set({
        actualIntent,
        wasCorrect,
        correctionSource: 'manual',
        correctedAt: new Date(),
      })
      .where(eq(intentPredictions.id, id));

    res.json({
      success: true,
      updated: { id, wasCorrect, actualIntent },
    });
  } catch (error) {
    console.error('[Intent Analytics] Error validating prediction:', error);
    serverError(res, 'Failed to validate prediction');
  }
});

// ─── POST /api/rainbow/intent/predictions/bulk-validate ─────────────
// Bulk validate multiple predictions at once (approve all, reject all, etc.)
router.post('/intent/predictions/bulk-validate', async (req: Request, res: Response) => {
  try {
    const { ids, wasCorrect, actualIntent } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, 'ids array is required');
    }

    if (typeof wasCorrect !== 'boolean') {
      return badRequest(res, 'wasCorrect (boolean) is required');
    }

    // If wasCorrect is false and no actualIntent provided, we can't update
    // (staff needs to specify what the correct intent was)
    if (!wasCorrect && !actualIntent) {
      return badRequest(res, 'actualIntent is required when wasCorrect is false');
    }

    // Fetch all predictions to determine actualIntent if wasCorrect=true
    const predictions = await db
      .select({ id: intentPredictions.id, predictedIntent: intentPredictions.predictedIntent })
      .from(intentPredictions)
      .where(
        ids.length === 1
          ? eq(intentPredictions.id, ids[0])
          : sql`${intentPredictions.id} IN (${sql.join(
              ids.map((id) => sql`${id}`),
              sql`, `
            )})`
      );

    if (predictions.length === 0) {
      return notFound(res, 'Predictions');
    }

    // Build update values for each prediction
    const updates = predictions.map((p) => ({
      id: p.id,
      actualIntent: wasCorrect ? p.predictedIntent : actualIntent,
      wasCorrect,
      correctionSource: 'manual' as const,
      correctedAt: new Date(),
    }));

    // Bulk update all predictions
    for (const update of updates) {
      await db
        .update(intentPredictions)
        .set({
          actualIntent: update.actualIntent,
          wasCorrect: update.wasCorrect,
          correctionSource: update.correctionSource,
          correctedAt: update.correctedAt,
        })
        .where(eq(intentPredictions.id, update.id));
    }

    res.json({
      success: true,
      updated: updates.length,
      ids: predictions.map((p) => p.id),
    });
  } catch (error) {
    console.error('[Intent Analytics] Error bulk validating predictions:', error);
    serverError(res, 'Failed to bulk validate predictions');
  }
});

export default router;
