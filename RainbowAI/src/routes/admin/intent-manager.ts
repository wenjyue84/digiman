import { Router } from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../assistant/data');

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
      res.status(500).json({ error: err?.message || 'Failed to read keywords' });
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
      res.status(500).json({ error: err?.message || 'Failed to read examples' });
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
      const examplesData = JSON.parse(exRaw) as { intents: Array<{ intent: string; examples: string[] }> };
      const totalIntents = keywordsData.intents?.length ?? 0;
      const totalKeywords = (keywordsData.intents ?? []).reduce((sum, i) => sum + (Object.values(i.keywords ?? {}).flat().length), 0);
      const totalExamples = (examplesData.intents ?? []).reduce((sum, i) => sum + (i.examples?.length ?? 0), 0);
      res.json({ totalIntents, totalKeywords, totalExamples });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to get stats' });
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

// ─── T4: LLM Settings ───────────────────────────────────────────────

router.get('/intent-manager/llm-settings/available-providers', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/llm-settings/available-providers');
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.get('/intent-manager/llm-settings', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get('http://localhost:5000/api/intent-manager/llm-settings');
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

router.put('/intent-manager/llm-settings', async (req: Request, res: Response) => {
  try {
    const response = await axios.put('http://localhost:5000/api/intent-manager/llm-settings', req.body);
    res.json(response.data);
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
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
      return res.status(400).json({ error: 'Invalid template configuration' });
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

    // Apply configuration
    updateIntentConfig(newConfig);

    console.log(`[IntentManager] Applied template: ${templateId} (${config.name})`);

    res.json({
      success: true,
      message: `Template "${config.name}" applied successfully`,
      config: newConfig
    });
  } catch (e: any) {
    console.error('[IntentManager] Failed to apply template:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
