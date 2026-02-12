# Configuration Implementation Guide

Practical code examples for implementing the optimal configuration strategies outlined in `OPTIMAL-CONFIGURATION-STRATEGY.md`.

---

## 1. Context Sizing by Guest Journey Phase

### Step 1: Add phase detection to conversation state

```typescript
// File: mcp-server/src/assistant/conversation.ts

export function detectJourneyPhase(
  convo: ConversationState,
  messageText: string,
  currentIntent: string
): string {
  const now = Date.now();
  const existingPhase = convo.journeyPhase;

  // Phase 1: Pre-Arrival (detected from booking intent or time before check-in)
  if (currentIntent === 'booking' || currentIntent === 'availability' ||
      currentIntent === 'pricing' || currentIntent === 'checkin_info') {
    return 'pre_arrival';
  }

  // Phase 2: Check-In (detected from check_in_arrival intent or card issues)
  if (currentIntent === 'check_in_arrival' || currentIntent === 'card_locked' ||
      currentIntent === 'lower_deck_preference') {
    return 'check_in';
  }

  // Phase 3: During Stay (default if active, no checkout yet)
  if (currentIntent === 'wifi' || currentIntent === 'facility_orientation' ||
      currentIntent === 'climate_control_complaint' || currentIntent === 'noise_complaint' ||
      currentIntent === 'facility_malfunction' || currentIntent === 'extra_amenity_request') {
    return 'during_stay';
  }

  // Phase 4: Checkout (detected from checkout intents)
  if (currentIntent === 'checkout_info' || currentIntent === 'checkout_procedure' ||
      currentIntent === 'late_checkout_request' || currentIntent === 'luggage_storage') {
    return 'checkout';
  }

  // Phase 5: Post-Checkout (detected from post-checkout intents or time after check-out)
  if (currentIntent === 'post_checkout_complaint' || currentIntent === 'billing_inquiry' ||
      currentIntent === 'forgot_item_post_checkout' || currentIntent === 'billing_dispute' ||
      currentIntent === 'review_feedback') {
    return 'post_checkout';
  }

  // Default to existing phase if no match
  return existingPhase || 'during_stay';
}

export function updateConversationPhase(
  phone: string,
  intent: string,
  messageText: string
): void {
  const convo = conversations.get(phone);
  if (!convo) return;

  const newPhase = detectJourneyPhase(convo, messageText, intent);
  if (newPhase !== convo.journeyPhase) {
    const oldPhase = convo.journeyPhase;
    convo.journeyPhase = newPhase;
    convo.journeyPhaseStartTime = Date.now();

    console.log(`[Phase] ${phone}: ${oldPhase} → ${newPhase} (via intent: ${intent})`);

    // Reset state on phase transition
    if (newPhase === 'check_in') {
      convo.unknownCount = 0;
    }
  }
}
```

### Step 2: Implement phase-aware context selection

