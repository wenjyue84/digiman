/**
 * Check-in Notification Route
 *
 * Called by the web server (port 5000) after a guest completes self-check-in.
 * Sends a WhatsApp message to admin with guest details.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { sendWhatsAppMessage } from '../../lib/baileys-client.js';
import { ok, badRequest, serverError } from './http-utils.js';

const router = Router();

const ADMIN_PHONE = '+60127088789';

router.post('/notify-checkin', async (req: Request, res: Response) => {
  try {
    const {
      guestName,
      phoneNumber,
      capsuleNumber,
      checkInDate,
      checkOutDate,
      idNumber,
      email,
      nationality,
      gender,
      age,
    } = req.body;

    if (!guestName || !capsuleNumber) {
      badRequest(res, 'guestName and capsuleNumber are required');
      return;
    }

    // Build admin notification message
    const lines = [
      '🏨 *New Self-Check-in Completed!*',
      '',
      `👤 *Name:* ${guestName}`,
      `📱 *Phone:* ${phoneNumber || 'Not provided'}`,
      `🛏️ *Capsule:* ${capsuleNumber}`,
    ];

    if (checkInDate) lines.push(`📅 *Check-in:* ${checkInDate}`);
    if (checkOutDate) lines.push(`📅 *Check-out:* ${checkOutDate}`);
    if (idNumber) lines.push(`🪪 *ID:* ${idNumber}`);
    if (email) lines.push(`📧 *Email:* ${email}`);
    if (nationality) lines.push(`🌍 *Nationality:* ${nationality}`);
    if (gender) lines.push(`👤 *Gender:* ${gender}`);
    if (age) lines.push(`🎂 *Age:* ${age}`);

    lines.push('');
    lines.push('✅ Guest has completed the self-check-in form.');
    lines.push('🤖 _Notification by Rainbow AI_');

    const message = lines.join('\n');

    // Send WhatsApp message to admin
    await sendWhatsAppMessage(ADMIN_PHONE, message);

    console.log(`[CheckinNotify] Sent admin notification for ${guestName} → ${capsuleNumber}`);

    ok(res, { sent: true, admin: ADMIN_PHONE });
  } catch (error: any) {
    console.error('[CheckinNotify] Failed to send notification:', error.message);
    serverError(res, error);
  }
});

export default router;
