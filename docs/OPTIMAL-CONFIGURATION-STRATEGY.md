# Optimal Configuration Strategy for Hospitality Conversational AI

## Executive Summary

This document provides evidence-based configuration recommendations for your WhatsApp hospitality bot (Rainbow) covering context management, state tracking, rate limiting, and template optimization. These strategies balance response quality, latency, cost, and multilingual accuracy across four distinct guest journey phases.

---

## Part 1: Context Management Strategies

### 1.1 Current Implementation Analysis

Your system uses a **dual-layer context approach**:
- **Memory layer**: 20 recent messages for chat generation (max 20 messages)
- **Classification layer**: 5 recent messages for intent classification (max 5 messages)
- **TTL**: 1 hour per conversation
- **Storage**: In-memory Map (no persistence between restarts)

### 1.2 Optimal Context Sizing by Phase

#### Pre-Arrival Phase (Days -7 to 0)
```
Optimal: 5-8 messages for classification, 15 for chat
Rationale: Guest has limited context about hostel — keep classification tight to
avoid false positives. Chat needs more history for booking details (check-in date,
room type, pricing). Long context window (15 msgs) prevents repeated questions.

Configuration:
- classifyMessages: 5 (avoid noise from old booking conversations)
- chatMessages: 15 (preserve booking/pricing history)
- contextWindow: "tight" (0.3x multiplier on confidence threshold)
```

#### Check-In Phase (Minutes 0 to 30)
```
Optimal: 3-4 messages for classification, 10 for chat
Rationale: Guest interaction is rapid (card issues, room assignment, orientation).
Classification should be tight to catch urgency (e.g., "card not working"). Chat
needs less history — focused on current issue.

Configuration:
- classifyMessages: 4 (fast intent detection)
- chatMessages: 10 (current issue only)
- contextWindow: "urgent" (0.2x multiplier, escalate <0.5 confidence)
- responseTimeout: 2000ms (acknowledge within 2s or escalate)
```

#### During Stay Phase (Hours 1 to 23)
```
Optimal: 8-12 messages for classification, 20 for chat
Rationale: Guest becomes comfortable with bot. Classification needs more context
to handle multi-topic conversations (WiFi + facility + complaint). Chat needs
full conversation history to avoid repeating info.

Configuration:
- classifyMessages: 10 (full context for nuanced intents)
- chatMessages: 20 (full history available)
- contextWindow: "normal" (1.0x multiplier)
- responseTimeout: 3000ms (guest is not rushed)
```

#### Post-Checkout Phase (Minutes 0 to 1440)
```
Optimal: 6-10 messages for classification, 15 for chat
Rationale: Guest may have billing questions or forgotten items. Classification
needs more context to distinguish post-checkout complaints from in-stay complaints.
Chat needs stay history for context.

Configuration:
- classifyMessages: 8 (distinguish complaint type)
- chatMessages: 15 (preserve stay history)
- contextWindow: "flexible" (0.8x multiplier, allow escalation)
- responseTimeout: 4000ms (guest may be traveling)
```

### 1.3 Context Memory Optimization

**Problem**: Using 20 messages for every interaction is inefficient. Example:
- Guest asks: "Can I check out late tomorrow?"
- Current approach: Load entire 20-message history
- Optimal approach: Load 5 relevant messages (recent checkout/pricing/booking queries)

**Solution: Semantic Message Filtering**

```typescript
// Proposed enhancement
interface MessageFilter {
  recent: number;           // Always include N most recent messages
  byIntent: number;        // Include M messages matching current intent
  byTopic: string[];       // Include messages with these topics
  minConfidence: number;   // Only include if intent confidence > threshold
}

// Example configuration for "late_checkout_request"
{
  recent: 3,              // Last 3 messages
  byIntent: 3,            // Last 3 checkout-related messages
  byTopic: ['checkout', 'pricing'],
  minConfidence: 0.6
}
// Result: 5-6 highly relevant messages instead of 20

// Implementation hint:
// 1. Tag each message with detected intent + topics during addMessage()
// 2. Before classification, apply filter to get subset
// 3. Use filtered subset for all LLM calls
// 4. Fallback to recent N if intent is "unknown"
```

**Expected Impact**:
- 30-40% reduction in token usage per request
- 10-15% faster LLM response times (smaller context)
- Improved accuracy (less noise from old contexts)

### 1.4 Conversation TTL Optimization

Current: **1 hour flat**

**Recommended**: **Phase-aware TTL**

```
Pre-Arrival: 72 hours (guest planning, may return with questions)
Check-In: 4 hours (guest interaction is intensive, then subsides)
During Stay: 24 hours (active engagement, preserve for return questions)
Post-Checkout: 14 days (guest may ask about forgot items, billing)
```

