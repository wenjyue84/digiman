interface MaintenanceNotifyPayload {
  unitNumber: string | number;
  guestName?: string;
  guestPhone?: string;
  problems: string[];
}

/**
 * Notifies operators when a unit requires maintenance.
 * This can be extended to send WhatsApp messages, emails, or push notifications.
 */
export async function notifyOperatorMaintenanceUnit(payload: MaintenanceNotifyPayload) {
  const problemSummary = payload.problems.join('; ');
  console.log(`[Maintenance Notification] Unit ${payload.unitNumber} requires maintenance: ${problemSummary}` +
    (payload.guestName ? ` (guest: ${payload.guestName})` : ''));

  // Future implementation: Send to Rainbow AI or staff group
  // await sendToStaffGroup(`🛠️ Maintenance Needed: Unit ${payload.unitNumber}\nIssue: ${problemSummary}`);
}
