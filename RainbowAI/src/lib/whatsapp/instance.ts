import makeWASocket, { useMultiFileAuthState, DisconnectReason, isLidUser, jidNormalizedUser } from '@whiskeysockets/baileys';
import fs from 'fs';
import type { IncomingMessage, MessageType } from '../../assistant/types.js';
import { trackWhatsAppConnected, trackWhatsAppDisconnected, trackWhatsAppUnlinked } from '../activity-tracker.js';
import { notifyAdminDisconnection, notifyAdminReconnect } from '../admin-notifier.js';
import type { WhatsAppInstanceStatus, MessageHandler } from './types.js';
import { LidMapper } from './lid-mapper.js';
import { ensureAvatar } from './avatar-cache.js';

export class WhatsAppInstance {
  id: string;
  label: string;
  authDir: string;
  sock: ReturnType<typeof makeWASocket> | null = null;
  state: string = 'close';
  qr: string | null = null;
  unlinkedFromWhatsApp: boolean = false;
  lastUnlinkedAt: string | null = null;
  lastConnectedAt: string | null = null;

  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private static readonly MAX_RECONNECT_ATTEMPTS = 3;
  private messageHandler: MessageHandler | null = null;
  private lidMapper: LidMapper;
  private unlinkNotificationSent: boolean = false;
  private onFirstConnect: (() => void) | null = null;

  constructor(id: string, label: string, authDir: string) {
    this.id = id;
    this.label = label;
    this.authDir = authDir;
    this.lidMapper = new LidMapper(id);
  }

  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  setOnFirstConnect(cb: () => void): void {
    this.onFirstConnect = cb;
  }

  /** Notify about unlinked instance via manager */
  private notifyUnlinked(notifyFn: (id: string, label: string) => Promise<void>): void {
    setTimeout(() => {
      notifyFn(this.id, this.label).catch(err => {
        console.error(`[Baileys:${this.id}] Failed to send unlink notification:`, err.message);
      });
    }, 1000);
  }

  async start(notifyUnlinkedFn: (id: string, label: string) => Promise<void>): Promise<void> {
    // Ensure auth dir exists
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }

