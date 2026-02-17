import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../../lib/db.js';
import { rainbowFeedback, insertRainbowFeedbackSchema } from '../../../../shared/schema.js';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';
import { badRequest, serverError } from './http-utils.js';

const router = Router();

// ─── In-memory cache for feedback stats (US-165) ────────────────────
let _feedbackStatsCache: { data: any; key: string; expiry: number } | null = null;
const FEEDBACK_STATS_CACHE_TTL = 10_000; // 10 seconds

// ─── POST /api/rainbow/feedback ─────────────────────────────────────
// Submit user feedback for a bot response
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const validated = insertRainbowFeedbackSchema.parse(req.body);

    const [feedback] = await db.insert(rainbowFeedback).values(validated).returning();

    // Invalidate stats cache when new feedback is submitted
    _feedbackStatsCache = null;

    console.log(`[Feedback] 📊 ${validated.rating === 1 ? '👍' : '👎'} from ${validated.phoneNumber} for intent '${validated.intent}' (confidence: ${validated.confidence?.toFixed(2)})`);

    res.status(201).json({ success: true, feedback });
  } catch (error) {
    console.error('[Feedback] ❌ Error saving feedback:', error);
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      badRequest(res, 'Validation error');
    } else {
      serverError(res, 'Failed to save feedback');
    }
  }
});

// ─── GET /api/rainbow/feedback/stats ────────────────────────────────
// Get feedback statistics (overall satisfaction, by intent, by date range)
// US-165: 10-second in-memory cache to avoid redundant DB queries
router.get('/feedback/stats', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, intent } = req.query;

    // Build a cache key from query params
    const cacheKey = JSON.stringify({ startDate, endDate, intent });

    // Return cached result if still valid and same params
    if (
      _feedbackStatsCache &&
      _feedbackStatsCache.expiry > Date.now() &&
      _feedbackStatsCache.key === cacheKey
    ) {
      return res.json(_feedbackStatsCache.data);
    }

    let whereConditions: any[] = [];

    if (startDate) {
      whereConditions.push(gte(rainbowFeedback.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      whereConditions.push(lte(rainbowFeedback.createdAt, new Date(endDate as string)));
    }
    if (intent) {
      whereConditions.push(eq(rainbowFeedback.intent, intent as string));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Daily trend date range
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);
    const trendStartDate = startDate ? new Date(startDate as string) : defaultStartDate;
    const trendEndDate = endDate ? new Date(endDate as string) : new Date();

    // Run all four queries in parallel instead of sequentially
    const [overallStats, byIntent, byTier, dailyTrend] = await Promise.all([
      // Overall stats
      db
        .select({
          totalFeedback: sql<number>`count(*)::int`,
          thumbsUp: sql<number>`count(*) filter (where rating = 1)::int`,
          thumbsDown: sql<number>`count(*) filter (where rating = -1)::int`,
          avgConfidence: sql<number>`avg(confidence)`,
          avgResponseTime: sql<number>`avg(response_time_ms)`,
        })
        .from(rainbowFeedback)
        .where(whereClause),

      // By intent
      db
        .select({
          intent: rainbowFeedback.intent,
          totalFeedback: sql<number>`count(*)::int`,
          thumbsUp: sql<number>`count(*) filter (where rating = 1)::int`,
          thumbsDown: sql<number>`count(*) filter (where rating = -1)::int`,
          avgConfidence: sql<number>`avg(confidence)`,
          satisfactionRate: sql<number>`(count(*) filter (where rating = 1)::float / count(*)::float) * 100`,
        })
        .from(rainbowFeedback)
        .where(whereClause)
        .groupBy(rainbowFeedback.intent)
        .orderBy(desc(sql`count(*)`)),

      // By tier
      db
        .select({
          tier: rainbowFeedback.tier,
          totalFeedback: sql<number>`count(*)::int`,
          thumbsUp: sql<number>`count(*) filter (where rating = 1)::int`,
          thumbsDown: sql<number>`count(*) filter (where rating = -1)::int`,
          satisfactionRate: sql<number>`(count(*) filter (where rating = 1)::float / count(*)::float) * 100`,
        })
        .from(rainbowFeedback)
        .where(whereClause)
        .groupBy(rainbowFeedback.tier)
        .orderBy(desc(sql`count(*)`)),

      // Daily trend
      db
        .select({
          date: sql<string>`date(created_at)`,
          totalFeedback: sql<number>`count(*)::int`,
          thumbsUp: sql<number>`count(*) filter (where rating = 1)::int`,
          thumbsDown: sql<number>`count(*) filter (where rating = -1)::int`,
          satisfactionRate: sql<number>`(count(*) filter (where rating = 1)::float / count(*)::float) * 100`,
        })
        .from(rainbowFeedback)
        .where(and(
          gte(rainbowFeedback.createdAt, trendStartDate),
          lte(rainbowFeedback.createdAt, trendEndDate),
          intent ? eq(rainbowFeedback.intent, intent as string) : undefined
        ))
        .groupBy(sql`date(created_at)`)
        .orderBy(sql`date(created_at)`),
    ]);

    // Calculate satisfaction rate
    const overall = overallStats[0];
    const satisfactionRate = overall.totalFeedback > 0
      ? (overall.thumbsUp / overall.totalFeedback) * 100
      : 0;

    const responseData = {
      success: true,
      stats: {
        overall: {
          ...overall,
          satisfactionRate: satisfactionRate.toFixed(2),
        },
        byIntent,
        byTier,
        dailyTrend,
      },
    };

    // Cache the result for 10 seconds (US-165)
    _feedbackStatsCache = {
      data: responseData,
      key: cacheKey,
      expiry: Date.now() + FEEDBACK_STATS_CACHE_TTL,
    };

    res.json(responseData);
  } catch (error) {
    console.error('[Feedback Stats] ❌ Error fetching stats:', error);
    serverError(res, 'Failed to fetch feedback stats');
  }
});

// ─── GET /api/rainbow/feedback/recent ───────────────────────────────
// Get recent feedback entries (for review dashboard)
router.get('/feedback/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const ratingFilter = req.query.rating as string; // '1', '-1', or undefined (all)

    let whereClause;
    if (ratingFilter) {
      whereClause = eq(rainbowFeedback.rating, parseInt(ratingFilter));
    }

    const recentFeedback = await db
      .select()
      .from(rainbowFeedback)
      .where(whereClause)
      .orderBy(desc(rainbowFeedback.createdAt))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rainbowFeedback)
      .where(whereClause);

    res.json({
      success: true,
      feedback: recentFeedback,
      pagination: {
        limit,
        offset,
        total: total[0].count,
      },
    });
  } catch (error) {
    console.error('[Feedback Recent] ❌ Error fetching recent feedback:', error);
    serverError(res, 'Failed to fetch recent feedback');
  }
});

// ─── GET /api/rainbow/feedback/low-rated ────────────────────────────
// Get thumbs-down feedback for review (quality improvement)
router.get('/feedback/low-rated', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const intent = req.query.intent as string | undefined;

    const lowRatedFeedback = await db
      .select()
      .from(rainbowFeedback)
      .where(and(
        eq(rainbowFeedback.rating, -1),
        intent ? eq(rainbowFeedback.intent, intent) : undefined
      ))
      .orderBy(desc(rainbowFeedback.createdAt))
      .limit(limit);

    res.json({
      success: true,
      feedback: lowRatedFeedback,
    });
  } catch (error) {
    console.error('[Feedback Low-Rated] ❌ Error fetching low-rated feedback:', error);
    serverError(res, 'Failed to fetch low-rated feedback');
  }
});

export default router;
