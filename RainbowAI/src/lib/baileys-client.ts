import makeWASocket, { useMultiFileAuthState, DisconnectReason, isLidUser, jidNormalizedUser } from '@whiskeysockets/baileys';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { IncomingMessage, MessageType } from '../assistant/types.js';
import { trackWhatsAppConnected, trackWhatsAppDisconnected, trackWhatsAppUnlinked } from './activity-tracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.WHATSAPP_DATA_DIR || path.resolve(__dirname, '../../whatsapp-data');
const LEGACY_AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.resolve(__dirname, '../../whatsapp-auth');
const INSTANCES_FILE = path.join(DATA_DIR, 'instances.json');

// ─── Instance Config Persistence ────────────────────────────────────

interface InstanceConfig {
  id: string;
  label: string;
  authDir: string;
  autoStart: boolean;
  createdAt: string;
  firstConnectedAt?: string; // ISO timestamp of first successful WhatsApp connection (persisted)
}

interface InstancesFile {
  instances: InstanceConfig[];
}

// ─── WhatsApp Instance Status ───────────────────────────────────────

export interface WhatsAppInstanceStatus {
  id: string;
  label: string;
  state: string;
  user: { name: string; id: string; phone: string } | null;
  authDir: string;
  qr: string | null;
  unlinkedFromWhatsApp: boolean; // User unlinked from WhatsApp side (not from our system)
  lastUnlinkedAt: string | null; // ISO timestamp of when unlink was detected
  lastConnectedAt: string | null; // ISO timestamp of last successful connection
  firstConnectedAt: string | null; // ISO timestamp of first ever successful connection (persisted)
}

// ─── WhatsAppInstance Class ─────────────────────────────────────────

class WhatsAppInstance {
  id: string;
  label: string;
  authDir: string;
  sock: ReturnType<typeof makeWASocket> | null = null;
  state: string = 'close';
  qr: string | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private static readonly MAX_RECONNECT_ATTEMPTS = 3;
  private messageHandler: ((msg: IncomingMessage) => Promise<void>) | null = null;
  // LID → phone JID mapping (Baileys v7 uses @lid format for incoming messages)
  private lidToPhone = new Map<string, string>();
  // Track if user unlinked from WhatsApp (not from our system)
  unlinkedFromWhatsApp: boolean = false;
  lastUnlinkedAt: string | null = null;
  lastConnectedAt: string | null = null;
  // Track if we've already notified about the current unlink event
  private unlinkNotificationSent: boolean = false;
  /** Called when connection opens; manager uses it to persist firstConnectedAt if not set */
  private onFirstConnect: (() => void) | null = null;

  constructor(id: string, label: string, authDir: string) {
    this.id = id;
    this.label = label;
    this.authDir = authDir;
  }

  /** Load LID→phone mappings from Baileys auth state files on disk */
  loadLidMappingsFromDisk(): void {
    try {
      const files = fs.readdirSync(this.authDir);
      let loaded = 0;
      for (const file of files) {
        // Pattern: lid-mapping-{lidUser}_reverse.json → contains pnUser
        const match = file.match(/^lid-mapping-(\d+)_reverse\.json$/);
        if (!match) continue;
        const lidUser = match[1];
        const filePath = path.join(this.authDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const pnUser = JSON.parse(raw);
        if (typeof pnUser === 'string' && pnUser.length > 0) {
          const lidJid = `${lidUser}@lid`;
          const phoneJid = `${pnUser}@s.whatsapp.net`;
          this.lidToPhone.set(lidJid, phoneJid);
          loaded++;
        }
      }
      if (loaded > 0) {
        console.log(`[Baileys:${this.id}] Loaded ${loaded} LID→phone mappings from auth state`);
      }
    } catch (err: any) {
      console.warn(`[Baileys:${this.id}] Failed to load LID mappings: ${err.message}`);
    }
  }

  /** Convert @lid JID to @s.whatsapp.net JID if mapping exists */
  resolveToPhoneJid(jid: string): string {
    if (!isLidUser(jid)) return jid;
    const normalized = jidNormalizedUser(jid);
    const phoneJid = this.lidToPhone.get(normalized);
    if (phoneJid) {
      return phoneJid;
    }
    // Fallback: check auth state files on disk (Baileys may have stored new mappings)
    const decoded = jid.replace(/@lid$/, '');
    const lidUser = decoded.split(':')[0]; // strip device suffix
    const reverseFile = path.join(this.authDir, `lid-mapping-${lidUser}_reverse.json`);
    try {
      if (fs.existsSync(reverseFile)) {
        const pnUser = JSON.parse(fs.readFileSync(reverseFile, 'utf-8'));
        if (typeof pnUser === 'string' && pnUser.length > 0) {
          const resolvedJid = `${pnUser}@s.whatsapp.net`;
          this.lidToPhone.set(normalized, resolvedJid); // cache it
          console.log(`[Baileys:${this.id}] LID resolved from disk: ${normalized} → ${resolvedJid}`);
          return resolvedJid;
        }
      }
    } catch { /* ignore read errors */ }
    // Can't resolve — return original @lid JID
    return jid;
  }

  setMessageHandler(handler: (msg: IncomingMessage) => Promise<void>): void {
    this.messageHandler = handler;
  }

  /** Notify about unlinked instance via mainline or fallback */
  private notifyUnlinked(): void {
    // Defer notification to WhatsAppManager to avoid circular dependency
    setTimeout(() => {
      whatsappManager.notifyUnlinkedInstance(this.id, this.label).catch(err => {
        console.error(`[Baileys:${this.id}] Failed to send unlink notification:`, err.message);
      });
    }, 1000);
  }

  async start(): Promise<void> {
    // Ensure auth dir exists
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }

    // Load existing LID→phone mappings from auth state files
    this.loadLidMappingsFromDisk();

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['PelangiManager', 'Chrome', '1.0.0']
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qr = qr;
        console.log(`[Baileys:${this.id}] QR code available. Visit /admin/rainbow/dashboard to scan.`);
      }

