# Settings Configuration Reference

Recommended configurations for `settings.json`, `llm-settings.json`, and related config files based on optimal strategies.

---

## 1. Recommended settings.json for Hospitality Use Case

```json
{
  "ai": {
    "nvidia_model": "moonshotai/kimi-k2.5",
    "nvidia_base_url": "https://integrate.api.nvidia.com/v1",
    "groq_model": "llama-3.3-70b-versatile",
    "max_classify_tokens": 150,
    "max_chat_tokens": 800,
    "classify_temperature": 0.1,
    "chat_temperature": 0.7,
    "providers": [
      {
        "id": "groq-llama-70b",
        "name": "Groq Llama 3.3 70B",
        "description": "Balanced quality/speed (280 tok/s). Default provider for chat responses.",
        "type": "groq",
        "api_key_env": "GROQ_API_KEY",
        "base_url": "https://api.groq.com/openai/v1",
        "model": "llama-3.3-70b-versatile",
        "enabled": true,
        "priority": 0
      },
      {
        "id": "ollama-gpt-oss-20b",
        "name": "Ollama GPT-OSS 20B Cloud",
        "description": "Fastest (~3s), free, GPT-4 class. Best as fallback for tier 1 responses.",
        "type": "ollama",
        "api_key_env": "",
        "base_url": "http://localhost:11434/v1",
        "model": "gpt-oss:20b-cloud",
        "enabled": true,
        "priority": 1
      },
      {
        "id": "groq-qwen3-32b",
        "name": "Groq Qwen3 32B",
        "description": "Native Chinese, strong Malay. Best for multilingual guests.",
        "type": "groq",
        "api_key_env": "GROQ_API_KEY",
        "base_url": "https://api.groq.com/openai/v1",
        "model": "qwen3-32b",
        "enabled": true,
        "priority": 2
      },
      {
        "id": "groq-deepseek-r1",
        "name": "Groq DeepSeek R1 Distill 70B",
        "description": "Best for complex multi-step problems (booking, calculations). Use for fallback.",
        "type": "groq",
        "api_key_env": "GROQ_API_KEY",
        "base_url": "https://api.groq.com/openai/v1",
        "model": "deepseek-r1-distill-llama-70b",
        "enabled": false,
        "priority": 3
      },
      {
        "id": "groq-llama-8b",
        "name": "Groq Llama 3.1 8B Instant",
        "description": "Ultra-fast (560 tok/s). Best for fast classification in split-model.",
        "type": "groq",
        "api_key_env": "GROQ_API_KEY",
        "base_url": "https://api.groq.com/openai/v1",
        "model": "llama-3.1-8b-instant",
        "enabled": true,
        "priority": 4
      },
      {
        "id": "ollama-deepseek-v3.2",
        "name": "Ollama DeepSeek V3.2 Cloud",
        "description": "685B reasoning model, best for complex logic. Smart fallback provider.",
        "type": "ollama",
        "api_key_env": "",
        "base_url": "http://localhost:11434/v1",
        "model": "deepseek-v3.2:cloud",
        "enabled": false,
        "priority": 5
      },
      {
        "id": "ollama-gemini-flash",
        "name": "Ollama Gemini 3 Flash",
        "description": "Fast Google model, trained on translations. Good for casual/slang multilingual.",
        "type": "ollama",
        "api_key_env": "",
        "base_url": "http://localhost:11434/v1",
        "model": "gemini-3-flash-preview:cloud",
        "enabled": true,
        "priority": 6
      }
    ]
  },

  "system_prompt": "You are Rainbow 🌈, a friendly AI assistant for Pelangi Capsule Hostel (Johor Bahru, Malaysia). You help guests with check-in, pricing, bookings, and hostel questions. Be warm, concise (under 300 chars when possible), and helpful. Reply in the guest's language (English, Malay, or Chinese). If unsure, suggest contacting staff. Always clarify you are an AI bot.",

  "routing_mode": {
    "splitModel": false,
    "classifyProvider": "groq-llama-8b",
    "tieredPipeline": true
  },

  "rate_limits": {
    "per_minute": 20,
    "per_hour": 100
  },

  "staff": {
    "phones": [
      "60167620815",
      "60127088789",
      "60103084289"
    ],
    "jay_phone": "60127088789",
    "alston_phone": "60167620815"
  }
}
```

---

## 2. Recommended llm-settings.json (Enhanced)

