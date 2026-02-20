/**
 * WhatsApp Module - Public API
 *
 * Provides backward-compatible exports for existing code while using
 * the new modular structure internally.
 */

import path from 'path';
import { WhatsAppManager } from './manager.js';
import type { MessageHandler } from './types.js';

// Use process.cwd() (= RainbowAI/) — __dirname is dist/ in esbuild bundle
const LEGACY_AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.resolve(process.cwd(), 'whatsapp-auth');

// ─── Export Types ───────────────────────────────────────────────────

export type { WhatsAppInstanceStatus, MessageHandler } from './types.js';
export { WhatsAppInstance } from './instance.js';
export { WhatsAppManager, formatPhoneNumber } from './manager.js';
export { LidMapper } from './lid-mapper.js';
export { ensureAvatar, getAvatarFilePath } from './avatar-cache.js';

// ─── Singleton Instance ─────────────────────────────────────────────

export const whatsappManager = new WhatsAppManager();

// ─── Backward-Compatible Exports ────────────────────────────────────

export async function initBaileys(): Promise<void> {
  await whatsappManager.init();
}

export function registerMessageHandler(handler: MessageHandler): void {
  whatsappManager.registerMessageHandler(handler);
}

export function getWhatsAppStatus(): {
  state: string;
  user: any;
  authDir: string;
  qr: string | null;
  unlinkedFromWhatsApp?: boolean;
  lastUnlinkedAt?: string | null;
} {
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

export async function sendWhatsAppMedia(
  phone: string,
  buffer: Buffer,
  mimetype: string,
  fileName: string,
  caption?: string,
  instanceId?: string
): Promise<any> {
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
