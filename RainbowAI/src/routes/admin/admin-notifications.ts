import { Router } from 'express';
import {
  loadAdminNotificationSettings,
  updateSystemAdminPhone,
  updateOperators,
  updateDefaultFallbackMinutes,
  updateAdminNotificationPreferences,
  type OperatorContact
} from '../../lib/admin-notification-settings.js';
import { badRequest, serverError } from './http-utils.js';

const router = Router();

/**
 * GET /api/rainbow/admin-notifications
 * Get current admin notification settings
 */
router.get('/', async (req, res) => {
  try {
    const settings = await loadAdminNotificationSettings();
    res.json(settings);
  } catch (error: any) {
    serverError(res, error);
  }
});

/**
 * PUT /api/rainbow/admin-notifications/system-admin-phone
 * Update system admin phone number
 */
router.put('/system-admin-phone', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      badRequest(res, 'Phone number is required');
      return;
    }
    await updateSystemAdminPhone(phone);
    const updated = await loadAdminNotificationSettings();
    res.json({ success: true, settings: updated });
  } catch (error: any) {
    serverError(res, error);
  }
});

/**
 * PUT /api/rainbow/admin-notifications/operators
 * Update operators list with fallback times
 */
router.put('/operators', async (req, res) => {
  try {
    const { operators } = req.body;
    if (!Array.isArray(operators)) {
      badRequest(res, 'Operators must be an array');
      return;
    }
    await updateOperators(operators as OperatorContact[]);
    const updated = await loadAdminNotificationSettings();
    res.json({ success: true, settings: updated });
  } catch (error: any) {
    serverError(res, error);
  }
});

/**
 * PUT /api/rainbow/admin-notifications/default-fallback
 * Update default fallback interval
 */
router.put('/default-fallback', async (req, res) => {
  try {
    const { minutes } = req.body;
    if (typeof minutes !== 'number') {
      badRequest(res, 'Minutes must be a number');
      return;
    }
    await updateDefaultFallbackMinutes(minutes);
    const updated = await loadAdminNotificationSettings();
    res.json({ success: true, settings: updated });
  } catch (error: any) {
    serverError(res, error);
  }
});

/**
 * PUT /api/rainbow/admin-notifications/preferences
 * Update notification preferences (enabled, types)
 */
router.put('/preferences', async (req, res) => {
  try {
    const { enabled, notifyDisconnect, notifyUnlink, notifyReconnect } = req.body;
    await updateAdminNotificationPreferences(
      enabled ?? true,
      notifyDisconnect ?? true,
      notifyUnlink ?? true,
      notifyReconnect ?? true
    );
    const updated = await loadAdminNotificationSettings();
    res.json({ success: true, settings: updated });
  } catch (error: any) {
    serverError(res, error);
  }
});

export default router;
