import type { WorkflowState } from './workflow-executor.js';

// ─── Incoming Message ────────────────────────────────────────────────
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'sticker' | 'document' | 'contact' | 'location';

export interface IncomingMessage {
  from: string;        // Phone number (no @s.whatsapp.net)
  text: string;
  pushName: string;    // WhatsApp display name
  messageId: string;
  isGroup: boolean;
  timestamp: number;   // Unix seconds
  messageType: MessageType;
  instanceId?: string; // Which WhatsApp instance received this message
}

// ─── Intent Classification ──────────────────────────────────────────
export type IntentCategory =
  | 'greeting'
  | 'thanks'
  | 'wifi'
  | 'directions'
  | 'checkin_info'
  | 'checkout_info'
  | 'pricing'
  | 'availability'
  | 'booking'
  | 'complaint'
  | 'contact_staff'
  | 'facilities'
  | 'rules'
  | 'payment'
  | 'general'
  | 'unknown';

export interface IntentResult {
  category: IntentCategory;
  confidence: number;  // 0-1
  entities: Record<string, string>;  // extracted entities (dates, counts, etc.)
  source: 'regex' | 'fuzzy' | 'semantic' | 'llm';
  matchedKeyword?: string;  // For fuzzy matches
  matchedExample?: string;  // For semantic matches (Phase 3)
  detectedLanguage?: 'en' | 'ms' | 'zh' | 'unknown';  // Phase 2: Language detection
}

// ─── Conversation ───────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ConversationState {
  phone: string;
  pushName: string;
  messages: ChatMessage[];
  language: 'en' | 'ms' | 'zh';
  bookingState: BookingState | null;
  workflowState: WorkflowState | null;  // NEW: Workflow execution state
  unknownCount: number;  // consecutive unknown intents
  createdAt: number;
  lastActiveAt: number;
  // NEW: Context-aware intent tracking
  lastIntent: string | null;              // e.g., "booking", "wifi"
  lastIntentConfidence: number | null;    // e.g., 0.95
  lastIntentTimestamp: number | null;     // When intent was detected (ms)
  slots: Record<string, any>;             // { checkInDate: "tomorrow", guests: 2 }
  repeatCount: number;                     // consecutive times same intent classified
}

// ─── Booking State Machine ──────────────────────────────────────────
export type BookingStage = 'inquiry' | 'dates' | 'guests' | 'confirm' | 'done' | 'cancelled' | 'save_sale';

export interface BookingState {
  stage: BookingStage;
  checkIn?: string;     // ISO date
  checkOut?: string;    // ISO date
  guests?: number;
  priceBreakdown?: PriceBreakdown;
  guestName?: string;
  guestPhone?: string;
  cancelReason?: string;
}

export interface BookingStepResult {
  response: string;
  newState: BookingState;
}

// ─── Pricing ────────────────────────────────────────────────────────
export interface PricingConfig {
  currency: string;
  daily: number;
  weekly: number;
  monthly: number;
  deposit: number;
  depositNote: string;
  latecheckout_per_hour: number;
  keycard_deposit: number;
  laundry_per_load: number;
  discounts: {
    weekly_savings: number;
    monthly_vs_daily: string;
  };
}

export interface Holiday {
  date: string;  // ISO date
  name: string;
}

export interface HolidaysData {
  year: number;
  country: string;
  holidays: Holiday[];
}

export interface PriceBreakdown {
  nights: number;
  rateType: 'daily' | 'weekly' | 'monthly';
  baseRate: number;
  totalBase: number;
  deposit: number;
  total: number;
  savings?: string;
  currency: string;
}

// ─── Rate Limiting ──────────────────────────────────────────────────
export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;  // seconds
  reason?: string;
}

// ─── Escalation ─────────────────────────────────────────────────────
export type EscalationReason = 'human_request' | 'complaint' | 'unknown_repeated' | 'group_booking' | 'error';

export interface EscalationContext {
  phone: string;
  pushName: string;
  reason: EscalationReason;
  recentMessages: string[];
  originalMessage: string;
  instanceId?: string; // Reply via the same WhatsApp instance
}

// ─── Escalation Tracker (Tiered) ────────────────────────────────────
export interface EscalationTracker {
  guestPhone: string;
  guestName: string;
  reason: EscalationReason;
  primaryNotifiedAt: number;  // Unix ms when Alston was notified
  secondaryNotified: boolean; // Whether Jay was notified
  timer: ReturnType<typeof setTimeout> | null;
  originalMessage: string;
}

// ─── Dependencies (Injected from mcp-server) ───────────────────────
export type SendMessageFn = (phone: string, text: string, instanceId?: string) => Promise<any>;
export type CallAPIFn = <T>(method: string, path: string, data?: any) => Promise<T>;
export type GetWhatsAppStatusFn = () => { state: string; user: any; authDir: string; qr: string | null };
export type RegisterMessageHandlerFn = (handler: (msg: IncomingMessage) => Promise<void>) => void;

export interface AssistantDependencies {
  registerMessageHandler: RegisterMessageHandlerFn;
  sendMessage: SendMessageFn;
  callAPI: CallAPIFn;
  getWhatsAppStatus: GetWhatsAppStatusFn;
}

// ─── AI Client ──────────────────────────────────────────────────────
export interface AIClassifyResult {
  category: IntentCategory;
  confidence: number;
  entities: Record<string, string>;
}

export interface AIClientConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

// ─── Knowledge Base ─────────────────────────────────────────────────
export interface KnowledgeEntry {
  intent: IntentCategory;
  response: Record<'en' | 'ms' | 'zh', string>;
}
