import { Router } from 'express';
import type { Request, Response } from 'express';
import { configStore } from '../../assistant/config-store.js';
import type { IntentEntry, RoutingAction, RoutingData, WorkflowDefinition, AIProvider } from '../../assistant/config-store.js';
import { deepMerge } from './utils.js';

const router = Router();

// ─── Routing ────────────────────────────────────────────────────────

router.get('/routing', (_req: Request, res: Response) => {
  res.json(configStore.getRouting());
});

router.put('/routing', (req: Request, res: Response) => {
  const data = req.body;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    res.status(400).json({ error: 'routing object required' });
    return;
  }
  const validActions: RoutingAction[] = ['static_reply', 'llm_reply', 'workflow'];
  for (const [intent, cfg] of Object.entries(data)) {
    if (!cfg || typeof (cfg as any).action !== 'string' || !validActions.includes((cfg as any).action)) {
      res.status(400).json({ error: `Invalid action for intent "${intent}". Must be one of: ${validActions.join(', ')}` });
      return;
    }
  }
  configStore.setRouting(data as RoutingData);
  res.json({ ok: true, routing: data });
});

router.patch('/routing/:intent', (req: Request, res: Response) => {
  const { intent } = req.params;
  const { action, workflow_id } = req.body;
  const validActions: RoutingAction[] = ['static_reply', 'llm_reply', 'workflow'];
  if (!action || !validActions.includes(action)) {
    res.status(400).json({ error: `action must be one of: ${validActions.join(', ')}` });
    return;
  }
  const data = { ...configStore.getRouting() };
  const entry: { action: RoutingAction; workflow_id?: string } = { action };
  if (action === 'workflow' && workflow_id) {
    entry.workflow_id = workflow_id;
  }
  data[intent] = entry;
  configStore.setRouting(data);
  res.json({ ok: true, intent, action, workflow_id: entry.workflow_id });
});

// ─── Intents (Skills) ───────────────────────────────────────────────

router.get('/intents', (_req: Request, res: Response) => {
  res.json(configStore.getIntents());
});

router.post('/intents', (req: Request, res: Response) => {
  const { category, patterns, flags, enabled } = req.body;
  if (!category || !Array.isArray(patterns)) {
    res.status(400).json({ error: 'category and patterns[] required' });
    return;
  }
  const data = configStore.getIntents();
  const exists = data.categories.find(c => c.category === category);
  if (exists) {
    res.status(409).json({ error: `Category "${category}" already exists. Use PUT to update.` });
    return;
  }
  const entry: IntentEntry = {
    category,
    patterns,
    flags: flags || 'i',
    enabled: enabled !== false
  };
  data.categories.push(entry);
  configStore.setIntents(data);
  res.json({ ok: true, category, entry });
});

router.put('/intents/:category', (req: Request, res: Response) => {
  const { category } = req.params;
  const data = configStore.getIntents();
  // Search through nested phases → intents structure
  let entry: IntentEntry | undefined;
  for (const phase of data.categories as any[]) {
    const intents = phase.intents || [];
    entry = intents.find((i: IntentEntry) => i.category === category);
    if (entry) break;
  }
  if (!entry) {
    res.status(404).json({ error: `Category "${category}" not found` });
    return;
  }
  if (req.body.patterns !== undefined) entry.patterns = req.body.patterns;
  if (req.body.flags !== undefined) entry.flags = req.body.flags;
  if (req.body.enabled !== undefined) entry.enabled = req.body.enabled;
  if (req.body.min_confidence !== undefined) entry.min_confidence = req.body.min_confidence;

  // Per-tier threshold overrides (Layer 1 enhancement)
  if (req.body.t2_fuzzy_threshold !== undefined) {
    if (req.body.t2_fuzzy_threshold === null) {
      delete (entry as any).t2_fuzzy_threshold; // Remove override
    } else {
      (entry as any).t2_fuzzy_threshold = req.body.t2_fuzzy_threshold;
    }
  }
  if (req.body.t3_semantic_threshold !== undefined) {
    if (req.body.t3_semantic_threshold === null) {
      delete (entry as any).t3_semantic_threshold; // Remove override
    } else {
      (entry as any).t3_semantic_threshold = req.body.t3_semantic_threshold;
    }
  }

  configStore.setIntents(data);
  res.json({ ok: true, category, entry });
});

