import { loadAdminNotificationSettings } from './admin-notification-settings.js';

/**
 * Admin Notifier
 *
 * Centralized service for sending critical alerts to system administrator
 * via WhatsApp. Used for instance disconnections, unlinks, and server events.
 */

export interface NotificationContext {
  sendMessage: (phone: string, text: string, instanceId?: string) => Promise<any>;
  getConnectedInstance?: () => { id: string; state: string } | null;
}

let notificationContext: NotificationContext | null = null;

/**
 * Initialize the admin notifier with WhatsApp send capabilities.
 * Must be called once at server startup after WhatsApp instances are ready.
 */
export function initAdminNotifier(context: NotificationContext): void {
  notificationContext = context;
  console.log('[AdminNotifier] ✅ Initialized');
}

/**
 * Send WhatsApp instance disconnection alert to system admin
 */
export async function notifyAdminDisconnection(
  instanceId: string,
  instanceLabel: string,
  reason: string
): Promise<void> {
  if (!notificationContext) {
    console.warn('[AdminNotifier] Not initialized — cannot send disconnect notification');
    return;
  }

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled || !settings.notifyOnDisconnect) {
    console.log('[AdminNotifier] Disconnect notifications disabled in settings');
    return;
  }

  const message = `⚠️ *WhatsApp Instance Disconnected*\n\n` +
    `Instance: *${instanceLabel}*\n` +
    `ID: ${instanceId}\n` +
    `Reason: ${reason}\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
    `Please check the Rainbow Admin dashboard:\n` +
    `http://localhost:3002/dashboard`;

  try {
    await notificationContext.sendMessage(settings.systemAdminPhone, message);
    console.log(`[AdminNotifier] Sent disconnect notification to +${settings.systemAdminPhone}`);
  } catch (err: any) {
    console.error(`[AdminNotifier] Failed to send disconnect notification:`, err.message);
  }
}

/**
 * Send WhatsApp instance unlink alert to system admin
 */
export async function notifyAdminUnlink(
  instanceId: string,
  instanceLabel: string,
  instancePhone: string
): Promise<void> {
  if (!notificationContext) {
    console.warn('[AdminNotifier] Not initialized — cannot send unlink notification');
    return;
  }

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled || !settings.notifyOnUnlink) {
    console.log('[AdminNotifier] Unlink notifications disabled in settings');
    return;
  }

  const message = `🚨 *WhatsApp Instance Unlinked*\n\n` +
    `Your WhatsApp instance *"${instanceLabel}"* (${instancePhone}) has been unlinked from WhatsApp.\n\n` +
    `This usually means someone logged out from WhatsApp > Linked Devices, or the session expired.\n\n` +
    `To reconnect:\n` +
    `1. Visit: http://localhost:3002/dashboard\n` +
    `2. Click "Pair QR" next to the instance\n` +
    `3. Scan with WhatsApp > Linked Devices > Link a Device\n\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`;

  try {
    await notificationContext.sendMessage(settings.systemAdminPhone, message);
    console.log(`[AdminNotifier] Sent unlink notification to +${settings.systemAdminPhone}`);
  } catch (err: any) {
    console.error(`[AdminNotifier] Failed to send unlink notification:`, err.message);
  }
}

/** Cooldown: only one reconnect notification per instance per 10 minutes */
const RECONNECT_NOTIFY_COOLDOWN_MS = 10 * 60 * 1000;
const lastReconnectNotifyAt = new Map<string, number>();

/** Max server startup notifications per number per calendar day (Asia/Kuala_Lumpur) */
const MAX_SERVER_STARTUP_PER_DAY = 3;
const serverStartupSendCount = new Map<string, { date: string; count: number }>();

function getTodayKL(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }); // YYYY-MM-DD
}

/**
 * Send MCP server reconnection alert to system admin.
 * Throttled to at most one notification per instance per 10 minutes.
 */
