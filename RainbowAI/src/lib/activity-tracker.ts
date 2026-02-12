/**
 * Activity Tracker — Real-time event log with SSE broadcast
 * 
 * Captures events from message-router, baileys-client, config-store, etc.
 * Broadcasts to all connected SSE clients for real-time dashboard updates.
 */

import { EventEmitter } from 'events';

export interface ActivityEvent {
  id: string;
  type: 'message_received' | 'intent_classified' | 'response_sent'
      | 'whatsapp_connected' | 'whatsapp_disconnected' | 'whatsapp_unlinked'
      | 'config_reloaded' | 'escalation' | 'workflow_started' | 'booking_started'
      | 'error' | 'feedback' | 'rate_limited' | 'emergency';
  icon: string;
  message: string;
  timestamp: string; // ISO string
  metadata?: Record<string, any>;
}

const ICON_MAP: Record<ActivityEvent['type'], string> = {
  message_received: '💬',
  intent_classified: '🤖',
  response_sent: '✓',
  whatsapp_connected: '📱',
  whatsapp_disconnected: '📴',
  whatsapp_unlinked: '⚠️',
  config_reloaded: '⚙️',
  escalation: '🚨',
  workflow_started: '🔄',
  booking_started: '📅',
  error: '❌',
  feedback: '👍',
  rate_limited: '🛑',
  emergency: '🆘',
};

const MAX_EVENTS = 100;
let eventCounter = 0;

class ActivityTracker extends EventEmitter {
  private events: ActivityEvent[] = [];

  /** Add a new activity event and broadcast to SSE clients */
  track(type: ActivityEvent['type'], message: string, metadata?: Record<string, any>): void {
    const event: ActivityEvent = {
      id: `evt-${++eventCounter}-${Date.now()}`,
      type,
      icon: ICON_MAP[type] || '📋',
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.events.push(event);

    // Ring buffer — keep only last MAX_EVENTS
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }

    // Broadcast to SSE clients
    this.emit('activity', event);
  }

  /** Get recent events (newest first) */
  getRecent(limit = 20): ActivityEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /** Get events since a specific event ID */
  getSince(lastEventId: string): ActivityEvent[] {
    const idx = this.events.findIndex(e => e.id === lastEventId);
    if (idx === -1) return this.events.slice(-20).reverse();
    return this.events.slice(idx + 1).reverse();
  }
}

// Singleton
export const activityTracker = new ActivityTracker();

// ─── Convenience helpers for common events ─────────────────────────

/** Track an incoming WhatsApp message */
export function trackMessageReceived(phone: string, pushName: string, text: string): void {
  const displayName = pushName || phone.split('@')[0];
  const preview = text.length > 50 ? text.slice(0, 50) + '...' : text;
  activityTracker.track('message_received', `Message from ${displayName}: "${preview}"`, {
    phone, pushName, textPreview: preview,
  });
}

/** Track intent classification result */
export function trackIntentClassified(intent: string, confidence: number, source: string): void {
  const pct = Math.round(confidence * 100);
  activityTracker.track('intent_classified', `Classified as "${intent}" (${pct}% via ${source})`, {
    intent, confidence, source,
  });
}

/** Track a response being sent */
export function trackResponseSent(phone: string, pushName: string, action: string, responseTime?: number): void {
  const displayName = pushName || phone.split('@')[0];
  const timeStr = responseTime ? ` in ${responseTime}ms` : '';
  activityTracker.track('response_sent', `Reply sent to ${displayName}${timeStr} (${action})`, {
    phone, pushName, action, responseTime,
  });
}

/** Track WhatsApp connection */
export function trackWhatsAppConnected(instanceId: string, name?: string, phoneNumber?: string): void {
  const who = name ? `${name} (${phoneNumber || instanceId})` : instanceId;
  activityTracker.track('whatsapp_connected', `WhatsApp connected: ${who}`, {
    instanceId, name, phoneNumber,
  });
}

/** Track WhatsApp disconnection */
export function trackWhatsAppDisconnected(instanceId: string, reason?: string): void {
  const extra = reason ? ` — ${reason}` : '';
  activityTracker.track('whatsapp_disconnected', `WhatsApp disconnected: ${instanceId}${extra}`, {
    instanceId, reason,
  });
}

/** Track WhatsApp unlinked */
export function trackWhatsAppUnlinked(instanceId: string): void {
  activityTracker.track('whatsapp_unlinked', `WhatsApp unlinked: ${instanceId} — re-pair needed`, {
    instanceId,
  });
}

/** Track config reload */
export function trackConfigReloaded(domain?: string): void {
  const extra = domain ? ` (${domain})` : '';
  activityTracker.track('config_reloaded', `Configuration reloaded${extra}`, { domain });
}

/** Track escalation to staff */
export function trackEscalation(phone: string, pushName: string, reason: string): void {
  const displayName = pushName || phone.split('@')[0];
  activityTracker.track('escalation', `Escalated ${displayName} to staff: ${reason}`, {
    phone, pushName, reason,
  });
}

/** Track workflow started */
export function trackWorkflowStarted(phone: string, pushName: string, workflowName: string): void {
  const displayName = pushName || phone.split('@')[0];
  activityTracker.track('workflow_started', `Started workflow "${workflowName}" for ${displayName}`, {
    phone, pushName, workflowName,
  });
}

/** Track booking started */
export function trackBookingStarted(phone: string, pushName: string): void {
  const displayName = pushName || phone.split('@')[0];
  activityTracker.track('booking_started', `Booking flow started by ${displayName}`, {
    phone, pushName,
  });
}

/** Track error */
export function trackError(context: string, errorMessage: string): void {
  activityTracker.track('error', `Error in ${context}: ${errorMessage}`, {
    context, error: errorMessage,
  });
}

/** Track feedback received */
export function trackFeedback(phone: string, pushName: string, rating: number): void {
  const displayName = pushName || phone.split('@')[0];
  const emoji = rating === 1 ? '👍' : '👎';
  activityTracker.track('feedback', `${displayName} gave ${emoji} feedback`, {
    phone, pushName, rating,
  });
}

/** Track rate limit hit */
export function trackRateLimited(phone: string): void {
  activityTracker.track('rate_limited', `Rate limit hit for ${phone.split('@')[0]}`, { phone });
}

/** Track emergency */
export function trackEmergency(phone: string, pushName: string): void {
  const displayName = pushName || phone.split('@')[0];
  activityTracker.track('emergency', `EMERGENCY detected from ${displayName}`, {
    phone, pushName,
  });
}
