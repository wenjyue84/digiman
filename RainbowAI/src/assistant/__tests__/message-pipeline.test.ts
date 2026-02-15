/**
 * Integration test for the message processing pipeline.
 *
 * Tests the full flow: input validation → state handling → classification → response delivery.
 * External dependencies (AI, WhatsApp, DB) are mocked to test pipeline logic in isolation.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { IncomingMessage } from '../types.js';

// ─── Mock external dependencies before importing pipeline modules ────

// Mock AI client
vi.mock('../ai-client.js', () => ({
  isAIAvailable: vi.fn(() => true),
  classifyAndRespond: vi.fn(async () => ({
    intent: 'pricing',
    action: 'static_reply',
    response: 'Capsules start from RM45 per night.',
    confidence: 0.92,
    model: 'test-model',
    responseTime: 100,
  })),
  classifyOnly: vi.fn(async () => ({
    intent: 'pricing',
    confidence: 0.9,
    model: 'test-model',
    responseTime: 50,
  })),
  generateReplyOnly: vi.fn(async () => ({
    response: 'Capsules start from RM45 per night.',
    confidence: 0.92,
    model: 'test-model',
    responseTime: 80,
  })),
  classifyAndRespondWithSmartFallback: vi.fn(async () => ({
    intent: 'pricing',
    action: 'static_reply',
    response: 'Capsules start from RM45.',
    confidence: 0.95,
    model: 'fallback-model',
    responseTime: 200,
  })),
  translateText: vi.fn(async () => null),
}));

// Mock conversation logger (DB writes)
vi.mock('../conversation-logger.js', () => ({
  logMessage: vi.fn(async () => {}),
  logNonTextExchange: vi.fn(async () => {}),
}));

// Mock WhatsApp client
vi.mock('../../lib/baileys-client.js', () => ({
  sendWhatsAppTypingIndicator: vi.fn(async () => {}),
  getWhatsAppStatus: vi.fn(() => ({ state: 'open' })),
}));

// Mock activity tracker
vi.mock('../../lib/activity-tracker.js', () => ({
  trackMessageReceived: vi.fn(),
  trackRateLimited: vi.fn(),
  trackError: vi.fn(),
  trackIntentClassified: vi.fn(),
  trackEscalation: vi.fn(),
  trackWorkflowStarted: vi.fn(),
  trackBookingStarted: vi.fn(),
  trackResponseSent: vi.fn(),
  trackFeedback: vi.fn(),
  trackEmergency: vi.fn(),
}));

// Mock escalation
vi.mock('../escalation.js', () => ({
  escalateToStaff: vi.fn(async () => {}),
  handleStaffReply: vi.fn(),
  shouldEscalate: vi.fn(() => null),
}));

// Mock feedback
vi.mock('../feedback.js', () => ({
  isAwaitingFeedback: vi.fn(() => false),
  detectFeedbackResponse: vi.fn(() => null),
  buildFeedbackData: vi.fn(() => null),
  clearAwaitingFeedback: vi.fn(),
  shouldAskFeedback: vi.fn(() => false),
  setAwaitingFeedback: vi.fn(),
  getFeedbackPrompt: vi.fn(() => 'Was this helpful?'),
}));

// Mock intent tracker
vi.mock('../intent-tracker.js', () => ({
  trackIntentPrediction: vi.fn(async () => {}),
  markIntentCorrection: vi.fn(async () => {}),
  markIntentCorrect: vi.fn(async () => {}),
}));

// Mock sentiment tracker
vi.mock('../sentiment-tracker.js', () => ({
  analyzeSentiment: vi.fn(() => 'neutral'),
  trackSentiment: vi.fn(),
  isSentimentAnalysisEnabled: vi.fn(() => false),
  shouldEscalateOnSentiment: vi.fn(() => ({ shouldEscalate: false })),
  markSentimentEscalation: vi.fn(),
  resetSentimentTracking: vi.fn(),
}));

// Mock memory writer
vi.mock('../memory-writer.js', () => ({
  maybeWriteDiary: vi.fn(),
}));

// Mock approval queue
vi.mock('../approval-queue.js', () => ({
  addApproval: vi.fn(() => 'approval-123'),
}));

// Mock conversation summarizer
vi.mock('../conversation-summarizer.js', () => ({
  applyConversationSummarization: vi.fn(async (messages: any[]) => ({
    messages,
    wasSummarized: false,
    originalCount: messages.length,
    reducedCount: messages.length,
  })),
}));

// Mock problem detector
vi.mock('../problem-detector.js', () => ({
  detectMessageType: vi.fn(() => 'info'),
}));

// Mock admin notifier
vi.mock('../../lib/admin-notifier.js', () => ({
  notifyAdminConfigError: vi.fn(async () => {}),
}));

// Mock config store (factory must be self-contained — vi.mock is hoisted)
vi.mock('../config-store.js', () => ({
  configStore: {
    init: vi.fn(),
    on: vi.fn(),
    getSettings: vi.fn(() => ({
      staff: { phones: ['60127088789', '60167620815'] },
      system_prompt: 'You are Rainbow, a friendly AI assistant.',
      routing_mode: { tieredPipeline: false, splitModel: false },
      response_modes: { default_mode: 'autopilot' },
    })),
    getRouting: vi.fn(() => ({
      pricing: { action: 'static_reply' },
      greeting: { action: 'static_reply' },
      wifi: { action: 'static_reply' },
      complaint: { action: 'escalate' },
      booking: { action: 'start_booking' },
      unknown: { action: 'llm_reply' },
    })),
    getWorkflow: vi.fn(() => ({
      payment: { forward_to: '60127088789' },
    })),
    getWorkflows: vi.fn(() => ({
      workflows: [],
    })),
    getCorruptedFiles: vi.fn(() => []),
    getTimeSensitiveIntentSet: vi.fn(() => new Set()),
    emit: vi.fn(),
  },
}));

// Mock knowledge module
vi.mock('../knowledge.js', () => ({
  getStaticReply: vi.fn((intent: string, lang: string) => {
    const replies: Record<string, string> = {
      pricing: 'Capsules from RM45/night.',
      greeting: 'Hi! Welcome to Pelangi Capsule Hostel!',
      wifi: 'WiFi password: pelangi2024',
    };
    return replies[intent] || null;
  }),
  setDynamicKnowledge: vi.fn(),
  deleteDynamicKnowledge: vi.fn(() => true),
  listDynamicKnowledge: vi.fn(() => ['wifi', 'checkin']),
}));

// Mock knowledge base
vi.mock('../knowledge-base.js', () => ({
  buildSystemPrompt: vi.fn(() => 'System prompt'),
  getTimeContext: vi.fn(() => 'Current time: 10:00 AM'),
  guessTopicFiles: vi.fn(() => ['pricing.md']),
  initKnowledgeBase: vi.fn(),
}));

// Mock intents
vi.mock('../intents.js', () => ({
  getEmergencyIntent: vi.fn(() => null),
  classifyMessageWithContext: vi.fn(async () => ({
    category: 'pricing',
    confidence: 0.92,
    source: 'fuzzy',
    entities: {},
    detectedLanguage: 'en',
  })),
}));

// Mock conversation
vi.mock('../conversation.js', () => {
  const conversations = new Map<string, any>();
  return {
    getOrCreate: vi.fn((phone: string, pushName?: string) => {
      if (!conversations.has(phone)) {
        conversations.set(phone, {
          phone,
          pushName: pushName || 'Guest',
          messages: [],
          language: 'en',
          bookingState: null,
          workflowState: null,
          unknownCount: 0,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          lastIntent: null,
          lastIntentConfidence: null,
          lastIntentTimestamp: null,
          slots: {},
          repeatCount: 0,
        });
      }
      return conversations.get(phone);
    }),
    addMessage: vi.fn(),
    updateBookingState: vi.fn(),
    updateWorkflowState: vi.fn(),
    incrementUnknown: vi.fn(() => 1),
    resetUnknown: vi.fn(),
    updateLastIntent: vi.fn(),
    checkRepeatIntent: vi.fn(() => ({ isRepeat: false, count: 0 })),
    updateSlots: vi.fn(),
  };
});

// Mock formatter
vi.mock('../formatter.js', () => ({
  detectLanguage: vi.fn(() => 'en'),
  detectFullLanguage: vi.fn(() => null),
  getTemplate: vi.fn((key: string) => {
    const templates: Record<string, string> = {
      error: 'Sorry, something went wrong.',
      non_text: 'I can only read text messages.',
      rate_limited: 'Please slow down.',
      thinking: 'Let me think...',
      unavailable: 'AI is currently unavailable.',
    };
    return templates[key] || `[template:${key}]`;
  }),
}));

// Mock rate limiter
vi.mock('../rate-limiter.js', () => ({
  checkRate: vi.fn(() => ({ allowed: true })),
}));

// Mock booking
vi.mock('../booking.js', () => ({
  handleBookingStep: vi.fn(),
  createBookingState: vi.fn(),
}));

// Mock workflow executor
vi.mock('../workflow-executor.js', () => ({
  initWorkflowExecutor: vi.fn(),
  executeWorkflowStep: vi.fn(),
  createWorkflowState: vi.fn(),
  forwardWorkflowSummary: vi.fn(),
}));

// ─── Import pipeline modules after mocks are set up ────

import { validateAndPrepare } from '../pipeline/input-validator.js';
import { handleActiveStates } from '../pipeline/state-executor.js';
import { classifyAndRoute } from '../pipeline/intent-classifier.js';
import { processAndSend } from '../pipeline/response-processor.js';
import type { RouterContext } from '../pipeline/types.js';

// ─── Helpers ────

function createMessage(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    from: '60123456789',
    text: 'How much is a capsule per night?',
    pushName: 'Test Guest',
    messageId: 'msg-001',
    isGroup: false,
    timestamp: Math.floor(Date.now() / 1000),
    messageType: 'text',
    ...overrides,
  };
}

function createContext(): RouterContext {
  return {
    sendMessage: vi.fn(async () => {}),
    callAPI: vi.fn(async () => {}),
    jayLID: null,
  };
}

// ─── Tests ────

describe('Message Pipeline Integration', () => {
  let ctx: RouterContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createContext();
  });

  describe('Phase 1: Input Validation', () => {
    test('should reject group messages', async () => {
      const msg = createMessage({ isGroup: true });
      const result = await validateAndPrepare(msg, ctx);
      expect(result.continue).toBe(false);
      if (!result.continue) {
        expect(result.reason).toBe('group');
      }
    });

    test('should reject empty messages', async () => {
      const msg = createMessage({ text: '   ' });
      const result = await validateAndPrepare(msg, ctx);
      expect(result.continue).toBe(false);
      if (!result.continue) {
        expect(result.reason).toBe('empty');
      }
    });

    test('should reject non-text messages and send template', async () => {
      const msg = createMessage({ messageType: 'image', text: '' });
      const result = await validateAndPrepare(msg, ctx);
      expect(result.continue).toBe(false);
      if (!result.continue) {
        expect(result.reason).toBe('non_text');
      }
      expect(ctx.sendMessage).toHaveBeenCalled();
    });

    test('should accept valid text message and generate requestId', async () => {
      const msg = createMessage();
      const result = await validateAndPrepare(msg, ctx);
      expect(result.continue).toBe(true);
      if (result.continue) {
        expect(result.state.requestId).toBeDefined();
        expect(result.state.requestId).toHaveLength(8);
        expect(result.state.phone).toBe('60123456789');
        expect(result.state.text).toBe('How much is a capsule per night?');
        expect(result.state.response).toBeNull();
      }
    });

    test('should generate unique requestIds per message', async () => {
      const msg1 = createMessage({ from: '60111111111' });
      const msg2 = createMessage({ from: '60222222222' });
      const r1 = await validateAndPrepare(msg1, ctx);
      const r2 = await validateAndPrepare(msg2, ctx);
      if (r1.continue && r2.continue) {
        expect(r1.state.requestId).not.toBe(r2.state.requestId);
      }
    });
  });

  describe('Phase 2: Active State Handling', () => {
    test('should pass through when no active states', async () => {
      const msg = createMessage();
      const validation = await validateAndPrepare(msg, ctx);
      if (!validation.continue) throw new Error('Expected continue');

      const result = await handleActiveStates(validation.state, ctx);
      expect(result.handled).toBe(false);
    });
  });

  describe('Phase 3 + 4: Classification → Response', () => {
    test('should classify and send response for pricing inquiry', async () => {
      const msg = createMessage({ text: 'How much is a capsule per night?' });
      const validation = await validateAndPrepare(msg, ctx);
      if (!validation.continue) throw new Error('Expected continue');

      const state = validation.state;

      // Phase 2: No active states
      const stateResult = await handleActiveStates(state, ctx);
      expect(stateResult.handled).toBe(false);

      // Phase 3: Classification
      await classifyAndRoute(state, ctx);
      expect(state.devMetadata.source).toBeDefined();

      // Phase 4: Response delivery
      await processAndSend(state, ctx);

      // Verify response was sent
      expect(ctx.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    test('should handle errors without crashing', async () => {
      const msg = createMessage();
      const validation = await validateAndPrepare(msg, ctx);
      if (!validation.continue) throw new Error('Expected continue');

      // Simulate ctx.sendMessage throwing
      const failCtx = createContext();
      (failCtx.sendMessage as any).mockRejectedValue(new Error('Network error'));

      // processAndSend should not throw even if sendMessage fails
      const state = validation.state;
      state.response = 'Test response';
      state.devMetadata.routedAction = 'llm_reply';

      // This should throw (sendMessage fails) — but the caller (message-router) catches it
      await expect(processAndSend(state, failCtx)).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long messages', async () => {
      const longText = 'a'.repeat(5000);
      const msg = createMessage({ text: longText });
      const result = await validateAndPrepare(msg, ctx);
      expect(result.continue).toBe(true);
      if (result.continue) {
        expect(result.state.text).toBe(longText);
      }
    });

    test('should handle messages with special characters', async () => {
      const msg = createMessage({ text: '你好! How much? 🏨 <script>alert("xss")</script>' });
      const result = await validateAndPrepare(msg, ctx);
      expect(result.continue).toBe(true);
    });

    test('should handle staff commands', async () => {
      const msg = createMessage({
        from: '60127088789', // Jay's phone (staff)
        text: '!list',
      });
      const result = await validateAndPrepare(msg, ctx);
      expect(result.continue).toBe(false);
      if (!result.continue) {
        expect(result.reason).toBe('staff_command');
      }
    });
  });
});
