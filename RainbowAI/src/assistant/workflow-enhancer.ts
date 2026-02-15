/**
 * Workflow Enhancer
 *
 * Executes action handlers before/after sending workflow step messages.
 * Handles:
 * - WhatsApp message forwarding to staff
 * - MCP API integration for capsule availability
 * - Dynamic data injection into step messages
 * - External data fetching (GPS coordinates, etc.)
 */

import type { WorkflowStep } from './config-store.js';
import { escalateToStaff } from './escalation.js';
import { resolveTemplateVars, resolveVariableRef } from './workflow-nodes.js';

// ============================================================================
// Types
// ============================================================================

export interface WorkflowEnhancerContext {
  workflowId: string;
  stepId: string;
  userInput: string | null;
  collectedData: Record<string, any>;
  language: string;
  phone: string;
  pushName: string;
  instanceId?: string;
}

export interface EnhancedStepResult {
  message: string; // Enhanced message with dynamic data
  metadata?: Record<string, any>; // Additional data for logging/debugging
}

// Function signature for external dependencies (dependency injection)
// Note: We'll wrap the actual callAPI from http-client.ts to match this signature
export type CallAPIFn = (url: string, options?: RequestInit) => Promise<any>;
export type SendMessageFn = (to: string, message: string, instanceId?: string) => Promise<any>;

// ============================================================================
// Main Enhancer Function
// ============================================================================

/**
 * Enhance a workflow step by executing its action (if present)
 * and injecting dynamic data into the message.
 */
