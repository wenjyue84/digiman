import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import { WhatsAppInstance } from './instance.js';
import type { WhatsAppInstanceStatus, InstanceConfig, InstancesFile, MessageHandler } from './types.js';
import { notifyAdminUnlink } from '../admin-notifier.js';

// Use process.cwd() (= RainbowAI/) — __dirname is dist/ in esbuild bundle
const DATA_DIR = process.env.WHATSAPP_DATA_DIR || path.resolve(process.cwd(), 'whatsapp-data');
const LEGACY_AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.resolve(process.cwd(), 'whatsapp-auth');
const INSTANCES_FILE = path.join(DATA_DIR, 'instances.json');

export class WhatsAppManager extends EventEmitter {
  private instances = new Map<string, WhatsAppInstance>();
  private messageHandler: MessageHandler | null = null;

  async init(): Promise<void> {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const config = this.loadConfig();

    if (config) {
      // Start all autoStart instances
      for (const inst of config.instances) {
        if (inst.autoStart) {
          await this.startInstanceFromConfig(inst);
        }
      }
    } else {
      // First run — check for legacy single-instance auth dir
      await this.migrateFromSingleInstance();
    }
  }

  private async migrateFromSingleInstance(): Promise<void> {
    if (fs.existsSync(LEGACY_AUTH_DIR) && fs.readdirSync(LEGACY_AUTH_DIR).length > 0) {
      console.log('[WhatsAppManager] Migrating legacy single instance to multi-instance config');
      const config: InstancesFile = {
        instances: [{
          id: 'default',
          label: 'Main Line',
          authDir: LEGACY_AUTH_DIR,
          autoStart: true,
          createdAt: new Date().toISOString()
        }]
      };
      this.saveConfig(config);
      await this.startInstanceFromConfig(config.instances[0]);
    } else {
      // Fresh install — empty config
      this.saveConfig({ instances: [] });
      console.log('[WhatsAppManager] Fresh install — no instances configured');
    }
  }

  private async startInstanceFromConfig(cfg: InstanceConfig): Promise<void> {
    const instance = new WhatsAppInstance(cfg.id, cfg.label, cfg.authDir);

    instance.setOnFirstConnect(() => {
      const config = this.loadConfig();
      const inst = config?.instances.find(i => i.id === cfg.id);
      if (inst && !inst.firstConnectedAt) {
        inst.firstConnectedAt = new Date().toISOString();
        this.saveConfig(config!);
      }
    });

    if (this.messageHandler) {
      instance.setMessageHandler(this.messageHandler);
    }

    // Wire message status handler for read receipts (US-017)
    instance.setMessageStatusHandler((event) => {
      this.emit('message_status', event);
    });

    this.instances.set(cfg.id, instance);
    await instance.start(this.notifyUnlinkedInstance.bind(this));
  }

  async addInstance(id: string, label: string): Promise<WhatsAppInstanceStatus> {
    if (this.instances.has(id)) {
      throw new Error(`Instance "${id}" already exists`);
    }

    // Validate id: alphanumeric slug or phone number (digits)
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(id) && !/^\d{10,15}$/.test(id)) {
      throw new Error('Instance ID must be a phone number (digits) or lowercase slug (letters, numbers, hyphens)');
    }

    const authDir = path.join(DATA_DIR, id);
    const cfg: InstanceConfig = {
      id,
      label,
      authDir,
      autoStart: true,
      createdAt: new Date().toISOString()
    };

    // Save to config
    const config = this.loadConfig() || { instances: [] };
    config.instances.push(cfg);
    this.saveConfig(config);