```json
{
  "version": "2.0",
  "lastUpdated": "2026-02-12",

  "thresholds": {
    "fuzzy": 0.80,
    "semantic": 0.70,
    "layer2": 0.80,
    "llm": 0.60,
    "lowConfidence": 0.5,
    "mediumConfidence": 0.7
  },

  "selectedProviders": [
    {
      "id": "groq-llama-70b",
      "name": "Groq Llama 3.3 70B",
      "priority": 0
    },
    {
      "id": "ollama-gpt-oss-20b",
      "name": "Ollama GPT-OSS 20B",
      "priority": 1
    },
    {
      "id": "groq-qwen3-32b",
      "name": "Groq Qwen3 32B",
      "priority": 2
    }
  ],

  "templates": {
    "default": "T2_SINGLE_SMART_FALLBACK",
    "preArrival": "T2_SINGLE_SMART_FALLBACK",
    "checkIn": "T4_TIERED_HYBRID",
    "duringSay": "T4_TIERED_HYBRID",
    "checkout": "T3_SPLIT_MODEL",
    "postCheckout": "T1_SINGLE_MODEL"
  },

  "phaseContextSettings": {
    "pre_arrival": {
      "classifyMessages": 5,
      "chatMessages": 15,
      "responseTimeout": 3000,
      "confidenceThreshold": 0.70
    },
    "check_in": {
      "classifyMessages": 4,
      "chatMessages": 10,
      "responseTimeout": 2000,
      "confidenceThreshold": 0.60
    },
    "during_stay": {
      "classifyMessages": 10,
      "chatMessages": 20,
      "responseTimeout": 3000,
      "confidenceThreshold": 0.80
    },
    "checkout": {
      "classifyMessages": 8,
      "chatMessages": 15,
      "responseTimeout": 2500,
      "confidenceThreshold": 0.65
    },
    "post_checkout": {
      "classifyMessages": 8,
      "chatMessages": 15,
      "responseTimeout": 4000,
      "confidenceThreshold": 0.75
    }
  },

  "rateLimitingByPhase": {
    "pre_arrival": {
      "perMinute": 10,
      "perHour": 50,
      "escalationThreshold": 3
    },
    "check_in": {
      "perMinute": 30,
      "perHour": 100,
      "escalationThreshold": 2
    },
    "during_stay": {
      "perMinute": 20,
      "perHour": 80,
      "escalationThreshold": 4
    },
    "checkout": {
      "perMinute": 20,
      "perHour": 80,
      "escalationThreshold": 3
    },
    "post_checkout": {
      "perMinute": 5,
      "perHour": 20,
      "escalationThreshold": 5
    }
  },

  "multilingualSettings": {
    "supportedLanguages": ["en", "ms", "zh"],
    "enableCodeMixingDetection": true,
    "preferQwenForChinese": true,
    "preferDeepSeekForComplexReasoning": true,
    "autoDetectLanguage": true
  },

  "maxTokens": 800,
  "temperature": 0.7,

  "fallbackBehavior": {
    "enabled": true,
    "minConfidence": 0.80,
    "smartProviders": [
      "groq-deepseek-r1",
      "groq-qwen3-32b",
      "ollama-deepseek-v3.2"
    ],
    "contextMultiplier": 1.5,
    "temperatureAdjustment": 0.0
  }
}
```

---

## 3. Phase-Specific Configuration Examples

### Pre-Arrival Phase (Booking)
```json
{
  "phase": "pre_arrival",
  "template": "T2_SINGLE_SMART_FALLBACK",
  "providers": ["groq-llama-70b", "ollama-gpt-oss-20b"],
  "context": {
    "classifyMessages": 5,
    "chatMessages": 15
  },
  "temperature": 0.3,
  "maxTokens": 600,
  "rateLimits": {
    "perMinute": 10,
    "perHour": 50
  },
  "description": "Guest is planning trip, asking about pricing/availability/booking. Low urgency, quality > speed."
}
```

### Check-In Phase (Urgent)
```json
{
  "phase": "check_in",
  "template": "T4_TIERED_HYBRID",
  "providers": ["groq-llama-8b", "groq-llama-70b"],
  "context": {
    "classifyMessages": 4,
    "chatMessages": 10
  },
  "temperature": 0.5,
  "maxTokens": 400,
  "rateLimits": {
    "perMinute": 30,
    "perHour": 100
  },
  "responseTimeout": 2000,
  "escalationOnConfidence": 0.4,
  "description": "Guest is present, checking in. High urgency, response speed critical. Escalate low confidence fast."
}
```