```typescript
// File: mcp-server/src/assistant/ai-client.ts

interface ContextSettings {
  classifyMessages: number;
  chatMessages: number;
  responseTimeout: number;
  confidenceThreshold: number;
}

const phaseContextSettings: Record<string, ContextSettings> = {
  'pre_arrival': {
    classifyMessages: 5,
    chatMessages: 15,
    responseTimeout: 3000,
    confidenceThreshold: 0.70
  },
  'check_in': {
    classifyMessages: 4,
    chatMessages: 10,
    responseTimeout: 2000,
    confidenceThreshold: 0.60
  },
  'during_stay': {
    classifyMessages: 10,
    chatMessages: 20,
    responseTimeout: 3000,
    confidenceThreshold: 0.80
  },
  'checkout': {
    classifyMessages: 8,
    chatMessages: 15,
    responseTimeout: 2500,
    confidenceThreshold: 0.65
  },
  'post_checkout': {
    classifyMessages: 8,
    chatMessages: 15,
    responseTimeout: 4000,
    confidenceThreshold: 0.75
  }
};

function getContextSettingsForPhase(phase: string): ContextSettings {
  return phaseContextSettings[phase] || phaseContextSettings['during_stay'];
}

// Update classifyIntent to use phase-aware context
export async function classifyIntentWithPhaseContext(
  text: string,
  history: ChatMessage[] = [],
  journeyPhase: string = 'during_stay'
): Promise<AIClassifyResult> {
  if (!isAIAvailable()) {
    return { category: 'unknown', confidence: 0, entities: {} };
  }

  const settings = getContextSettingsForPhase(journeyPhase);
  const systemPrompt = await getSystemPrompt();

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  // Use phase-specific message count
  const recentHistory = history.slice(-settings.classifyMessages);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: text });

  const aiCfg = getAISettings();
  const { content } = await chatWithFallback(
    messages,
    aiCfg.max_classify_tokens,
    aiCfg.classify_temperature,
    true
  );

  if (content) {
    try {
      const parsed = JSON.parse(content);
      return parseClassifyResult(parsed);
    } catch {
      console.error('[AI] Failed to parse classify result:', content);
    }
  }

  return { category: 'unknown', confidence: 0, entities: {} };
}

// Update chat to use phase-aware context
export async function chatWithPhaseContext(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
  journeyPhase: string = 'during_stay'
): Promise<string> {
  if (!isAIAvailable()) {
    throw new Error('AI not available');
  }

  const settings = getContextSettingsForPhase(journeyPhase);

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  const recentHistory = history.slice(-settings.chatMessages);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const chatCfg = getAISettings();
  const { content } = await chatWithFallback(
    messages,
    chatCfg.max_chat_tokens,
    chatCfg.chat_temperature
  );

  if (content) return content;
  throw new Error('AI temporarily unavailable');
}
```

### Step 3: Update message-router to use phase-aware context

```typescript
// File: mcp-server/src/assistant/message-router.ts

// In handleIncomingMessage(), after building the system prompt:

    // Detect and update journey phase
    updateConversationPhase(phone, result.intent, processText);
    const journeyPhase = convo.journeyPhase;
    const phaseSettings = phaseContextSettings[journeyPhase] || phaseContextSettings['during_stay'];

    // Use phase-aware context for LLM calls
    if (isTiered) {
      // ─── T5 TIERED-HYBRID: Fuzzy→Semantic→LLM pipeline ───
      const tierResult = await classifyMessageWithContext(
        processText,
        convo.messages.slice(0, -1),
        convo.lastIntent
      );
      // ... rest of tiered logic
    } else if (isSplitModel) {
      // ─── T4 SPLIT-MODEL: Fast 8B classify ───
      const classifyResult = await classifyOnly(
        processText,
        convo.messages.slice(-phaseSettings.classifyMessages),  // ← Use phase-aware
        routingMode?.classifyProvider
      );
      // ... rest of split-model logic
    } else {
      // ─── DEFAULT: Single LLM call ───
      const llmMessages = convo.messages.slice(-phaseSettings.chatMessages);  // ← Use phase-aware
      result = await classifyAndRespond(
        systemPrompt,
        llmMessages,
        processText
      );
      // ... rest of logic
    }

    console.log(
      `[Router] Phase: ${journeyPhase} | ` +
      `Context: ${phaseSettings.classifyMessages} classify, ${phaseSettings.chatMessages} chat | ` +
      `Timeout: ${phaseSettings.responseTimeout}ms`
    );
```

---

## 2. Confidence Tracking with Trend Detection

### Step 1: Enhanced conversation state

```typescript
// File: mcp-server/src/assistant/types.ts

export interface ConversationState {
  // ... existing fields ...

  // Confidence tracking
  recentConfidences: number[];      // Last N confidence scores
  averageConfidence: number;        // Rolling average
  confidenceTrend: 'improving' | 'declining' | 'stable';
  confidenceTrendStartedAt?: number;
}
```

### Step 2: Implement confidence tracking

