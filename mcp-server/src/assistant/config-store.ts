import { EventEmitter } from 'events';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { IntentCategory } from './types.js';

// ─── Types ──────────────────────────────────────────────────────────

export interface KnowledgeData {
  static: Array<{
    intent: string;
    response: { en: string; ms: string; zh: string };
  }>;
  dynamic: Record<string, string>;
}

export interface IntentEntry {
  category: string;
  patterns: string[];
  flags: string;
  enabled: boolean;
}

export interface IntentsData {
  categories: IntentEntry[];
}

export interface TemplatesData {
  [key: string]: { en: string; ms: string; zh: string };
}

export interface AIProvider {
  id: string;
  name: string;
  description?: string;
  type: 'openai-compatible' | 'groq' | 'ollama';
  api_key_env: string;
  api_key?: string;
  base_url: string;
  model: string;
  enabled: boolean;
  priority: number;
}

export interface SettingsData {
  ai: {
    nvidia_model: string;
    nvidia_base_url: string;
    groq_model: string;
    max_classify_tokens: number;
    max_chat_tokens: number;
    classify_temperature: number;
    chat_temperature: number;
    providers?: AIProvider[];
  };
  system_prompt: string;
  rate_limits: {
    per_minute: number;
    per_hour: number;
  };
  staff: {
    phones: string[];
    jay_phone: string;
    alston_phone: string;
  };
}

export type RoutingAction = 'static_reply' | 'llm_reply' | 'workflow';

export type RoutingData = Record<string, { action: RoutingAction; workflow_id?: string }>;

export interface WorkflowStep {
  id: string;
  message: { en: string; ms: string; zh: string };
  waitForReply: boolean;

  // Optional action to execute before/after sending message
  action?: {
    type: 'send_to_staff' | 'escalate' | 'forward_payment' |
          'check_availability' | 'check_lower_deck' | 'get_police_gps';
    params?: Record<string, any>;
  };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

export interface WorkflowsData {
  workflows: WorkflowDefinition[];
}

export interface WorkflowData {
  escalation: {
    timeout_ms: number;
    unknown_threshold: number;
    primary_phone: string;
    secondary_phone: string;
  };
  payment: {
    forward_to: string;
    receipt_patterns: string[];
  };
  booking: {
    enabled: boolean;
    max_guests_auto: number;
  };
  non_text_handling: {
    enabled: boolean;
  };
}

// ─── Resolve data directory ─────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, 'data');

// ─── Config Store ───────────────────────────────────────────────────

class ConfigStore extends EventEmitter {
  private knowledge!: KnowledgeData;
  private intents!: IntentsData;
  private templates!: TemplatesData;
  private settings!: SettingsData;
  private workflow!: WorkflowData;
  private workflows!: WorkflowsData;
  private routing!: RoutingData;

  constructor() {
    super();
  }

  init(): void {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    this.knowledge = this.loadJSON<KnowledgeData>('knowledge.json');
    this.intents = this.loadJSON<IntentsData>('intents.json');
    this.templates = this.loadJSON<TemplatesData>('templates.json');
    this.settings = this.loadJSON<SettingsData>('settings.json');
    this.workflow = this.loadJSON<WorkflowData>('workflow.json');
    this.workflows = this.loadJSON<WorkflowsData>('workflows.json');
    this.routing = this.loadJSON<RoutingData>('routing.json');
    console.log('[ConfigStore] All config files loaded');
  }

  // ─── Getters ────────────────────────────────────────────────────

  getKnowledge(): KnowledgeData {
    return this.knowledge;
  }

  getIntents(): IntentsData {
    return this.intents;
  }

  getTemplates(): TemplatesData {
    return this.templates;
  }

  getSettings(): SettingsData {
    return this.settings;
  }

  getWorkflow(): WorkflowData {
    return this.workflow;
  }

  getWorkflows(): WorkflowsData {
    return this.workflows;
  }

  getRouting(): RoutingData {
    return this.routing;
  }

  // ─── Setters (save + emit reload) ───────────────────────────────

  setKnowledge(data: KnowledgeData): void {
    this.knowledge = data;
    this.saveJSON('knowledge.json', data);
    this.emit('reload', 'knowledge');
  }

  setIntents(data: IntentsData): void {
    this.intents = data;
    this.saveJSON('intents.json', data);
    this.emit('reload', 'intents');
  }

  setTemplates(data: TemplatesData): void {
    this.templates = data;
    this.saveJSON('templates.json', data);
    this.emit('reload', 'templates');
  }

  setSettings(data: SettingsData): void {
    this.settings = data;
    this.saveJSON('settings.json', data);
    this.emit('reload', 'settings');
  }

  setWorkflow(data: WorkflowData): void {
    this.workflow = data;
    this.saveJSON('workflow.json', data);
    this.emit('reload', 'workflow');
  }

  setWorkflows(data: WorkflowsData): void {
    this.workflows = data;
    this.saveJSON('workflows.json', data);
    this.emit('reload', 'workflows');
  }

  setRouting(data: RoutingData): void {
    this.routing = data;
    this.saveJSON('routing.json', data);
    this.emit('reload', 'routing');
  }

  // ─── Force reload all from disk ────────────────────────────────

  forceReload(): void {
    this.knowledge = this.loadJSON<KnowledgeData>('knowledge.json');
    this.intents = this.loadJSON<IntentsData>('intents.json');
    this.templates = this.loadJSON<TemplatesData>('templates.json');
    this.settings = this.loadJSON<SettingsData>('settings.json');
    this.workflow = this.loadJSON<WorkflowData>('workflow.json');
    this.workflows = this.loadJSON<WorkflowsData>('workflows.json');
    this.routing = this.loadJSON<RoutingData>('routing.json');
    this.emit('reload', 'all');
    console.log('[ConfigStore] Force reloaded all config files');
  }

  // ─── File I/O helpers ──────────────────────────────────────────

  private loadJSON<T>(filename: string): T {
    const filepath = join(DATA_DIR, filename);
    if (!existsSync(filepath)) {
      throw new Error(`[ConfigStore] Missing config file: ${filepath}`);
    }
    const raw = readFileSync(filepath, 'utf-8');
    return JSON.parse(raw) as T;
  }

  private saveJSON(filename: string, data: unknown): void {
    const filepath = join(DATA_DIR, filename);
    const tmpPath = filepath + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(tmpPath, filepath);
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

export const configStore = new ConfigStore();