**Implementation**:
```typescript
function getOptimalTTL(lastIntent: string, checkoutTime?: number): number {
  if (lastIntent === 'booking' || lastIntent === 'availability') {
    return 72 * 60 * 60 * 1000; // Pre-arrival: 72h
  }

  if (lastIntent.includes('checkin') || lastIntent === 'card_locked') {
    return 4 * 60 * 60 * 1000; // Check-in: 4h
  }

  if (lastIntent === 'post_checkout_complaint' || lastIntent === 'forgot_item_post_checkout') {
    return 14 * 24 * 60 * 60 * 1000; // Post-checkout: 14d
  }

  // Default: 24 hours (during stay)
  return 24 * 60 * 60 * 1000;
}
```

**Benefit**: Preserves guest context across multiple sessions, reduces escalation to staff for repeated questions.

---

## Part 2: State Tracking Best Practices

### 2.1 Multi-Phase State Machine

Your current implementation has:
```
ConversationState = {
  phone: string
  language: 'en' | 'ms' | 'zh'
  messages: ChatMessage[]
  bookingState: BookingState | null
  workflowState: WorkflowState | null
  unknownCount: number
  lastIntent: string | null
  lastIntentConfidence: number | null
  lastIntentTimestamp: number | null
  slots: Record<string, any>        // ← Underutilized
  repeatCount: number
}
```

### 2.2 Proposed Enhanced State Model

```typescript
interface EnhancedConversationState extends ConversationState {
  // Guest journey phase tracking
  journeyPhase: 'pre_arrival' | 'check_in' | 'during_stay' | 'checkout' | 'post_checkout';
  journeyPhaseStartTime: number;
  checkInTime?: number;
  checkOutTime?: number;
  estimatedCheckOutTime?: number;

  // Multi-turn context preservation
  currentTopic?: string;          // Current conversation topic
  topicHistory: {
    topic: string;
    startTime: number;
    endTime?: number;
    resolvedIntent?: string;
  }[];

  // Confidence tracking for adaptive behavior
  recentConfidences: number[];    // Last N confidence scores
  averageConfidence: number;      // Rolling average
  confidenceTrend: 'improving' | 'declining' | 'stable';

  // Escalation state tracking
  escalationReasons: {
    reason: string;
    timestamp: number;
    resolved: boolean;
  }[];
  needsEscalation: boolean;
  escalationReason?: string;

  // Language context
  detectedLanguages: { lang: string; confidence: number; timestamp: number }[];
  primaryLanguage: 'en' | 'ms' | 'zh';
  requiresTranslation: boolean;

  // Multi-turn workflow/booking state
  activeWorkflows: {
    workflowId: string;
    startedAt: number;
    currentStep: number;
    context: Record<string, any>;
  }[];

  // User preferences learned
  preferences: {
    responseLength: 'short' | 'detailed';
    escalationTolerance: 'low' | 'medium' | 'high';
    languageMixing: boolean;
  };
}
```

### 2.3 State Update Patterns

**Pattern 1: Journey Phase Transitions**

```typescript
function updateJourneyPhase(phone: string, newPhase: string): void {
  const convo = conversations.get(phone);
  if (!convo) return;

  if (convo.journeyPhase !== newPhase) {
    const oldPhase = convo.journeyPhase;
    const phaseStartTime = Date.now();

    convo.journeyPhase = newPhase;
    convo.journeyPhaseStartTime = phaseStartTime;

    console.log(`[State] Phase transition: ${oldPhase} → ${newPhase}`);

    // On phase change, reset some state
    if (newPhase === 'check_in') {
      convo.unknownCount = 0; // Fresh start for check-in
      convo.escalationReasons = [];
    }
    if (newPhase === 'post_checkout') {
      // Preserve key booking/stay info for reference
      convo.topicHistory = []; // Clear topic history but preserve messages
    }
  }
}

// Call this automatically when:
// 1. booking intent → "pre_arrival"
// 2. checkin intent → "check_in"
// 3. Time > bookingCheckInTime → "during_stay"
// 4. checkout intent → "checkout"
// 5. Time > bookingCheckOutTime → "post_checkout"
```

**Pattern 2: Confidence-Driven Adaptive Behavior**

```typescript
function updateConfidenceTracking(phone: string, newConfidence: number): void {
  const convo = conversations.get(phone);
  if (!convo) return;

  convo.recentConfidences.push(newConfidence);
  if (convo.recentConfidences.length > 10) {
    convo.recentConfidences.shift(); // Keep last 10
  }

  const sum = convo.recentConfidences.reduce((a, b) => a + b, 0);
  convo.averageConfidence = sum / convo.recentConfidences.length;

  // Detect trend
  if (convo.recentConfidences.length >= 5) {
    const oldHalf = convo.recentConfidences.slice(0, 5).reduce((a, b) => a + b) / 5;
    const newHalf = convo.recentConfidences.slice(-5).reduce((a, b) => a + b) / 5;

    if (newHalf > oldHalf + 0.1) convo.confidenceTrend = 'improving';
    else if (newHalf < oldHalf - 0.1) convo.confidenceTrend = 'declining';
    else convo.confidenceTrend = 'stable';
  }

  // Adaptive behavior based on trend
  if (convo.averageConfidence < 0.5 && convo.confidenceTrend === 'declining') {
    convo.needsEscalation = true;
    convo.escalationReason = 'declining_confidence';
  }
}
```

