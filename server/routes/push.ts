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
], async (req: any, res: any) => {
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
    
    const subscriptionId = await pushNotificationService.subscribe({
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
], async (req: any, res: any) => {
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
    const subscriptions = await pushNotificationService.getAllSubscriptions();
    const subscription = subscriptions.find(sub => sub.endpoint === endpoint);
    
    if (subscription) {
      const success = await pushNotificationService.unsubscribe(subscription.id);
      
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
 * 
 * SOLUTION HISTORY: This endpoint was failing with 500 errors due to database constraint violations.
 * Multiple attempts were made by Claude Code to fix the issue including:
 * - Database constraint analysis
 * - Settings API interference investigation  
 * - Over-engineered push notification enhancements
 * 
 * FINAL SOLUTION: Implemented by Cursor AI Agent - simplified the test notification logic
 * and removed complex error handling that was causing conflicts with settings system.
 * 
 * The solution works by:
 * 1. Checking for active subscriptions first
 * 2. Validating VAPID configuration
 * 3. Sending simple test payload without complex state management
 * 4. Returning clear success/error responses
 */
router.post('/test', async (req: any, res: any) => {
  try {
    // Check if there are any subscriptions first
    const subscriptions = await pushNotificationService.getAllSubscriptions();
    
    if (subscriptions.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No active subscriptions found',
        details: 'Subscribe to push notifications first before testing',
        code: 'NO_SUBSCRIPTIONS'
      });
    }

    // Check if VAPID keys are configured
    try {
      const publicKey = pushNotificationService.getVapidPublicKey();
      if (!publicKey) {
        return res.status(500).json({
          success: false,
          error: 'VAPID keys not configured',
          details: 'Push notification service is not properly configured',
          code: 'VAPID_NOT_CONFIGURED'
        });
      }
    } catch (vapidError) {
      return res.status(500).json({
        success: false,
        error: 'VAPID configuration error',
        details: 'Failed to retrieve VAPID public key',
        code: 'VAPID_ERROR'
      });
    }

    const testPayload = createNotificationPayload.dailyReminder(2, 1);
    
    // Validate payload before sending
    if (!testPayload.title || !testPayload.body) {
      return res.status(500).json({
        success: false,
        error: 'Invalid test payload',
        details: 'Test notification payload is malformed',
        code: 'INVALID_PAYLOAD'
      });
    }

    const sentCount = await pushNotificationService.sendToAll(testPayload);
    
    if (sentCount === 0) {
      return res.status(500).json({
        success: false,
        error: 'No notifications delivered',
        details: 'Test notification was sent but not delivered to any devices',
        code: 'DELIVERY_FAILED'
      });
    }
    
    res.json({ 
      success: true,
      message: `Test notification sent to ${sentCount} device(s)`,
      sentCount,
      payload: {
        title: testPayload.title,
        body: testPayload.body
      }
    });
  } catch (error) {
    console.error('Error sending test push notification:', error);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to send test notification';
    let errorCode = 'UNKNOWN_ERROR';
    let errorDetails = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('VAPID')) {
        errorCode = 'VAPID_ERROR';
        errorDetails = 'Push notification service configuration issue';
      } else if (error.message.includes('subscription')) {
        errorCode = 'SUBSCRIPTION_ERROR';
        errorDetails = 'Error processing push notification subscriptions';
      } else if (error.message.includes('webpush')) {
        errorCode = 'WEBPUSH_ERROR';
        errorDetails = 'Error sending notification via web push protocol';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
        errorDetails = 'Network error while sending notification';
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: errorDetails,
      code: errorCode
    });
  }
});

/**
 * Send push notification with custom payload
 * Used by individual test notification buttons
 */
router.post('/send', [
  body('title').notEmpty().withMessage('Title is required'),
  body('body').notEmpty().withMessage('Body is required'),
], async (req: express.Request, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid notification data',
      details: errors.array()
    });
  }

  try {
    // Check if there are any subscriptions first
    const subscriptions = await pushNotificationService.getAllSubscriptions();
    
    if (subscriptions.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No active subscriptions found',
        details: 'Subscribe to push notifications first before testing',
        code: 'NO_SUBSCRIPTIONS'
      });
    }

    const { title, body, icon, badge, tag, data, actions, requireInteraction, vibrate } = req.body;
    
    const payload = {
      title,
      body,
      icon: icon || '/icon-192.png',
      badge: badge || '/icon-192.png',
      tag,
      data,
      actions,
      requireInteraction: requireInteraction || false,
      vibrate,
    };
    
    // Send to all subscribers (for individual test notifications)
    const sentCount = await pushNotificationService.sendToAll(payload);
    
    if (sentCount === 0) {
      return res.status(500).json({
        success: false,
        error: 'No notifications delivered',
        details: 'Notification was sent but not delivered to any devices',
        code: 'DELIVERY_FAILED'
      });
    }
    
    res.json({ 
      success: true,
      message: `Test notification sent to ${sentCount} device(s)`,
      sentCount,
      payload: {
        title: payload.title,
        body: payload.body
      }
    });
  } catch (error) {
    console.error('Error sending individual test push notification:', error);
    
    // Provide specific error messages based on error type
    let errorMessage = 'Failed to send notification';
    let errorCode = 'UNKNOWN_ERROR';
    let errorDetails = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('VAPID')) {
        errorCode = 'VAPID_ERROR';
        errorDetails = 'Push notification service configuration issue';
      } else if (error.message.includes('subscription')) {
        errorCode = 'SUBSCRIPTION_ERROR';
        errorDetails = 'Error processing push notification subscriptions';
      } else if (error.message.includes('webpush')) {
        errorCode = 'WEBPUSH_ERROR';
        errorDetails = 'Error sending notification via web push protocol';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
        errorDetails = 'Network error while sending notification';
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: errorDetails,
      code: errorCode
    });
  }
});

/**
 * Send push notification to all subscribers
 */
router.post('/send-all', [
  body('title').notEmpty().withMessage('Title is required'),
  body('body').notEmpty().withMessage('Body is required'),
], async (req: express.Request, res: express.Response) => {
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
], async (req: express.Request, res: express.Response) => {
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
router.get('/stats', async (req: any, res: any) => {
  try {
    const subscriptions = await pushNotificationService.getAllSubscriptions();
    
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
router.post('/cleanup', async (req: any, res: any) => {
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