```typescript
// File: mcp-server/src/assistant/conversation.ts

const CONFIDENCE_WINDOW = 10; // Track last 10 scores

export function updateConfidenceTracking(
  phone: string,
  newConfidence: number
): void {
  const convo = conversations.get(phone);
  if (!convo) return;

  // Initialize if needed
  if (!convo.recentConfidences) {
    convo.recentConfidences = [];
  }

  convo.recentConfidences.push(newConfidence);
  if (convo.recentConfidences.length > CONFIDENCE_WINDOW) {
    convo.recentConfidences.shift();
  }

  // Calculate rolling average
  const sum = convo.recentConfidences.reduce((a, b) => a + b, 0);
  convo.averageConfidence = sum / convo.recentConfidences.length;

  // Detect confidence trend
  if (convo.recentConfidences.length >= 5) {
    const oldHalf = convo.recentConfidences
      .slice(0, Math.floor(convo.recentConfidences.length / 2))
      .reduce((a, b) => a + b, 0) / Math.floor(convo.recentConfidences.length / 2);

    const newHalf = convo.recentConfidences
      .slice(Math.ceil(convo.recentConfidences.length / 2))
      .reduce((a, b) => a + b, 0) / Math.ceil(convo.recentConfidences.length / 2);

    const delta = newHalf - oldHalf;

    if (delta > 0.1) {
      convo.confidenceTrend = 'improving';
    } else if (delta < -0.1) {
      if (!convo.confidenceTrendStartedAt) {
        convo.confidenceTrendStartedAt = Date.now();
      }
      convo.confidenceTrend = 'declining';
    } else {
      convo.confidenceTrendStartedAt = undefined;
      convo.confidenceTrend = 'stable';
    }

    console.log(
      `[Confidence] ${phone}: avg=${convo.averageConfidence.toFixed(2)}, ` +
      `trend=${convo.confidenceTrend}, scores=[${convo.recentConfidences.map(c => c.toFixed(2)).join(', ')}]`
    );
  }
}

// Helper to check if should escalate based on trend
export function shouldEscalateOnTrend(phone: string): boolean {
  const convo = conversations.get(phone);
  if (!convo) return false;

  // Escalate if declining trend for > 2 minutes
  if (convo.confidenceTrend === 'declining' && convo.confidenceTrendStartedAt) {
    const declineDuration = Date.now() - convo.confidenceTrendStartedAt;
    if (declineDuration > 2 * 60 * 1000) {
      return true;
    }
  }

  // Escalate if very low average confidence
  if (convo.averageConfidence < 0.4) {
    return true;
  }

  return false;
}
```

### Step 3: Use confidence tracking in message router

```typescript
// File: mcp-server/src/assistant/message-router.ts

// After classification/response generation:

    updateConfidenceTracking(phone, result.confidence);

    if (shouldEscalateOnTrend(phone)) {
      console.log(
        `[Router] 🚨 Confidence trend declining for ${phone}, escalating to staff`
      );
      await escalateToStaff({
        phone,
        pushName: msg.pushName,
        reason: 'declining_confidence',
        recentMessages: convo.messages.map(m => `${m.role}: ${m.content}`),
        originalMessage: text,
        instanceId: msg.instanceId
      });
    }
```

---

## 3. Phase-Aware Rate Limiting

### Step 1: Enhanced rate limiter with phase awareness

```typescript
// File: mcp-server/src/assistant/rate-limiter.ts

interface PhaseLimits {
  perMinute: number;
  perHour: number;
  escalationThreshold: number;
}

const phaseLimits: Record<string, PhaseLimits> = {
  'pre_arrival': {
    perMinute: 10,
    perHour: 50,
    escalationThreshold: 3
  },
  'check_in': {
    perMinute: 30,      // Higher for urgent interactions
    perHour: 100,
    escalationThreshold: 2
  },
  'during_stay': {
    perMinute: 20,
    perHour: 80,
    escalationThreshold: 4
  },
  'checkout': {
    perMinute: 20,
    perHour: 80,
    escalationThreshold: 3
  },
  'post_checkout': {
    perMinute: 5,
    perHour: 20,
    escalationThreshold: 5
  }
};

export function checkRateWithPhase(
  phone: string,
  journeyPhase: string
): RateLimitResult {
  const normalized = phone.replace(/\D/g, '');

  // Staff are exempt
  if (staffPhones.has(normalized)) {
    return { allowed: true };
  }

  const limits = phaseLimits[journeyPhase] || phaseLimits['during_stay'];
  const now = Date.now();
  let entry = windows.get(normalized);

  if (!entry) {
    entry = { timestamps: [] };
    windows.set(normalized, entry);
  }

  // Remove timestamps older than 1 hour
  entry.timestamps = entry.timestamps.filter(t => now - t < HOUR_MS);

  // Check per-hour limit
  if (entry.timestamps.length >= limits.perHour) {
    const oldest = entry.timestamps[0];
    const retryAfter = Math.ceil((oldest + HOUR_MS - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: 'hourly limit exceeded'
    };
  }

  // Check per-minute limit (phase-aware)
  const recentMinute = entry.timestamps.filter(t => now - t < MINUTE_MS);
  if (recentMinute.length >= limits.perMinute) {
    const oldest = recentMinute[0];
    const retryAfter = Math.ceil((oldest + MINUTE_MS - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: 'per-minute limit exceeded'
    };
  }

  // Record this request
  entry.timestamps.push(now);
  return { allowed: true };
}
```