      if (connection) this.state = connection;

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut) {
          this.reconnectAttempts++;
          if (this.reconnectAttempts > WhatsAppInstance.MAX_RECONNECT_ATTEMPTS) {
            console.log(`[Baileys:${this.id}] Stopped reconnecting after ${WhatsAppInstance.MAX_RECONNECT_ATTEMPTS} attempts (last code: ${statusCode}). Open dashboard to restart/scan QR.`);
            trackWhatsAppDisconnected(this.id, `code ${statusCode}, stopped after ${WhatsAppInstance.MAX_RECONNECT_ATTEMPTS} attempts`);
            this.reconnectTimeout = null;
            return;
          }
          // 408 = request timeout — use longer delay to avoid rapid retry spam
          const is408 = statusCode === 408;
          const baseDelay = this.reconnectTimeout ? 5000 : (is408 ? 30000 : 2000);
          const delay = Math.min(baseDelay * this.reconnectAttempts, 60000);
          console.log(`[Baileys:${this.id}] Disconnected (code: ${statusCode}), reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${WhatsAppInstance.MAX_RECONNECT_ATTEMPTS})...`);
          trackWhatsAppDisconnected(this.id, `code ${statusCode}, reconnecting (${this.reconnectAttempts}/${WhatsAppInstance.MAX_RECONNECT_ATTEMPTS})`);
          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.start();
          }, delay);
        } else {
          console.error(`[Baileys:${this.id}] Logged out from WhatsApp (user unlinked). Remove auth dir and re-pair.`);
          trackWhatsAppUnlinked(this.id);
          // Mark as unlinked from WhatsApp side
          this.unlinkedFromWhatsApp = true;
          this.lastUnlinkedAt = new Date().toISOString();
          // Trigger notification to user (only once per unlink event)
          if (!this.unlinkNotificationSent) {
            this.notifyUnlinked();
            this.unlinkNotificationSent = true;
          }
        }
      } else if (connection === 'open') {
        this.qr = null;
        this.reconnectAttempts = 0;
        // Clear unlinked status when reconnected
        this.unlinkedFromWhatsApp = false;
        this.lastUnlinkedAt = null;
        this.unlinkNotificationSent = false; // Reset notification flag for future unlink events
        // Update last connected timestamp
        this.lastConnectedAt = new Date().toISOString();
        this.onFirstConnect?.(); // Persist firstConnectedAt in config if not yet set
        const user = (this.sock as any)?.user;
        console.log(`[Baileys:${this.id}] Connected: ${user?.name || 'Unknown'} (${user?.id?.split(':')[0] || '?'})`);
        trackWhatsAppConnected(this.id, user?.name, user?.id?.split(':')[0]);
      }
    });

    // Track LID ↔ phone mappings from contacts (Baileys v7 uses @lid JIDs)
    this.sock.ev.on('contacts.upsert', (contacts: any[]) => {
      for (const contact of contacts) {
        if (contact.id && contact.lid) {
          const phoneJid = jidNormalizedUser(contact.id);
          const lidJid = jidNormalizedUser(contact.lid);
          if (!this.lidToPhone.has(lidJid)) {
            this.lidToPhone.set(lidJid, phoneJid);
            console.log(`[Baileys:${this.id}] LID mapped: ${lidJid} → ${phoneJid}`);
          }
        }
      }
    });

    // Also extract mappings from history sync
    this.sock.ev.on('messaging-history.set' as any, (data: any) => {
      const contacts = data?.contacts;
      if (Array.isArray(contacts)) {
        let mapped = 0;
        for (const contact of contacts) {
          if (contact.id && contact.lid) {
            const phoneJid = jidNormalizedUser(contact.id);
            const lidJid = jidNormalizedUser(contact.lid);
            if (!this.lidToPhone.has(lidJid)) {
              this.lidToPhone.set(lidJid, phoneJid);
              mapped++;
            }
          }
        }
        if (mapped > 0) {
          console.log(`[Baileys:${this.id}] History sync: ${mapped} LID→phone mappings loaded (total: ${this.lidToPhone.size})`);
        }
      }
    });

    // Listen for incoming messages
    this.sock.ev.on('messages.upsert', async (upsert: any) => {
      if (upsert.type !== 'notify') return;

      for (const msg of upsert.messages) {
        try {
          if (msg.key.fromMe) continue;
          if (msg.key.remoteJid === 'status@broadcast') continue;

          const m = msg.message;
          let text = m?.conversation || m?.extendedTextMessage?.text || '';
          let messageType: MessageType = 'text';

          if (m?.imageMessage) {
            messageType = 'image';
            text = m.imageMessage.caption || '';
          } else if (m?.audioMessage) {
            messageType = 'audio';
          } else if (m?.videoMessage) {
            messageType = 'video';
            text = m.videoMessage.caption || '';
          } else if (m?.stickerMessage) {
            messageType = 'sticker';
          } else if (m?.documentMessage) {
            messageType = 'document';
            text = m.documentMessage.caption || '';
          } else if (m?.contactMessage || m?.contactsArrayMessage) {
            messageType = 'contact';
          } else if (m?.locationMessage || m?.liveLocationMessage) {
            messageType = 'location';
          }

          if (!text && messageType === 'text') continue;

          const remoteJid = msg.key.remoteJid || '';
          const isGroup = remoteJid.endsWith('@g.us');
          // Resolve @lid JIDs to @s.whatsapp.net for reliable reply delivery
          const from = this.resolveToPhoneJid(remoteJid);
          if (from !== remoteJid) {
            console.log(`[Baileys:${this.id}] Resolved LID: ${remoteJid} → ${from}`);
          } else if (isLidUser(remoteJid)) {
            console.warn(`[Baileys:${this.id}] Unresolved LID: ${remoteJid} (no phone mapping yet)`);
          }

          const incoming: IncomingMessage = {
            from,
            text,
            pushName: msg.pushName || 'Unknown',
            messageId: msg.key.id || '',
            isGroup,
            timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) : Math.floor(Date.now() / 1000),
            messageType,
            instanceId: this.id
          };

          if (this.messageHandler) {
            await this.messageHandler(incoming);
          }
        } catch (err: any) {
          console.error(`[Baileys:${this.id}] Error processing incoming message:`, err.message);
        }
      }
    });
  }

  async stop(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = 0;
    if (this.sock) {
      this.sock.ev.removeAllListeners('connection.update');
      this.sock.ev.removeAllListeners('messages.upsert');
      this.sock.ev.removeAllListeners('creds.update');
      this.sock.end(undefined);
      this.sock = null;
    }
    this.state = 'close';
    this.qr = null;
  }

  async logout(): Promise<void> {
    if (!this.sock) throw new Error(`Instance "${this.id}" socket not initialized`);
    await this.sock.logout();
    this.state = 'close';
    this.qr = null;
    console.log(`[Baileys:${this.id}] Logged out — session cleared`);
  }

  async sendTypingIndicator(jid: string): Promise<void> {
    if (!this.sock || this.state !== 'open') return;
    const resolvedJid = this.resolveToPhoneJid(jid);
    try {
      await this.sock.sendPresenceUpdate('composing', resolvedJid);
    } catch (err: any) {
      // Non-fatal — typing indicator is best-effort
      console.warn(`[Baileys:${this.id}] Typing indicator failed for ${resolvedJid}: ${err.message}`);
    }
  }

  async sendMessage(jid: string, text: string): Promise<any> {
    if (!this.sock || this.state !== 'open') {
      throw new Error(`Instance "${this.id}" not connected`);
    }
    // Resolve @lid JID to phone JID for reliable delivery
    const resolvedJid = this.resolveToPhoneJid(jid);
    if (resolvedJid !== jid) {
      console.log(`[Baileys:${this.id}] Send: resolved ${jid} → ${resolvedJid}`);
    }
    try {
      const result = await this.sock.sendMessage(resolvedJid, { text });
      console.log(`[Baileys:${this.id}] Sent to ${resolvedJid}: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`);
      return result;
    } catch (err: any) {
      console.error(`[Baileys:${this.id}] SEND FAILED to ${resolvedJid}: ${err.message}`);
      // If we tried a @lid JID and it failed, the message won't be delivered
      if (isLidUser(resolvedJid)) {
        console.error(`[Baileys:${this.id}] Cannot deliver to @lid JID — no phone mapping available`);
      }
      throw err;
    }
  }

  async sendMedia(jid: string, buffer: Buffer, mimetype: string, fileName: string, caption?: string): Promise<any> {
    if (!this.sock || this.state !== 'open') {
      throw new Error(`Instance "${this.id}" not connected`);
    }
    const resolvedJid = this.resolveToPhoneJid(jid);

    let content: any;
    if (mimetype.startsWith('image/')) {
      content = { image: buffer, caption: caption || undefined, mimetype };
    } else if (mimetype.startsWith('video/')) {
      content = { video: buffer, caption: caption || undefined, mimetype };
    } else {
      content = { document: buffer, fileName, mimetype };
    }

    try {
      const result = await this.sock.sendMessage(resolvedJid, content);
      const type = mimetype.startsWith('image/') ? 'image' : mimetype.startsWith('video/') ? 'video' : 'document';
      console.log(`[Baileys:${this.id}] Sent ${type} to ${resolvedJid}: ${fileName}`);
      return result;
    } catch (err: any) {
      console.error(`[Baileys:${this.id}] SEND MEDIA FAILED to ${resolvedJid}: ${err.message}`);
      throw err;
    }
  }

  setOnFirstConnect(cb: () => void): void {
    this.onFirstConnect = cb;
  }

  getStatus(): Omit<WhatsAppInstanceStatus, 'firstConnectedAt'> {
    const user = (this.sock as any)?.user;
    return {
      id: this.id,
      label: this.label,
      state: this.state,
      user: user ? { name: user.name, id: user.id, phone: user.id?.split(':')[0] } : null,
      authDir: this.authDir,
      qr: this.qr,
      unlinkedFromWhatsApp: this.unlinkedFromWhatsApp,
      lastUnlinkedAt: this.lastUnlinkedAt,
      lastConnectedAt: this.lastConnectedAt
    };
  }
}