### During Stay (Normal)
```json
{
  "phase": "during_stay",
  "template": "T4_TIERED_HYBRID",
  "providers": ["groq-llama-70b", "groq-qwen3-32b"],
  "context": {
    "classifyMessages": 10,
    "chatMessages": 20
  },
  "temperature": 0.7,
  "maxTokens": 800,
  "rateLimits": {
    "perMinute": 20,
    "perHour": 80
  },
  "responseTimeout": 3000,
  "description": "Guest is settled in. Normal interaction, balanced quality/speed. Full context available."
}
```

### Checkout Phase (Task-Focused)
```json
{
  "phase": "checkout",
  "template": "T3_SPLIT_MODEL",
  "providers": ["groq-llama-8b", "groq-llama-70b"],
  "context": {
    "classifyMessages": 8,
    "chatMessages": 15
  },
  "temperature": 0.5,
  "maxTokens": 500,
  "rateLimits": {
    "perMinute": 20,
    "perHour": 80
  },
  "description": "Guest checking out. Task-focused (procedures, payment). Speed important, but need accuracy."
}
```

### Post-Checkout Phase (Sporadic)
```json
{
  "phase": "post_checkout",
  "template": "T1_SINGLE_MODEL",
  "providers": ["groq-llama-70b"],
  "context": {
    "classifyMessages": 8,
    "chatMessages": 15
  },
  "temperature": 0.7,
  "maxTokens": 500,
  "rateLimits": {
    "perMinute": 5,
    "perHour": 20
  },
  "description": "Guest has left. Sporadic messages (forgot items, billing). Low volume, simple routing."
}
```

---

## 4. Provider Configuration by Language

### For English-Speaking Guests
```json
{
  "language": "en",
  "preferredProviders": [
    {
      "provider": "groq-llama-70b",
      "score": 90,
      "speed": 280,
      "cost": 0.25
    },
    {
      "provider": "groq-llama-8b",
      "score": 88,
      "speed": 560,
      "cost": 0.05
    },
    {
      "provider": "ollama-gpt-oss-20b",
      "score": 92,
      "speed": 3,
      "cost": 0
    }
  ],
  "fallback": "ollama-gpt-oss-20b"
}
```

### For Malay-Speaking Guests
```json
{
  "language": "ms",
  "preferredProviders": [
    {
      "provider": "groq-qwen3-32b",
      "score": 95,
      "reason": "Trained on Malay corpus, native CJK tokenization"
    },
    {
      "provider": "groq-llama-70b",
      "score": 85,
      "reason": "Good Malay understanding but not specialized"
    },
    {
      "provider": "ollama-deepseek-v3.2",
      "score": 92,
      "reason": "Best for complex logic in Malay"
    }
  ],
  "fallback": "groq-qwen3-32b"
}
```

### For Chinese-Speaking Guests
```json
{
  "language": "zh",
  "preferredProviders": [
    {
      "provider": "groq-qwen3-32b",
      "score": 98,
      "reason": "Native Chinese, ~3x more efficient CJK tokenization"
    },
    {
      "provider": "ollama-deepseek-v3.2",
      "score": 95,
      "reason": "Excellent reasoning in Chinese"
    },
    {
      "provider": "groq-llama-70b",
      "score": 80,
      "reason": "Good but less efficient for Chinese"
    }
  ],
  "fallback": "groq-qwen3-32b"
}
```

### For Code-Mixed Input (e.g., "eh bro, wifi password apa?")
```json
{
  "languages": ["en", "ms"],
  "pattern": "en-ms",
  "preferredProviders": [
    {
      "provider": "groq-qwen3-32b",
      "score": 90,
      "reason": "Good code-mixing support"
    },
    {
      "provider": "ollama-deepseek-v3.2",
      "score": 95,
      "reason": "Best at code-mixing across languages"
    }
  ],
  "fallback": "ollama-deepseek-v3.2",
  "responseLanguage": "primary",
  "enableTranslation": false
}
```

---

## 5. Cost Optimization Configuration

```json
{
  "costOptimization": {
    "mode": "balanced",
    "daily_token_budget": 100000,
    "cost_per_1k_tokens": {
      "groq-llama-70b": 0.25,
      "groq-llama-8b": 0.05,
      "groq-qwen3-32b": 0.20,
      "groq-deepseek-r1": 0.35,
      "ollama-gpt-oss-20b": 0.0,
      "ollama-deepseek-v3.2": 0.0,
      "ollama-gemini-flash": 0.0
    },

    "intent_token_budget": {
      "greeting": 10,
      "thanks": 10,
      "wifi": 20,
      "pricing": 50,
      "directions": 50,
      "payment_info": 50,
      "availability": 200,
      "late_checkout": 150,
      "booking": 400,
      "complaint": 300,
      "general": 200
    },

    "phase_daily_budget": {
      "pre_arrival": 5000,
      "check_in": 15000,
      "during_stay": 20000,
      "checkout": 10000,
      "post_checkout": 3000
    },

    "provider_selection_strategy": "cost_aware",
    "fallback_on_cost_exhaustion": "static_reply"
  }
}
```

