/**
 * Baileys Crash Isolation Supervisor
 *
 * Wraps WhatsApp (Baileys) initialization in a crash-resilient boundary
 * so that WhatsApp disconnects/crashes don't take down the MCP handler.
 *
 * Features:
 * - Catches all errors from Baileys initialization and runtime
 * - Auto-restarts with exponential backoff on crash
 * - Logs crash events for debugging
 * - Isolates Baileys errors from the main Express process
 */

import { initBaileys, registerMessageHandler, sendWhatsAppMessage, getWhatsAppStatus } from './baileys-client.js';
import { initAssistant } from '../assistant/index.js';
import { callAPI } from './http-client.js';
import { startDailyReportScheduler } from './daily-report.js';
import { initAdminNotifier, notifyAdminServerStartup, notifyAdminConfigCorruption } from './admin-notifier.js';
import { configStore } from '../assistant/config-store.js';

interface SupervisorConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_CONFIG: SupervisorConfig = {
  maxRetries: 10,
  baseDelayMs: 2000,
  maxDelayMs: 60000,
};

let retryCount = 0;
let isRunning = false;

function getBackoffDelay(attempt: number, config: SupervisorConfig): number {
  const delay = Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs);
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

/**
 * Initialize Baileys + Assistant with crash isolation.
 * If Baileys crashes, it will auto-restart without affecting the MCP handler.
 */
export async function startBaileysWithSupervision(config: Partial<SupervisorConfig> = {}): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (isRunning) {
    console.warn('[BaileysSupervisor] Already running, skipping duplicate start');
    return;
  }

  isRunning = true;
  await attemptStart(cfg);
}

async function attemptStart(config: SupervisorConfig): Promise<void> {
  try {
    // Initialize WhatsApp (Baileys) connection
    await initBaileys();
    console.log('[BaileysSupervisor] WhatsApp (Baileys) initializing...');

    // Reset retry count on successful init
    retryCount = 0;

    // Initialize Admin Notifier (for system admin alerts)
    initAdminNotifier({
      sendMessage: sendWhatsAppMessage
    });

    // Initialize AI Assistant (auto-reply to WhatsApp messages)
    try {
      await initAssistant({
        registerMessageHandler,
        sendMessage: sendWhatsAppMessage,
        callAPI,
        getWhatsAppStatus
      });
      console.log('[BaileysSupervisor] digiman Assistant initialized — WhatsApp auto-reply active');
    } catch (assistantErr: any) {
      // Assistant failure is non-fatal — WhatsApp still works for manual tools
      console.warn(`[BaileysSupervisor] Assistant init failed: ${assistantErr.message}`);
      console.warn('[BaileysSupervisor] WhatsApp auto-reply disabled. Manual tools still work.');
    }

    // One-time dedup cleanup for Baileys double-fire duplicates
    try {
      const { deduplicateMessages } = await import('../assistant/conversation-logger.js');
      await deduplicateMessages();
    } catch (err: any) {
      console.warn(`[BaileysSupervisor] Dedup cleanup failed (non-fatal): ${err.message}`);
    }

    // Start daily report scheduler (11:30 AM MYT)
    startDailyReportScheduler();

    // Notify system admin of server startup (after a delay to allow WhatsApp to connect)
    setTimeout(() => {
      notifyAdminServerStartup().catch(err => {
        console.warn(`[BaileysSupervisor] Failed to send server startup notification:`, err.message);
      });
    }, 5000); // 5 second delay to allow WhatsApp instances to connect

    // Notify system admin of config corruption (if any files failed to load)
    setTimeout(() => {
      const corruptedFiles = configStore.getCorruptedFiles();
      if (corruptedFiles.length > 0) {
        notifyAdminConfigCorruption(corruptedFiles).catch(err => {
          console.warn(`[BaileysSupervisor] Failed to send config corruption notification:`, err.message);
        });
      }
    }, 5000); // Same 5 second delay to allow WhatsApp instances to connect

  } catch (err: any) {
    console.error(`[BaileysSupervisor] Baileys crashed: ${err.message}`);

    if (retryCount >= config.maxRetries) {
      console.error(`[BaileysSupervisor] Max retries (${config.maxRetries}) reached. Giving up.`);
      console.error('[BaileysSupervisor] WhatsApp tools will be unavailable. Restart the server to retry.');
      isRunning = false;
      return;
    }

    const delay = getBackoffDelay(retryCount, config);
    retryCount++;
    console.warn(`[BaileysSupervisor] Retrying in ${delay}ms (attempt ${retryCount}/${config.maxRetries})...`);

    setTimeout(() => {
      attemptStart(config).catch(retryErr => {
        console.error(`[BaileysSupervisor] Retry failed unexpectedly: ${retryErr.message}`);
      });
    }, delay);
  }
}