### Step 2: Use phase-aware rate limiting in router

```typescript
// File: mcp-server/src/assistant/message-router.ts

    // After detecting journey phase
    const rateResult = checkRateWithPhase(phone, convo.journeyPhase);
    if (!rateResult.allowed) {
      const lang = detectLanguage(text);
      const response = getTemplate('rate_limited', lang);
      if (rateResult.reason === 'per-minute limit exceeded') {
        await sendMessage(phone, response, msg.instanceId);
        console.log(
          `[RateLimiter] ${phone} exceeded ${convo.journeyPhase} phase limits: ${rateResult.reason}`
        );
      }
      return;
    }
```

---

## 4. Language-Aware Provider Selection

### Step 1: Enhanced language detection

```typescript
// File: mcp-server/src/assistant/formatter.ts

export interface LanguageContext {
  detectedLanguage: string;
  confidence: number;
  isCodeMixed: boolean;
  codeMixPattern?: string;
  primaryLanguage: string;
  secondaryLanguage?: string;
}

export function analyzeLanguageContext(text: string): LanguageContext {
  const englishIndicators = /\b(yes|no|ok|sure|thanks|please|what|where|hello|hi|bye)\b/i;
  const malayIndicators = /\b(ya|tidak|saya|anda|boleh|ada|berapa|apa|terima|kasih|selamat)\b/i;
  const chineseChars = /[\u4e00-\u9fff]/u;

  const hasEnglish = englishIndicators.test(text);
  const hasMalay = malayIndicators.test(text);
  const hasChinese = chineseChars.test(text);

  const langCount = [hasEnglish, hasMalay, hasChinese].filter(Boolean).length;
  const isCodeMixed = langCount > 1;

  let codeMixPattern: string | undefined;
  if (isCodeMixed) {
    if (hasEnglish && hasMalay) codeMixPattern = 'en-ms';
    if (hasEnglish && hasChinese) codeMixPattern = 'en-zh';
    if (hasMalay && hasChinese) codeMixPattern = 'ms-zh';
  }

  // Determine primary language
  let primaryLanguage = 'en';
  if (hasChinese) primaryLanguage = 'zh';
  else if (hasMalay && !hasEnglish) primaryLanguage = 'ms';

  return {
    detectedLanguage: primaryLanguage,
    confidence: isCodeMixed ? 0.6 : 0.85,
    isCodeMixed,
    codeMixPattern,
    primaryLanguage,
    secondaryLanguage: isCodeMixed ? (primaryLanguage === 'en' ? 'ms' : 'en') : undefined
  };
}
```

### Step 2: Language-aware provider selection

