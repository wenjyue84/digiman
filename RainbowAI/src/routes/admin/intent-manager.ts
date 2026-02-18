import { Router } from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { configStore } from '../../assistant/config-store.js';
import { getIntentConfig, updateIntentConfig, getIntentTiersFilePath } from '../../assistant/intent-config.js';
import { badRequest, serverError } from './http-utils.js';
import { atomicWriteJSON } from './file-utils.js';

const DATA_DIR = join(process.cwd(), 'src', 'assistant', 'data');
const LLM_SETTINGS_PATH = join(DATA_DIR, 'llm-settings.json');
const SETTINGS_PATH = join(DATA_DIR, 'settings.json');

const router = Router();

// ─── Intent Manager Proxy (forwards to backend API) ─────────────────

router.get('/intent-manager/keywords', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/keywords');
    res.json(response.data);
  } catch (_e: any) {
    try {
      const raw = await readFile(join(DATA_DIR, 'intent-keywords.json'), 'utf-8');
      res.json(JSON.parse(raw));
    } catch (err: any) {
      serverError(res, err?.message || 'Failed to read keywords');
    }
  }
});

router.get('/intent-manager/examples', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/examples');
    res.json(response.data);
  } catch (_e: any) {
    try {
      const raw = await readFile(join(DATA_DIR, 'intent-examples.json'), 'utf-8');
      res.json(JSON.parse(raw));
    } catch (err: any) {
      serverError(res, err?.message || 'Failed to read examples');
    }
  }
});

