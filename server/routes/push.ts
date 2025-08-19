/**
 * Push Notification API Routes
 * Handles push notification subscriptions and sending
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pushNotificationService, createNotificationPayload } from '../lib/pushNotifications.js';

const router = Router();

/**
 * Get VAPID public key for client registration
 */
router.get('/vapid-key', (req, res) => {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('Error getting VAPID public key:', error);
    res.status(500).json({ error: 'Failed to get VAPID public key' });
  }
});

/**
 * Subscribe to push notifications
 */
router.post('/subscribe', [
  body('subscription.endpoint').isURL().withMessage('Valid endpoint URL is required'),
  body('subscription.keys.p256dh').notEmpty().withMessage('p256dh key is required'),
  body('subscription.keys.auth').notEmpty().withMessage('auth key is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Invalid subscription data',
      details: errors.array()
    });
  }

  try {
    const { subscription } = req.body;
    
    // Get user ID from auth context if available
    const userId = (req as any).user?.id;
    
    const subscriptionId = pushNotificationService.subscribe({
      userId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    console.log(`Push subscription registered: ${subscriptionId} for user: ${userId || 'anonymous'}`);
    
    res.json({ 
      success: true, 
      subscriptionId,
      message: 'Successfully subscribed to push notifications'
    });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
});

/**
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', [
  body('endpoint').isURL().withMessage('Valid endpoint URL is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Invalid unsubscribe data',
      details: errors.array()
    });
  }

  try {
    const { endpoint } = req.body;
    
    // Find subscription by endpoint
    const subscriptions = pushNotificationService.getAllSubscriptions();
    const subscription = subscriptions.find(sub => sub.endpoint === endpoint);
    
    if (subscription) {
      const success = pushNotificationService.unsubscribe(subscription.id);
      
      if (success) {
        console.log(`Push subscription unsubscribed: ${subscription.id}`);
        res.json({ 
          success: true,
          message: 'Successfully unsubscribed from push notifications'
        });
      } else {
        res.status(404).json({ error: 'Subscription not found' });
      }
    } else {
      res.status(404).json({ error: 'Subscription not found' });
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
});

/**
 * Send test push notification
 */
router.post('/test', async (req, res) => {
  try {
    const testPayload = createNotificationPayload.dailyReminder(2, 1);
    const sentCount = await pushNotificationService.sendToAll(testPayload);
    
    res.json({ 
      success: true,
      message: `Test notification sent to ${sentCount} device(s)`
    });
  } catch (error) {
    console.error('Error sending test push notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

/**
 * Send push notification to all subscribers
 */
router.post('/send-all', [
  body('title').notEmpty().withMessage('Title is required'),
  body('body').notEmpty().withMessage('Body is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Invalid notification data',
      details: errors.array()
    });
  }

  try {
    const { title, body, icon, tag, data, actions, requireInteraction } = req.body;
    
    const payload = {
      title,
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      data,
      actions,
      requireInteraction: requireInteraction || false,
    };
    
    const sentCount = await pushNotificationService.sendToAll(payload);
    
    res.json({ 
      success: true,
      message: `Notification sent to ${sentCount} device(s)`
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * Send push notification to admin users
 */
router.post('/send-admin', [
  body('title').notEmpty().withMessage('Title is required'),
  body('body').notEmpty().withMessage('Body is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Invalid notification data',
      details: errors.array()
    });
  }

  try {
    const { title, body, icon, tag, data, actions, requireInteraction } = req.body;
    
    const payload = {
      title,
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      data,
      actions,
      requireInteraction: requireInteraction || false,
    };
    
    const sentCount = await pushNotificationService.sendToAdmins(payload);
    
    res.json({ 
      success: true,
      message: `Admin notification sent to ${sentCount} device(s)`
    });
  } catch (error) {
    console.error('Error sending admin push notification:', error);
    res.status(500).json({ error: 'Failed to send admin notification' });
  }
});

/**
 * Get subscription statistics
 */
router.get('/stats', (req, res) => {
  try {
    const subscriptions = pushNotificationService.getAllSubscriptions();
    
    const stats = {
      totalSubscriptions: subscriptions.length,
      activeToday: subscriptions.filter(sub => {
        const today = new Date();
        const subDate = sub.lastUsed || sub.createdAt;
        return subDate.toDateString() === today.toDateString();
      }).length,
      byCreationDate: subscriptions.reduce((acc: Record<string, number>, sub) => {
        const date = sub.createdAt.toDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}),
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting push notification stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * Clean up invalid subscriptions
 */
router.post('/cleanup', async (req, res) => {
  try {
    const cleanedCount = await pushNotificationService.cleanupInvalidSubscriptions();
    
    res.json({ 
      success: true,
      message: `Cleaned up ${cleanedCount} invalid subscription(s)`
    });
  } catch (error) {
    console.error('Error cleaning up push subscriptions:', error);
    res.status(500).json({ error: 'Failed to cleanup subscriptions' });
  }
});

export default router;