// ─── WhatsAppManager Singleton ──────────────────────────────────────

class WhatsAppManager {
  private instances = new Map<string, WhatsAppInstance>();
  private messageHandler: ((msg: IncomingMessage) => Promise<void>) | null = null;

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
    this.instances.set(cfg.id, instance);
    await instance.start();
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
    return this.instances.get(id)!.getStatus();
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
    return instance.getStatus();
  }

  async logoutInstance(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (!instance) throw new Error(`Instance "${id}" not found`);
    await instance.logout();
  }

  async startInstance(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (instance) {
      await instance.start();
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

  registerMessageHandler(handler: (msg: IncomingMessage) => Promise<void>): void {
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

// ─── Singleton + Backward-Compatible Exports ────────────────────────

export const whatsappManager = new WhatsAppManager();

export async function initBaileys(): Promise<void> {
  await whatsappManager.init();
}

export function registerMessageHandler(handler: (msg: IncomingMessage) => Promise<void>): void {
  whatsappManager.registerMessageHandler(handler);
}

export function getWhatsAppStatus(): { state: string; user: any; authDir: string; qr: string | null; unlinkedFromWhatsApp?: boolean; lastUnlinkedAt?: string | null } {
  // Return status of the default/first instance for backward compat
  const statuses = whatsappManager.getAllStatuses();
  if (statuses.length === 0) {
    return { state: 'close', user: null, authDir: LEGACY_AUTH_DIR, qr: null };
  }
  const s = statuses[0];
  return {
    state: s.state,
    user: s.user,
    authDir: s.authDir,
    qr: s.qr,
    unlinkedFromWhatsApp: s.unlinkedFromWhatsApp,
    lastUnlinkedAt: s.lastUnlinkedAt
  };
}

export async function sendWhatsAppMessage(phone: string, text: string, instanceId?: string): Promise<any> {
  return whatsappManager.sendMessage(phone, text, instanceId);
}

export async function sendWhatsAppMedia(phone: string, buffer: Buffer, mimetype: string, fileName: string, caption?: string, instanceId?: string): Promise<any> {
  return whatsappManager.sendMedia(phone, buffer, mimetype, fileName, caption, instanceId);
}

export async function sendWhatsAppTypingIndicator(phone: string, instanceId?: string): Promise<void> {
  return whatsappManager.sendTypingIndicator(phone, instanceId);
}

export async function logoutWhatsApp(): Promise<void> {
  const statuses = whatsappManager.getAllStatuses();
  if (statuses.length === 0) throw new Error('No WhatsApp instances configured');
  await whatsappManager.logoutInstance(statuses[0].id);
}

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}
