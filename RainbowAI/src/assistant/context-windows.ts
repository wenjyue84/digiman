import { getLLMSettings } from './llm-settings-loader.js';

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
 * Read context window sizes from llm-settings (cached, DB-first).
 * Re-reads on each call via cached loader so dashboard changes take effect quickly.
 */
export function getContextWindows(): ContextWindows {
  try {
    const settings = getLLMSettings();
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
