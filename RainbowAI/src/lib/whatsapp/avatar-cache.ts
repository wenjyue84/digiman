import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { whatsappManager } from './index.js';
import { formatPhoneNumber } from './manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = path.resolve(__dirname, '../../../data/avatars');
const META_FILE = path.join(AVATAR_DIR, '_meta.json');

const CACHE_TTL = 24 * 60 * 60 * 1000;      // 24 hours for avatars we have
const NO_AVATAR_TTL = 60 * 60 * 1000;        // 1 hour retry for missing avatars
const inFlight = new Set<string>();

interface AvatarMeta {
  [phone: string]: { fetchedAt: number; hasAvatar: boolean };
}

function loadMeta(): AvatarMeta {
  try {
    if (fs.existsSync(META_FILE)) {
      return JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
    }
  } catch { /* ignore corrupt file */ }
  return {};
}

function saveMeta(meta: AvatarMeta): void {
  if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
  }
  const tmp = META_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(meta, null, 2), 'utf-8');
  fs.renameSync(tmp, META_FILE);
}

function cleanPhone(phone: string): string {
  return formatPhoneNumber(phone.replace(/@s\.whatsapp\.net$/i, ''));
}

/** Fire-and-forget: fetch + cache avatar if needed. Never throws. */
export async function ensureAvatar(phone: string): Promise<void> {
  const clean = cleanPhone(phone);
  if (!clean || inFlight.has(clean)) return;

  const meta = loadMeta();
  const entry = meta[clean];
  if (entry) {
    const age = Date.now() - entry.fetchedAt;
    const ttl = entry.hasAvatar ? CACHE_TTL : NO_AVATAR_TTL;
    if (age < ttl) return; // still fresh
  }

  inFlight.add(clean);
  try {
    const url = await whatsappManager.fetchProfilePictureUrl(clean);
    if (!url) {
      meta[clean] = { fetchedAt: Date.now(), hasAvatar: false };
      saveMeta(meta);
      return;
    }

    // Download image
    const res = await fetch(url);
    if (!res.ok) {
      meta[clean] = { fetchedAt: Date.now(), hasAvatar: false };
      saveMeta(meta);
      return;
    }

    if (!fs.existsSync(AVATAR_DIR)) {
      fs.mkdirSync(AVATAR_DIR, { recursive: true });
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const filePath = path.join(AVATAR_DIR, clean + '.jpg');
    fs.writeFileSync(filePath, buffer);

    meta[clean] = { fetchedAt: Date.now(), hasAvatar: true };
    saveMeta(meta);
    console.log(`[AvatarCache] Saved avatar for ${clean}`);
  } catch (err: any) {
    console.warn(`[AvatarCache] Failed to fetch avatar for ${clean}: ${err.message}`);
  } finally {
    inFlight.delete(clean);
  }
}

/** Returns absolute file path if cached avatar exists, or null. */
export function getAvatarFilePath(phone: string): string | null {
  const clean = cleanPhone(phone);
  if (!clean) return null;
  const filePath = path.join(AVATAR_DIR, clean + '.jpg');
  if (fs.existsSync(filePath)) return filePath;
  return null;
}
