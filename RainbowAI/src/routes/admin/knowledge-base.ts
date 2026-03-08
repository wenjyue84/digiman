import { Router } from 'express';
import type { Request, Response } from 'express';
import { getKnowledgeMarkdown, guessTopicFiles } from '../../assistant/knowledge-base.js';
import { isAIAvailable, chatWithFallback, getAISettings } from '../../assistant/ai-client.js';
import { ok, badRequest, serverError } from './http-utils.js';

// Sub-routers (split from this file for the 800-line rule)
import kbFilesRoutes from './kb-files.js';
import kbKnowledgeRoutes from './kb-knowledge.js';
import kbAiOperationsRoutes from './kb-ai-operations.js';
import kbContactsRoutes from './kb-contacts.js';

const router = Router();

// ─── Mount Sub-Routers ──────────────────────────────────────────────
router.use(kbFilesRoutes);
router.use(kbKnowledgeRoutes);
router.use(kbAiOperationsRoutes);
router.use(kbContactsRoutes);

// ─── KB Accuracy Test (US-112) ──────────────────────────────────────

router.post('/kb-test', async (req: Request, res: Response) => {
  const { question, history: chatHistory } = req.body;
  if (!question || typeof question !== 'string') {
    badRequest(res, 'question (string) required');
    return;
  }
  if (!isAIAvailable()) {
    res.status(503).json({ error: 'AI not available — configure an AI provider' });
    return;
  }

  const startTime = Date.now();

  try {
    // Guess which topic files to load based on the question
    const topicFiles = guessTopicFiles(question);

    // Build KB-only system prompt (no intent classification, just answer from KB)
    const kb = getKnowledgeMarkdown();
    const systemPrompt = `You are Rainbow AI, the WhatsApp concierge for Pelangi Capsule Hostel in Johor Bahru, Malaysia.

IMPORTANT: Answer the user's question using ONLY the Knowledge Base content below.
- If the answer is NOT in the Knowledge Base, say: "This information is not in the Knowledge Base."
- Do NOT guess, infer, or use external knowledge.
- Be warm, concise, and helpful.
- Respond in the same language as the question.

<knowledge_base>
${kb}
</knowledge_base>`;

    // Build message history for multi-turn
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    if (Array.isArray(chatHistory)) {
      for (const msg of chatHistory.slice(-10)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    messages.push({ role: 'user', content: question });

    const chatCfg = getAISettings();
    const { content, provider, usage } = await chatWithFallback(
      messages,
      chatCfg.max_chat_tokens,
      chatCfg.chat_temperature
    );

    const responseTime = Date.now() - startTime;

    if (!content) {
      throw new Error('AI temporarily unavailable');
    }

    ok(res, {
      answer: content,
      devInfo: {
        responseTime,
        tokensUsed: usage?.total_tokens || null,
        promptTokens: usage?.prompt_tokens || null,
        completionTokens: usage?.completion_tokens || null,
        kbFilesMatched: topicFiles,
        provider: provider?.name || 'unknown',
        model: provider?.model || 'unknown',
      }
    });
  } catch (err: any) {
    serverError(res, `KB test failed: ${err.message}`);
  }
});

export default router;
