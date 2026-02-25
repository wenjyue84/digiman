/**
 * rainbow-proxy.ts — Shared helper for PMS routes that proxy to Rainbow API.
 *
 * Rainbow AI runs on port 3002 (same host in both dev and production).
 * PMS routes call this to forward requests while preserving their own auth layer.
 */

const RAINBOW_URL = process.env.RAINBOW_URL || "http://localhost:3002";

export async function rainbowFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${RAINBOW_URL}/api/rainbow${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}
