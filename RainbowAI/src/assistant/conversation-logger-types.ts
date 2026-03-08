/**
 * Types for the Conversation Logger subsystem.
 *
 * Extracted from conversation-logger.ts to keep the main file under 800 lines.
 * All callers still import these from conversation-logger.ts (re-exported there).
 */

export interface LoggedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;       // Unix ms
  intent?: string;
  confidence?: number;
  action?: string;
  manual?: boolean;
  source?: string;
  model?: string;
  responseTime?: number;
  kbFiles?: string[];
  messageType?: string;
  routedAction?: string;
  workflowId?: string;
  stepId?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  staffName?: string;        // US-011: Staff display name for manual message attribution
}

export interface ContactDetails {
  name?: string;
  email?: string;
  country?: string;
  language?: string;
  languageLocked?: boolean;
  checkIn?: string;
  checkOut?: string;
  unit?: string;
  notes?: string;
  contactStatus?: string;
  paymentStatus?: string;
  tags?: string[];
}

export interface ConversationLog {
  phone: string;
  pushName: string;
  instanceId?: string;
  messages: LoggedMessage[];
  contactDetails?: ContactDetails;
  pinned?: boolean;
  favourite?: boolean;
  lastReadAt?: number;
  responseMode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationSummary {
  phone: string;
  pushName: string;
  instanceId?: string;
  lastMessage: string;
  lastMessageRole: 'user' | 'assistant';
  lastMessageAt: number;
  messageCount: number;
  unreadCount: number;
  pinned?: boolean;
  favourite?: boolean;
  createdAt: number;
}