    // Load existing LID→phone mappings from auth state files
    this.lidMapper.loadFromDisk(this.authDir);

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['PelangiManager', 'Chrome', '1.0.0']
    });

    this.sock.ev.on('creds.update', saveCreds);

    // ─── Connection Updates ─────────────────────────────────────────

    this.sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qr = qr;
        console.log(`[Baileys:${this.id}] QR code available. Visit /admin/rainbow/dashboard to scan.`);
      }

      if (connection) this.state = connection;

      if (connection === 'close') {
        this.handleDisconnect(lastDisconnect, notifyUnlinkedFn);
      } else if (connection === 'open') {
        this.handleConnected();
      }
    });

    // ─── LID Mapping Updates ────────────────────────────────────────

    // Track LID ↔ phone mappings from contacts (Baileys v7 uses @lid JIDs)
    this.sock.ev.on('contacts.upsert', (contacts: any[]) => {
      for (const contact of contacts) {
        if (contact.id && contact.lid) {
          const phoneJid = jidNormalizedUser(contact.id);
          const lidJid = jidNormalizedUser(contact.lid);
          this.lidMapper.add(lidJid, phoneJid);
        }
      }
    });

    // Extract mappings from history sync
    this.sock.ev.on('messaging-history.set' as any, (data: any) => {
      const contacts = data?.contacts;
      if (Array.isArray(contacts)) {
        let mapped = 0;
        for (const contact of contacts) {
          if (contact.id && contact.lid) {
            const phoneJid = jidNormalizedUser(contact.id);
            const lidJid = jidNormalizedUser(contact.lid);
            this.lidMapper.add(lidJid, phoneJid);
            mapped++;
          }
        }
        if (mapped > 0) {
          console.log(`[Baileys:${this.id}] History sync: ${mapped} LID→phone mappings loaded (total: ${this.lidMapper.size})`);
        }
      }
    });

    // ─── Incoming Messages ──────────────────────────────────────────

    this.sock.ev.on('messages.upsert', async (upsert: any) => {
      if (upsert.type !== 'notify') return;

      for (const msg of upsert.messages) {
        await this.handleIncomingMessage(msg);
      }
    });
  }

  private handleDisconnect(lastDisconnect: any, notifyUnlinkedFn: (id: string, label: string) => Promise<void>): void {
    const statusCode = lastDisconnect?.error?.output?.statusCode;

    if (statusCode !== DisconnectReason.loggedOut) {
      this.reconnectAttempts++;

      if (this.reconnectAttempts > WhatsAppInstance.MAX_RECONNECT_ATTEMPTS) {
        const reason = `code ${statusCode}, stopped after ${WhatsAppInstance.MAX_RECONNECT_ATTEMPTS} attempts`;
        console.warn(`[Baileys:${this.id}] ${reason}. Please visit dashboard to restart.`);
        notifyAdminDisconnection(this.id, this.label, reason).catch(err => {
          console.error(`[Baileys:${this.id}] Failed to notify admin of disconnection:`, err.message);
        });
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
        this.start(notifyUnlinkedFn);
      }, delay);
    } else {
      console.error(`[Baileys:${this.id}] Logged out from WhatsApp (user unlinked). Remove auth dir and re-pair.`);
      trackWhatsAppUnlinked(this.id);

      // Mark as unlinked from WhatsApp side
      this.unlinkedFromWhatsApp = true;
      this.lastUnlinkedAt = new Date().toISOString();

      // Trigger notification to user (only once per unlink event)
      if (!this.unlinkNotificationSent) {
        this.notifyUnlinked(notifyUnlinkedFn);
        this.unlinkNotificationSent = true;
      }
    }
  }

  private handleConnected(): void {
    this.qr = null;
    const wasReconnecting = this.reconnectAttempts > 0;
    this.reconnectAttempts = 0;

    // Clear unlinked status when reconnected
    this.unlinkedFromWhatsApp = false;
    this.lastUnlinkedAt = null;
    this.unlinkNotificationSent = false;

    // Update last connected timestamp
    this.lastConnectedAt = new Date().toISOString();
    this.onFirstConnect?.();

    const user = (this.sock as any)?.user;
    const userPhone = user?.id?.split(':')[0] || '?';
    console.log(`[Baileys:${this.id}] Connected: ${user?.name || 'Unknown'} (${userPhone})`);
    trackWhatsAppConnected(this.id, user?.name, userPhone);

    // Notify admin of reconnection (only if this was a reconnect, not initial connect)
    if (wasReconnecting) {
      notifyAdminReconnect(this.id, this.label, userPhone).catch(err => {
        console.error(`[Baileys:${this.id}] Failed to notify admin of reconnection:`, err.message);
      });
    }
  }

  private async handleIncomingMessage(msg: any): Promise<void> {
    try {
      if (msg.key.fromMe) return;
      if (msg.key.remoteJid === 'status@broadcast') return;

      const m = msg.message;
      let text = m?.conversation || m?.extendedTextMessage?.text || '';
      let messageType: MessageType = 'text';

      // Detect message type
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

      if (!text && messageType === 'text') return;

      const remoteJid = msg.key.remoteJid || '';
      const isGroup = remoteJid.endsWith('@g.us');

      // Resolve @lid JIDs to @s.whatsapp.net for reliable reply delivery
      const from = this.lidMapper.resolve(remoteJid, this.authDir);
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

      if (!isGroup) ensureAvatar(from).catch(() => {}); // fire-and-forget

      if (this.messageHandler) {
        await this.messageHandler(incoming);
      }
    } catch (err: any) {
      console.error(`[Baileys:${this.id}] Error processing incoming message:`, err.message);
    }
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

    const resolvedJid = this.lidMapper.resolve(jid, this.authDir);

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
    const resolvedJid = this.lidMapper.resolve(jid, this.authDir);
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

    const resolvedJid = this.lidMapper.resolve(jid, this.authDir);

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