```typescript
// File: mcp-server/src/assistant/ai-client.ts

interface ProviderLanguageProfile {
  chinese: number;      // 0-100 support score
  malay: number;        // 0-100 support score
  english: number;      // 0-100 support score
  codeMixing: number;   // 0-100 for code-mixing
}

const providerLanguageProfiles: Record<string, ProviderLanguageProfile> = {
  'groq-llama-70b': {
    chinese: 75,
    malay: 70,
    english: 90,
    codeMixing: 70
  },
  'groq-qwen3-32b': {
    chinese: 95,        // Native Chinese, best for Chinese
    malay: 80,          // Trained on Malay corpus
    english: 85,
    codeMixing: 85      // Good at code-mixing
  },
  'groq-llama-8b': {
    chinese: 70,
    malay: 65,
    english: 88,
    codeMixing: 60
  },
  'ollama-gpt-oss-20b': {
    chinese: 80,
    malay: 75,
    english: 92,
    codeMixing: 75
  },
  'ollama-deepseek-v3.2': {
    chinese: 90,        // Excellent Chinese reasoning
    malay: 85,
    english: 92,
    codeMixing: 90      // Best at code-mixing
  }
};

function selectProviderByLanguage(
  language: 'en' | 'ms' | 'zh',
  isCodeMixed: boolean,
  responseQuality: 'fast' | 'balanced' | 'quality'
): string {
  // For code-mixing, always use high-capability model
  if (isCodeMixed) {
    return responseQuality === 'fast'
      ? 'groq-qwen3-32b'
      : 'ollama-deepseek-v3.2';
  }

  // Language-specific selection
  if (language === 'zh') {
    return responseQuality === 'fast'
      ? 'groq-qwen3-32b'
      : responseQuality === 'balanced'
        ? 'ollama-gpt-oss-20b'
        : 'ollama-deepseek-v3.2';
  }

  if (language === 'ms') {
    return responseQuality === 'fast'
      ? 'groq-qwen3-32b'
      : responseQuality === 'balanced'
        ? 'groq-llama-70b'
        : 'ollama-deepseek-v3.2';
  }

  // English
  return responseQuality === 'fast'
    ? 'groq-llama-8b'
    : responseQuality === 'balanced'
      ? 'groq-llama-70b'
      : 'ollama-deepseek-v3.2';
}
```

### Step 3: Use in message router

```typescript
// File: mcp-server/src/assistant/message-router.ts

    const langContext = analyzeLanguageContext(processText);
    const responseQuality = convo.journeyPhase === 'check_in' ? 'fast' : 'balanced';
    const preferredProviders = [
      selectProviderByLanguage(
        langContext.detectedLanguage as 'en' | 'ms' | 'zh',
        langContext.isCodeMixed,
        responseQuality
      )
    ];

    console.log(
      `[Router] Language context: ${langContext.primaryLanguage} ` +
      `${langContext.isCodeMixed ? `(code-mixed: ${langContext.codeMixPattern})` : ''} ` +
      `→ Provider preference: ${preferredProviders[0]}`
    );

    // Use preferred providers for selection
    const t4Ids = preferredProviders; // Override T4 provider selection
    const { content } = await chatWithFallback(
      messages,
      aiCfg.max_classify_tokens,
      aiCfg.classify_temperature,
      true,
      t4Ids
    );
```

---

## 5. Multilingual Context Preservation

### Step 1: Add multilingual state to conversation

```typescript
// File: mcp-server/src/assistant/types.ts

export interface MultilingualState {
  detectedLanguages: Array<{
    language: string;
    confidence: number;
    detectedAt: number;
  }>;
  primaryLanguage: string;
  secondaryLanguage?: string;
  isCodeMixed: boolean;
  codeMixPattern?: string;
  preferredResponseLanguage: string;
  shouldMixLanguages: boolean;
  requiresTranslation: boolean;
}

export interface ConversationState {
  // ... existing fields ...
  multilingualState?: MultilingualState;
}
```

### Step 2: Update conversation state tracking

```typescript
// File: mcp-server/src/assistant/conversation.ts

export function updateMultilingualState(
  phone: string,
  detectedLanguage: string,
  isCodeMixed: boolean,
  codeMixPattern?: string
): void {
  const convo = conversations.get(phone);
  if (!convo) return;

  if (!convo.multilingualState) {
    convo.multilingualState = {
      detectedLanguages: [],
      primaryLanguage: 'en',
      isCodeMixed: false,
      preferredResponseLanguage: 'en',
      shouldMixLanguages: false,
      requiresTranslation: false
    };
  }

  const state = convo.multilingualState;

  // Track detected language
  state.detectedLanguages.push({
    language: detectedLanguage,
    confidence: 0.85,
    detectedAt: Date.now()
  });

  if (state.detectedLanguages.length > 20) {
    state.detectedLanguages.shift();
  }

  // Update primary language (most recent 5)
  const recentLangs = state.detectedLanguages.slice(-5).map(d => d.language);
  const langCounts: Record<string, number> = {};
  for (const lang of recentLangs) {
    langCounts[lang] = (langCounts[lang] || 0) + 1;
  }
  state.primaryLanguage = Object.entries(langCounts)
    .sort(([, a], [, b]) => b - a)[0][0] || 'en';

  // Update code-mixing state
  state.isCodeMixed = isCodeMixed;
  state.codeMixPattern = codeMixPattern;

  // Determine preferred response language
  if (isCodeMixed) {
    // For code-mixing, respond in the non-English language
    state.preferredResponseLanguage = state.primaryLanguage === 'en'
      ? (state.secondaryLanguage || 'en')
      : state.primaryLanguage;
    state.shouldMixLanguages = true;
  } else {
    state.preferredResponseLanguage = state.primaryLanguage;
    state.shouldMixLanguages = false;
  }

  state.requiresTranslation = state.primaryLanguage !== 'en';

  console.log(
    `[Multilingual] ${phone}: primary=${state.primaryLanguage}, ` +
    `codeMixed=${state.isCodeMixed}, preferred_response=${state.preferredResponseLanguage}`
  );
}
```