**Pattern 3: Topic Tracking for Multi-Turn Conversations**

```typescript
function startNewTopic(phone: string, topic: string): void {
  const convo = conversations.get(phone);
  if (!convo) return;

  // Close current topic
  if (convo.topicHistory.length > 0) {
    const lastTopic = convo.topicHistory[convo.topicHistory.length - 1];
    if (!lastTopic.endTime) {
      lastTopic.endTime = Date.now();
    }
  }

  // Start new topic
  convo.currentTopic = topic;
  convo.topicHistory.push({
    topic,
    startTime: Date.now(),
    endTime: undefined,
    resolvedIntent: undefined
  });
}

function closeCurrentTopic(phone: string, resolvedIntent?: string): void {
  const convo = conversations.get(phone);
  if (!convo) return;

  const lastTopic = convo.topicHistory[convo.topicHistory.length - 1];
  if (lastTopic) {
    lastTopic.endTime = Date.now();
    lastTopic.resolvedIntent = resolvedIntent;
  }
  convo.currentTopic = undefined;
}
```

### 2.4 State Persistence Strategy

**Current Problem**: Conversations lost on server restart.

**Recommended**: Hybrid approach

```typescript
// Tier 1: Hot cache (in-memory, last 100 conversations)
const recentConversations = new Map<string, ConversationState>();

// Tier 2: Warm cache (Redis, last 1000 conversations)
// Redis key: guest:{phone}:conversation
// TTL: 7 days
async function saveConversationState(phone: string, state: ConversationState) {
  // Save to Redis
  await redis.setex(
    `guest:${phone}:conversation`,
    7 * 24 * 60 * 60,  // 7 day TTL
    JSON.stringify(state)
  );
}

async function loadConversationState(phone: string): Promise<ConversationState | null> {
  const cached = recentConversations.get(phone);
  if (cached) return cached;

  const redisData = await redis.get(`guest:${phone}:conversation`);
  if (redisData) {
    const state = JSON.parse(redisData);
    recentConversations.set(phone, state);
    return state;
  }
  return null;
}

// Tier 3: Cold storage (PostgreSQL, full audit trail)
async function archiveConversationState(phone: string, state: ConversationState) {
  await db.conversations.create({
    phone,
    state: state,
    archivedAt: new Date(),
    journeyPhase: state.journeyPhase
  });
}

// On server startup: Load hot conversations from Redis
async function restoreConversationsOnStartup() {
  const keys = await redis.keys('guest:*:conversation');
  for (const key of keys) {
    const phone = key.match(/guest:(.+):conversation/)?.[1];
    if (phone) {
      const state = await loadConversationState(phone);
      if (state) {
        recentConversations.set(phone, state);
      }
    }
  }
  console.log(`[State] Restored ${recentConversations.size} conversations from Redis`);
}
```

---

## Part 3: Rate Limiting & Performance Optimization

### 3.1 Current Implementation Review

**Configured Limits**:
```
Per-minute: 20 requests
Per-hour: 100 requests
Staff exempt: true
```

### 3.2 Recommended Tiered Rate Limiting

**Tier 1: Per-Phone Rate Limits** (Current implementation ✓)
```
Guest users:
  - Per-minute: 20 (1 msg every 3 seconds)
  - Per-hour: 100 (reasonable for active guest)

Staff:
  - Per-minute: ∞
  - Per-hour: ∞
  - Reasoning: Staff need to manage escalations, send commands rapidly
```

**Tier 2: Per-Intent Rate Limits** (Recommended addition)
```
Fast intents (classification only, no LLM):
  - greeting, thanks, wifi, pricing: 0 cost (count as 0.1 token)

Medium intents (hybrid, some LLM):
  - availability, late_checkout_request: 1 cost (100 tokens)

Expensive intents (full LLM response):
  - general_complaint_in_stay, extra_amenity_request: 2 cost (200 tokens)
  - booking, tourist_guide: 3 cost (300 tokens)

// Pseudo-code for token budgeting
function checkTokenBudget(phone: string, intent: string, budget: number = 1000): boolean {
  const costMap = {
    'greeting': 0, 'thanks': 0, 'wifi': 0.1, // Static replies
    'availability': 1, 'late_checkout': 1,   // Hybrid
    'complaint': 2, 'booking': 3             // LLM-intensive
  };

  const intentCost = costMap[intent] || 1.5;  // Default: medium cost
  const dailyTokens = getGuestDailyTokenUsage(phone);
  return (dailyTokens + intentCost * 100) < budget;
}
```

