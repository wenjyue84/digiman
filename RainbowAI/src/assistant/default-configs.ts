/**
 * Default Configuration Fallbacks
 *
 * Provides safe default configurations when JSON files are corrupted or missing.
 * These minimal configs allow the system to start and the admin to fix issues via dashboard.
 */

import type {
  KnowledgeData, IntentsData, TemplatesData, SettingsData,
  WorkflowData, WorkflowsData, RoutingData
} from './schemas.js';

/**
 * Minimal working knowledge base (single general intent)
 */
export const DEFAULT_KNOWLEDGE: KnowledgeData = {
  static_replies: {
    general: {
      en: "I'm currently operating in safe mode due to a configuration issue. Please contact staff for assistance.",
      ms: "Saya beroperasi dalam mod selamat kerana masalah konfigurasi. Sila hubungi kakitangan untuk bantuan.",
      zh: "由于配置问题,我目前处于安全模式。请联系工作人员寻求帮助。"
    }
  },
  dynamic_knowledge: []
};

/**
 * Minimal intents (single general category)
 */
export const DEFAULT_INTENTS: IntentsData = {
  categories: [
    {
      name: "General Support",
      description: "Safe mode - all messages route to general handler",
      intents: [
        {
          category: "general",
          description: "Fallback intent for safe mode operation",
          time_sensitive: false
        }
      ]
    }
  ]
};

/**
 * Essential system templates
 */
export const DEFAULT_TEMPLATES: TemplatesData = {
  non_text: {
    en: "I can only process text messages right now.",
    ms: "Saya hanya boleh memproses mesej teks buat masa ini.",
    zh: "我现在只能处理文本消息。"
  },
  rate_limited: {
    en: "You're sending messages too quickly. Please wait a moment.",
    ms: "Anda menghantar mesej terlalu cepat. Sila tunggu sebentar.",
    zh: "您发送消息太快了。请稍等片刻。"
  },
  thinking: {
    en: "One moment please...",
    ms: "Sebentar...",
    zh: "请稍等..."
  },
  error: {
    en: "I'm having technical difficulties. Please try again or contact staff.",
    ms: "Saya mengalami masalah teknikal. Sila cuba lagi atau hubungi kakitangan.",
    zh: "我遇到了技术问题。请重试或联系工作人员。"
  },
  unavailable: {
    en: "My AI service is temporarily unavailable. Please contact staff for assistance.",
    ms: "Perkhidmatan AI saya tidak tersedia buat masa ini. Sila hubungi kakitangan.",
    zh: "我的AI服务暂时不可用。请联系工作人员寻求帮助。"
  },
  payment_forwarded: {
    en: "Payment receipt forwarded to staff. They will confirm shortly.",
    ms: "Resit pembayaran telah dihantar kepada kakitangan. Mereka akan mengesahkan sebentar lagi.",
    zh: "付款收据已转发给工作人员。他们将很快确认。"
  }
};

/**
 * Minimal settings with single AI provider (Ollama local - no API key required)
 */
export const DEFAULT_SETTINGS: SettingsData = {
  system_prompt: `You are ${process.env.BOT_NAME || 'Rainbow'}, an AI assistant for ${process.env.BUSINESS_NAME || 'Pelangi Capsule Hostel'}. You're currently in safe mode. Please help guests contact staff if needed.`,
  staff_phones: [process.env.STAFF_PRIMARY_PHONE || "+60127088789"], // Fallback number
  ai: {
    nvidia_model: "moonshotai/kimi-k2.5",
    nvidia_base_url: "https://integrate.api.nvidia.com/v1",
    groq_model: "llama-3.3-70b-versatile",
    max_classify_tokens: 100,
    max_chat_tokens: 500,
    classify_temperature: 0.05,
    chat_temperature: 0.7,
    providers: [
      {
        id: "ollama-local",
        name: "Ollama Local (Safe Mode)",
        description: "Local Ollama instance - no API key required",
        type: "ollama",
        api_key_env: "",
        base_url: "http://localhost:11434/v1",
        model: "gpt-oss:20b-cloud",
        enabled: true,
        priority: 0,
        available: true
      }
    ]
  },
  routing_mode: {
    tieredPipeline: true,
    splitModel: false,
    classifyProvider: "ollama-local"
  },
  conversation: {
    enabled: true,
    summaryAfterMessages: 10,
    maxHistoryMessages: 20,
    contextTTL: 30
  }
};

/**
 * Minimal workflow config (escalation only)
 */
export const DEFAULT_WORKFLOW: WorkflowData = {
  escalation: {
    enabled: true,
    threshold: 3,
    cooldown_minutes: 30
  },
  payment: {
    enabled: true,
    forward_to: process.env.STAFF_PRIMARY_PHONE || "+60127088789"
  },
  booking: {
    enabled: false // Disable booking in safe mode
  }
};

/**
 * Minimal workflows (escalation only)
 */
export const DEFAULT_WORKFLOWS: WorkflowsData = {
  workflows: [
    {
      id: "escalate",
      name: "Escalate to Staff",
      description: "Forward complex queries to staff",
      steps: [
        {
          id: "notify",
          message: {
            en: "I've notified our staff. They will assist you shortly.",
            ms: "Saya telah memaklumkan kepada kakitangan kami. Mereka akan membantu anda sebentar lagi.",
            zh: "我已通知我们的工作人员。他们将很快为您提供帮助。"
          },
          waitForReply: false
        }
      ]
    }
  ]
};

/**
 * Minimal routing (everything goes to general handler)
 */
export const DEFAULT_ROUTING: RoutingData = {
  general: {
    action: "static_reply"
  }
};

/**
 * Daily memory template. Canonical source -- also duplicated in server/routes/rainbow-kb.ts
 * (server module cannot import from RainbowAI due to module boundary rules).
 */
export function getDailyMemoryTemplate(date: string): string {
  return `# ${date} -- Daily Memory\n\n## Staff Notes\n\n## Issues Reported\n\n## Operational Changes\n\n## Patterns Observed\n\n## AI Notes\n`;
}

/**
 * Get default config for a specific file
 */
export function getDefaultConfig(filename: string): unknown {
  const defaults: Record<string, unknown> = {
    'knowledge.json': DEFAULT_KNOWLEDGE,
    'intents.json': DEFAULT_INTENTS,
    'templates.json': DEFAULT_TEMPLATES,
    'settings.json': DEFAULT_SETTINGS,
    'workflow.json': DEFAULT_WORKFLOW,
    'workflows.json': DEFAULT_WORKFLOWS,
    'routing.json': DEFAULT_ROUTING
  };

  return defaults[filename] || null;
}
