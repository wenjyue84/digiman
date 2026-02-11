/**
 * Intent Detection Configuration Store
 * Manages configurable context window sizes per tier
 */

export interface IntentDetectionConfig {
  tiers: {
    tier1_emergency: {
      enabled: boolean;
      contextMessages: number;  // Always 0 for regex
    };
    tier2_fuzzy: {
      enabled: boolean;
      contextMessages: number;  // 0-10
      threshold: number;
    };
    tier3_semantic: {
      enabled: boolean;
      contextMessages: number;  // 0-10
      threshold: number;
    };
    tier4_llm: {
      enabled: boolean;
      contextMessages: number;  // 1-20
    };
  };
  conversationState: {
    trackLastIntent: boolean;
    trackSlots: boolean;
    maxHistoryMessages: number;
    contextTTL: number;  // minutes
  };
}

let currentConfig: IntentDetectionConfig = getDefaultConfig();

export function getDefaultConfig(): IntentDetectionConfig {
  return {
    tiers: {
      tier1_emergency: {
        enabled: true,
        contextMessages: 0  // Always 0 for regex
      },
      tier2_fuzzy: {
        enabled: true,
        contextMessages: 3,
        threshold: 0.80
      },
      tier3_semantic: {
        enabled: true,
        contextMessages: 5,
        threshold: 0.67
      },
      tier4_llm: {
        enabled: true,
        contextMessages: 5
      }
    },
    conversationState: {
      trackLastIntent: true,
      trackSlots: true,
      maxHistoryMessages: 20,
      contextTTL: 30  // 30 minutes
    }
  };
}

export function getIntentConfig(): IntentDetectionConfig {
  return currentConfig;
}

export function updateIntentConfig(config: Partial<IntentDetectionConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
    tiers: {
      ...currentConfig.tiers,
      ...(config.tiers || {})
    },
    conversationState: {
      ...currentConfig.conversationState,
      ...(config.conversationState || {})
    }
  };

  console.log('[IntentConfig] Configuration updated:', currentConfig);
}

export function loadIntentConfigFromDB(dbConfig: any): void {
  if (!dbConfig) {
    console.log('[IntentConfig] No DB config found, using defaults');
    return;
  }

  currentConfig = {
    tiers: {
      tier1_emergency: {
        enabled: dbConfig.tier1Enabled ?? true,
        contextMessages: dbConfig.tier1ContextMessages ?? 0
      },
      tier2_fuzzy: {
        enabled: dbConfig.tier2Enabled ?? true,
        contextMessages: dbConfig.tier2ContextMessages ?? 3,
        threshold: dbConfig.tier2Threshold ?? 0.80
      },
      tier3_semantic: {
        enabled: dbConfig.tier3Enabled ?? true,
        contextMessages: dbConfig.tier3ContextMessages ?? 5,
        threshold: dbConfig.tier3Threshold ?? 0.67
      },
      tier4_llm: {
        enabled: dbConfig.tier4Enabled ?? true,
        contextMessages: dbConfig.tier4ContextMessages ?? 5
      }
    },
    conversationState: {
      trackLastIntent: dbConfig.trackLastIntent ?? true,
      trackSlots: dbConfig.trackSlots ?? true,
      maxHistoryMessages: dbConfig.maxHistoryMessages ?? 20,
      contextTTL: dbConfig.contextTTL ?? 30
    }
  };

  console.log('[IntentConfig] Loaded from database:', currentConfig);
}