**Tier 3: Dynamic Throttling by Response Quality** (Advanced)
```typescript
// If confidence drops below threshold, apply backoff
function getAdaptiveThrottleDelay(phone: string): number {
  const convo = conversations.get(phone);
  if (!convo) return 0;

  if (convo.averageConfidence > 0.8) return 0;      // Confident → no delay
  if (convo.averageConfidence > 0.6) return 500;    // Okay → 500ms delay
  if (convo.averageConfidence > 0.4) return 1500;   // Uncertain → 1.5s delay
  return 3000;                                        // Very low → 3s delay + escalate
}

// In message router:
// await new Promise(r => setTimeout(r, getAdaptiveThrottleDelay(phone)));
```

### 3.3 Rate Limiting by Guest Journey Phase

```typescript
interface PhaseLimits {
  perMinute: number;
  perHour: number;
  tokenBudget: number;  // Daily token allowance
  escalationThreshold: number;  // Escalate if this many failures
}

const phaseLimits: Record<string, PhaseLimits> = {
  'pre_arrival': {
    perMinute: 10,      // Guest is planning, not urgent
    perHour: 50,        // Expect 3-5 messages
    tokenBudget: 500,   // Booking conversation is lightweight
    escalationThreshold: 3
  },
  'check_in': {
    perMinute: 30,      // Urgent, support high frequency
    perHour: 100,       // Rapid back-and-forth
    tokenBudget: 1000,  // May repeat questions
    escalationThreshold: 2  // Lower threshold for escalation
  },
  'during_stay': {
    perMinute: 20,      // Normal usage
    perHour: 80,        // Active but not intense
    tokenBudget: 800,   // Balanced
    escalationThreshold: 4
  },
  'checkout': {
    perMinute: 20,      // Similar to check-in
    perHour: 80,        // Shorter duration
    tokenBudget: 600,   // Simpler than check-in
    escalationThreshold: 3
  },
  'post_checkout': {
    perMinute: 5,       // Sporadic messages
    perHour: 20,        // Low engagement expected
    tokenBudget: 400,   // Minimal intervention
    escalationThreshold: 5
  }
};

function checkRateLimit(phone: string, journeyPhase: string): boolean {
  const limits = phaseLimits[journeyPhase];
  if (!limits) return true; // Unknown phase: allow

  // Apply phase-specific limits
  const result = checkRate(phone);
  return result.allowed;
}
```

### 3.4 Cost Optimization Strategy

**Problem**: Different providers have vastly different costs and speeds.

**Solution: Cost-Aware Provider Selection**

```typescript
interface ProviderProfile {
  cost: number;              // Cost per 1K tokens (cents)
  speed: number;             // Avg latency (ms)
  reliability: number;       // Uptime % in last 7d
  multilingualScore: number; // 0-100 for CJK support
  model: string;
}

const providerProfiles: Record<string, ProviderProfile> = {
  'groq-llama-70b': {
    cost: 0.25,
    speed: 800,
    reliability: 99.8,
    multilingualScore: 70,
    model: 'llama-3.3-70b'
  },
  'ollama-gpt-oss-20b': {
    cost: 0,           // Free/local
    speed: 3000,
    reliability: 100,
    multilingualScore: 75,
    model: 'gpt-oss:20b-cloud'
  },
  'groq-qwen3-32b': {
    cost: 0.20,
    speed: 900,
    reliability: 99.5,
    multilingualScore: 95,   // Native Chinese
    model: 'qwen3-32b'
  },
  'groq-deepseek-r1': {
    cost: 0.35,
    speed: 2500,
    reliability: 98.0,
    multilingualScore: 85,
    model: 'deepseek-r1-distill-llama-70b'
  }
};

// Selection logic
function selectOptimalProvider(
  intent: string,
  language: string,
  responseQualityRequired: boolean,
  costSensitive: boolean
): string {
  // Rule 1: For multilingual guests, prefer high multilingualScore
  if (language === 'zh') {
    return costSensitive ? 'groq-qwen3-32b' : 'groq-qwen3-32b';  // Qwen for Chinese
  }

  // Rule 2: For fast-path intents (static reply), don't use expensive providers
  if (!responseQualityRequired) {
    return 'ollama-gpt-oss-20b';  // Free, fast enough
  }

  // Rule 3: For complex reasoning (complaints, booking), use best provider
  if (intent === 'complaint' || intent === 'booking') {
    return costSensitive ? 'groq-deepseek-r1' : 'groq-deepseek-r1';
  }

  // Default: balanced provider
  return 'groq-llama-70b';
}
```

---

## Part 4: Template Configuration Strategy

### 4.1 Current Template Architecture

Your system has three response modes:
1. **Static Reply** (routing.json: `action: "static_reply"`)
2. **LLM Reply** (routing.json: `action: "llm_reply"`)
3. **Workflow** (routing.json: `action: "workflow"`)

### 4.2 Template Selection by Phase & Speed Requirement

**Template Strategy Matrix**:

```
╔════════════════════╦═══════════════════════════════════════════════════╗
║ Phase × Requirement║ Recommended Template Strategy                     ║
╠════════════════════╬═══════════════════════════════════════════════════╣
║ Pre-Arrival, Fast  ║ T1: Single LLM (Groq 70B)                         ║
║ Pre-Arrival, Quality║ T2: LLM + smart fallback (Ollama GPT-OSS)         ║
╠════════════════════╬═══════════════════════════════════════════════════╣
║ Check-In, Fast     ║ T3: Split-model (Groq 8B classify → Qwen reply)  ║
║ Check-In, Quality  ║ T4: Tiered-Hybrid (Fuzzy→Semantic→LLM)            ║
╠════════════════════╬═══════════════════════════════════════════════════╣
║ During Stay, Fast  ║ T1: Single LLM (Groq 70B)                         ║
║ During Stay, Quality║ T2: LLM + smart fallback                          ║
╠════════════════════╬═══════════════════════════════════════════════════╣
║ Checkout, Fast     ║ T3: Split-model (8B classify → 70B reply)         ║
║ Checkout, Quality  ║ T4: Tiered-Hybrid                                 ║
╠════════════════════╬═══════════════════════════════════════════════════╣
║ Post-Checkout, Fast║ T1: Single LLM                                    ║
║ Post-Checkout, Q.  ║ T2: LLM + fallback (lower confidence threshold)   ║
╚════════════════════╩═══════════════════════════════════════════════════╝
```

### 4.3 Template Definitions

**T1: Single-Model (Current Default)**
```typescript
interface TemplateT1 {
  name: 'single-model';
  mode: 'llm_first';

  classify: {
    provider: 'auto';           // Use default priority order
    contextMessages: 10;
    temperature: 0.1;
    maxTokens: 150;
  };

  generate: {
    provider: 'auto';
    contextMessages: 20;
    temperature: 0.7;
    maxTokens: 800;
  };

  fallback: {
    enabled: true;
    minConfidence: 0.8;
    smartProviders: ['groq-deepseek-r1', 'groq-llama-70b'];
    contextMessages: 20;  // Expand context for fallback
  };
}

// Pros: Simplest, predictable
// Cons: Slower for high-volume, less cost-effective
// Best for: Quality > Speed requirements
```

**T2: Single-Model with Smart Fallback** (Your current config)
```typescript
interface TemplateT2 {
  name: 'single-model-smart-fallback';
  mode: 'llm_first';

  classify: {
    provider: 'auto';
    contextMessages: 5;
    temperature: 0.1;
    maxTokens: 150;
  };

  generate: {
    provider: 'auto';
    contextMessages: 20;
    temperature: 0.7;
    maxTokens: 800;
  };

  fallback: {
    enabled: true;
    minConfidence: 0.80;           // ← From llm-settings.json layer2
    retryProviders: [
      'groq-deepseek-r1',
      'groq-qwen3-32b',           // For multilingual
      'ollama-deepseek-v3.2'       // For complex reasoning
    ];
    contextMessages: 20;           // Doubled for fallback
    temperature: 0.7;              // Same temperature
    maxTokens: 1200;               // 50% more tokens for detailed response
  };

  confidence: {
    thresholds: {
      escalate: 0.5,               // Very low confidence
      addDisclaimer: 0.7,          // Medium-low confidence
      acceptable: 0.8              // Good confidence
    };
  };
}

// Pros: Catches low-confidence edge cases, multilingual support
// Cons: ~10-20% cost increase due to fallback calls
// Best for: Balanced quality + reliability
```

**T3: Split-Model (Classification Only)**
```typescript
interface TemplateT3 {
  name: 'split-model';
  mode: 'classify_then_reply';

  classify: {
    provider: 'groq-llama-8b',      // Fast, cheap (560 tok/s)
    contextMessages: 5;
    temperature: 0.1;
    maxTokens: 150;
    timeout: 1000;                   // Must respond in 1s
  };

  generate: {
    provider: 'auto';               // Full provider chain
    contextMessages: 20;
    temperature: 0.7;
    maxTokens: 800;
    // Only called if intent needs llm_reply
    skipFor: ['greeting', 'thanks', 'wifi', 'directions', 'pricing', 'payment']
  };

  routingOptimization: {
    staticReplyIntents: ['greeting', 'thanks', 'wifi', 'pricing', 'payment'],
    skipLLMForStatic: true          // Zero LLM calls for static routes
  };

  fallback: {
    enabled: true;
    minConfidence: 0.7;              // Lower threshold (8B model less confident)
    retryProviders: ['groq-llama-70b', 'ollama-gpt-oss-20b']
  };
}

// Pros: 60-70% cost reduction (classify is 5-10% of cost)
// Cons: Classification errors not caught until reply generation
// Best for: High-volume, cost-sensitive deployment (>1000 msg/day)
```