---

## 6. Confidence Threshold Configuration

```json
{
  "confidenceThresholds": {
    "byPhase": {
      "pre_arrival": {
        "escalate": 0.50,
        "addDisclaimer": 0.60,
        "acceptable": 0.70
      },
      "check_in": {
        "escalate": 0.40,
        "addDisclaimer": 0.55,
        "acceptable": 0.60
      },
      "during_stay": {
        "escalate": 0.50,
        "addDisclaimer": 0.70,
        "acceptable": 0.80
      },
      "checkout": {
        "escalate": 0.45,
        "addDisclaimer": 0.60,
        "acceptable": 0.65
      },
      "post_checkout": {
        "escalate": 0.50,
        "addDisclaimer": 0.65,
        "acceptable": 0.75
      }
    },

    "trendBasedEscalation": {
      "enabled": true,
      "decliningTrendDuration": 120000,
      "decliningTrendThreshold": 0.1,
      "escalateOnDecline": true
    },

    "repeatIntentEscalation": {
      "enabled": true,
      "threshold": 3,
      "escalateAt": 3,
      "description": "Escalate if same intent repeated 3+ times"
    }
  }
}
```

---

## 7. Template-Specific Configuration

### T1: Single-Model (Simplest)
```json
{
  "templateId": "T1_SINGLE_MODEL",
  "description": "Single LLM call for classify + respond. Simplest, most straightforward.",
  "config": {
    "classify": {
      "provider": "auto",
      "contextMessages": 5,
      "temperature": 0.1,
      "maxTokens": 150
    },
    "generate": {
      "provider": "auto",
      "contextMessages": 20,
      "temperature": 0.7,
      "maxTokens": 800
    },
    "fallback": {
      "enabled": true,
      "minConfidence": 0.8,
      "contextMessages": 20
    }
  },
  "bestFor": ["pre_arrival", "post_checkout"],
  "expectedCost": "medium",
  "expectedLatency": "medium"
}
```

### T2: Single + Smart Fallback (Current)
```json
{
  "templateId": "T2_SINGLE_SMART_FALLBACK",
  "description": "Single LLM with intelligent fallback. Catches edge cases with better models.",
  "config": {
    "classify": {
      "provider": "auto",
      "contextMessages": 5,
      "temperature": 0.1,
      "maxTokens": 150
    },
    "generate": {
      "provider": "auto",
      "contextMessages": 20,
      "temperature": 0.7,
      "maxTokens": 800
    },
    "fallback": {
      "enabled": true,
      "minConfidence": 0.80,
      "smartProviders": [
        "groq-deepseek-r1",
        "groq-qwen3-32b",
        "ollama-deepseek-v3.2"
      ],
      "contextMessages": 20,
      "maxTokens": 1200,
      "temperature": 0.7
    }
  },
  "bestFor": ["pre_arrival", "during_stay"],
  "expectedCost": "medium-high",
  "expectedLatency": "medium-slow",
  "note": "~20% cost increase due to fallbacks, but catches quality issues"
}
```

### T3: Split-Model (Fast)
```json
{
  "templateId": "T3_SPLIT_MODEL",
  "description": "Fast 8B classify, conditional full-model reply. Minimize cost for static routes.",
  "config": {
    "classify": {
      "provider": "groq-llama-8b",
      "contextMessages": 4,
      "temperature": 0.1,
      "maxTokens": 150,
      "timeout": 1000
    },
    "generate": {
      "provider": "auto",
      "contextMessages": 20,
      "temperature": 0.7,
      "maxTokens": 800,
      "skipFor": [
        "greeting",
        "thanks",
        "wifi",
        "pricing",
        "directions",
        "payment_info"
      ]
    },
    "fallback": {
      "enabled": true,
      "minConfidence": 0.7,
      "retryProviders": ["groq-llama-70b", "ollama-gpt-oss-20b"]
    }
  },
  "bestFor": ["check_in", "checkout"],
  "expectedCost": "low",
  "expectedLatency": "fast",
  "note": "60-70% cost reduction, good for high-volume periods"
}
```

