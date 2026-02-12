// ─── Sub-Intent Detection: Info vs Problem vs Complaint ─────────────
// Multilingual regex patterns to classify the MESSAGE TYPE (not topic).
// Used by the problem override layer to decide if a static reply is appropriate.

export type MessageSubType = 'info' | 'problem' | 'complaint';

const COMPLAINT_PATTERNS = [
  // English — strong negative sentiment, escalation language
  /terrible|awful|worst|disgusting|unacceptable|angry|furious|disappointed|refund|manager|ridiculous|horrible|outraged/i,
  // Malay
  /teruk|marah|kecewa|tak puas hati|mahu refund|nak refund|sangat teruk/i,
  // Chinese
  /太差|生气|失望|退款|投诉|差劲|糟糕|愤怒|不满意/i,
];

const PROBLEM_PATTERNS = [
  // English — inability, malfunction, request for help
  /can'?t|cannot|doesn'?t work|not working|broken|stuck|fail|error|issue|problem|wrong|trouble|help me|no signal|unable/i,
  // Malay
  /tak boleh|tidak boleh|rosak|masalah|tolong|tak jalan|tak berfungsi|gagal|tidak dapat/i,
  // Chinese
  /不能|不行|坏了|问题|帮忙|故障|不好用|没办法|不了|连不上|用不了/i,
];

/**
 * Detect the sub-intent type of a message.
 * - `complaint` = strong negative sentiment, wants escalation/refund
 * - `problem`   = reports a malfunction, needs troubleshooting help
 * - `info`      = neutral information request (default)
 */
export function detectMessageType(text: string): MessageSubType {
  if (COMPLAINT_PATTERNS.some(p => p.test(text))) return 'complaint';
  if (PROBLEM_PATTERNS.some(p => p.test(text))) return 'problem';
  return 'info';
}
