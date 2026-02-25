import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const router = express.Router();

// Paths to data files (RainbowAI in this repo; fallback to mcp-server for compatibility)
const DATA_DIR = join(process.cwd(), 'RainbowAI/src/assistant/data');
const MCP_DATA_DIR = join(process.cwd(), 'mcp-server/src/assistant/data');
const KEYWORDS_PATH = join(DATA_DIR, 'intent-keywords.json');
const EXAMPLES_PATH = join(DATA_DIR, 'intent-examples.json');
const REGEX_PATH = join(DATA_DIR, 'regex-patterns.json');
const LLM_SETTINGS_PATH = join(DATA_DIR, 'llm-settings.json');

// ─── Get All Keywords ─────────────────────────────────────────────────

router.get('/keywords', async (req, res) => {
  try {
    const data = await readFile(KEYWORDS_PATH, 'utf-8');
    const keywords = JSON.parse(data);
    res.json(keywords);
  } catch (error) {
    console.error('Error reading keywords:', error);
    res.status(500).json({ error: 'Failed to read keywords' });
  }
});

// ─── Get All Training Examples ────────────────────────────────────────

router.get('/examples', async (req, res) => {
  try {
    const data = await readFile(EXAMPLES_PATH, 'utf-8');
    const examples = JSON.parse(data);
    res.json(examples);
  } catch (error) {
    console.error('Error reading examples:', error);
    res.status(500).json({ error: 'Failed to read examples' });
  }
});

// ─── Update Intent Keywords ───────────────────────────────────────────

router.put('/keywords/:intent', async (req, res) => {
  try {
    const { intent } = req.params;
    const { keywords } = req.body;

    // Read current keywords
    const data = await readFile(KEYWORDS_PATH, 'utf-8');
    const keywordsData = JSON.parse(data);

    // Find and update intent
    const intentIndex = keywordsData.intents.findIndex((i: any) => i.intent === intent);

    if (intentIndex === -1) {
      return res.status(404).json({ error: 'Intent not found' });
    }

    keywordsData.intents[intentIndex].keywords = keywords;

    // Save back to file
    await writeFile(KEYWORDS_PATH, JSON.stringify(keywordsData, null, 2));

    res.json({ success: true, intent, keywords });
  } catch (error) {
    console.error('Error updating keywords:', error);
    res.status(500).json({ error: 'Failed to update keywords' });
  }
});

// ─── Update Intent Training Examples ──────────────────────────────────

router.put('/examples/:intent', async (req, res) => {
  try {
    const { intent } = req.params;
    const { examples } = req.body;

    // Read current examples
    const data = await readFile(EXAMPLES_PATH, 'utf-8');
    const examplesData = JSON.parse(data);

    // Find and update intent
    const intentIndex = examplesData.intents.findIndex((i: any) => i.intent === intent);

    if (intentIndex === -1) {
      return res.status(404).json({ error: 'Intent not found' });
    }

    examplesData.intents[intentIndex].examples = examples;

    // Save back to file
    await writeFile(EXAMPLES_PATH, JSON.stringify(examplesData, null, 2));

    res.json({ success: true, intent, examples });
  } catch (error) {
    console.error('Error updating examples:', error);
    res.status(500).json({ error: 'Failed to update examples' });
  }
});

// ─── Test Intent Classification ───────────────────────────────────────

router.post('/test', async (req, res) => {
  try {
    const { text } = req.body;

    // Dynamic import with runtime fallback to keep compatibility across layouts.
    const candidates = [
      '../../RainbowAI/src/assistant/intents.ts',
      '../../RainbowAI/src/assistant/intents.js',
      '../../mcp-server/src/assistant/intents.js',
    ];
    let classifyMessage: any;
    for (const candidate of candidates) {
      try {
        const mod = await import(candidate);
        if (typeof (mod as any).classifyMessage === 'function') {
          classifyMessage = (mod as any).classifyMessage;
          break;
        }
      } catch {
        // Try next candidate path.
      }
    }
    if (!classifyMessage) {
      return res.status(500).json({ error: 'Intent engine module not found' });
    }

    const result = await classifyMessage(text);

    res.json({
      intent: result.category,
      confidence: result.confidence,
      source: result.source,
      detectedLanguage: result.detectedLanguage,
      matchedKeyword: result.matchedKeyword,
      matchedExample: result.matchedExample
    });
  } catch (error) {
    console.error('Error testing intent:', error);
    res.status(500).json({ error: 'Failed to test intent' });
  }
});