### T4: Tiered-Hybrid (Best Balance)
```json
{
  "templateId": "T4_TIERED_HYBRID",
  "description": "Fuzzy→Semantic→LLM pipeline. Best balance of cost, accuracy, and speed.",
  "config": {
    "tier1Fuzzy": {
      "enabled": true,
      "minConfidence": 0.80,
      "methods": ["regex_patterns", "keyword_matching"]
    },
    "tier2Semantic": {
      "enabled": true,
      "minConfidence": 0.70,
      "methods": ["tfidf_vectors", "intent_embedding"]
    },
    "tier3LLM": {
      "enabled": true,
      "minConfidence": 0.60,
      "provider": "groq-llama-70b",
      "contextMessages": 20,
      "maxTokens": 800
    },
    "generateReply": {
      "enabled": true,
      "provider": "auto",
      "contextMessages": 20,
      "maxTokens": 800
    }
  },
  "bestFor": ["check_in", "during_stay", "checkout"],
  "expectedCost": "low",
  "expectedLatency": "medium",
  "note": "90% of intents caught by tier 1-2 (zero/minimal cost), tier 3 LLM for hard cases"
}
```

---

## 8. Migration Guide: From Current to Optimal

If you want to gradually adopt these recommendations:

### Week 1: Enable Phase Detection
```diff
{
  "routing_mode": {
    "splitModel": false,
    "classifyProvider": "groq-llama-8b",
-   "tieredPipeline": true
+   "tieredPipeline": true,
+   "enablePhaseDetection": true
  }
}
```

### Week 2: Enable Confidence Tracking
```diff
{
  "ai": {
    // ... existing config ...
+   "enableConfidenceTracking": true,
+   "confidenceTrendDetection": true
  }
}
```

### Week 3: Enable Phase-Aware Rate Limiting
```diff
{
  "rate_limits": {
-   "per_minute": 20,
-   "per_hour": 100
+   "per_minute": 20,
+   "per_hour": 100,
+   "enablePhaseAwareLimits": true,
+   "phaseBasedLimits": {
+     "check_in": { "per_minute": 30, "per_hour": 100 },
+     "during_stay": { "per_minute": 20, "per_hour": 80 }
+   }
  }
}
```

### Week 4: Enable Language-Aware Provider Selection
```diff
{
  "ai": {
    // ... existing config ...
+   "enableLanguageAwareSelection": true,
+   "languageProviderMap": {
+     "zh": "groq-qwen3-32b",
+     "ms": "groq-qwen3-32b"
+   }
  }
}
```

---

## 9. Monitoring Dashboard Configuration

```json
{
  "dashboardMetrics": {
    "realTime": [
      "activeSessions",
      "avgConfidence",
      "escalationRate",
      "costPerMessage",
      "responseTimeP95"
    ],

    "byPhase": {
      "pre_arrival": [
        "conversationCount",
        "avgMessagesPerConversation",
        "avgConfidence",
        "escalationRate",
        "costPerConversation"
      ],
      "check_in": [
        "concurrentUsers",
        "responseTimeP99",
        "escalationRate",
        "templateUsageBreakdown"
      ],
      "during_stay": [
        "activeConversations",
        "avgDailyMessages",
        "avgConfidence",
        "repeatedIntentRate"
      ],
      "checkout": [
        "checkoutSuccessRate",
        "avgProcessingTime",
        "escalationRate"
      ],
      "post_checkout": [
        "contactRate",
        "issueResolutionRate",
        "customerSatisfaction"
      ]
    },

    "alerts": {
      "escalationRateAbove": 0.15,
      "avgConfidenceBelow": 0.65,
      "responseTimeAbove": 5000,
      "costPerMessageAbove": 0.005,
      "errorRateAbove": 0.01
    }
  }
}
```

---

## Quick Reference: Configuration Changes Summary

| Component | Current | Recommended | Impact |
|-----------|---------|-------------|--------|
| Template | T2 single+fallback | T4 tiered-hybrid | -50% cost, similar quality |
| Provider priority | groq-llama → ollama | Same + language aware | Better multilingual |
| Context sizing | 5 classify / 20 chat | Phase-aware (4-10 / 10-20) | -30% tokens, faster |
| Rate limits | Fixed 20/min, 100/h | Phase-aware (5-30/min) | Better UX during peak |
| Confidence tracking | Single score | Rolling avg + trend | Better escalation logic |
| TTL | 1 hour flat | Phase-aware (4h-14d) | Better recovery, persistence |