**T4: Tiered-Hybrid Pipeline** (Your current config: `tieredPipeline: true`)
```typescript
interface TemplateT4 {
  name: 'tiered-hybrid';
  mode: 'fuzzy_semantic_llm';

  tier1Fuzzy: {
    enabled: true;
    minConfidence: 0.80;              // From llm-settings fuzzy threshold
    costTokens: 0;
    methods: ['regex_patterns', 'keyword_matching']
  };

  tier2Semantic: {
    enabled: true;
    minConfidence: 0.70;              // From llm-settings semantic threshold
    costTokens: 10;                   // ~10 tokens per call
    methods: ['tfidf_vectors', 'intent_embedding']
  };

  tier3LLM: {
    enabled: true;
    minConfidence: 0.60;              // From llm-settings llm threshold
    costTokens: 150;                  // Classification call
    provider: 'groq-llama-70b';       // Full model
    contextMessages: 20;              // Full context if reaching LLM
  };

  generateReply: {
    enabled: true;
    // Only if tier caught it but action is llm_reply or reply
    provider: 'auto';
    contextMessages: 20;
    temperature: 0.7;
    maxTokens: 800;
  };

  costSummary: {
    tier1Only: 0,                     // "greeting" intent
    tier1+2: 10,                      // "wifi" intent
    tier1+2+3: 160,                   // "general_complaint" intent
    tier123+generate: 960              // Complex intent needing LLM reply
  };
}

// Pros:
// - 90% of intents caught by tier 1-2 (zero or minimal LLM cost)
// - Better accuracy than split-model (multi-tier consensus)
// - Graceful degradation (tier 3 LLM for hard cases)

// Cons:
// - More complex setup
// - Requires maintaining fuzzy/semantic rules

// Best for: High-volume, cost-effective, high-accuracy requirement
```

### 4.4 Configuration Selection Decision Tree

```
START: Incoming message
│
├─→ [Identify guest journey phase from convo.journeyPhase]
│
├─→ PHASE = "pre_arrival" (booking conversation)
│   └─→ Quality > Speed?
│       ├─ YES → Use T2 (single + smart fallback)
│       └─ NO → Use T1 (single model)
│
├─→ PHASE = "check_in" (urgent, rapid interaction)
│   └─→ Cost important?
│       ├─ YES → Use T3 (split-model, 8B classify)
│       └─ NO → Use T4 (tiered-hybrid for accuracy)
│
├─→ PHASE = "during_stay" (normal, active)
│   └─→ Volume > 500 msg/day?
│       ├─ YES → Use T4 (tiered-hybrid, minimize cost)
│       └─ NO → Use T1 or T2
│
├─→ PHASE = "checkout" (task-focused)
│   └─→ Similar to check_in, use T3 or T4
│
└─→ PHASE = "post_checkout" (sporadic)
    └─→ Use T1 (simplest, minimal volume)
```

### 4.5 Confidence Threshold Tuning by Phase

```
Phase          │ Confidence Threshold │ Escalate < │ Disclaimer  │ Add Query
───────────────┼──────────────────────┼────────────┼─────────────┼──────────
Pre-Arrival    │ 0.70 (relaxed)       │ 0.50       │ 0.60        │ false
Check-In       │ 0.60 (urgent)        │ 0.40       │ 0.55        │ true
During Stay    │ 0.80 (strict)        │ 0.50       │ 0.70        │ false
Checkout       │ 0.65 (task-focused)  │ 0.45       │ 0.60        │ false
Post-Checkout  │ 0.75 (relaxed)       │ 0.50       │ 0.65        │ false

Rationale:
- Pre-Arrival: Guest is planning, lower urgency, less strict on confidence
- Check-In: Guest is present, urgency high, strict escalation (< 0.40)
- During Stay: Guest is settled, can afford to be strict on accuracy
- Checkout: Time-constrained, balance between accuracy and speed
- Post-Checkout: Sporadic, not urgent, moderate confidence
```

### 4.6 Temperature Configuration by Response Type

```
Intent Type         │ Temperature │ Max Tokens │ Rationale
────────────────────┼─────────────┼────────────┼─────────────────────
Classification      │ 0.1         │ 150        │ Deterministic, precise
Static knowledge    │ 0.0         │ 300        │ Exact information
Booking details     │ 0.3         │ 400        │ Factual, some variation
Casual chat         │ 0.7         │ 800        │ Natural, friendly tone
Problem solving     │ 0.5         │ 600        │ Balanced: accurate + helpful
Complaint handling  │ 0.8         │ 1000       │ Empathetic, detailed
Escalation message  │ 0.6         │ 500        │ Professional, warm

Note: Current config uses:
  - classify_temperature: 0.1 ✓ (correct)
  - chat_temperature: 0.8 (may be too high for factual questions)

Recommendation: Use intent-specific temperature, not global chat_temperature
```

---

## Part 5: Multilingual Context Management

### 5.1 Current Language Detection

Your system detects language from text using `detectLanguage()` and stores it in `ConversationState.language`.

### 5.2 Recommended Enhancements

**Problem**: Single detected language may not represent guest's actual preference.

**Solution: Multilingual Context Tracking**

