import { Router } from 'express';
import type { Request, Response } from 'express';
import { configStore } from '../../assistant/config-store.js';
import type { IntentEntry, RoutingAction, RoutingData, WorkflowDefinition, AIProvider } from '../../assistant/config-store.js';
import { deepMerge } from './utils.js';
import { ok, badRequest, notFound, conflict, serverError } from './http-utils.js';

const router = Router();

// ─── Routing ────────────────────────────────────────────────────────

router.get('/routing', (_req: Request, res: Response) => {
  res.json(configStore.getRouting());
});

router.put('/routing', (req: Request, res: Response) => {
  const data = req.body;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    badRequest(res, 'routing object required');
    return;
  }
  const validActions: RoutingAction[] = ['static_reply', 'llm_reply', 'workflow'];
  for (const [intent, cfg] of Object.entries(data)) {
    if (!cfg || typeof (cfg as any).action !== 'string' || !validActions.includes((cfg as any).action)) {
      badRequest(res, `Invalid action for intent "${intent}". Must be one of: ${validActions.join(', ')}`);
      return;
    }
  }
  configStore.setRouting(data as RoutingData);
  ok(res, { routing: data });
});

router.patch('/routing/:intent', (req: Request, res: Response) => {
  const { intent } = req.params;
  const { action, workflow_id } = req.body;
  const validActions: RoutingAction[] = ['static_reply', 'llm_reply', 'workflow'];
  if (!action || !validActions.includes(action)) {
    badRequest(res, `action must be one of: ${validActions.join(', ')}`);
    return;
  }
  const data = { ...configStore.getRouting() };
  const entry: { action: RoutingAction; workflow_id?: string } = { action };
  if (action === 'workflow' && workflow_id) {
    entry.workflow_id = workflow_id;
  }
  data[intent] = entry;
  configStore.setRouting(data);
  ok(res, { intent, action, workflow_id: entry.workflow_id });
});

// ─── Intents (Skills) ───────────────────────────────────────────────

router.get('/intents', (_req: Request, res: Response) => {
  res.json(configStore.getIntents());
});

router.post('/intents', (req: Request, res: Response) => {
  const { category, patterns, flags, enabled, time_sensitive } = req.body;
  if (!category || !Array.isArray(patterns)) {
    badRequest(res, 'category and patterns[] required');
    return;
  }
  const data = configStore.getIntents();
  const exists = data.categories.find((c: any) => c.category === category);
  if (exists) {
    conflict(res, `Category "${category}" already exists. Use PUT to update.`);
    return;
  }
  const entry: IntentEntry = {
    category,
    patterns,
    flags: flags || 'i',
    enabled: enabled !== false,
    ...(time_sensitive !== undefined && { time_sensitive: Boolean(time_sensitive) })
  };
  data.categories.push(entry);
  configStore.setIntents(data);
  ok(res, { category, entry });
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
    notFound(res, `Category "${category}"`);
    return;
  }
  if (req.body.patterns !== undefined) entry.patterns = req.body.patterns;
  if (req.body.flags !== undefined) entry.flags = req.body.flags;
  if (req.body.enabled !== undefined) entry.enabled = req.body.enabled;
  if (req.body.min_confidence !== undefined) entry.min_confidence = req.body.min_confidence;
  if (req.body.time_sensitive !== undefined) (entry as any).time_sensitive = Boolean(req.body.time_sensitive);

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
  ok(res, { category, entry });
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
    notFound(res, `Category "${category}"`);
    return;
  }
  configStore.setIntents(data);
  ok(res, { deleted: category });
});

// ─── Templates ──────────────────────────────────────────────────────

router.get('/templates', (_req: Request, res: Response) => {
  res.json(configStore.getTemplates());
});

router.post('/templates', (req: Request, res: Response) => {
  const { key, en, ms, zh } = req.body;
  if (!key || !en) {
    badRequest(res, 'key and en required');
    return;
  }
  const data = configStore.getTemplates();
  if (data[key]) {
    conflict(res, `Template "${key}" already exists. Use PUT to update.`);
    return;
  }
  data[key] = { en, ms: ms || '', zh: zh || '' };
  configStore.setTemplates(data);
  ok(res, { key });
});

router.put('/templates/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const data = configStore.getTemplates();
  if (!data[key]) {
    notFound(res, `Template "${key}"`);
    return;
  }
  if (req.body.en !== undefined) data[key].en = req.body.en;
  if (req.body.ms !== undefined) data[key].ms = req.body.ms;
  if (req.body.zh !== undefined) data[key].zh = req.body.zh;
  configStore.setTemplates(data);
  ok(res, { key, template: data[key] });
});

router.delete('/templates/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const data = configStore.getTemplates();
  if (!data[key]) {
    notFound(res, `Template "${key}"`);
    return;
  }
  delete data[key];
  configStore.setTemplates(data);
  ok(res, { deleted: key });
});

// ─── Settings ───────────────────────────────────────────────────────

router.get('/settings', (_req: Request, res: Response) => {
  const settings = JSON.parse(JSON.stringify(configStore.getSettings()));

  if (settings.ai && Array.isArray(settings.ai.providers)) {
    settings.ai.providers = settings.ai.providers.map((p: any) => ({
      ...p,
      // Ollama does not require an API key (local or remote)
      available: Boolean(
        p.type === 'ollama' ||
        (p.api_key_env && process.env[p.api_key_env]) ||
        p.api_key
      )
    }));
  }

  res.json(settings);
});

router.patch('/settings', (req: Request, res: Response) => {
  const current = configStore.getSettings();
  const merged = deepMerge(current, req.body);
  configStore.setSettings(merged);
  ok(res, { settings: merged });
});

