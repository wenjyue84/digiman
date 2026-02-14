/**
 * File operation utilities for admin routes.
 *
 * Centralizes atomic write pattern used in intent-manager.ts and other config files.
 */

import { promises as fsPromises, renameSync } from 'fs';

/**
 * Atomic write: write to .tmp then rename to prevent corruption on crash.
 */
export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmpPath = filePath + '.tmp';
  await fsPromises.writeFile(tmpPath, content, 'utf-8');
  renameSync(tmpPath, filePath);
}

/**
 * Atomic JSON write: write JSON with pretty-printing.
 */
export async function atomicWriteJSON(filePath: string, data: any): Promise<void> {
  await atomicWrite(filePath, JSON.stringify(data, null, 2));
}

/**
 * Safe JSON read with fallback value on error.
 */
export async function safeReadJSON<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const raw = await fsPromises.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}