// ─── Get Intent Statistics ────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const keywordsData = JSON.parse(await readFile(KEYWORDS_PATH, 'utf-8'));
    const examplesData = JSON.parse(await readFile(EXAMPLES_PATH, 'utf-8'));

    const exampleCount = (ex: any) =>
      Array.isArray(ex) ? ex.length : (ex && typeof ex === 'object' ? Object.values(ex).flat().length : 0);

    const stats = {
      totalIntents: keywordsData.intents.length,
      totalKeywords: keywordsData.intents.reduce((sum: number, intent: any) => {
        const keywordCount = Object.values(intent.keywords).flat().length;
        return sum + keywordCount;
      }, 0),
      totalExamples: examplesData.intents.reduce((sum: number, intent: any) => sum + exampleCount(intent.examples), 0),
      byIntent: keywordsData.intents.map((intent: any) => {
        const exampleIntent = examplesData.intents.find((e: any) => e.intent === intent.intent);
        return {
          intent: intent.intent,
          keywordCount: Object.values(intent.keywords).flat().length,
          exampleCount: exampleIntent ? exampleCount(exampleIntent.examples) : 0
        };
      })
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ─── Export Keywords/Examples ─────────────────────────────────────────

router.get('/export', async (req, res) => {
  try {
    const format = req.query.format || 'json';

    const keywordsData = JSON.parse(await readFile(KEYWORDS_PATH, 'utf-8'));
    const examplesData = JSON.parse(await readFile(EXAMPLES_PATH, 'utf-8'));

    const exportData = {
      keywords: keywordsData,
      examples: examplesData,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    if (format === 'csv') {
      // Convert to CSV format
      let csv = 'Intent,Language,Keyword/Example,Type\n';

      // Add keywords
      keywordsData.intents.forEach((intent: any) => {
        Object.entries(intent.keywords).forEach(([lang, keywords]: [string, any]) => {
          keywords.forEach((keyword: string) => {
            csv += `${intent.intent},${lang},"${keyword}",keyword\n`;
          });
        });
      });

      // Add examples
      examplesData.intents.forEach((intent: any) => {
        intent.examples.forEach((example: string) => {
          csv += `${intent.intent},en,"${example}",example\n`;
        });
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=intents-export.csv');
      res.send(csv);
    } else {
      res.json(exportData);
    }
  } catch (error) {
    console.error('Error exporting:', error);
    res.status(500).json({ error: 'Failed to export' });
  }
});

// ─── T1: Regex Patterns Management ────────────────────────────────────

router.get('/regex', async (req, res) => {
  try {
    const data = await readFile(REGEX_PATH, 'utf-8');
    const patterns = JSON.parse(data);
    res.json(patterns);
  } catch (error: any) {
    // If file doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      console.error('Error reading regex patterns:', error);
      res.status(500).json({ error: 'Failed to read regex patterns' });
    }
  }
});

router.put('/regex', async (req, res) => {
  try {
    const { patterns } = req.body;

    if (!Array.isArray(patterns)) {
      return res.status(400).json({ error: 'patterns array required' });
    }

    const allowedLangs = ['en', 'ms', 'zh'];
    const allowedTypes = ['complaint', 'theft', 'card_locked'];

    // Validate regex patterns
    for (const item of patterns) {
      if (!item.pattern || typeof item.pattern !== 'string') {
        return res.status(400).json({ error: 'Each pattern must have a pattern string' });
      }
      if (item.language != null && !allowedLangs.includes(item.language)) {
        return res.status(400).json({ error: `language must be one of: ${allowedLangs.join(', ')}` });
      }
      if (item.emergencyType != null && !allowedTypes.includes(item.emergencyType)) {
        return res.status(400).json({ error: `emergencyType must be one of: ${allowedTypes.join(', ')}` });
      }

      // Validate regex syntax
      try {
        if (item.pattern.startsWith('/')) {
          const parts = item.pattern.match(/^\/(.+?)\/([gimuy]*)$/);
          if (!parts) throw new Error('Invalid regex format');
          new RegExp(parts[1], parts[2]);
        } else {
          new RegExp(item.pattern);
        }
      } catch (err: any) {
        return res.status(400).json({ error: `Invalid regex "${item.pattern}": ${err.message}` });
      }
    }

    // Save to file
    await writeFile(REGEX_PATH, JSON.stringify(patterns, null, 2));

    res.json({ success: true, patterns });
  } catch (error) {
    console.error('Error saving regex patterns:', error);
    res.status(500).json({ error: 'Failed to save regex patterns' });
  }
});

// ─── T4: LLM Settings Management ───────────────────────────────────────

const SETTINGS_PATH = join(process.cwd(), 'mcp-server/src/assistant/data/settings.json');

router.get('/llm-settings', async (req, res) => {
  try {
    const data = await readFile(LLM_SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(data);
    res.json(settings);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      const defaultSettings = {
        thresholds: { fuzzy: 0.80, semantic: 0.70, llm: 0.60 },
        selectedProviders: [],
        maxTokens: 500,
        temperature: 0.3,
        systemPrompt: '',
        fallbackUnknown: true,
        logFailures: true,
        enableContext: true
      };
      res.json(defaultSettings);
    } else {
      console.error('Error reading LLM settings:', error);
      res.status(500).json({ error: 'Failed to read LLM settings' });
    }
  }
});

router.get('/llm-settings/available-providers', async (req, res) => {
  try {
    const data = await readFile(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(data);
    const providers = (settings.ai?.providers || []).map((p: any) => ({
      id: p.id, name: p.name, type: p.type, model: p.model,
      base_url: p.base_url, enabled: p.enabled, description: p.description
    }));
    res.json(providers);
  } catch (error) {
    console.error('Error reading providers:', error);
    res.status(500).json({ error: 'Failed to read providers' });
  }
});

router.put('/llm-settings', async (req, res) => {
  try {
    const settings = req.body;

    if (!settings.thresholds || typeof settings.thresholds !== 'object') {
      return res.status(400).json({ error: 'thresholds object required' });
    }

    // Validate thresholds are between 0 and 1
    const thresholds = ['fuzzy', 'semantic', 'llm'];
    for (const key of thresholds) {
      const value = settings.thresholds[key];
      if (typeof value !== 'number' || value < 0 || value > 1) {
        return res.status(400).json({ error: `thresholds.${key} must be a number between 0 and 1` });
      }
    }

    // Validate selectedProviders if present
    if (settings.selectedProviders !== undefined) {
      if (!Array.isArray(settings.selectedProviders)) {
        return res.status(400).json({ error: 'selectedProviders must be an array' });
      }
      for (const sp of settings.selectedProviders) {
        if (!sp.id || typeof sp.id !== 'string') {
          return res.status(400).json({ error: 'Each selectedProvider must have an id string' });
        }
        if (typeof sp.priority !== 'number') {
          return res.status(400).json({ error: 'Each selectedProvider must have a priority number' });
        }
      }
    }

    // Save to file
    await writeFile(LLM_SETTINGS_PATH, JSON.stringify(settings, null, 2));

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error saving LLM settings:', error);
    res.status(500).json({ error: 'Failed to save LLM settings' });
  }
});

router.post('/llm-test', async (req, res) => {
  try {
    const { providerId } = req.body;

    if (!providerId) {
      return res.status(400).json({ error: 'providerId required' });
    }

    const candidates = [
      '../../RainbowAI/src/assistant/ai-client.ts',
      '../../RainbowAI/src/assistant/ai-client.js',
      '../../mcp-server/src/assistant/ai-client.js',
    ];
    let testProvider: any;
    for (const candidate of candidates) {
      try {
        const mod = await import(candidate);
        if (typeof (mod as any).testProvider === 'function') {
          testProvider = (mod as any).testProvider;
          break;
        }
      } catch {
        // Try next candidate path.
      }
    }
    if (!testProvider) {
      return res.status(500).json({ error: 'LLM provider module not found' });
    }

    const result = await testProvider(providerId);
    res.json(result);
  } catch (error: any) {
    console.error('Error testing LLM:', error);
    res.status(500).json({ error: 'Failed to test LLM connection' });
  }
});

export default router;
