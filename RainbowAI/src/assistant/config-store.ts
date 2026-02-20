import { EventEmitter } from 'events';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';
import type { ZodType } from 'zod';
import { getDefaultConfig } from './default-configs.js';
import { loadConfigFromDB, saveConfigToDB } from '../lib/config-db.js';

// Types are now defined via Zod schemas in schemas.ts
// Re-export so existing consumers don't break
export type {
  KnowledgeData, IntentEntry, IntentsData, TemplatesData,
  AIProvider, RoutingMode, SettingsData, RoutingAction, RoutingData,
  WorkflowStep, WorkflowDefinition, WorkflowsData, WorkflowData
} from './schemas.js';

import type {
  KnowledgeData, IntentsData, TemplatesData, SettingsData,
  WorkflowData, WorkflowsData, RoutingData, IntentEntry
} from './schemas.js';

import {
  knowledgeDataSchema, intentsDataSchema, templatesDataSchema,
  settingsDataSchema, workflowDataSchema, workflowsDataSchema,
  routingDataSchema
} from './schemas.js';

// ─── Resolve data directory ─────────────────────────────────────────
// Use process.cwd() (= RainbowAI/) instead of __dirname because esbuild
// bundles everything into dist/index.js, making __dirname = dist/ (wrong).
const DATA_DIR = join(process.cwd(), 'src', 'assistant', 'data');

// ─── Config Store ───────────────────────────────────────────────────

class ConfigStore extends EventEmitter {
  private knowledge!: KnowledgeData;
  private intents!: IntentsData;
  private templates!: TemplatesData;
  private settings!: SettingsData;
  private workflow!: WorkflowData;
  private workflows!: WorkflowsData;
  private routing!: RoutingData;
  private corruptedFiles: string[] = []; // Track corrupted files for admin notification

  constructor() {
    super();
  }

  /** Get list of files that failed to load (used for admin notification) */
  getCorruptedFiles(): string[] {
    return [...this.corruptedFiles];
  }

  /** Clear corrupted files list (after admin fixes) */
  clearCorruptedFiles(): void {
    this.corruptedFiles = [];
  }

