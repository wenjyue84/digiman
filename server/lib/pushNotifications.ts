/**
 * Push Notification Service
 * Handles web push notifications for mobile and desktop
 */

import webpush from 'web-push';
import { v4 as uuidv4 } from 'uuid';

// VAPID keys for push notifications (should be in environment variables)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BNsNiqRbgUHSYd2RFNCH5LgRMb6EdGuNAn9bEhYreyTnaG8ORsVg30otyFTt_JkZcdRKp_3diX-nittK_sadJ3E';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'klDGfbmP38NV20smcqc4Ots0yq5Uu2eCk94_WN9rRH0';

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@pelangi.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushSubscription {
  id: string;
  userId?: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
  lastUsed?: Date;
}

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
  private subscriptions: Map<string, PushSubscription> = new Map();

  /**
   * Get VAPID public key for client registration
   */
  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Subscribe a client to push notifications
   */
  subscribe(subscription: Omit<PushSubscription, 'id' | 'createdAt'>): string {
    const id = uuidv4();
    const pushSub: PushSubscription = {
      ...subscription,
      id,
      createdAt: new Date(),
    };
    
    this.subscriptions.set(id, pushSub);
    console.log(`New push subscription registered: ${id}`);
    return id;
  }

  /**
   * Unsubscribe a client from push notifications
   */
  unsubscribe(subscriptionId: string): boolean {
    const removed = this.subscriptions.delete(subscriptionId);
    console.log(`Push subscription ${subscriptionId} ${removed ? 'removed' : 'not found'}`);
    return removed;
  }

  /**
   * Get all subscriptions for a user
   */
  getUserSubscriptions(userId: string): PushSubscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId);
  }

  /**
   * Get all active subscriptions
   */
  getAllSubscriptions(): PushSubscription[] {
    return Array.from(this.subscriptions.values());
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
        keys: subscription.keys,
      };

      await webpush.sendNotification(
        webPushSubscription,
        JSON.stringify(payload)
      );

      // Update last used timestamp
      subscription.lastUsed = new Date();
      this.subscriptions.set(subscription.id, subscription);
      
      console.log(`Push notification sent successfully to ${subscription.id}`);
      return true;
    } catch (error: any) {
      console.error(`Failed to send push notification to ${subscription.id}:`, error);
      
      // If subscription is invalid, remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        this.unsubscribe(subscription.id);
      }
      
      return false;
    }
  }

  /**
   * Send push notification to specific user
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<number> {
    const userSubscriptions = this.getUserSubscriptions(userId);
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
    const allSubscriptions = this.getAllSubscriptions();
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
    const subscriptions = this.getAllSubscriptions();
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
          this.unsubscribe(subscription.id);
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
  guestCheckIn: (guestName: string, capsuleNumber: string): NotificationPayload => ({
    title: '✅ New Guest Check-in',
    body: `${guestName} has checked into ${capsuleNumber}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'guest-checkin',
    data: {
      type: 'guest-checkin',
      guestName,
      capsuleNumber,
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
  checkoutReminder: (guestName: string, capsuleNumber: string): NotificationPayload => ({
    title: '⏰ Checkout Reminder',
    body: `${guestName} in ${capsuleNumber} is due for checkout today`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'checkout-reminder',
    data: {
      type: 'checkout-reminder',
      guestName,
      capsuleNumber,
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
  overdueCheckout: (guestName: string, capsuleNumber: string, daysPast: number): NotificationPayload => ({
    title: '🚨 Overdue Checkout',
    body: `${guestName} in ${capsuleNumber} is ${daysPast} day(s) overdue`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'overdue-checkout',
    data: {
      type: 'overdue-checkout',
      guestName,
      capsuleNumber,
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
  maintenanceRequest: (capsuleNumber: string, issue: string): NotificationPayload => ({
    title: '🔧 Maintenance Request',
    body: `${capsuleNumber}: ${issue}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'maintenance',
    data: {
      type: 'maintenance',
      capsuleNumber,
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