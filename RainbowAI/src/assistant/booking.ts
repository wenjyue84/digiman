import type { BookingState, BookingStepResult, CallAPIFn, ChatMessage } from './types.js';
import { calculatePrice } from './pricing.js';
import { formatPriceBreakdown, formatDate, getTemplate } from './formatter.js';
import { isAIAvailable, chat } from './ai-client.js';

type Language = 'en' | 'ms' | 'zh';

let callAPIFn: CallAPIFn | null = null;

export function initBooking(callAPI: CallAPIFn): void {
  callAPIFn = callAPI;
}

export function createBookingState(): BookingState {
  return { stage: 'inquiry' };
}

// ─── Date Parsing (regex fallback) ──────────────────────────────────
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(input: string): string | null {
  const trimmed = input.trim();

  const isoMatch = trimmed.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1]);
    const m = parseInt(isoMatch[2]) - 1;
    const day = parseInt(isoMatch[3]);
    const d = new Date(y, m, day);
    if (!isNaN(d.getTime())) return toLocalDateStr(d);
  }

  const dmyMatch = trimmed.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    const m = parseInt(dmyMatch[2]) - 1;
    const y = parseInt(dmyMatch[3]);
    const d = new Date(y, m, day);
    if (!isNaN(d.getTime())) return toLocalDateStr(d);
  }

  const date = new Date(trimmed);
  if (!isNaN(date.getTime()) && date.getFullYear() >= 2025) {
    return toLocalDateStr(date);
  }

  return null;
}

function parseGuestCount(input: string): number | null {
  const match = input.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 1 && num <= 20) return num;
  }
  return null;
}

function isCancelMessage(text: string): boolean {
  return /\b(cancel|batal|no\s*thanks|nevermind|never\s*mind|stop|don'?t\s*want|tak\s*jadi|tak\s*nak)\b/i.test(text) || /取消/.test(text);
}

// ─── AI-Powered Date Extraction ─────────────────────────────────────
interface AIBookingExtraction {
  checkIn?: string;   // ISO date
  checkOut?: string;  // ISO date
  guests?: number;
  understood: boolean;
}

async function aiExtractBookingInfo(
  userMessage: string,
  history: ChatMessage[] = []
): Promise<AIBookingExtraction | null> {
  if (!isAIAvailable()) return null;

  const today = new Date();
  const todayStr = toLocalDateStr(today);

  const extractPrompt = `You are a booking info extractor. Today's date is ${todayStr}.
Extract check-in date, check-out date, and guest count from the user's message.
Interpret relative dates like "next Friday", "tomorrow", "this weekend" relative to today.
If only one date is given, assume 1 night stay (check-out = check-in + 1 day).
If guest count is not mentioned, don't include it.

Respond with ONLY valid JSON (no markdown):
{"checkIn":"YYYY-MM-DD","checkOut":"YYYY-MM-DD","guests":N,"understood":true}

If you cannot extract any dates, respond:
{"understood":false}`;

  try {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: extractPrompt }
    ];
    // Include recent history for context
    for (const msg of history.slice(-5)) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: userMessage });

    const aiResponse = await chat(extractPrompt, history.slice(-5), userMessage);
    // Try to parse JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.understood === false) return null;
      return {
        checkIn: parsed.checkIn || undefined,
        checkOut: parsed.checkOut || undefined,
        guests: typeof parsed.guests === 'number' ? parsed.guests : undefined,
        understood: true
      };
    }
  } catch (err: any) {
    console.warn('[Booking] AI extraction failed:', err.message);
  }
  return null;
}

// ─── AI Conversational Response ─────────────────────────────────────
async function aiBookingResponse(
  context: string,
  userMessage: string,
  lang: Language,
  history: ChatMessage[] = []
): Promise<string | null> {
  if (!isAIAvailable()) return null;

  const langName = lang === 'ms' ? 'Malay' : lang === 'zh' ? 'Chinese' : 'English';
  const prompt = `You are Rainbow, a warm and helpful AI booking assistant for Pelangi Capsule Hostel in Johor Bahru.
${context}
Reply naturally and conversationally in ${langName}. Keep under 400 chars. Sign off as "— Rainbow 🌈".`;

  try {
    return await chat(prompt, history.slice(-10), userMessage);
  } catch {
    return null;
  }
}