---

## 6. Template Configuration Selection

### Step 1: Add template selection logic

```typescript
// File: mcp-server/src/assistant/config-store.ts

export enum TemplateType {
  T1_SINGLE_MODEL = 'T1_SINGLE_MODEL',
  T2_SINGLE_SMART_FALLBACK = 'T2_SINGLE_SMART_FALLBACK',
  T3_SPLIT_MODEL = 'T3_SPLIT_MODEL',
  T4_TIERED_HYBRID = 'T4_TIERED_HYBRID'
}

export interface TemplateSelection {
  template: TemplateType;
  reasoning: string;
  expectedCost: 'low' | 'medium' | 'high';
  expectedLatency: 'fast' | 'medium' | 'slow';
}

function selectTemplateForPhase(
  journeyPhase: string,
  avgConfidence: number,
  messageVolumePerDay: number
): TemplateSelection {
  // Pre-Arrival: quality > speed
  if (journeyPhase === 'pre_arrival') {
    if (avgConfidence > 0.8) {
      return {
        template: TemplateType.T1_SINGLE_MODEL,
        reasoning: 'Pre-arrival, high confidence, single model sufficient',
        expectedCost: 'medium',
        expectedLatency: 'medium'
      };
    } else {
      return {
        template: TemplateType.T2_SINGLE_SMART_FALLBACK,
        reasoning: 'Pre-arrival, low confidence, use smart fallback',
        expectedCost: 'medium',
        expectedLatency: 'slow'
      };
    }
  }

  // Check-In: speed > quality, but avoid errors
  if (journeyPhase === 'check_in') {
    if (messageVolumePerDay > 500) {
      return {
        template: TemplateType.T3_SPLIT_MODEL,
        reasoning: 'Check-in, high volume, split-model for cost/speed',
        expectedCost: 'low',
        expectedLatency: 'fast'
      };
    } else {
      return {
        template: TemplateType.T4_TIERED_HYBRID,
        reasoning: 'Check-in, moderate volume, tiered for accuracy',
        expectedCost: 'low',
        expectedLatency: 'medium'
      };
    }
  }

  // During Stay: balanced approach
  if (journeyPhase === 'during_stay') {
    if (messageVolumePerDay > 500) {
      return {
        template: TemplateType.T4_TIERED_HYBRID,
        reasoning: 'During stay, high volume, tiered for cost efficiency',
        expectedCost: 'low',
        expectedLatency: 'medium'
      };
    } else {
      return {
        template: TemplateType.T1_SINGLE_MODEL,
        reasoning: 'During stay, low volume, single model',
        expectedCost: 'medium',
        expectedLatency: 'medium'
      };
    }
  }

  // Checkout: task-focused, similar to check-in
  if (journeyPhase === 'checkout') {
    return {
      template: TemplateType.T3_SPLIT_MODEL,
      reasoning: 'Checkout, task-focused, split-model for speed',
      expectedCost: 'low',
      expectedLatency: 'fast'
    };
  }

  // Post-Checkout: low volume, simple
  if (journeyPhase === 'post_checkout') {
    return {
      template: TemplateType.T1_SINGLE_MODEL,
      reasoning: 'Post-checkout, low volume, simple single model',
      expectedCost: 'medium',
      expectedLatency: 'medium'
    };
  }

  // Default
  return {
    template: TemplateType.T1_SINGLE_MODEL,
    reasoning: 'Default template',
    expectedCost: 'medium',
    expectedLatency: 'medium'
  };
}
```