router.put('/intent-manager/keywords/:intent', async (req: Request, res: Response) => {
  try {
    const response = await axios.put(`http://localhost:5000/api/intent-manager/keywords/${req.params.intent}`, req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.put('/intent-manager/examples/:intent', async (req: Request, res: Response) => {
  try {
    const response = await axios.put(`http://localhost:5000/api/intent-manager/examples/${req.params.intent}`, req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.post('/intent-manager/test', async (req: Request, res: Response) => {
  try {
    const response = await axios.post('http://localhost:5000/api/intent-manager/test', req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.get('/intent-manager/stats', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/stats');
    res.json(response.data);
  } catch (_e: any) {
    // Fallback: compute stats from Rainbow's local data so dashboard works without backend (5000)
    try {
      const [kwRaw, exRaw] = await Promise.all([
        readFile(join(DATA_DIR, 'intent-keywords.json'), 'utf-8'),
        readFile(join(DATA_DIR, 'intent-examples.json'), 'utf-8')
      ]);
      const keywordsData = JSON.parse(kwRaw) as { intents: Array<{ intent: string; keywords: Record<string, string[]> }> };
      const examplesData = JSON.parse(exRaw) as { intents: Array<{ intent: string; examples: Record<string, string[]> | string[] }> };
      const totalIntents = keywordsData.intents?.length ?? 0;
      const totalKeywords = (keywordsData.intents ?? []).reduce((sum, i) => sum + (Object.values(i.keywords ?? {}).flat().length), 0);
      const totalExamples = (examplesData.intents ?? []).reduce((sum, i) => {
        const ex = i.examples;
        if (Array.isArray(ex)) return sum + ex.length;
        if (ex && typeof ex === 'object') return sum + Object.values(ex).flat().length;
        return sum;
      }, 0);
      res.json({ totalIntents, totalKeywords, totalExamples });
    } catch (err: any) {
      serverError(res, err?.message || 'Failed to get stats');
    }
  }
});

router.get('/intent-manager/export', async (req: Request, res: Response) => {
  try {
    const format = req.query.format || 'json';
    const response = await axios.get(`http://localhost:5000/api/intent-manager/export?format=${format}`, {
      responseType: format === 'csv' ? 'text' : 'json'
    });
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=intents-export.csv');
      res.send(response.data);
    } else {
      res.json(response.data);
    }
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ─── T1: Regex Patterns ─────────────────────────────────────────────

router.get('/intent-manager/regex', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/regex');
    const data = response.data;
    // If backend returned empty array, fall back to local preset file so dashboard shows presets
    if (Array.isArray(data) && data.length === 0) {
      try {
        const raw = await readFile(join(DATA_DIR, 'regex-patterns.json'), 'utf-8');
        const local = JSON.parse(raw);
        if (Array.isArray(local) && local.length > 0) return res.json(local);
      } catch (_) { /* ignore */ }
    }
    res.json(data);
  } catch (e: any) {
    // Fallback: read from Rainbow's local data so dashboard works without backend (5000)
    try {
      const raw = await readFile(join(DATA_DIR, 'regex-patterns.json'), 'utf-8');
      res.json(JSON.parse(raw));
    } catch (err: any) {
      res.status(e.response?.status || 500).json({ error: e.message });
    }
  }
});

router.put('/intent-manager/regex', async (req: Request, res: Response) => {
  try {
    const response = await axios.put('http://localhost:5000/api/intent-manager/regex', req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ─── T4: LLM Settings (local-first: use RainbowAI data so Understanding tab works without port 5000) ───

const defaultLLMSettings = {
  thresholds: { fuzzy: 0.80, semantic: 0.70, layer2: 0.80, llm: 0.60, lowConfidence: 0.50, mediumConfidence: 0.70 },
  defaultProviderId: '' as string,
  selectedProviders: [] as Array<{ id: string; priority: number }>,
  maxTokens: 500,
  temperature: 0.1,
  systemPrompt: '',
  fallbackUnknown: true,
  logFailures: true,
  enableContext: true,
  contextWindows: { classify: 5, reply: 10, combined: 20 }
};

// Local-first: always read from RainbowAI data so Understanding tab works without port 5000 and save never fails due to proxy
router.get('/intent-manager/llm-settings/available-providers', async (_req: Request, res: Response) => {
  try {
    const raw = await readFile(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(raw);
    const providers = (settings.ai?.providers || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      model: p.model,
      base_url: p.base_url,
      enabled: p.enabled,
      description: p.description
    }));
    res.json(providers);
  } catch (err: any) {
    serverError(res, err?.message || 'Failed to read providers');
  }
});

// ─── Tier state (GET/PUT) so Understanding tab can enable/disable AI Fallback ───
router.get('/intent-manager/tiers', async (_req: Request, res: Response) => {
  try {
    const tiers = getIntentConfig().tiers;
    res.json(tiers);
  } catch (err: any) {
    serverError(res, (err as Error).message || 'Failed to get tiers');
  }
});

router.put('/intent-manager/tiers', async (req: Request, res: Response) => {
  const body = req.body as { tiers?: Partial<Record<string, { enabled?: boolean; contextMessages?: number; threshold?: number }>> };
  if (!body || typeof body.tiers !== 'object') {
    return badRequest(res, 'tiers object required');
  }
  try {
    const current = getIntentConfig().tiers;
    const next = {
      tier1_emergency: body.tiers.tier1_emergency ? { ...current.tier1_emergency, ...body.tiers.tier1_emergency } : current.tier1_emergency,
      tier2_fuzzy: body.tiers.tier2_fuzzy ? { ...current.tier2_fuzzy, ...body.tiers.tier2_fuzzy } : current.tier2_fuzzy,
      tier3_semantic: body.tiers.tier3_semantic ? { ...current.tier3_semantic, ...body.tiers.tier3_semantic } : current.tier3_semantic,
      tier4_llm: body.tiers.tier4_llm ? { ...current.tier4_llm, ...body.tiers.tier4_llm } : current.tier4_llm
    };
    updateIntentConfig({ tiers: next });
    const tiersPath = getIntentTiersFilePath();
    await atomicWriteJSON(tiersPath, { tiers: next });
    res.json(next);
  } catch (err: any) {
    serverError(res, (err as Error).message || 'Failed to save tiers');
  }
});

router.get('/intent-manager/llm-settings', async (_req: Request, res: Response) => {
  try {
    const raw = await readFile(LLM_SETTINGS_PATH, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err: any) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      res.json({ ...defaultLLMSettings });
    } else {
      serverError(res, (err as Error).message || 'Failed to read LLM settings');
    }
  }
});

router.put('/intent-manager/llm-settings', async (req: Request, res: Response) => {
  const settings = req.body;
  if (!settings || typeof settings.thresholds !== 'object') {
    return badRequest(res, 'thresholds object required');
  }
  const thresholds = ['fuzzy', 'semantic', 'layer2', 'llm', 'lowConfidence', 'mediumConfidence'];
  for (const key of thresholds) {
    if (settings.thresholds[key] !== undefined) {
      const value = settings.thresholds[key];
      if (typeof value !== 'number' || value < 0 || value > 1) {
        return badRequest(res, `thresholds.${key} must be a number between 0 and 1`);
      }
    }
  }
  if (settings.defaultProviderId !== undefined && settings.defaultProviderId !== null) {
    if (typeof settings.defaultProviderId !== 'string') {
      return badRequest(res, 'defaultProviderId must be a string');
    }
  }
  if (settings.selectedProviders !== undefined) {
    if (!Array.isArray(settings.selectedProviders)) {
      return badRequest(res, 'selectedProviders must be an array');
    }
    for (const sp of settings.selectedProviders) {
      if (!sp.id || typeof sp.id !== 'string') {
        return badRequest(res, 'Each selectedProvider must have an id string');
      }
      if (typeof sp.priority !== 'number') {
        return badRequest(res, 'Each selectedProvider must have a priority number');
      }
    }
  }
  if (settings.contextWindows !== undefined) {
    if (typeof settings.contextWindows !== 'object' || settings.contextWindows === null) {
      return badRequest(res, 'contextWindows must be an object');
    }
    for (const key of ['classify', 'reply', 'combined'] as const) {
      const v = settings.contextWindows[key];
      if (v !== undefined) {
        if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 50) {
          return badRequest(res, `contextWindows.${key} must be an integer between 1 and 50`);
        }
      }
    }
  }
  try {
    await atomicWriteJSON(LLM_SETTINGS_PATH, settings);
    res.json({ success: true, settings });
  } catch (err: any) {
    serverError(res, err?.message || 'Failed to save LLM settings');
  }
});

router.post('/intent-manager/llm-test', async (req: Request, res: Response) => {
  try {
    const response = await axios.post('http://localhost:5000/api/intent-manager/llm-test', req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ─── Template Management ────────────────────────────────────────────────

router.post('/intent-manager/apply-template', async (req: Request, res: Response) => {
  try {
    const { templateId, config } = req.body;

    if (!config || !config.tiers) {
      return badRequest(res, 'Invalid template configuration');
    }

    // Import intent-config module
    const { updateIntentConfig } = await import('../../assistant/intent-config.js');

    // Build configuration object from template
    const newConfig = {
      tiers: {
        tier1_emergency: {
          enabled: config.tiers.tier1_emergency.enabled,
          contextMessages: config.tiers.tier1_emergency.contextMessages
        },
        tier2_fuzzy: {
          enabled: config.tiers.tier2_fuzzy.enabled,
          contextMessages: config.tiers.tier2_fuzzy.contextMessages,
          threshold: config.tiers.tier2_fuzzy.threshold
        },
        tier3_semantic: {
          enabled: config.tiers.tier3_semantic.enabled,
          contextMessages: config.tiers.tier3_semantic.contextMessages,
          threshold: config.tiers.tier3_semantic.threshold
        },
        tier4_llm: {
          enabled: config.tiers.tier4_llm.enabled,
          contextMessages: config.tiers.tier4_llm.contextMessages
        }
      },
      conversationState: config.conversationState || {
        trackLastIntent: true,
        trackSlots: true,
        maxHistoryMessages: 20,
        contextTTL: 30
      }
    };

    // Apply tier + conversation config
    updateIntentConfig(newConfig);

    // Apply LLM settings from template (defaultProviderId, thresholds, maxTokens, temperature)
    if (config.llm && typeof config.llm === 'object') {
      let current: Record<string, unknown>;
      try {
        const raw = await readFile(LLM_SETTINGS_PATH, 'utf-8');
        current = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        current = { ...defaultLLMSettings };
      }
      if (!current.thresholds || typeof current.thresholds !== 'object') {
        current.thresholds = { ...defaultLLMSettings.thresholds };
      }
      const curThresholds = current.thresholds as Record<string, number>;
      if (config.llm.defaultProviderId !== undefined && config.llm.defaultProviderId !== null) {
        current.defaultProviderId = config.llm.defaultProviderId;
      }
      if (config.llm.thresholds && typeof config.llm.thresholds === 'object') {
        for (const k of ['fuzzy', 'semantic', 'layer2', 'llm'] as const) {
          if (typeof (config.llm.thresholds as Record<string, number>)[k] === 'number') {
            curThresholds[k] = (config.llm.thresholds as Record<string, number>)[k];
          }
        }
      }
      if (typeof config.llm.maxTokens === 'number') current.maxTokens = config.llm.maxTokens;
      if (typeof config.llm.temperature === 'number') current.temperature = config.llm.temperature;
      await atomicWriteJSON(LLM_SETTINGS_PATH, current);
      // Sync master classifyProvider in settings.json so T4 and Settings stay aligned
      if (config.llm.defaultProviderId && typeof config.llm.defaultProviderId === 'string') {
        const settings = configStore.getSettings();
        if (settings.routing_mode) {
          settings.routing_mode.classifyProvider = config.llm.defaultProviderId;
          configStore.setSettings(settings);
        }
      }
    }

    console.log(`[IntentManager] Applied template: ${templateId} (${config.name})`);

    res.json({
      success: true,
      message: `Template "${config.name}" applied successfully`,
      config: newConfig
    });
  } catch (e: any) {
    console.error('[IntentManager] Failed to apply template:', e);
    serverError(res, e.message);
  }
});

export default router;
