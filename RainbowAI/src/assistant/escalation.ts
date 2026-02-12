import type { EscalationContext, EscalationReason, EscalationTracker, SendMessageFn } from './types.js';
import { getTemplate } from './formatter.js';
import { configStore } from './config-store.js';

let sendMessageFn: SendMessageFn | null = null;

// Track pending escalations: guestPhone -> tracker
const pendingEscalations = new Map<string, EscalationTracker>();

export function initEscalation(sendMessage: SendMessageFn): void {
  sendMessageFn = sendMessage;
}

export function destroyEscalation(): void {
  // Clear all timers on shutdown
  for (const tracker of pendingEscalations.values()) {
    if (tracker.timer) clearTimeout(tracker.timer);
  }
  pendingEscalations.clear();
}

export async function escalateToStaff(context: EscalationContext): Promise<string> {
  if (!sendMessageFn) {
    console.error('[Escalation] sendMessage not initialized');
    return getTemplate('error', 'en');
  }

  const esc = configStore.getWorkflow().escalation;

  const reasonLabels: Record<EscalationReason, string> = {
    human_request: 'Guest requested human assistance',
    complaint: 'Guest complaint',
    unknown_repeated: 'Bot unable to understand (3+ attempts)',
    group_booking: 'Group booking request (5+ guests)',
    error: 'System error during conversation'
  };

  const label = reasonLabels[context.reason] || 'Unknown reason';
  const recentMsgs = context.recentMessages.slice(-3).join('\n> ');

  const staffMessage = [
    `*[ESCALATION]* ${label}`,
    ``,
    `*Guest:* ${context.pushName} (+${context.phone})`,
    `*Reason:* ${label}`,
    `*Last message:* ${context.originalMessage}`,
    ``,
    `*Recent conversation:*`,
    `> ${recentMsgs}`
  ].join('\n');

  // Step 1: Send to primary (Alston)
  try {
    await sendMessageFn(esc.primary_phone, staffMessage, context.instanceId);
    console.log(`[Escalation] Forwarded to primary (${esc.primary_phone}): ${context.reason} from +${context.phone}`);
  } catch (err: any) {
    console.error('[Escalation] Failed to forward to primary:', err.message);
  }

  // Step 2: Set timer for secondary fallback
  const existing = pendingEscalations.get(context.phone);
  if (existing?.timer) clearTimeout(existing.timer);

  const timer = setTimeout(async () => {
    try {
      const currentEsc = configStore.getWorkflow().escalation;
      const fallbackMsg = [
        `*[ESCALATION — FOLLOW-UP]* ${label}`,
        ``,
        `Primary was notified ${Math.round(currentEsc.timeout_ms / 60000)} minutes ago — no response yet.`,
        ``,
        `*Guest:* ${context.pushName} (+${context.phone})`,
        `*Reason:* ${label}`,
        `*Last message:* ${context.originalMessage}`,
        ``,
        `*Recent conversation:*`,
        `> ${recentMsgs}`
      ].join('\n');

      if (sendMessageFn) {
        await sendMessageFn(currentEsc.secondary_phone, fallbackMsg, context.instanceId);
        console.log(`[Escalation] Fallback to secondary (${currentEsc.secondary_phone}): ${context.reason} from +${context.phone}`);
      }

      const tracker = pendingEscalations.get(context.phone);
      if (tracker) tracker.secondaryNotified = true;
    } catch (err: any) {
      console.error('[Escalation] Failed to forward to secondary (fallback):', err.message);
    }
  }, esc.timeout_ms);

  pendingEscalations.set(context.phone, {
    guestPhone: context.phone,
    guestName: context.pushName,
    reason: context.reason,
    primaryNotifiedAt: Date.now(),
    secondaryNotified: false,
    timer,
    originalMessage: context.originalMessage
  });

  return getTemplate('escalating', 'en');
}

// Called from message-router when a staff phone sends a message — clears the timer
export function handleStaffReply(phone: string): void {
  const staffNumber = phone.replace(/[^0-9]/g, '');
  const esc = configStore.getWorkflow().escalation;

  if (staffNumber.includes(esc.primary_phone) || staffNumber.includes(esc.secondary_phone)) {
    // Clear all pending escalations (staff is actively responding)
    for (const [guestPhone, tracker] of pendingEscalations.entries()) {
      if (tracker.timer) {
        clearTimeout(tracker.timer);
        console.log(`[Escalation] Timer cleared — staff replied, guest: +${guestPhone}`);
      }
      pendingEscalations.delete(guestPhone);
    }
  }
}

export function shouldEscalate(
  reason: EscalationReason | null,
  unknownCount: number,
  guestCount?: number
): EscalationReason | null {
  const threshold = configStore.getWorkflow().escalation.unknown_threshold;
  if (reason === 'human_request' || reason === 'complaint') return reason;
  if (unknownCount >= threshold) return 'unknown_repeated';
  if (guestCount && guestCount >= 5) return 'group_booking';
  return null;
}