router.delete('/intents/:category', (req: Request, res: Response) => {
  const { category } = req.params;
  const data = configStore.getIntents();
  // Search through nested phases → intents structure
  let found = false;
  for (const phase of data.categories as any[]) {
    const intents = phase.intents || [];
    const idx = intents.findIndex((i: IntentEntry) => i.category === category);
    if (idx !== -1) {
      intents.splice(idx, 1);
      found = true;
      break;
    }
  }
  if (!found) {
    res.status(404).json({ error: `Category "${category}" not found` });
    return;
  }
  configStore.setIntents(data);
  res.json({ ok: true, deleted: category });
});

// ─── Templates ──────────────────────────────────────────────────────

router.get('/templates', (_req: Request, res: Response) => {
  res.json(configStore.getTemplates());
});

router.post('/templates', (req: Request, res: Response) => {
  const { key, en, ms, zh } = req.body;
  if (!key || !en) {
    res.status(400).json({ error: 'key and en required' });
    return;
  }
  const data = configStore.getTemplates();
  if (data[key]) {
    res.status(409).json({ error: `Template "${key}" already exists. Use PUT to update.` });
    return;
  }
  data[key] = { en, ms: ms || '', zh: zh || '' };
  configStore.setTemplates(data);
  res.json({ ok: true, key });
});

router.put('/templates/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const data = configStore.getTemplates();
  if (!data[key]) {
    res.status(404).json({ error: `Template "${key}" not found` });
    return;
  }
  if (req.body.en !== undefined) data[key].en = req.body.en;
  if (req.body.ms !== undefined) data[key].ms = req.body.ms;
  if (req.body.zh !== undefined) data[key].zh = req.body.zh;
  configStore.setTemplates(data);
  res.json({ ok: true, key, template: data[key] });
});

router.delete('/templates/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const data = configStore.getTemplates();
  if (!data[key]) {
    res.status(404).json({ error: `Template "${key}" not found` });
    return;
  }
  delete data[key];
  configStore.setTemplates(data);
  res.json({ ok: true, deleted: key });
});

// ─── Settings ───────────────────────────────────────────────────────

router.get('/settings', (_req: Request, res: Response) => {
  res.json(configStore.getSettings());
});

router.patch('/settings', (req: Request, res: Response) => {
  const current = configStore.getSettings();
  const merged = deepMerge(current, req.body);
  configStore.setSettings(merged);
  res.json({ ok: true, settings: merged });
});

// ─── AI Providers Management ─────────────────────────────────────────

router.put('/settings/providers', (req: Request, res: Response) => {
  const providers = req.body;
  if (!Array.isArray(providers)) {
    res.status(400).json({ error: 'providers array required' });
    return;
  }
  const settings = configStore.getSettings();
  settings.ai.providers = providers;
  configStore.setSettings(settings);
  res.json({ ok: true, providers: settings.ai.providers });
});

router.post('/settings/providers', (req: Request, res: Response) => {
  const { id, name, description, type, api_key_env, api_key, base_url, model, enabled } = req.body;
  if (!id || !name || !type || !base_url || !model) {
    res.status(400).json({ error: 'id, name, type, base_url, and model required' });
    return;
  }
  const validTypes = ['openai-compatible', 'groq', 'ollama'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    return;
  }
  const settings = configStore.getSettings();
  if (!settings.ai.providers) settings.ai.providers = [];
  if (settings.ai.providers.find(p => p.id === id)) {
    res.status(409).json({ error: `Provider "${id}" already exists` });
    return;
  }
  const maxPriority = settings.ai.providers.reduce((max, p) => Math.max(max, p.priority), -1);
  const newProvider: AIProvider = {
    id: id.trim().toLowerCase().replace(/\s+/g, '-'),
    name: name.trim(),
    type,
    api_key_env: api_key_env || '',
    base_url: base_url.trim(),
    model: model.trim(),
    enabled: enabled !== false,
    priority: maxPriority + 1
  };
  if (api_key) newProvider.api_key = api_key;
  if (description) newProvider.description = description;
  settings.ai.providers.push(newProvider);
  configStore.setSettings(settings);
  res.json({ ok: true, provider: newProvider });
});