    // Start the instance
    await this.startInstanceFromConfig(cfg);
    const s = this.instances.get(id)!.getStatus();
    return { ...s, firstConnectedAt: null };
  }

  async removeInstance(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (instance) {
      await instance.stop();
      this.instances.delete(id);
    }

    // Remove from config (keep auth dir on disk)
    const config = this.loadConfig();
    if (config) {
      config.instances = config.instances.filter(i => i.id !== id);
      this.saveConfig(config);
    }
    console.log(`[WhatsAppManager] Removed instance "${id}" (auth dir preserved)`);
  }

  /** Update display label for an instance (persisted + in-memory). No restart needed. */
  updateInstanceLabel(id: string, label: string): WhatsAppInstanceStatus {
    const instance = this.instances.get(id);
    if (!instance) throw new Error(`Instance "${id}" not found`);

    const config = this.loadConfig();
    const entry = config?.instances.find(i => i.id === id);
    if (!entry) throw new Error(`Instance "${id}" not found in config`);

    const trimLabel = label.trim();
    if (!trimLabel) throw new Error('Label cannot be empty');

    entry.label = trimLabel;
    instance.label = trimLabel;
    if (config) this.saveConfig(config);

    const s = instance.getStatus();
    return { ...s, firstConnectedAt: entry.firstConnectedAt ?? null };
  }

  async logoutInstance(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (!instance) throw new Error(`Instance "${id}" not found`);
    await instance.logout();
  }

  async startInstance(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (instance) {
      await instance.start(this.notifyUnlinkedInstance.bind(this));
      return;
    }

    // Try to load from config
    const config = this.loadConfig();
    const cfg = config?.instances.find(i => i.id === id);
    if (!cfg) throw new Error(`Instance "${id}" not found in config`);
    await this.startInstanceFromConfig(cfg);
  }

  async stopInstance(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (!instance) throw new Error(`Instance "${id}" not found`);
    await instance.stop();
  }

  async sendTypingIndicator(phone: string, instanceId?: string): Promise<void> {
    const jid = phone.includes('@')
      ? phone
      : `${formatPhoneNumber(phone)}@s.whatsapp.net`;

    if (instanceId) {
      const instance = this.instances.get(instanceId);
      if (instance) await instance.sendTypingIndicator(jid);
      return;
    }

    // No instanceId — use first connected instance
    for (const instance of this.instances.values()) {
      if (instance.state === 'open') {
        await instance.sendTypingIndicator(jid);
        return;
      }
    }
  }

  async sendMessage(phone: string, text: string, instanceId?: string): Promise<any> {
    // If it's already a full JID (@s.whatsapp.net, @lid, @g.us), use as-is
    // Otherwise format as @s.whatsapp.net
    const jid = phone.includes('@')
      ? phone
      : `${formatPhoneNumber(phone)}@s.whatsapp.net`;

    if (instanceId) {
      const instance = this.instances.get(instanceId);
      if (!instance) throw new Error(`Instance "${instanceId}" not found`);
      return instance.sendMessage(jid, text);
    }

    // No instanceId — use first connected instance
    for (const instance of this.instances.values()) {
      if (instance.state === 'open') {
        return instance.sendMessage(jid, text);
      }
    }
    throw new Error('No WhatsApp instance connected. Check status with pelangi_whatsapp_status.');
  }

  async sendMedia(phone: string, buffer: Buffer, mimetype: string, fileName: string, caption?: string, instanceId?: string): Promise<any> {
    const jid = phone.includes('@')
      ? phone
      : `${formatPhoneNumber(phone)}@s.whatsapp.net`;

    if (instanceId) {
      const instance = this.instances.get(instanceId);
      if (!instance) throw new Error(`Instance "${instanceId}" not found`);
      return instance.sendMedia(jid, buffer, mimetype, fileName, caption);
    }

    for (const instance of this.instances.values()) {
      if (instance.state === 'open') {
        return instance.sendMedia(jid, buffer, mimetype, fileName, caption);
      }
    }
    throw new Error('No WhatsApp instance connected.');
  }

  getAllStatuses(): WhatsAppInstanceStatus[] {
    const config = this.loadConfig();
    return Array.from(this.instances.values()).map(i => {
      const s = i.getStatus();
      const firstConnectedAt = config?.instances.find(inst => inst.id === i.id)?.firstConnectedAt ?? null;
      return { ...s, firstConnectedAt };
    });
  }

  getInstanceStatus(id: string): WhatsAppInstanceStatus | null {
    const instance = this.instances.get(id);
    if (!instance) return null;

    const s = instance.getStatus();
    const config = this.loadConfig();
    const firstConnectedAt = config?.instances.find(inst => inst.id === id)?.firstConnectedAt ?? null;
    return { ...s, firstConnectedAt };
  }

  registerMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;

    // Apply to all existing instances
    for (const instance of this.instances.values()) {
      instance.setMessageHandler(handler);
    }
    console.log('[WhatsAppManager] Message handler registered');
  }

  async notifyUnlinkedInstance(unlinkedId: string, unlinkedLabel: string): Promise<void> {
    const MAINLINE_ID = '60103084289'; // Pelangi Capsule Hostel mainline
    const unlinkedInstance = this.instances.get(unlinkedId);
    if (!unlinkedInstance) return;

    const unlinkedUser = (unlinkedInstance as any).sock?.user;
    const unlinkedPhone = unlinkedUser?.id?.split(':')[0];
    if (!unlinkedPhone) {
      console.warn(`[WhatsAppManager] Cannot notify unlink: no phone number for instance "${unlinkedId}"`);
      return;
    }

    // Try mainline first, then fallback to any connected instance
    let notifierInstance = this.instances.get(MAINLINE_ID);
    if (!notifierInstance || notifierInstance.state !== 'open') {
      console.log(`[WhatsAppManager] Mainline "${MAINLINE_ID}" not available, finding fallback...`);

      // Find any connected instance except the unlinked one
      for (const instance of this.instances.values()) {
        if (instance.id !== unlinkedId && instance.state === 'open') {
          notifierInstance = instance;
          console.log(`[WhatsAppManager] Using fallback instance: ${instance.id}`);
          break;
        }
      }
    }

    if (!notifierInstance || notifierInstance.state !== 'open') {
      console.error(`[WhatsAppManager] No connected instance available to send unlink notification for "${unlinkedId}"`);

      // Still notify admin via admin notifier (will use any available instance)
      notifyAdminUnlink(unlinkedId, unlinkedLabel, unlinkedPhone).catch(err => {
        console.error(`[WhatsAppManager] Failed to notify admin of unlink:`, err.message);
      });
      return;
    }

    const message = `⚠️ *WhatsApp Instance Unlinked*\n\n` +
      `Your WhatsApp instance *"${unlinkedLabel}"* (${unlinkedPhone}) has been unlinked from PelangiManager.\n\n` +
      `This may have been accidental. If you need to reconnect, please visit the admin panel and scan the QR code again.\n\n` +
      `🔗 Admin Panel: http://localhost:3002/admin/rainbow/dashboard\n\n` +
      `If this was intentional, you can safely ignore this message.`;

    try {
      await notifierInstance.sendMessage(`${unlinkedPhone}@s.whatsapp.net`, message);
      console.log(`[WhatsAppManager] Sent unlink notification for "${unlinkedId}" via "${notifierInstance.id}"`);
    } catch (err: any) {
      console.error(`[WhatsAppManager] Failed to send unlink notification:`, err.message);
    }

    // Also notify system admin
    notifyAdminUnlink(unlinkedId, unlinkedLabel, unlinkedPhone).catch(err => {
      console.error(`[WhatsAppManager] Failed to notify admin of unlink:`, err.message);
    });
  }

  async fetchProfilePictureUrl(phone: string): Promise<string | null> {
    const jid = phone.includes('@')
      ? phone
      : `${formatPhoneNumber(phone)}@s.whatsapp.net`;

    for (const instance of this.instances.values()) {
      if (instance.state === 'open' && instance.sock) {
        try {
          // Try full image first, fall back to preview (lower privacy restriction)
          const url = await instance.sock.profilePictureUrl(jid, 'image').catch(() => null)
            ?? await instance.sock.profilePictureUrl(jid, 'preview').catch(() => null);
          return url ?? null;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  private loadConfig(): InstancesFile | null {
    try {
      if (!fs.existsSync(INSTANCES_FILE)) return null;
      const raw = fs.readFileSync(INSTANCES_FILE, 'utf-8');
      return JSON.parse(raw) as InstancesFile;
    } catch {
      return null;
    }
  }

  private saveConfig(config: InstancesFile): void {
    fs.writeFileSync(INSTANCES_FILE, JSON.stringify(config, null, 2), 'utf-8');
  }
}

// Helper function
export function formatPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}
