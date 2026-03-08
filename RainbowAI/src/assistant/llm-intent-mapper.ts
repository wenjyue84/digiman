// ─── LLM Intent Mapper (Fix generic LLM responses) ─────────────────────

/**
 * Maps generic LLM intent names to specific defined intents.
 * The LLM often returns simplified names like "complaint", "facilities", "payment"
 * This function maps them to the correct specific intent categories.
 */
export function mapLLMIntentToSpecific(llmIntent: string, messageText: string): string {
  const lowerText = messageText.toLowerCase();

  // Map generic "complaint" to specific complaint types
  if (llmIntent === 'complaint' || llmIntent === 'general_complaint' || llmIntent === 'issue' || llmIntent === 'problem') {
    // Check for specific complaint types based on keywords in the message
    if (/\b(cold|hot|warm|temperature|ac|air\s?cond|heater|sejuk|panas)\b/i.test(messageText)) {
      return 'climate_control_complaint';
    }
    if (/\b(nois[ye]|loud|bising|can'?t\s?sleep|quiet|baby|bayi|infant|婴儿|cry|crying)\b/i.test(messageText)) {
      return 'noise_complaint';
    }
    if (/\b(dirty|unclean|smell|stain|not\s?clean|kotor|bau|comot|脏|不干净)\b/i.test(messageText)) {
      return 'cleanliness_complaint';
    }
    if (/\b(broken|not\s?working|malfunction|damaged|rosak|tak\s?boleh\s?guna|坏了|不能用)\b/i.test(messageText)) {
      return 'facility_malfunction';
    }
    // Check for post-checkout context (including "checking out", "checked out")
    if (/\b(after\s+(checking\s+out|check\s*out|checkout|checked\s+out)|post[- ]?checkout|already\s?(left|checked\s+out)|was\s?there|during\s?my\s?stay|lepas\s?(check\s*out|checkout|keluar)|退房后)\b/i.test(messageText)) {
      return 'post_checkout_complaint';
    }
    // Check for review/feedback language (not a complaint-in-stay)
    if (/\b(worst\s+(hotel|hostel|place|stay)|highly\s+recommend|great\s+experience|give\s+.*(star|rating)|review|recommend|5\s?star|1\s?star|never\s+(come|stay|return)\s+back)\b/i.test(messageText)) {
      return 'review_feedback';
    }
    // Otherwise generic in-stay complaint
    return 'general_complaint_in_stay';
  }

  // Map "booking" to "extend_stay" when extending existing stay (not new booking)
  if (llmIntent === 'booking' || llmIntent === 'book' || llmIntent === 'reservation') {
    if (/\b(extend|prolong|extra\s+night|stay\s+longer|add\s+(more\s+)?night|tambah\s+malam|lanjut\s+penginapan|延长|续住|加住)\b/i.test(messageText)) {
      return 'extend_stay';
    }
  }

  // Map "directions" to "local_services" when asking about nearby services/ATM
  if (llmIntent === 'directions') {
    if (/\b(atm|money\s+changer|bank|pharmacy|farmasi|laundry|dobi|convenience|kedai|grocery|tukar\s+wang|取款|换钱|银行|药房|便利店)\b/i.test(messageText)) {
      return 'local_services';
    }
  }

  // Map "facilities" to "facilities_info"
  if (llmIntent === 'facilities' || llmIntent === 'amenities' || llmIntent === 'facilities_info') {
    // Check for accessibility queries
    if (/\b(wheelchair|disabled|disability|accessibility|accessible|mobility|handicap|OKU|kerusi\s+roda|kurang\s+upaya|轮椅|无障碍|残疾)\b/i.test(messageText)) {
      return 'accessibility';
    }
    // Check if asking about facility location (orientation)
    if (/\b(where\s?is|di\s?mana|在哪|location|lokasi)\b/i.test(messageText)) {
      return 'facility_orientation';
    }
    return 'facilities_info';
  }

  // Map "rules" to "rules_policy"
  if (llmIntent === 'rules' || llmIntent === 'policy') {
    return 'rules_policy';
  }

  // Map "payment" to specific payment intents
  if (llmIntent === 'payment' || llmIntent === 'pay') {
    // Check if confirming payment already made
    if (/\b(already\s?paid|i\s?paid|just\s?paid|transfer(?:red)?|sent|payment\s?done|sudah\s?bayar|dah\s?bayar|已付|付了)\b/i.test(messageText)) {
      return 'payment_made';
    }
    // Otherwise asking about payment info
    return 'payment_info';
  }

  // Map "checkin" variations
  if (llmIntent === 'checkin' || llmIntent === 'check_in' || llmIntent === 'checkin_info') {
    // Check if guest has arrived or wants to check in (not just asking about times)
    if (/\b(i\s?(want|wan|wanna)\s?(to\s?)?check\s?in|want\s?to\s?check\s?in|checking\s?in|i\s?have\s?arrived|i'?m\s?here|i\s?arrived|just\s?arrived|dah\s?sampai|dah\s?tiba|nak\s?(check\s?in|checkin|daftar\s?masuk)|要入住|已经到|我来了|我到了)\b/i.test(messageText)) {
      return 'check_in_arrival';
    }
    return 'checkin_info';
  }

  // Map "checkout" variations
  if (llmIntent === 'checkout' || llmIntent === 'check_out') {
    // Check for active departure (guest is checking out now)
    if (/\b(i\s?(want|need|wanna)\s?(to\s?)?(checkout|check\s?out)|checking\s?out\s?(now|today)|i\s?am\s?leaving|im\s?leaving|ready\s?to\s?(checkout|leave)|nak\s?(checkout|keluar)|saya\s?(nak|mahu)\s?(checkout|keluar|pergi|balik)|我要退房|我想退房|退房了|准备退房|现在退房)\b/i.test(messageText)) {
      return 'checkout_now';
    }
    // Check for late checkout request
    if (/\b(late|later|extend|checkout\s?at|stay\s?longer|lewat|延迟|晚点)\b/i.test(messageText)) {
      return 'late_checkout_request';
    }
    // Check for luggage storage
    if (/\b(luggage|bag|suitcase|keep|store|simpan|寄存|行李)\b/i.test(messageText)) {
      return 'luggage_storage';
    }
    // Check for checkout procedure
    if (/\b(how\s?to|how\s?do|process|procedure|macam\s?mana|怎么)\b/i.test(messageText)) {
      return 'checkout_procedure';
    }
    return 'checkout_info';
  }

  // Map "general" to more specific intents
  if (llmIntent === 'general' || llmIntent === 'general_inquiry') {
    // Check for amenity requests
    if (/\b(need|can\s?i\s?get|can\s?i\s?have|more|extra|blanket|pillow|towel|charger|boleh|要|需要)\b/i.test(messageText)) {
      return 'extra_amenity_request';
    }
  }

  // Map "unknown" to more specific intents if possible
  if (llmIntent === 'unknown') {
    // Check for check-in arrival (especially Chinese/Malay short messages)
    if (/(?:我要入住|要入住|办理入住|我来了|我到了|可以入住|入住登记|check\s?in|checkin|nak\s?check\s?in|nak\s?checkin|daftar\s?masuk)/i.test(messageText)) {
      return 'check_in_arrival';
    }
    // Check for tourist guide requests
    if (/\b(tourist|attraction|visit|sightseeing|what\s?to\s?(do|see)|where\s?to\s?go|tempat\s?menarik|景点|旅游)\b/i.test(messageText)) {
      return 'tourist_guide';
    }
    // Check for forgot items
    if (/\b(forgot|left|left\s?behind|terlupa|tertinggal|忘了|落下)\b/i.test(messageText)) {
      return 'forgot_item_post_checkout';
    }
    // Check for billing
    if (/\b(bill|invoice|charge|receipt|bil|resit|overcharge|账单|收费)\b/i.test(messageText)) {
      if (/\b(overcharge|wrong|incorrect|dispute|多收|错误)\b/i.test(messageText)) {
        return 'billing_dispute';
      }
      return 'billing_inquiry';
    }
    // Check for review/feedback
    if (/\b(review|rating|feedback|recommend|great\s?experience|worst|terrible\s?service|评价|反馈)\b/i.test(messageText)) {
      return 'review_feedback';
    }
  }

  // ─── Post-classification corrections (specific → specific) ───
  // LLM sometimes returns a close-but-wrong specific category

  // checkout_procedure/checkout_info → late_checkout_request when mentioning specific time
  if (llmIntent === 'checkout_procedure' || llmIntent === 'checkout_info') {
    if (/\b(at\s+\d{1,2}\s*(pm|am|:\d{2})|checkout\s+at|check\s?out\s+at|late|later|extend|stay\s+longer)\b/i.test(messageText)) {
      return 'late_checkout_request';
    }
  }

  // general_complaint_in_stay → post_checkout_complaint when explicitly post-checkout
  if (llmIntent === 'general_complaint_in_stay') {
    if (/\b(after\s+(checking\s+out|check\s*out|checkout)|post[- ]?checkout|already\s+(left|checked\s+out)|lepas\s+(check\s*out|checkout|keluar)|退房后)\b/i.test(messageText)) {
      return 'post_checkout_complaint';
    }
    // → review_feedback when using review/rating language
    if (/\b(worst\s+(hotel|hostel|place)|highly\s+recommend|great\s+experience|give\s+.*(star|rating)|review|recommend|5\s?star|1\s?star)\b/i.test(messageText)) {
      return 'review_feedback';
    }
  }

  // Return original intent if no mapping found
  return llmIntent;
}