// ─── AI Providers Management ─────────────────────────────────────────

router.put('/settings/providers', (req: Request, res: Response) => {
  const providers = req.body;
  if (!Array.isArray(providers)) {
    badRequest(res, 'providers array required');
    return;
  }
  const settings = configStore.getSettings();
  settings.ai.providers = providers;
  configStore.setSettings(settings);
  ok(res, { providers: settings.ai.providers });
});

router.post('/settings/providers', (req: Request, res: Response) => {
  const { id, name, description, type, api_key_env, api_key, base_url, model, enabled } = req.body;
  if (!id || !name || !type || !base_url || !model) {
    badRequest(res, 'id, name, type, base_url, and model required');
    return;
  }
  const validTypes = ['openai-compatible', 'groq', 'ollama'];
  if (!validTypes.includes(type)) {
    badRequest(res, `type must be one of: ${validTypes.join(', ')}`);
    return;
  }
  const settings = configStore.getSettings();
  if (!settings.ai.providers) settings.ai.providers = [];
  if (settings.ai.providers.find(p => p.id === id)) {
    conflict(res, `Provider "${id}" already exists`);
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
  ok(res, { provider: newProvider });
});

router.delete('/settings/providers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const settings = configStore.getSettings();
  if (!settings.ai.providers) {
    notFound(res, `Provider "${id}"`);
    return;
  }
  const idx = settings.ai.providers.findIndex(p => p.id === id);
  if (idx === -1) {
    notFound(res, `Provider "${id}"`);
    return;
  }
  settings.ai.providers.splice(idx, 1);
  configStore.setSettings(settings);
  ok(res, { deleted: id });
});

router.patch('/settings/providers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const settings = configStore.getSettings();
  if (!settings.ai.providers) {
    notFound(res, `Provider "${id}"`);
    return;
  }
  const provider = settings.ai.providers.find(p => p.id === id);
  if (!provider) {
    notFound(res, `Provider "${id}"`);
    return;
  }

  if (req.body.enabled !== undefined) provider.enabled = req.body.enabled;
  if (req.body.priority !== undefined) provider.priority = req.body.priority;
  if (req.body.name !== undefined) provider.name = req.body.name;
  if (req.body.model !== undefined) provider.model = req.body.model;

  configStore.setSettings(settings);
  ok(res, { provider });
});

// ─── Workflow ───────────────────────────────────────────────────────

router.get('/workflow', (_req: Request, res: Response) => {
  res.json(configStore.getWorkflow());
});

router.patch('/workflow', (req: Request, res: Response) => {
  const current = configStore.getWorkflow();
  const merged = deepMerge(current, req.body);
  configStore.setWorkflow(merged);
  ok(res, { workflow: merged });
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
    notFound(res, `Workflow "${id}"`);
    return;
  }
  res.json(wf);
});

router.post('/workflows', (req: Request, res: Response) => {
  const { id, name, steps } = req.body;
  if (!id || typeof id !== 'string' || !name || typeof name !== 'string') {
    badRequest(res, 'id and name required');
    return;
  }
  const data = configStore.getWorkflows();
  if (data.workflows.find(w => w.id === id)) {
    conflict(res, `Workflow "${id}" already exists`);
    return;
  }
  const newWf: WorkflowDefinition = {
    id: id.trim().toLowerCase().replace(/\s+/g, '_'),
    name: name.trim(),
    steps: Array.isArray(steps) ? steps : []
  };
  data.workflows.push(newWf);
  configStore.setWorkflows(data);
  ok(res, { workflow: newWf });
});

router.put('/workflows/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = configStore.getWorkflows();
  const idx = data.workflows.findIndex(w => w.id === id);
  if (idx === -1) {
    notFound(res, `Workflow "${id}"`);
    return;
  }
  if (req.body.name !== undefined) data.workflows[idx].name = req.body.name;
  if (req.body.steps !== undefined) data.workflows[idx].steps = req.body.steps;
  configStore.setWorkflows(data);
  ok(res, { workflow: data.workflows[idx] });
});

// Update a single workflow step's message (inline edit from simulator)
router.patch('/workflows/:id/steps/:stepId', (req: Request, res: Response) => {
  const { id, stepId } = req.params;
  const { message } = req.body;
  if (!message || typeof message !== 'object') {
    badRequest(res, 'message object with en/ms/zh required');
    return;
  }
  const data = configStore.getWorkflows();
  const workflow = data.workflows.find(w => w.id === id);
  if (!workflow) {
    notFound(res, `Workflow "${id}"`);
    return;
  }
  const step = workflow.steps.find(s => s.id === stepId);
  if (!step) {
    notFound(res, `Step "${stepId}" in workflow "${id}"`);
    return;
  }
  if (message.en !== undefined) step.message.en = message.en;
  if (message.ms !== undefined) step.message.ms = message.ms;
  if (message.zh !== undefined) step.message.zh = message.zh;
  configStore.setWorkflows(data);
  ok(res, { workflowId: id, stepId, message: step.message });
});

router.delete('/workflows/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const routing = configStore.getRouting();
  const refs = Object.entries(routing).filter(([, cfg]) => cfg.action === 'workflow' && cfg.workflow_id === id);
  if (refs.length > 0) {
    const intentNames = refs.map(([intent]) => intent).join(', ');
    conflict(res, `Cannot delete: workflow "${id}" is referenced by intents: ${intentNames}`);
    return;
  }
  const data = configStore.getWorkflows();
  const idx = data.workflows.findIndex(w => w.id === id);
  if (idx === -1) {
    notFound(res, `Workflow "${id}"`);
    return;
  }
  data.workflows.splice(idx, 1);
  configStore.setWorkflows(data);
  ok(res, { deleted: id });
});

export default router;