---

## 7. Monitoring and Metrics

### Step 1: Add metrics collection

```typescript
// File: mcp-server/src/assistant/metrics.ts

export interface ConversationMetrics {
  phone: string;
  journeyPhase: string;
  messagesCount: number;
  avgConfidence: number;
  avgResponseTime: number;
  escalationCount: number;
  lastInteractionTime: number;
}

export interface SystemMetrics {
  totalConversations: number;
  activeConversations: number;
  avgConfidenceByPhase: Record<string, number>;
  escalationRateByPhase: Record<string, number>;
  avgResponseTimeByTemplate: Record<string, number>;
  costByTemplate: Record<string, number>;
}

class MetricsCollector {
  private conversationMetrics = new Map<string, ConversationMetrics>();
  private systemMetrics: SystemMetrics = {
    totalConversations: 0,
    activeConversations: 0,
    avgConfidenceByPhase: {},
    escalationRateByPhase: {},
    avgResponseTimeByTemplate: {},
    costByTemplate: {}
  };

  recordConversationMetric(phone: string, convo: ConversationState): void {
    const metric: ConversationMetrics = {
      phone,
      journeyPhase: convo.journeyPhase,
      messagesCount: convo.messages.length,
      avgConfidence: convo.averageConfidence || 0,
      avgResponseTime: 0,
      escalationCount: convo.escalationReasons?.length || 0,
      lastInteractionTime: convo.lastActiveAt
    };
    this.conversationMetrics.set(phone, metric);
  }

  getMetrics(): { conversations: ConversationMetrics[]; system: SystemMetrics } {
    return {
      conversations: Array.from(this.conversationMetrics.values()),
      system: this.systemMetrics
    };
  }

  updateSystemMetrics(): void {
    const convos = Array.from(this.conversationMetrics.values());
    this.systemMetrics.totalConversations = convos.length;
    this.systemMetrics.activeConversations = convos.filter(
      c => Date.now() - c.lastInteractionTime < 1 * 60 * 60 * 1000
    ).length;

    // Calculate averages by phase
    for (const phase of ['pre_arrival', 'check_in', 'during_stay', 'checkout', 'post_checkout']) {
      const phaseConvos = convos.filter(c => c.journeyPhase === phase);
      if (phaseConvos.length > 0) {
        this.systemMetrics.avgConfidenceByPhase[phase] =
          phaseConvos.reduce((sum, c) => sum + c.avgConfidence, 0) / phaseConvos.length;
        this.systemMetrics.escalationRateByPhase[phase] =
          phaseConvos.reduce((sum, c) => sum + c.escalationCount, 0) / phaseConvos.length;
      }
    }
  }
}

export const metricsCollector = new MetricsCollector();
```

### Step 2: Expose metrics endpoint

```typescript
// File: mcp-server/src/routes/admin/metrics.ts

import express from 'express';
import { metricsCollector } from '../../assistant/metrics.js';

const router = express.Router();

router.get('/metrics', (req, res) => {
  metricsCollector.updateSystemMetrics();
  const { conversations, system } = metricsCollector.getMetrics();

  res.json({
    timestamp: new Date().toISOString(),
    system,
    topConversations: conversations
      .sort((a, b) => b.messagesCount - a.messagesCount)
      .slice(0, 10)
  });
});

export default router;
```

---

## Quick Checklist

- [ ] Add `journeyPhase` to ConversationState
- [ ] Implement `detectJourneyPhase()` and phase transition logic
- [ ] Add phase-aware context sizing in ai-client.ts
- [ ] Implement confidence tracking with trend detection
- [ ] Add phase-aware rate limiting
- [ ] Implement language analysis and detection
- [ ] Add language-aware provider selection
- [ ] Create multilingual state tracking
- [ ] Add template selection logic
- [ ] Implement metrics collection endpoint
- [ ] Test with sample conversations across all phases
- [ ] Monitor and adjust thresholds based on real data