router.delete('/settings/providers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const settings = configStore.getSettings();
  if (!settings.ai.providers) {
    res.status(404).json({ error: `Provider "${id}" not found` });
    return;
  }
  const idx = settings.ai.providers.findIndex(p => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: `Provider "${id}" not found` });
    return;
  }
  settings.ai.providers.splice(idx, 1);
  configStore.setSettings(settings);
  res.json({ ok: true, deleted: id });
});

// ─── Workflow ───────────────────────────────────────────────────────

router.get('/workflow', (_req: Request, res: Response) => {
  res.json(configStore.getWorkflow());
});

router.patch('/workflow', (req: Request, res: Response) => {
  const current = configStore.getWorkflow();
  const merged = deepMerge(current, req.body);
  configStore.setWorkflow(merged);
  res.json({ ok: true, workflow: merged });
});

// ─── Workflows (Step Definitions) ────────────────────────────────

router.get('/workflows', (_req: Request, res: Response) => {
  res.json(configStore.getWorkflows());
});

router.get('/workflows/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = configStore.getWorkflows();
  const wf = data.workflows.find(w => w.id === id);
  if (!wf) {
    res.status(404).json({ error: `Workflow "${id}" not found` });
    return;
  }
  res.json(wf);
});

router.post('/workflows', (req: Request, res: Response) => {
  const { id, name, steps } = req.body;
  if (!id || typeof id !== 'string' || !name || typeof name !== 'string') {
    res.status(400).json({ error: 'id and name required' });
    return;
  }
  const data = configStore.getWorkflows();
  if (data.workflows.find(w => w.id === id)) {
    res.status(409).json({ error: `Workflow "${id}" already exists` });
    return;
  }
  const newWf: WorkflowDefinition = {
    id: id.trim().toLowerCase().replace(/\s+/g, '_'),
    name: name.trim(),
    steps: Array.isArray(steps) ? steps : []
  };
  data.workflows.push(newWf);
  configStore.setWorkflows(data);
  res.json({ ok: true, workflow: newWf });
});

router.put('/workflows/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = configStore.getWorkflows();
  const idx = data.workflows.findIndex(w => w.id === id);
  if (idx === -1) {
    res.status(404).json({ error: `Workflow "${id}" not found` });
    return;
  }
  if (req.body.name !== undefined) data.workflows[idx].name = req.body.name;
  if (req.body.steps !== undefined) data.workflows[idx].steps = req.body.steps;
  configStore.setWorkflows(data);
  res.json({ ok: true, workflow: data.workflows[idx] });
});

router.delete('/workflows/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const routing = configStore.getRouting();
  const refs = Object.entries(routing).filter(([, cfg]) => cfg.action === 'workflow' && cfg.workflow_id === id);
  if (refs.length > 0) {
    const intentNames = refs.map(([intent]) => intent).join(', ');
    res.status(409).json({ error: `Cannot delete: workflow "${id}" is referenced by intents: ${intentNames}` });
    return;
  }
  const data = configStore.getWorkflows();
  const idx = data.workflows.findIndex(w => w.id === id);
  if (idx === -1) {
    res.status(404).json({ error: `Workflow "${id}" not found` });
    return;
  }
  data.workflows.splice(idx, 1);
  configStore.setWorkflows(data);
  res.json({ ok: true, deleted: id });
});

export default router;
