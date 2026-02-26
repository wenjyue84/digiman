import { Router } from 'express';
import type { Request, Response } from 'express';
import { configStore } from '../../assistant/config-store.js';
import { isAIAvailable, classifyAndRespond } from '../../assistant/ai-client.js';
import { UNKNOWN_FALLBACK_MESSAGES } from '../../assistant/ai-response-generator.js';
import { buildSystemPrompt, guessTopicFiles } from '../../assistant/knowledge-base.js';
import { badRequest, serverError } from './http-utils.js';
import { trackMessageReceived, trackIntentClassified, trackResponseSent } from '../../lib/activity-tracker.js';

const router = Router();

// ─── Preview Chat (Simulate Guest Conversation) ────────────────────

// In-memory workflow state for preview/chat sessions (keyed by history signature)
const previewWorkflowStates = new Map<string, { workflowId: string; currentStepIndex: number }>();

// Generate a stable key from conversation history to track workflow state across turns
function getPreviewSessionKey(history: Array<{ role: string; content: string }>): string {
  // Use first user message + history length as key (unique per autotest scenario)
  const firstMsg = history.find(m => m.role === 'user')?.content || '';
  return `${firstMsg.slice(0, 50)}::${history.length}`;
}

// Get the key for looking up existing state (look at history BEFORE current message)
function getPreviewLookupKey(history: Array<{ role: string; content: string }>): string {
  const firstMsg = history.find(m => m.role === 'user')?.content || '';
  return `${firstMsg.slice(0, 50)}::${history.length}`;
}

// ─── Input Sanitization Helper ───────────────────────────────────────

/**
 * Sanitize user input to prevent prompt injection attacks.
 * Removes suspicious patterns that could manipulate AI behavior.
 */