export async function notifyAdminReconnect(
  instanceId: string,
  instanceLabel: string,
  instancePhone: string
): Promise<void> {
  if (!notificationContext) {
    console.warn('[AdminNotifier] Not initialized — cannot send reconnect notification');
    return;
  }

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled || !settings.notifyOnReconnect) {
    console.log('[AdminNotifier] Reconnect notifications disabled in settings');
    return;
  }

  const now = Date.now();
  const lastAt = lastReconnectNotifyAt.get(instanceId) ?? 0;
  if (now - lastAt < RECONNECT_NOTIFY_COOLDOWN_MS) {
    console.log(`[AdminNotifier] Reconnect notification skipped (cooldown for ${instanceId})`);
    return;
  }
  lastReconnectNotifyAt.set(instanceId, now);

  const message = `✅ *WhatsApp Instance Reconnected*\n\n` +
    `Instance: *${instanceLabel}*\n` +
    `Phone: ${instancePhone}\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
    `The Rainbow AI assistant is now active and monitoring guest messages.`;

  try {
    await notificationContext.sendMessage(settings.systemAdminPhone, message);
    console.log(`[AdminNotifier] Sent reconnect notification to +${settings.systemAdminPhone}`);
  } catch (err: any) {
    console.error(`[AdminNotifier] Failed to send reconnect notification:`, err.message);
  }
}

/**
 * Send MCP server startup alert to system admin.
 * Limited to 3 sends per number per calendar day (Asia/Kuala_Lumpur).
 * On the 3rd send, informs the user they will not receive this message again until 12am.
 */
export async function notifyAdminServerStartup(): Promise<void> {
  if (!notificationContext) {
    console.warn('[AdminNotifier] Not initialized — cannot send startup notification');
    return;
  }

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled || !settings.notifyOnReconnect) {
    console.log('[AdminNotifier] Server startup notifications disabled in settings');
    return;
  }

  const phone = settings.systemAdminPhone;
  const today = getTodayKL();
  let entry = serverStartupSendCount.get(phone);
  if (!entry || entry.date !== today) {
    entry = { date: today, count: 0 };
    serverStartupSendCount.set(phone, entry);
  }

  if (entry.count >= MAX_SERVER_STARTUP_PER_DAY) {
    console.log(`[AdminNotifier] Server startup notification skipped (max ${MAX_SERVER_STARTUP_PER_DAY}/day for +${phone})`);
    return;
  }

  entry.count += 1;
  const isLastOfDay = entry.count === MAX_SERVER_STARTUP_PER_DAY;

  let message = `🔄 *Rainbow MCP Server Started*\n\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
    `The MCP server has restarted successfully.\n` +
    `WhatsApp instances are initializing...\n\n` +
    `Dashboard: http://localhost:3002/dashboard`;
  if (isLastOfDay) {
    message += `\n\n_You will not receive this message again until 12am today._`;
  }

  try {
    await notificationContext.sendMessage(phone, message);
    console.log(`[AdminNotifier] Sent server startup notification to +${phone} (${entry.count}/${MAX_SERVER_STARTUP_PER_DAY} today)`);
  } catch (err: any) {
    entry.count -= 1; // rollback on failure so they can still get up to 3
    console.error(`[AdminNotifier] Failed to send startup notification:`, err.message);
  }
}

/**
 * Send config corruption alert to system admin
 * Notifies when JSON config files fail to load and system falls back to defaults
 */
export async function notifyAdminConfigCorruption(corruptedFiles: string[]): Promise<void> {
  if (!notificationContext) {
    console.warn('[AdminNotifier] Not initialized — cannot send config corruption notification');
    return;
  }

  if (corruptedFiles.length === 0) {
    return; // Nothing to notify
  }

  const settings = await loadAdminNotificationSettings();
  if (!settings.enabled) {
    console.log('[AdminNotifier] Admin notifications disabled in settings');
    return;
  }

  const fileList = corruptedFiles.map(f => `  • ${f}`).join('\n');
  const message = `⚠️ *Configuration Error Detected*\n\n` +
    `The following config files failed to load:\n${fileList}\n\n` +
    `**Action Taken:**\n` +
    `✅ Server started with safe default configs\n` +
    `✅ Rainbow AI is operational in safe mode\n` +
    `⚠️ Some features may be limited\n\n` +
    `**What You Need to Do:**\n` +
    `1. Check the config files for JSON syntax errors\n` +
    `2. Fix any malformed JSON or missing required fields\n` +
    `3. Restart the server to reload configs\n\n` +
    `💡 *Tip:* Use the Rainbow Admin dashboard to edit configs:\n` +
    `http://localhost:3002/dashboard\n\n` +
    `Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`;

  try {
    await notificationContext.sendMessage(settings.systemAdminPhone, message);
    console.log(`[AdminNotifier] ✅ Sent config corruption notification to +${settings.systemAdminPhone}`);
  } catch (err: any) {
    console.error(`[AdminNotifier] Failed to send config corruption notification:`, err.message);
  }
}
