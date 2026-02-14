import { EventEmitter } from 'events';
import { configStore } from './config-store.js';
import { createModuleLogger } from '../lib/logger.js';

const logger = createModuleLogger('ApprovalQueue');

export interface PendingApproval {
  id: string;
  phone: string;
  pushName: string;
  originalMessage: string;
  suggestedResponse: string;
  intent: string;
  confidence: number;
  language: 'en' | 'ms' | 'zh';
  createdAt: number;
  expiresAt: number;
  metadata: {
    source: string;
    model: string;
    kbFiles?: string[];
  };
}

const queue = new Map<string, PendingApproval>();
const emitter = new EventEmitter();

/**
 * Generate a simple UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Add a new approval to the queue
 */
export function addApproval(
  approval: Omit<PendingApproval, 'id' | 'createdAt' | 'expiresAt'>
): string {
  const id = generateUUID();
  const now = Date.now();
  const settings = configStore.getSettings();
  const timeoutMinutes = (settings as any).response_modes?.copilot?.queue_timeout_minutes ?? 30;
  const timeoutMs = timeoutMinutes * 60 * 1000;

  queue.set(id, {
    ...approval,
    id,
    createdAt: now,
    expiresAt: now + timeoutMs,
  });

  emitter.emit('approval:added', id);
  logger.info('Added approval', {
    approvalId: id,
    phone: approval.phone,
    intent: approval.intent,
    confidence: approval.confidence
  });
  return id;
}

/**
 * Get a specific approval by ID
 */
export function getApproval(id: string): PendingApproval | null {
  return queue.get(id) || null;
}

/**
 * Get all approvals for a specific phone number
 */
export function getApprovalsByPhone(phone: string): PendingApproval[] {
  return Array.from(queue.values())
    .filter((a) => a.phone === phone)
    .sort((a, b) => a.createdAt - b.createdAt); // Oldest first
}

/**
 * Get all pending approvals
 */
export function getAllApprovals(): PendingApproval[] {
  return Array.from(queue.values()).sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Approve and mark as sent
 */
export function approveAndSend(id: string, editedResponse?: string): boolean {
  const approval = queue.get(id);
  if (!approval) return false;

  const finalResponse = editedResponse || approval.suggestedResponse;
  queue.delete(id);
  emitter.emit('approval:approved', id, finalResponse);
  logger.info('Approved', { approvalId: id, phone: approval.phone });
  return true;
}

/**
 * Reject an approval
 */
export function rejectApproval(id: string): boolean {
  const approval = queue.get(id);
  if (!approval) return false;

  queue.delete(id);
  emitter.emit('approval:rejected', id);
  logger.info('Rejected', { approvalId: id, phone: approval.phone });
  return true;
}

/**
 * Clean up expired approvals
 */
export function cleanupExpired(): number {
  const now = Date.now();
  let count = 0;
  for (const [id, approval] of queue.entries()) {
    if (now > approval.expiresAt) {
      queue.delete(id);
      emitter.emit('approval:expired', id);
      logger.info('Expired', { approvalId: id, phone: approval.phone });
      count++;
    }
  }
  if (count > 0) {
    logger.info('Cleaned up expired approvals', { count });
  }
  return count;
}

// Auto-cleanup every 5 minutes
setInterval(cleanupExpired, 5 * 60 * 1000);

export const approvalEmitter = emitter;
