/**
 * Maintenance Unit Assignment Notification (US-144)
 *
 * Sends a WhatsApp notification to the primary operator when a unit with
 * active maintenance problems is assigned to a guest AND no non-maintenance
 * alternatives were available.
 *
 * Communication: server (port 5000) -> RainbowAI (port 3002) via HTTP.
 */

interface NotifyParams {
  unitNumber: string;
  guestName: string;
  guestPhone?: string;
  problems: string[];
}

/**
 * Notify the primary operator via WhatsApp that a maintenance unit was
 * assigned because no clean alternatives existed.
 *
 * Non-blocking: logs errors but never throws.
 */
export async function notifyOperatorMaintenanceUnit(params: NotifyParams): Promise<void> {
  const { unitNumber, guestName, guestPhone, problems } = params;

  try {
    const rainbowPort = process.env.RAINBOW_PORT || 3002;
    const baseUrl = `http://localhost:${rainbowPort}`;

    // 1. Fetch primary operator phone from Rainbow AI admin-notifications
    const notifRes = await fetch(`${baseUrl}/api/rainbow/admin-notifications`);
    if (!notifRes.ok) {
      console.warn('[MaintenanceNotify] Could not fetch admin-notifications:', notifRes.status);
      return;
    }

    const notifData = await notifRes.json();
    const operators: { phone: string; label: string }[] = notifData?.operators || [];
    if (operators.length === 0 || !operators[0].phone) {
      console.warn('[MaintenanceNotify] No primary operator configured \u2014 skipping notification');
      return;
    }

    const operatorPhone = operators[0].phone;

    // 2. Build notification message
    const problemList = problems.map(p => `  \u2022 ${p}`).join('\n');
    const phoneDisplay = guestPhone ? ` (${guestPhone})` : '';

    const text = [
      '\u26a0\ufe0f Maintenance Unit Assigned',
      '',
      `Unit ${unitNumber} has been assigned to ${guestName}${phoneDisplay}.`,
      '',
      'Active issues:',
      problemList,
      '',
      'This unit was assigned because no other units were available.',
      'Please ensure the issues are addressed.',
    ].join('\n');

    // 3. Send WhatsApp message via Rainbow AI
    const sendRes = await fetch(`${baseUrl}/api/rainbow/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: operatorPhone, text }),
    });

    if (sendRes.ok) {
      console.log(`[MaintenanceNotify] WhatsApp sent to ${operatorPhone} for unit ${unitNumber}`);
    } else {
      console.warn(`[MaintenanceNotify] WhatsApp send failed: ${sendRes.status}`);
    }
  } catch (error: any) {
    console.error('[MaintenanceNotify] Error (non-blocking):', error.message || error);
  }
}

/** @deprecated Use notifyOperatorMaintenanceUnit */
export const notifyOperatorMaintenanceCapsule = notifyOperatorMaintenanceUnit;