// ─── Main Booking Handler ───────────────────────────────────────────
export async function handleBookingStep(
  state: BookingState,
  input: string,
  lang: Language,
  conversationHistory: ChatMessage[] = []
): Promise<BookingStepResult> {
  // Check for cancel at any stage (except save_sale which handles it differently)
  if (isCancelMessage(input) && !['done', 'cancelled', 'save_sale'].includes(state.stage)) {
    // Instead of immediately cancelling, enter save_sale stage
    const aiSave = await aiBookingResponse(
      "The guest wants to cancel their booking. Ask them why (genuinely curious, not pushy). Suggest maybe different dates would work, or mention our advantages: RM45/night, free WiFi, aircon capsules, shared kitchen, great Taman Pelangi location. Try ONE gentle save attempt. If they already gave a reason, acknowledge it warmly and let them go.",
      input,
      lang,
      conversationHistory
    );

    return {
      response: aiSave || getTemplate('booking_cancelled', lang),
      newState: { ...state, stage: 'save_sale' }
    };
  }

  switch (state.stage) {
    case 'inquiry': {
      // Try to extract booking info from the initial message (e.g. "book 2 capsules March 15-17")
      const extraction = await aiExtractBookingInfo(input, conversationHistory);

      if (extraction?.checkIn && extraction.checkOut) {
        // Guest gave all date info upfront — skip to guests or confirm
        const ciDate = new Date(extraction.checkIn);
        const coDate = new Date(extraction.checkOut);
        if (coDate <= ciDate) {
          return {
            response: getTemplate('booking_start', lang),
            newState: { ...state, stage: 'dates' }
          };
        }

        const breakdown = calculatePrice(extraction.checkIn, extraction.checkOut, extraction.guests);
        const priceText = formatPriceBreakdown(breakdown, lang);

        if (extraction.guests) {
          // Got everything — jump straight to confirm
          const confirmMsgs: Record<Language, string> = {
            en: `*Booking Summary*\n\n\u{1F4C5} ${formatDate(extraction.checkIn, lang)} \u2192 ${formatDate(extraction.checkOut, lang)}\n\u{1F465} ${extraction.guests} guest${extraction.guests > 1 ? 's' : ''}\n\n${priceText}\n\nReply *yes* to confirm or *cancel* to cancel. \u2014 Rainbow \u{1F308}`,
            ms: `*Ringkasan Tempahan*\n\n\u{1F4C5} ${formatDate(extraction.checkIn, lang)} \u2192 ${formatDate(extraction.checkOut, lang)}\n\u{1F465} ${extraction.guests} tetamu\n\n${priceText}\n\nBalas *ya* untuk sahkan atau *batal* untuk membatalkan. \u2014 Rainbow \u{1F308}`,
            zh: `*\u9884\u8BA2\u6458\u8981*\n\n\u{1F4C5} ${formatDate(extraction.checkIn, lang)} \u2192 ${formatDate(extraction.checkOut, lang)}\n\u{1F465} ${extraction.guests}\u4F4D\u5BA2\u4EBA\n\n${priceText}\n\n\u56DE\u590D *\u662F* \u786E\u8BA4\u6216 *\u53D6\u6D88* \u53D6\u6D88\u3002\u2014\u2014 Rainbow \u{1F308}`
          };
          return {
            response: confirmMsgs[lang],
            newState: {
              ...state,
              stage: 'confirm',
              checkIn: extraction.checkIn,
              checkOut: extraction.checkOut,
              guests: extraction.guests,
              priceBreakdown: breakdown
            }
          };
        }

        // Got dates but no guest count
        const guestPrompt = getTemplate('booking_guests', lang);
        const response = [
          `\u{1F4C5} ${formatDate(extraction.checkIn, lang)} \u2192 ${formatDate(extraction.checkOut, lang)}`,
          '',
          priceText,
          '',
          guestPrompt
        ].join('\n');

        return {
          response,
          newState: {
            ...state,
            stage: 'guests',
            checkIn: extraction.checkIn,
            checkOut: extraction.checkOut,
            priceBreakdown: breakdown
          }
        };
      }

      // No dates extracted — ask conversationally
      const aiResponse = await aiBookingResponse(
        "The guest wants to book a capsule. Ask them when they'd like to check in and for how many nights. Be warm and natural — don't say 'please use format X'. Just ask conversationally like 'When are you planning to arrive?' Mention we have capsules from RM45/night.",
        input,
        lang,
        conversationHistory
      );

      return {
        response: aiResponse || getTemplate('booking_start', lang),
        newState: { ...state, stage: 'dates' }
      };
    }

    case 'dates': {
      // Try AI extraction first, then regex fallback
      const extraction = await aiExtractBookingInfo(input, conversationHistory);

      let checkIn: string | null = null;
      let checkOut: string | null = null;
      let guests: number | undefined;

      if (extraction?.checkIn) {
        checkIn = extraction.checkIn;
        checkOut = extraction.checkOut || null;
        guests = extraction.guests;
      } else {
        // Regex fallback
        const parts = input.split(/\s+(?:to|until|til|sampai)\s+|(?:\u5230)|(?:\s+~\s+)/i);
        checkIn = parseDate(parts[0]);
        if (parts.length > 1) checkOut = parseDate(parts[1]);
      }

      if (!checkIn) {
        // Ask again conversationally via AI
        const aiRetry = await aiBookingResponse(
          "I couldn't understand the date from the guest's message. Ask them again naturally — suggest examples like 'next Friday', 'March 15', or '15/3/2026'. Don't be robotic.",
          input,
          lang,
          conversationHistory
        );
        return {
          response: aiRetry || getTemplate('booking_start', lang),
          newState: state
        };
      }

      if (!checkOut) {
        const coDate = new Date(checkIn);
        coDate.setDate(coDate.getDate() + 1);
        checkOut = toLocalDateStr(coDate);
      }

      const ciDate = new Date(checkIn);
      const coDate = new Date(checkOut);
      if (coDate <= ciDate) {
        const msgs: Record<Language, string> = {
          en: 'Check-out date must be after check-in date. Please try again.',
          ms: 'Tarikh daftar keluar mesti selepas tarikh daftar masuk. Sila cuba lagi.',
          zh: '\u9000\u623F\u65E5\u671F\u5FC5\u987B\u5728\u5165\u4F4F\u65E5\u671F\u4E4B\u540E\u3002\u8BF7\u91CD\u8BD5\u3002'
        };
        return { response: msgs[lang], newState: state };
      }

      // If guests were also extracted, skip to confirm
      if (guests && guests >= 1 && guests <= 20) {
        const breakdown = calculatePrice(checkIn, checkOut, guests);
        const priceText = formatPriceBreakdown(breakdown, lang);
        const confirmMsgs: Record<Language, string> = {
          en: `*Booking Summary*\n\n\u{1F4C5} ${formatDate(checkIn, lang)} \u2192 ${formatDate(checkOut, lang)}\n\u{1F465} ${guests} guest${guests > 1 ? 's' : ''}\n\n${priceText}\n\nReply *yes* to confirm or *cancel* to cancel. \u2014 Rainbow \u{1F308}`,
          ms: `*Ringkasan Tempahan*\n\n\u{1F4C5} ${formatDate(checkIn, lang)} \u2192 ${formatDate(checkOut, lang)}\n\u{1F465} ${guests} tetamu\n\n${priceText}\n\nBalas *ya* untuk sahkan atau *batal* untuk membatalkan. \u2014 Rainbow \u{1F308}`,
          zh: `*\u9884\u8BA2\u6458\u8981*\n\n\u{1F4C5} ${formatDate(checkIn, lang)} \u2192 ${formatDate(checkOut, lang)}\n\u{1F465} ${guests}\u4F4D\u5BA2\u4EBA\n\n${priceText}\n\n\u56DE\u590D *\u662F* \u786E\u8BA4\u6216 *\u53D6\u6D88* \u53D6\u6D88\u3002\u2014\u2014 Rainbow \u{1F308}`
        };
        return {
          response: confirmMsgs[lang],
          newState: {
            ...state,
            stage: 'confirm',
            checkIn,
            checkOut,
            guests,
            priceBreakdown: calculatePrice(checkIn, checkOut, guests)
          }
        };
      }

      const breakdown = calculatePrice(checkIn, checkOut);
      const priceText = formatPriceBreakdown(breakdown, lang);
      const guestPrompt = getTemplate('booking_guests', lang);

      const response = [
        `\u{1F4C5} ${formatDate(checkIn, lang)} \u2192 ${formatDate(checkOut, lang)}`,
        '',
        priceText,
        '',
        guestPrompt
      ].join('\n');

      return {
        response,
        newState: {
          ...state,
          stage: 'guests',
          checkIn,
          checkOut,
          priceBreakdown: breakdown
        }
      };
    }

    case 'guests': {
      const guestCount = parseGuestCount(input);
      if (!guestCount) {
        const msgs: Record<Language, string> = {
          en: 'Please enter the number of guests (1-20).',
          ms: 'Sila masukkan bilangan tetamu (1-20).',
          zh: '\u8BF7\u8F93\u5165\u5BA2\u4EBA\u4EBA\u6570\uFF081-20\u4EBA\uFF09\u3002'
        };
        return { response: msgs[lang], newState: state };
      }

      const breakdown = calculatePrice(state.checkIn!, state.checkOut!, guestCount);
      const priceText = formatPriceBreakdown(breakdown, lang);

      const confirmMsgs: Record<Language, string> = {
        en: `*Booking Summary*\n\n\u{1F4C5} ${formatDate(state.checkIn!, lang)} \u2192 ${formatDate(state.checkOut!, lang)}\n\u{1F465} ${guestCount} guest${guestCount > 1 ? 's' : ''}\n\n${priceText}\n\nReply *yes* to confirm or *cancel* to cancel.`,
        ms: `*Ringkasan Tempahan*\n\n\u{1F4C5} ${formatDate(state.checkIn!, lang)} \u2192 ${formatDate(state.checkOut!, lang)}\n\u{1F465} ${guestCount} tetamu\n\n${priceText}\n\nBalas *ya* untuk sahkan atau *batal* untuk membatalkan.`,
        zh: `*\u9884\u8BA2\u6458\u8981*\n\n\u{1F4C5} ${formatDate(state.checkIn!, lang)} \u2192 ${formatDate(state.checkOut!, lang)}\n\u{1F465} ${guestCount}\u4F4D\u5BA2\u4EBA\n\n${priceText}\n\n\u56DE\u590D *\u662F* \u786E\u8BA4\u6216 *\u53D6\u6D88* \u53D6\u6D88\u3002`
      };

      return {
        response: confirmMsgs[lang],
        newState: {
          ...state,
          stage: 'confirm',
          guests: guestCount,
          priceBreakdown: breakdown
        }
      };
    }

    case 'confirm': {
      const isConfirm = /\b(yes|ya|confirm|ok|sure|\u662F|\u786E\u8BA4|\u597D)\b/i.test(input);
      if (!isConfirm) {
        const msgs: Record<Language, string> = {
          en: 'Please reply *yes* to confirm your booking or *cancel* to cancel.',
          ms: 'Sila balas *ya* untuk sahkan atau *batal* untuk membatalkan.',
          zh: '\u8BF7\u56DE\u590D *\u662F* \u786E\u8BA4\u9884\u8BA2\u6216 *\u53D6\u6D88* \u53D6\u6D88\u3002'
        };
        return { response: msgs[lang], newState: state };
      }

      if (callAPIFn) {
        try {
          await callAPIFn('POST', '/api/guest-tokens', {
            autoAssign: true,
            guestCount: state.guests,
            checkIn: state.checkIn,
            checkOut: state.checkOut,
            source: 'whatsapp_bot'
          });
        } catch (err: any) {
          console.error('[Booking] API error:', err.message);
          const msgs: Record<Language, string> = {
            en: 'Sorry, there was an error creating your booking. Please contact Maya at +60 17-670 1102.',
            ms: 'Maaf, ada masalah membuat tempahan anda. Sila hubungi Maya di +60 17-670 1102.',
            zh: '\u62B1\u6B49\uFF0C\u521B\u5EFA\u9884\u8BA2\u65F6\u51FA\u9519\u3002\u8BF7\u8054\u7CFBMaya +60 17-670 1102\u3002'
          };
          return { response: msgs[lang], newState: { ...state, stage: 'cancelled' } };
        }
      }

      return {
        response: getTemplate('booking_done', lang),
        newState: { ...state, stage: 'done' }
      };
    }

    case 'save_sale': {
      // Guest is in save_sale stage — they cancelled and we asked why
      // If they confirm cancellation or give a reason, gracefully let go
      const stillWants = /\b(ok|sure|yes|ya|alright|fine|book|proceed|\u597D|\u884C|\u662F)\b/i.test(input);

      if (stillWants) {
        // They changed their mind! Resume booking
        const aiResume = await aiBookingResponse(
          "The guest changed their mind and wants to continue booking. Welcome them back warmly and ask when they'd like to check in.",
          input,
          lang,
          conversationHistory
        );
        return {
          response: aiResume || getTemplate('booking_start', lang),
          newState: { ...state, stage: 'dates', cancelReason: undefined }
        };
      }

      // Accept the cancellation gracefully
      const aiGoodbye = await aiBookingResponse(
        "The guest has decided not to book. Accept gracefully, thank them for their interest, and let them know they're welcome anytime. Mention they can always reach out to us. Be warm, not pushy.",
        input,
        lang,
        conversationHistory
      );

      return {
        response: aiGoodbye || getTemplate('booking_cancelled', lang),
        newState: { ...state, stage: 'cancelled', cancelReason: input }
      };
    }

    case 'done':
    case 'cancelled':
      return {
        response: getTemplate('booking_start', lang),
        newState: createBookingState()
      };

    default:
      return {
        response: getTemplate('booking_start', lang),
        newState: createBookingState()
      };
  }
}
