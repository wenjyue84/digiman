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

    case 'get_police_gps':
      return handleGetPoliceGPS(context);

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
 * Check capsule availability (C1-C24) via Pelangi MCP API
 */
async function handleCheckAvailability(
  context: WorkflowEnhancerContext,
  callAPI: CallAPIFn
): Promise<ActionResult> {

  try {
    // Call Pelangi MCP API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await callAPI('http://localhost:5000/api/capsules', {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Parse response
    const capsules = response.capsules || response || [];

    // Filter for available capsules
    const available = capsules.filter((c: any) =>
      c.status === 'available' || c.status === 'vacant'
    );

    // Format capsule list
    const capsuleList = available
      .map((c: any) => `${c.capsuleNumber} (${c.status})`)
      .join(', ') || 'None available';

    console.log(`[Workflow Enhancer] Found ${available.length} available capsules`);

    return {
      data: {
        availableCapsules: capsuleList,
        availableCount: available.length
      }
    };
  } catch (error) {
    console.error('[Workflow Enhancer] Failed to check availability:', error);

    // Return fallback data
    return {
      data: {
        availableCapsules: 'System temporarily unavailable',
        availableCount: 0
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
    }
  };

  return fallbacks[actionType]?.[language] || fallbacks[actionType]?.['en'] || '';
}