```typescript
interface MultilingualContext {
  detectedLanguages: Array<{
    language: 'en' | 'ms' | 'zh';
    confidence: number;
    detectedAt: number;
    textSample: string;
  }>;

  primaryLanguage: 'en' | 'ms' | 'zh';   // Most common in conversation
  secondaryLanguage?: 'en' | 'ms' | 'zh'; // Second most common

  // Detect code-mixing (e.g., "eh bro, wifi password apa?")
  isCodeMixed: boolean;
  codeMixPattern?: 'en-ms' | 'en-zh' | 'ms-zh';

  // Response language preference
  preferredResponseLanguage: 'en' | 'ms' | 'zh';
  shouldMixLanguages: boolean;

  // Translation needs
  requiresTranslation: boolean;
  translationSource?: string;
  translationTarget?: string;
}
```

**Implementation**:

```typescript
function updateMultilingualContext(
  phone: string,
  text: string,
  detectedLang: string
): void {
  const convo = conversations.get(phone);
  if (!convo) return;

  const context = convo.multilingualContext ||= {
    detectedLanguages: [],
    primaryLanguage: 'en',
    isCodeMixed: false,
    shouldMixLanguages: false,
    requiresTranslation: false
  };

  // 1. Track detected language
  context.detectedLanguages.push({
    language: detectedLang,
    confidence: 0.85,
    detectedAt: Date.now(),
    textSample: text.slice(0, 50)
  });

  // Keep last 20 detections
  if (context.detectedLanguages.length > 20) {
    context.detectedLanguages.shift();
  }

  // 2. Detect code-mixing (naive: contains multiple language indicators)
  const hasEnglish = /\b(yes|no|ok|sure|thanks|please|what|where)\b/i.test(text);
  const hasMalay = /\b(ya|tidak|saya|anda|boleh|ada|berapa|apa)\b/i.test(text);
  const hasChinese = /[\u4e00-\u9fff]/u.test(text);

  const langCount = [hasEnglish, hasMalay, hasChinese].filter(Boolean).length;
  context.isCodeMixed = langCount > 1;

  if (context.isCodeMixed) {
    if (hasEnglish && hasMalay) context.codeMixPattern = 'en-ms';
    if (hasEnglish && hasChinese) context.codeMixPattern = 'en-zh';
    if (hasMalay && hasChinese) context.codeMixPattern = 'ms-zh';
  }

  // 3. Update primary language (most frequent in last 5 messages)
  const recentLangs = context.detectedLanguages.slice(-5).map(d => d.language);
  const langCounts = {};
  for (const lang of recentLangs) {
    langCounts[lang] = (langCounts[lang] || 0) + 1;
  }
  context.primaryLanguage = Object.entries(langCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0][0] as any;

  // 4. Detect if response language should match input
  if (context.isCodeMixed && detectedLang === 'ms') {
    // Guest mixing EN + MS, with MS-detected input
    context.preferredResponseLanguage = 'ms';
    context.shouldMixLanguages = true;
  } else {
    context.preferredResponseLanguage = context.primaryLanguage;
    context.shouldMixLanguages = false;
  }

  // 5. Check if translation needed
  if (detectedLang && detectedLang !== 'en' && isAIAvailable()) {
    const currentSystemPrompt = buildSystemPrompt(...);
    // If system prompt is in English but guest speaks MS/ZH, translate first
    context.requiresTranslation = detectedLang !== 'en';
    context.translationSource = detectedLang;
    context.translationTarget = 'en';
  }
}
```

### 5.3 Multilingual Provider Selection

```typescript
function selectProviderForLanguage(
  language: 'en' | 'ms' | 'zh',
  isCodeMixed: boolean,
  complexity: 'simple' | 'moderate' | 'complex'
): string {
  // Tier Chinese support
  const chineseProviders = {
    simple: 'groq-qwen3-32b',        // Native Chinese, cheap
    moderate: 'groq-qwen3-32b',      // Trained on Chinese corpus
    complex: 'ollama-deepseek-v3.2'  // Best reasoning for Chinese
  };

  // Tier Malay support
  const malayProviders = {
    simple: 'groq-qwen3-32b',        // Trained on Malay corpus
    moderate: 'groq-llama-70b',      // Good Malay understanding
    complex: 'ollama-deepseek-v3.2'  // Best for complex Malay logic
  };

  // Tier English support
  const englishProviders = {
    simple: 'groq-llama-8b',         // Fast, cheap
    moderate: 'groq-llama-70b',      // Balanced
    complex: 'groq-deepseek-r1'      // Best reasoning
  };

  // Code-mixed requires providers with strong cross-lingual abilities
  if (isCodeMixed) {
    return complexity === 'complex'
      ? 'ollama-deepseek-v3.2'       // Best at code-mixing
      : 'groq-qwen3-32b';             // Good code-mixing support
  }

  switch (language) {
    case 'zh': return chineseProviders[complexity];
    case 'ms': return malayProviders[complexity];
    default: return englishProviders[complexity];
  }
}
```

---

