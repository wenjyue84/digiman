import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ContextWindows {
  classify: number;
  reply: number;
  combined: number;
}

const DEFAULTS: ContextWindows = { classify: 5, reply: 10, combined: 20 };

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

/**
 * Read context window sizes from llm-settings.json.
 * Re-reads on each call so dashboard changes take effect immediately.
 */
export function getContextWindows(): ContextWindows {
  try {
    const raw = readFileSync(join(__dirname, 'data', 'llm-settings.json'), 'utf-8');
    const settings = JSON.parse(raw);
    const cw = settings.contextWindows;
    if (!cw || typeof cw !== 'object') return { ...DEFAULTS };
    return {
      classify: clamp(cw.classify, 1, 50, DEFAULTS.classify),
      reply: clamp(cw.reply, 1, 50, DEFAULTS.reply),
      combined: clamp(cw.combined, 1, 50, DEFAULTS.combined),
    };
  } catch {
    return { ...DEFAULTS };
  }
}
