/**
 * Push Notification Service
 * Handles web push notifications for mobile and desktop
 */

import webpush from 'web-push';
import { storage } from '../storage.js';
import type { PushSubscription } from '../../shared/schema.js';

// VAPID keys for push notifications (should be in environment variables)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BNsNiqRbgUHSYd2RFNCH5LgRMb6EdGuNAn9bEhYreyTnaG8ORsVg30otyFTt_JkZcdRKp_3diX-nittK_sadJ3E';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'klDGfbmP38NV20smcqc4Ots0yq5Uu2eCk94_WN9rRH0';

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@pelangi.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

class PushNotificationService {
  /**
   * Get VAPID public key for client registration
   */
  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Subscribe a client to push notifications
   */
  async subscribe(subscription: { userId?: string; endpoint: string; keys: { p256dh: string; auth: string } }): Promise<string> {
    // Check if subscription already exists
    const existing = await storage.getPushSubscriptionByEndpoint(subscription.endpoint);
    if (existing) {
      console.log(`Push subscription already exists for endpoint: ${existing.id}`);
      return existing.id;
    }

    const newSubscription = await storage.createPushSubscription({
      userId: subscription.userId || null,
      endpoint: subscription.endpoint,
      p256dhKey: subscription.keys.p256dh,
      authKey: subscription.keys.auth,
    });
    
    console.log(`New push subscription registered: ${newSubscription.id}`);
    return newSubscription.id;
  }

  /**
   * Unsubscribe a client from push notifications
   */
  async unsubscribe(subscriptionId: string): Promise<boolean> {
    const removed = await storage.deletePushSubscription(subscriptionId);
    console.log(`Push subscription ${subscriptionId} ${removed ? 'removed' : 'not found'}`);
    return removed;
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    return storage.getUserPushSubscriptions(userId);
  }

  /**
   * Get all active subscriptions
   */
  async getAllSubscriptions(): Promise<PushSubscription[]> {
    return storage.getAllPushSubscriptions();
  }

  /**
   * Send push notification to specific subscription
   */
  async sendToSubscription(
    subscription: PushSubscription, 
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      const webPushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dhKey,
          auth: subscription.authKey,
        },
      };

      await webpush.sendNotification(
        webPushSubscription,
        JSON.stringify(payload)
      );

      // Update last used timestamp
      await storage.updatePushSubscriptionLastUsed(subscription.id);
      
      console.log(`Push notification sent successfully to ${subscription.id}`);
      return true;
    } catch (error: any) {
      console.error(`Failed to send push notification to ${subscription.id}:`, error);
      
      // If subscription is invalid, remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        await this.unsubscribe(subscription.id);
      }
      
      return false;
    }
  }

  /**
   * Send push notification to specific user
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<number> {
    const userSubscriptions = await this.getUserSubscriptions(userId);
    let successCount = 0;

    for (const subscription of userSubscriptions) {
      const success = await this.sendToSubscription(subscription, payload);
      if (success) successCount++;
    }

    console.log(`Sent push notification to ${successCount}/${userSubscriptions.length} devices for user ${userId}`);
    return successCount;
  }

  /**
   * Send push notification to all subscribers
   */
  async sendToAll(payload: NotificationPayload): Promise<number> {
    const allSubscriptions = await this.getAllSubscriptions();
    let successCount = 0;

    for (const subscription of allSubscriptions) {
      const success = await this.sendToSubscription(subscription, payload);
      if (success) successCount++;
    }

    console.log(`Sent push notification to ${successCount}/${allSubscriptions.length} devices`);
    return successCount;
  }

  /**
   * Send notification to admin users only
   */
  async sendToAdmins(payload: NotificationPayload): Promise<number> {
    // For now, send to all subscriptions since we don't have user roles stored
    // In production, you'd filter by admin role
    return this.sendToAll(payload);
  }

  /**
   * Clean up invalid subscriptions
   */
  async cleanupInvalidSubscriptions(): Promise<number> {
    const subscriptions = await this.getAllSubscriptions();
    let cleanedCount = 0;

    for (const subscription of subscriptions) {
      try {
        // Send a test notification to check validity
        const testPayload: NotificationPayload = {
          title: 'Connection Test',
          body: 'Testing subscription validity',
          silent: true,
        };

        await this.sendToSubscription(subscription, testPayload);
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await this.unsubscribe(subscription.id);
          cleanedCount++;
        }
      }
    }

    console.log(`Cleaned up ${cleanedCount} invalid push subscriptions`);
    return cleanedCount;
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();

/**
 * Helper function to create notification payloads for different types
 */
export const createNotificationPayload = {
  /**
   * Guest check-in notification
   */
  guestCheckIn: (guestName: string, unitNumber: string): NotificationPayload => ({
    title: '✅ New Guest Check-in',
    body: `${guestName} has checked into ${unitNumber}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'guest-checkin',
    data: {
      type: 'guest-checkin',
      guestName,
      unitNumber,
      url: '/dashboard',
    },
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
      },
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200],
  }),

  /**
   * Checkout reminder notification
   */
  checkoutReminder: (guestName: string, unitNumber: string): NotificationPayload => ({
    title: '⏰ Checkout Reminder',
    body: `${guestName} in ${unitNumber} is due for checkout today`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'checkout-reminder',
    data: {
      type: 'checkout-reminder',
      guestName,
      unitNumber,
      url: '/dashboard',
    },
    actions: [
      {
        action: 'checkout',
        title: 'Check Out',
      },
      {
        action: 'view',
        title: 'View Details',
      },
    ],
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
  }),

  /**
   * Overdue checkout notification
   */
  overdueCheckout: (guestName: string, unitNumber: string, daysPast: number): NotificationPayload => ({
    title: '🚨 Overdue Checkout',
    body: `${guestName} in ${unitNumber} is ${daysPast} day(s) overdue`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'overdue-checkout',
    data: {
      type: 'overdue-checkout',
      guestName,
      unitNumber,
      daysPast,
      url: '/dashboard',
    },
    actions: [
      {
        action: 'checkout',
        title: 'Check Out Now',
      },
    ],
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500],
  }),

  /**
   * Maintenance request notification
   */
  maintenanceRequest: (unitNumber: string, issue: string): NotificationPayload => ({
    title: '🔧 Maintenance Request',
    body: `${unitNumber}: ${issue}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'maintenance',
    data: {
      type: 'maintenance',
      unitNumber,
      issue,
      url: '/dashboard',
    },
    actions: [
      {
        action: 'view',
        title: 'View Details',
      },
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200],
  }),

  /**
   * Daily reminder notification (12 PM)
   */
  dailyReminder: (checkoutCount: number, overdueCount: number): NotificationPayload => ({
    title: '📋 Daily Checkout Reminder',
    body: `${checkoutCount} checkouts due today, ${overdueCount} overdue`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'daily-reminder',
    data: {
      type: 'daily-reminder',
      checkoutCount,
      overdueCount,
      url: '/dashboard',
    },
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
      },
    ],
    requireInteraction: false,
    vibrate: [200, 100, 200],
  }),
};

export default pushNotificationService;