export async function enhanceWorkflowStep(
  step: WorkflowStep,
  context: WorkflowEnhancerContext,
  callAPI: CallAPIFn,
  sendMessage: SendMessageFn
): Promise<EnhancedStepResult> {

  console.log(`[Workflow Enhancer] Processing step ${context.stepId} with action:`, step.action?.type);

  // Start with original message
  let message = (step.message as any)[context.language] || step.message.en;
  let metadata: Record<string, any> = {};

  // Execute action handler if present
  if (step.action) {
    try {
      const actionResult = await executeAction(step.action, context, callAPI, sendMessage);

      // Inject dynamic data into message using placeholders
      if (actionResult.data) {
        message = injectData(message, actionResult.data);
        metadata = { ...metadata, ...actionResult.data };
      }

      // Append additional text if provided by action
      if (actionResult.appendText) {
        message += '\n\n' + actionResult.appendText;
      }

      console.log(`[Workflow Enhancer] Action ${step.action.type} completed successfully`);
    } catch (error) {
      console.error(`[Workflow Enhancer] Action ${step.action.type} failed:`, error);

      // Show fallback message on error (graceful degradation)
      message += '\n\n' + getFallbackMessage(step.action.type, context.language);
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  return { message, metadata };
}

// ============================================================================
// Action Execution (Strategy Pattern)
// ============================================================================

interface ActionResult {
  data?: Record<string, any>; // Data to inject into message
  appendText?: string; // Additional text to append
}

async function executeAction(
  action: NonNullable<WorkflowStep['action']>,
  context: WorkflowEnhancerContext,
  callAPI: CallAPIFn,
  sendMessage: SendMessageFn
): Promise<ActionResult> {

  switch (action.type) {
    case 'send_to_staff':
      return handleSendToStaff(action.params, context, sendMessage);

    case 'escalate':
      return handleEscalate(context, sendMessage);

    case 'forward_payment':
      return handleForwardPayment(context, sendMessage);

    case 'check_availability':
      return handleCheckAvailability(context, callAPI);

    case 'check_lower_deck':
      return handleCheckLowerDeck(context, callAPI);

    case 'create_checkin_link':
      return handleCreateCheckinLink(context, callAPI, sendMessage);

    case 'get_police_gps':
      return handleGetPoliceGPS(context);

    case 'whatsapp_send':
      return handleWhatsAppSend(action.params, context, sendMessage);

    case 'book_capsule':
      return handleBookCapsule(action.params, context, callAPI);

    default:
      console.warn(`[Workflow Enhancer] Unknown action type: ${action.type}`);
      return {};
  }
}

// ============================================================================
// Action Handlers
// ============================================================================

/**
 * Send message to staff via WhatsApp with urgency flag
 */
async function handleSendToStaff(
  params: Record<string, any> | undefined,
  context: WorkflowEnhancerContext,
  sendMessage: SendMessageFn
): Promise<ActionResult> {

  const urgency = params?.urgency || 'normal';
  const staffPhone = '+60127088789'; // Admin number from plan

  // Build urgency prefix
  const urgencyMap: Record<string, string> = {
    critical: '🚨 *URGENT CRITICAL*',
    high: '⚠️ *URGENT*',
    normal: '📝 *Message*'
  };
  const urgencyPrefix = urgencyMap[urgency] || '📝 *Message*';

  // Build message content
  const messageParts = [
    urgencyPrefix,
    `From: ${context.pushName} (${context.phone})`,
    `Workflow: ${context.workflowId}`,
    `\n*Details:*`
  ];

  // Add collected data
  for (const [key, value] of Object.entries(context.collectedData)) {
    if (value) {
      messageParts.push(`• ${key}: ${value}`);
    }
  }

  // Add latest user input if relevant
  if (context.userInput) {
    messageParts.push(`\n*Latest message:*\n${context.userInput}`);
  }

  const fullMessage = messageParts.join('\n');

  // Send via WhatsApp
  await sendMessage(staffPhone, fullMessage, context.instanceId);

  console.log(`[Workflow Enhancer] Sent ${urgency} message to staff ${staffPhone}`);

  return {
    appendText: undefined // Confirmation message should be in next workflow step
  };
}

/**
 * Escalate using existing escalation.ts function
 */
async function handleEscalate(
  context: WorkflowEnhancerContext,
  sendMessage: SendMessageFn
): Promise<ActionResult> {

  // Build recent messages from collected data
  const recentMessages: string[] = [];
  for (const [key, value] of Object.entries(context.collectedData)) {
    if (value) {
      recentMessages.push(`${key}: ${value}`);
    }
  }

  // Build escalation context
  const escalationContext: import('./types.js').EscalationContext = {
    phone: context.phone,
    pushName: context.pushName,
    reason: 'human_request',
    recentMessages: recentMessages.length > 0 ? recentMessages : ['Guest requested assistance'],
    originalMessage: context.userInput || 'Guest requested assistance from workflow',
    instanceId: context.instanceId
  };

  // Use existing escalation function
  await escalateToStaff(escalationContext);

  console.log(`[Workflow Enhancer] Escalated to staff via escalation.ts`);

  return {};
}

/**
 * Forward booking/payment summary to admin
 */
async function handleForwardPayment(
  context: WorkflowEnhancerContext,
  sendMessage: SendMessageFn
): Promise<ActionResult> {

  const adminPhone = '+60127088789';

  // Build payment summary
  const summaryParts = [
    '💰 *New Booking/Payment*',
    `From: ${context.pushName} (${context.phone})`,
    `\n*Details:*`
  ];

  // Add all collected data
  for (const [key, value] of Object.entries(context.collectedData)) {
    if (value) {
      summaryParts.push(`• ${key}: ${value}`);
    }
  }

  const fullMessage = summaryParts.join('\n');

  // Send to admin
  await sendMessage(adminPhone, fullMessage, context.instanceId);

  console.log(`[Workflow Enhancer] Forwarded payment summary to admin ${adminPhone}`);

  return {};
}

/**
 * Check capsule availability via Pelangi Manager API
 */
async function handleCheckAvailability(
  context: WorkflowEnhancerContext,
  callAPI: CallAPIFn
): Promise<ActionResult> {

  try {
    const response = await callAPI('/api/capsules/available', {});
    const capsules = Array.isArray(response) ? response : (response.capsules || []);

    if (capsules.length === 0) {
      console.log('[Workflow Enhancer] No available capsules');
      return {
        data: {
          availableCapsules: 'No capsules currently available',
          availableCount: 0
        }
      };
    }

    // Format: show capsule numbers grouped by section
    const capsuleList = capsules
      .map((c: any) => c.number || c.capsuleNumber)
      .filter(Boolean)
      .join(', ');

    console.log(`[Workflow Enhancer] Found ${capsules.length} available capsules: ${capsuleList}`);

    return {
      data: {
        availableCapsules: capsuleList,
        availableCount: capsules.length
      }
    };
  } catch (error) {
    console.error('[Workflow Enhancer] Failed to check availability:', error);

    // Fallback: assume capsules are available (almost never full house)
    return {
      data: {
        availableCapsules: 'Capsules are available! We will confirm your assignment shortly.',
        availableCount: -1
      }
    };
  }
}

/**
 * Create a self-check-in link and send it to the guest via WhatsApp
 */
async function handleCreateCheckinLink(
  context: WorkflowEnhancerContext,
  callAPI: CallAPIFn,
  sendMessage: SendMessageFn
): Promise<ActionResult> {

  try {
    // Extract guest data from collected workflow steps
    const guestName = context.collectedData['s1'] || context.pushName;
    const phoneNumber = context.collectedData['s2'] || context.phone;

    // Call internal guest token creation endpoint (no auth required)
    const tokenResult = await callAPI('/api/guest-tokens/internal', {
      method: 'POST',
      body: JSON.stringify({
        guestName,
        phoneNumber,
      })
    });

    if (!tokenResult.success) {
      console.error('[Workflow Enhancer] Token creation failed:', tokenResult.message);
      return {
        data: {
          checkinLink: '',
          assignedCapsule: 'N/A',
          linkMessage: 'Our staff will assist you with check-in directly.'
        }
      };
    }

    const checkinLink = tokenResult.link;
    const assignedCapsule = tokenResult.capsuleNumber;

    // Build the link message in guest's language
    const linkMessages: Record<string, string> = {
      en: `🔗 *Your Self-Check-in Link:*\n${checkinLink}\n\nPlease fill in your details using this link to complete check-in.`,
      ms: `🔗 *Link Self-Check-in Anda:*\n${checkinLink}\n\nSila isi butiran anda menggunakan link ini untuk lengkapkan check-in.`,
      zh: `🔗 *自助入住链接:*\n${checkinLink}\n\n请使用此链接填写您的详细信息以完成入住。`
    };

    const linkMessage = linkMessages[context.language] || linkMessages.en;

    // Send the check-in link to the guest via WhatsApp
    await sendMessage(context.phone, linkMessage, context.instanceId);

    console.log(`[Workflow Enhancer] Sent check-in link to ${context.phone}: ${checkinLink} (capsule ${assignedCapsule})`);

    return {
      data: {
        checkinLink,
        assignedCapsule,
        linkMessage: 'Link sent!'
      }
    };
  } catch (error) {
    console.error('[Workflow Enhancer] Failed to create check-in link:', error);

    return {
      data: {
        checkinLink: '',
        assignedCapsule: 'N/A',
        linkMessage: 'Unable to generate link. Staff will assist you directly.'
      }
    };
  }
}

/**
 * Check lower deck (even-numbered) capsule availability
 */
async function handleCheckLowerDeck(
  context: WorkflowEnhancerContext,
  callAPI: CallAPIFn
): Promise<ActionResult> {

  try {
    // Call Pelangi MCP API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await callAPI('http://localhost:5000/api/capsules', {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Parse and filter for even-numbered available capsules
    const capsules = response.capsules || response || [];

    const lowerDeckAvailable = capsules.filter((c: any) => {
      const available = c.status === 'available' || c.status === 'vacant';
      const isEven = isEvenNumberedCapsule(c.capsuleNumber);
      return available && isEven;
    });

    // Format result message
    let resultMessage = '';

    if (lowerDeckAvailable.length > 0) {
      const capsuleList = lowerDeckAvailable
        .map((c: any) => c.capsuleNumber)
        .join(', ');

      resultMessage = context.language === 'ms'
        ? `✅ Tersedia: ${capsuleList}`
        : context.language === 'zh'
        ? `✅ 可用: ${capsuleList}`
        : `✅ Available: ${capsuleList}`;
    } else {
      resultMessage = context.language === 'ms'
        ? '❌ Tiada dek bawah tersedia. Cuba dek atas?'
        : context.language === 'zh'
        ? '❌ 没有可用的下层。试试上层？'
        : '❌ No lower deck available. Try upper deck?';
    }

    console.log(`[Workflow Enhancer] Found ${lowerDeckAvailable.length} lower deck capsules`);

    return {
      data: {
        availabilityResult: resultMessage,
        lowerDeckCount: lowerDeckAvailable.length
      }
    };
  } catch (error) {
    console.error('[Workflow Enhancer] Failed to check lower deck:', error);

    return {
      data: {
        availabilityResult: 'System temporarily unavailable, staff will check manually'
      }
    };
  }
}

/**
 * Get police station GPS coordinates
 */
async function handleGetPoliceGPS(
  context: WorkflowEnhancerContext
): Promise<ActionResult> {

  // Johor Bahru Central Police Station (from plan)
  const policeInfo = {
    name: 'Johor Bahru Central Police Station',
    address: 'Jalan Trus, 80000 Johor Bahru, Johor',
    phone: '+607-221 2222',
    gps: '1.4655,103.7578',
    mapsUrl: 'https://www.google.com/maps?q=1.4655,103.7578',
    walkingTime: '5-7 minutes'
  };

  // Format GPS info message based on language
  let gpsMessage = '';

  if (context.language === 'ms') {
    gpsMessage = `
🚨 *Balai Polis Terdekat:*
${policeInfo.name}
📍 ${policeInfo.address}
📞 ${policeInfo.phone}
🗺️ ${policeInfo.mapsUrl}
🚶 Jarak berjalan: ${policeInfo.walkingTime}
    `.trim();
  } else if (context.language === 'zh') {
    gpsMessage = `
🚨 *最近的警察局:*
${policeInfo.name}
📍 ${policeInfo.address}
📞 ${policeInfo.phone}
🗺️ ${policeInfo.mapsUrl}
🚶 步行距离: ${policeInfo.walkingTime}
    `.trim();
  } else {
    gpsMessage = `
🚨 *Nearest Police Station:*
${policeInfo.name}
📍 ${policeInfo.address}
📞 ${policeInfo.phone}
🗺️ ${policeInfo.mapsUrl}
🚶 Walking distance: ${policeInfo.walkingTime}
    `.trim();
  }

  console.log('[Workflow Enhancer] Generated police GPS info');

  return {
    data: {
      policeGPS: gpsMessage
    }
  };
}

// ============================================================================
// Node-Based Action Handlers (US-015, US-016)
// ============================================================================

/**
 * US-015: WhatsApp sender node — sends a configurable WhatsApp message
 * Config: sender (optional), receiver (required), content, urgency
 */
async function handleWhatsAppSend(
  params: Record<string, any> | undefined,
  context: WorkflowEnhancerContext,
  sendMessage: SendMessageFn
): Promise<ActionResult> {

  const receiver = params?.receiver || '{{system.admin_phone}}';
  const sender = params?.sender; // Optional — system default if not set
  const urgency = params?.urgency || 'normal';
  const contentRaw = params?.content;

  // Build template resolution context
  const templateContext = {
    collectedData: context.collectedData,
    nodeOutputs: context.collectedData, // Reuse collected data as outputs for templates
    phone: context.phone,
    pushName: context.pushName,
    language: context.language,
    adminPhone: '+60127088789',
  };

  // Resolve receiver from template variable
  const resolvedReceiver = resolveVariableRef(receiver, templateContext);

  // Resolve message content
  let messageContent: string;
  if (contentRaw && typeof contentRaw === 'object' && contentRaw.en) {
    // Multilang content object
    const langContent = contentRaw[context.language] || contentRaw.en;
    messageContent = resolveTemplateVars(langContent, templateContext);
  } else if (typeof contentRaw === 'string') {
    messageContent = resolveTemplateVars(contentRaw, templateContext);
  } else {
    // Build default notification from collected data
    const urgencyMap: Record<string, string> = {
      critical: '🚨 *URGENT CRITICAL*',
      high: '⚠️ *URGENT*',
      normal: '📝 *Notification*',
    };
    const parts = [
      urgencyMap[urgency] || '📝 *Notification*',
      `From: ${context.pushName} (${context.phone})`,
      `Workflow: ${context.workflowId}`,
    ];
    for (const [key, value] of Object.entries(context.collectedData)) {
      if (value) parts.push(`• ${key}: ${value}`);
    }
    messageContent = parts.join('\n');
  }

  // Send via WhatsApp
  await sendMessage(resolvedReceiver, messageContent, context.instanceId);

  console.log(`[Workflow Enhancer] WhatsApp sent to ${resolvedReceiver} (urgency: ${urgency})`);

  return {
    data: {
      whatsappSent: true,
      whatsappReceiver: resolvedReceiver,
    }
  };
}

/**
 * US-016: Book capsule via Pelangi Manager API
 * Action: POST /api/capsules/assign with capsuleNumber + guestName
 */
async function handleBookCapsule(
  params: Record<string, any> | undefined,
  context: WorkflowEnhancerContext,
  callAPI: CallAPIFn
): Promise<ActionResult> {

  try {
    const capsuleNumber = params?.capsuleNumber || context.collectedData['capsule_number'] || context.collectedData['s1'];
    const guestName = params?.guestName || context.collectedData['guest_name'] || context.collectedData['s1'] || context.pushName;

    if (!capsuleNumber) {
      console.warn('[Workflow Enhancer] book_capsule: No capsule number provided');
      return {
        data: {
          bookingConfirmed: false,
          bookingError: 'No capsule number specified',
        }
      };
    }

    const response = await callAPI('/api/capsules/assign', {
      method: 'POST',
      body: JSON.stringify({
        capsuleNumber,
        guestName,
      })
    });

    const success = response.success !== false;

    console.log(`[Workflow Enhancer] Book capsule ${capsuleNumber} for ${guestName}: ${success ? 'OK' : 'FAILED'}`);

    return {
      data: {
        bookingConfirmed: success,
        capsuleNumber: capsuleNumber,
        bookingMessage: success
          ? `Capsule ${capsuleNumber} booked for ${guestName}`
          : (response.message || 'Booking failed'),
      }
    };
  } catch (error) {
    console.error('[Workflow Enhancer] Failed to book capsule:', error);

    return {
      data: {
        bookingConfirmed: false,
        bookingError: error instanceof Error ? error.message : 'Unknown error',
      }
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Inject dynamic data into message using {{placeholder}} syntax
 */
function injectData(message: string, data: Record<string, any>): string {
  let result = message;

  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  }

  return result;
}

/**
 * Check if capsule number is even (lower deck)
 * Examples: C2, C4, C6... C24
 */
function isEvenNumberedCapsule(capsuleNumber: string): boolean {
  const match = capsuleNumber.match(/C(\d+)/i);
  if (!match) return false;

  const number = parseInt(match[1], 10);
  return number % 2 === 0;
}

/**
 * Get fallback message when action fails
 */
function getFallbackMessage(actionType: string, language: string): string {
  const fallbacks: Record<string, Record<string, string>> = {
    send_to_staff: {
      en: '⚠️ Unable to contact staff automatically. Please call +60127088789',
      ms: '⚠️ Tidak dapat menghubungi kakitangan. Sila hubungi +60127088789',
      zh: '⚠️ 无法自动联系工作人员。请致电 +60127088789'
    },
    check_availability: {
      en: '⚠️ System temporarily unavailable. Staff will check manually.',
      ms: '⚠️ Sistem tidak tersedia. Kakitangan akan semak secara manual.',
      zh: '⚠️ 系统暂时不可用。工作人员将手动检查。'
    },
    check_lower_deck: {
      en: '⚠️ Unable to check availability. Please ask staff.',
      ms: '⚠️ Tidak dapat semak. Sila tanya kakitangan.',
      zh: '⚠️ 无法检查可用性。请询问工作人员。'
    },
    create_checkin_link: {
      en: '⚠️ Unable to generate check-in link. Please contact staff at +60127088789.',
      ms: '⚠️ Tidak dapat buat link check-in. Sila hubungi staf di +60127088789.',
      zh: '⚠️ 无法生成入住链接。请联系工作人员 +60127088789。'
    },
    whatsapp_send: {
      en: '⚠️ Unable to send WhatsApp message. Please contact +60127088789.',
      ms: '⚠️ Tidak dapat hantar mesej WhatsApp. Sila hubungi +60127088789.',
      zh: '⚠️ 无法发送WhatsApp消息。请联系 +60127088789。'
    },
    book_capsule: {
      en: '⚠️ Unable to book capsule automatically. Staff will assist you.',
      ms: '⚠️ Tidak dapat tempah kapsul secara automatik. Staf akan bantu anda.',
      zh: '⚠️ 无法自动预订胶囊房。工作人员将为您处理。'
    }
  };

  return fallbacks[actionType]?.[language] || fallbacks[actionType]?.['en'] || '';
}