  async init(): Promise<void> {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    // Clear corrupted files list from previous init
    this.corruptedFiles = [];

    // Load all configs: try DB first, fall back to local JSON files
    this.knowledge = await this.loadJSONAsync<KnowledgeData>('knowledge.json', knowledgeDataSchema);
    this.intents = await this.loadJSONAsync<IntentsData>('intents.json', intentsDataSchema);
    this.templates = await this.loadJSONAsync<TemplatesData>('templates.json', templatesDataSchema);
    this.settings = await this.loadJSONAsync<SettingsData>('settings.json', settingsDataSchema);
    this.workflow = await this.loadJSONAsync<WorkflowData>('workflow.json', workflowDataSchema);
    this.workflows = await this.loadJSONAsync<WorkflowsData>('workflows.json', workflowsDataSchema);
    this.routing = await this.loadJSONAsync<RoutingData>('routing.json', routingDataSchema);

    if (this.corruptedFiles.length > 0) {
      console.warn(`[ConfigStore] ⚠️ ${this.corruptedFiles.length} config file(s) failed to load — using defaults`);
      console.warn(`[ConfigStore] Corrupted files: ${this.corruptedFiles.join(', ')}`);
      console.warn(`[ConfigStore] Admin will be notified via WhatsApp`);
      // Notification will be sent later by the caller (after WhatsApp is initialized)
    } else {
      console.log('[ConfigStore] ✅ All config files loaded and validated');
    }
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

  /** Intent categories marked time_sensitive (e.g. check_in_arrival, late_checkout_request). */
  getTimeSensitiveIntentSet(): Set<string> {
    const set = new Set<string>();
    const categories = (this.intents as { categories?: Array<{ intents?: IntentEntry[] }> }).categories;
    if (!Array.isArray(categories)) return set;
    for (const phase of categories) {
      const intents = phase.intents || [];
      for (const entry of intents) {
        if (entry.time_sensitive === true) set.add(entry.category);
      }
    }
    return set;
  }

  // ─── Setters (validate + save + emit reload) ─────────────────────

  setKnowledge(data: KnowledgeData): void {
    this.validateOrThrow(data, knowledgeDataSchema, 'knowledge');
    this.knowledge = data;
    this.saveJSONAndDB('knowledge.json', data);
    this.emit('reload', 'knowledge');
  }

  setIntents(data: IntentsData): void {
    this.validateOrThrow(data, intentsDataSchema, 'intents');
    this.intents = data;
    this.saveJSONAndDB('intents.json', data);
    this.emit('reload', 'intents');
  }

  setTemplates(data: TemplatesData): void {
    this.validateOrThrow(data, templatesDataSchema, 'templates');
    this.templates = data;
    this.saveJSONAndDB('templates.json', data);
    this.emit('reload', 'templates');
  }

  setSettings(data: SettingsData): void {
    this.validateOrThrow(data, settingsDataSchema, 'settings');
    this.settings = data;
    this.saveJSONAndDB('settings.json', data);
    this.emit('reload', 'settings');
  }

  setWorkflow(data: WorkflowData): void {
    this.validateOrThrow(data, workflowDataSchema, 'workflow');
    this.workflow = data;
    this.saveJSONAndDB('workflow.json', data);
    this.emit('reload', 'workflow');
  }

  setWorkflows(data: WorkflowsData): void {
    this.validateOrThrow(data, workflowsDataSchema, 'workflows');
    this.workflows = data;
    this.saveJSONAndDB('workflows.json', data);
    this.emit('reload', 'workflows');
  }

  setRouting(data: RoutingData): void {
    this.validateOrThrow(data, routingDataSchema, 'routing');
    this.routing = data;
    this.saveJSONAndDB('routing.json', data);
    this.emit('reload', 'routing');
  }

  // ─── Force reload all (DB-first, then disk) ───────────────────

  async forceReload(): Promise<void> {
    this.knowledge = await this.loadJSONAsync<KnowledgeData>('knowledge.json', knowledgeDataSchema);
    this.intents = await this.loadJSONAsync<IntentsData>('intents.json', intentsDataSchema);
    this.templates = await this.loadJSONAsync<TemplatesData>('templates.json', templatesDataSchema);
    this.settings = await this.loadJSONAsync<SettingsData>('settings.json', settingsDataSchema);
    this.workflow = await this.loadJSONAsync<WorkflowData>('workflow.json', workflowDataSchema);
    this.workflows = await this.loadJSONAsync<WorkflowsData>('workflows.json', workflowsDataSchema);
    this.routing = await this.loadJSONAsync<RoutingData>('routing.json', routingDataSchema);

    // Write DB state back to local files so fallback is always fresh
    this.saveJSONToFile('knowledge.json', this.knowledge);
    this.saveJSONToFile('intents.json', this.intents);
    this.saveJSONToFile('templates.json', this.templates);
    this.saveJSONToFile('settings.json', this.settings);
    this.saveJSONToFile('workflow.json', this.workflow);
    this.saveJSONToFile('workflows.json', this.workflows);
    this.saveJSONToFile('routing.json', this.routing);

    this.emit('reload', 'all');
    console.log('[ConfigStore] Force reloaded all config files (DB-first, files synced to DB state)');
  }

  // ─── File I/O helpers ──────────────────────────────────────────

  /**
   * Load and optionally validate a JSON config file from local disk.
   * On any failure (missing file, malformed JSON, validation error):
   * - Logs error details
   * - Returns safe default config
   * - Tracks corrupted file for admin notification
   * - NEVER crashes startup
   */
  private loadJSONFromFile<T>(filename: string, schema?: ZodType<T>): T {
    const filepath = join(DATA_DIR, filename);

    try {
      // Check file exists
      if (!existsSync(filepath)) {
        console.error(`[ConfigStore] ❌ Missing config file: ${filename}`);
        console.error(`[ConfigStore] Using default config for ${filename}`);
        this.corruptedFiles.push(filename);
        return getDefaultConfig(filename) as T;
      }

      // Read file
      const raw = readFileSync(filepath, 'utf-8');

      // Parse JSON (throws on malformed JSON)
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (parseErr: any) {
        console.error(`[ConfigStore] ❌ Malformed JSON in ${filename}:`);
        console.error(`[ConfigStore] ${parseErr.message}`);
        console.error(`[ConfigStore] Using default config for ${filename}`);
        this.corruptedFiles.push(filename);
        return getDefaultConfig(filename) as T;
      }

      // Validate schema if provided
      if (schema) {
        const result = schema.safeParse(parsed);
        if (!result.success) {
          const issues = result.error.issues
            .slice(0, 5) // Show max 5 issues
            .map(i => `  ${i.path.join('.')}: ${i.message}`)
            .join('\n');
          console.error(`[ConfigStore] ❌ Schema validation failed for ${filename}:`);
          console.error(issues);
          console.error(`[ConfigStore] Using default config for ${filename}`);
          this.corruptedFiles.push(filename);
          return getDefaultConfig(filename) as T;
        }
        return result.data;
      }

      return parsed as T;
    } catch (err: any) {
      // Catch-all for unexpected errors (permissions, disk I/O, etc.)
      console.error(`[ConfigStore] ❌ Unexpected error loading ${filename}:`, err.message);
      console.error(`[ConfigStore] Using default config for ${filename}`);
      this.corruptedFiles.push(filename);
      return getDefaultConfig(filename) as T;
    }
  }

  /**
   * Async loader: tries DB first, falls back to local file.
   * DB data is authoritative when available (shared across servers).
   */
  private async loadJSONAsync<T>(filename: string, schema?: ZodType<T>): Promise<T> {
    try {
      const dbData = await loadConfigFromDB(filename);
      if (dbData !== null) {
        // Validate DB data against schema
        if (schema) {
          const result = schema.safeParse(dbData);
          if (result.success) {
            console.log(`[ConfigStore] ✅ Loaded ${filename} from DB`);
            return result.data;
          }
          console.warn(`[ConfigStore] ⚠️ DB data for ${filename} failed validation, falling back to file`);
        } else {
          console.log(`[ConfigStore] ✅ Loaded ${filename} from DB (no schema)`);
          return dbData as T;
        }
      }
    } catch (err: any) {
      console.warn(`[ConfigStore] ⚠️ DB load for ${filename} failed: ${err.message}, falling back to file`);
    }
    return this.loadJSONFromFile<T>(filename, schema);
  }

  private saveJSONToFile(filename: string, data: unknown): void {
    const filepath = join(DATA_DIR, filename);
    const tmpPath = filepath + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(tmpPath, filepath);
  }

  /**
   * Dual-write: sync to local file + fire-and-forget async to DB.
   * Setters call this to stay synchronous while keeping DB in sync.
   */
  private saveJSONAndDB(filename: string, data: unknown): void {
    // Sync: write to local file (immediate consistency)
    this.saveJSONToFile(filename, data);
    // Async: replicate to DB (fire-and-forget)
    saveConfigToDB(filename, data, process.env.RAINBOW_ROLE || 'unknown').catch(err => {
      console.error(`[ConfigStore] ⚠️ DB write for ${filename} failed:`, err.message);
    });
  }

  /**
   * Validate data against schema. Throws on failure (for admin write operations).
   */
  private validateOrThrow<T>(data: unknown, schema: ZodType<T>, name: string): void {
    const result = schema.safeParse(data);
    if (!result.success) {
      const issues = result.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new Error(`[ConfigStore] Invalid ${name} data: ${issues}`);
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

export const configStore = new ConfigStore();
