import { db } from '../lib/db.js';
import { intentPredictions } from '../../../shared/schema.js';

/**
 * Track an intent prediction made by the bot
 * Logs every classification attempt to measure accuracy over time
 */
export async function trackIntentPrediction(
  conversationId: string,
  phoneNumber: string,
  messageText: string,
  predictedIntent: string,
  confidence: number,
  tier: string,
  model?: string
): Promise<void> {
  try {
    await db.insert(intentPredictions).values({
      conversationId,
      phoneNumber,
      messageText,
      predictedIntent,
      confidence,
      tier,
      model: model || null,
      actualIntent: null,
      wasCorrect: null,
      correctionSource: null,
      correctedAt: null,
    });

    console.log(`[Intent Tracker] 📊 Logged prediction: ${predictedIntent} (confidence: ${confidence.toFixed(2)}, tier: ${tier})`);
  } catch (error) {
    console.error('[Intent Tracker] ❌ Failed to log prediction:', error);
    // Non-fatal — don't crash the router
  }
}

/**
 * Mark an intent prediction as incorrect and log the actual intent
 * Called when user gives negative feedback or when staff corrects the intent
 */
export async function markIntentCorrection(
  conversationId: string,
  actualIntent: string,
  correctionSource: 'feedback' | 'escalation' | 'manual'
): Promise<void> {
  try {
    // Find the most recent prediction for this conversation
    const prediction = await db
      .select()
      .from(intentPredictions)
      .where(eq(intentPredictions.conversationId, conversationId))
      .orderBy(desc(intentPredictions.createdAt))
      .limit(1);

    if (prediction.length === 0) {
      console.warn(`[Intent Tracker] ⚠️ No prediction found for conversation ${conversationId}`);
      return;
    }

    const predictionId = prediction[0].id;
    const wasCorrect = prediction[0].predictedIntent === actualIntent;

    await db
      .update(intentPredictions)
      .set({
        actualIntent,
        wasCorrect,
        correctionSource,
        correctedAt: new Date(),
      })
      .where(eq(intentPredictions.id, predictionId));

    console.log(
      `[Intent Tracker] ${wasCorrect ? '✅' : '❌'} Correction: ` +
      `predicted '${prediction[0].predictedIntent}' → actual '${actualIntent}' ` +
      `(source: ${correctionSource})`
    );
  } catch (error) {
    console.error('[Intent Tracker] ❌ Failed to mark correction:', error);
  }
}

// Missing import statement fix
import { eq, desc } from 'drizzle-orm';
