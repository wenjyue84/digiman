import type { AdminNotification, InsertAdminNotification, PushSubscription, InsertPushSubscription, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import { adminNotifications, pushSubscriptions } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import type { INotificationStorage } from "../IStorage";
import { paginate } from "./paginate";

/** Database notification queries implementing INotificationStorage via Drizzle ORM */
export class DbNotificationQueries implements INotificationStorage {
  constructor(private readonly db: any) {}

  // ─── Admin Notifications ──────────────────────────────────────────────────

  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const result = await this.db.insert(adminNotifications).values(notification).returning();
    return result[0];
  }

  async getAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>> {
    const allNotifications = await this.db.select().from(adminNotifications).orderBy(adminNotifications.createdAt);
    return paginate(allNotifications, pagination);
  }

  async getUnreadAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>> {
    const unreadNotifications = await this.db.select().from(adminNotifications).where(eq(adminNotifications.isRead, false)).orderBy(adminNotifications.createdAt);
    return paginate(unreadNotifications, pagination);
  }

  async markNotificationAsRead(id: string): Promise<AdminNotification | undefined> {
    const result = await this.db.update(adminNotifications).set({
      isRead: true,
    }).where(eq(adminNotifications.id, id)).returning();
    return result[0];
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await this.db.update(adminNotifications).set({
      isRead: true,
    }).where(eq(adminNotifications.isRead, false));
  }

  // ─── Push Subscriptions ───────────────────────────────────────────────────

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const result = await this.db.insert(pushSubscriptions).values({
      userId: subscription.userId || null,
      endpoint: subscription.endpoint,
      p256dhKey: subscription.p256dhKey,
      authKey: subscription.authKey,
    }).returning();
    return result[0];
  }

  async getPushSubscription(id: string): Promise<PushSubscription | undefined> {
    const result = await this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, id));
    return result[0];
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    const result = await this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return result[0];
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return this.db.select().from(pushSubscriptions);
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async updatePushSubscriptionLastUsed(id: string): Promise<PushSubscription | undefined> {
    const result = await this.db.update(pushSubscriptions)
      .set({ lastUsed: new Date() })
      .where(eq(pushSubscriptions.id, id))
      .returning();
    return result[0];
  }

  async deletePushSubscription(id: string): Promise<boolean> {
    const result = await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id)).returning();
    return result.length > 0;
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    const result = await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).returning();
    return result.length > 0;
  }
}