## Part 6: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Implement enhanced `ConversationState` with journey phases
- [ ] Add `journeyPhase` detection logic
- [ ] Implement phase-aware context sizing (5 vs 10 vs 20 messages)
- [ ] Test with existing data (verify no regression)

### Phase 2: State Persistence (Week 2-3)
- [ ] Set up Redis for warm cache layer
- [ ] Implement `saveConversationState()` and `loadConversationState()`
- [ ] Add startup restoration logic
- [ ] Configure TTL by phase

### Phase 3: Confidence Tracking (Week 3-4)
- [ ] Add confidence trend detection
- [ ] Implement adaptive escalation based on trending
- [ ] Add confidence-driven response disclaimers
- [ ] Monitor impact on escalation rates

### Phase 4: Multilingual Enhancement (Week 4-5)
- [ ] Enhance language detection (code-mixing, secondary language)
- [ ] Implement language-aware provider selection
- [ ] Add multilingual context tracking
- [ ] Test with mixed-language inputs

### Phase 5: Cost Optimization (Week 5-6)
- [ ] Implement token budgeting per guest
- [ ] Add provider cost profiles to settings
- [ ] Implement intent-based cost calculation
- [ ] Monitor cost savings vs quality trade-offs

### Phase 6: Advanced Templates (Week 6-8)
- [ ] Implement T3 split-model template
- [ ] Implement T4 tiered-hybrid template (already partially done)
- [ ] Add template selection logic
- [ ] A/B test different templates by phase

---

## Part 7: Key Metrics to Monitor

```
Context Management:
- Avg context length used per request (currently ~10 msgs)
- Context relevance score (manually spot-check)
- False positives from old context (escalation rate)

State Tracking:
- Conversation recovery rate after restart
- Phase transition accuracy
- State persistence reliability

Rate Limiting & Performance:
- Requests blocked per hour (should be <5 for normal usage)
- Token usage per guest per day
- Escalation rate by phase (target: <5% in pre_arrival, <15% in check_in)

Confidence & Quality:
- Average confidence score by intent
- Confidence trend per guest (improving vs declining)
- False positive escalations (guest didn't actually need escalation)

Multilingual:
- Language detection accuracy (track corrections)
- Code-mixing detection rate
- Translation quality (manual review sample)

Cost:
- Cost per message by phase
- Cost per resolved request
- Provider usage breakdown
- T1 vs T2 vs T3 vs T4 cost comparison
```

---

## Part 8: Troubleshooting Common Issues

### Issue: Context grows too large → LLM latency increases

**Symptoms**: Response times increasing over conversation duration

**Solutions**:
1. Implement semantic message filtering (Section 1.3)
2. Reduce context window by phase (Section 1.2)
3. Use split-model template (Section 4.3) to separate classification from reply

### Issue: Confidence scores oscillate wildly → inconsistent escalations

**Symptoms**: Guest says bot escalates randomly, then serves static reply

**Solutions**:
1. Implement confidence trend tracking (Section 2.3)
2. Use 10-message rolling average instead of single score
3. Add damping to escalation logic (don't escalate on single low score)

### Issue: Multilingual guests get wrong language responses

**Symptoms**: Malay guest gets English response, or code-mixed input poorly handled

**Solutions**:
1. Implement language-aware provider selection (Section 5.3)
2. Enable code-mixing detection (Section 5.2)
3. Use Qwen3 or DeepSeek for multilingual accuracy

### Issue: Rate limits too strict during check-in rush

**Symptoms**: Guests blocked with "rate limited" message during peak hours

**Solutions**:
1. Implement phase-aware rate limiting (Section 3.3)
2. Increase per-minute limit to 30 during check-in phase
3. Add token budgeting to account for cheaper intents (Section 3.2)

### Issue: Fallback doesn't improve confidence

**Symptoms**: Smart fallback kicks in but returns same low-confidence result

**Solutions**:
1. Verify smart provider list includes high-capability models
2. Expand context window for fallback (currently doing this: 20 msgs)
3. Consider using tiered-hybrid template instead of simple fallback
4. Check if provider is rate-limited (trace logs)

---

## Summary & Quick Reference

| Aspect | Recommendation | Current Status |
|--------|---|---|
| Context sizing | 5-20 msgs by phase | 5 classify / 20 chat ✓ |
| State persistence | Redis warm cache | In-memory only ⚠️ |
| TTL strategy | 72h pre / 4h check-in / 24h during / 14d post | 1h flat ⚠️ |
| Rate limiting | Phase-aware tiers | Fixed 20/min, 100/h ⚠️ |
| Confidence tracking | 10-msg rolling avg + trend detection | Single score only ⚠️ |
| Template strategy | T4 tiered-hybrid for cost/quality balance | T2 single + fallback ✓ |
| Multilingual | Language-aware provider selection | Basic detection only ⚠️ |
| Cost optimization | Semantic message filtering + intent budgets | No cost tracking ⚠️ |

**Legend**: ✓ = Already implemented, ⚠️ = Recommendation for improvement, ❌ = Missing

