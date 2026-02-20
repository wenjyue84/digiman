import type { AdminNotification, InsertAdminNotification, PushSubscription, InsertPushSubscription, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import type { INotificationStorage } from "../IStorage";
import { randomUUID } from "crypto";
import { paginate } from "./paginate";

export class MemNotificationStore implements INotificationStorage {
  private adminNotifications: Map<string, AdminNotification>;
  private pushSubscriptions: Map<string, PushSubscription>;

  constructor() {
    this.adminNotifications = new Map();
    this.pushSubscriptions = new Map();
  }

  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const id = randomUUID();
    const adminNotification: AdminNotification = {
      id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      guestId: notification.guestId || null,
      unitNumber: notification.unitNumber || null,
      isRead: false,
      createdAt: new Date(),
    };
    this.adminNotifications.set(id, adminNotification);
    return adminNotification;
  }

  async getAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>> {
    const allNotifications = Array.from(this.adminNotifications.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return paginate(allNotifications, pagination);
  }

  async getUnreadAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>> {
    const unreadNotifications = Array.from(this.adminNotifications.values())
      .filter(n => !n.isRead)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return paginate(unreadNotifications, pagination);
  }

  async markNotificationAsRead(id: string): Promise<AdminNotification | undefined> {
    const notification = this.adminNotifications.get(id);
    if (notification) {
      const updatedNotification = { ...notification, isRead: true };
      this.adminNotifications.set(id, updatedNotification);
      return updatedNotification;
    }
    return undefined;
  }

  async markAllNotificationsAsRead(): Promise<void> {
    for (const [id, notification] of Array.from(this.adminNotifications.entries())) {
      if (!notification.isRead) {
        notification.isRead = true;
        this.adminNotifications.set(id, notification);
      }
    }
  }

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const id = randomUUID();
    const newSubscription: PushSubscription = {
      id,
      userId: subscription.userId || null,
      endpoint: subscription.endpoint,
      p256dhKey: subscription.p256dhKey,
      authKey: subscription.authKey,
      createdAt: new Date(),
      lastUsed: null,
    };
    this.pushSubscriptions.set(id, newSubscription);
    return newSubscription;
  }

  async getPushSubscription(id: string): Promise<PushSubscription | undefined> {
    return this.pushSubscriptions.get(id);
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    return Array.from(this.pushSubscriptions.values()).find(sub => sub.endpoint === endpoint);
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values());
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values()).filter(sub => sub.userId === userId);
  }

  async updatePushSubscriptionLastUsed(id: string): Promise<PushSubscription | undefined> {
    const subscription = this.pushSubscriptions.get(id);
    if (!subscription) {
      return undefined;
    }
    const updated: PushSubscription = {
      ...subscription,
      lastUsed: new Date(),
    };
    this.pushSubscriptions.set(id, updated);
    return updated;
  }

  async deletePushSubscription(id: string): Promise<boolean> {
    return this.pushSubscriptions.delete(id);
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    const subscription = await this.getPushSubscriptionByEndpoint(endpoint);
    if (!subscription) {
      return false;
    }
    return this.pushSubscriptions.delete(subscription.id);
  }
}