function sanitizeInput(text: string): string {
  if (!text || typeof text !== 'string') return '';

  // Trim excessive whitespace
  let sanitized = text.trim();

  // Limit length to prevent extremely long inputs (max 50,000 chars = ~12,500 tokens)
  if (sanitized.length > 50000) {
    sanitized = sanitized.substring(0, 50000);
  }

  // Remove null bytes and control characters (except newlines/tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Detect and neutralize common prompt injection patterns
  const injectionPatterns = [
    // System role injection attempts
    /system\s*[:：]\s*/gi,
    /\[system\]/gi,
    /\<system\>/gi,
    // Role switching attempts
    /you\s+are\s+now/gi,
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
    /forget\s+(all\s+)?(previous|prior|instructions?)/gi,
    // Delimiter breaking attempts
    /\-{10,}/g,  // Long dashes
    /\={10,}/g,  // Long equals
    /\#{5,}/g,   // Many hashes
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized.trim();
}

/**
 * Validate that input doesn't contain obvious prompt injection attempts.
 * Returns an error message if suspicious, null if safe.
 */
function validateInputSafety(text: string): string | null {
  // Check for repeated prompt injection keywords (more than 3 occurrences)
  const suspiciousKeywords = [
    'ignore instructions',
    'you are now',
    'system:',
    'assistant:',
    'human:',
    '[INST]',
    '</s>',
    '<|im_start|>',
    '<|im_end|>',
  ];

  const lowerText = text.toLowerCase();
  for (const keyword of suspiciousKeywords) {
    const occurrences = (lowerText.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    if (occurrences >= 3) {
      return 'Input contains suspicious patterns';
    }
  }

  return null;
}

router.post('/preview/chat', async (req: Request, res: Response) => {
  const { message, history, sessionId } = req.body;
  if (!message || typeof message !== 'string') {
    badRequest(res, 'message (string) required');
    return;
  }

  // Sanitize input to remove potential injection patterns
  const sanitizedMessage = sanitizeInput(message);

  // If sanitization removed everything, return error
  if (!sanitizedMessage) {
    badRequest(res, 'Invalid input');
    return;
  }

  // Validate for obvious injection attempts
  const safetyError = validateInputSafety(sanitizedMessage);
  if (safetyError) {
    // Return a safe response instead of failing
    res.json({
      message: "I'm Rainbow, an AI assistant for Pelangi Capsule Hostel. I noticed your message contains unusual patterns. Please send a normal question about the hostel and I'll be happy to help!",
      intent: 'unknown',
      source: 'validation',
      action: 'static_reply',
      routedAction: 'static_reply',
      confidence: 0,
      model: 'none',
      responseTime: 0,
      matchedKeyword: '',
      matchedExample: '',
      detectedLanguage: 'en',
      kbFiles: [],
      messageType: 'info',
      problemOverride: false,
      sentiment: null,
      editMeta: null,
      sanitized: true
    });
    return;
  }

  try {
    const startTime = Date.now();
    trackMessageReceived('simulator@preview', 'Live Sim', sanitizedMessage);

    const conversationHistory = Array.isArray(history) ? history.map((msg: any) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString()
    })) : [];

    // Check if there's an active workflow from a previous turn
    // Prioritize sessionId if available, otherwise fallback to history-based key
    const lookupKey = sessionId || getPreviewLookupKey(conversationHistory);
    const activeWorkflow = previewWorkflowStates.get(lookupKey);
    console.log(`[Preview] Chat Request: sessionId=${sessionId}, lookupKey=${lookupKey}`);
    console.log(`[Preview] Active Workflow Found: ${activeWorkflow ? JSON.stringify(activeWorkflow) : 'None'}`);

    const { classifyMessage, getEmergencyIntent } = await import('../../assistant/intents.js');

    // Check emergency first (bypass LLM/classifier if it's an emergency)
    const emergencyIntent = getEmergencyIntent(sanitizedMessage);
    let intentResult;

    if (emergencyIntent) {
      intentResult = {
        category: emergencyIntent,
        confidence: 1.0,
        source: 'regex',
        matchedKeyword: 'emergency',
        matchedExample: '',
        detectedLanguage: 'en'
      };
    } else {
      intentResult = await classifyMessage(sanitizedMessage, conversationHistory);
    }

    const routingConfig = configStore.getRouting() || {};
    const route = routingConfig[intentResult.category];
    const routedAction: string = activeWorkflow ? 'workflow' : (route?.action || 'llm_reply');

    const { detectMessageType } = await import('../../assistant/problem-detector.js');
    const messageType = detectMessageType(sanitizedMessage);

    // Analyze sentiment
    const { analyzeSentiment, isSentimentAnalysisEnabled } = await import('../../assistant/sentiment-tracker.js');
    const sentimentScore = isSentimentAnalysisEnabled() ? analyzeSentiment(sanitizedMessage) : null;

    let finalMessage = '';
    let llmModel = 'none';
    let topicFiles: string[] = [];
    let problemOverride = false;
    let activeWorkflowId = activeWorkflow?.workflowId || null;
    let llmUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;
    let editMeta: {
      type: 'knowledge' | 'workflow' | 'template';
      intent?: string;
      workflowId?: string;
      workflowName?: string;
      stepId?: string;
      stepIndex?: number;
      templateKey?: string;
      languages?: { en: string; ms: string; zh: string };
      alsoTemplate?: { key: string; languages: { en: string; ms: string; zh: string } };
    } | null = null;

    // Handle active workflow continuation
    if (activeWorkflow) {
      const workflowsData = configStore.getWorkflows() || { workflows: [] };
      const workflow = (workflowsData.workflows || []).find(w => w.id === activeWorkflow.workflowId);
      if (workflow && activeWorkflow.currentStepIndex < workflow.steps.length) {
        const step = workflow.steps[activeWorkflow.currentStepIndex];
        finalMessage = step.message?.en || '';
        editMeta = {
          type: 'workflow',
          workflowId: activeWorkflow.workflowId,
          workflowName: workflow.name,
          stepId: step.id,
          stepIndex: activeWorkflow.currentStepIndex,
          languages: {
            en: step.message?.en || '',
            ms: step.message?.ms || '',
            zh: step.message?.zh || ''
          }
        };

        // Advance or complete workflow
        if (activeWorkflow.currentStepIndex + 1 < workflow.steps.length) {
          // Save state for next turn (always advance state for simulation)
          const saveKey = sessionId || getPreviewSessionKey([...conversationHistory, { role: 'user', content: sanitizedMessage }, { role: 'assistant', content: finalMessage }]);
          console.log(`[Preview] Saving workflow continuation: key=${saveKey}, nextStep=${activeWorkflow.currentStepIndex + 1}`);
          previewWorkflowStates.set(saveKey, {
            workflowId: activeWorkflow.workflowId,
            currentStepIndex: activeWorkflow.currentStepIndex + 1
          });
        } else {
          // Workflow completed
          previewWorkflowStates.delete(lookupKey);
        }
      } else {
        // Workflow completed or not found, clean up
        previewWorkflowStates.delete(lookupKey);
      }
    } else if (routedAction === 'static_reply') {
      const knowledge = configStore.getKnowledge() || { static: [], dynamic: {} };
      const staticEntry = (knowledge.static || []).find(e => e.intent === intentResult.category);
      const staticText = staticEntry?.response?.en || '(no static reply configured)';

      if (messageType === 'info') {
        finalMessage = staticText;
      } else {
        problemOverride = true;
        if (isAIAvailable()) {
          topicFiles = guessTopicFiles(sanitizedMessage);
          const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt, topicFiles);
          const result = await classifyAndRespond(systemPrompt, conversationHistory, sanitizedMessage);
          finalMessage = result.response || staticText;
          llmModel = result.model || 'unknown';
          llmUsage = result.usage;
        } else {
          finalMessage = staticText;
        }
      }

      // Inline-edit metadata for static replies (Quick Replies)
      if (staticEntry) {
        editMeta = {
          type: 'knowledge',
          intent: intentResult.category,
          languages: { en: staticEntry.response.en || '', ms: staticEntry.response.ms || '', zh: staticEntry.response.zh || '' }
        };
      }

      // Check if this intent also has a System Message template
      const templates = configStore.getTemplates() || {};
      const tmpl = templates[intentResult.category];
      if (tmpl && editMeta) {
        editMeta.alsoTemplate = {
          key: intentResult.category,
          languages: { en: tmpl.en || '', ms: tmpl.ms || '', zh: tmpl.zh || '' }
        };
      }

    } else if (routedAction === 'workflow') {
      // Workflow routing — show the first step message
      const workflowId = route?.workflow_id;
      if (workflowId) {
        const workflowsData = configStore.getWorkflows() || { workflows: [] };
        const workflow = (workflowsData.workflows || []).find(w => w.id === workflowId);
        if (workflow && workflow.steps.length > 0) {
          // Show all non-waitForReply intro messages, then the first waitForReply step
          const introMessages: string[] = [];
          let editStep = workflow.steps[0];
          let stopIndex = 0;
          for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i];
            introMessages.push(step.message?.en || '');
            editStep = step;
            stopIndex = i;
            if (step.waitForReply) break;
          }
          finalMessage = introMessages.join('\n\n');
          editMeta = {
            type: 'workflow',
            workflowId,
            workflowName: workflow.name,
            stepId: editStep.id,
            stepIndex: workflow.steps.indexOf(editStep),
            languages: {
              en: editStep.message?.en || '',
              ms: editStep.message?.ms || '',
              zh: editStep.message?.zh || ''
            }
          };

          // Save workflow state for next turn if there are more steps
          if (editStep.waitForReply && stopIndex + 1 < workflow.steps.length) {
            const saveKey = sessionId || getPreviewSessionKey([...conversationHistory, { role: 'user', content: sanitizedMessage }, { role: 'assistant', content: finalMessage }]);
            console.log(`[Preview] Saving NEW workflow state: key=${saveKey}, nextStep=${stopIndex + 1}`);
            previewWorkflowStates.set(saveKey, {
              workflowId,
              currentStepIndex: stopIndex + 1
            });
          }
        }
      }
      // Fallback to LLM if workflow not found
      if (!finalMessage) {
        if (isAIAvailable()) {
          topicFiles = guessTopicFiles(sanitizedMessage);
          const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt, topicFiles);
          const result = await classifyAndRespond(systemPrompt, conversationHistory, sanitizedMessage);
          finalMessage = result.response;
          llmModel = result.model || 'unknown';
          llmUsage = result.usage;
        } else {
          finalMessage = 'Workflow not configured';
        }
      }

    } else if (isAIAvailable()) {
      topicFiles = guessTopicFiles(sanitizedMessage);
      const systemPrompt = buildSystemPrompt(configStore.getSettings().system_prompt, topicFiles);
      const result = await classifyAndRespond(systemPrompt, conversationHistory, sanitizedMessage);
      finalMessage = result.response;
      llmModel = result.model || 'unknown';
      llmUsage = result.usage;
    } else {
      finalMessage = 'AI not available';
    }

    // Catch-all fallback: if no response was generated (gibberish, LLM failure, etc.),
    // return a polite clarification message in the detected language
    if (!finalMessage || !finalMessage.trim()) {
      const detectedLang = (intentResult.detectedLanguage === 'ms' || intentResult.detectedLanguage === 'zh')
        ? intentResult.detectedLanguage as 'en' | 'ms' | 'zh'
        : 'en';
      finalMessage = UNKNOWN_FALLBACK_MESSAGES[detectedLang];
      llmModel = llmModel === 'none' ? 'static_fallback' : llmModel;
    }

    // ─── Sentiment-based escalation for preview ────────────────────
    // Analyze consecutive negative user messages from history + current message.
    // Stateless: counts from the history array each time (no shared state crosstalk).
    if (sentimentScore === 'negative' && isSentimentAnalysisEnabled()) {
      const settings = configStore.getSettings();
      const threshold = settings.sentiment_analysis?.consecutive_threshold ?? 2;

      // Count consecutive negative user messages: current (1) + history backwards
      let consecutiveNeg = 1;
      for (let i = conversationHistory.length - 1; i >= 0; i--) {
        if (conversationHistory[i].role === 'user') {
          if (analyzeSentiment(conversationHistory[i].content) === 'negative') {
            consecutiveNeg++;
          } else {
            break;
          }
        }
      }

      if (consecutiveNeg >= threshold) {
        finalMessage += "\n\nI'm sorry about the trouble you're experiencing. I've escalated this to our staff — a manager will contact you shortly to help resolve this.";
      }
    }

    const responseTime = Date.now() - startTime;
    trackIntentClassified(intentResult.category, intentResult.confidence, intentResult.source);
    trackResponseSent('simulator@preview', 'Live Sim', routedAction, responseTime);

    // Build token breakdown estimate (char/4 approximation)
    const usage = intentResult.usage || llmUsage || null;
    let tokenBreakdown: {
      systemPrompt: number; kbContext: number;
      conversationHistory: number; userMessage: number;
      aiResponse: number;
    } | null = null;
    if (usage && (usage.prompt_tokens || usage.completion_tokens)) {
      const settings = configStore.getSettings();
      const basePromptChars = (settings.system_prompt || '').length;
      const kbChars = topicFiles.length > 0 ? topicFiles.length * 800 : 0; // rough estimate per KB file
      const histChars = conversationHistory.reduce((s, m) => s + m.content.length, 0);
      const userChars = sanitizedMessage.length;
      const totalInputChars = basePromptChars + kbChars + histChars + userChars;
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      // Distribute prompt tokens proportionally by character count
      if (totalInputChars > 0 && promptTokens > 0) {
        const ratio = promptTokens / totalInputChars;
        tokenBreakdown = {
          systemPrompt: Math.round(basePromptChars * ratio),
          kbContext: Math.round(kbChars * ratio),
          conversationHistory: Math.round(histChars * ratio),
          userMessage: Math.round(userChars * ratio),
          aiResponse: completionTokens
        };
      }
    }

    res.json({
      message: finalMessage,
      intent: intentResult.category,
      source: intentResult.source,
      action: routedAction,
      routedAction: routedAction,
      confidence: intentResult.confidence,
      model: llmModel,
      responseTime: responseTime,
      matchedKeyword: intentResult.matchedKeyword,
      matchedExample: intentResult.matchedExample,
      detectedLanguage: intentResult.detectedLanguage,
      kbFiles: topicFiles.length > 0 ? ['AGENTS.md', 'soul.md', 'memory.md', ...topicFiles] : [],
      messageType: messageType,
      problemOverride: problemOverride,
      sentiment: sentimentScore,
      editMeta: editMeta,
      usage: usage,
      tokenBreakdown: tokenBreakdown,
      contextCount: conversationHistory.length
    });
  } catch (err: any) {
    // Log the error for debugging
    console.error('[Preview Chat] Error processing message:', err);

    // Always return a safe, valid response instead of a 500 error
    // This prevents "fetch failed" errors from breaking the UI
    res.json({
      message: "I apologize, but I encountered an error processing your message. This might be due to unusual input or a temporary issue. Please try rephrasing your question or contact staff if you need immediate assistance.",
      intent: 'unknown',
      source: 'error',
      action: 'static_reply',
      routedAction: 'static_reply',
      confidence: 0,
      model: 'none',
      responseTime: Date.now() - (Date.now() - 100), // Approximate time
      matchedKeyword: '',
      matchedExample: '',
      detectedLanguage: 'en',
      kbFiles: [],
      messageType: 'info',
      problemOverride: false,
      sentiment: null,
      editMeta: null,
      error: err.message, // Include error for debugging
      errorHandled: true
    });
  }
});

export default router;
