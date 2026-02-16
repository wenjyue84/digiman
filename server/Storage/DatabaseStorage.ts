import type { User, InsertUser, Guest, InsertGuest, Capsule, InsertCapsule, Session, GuestToken, InsertGuestToken, CapsuleProblem, InsertCapsuleProblem, AdminNotification, InsertAdminNotification, PushSubscription, InsertPushSubscription, AppSetting, InsertAppSetting, PaginationParams, PaginatedResponse, Expense, InsertExpense, UpdateExpense } from "../../shared/schema";
import { capsules } from "../../shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { neon } from "@neondatabase/serverless";
// CRITICAL: postgres package import - DO NOT REMOVE without user approval
// This import is essential for local PostgreSQL connections
// Removing this causes "Cannot find module 'postgres'" startup errors
// Last fixed: August 23, 2025 - Major system recovery
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { IStorage } from "./IStorage";
import {
  DbUserQueries,
  DbSessionQueries,
  DbGuestQueries,
  DbCapsuleQueries,
  DbProblemQueries,
  DbTokenQueries,
  DbNotificationQueries,
  DbSettingsQueries,
  DbExpenseQueries,
} from "./db";

/**
 * Database storage facade.
 *
 * Delegates all domain operations to entity-specific query files under `./db/`.
 * Cross-entity methods (checkout, occupancy, available capsules) are
 * coordinated here in the facade layer.
 */
export class DatabaseStorage implements IStorage {
  private db;
  private readonly userQueries: DbUserQueries;
  private readonly sessionQueries: DbSessionQueries;
  private readonly guestQueries: DbGuestQueries;
  private readonly capsuleQueries: DbCapsuleQueries;
  private readonly problemQueries: DbProblemQueries;
  private readonly tokenQueries: DbTokenQueries;
  private readonly notificationQueries: DbNotificationQueries;
  private readonly settingsQueries: DbSettingsQueries;
  private readonly expenseQueries: DbExpenseQueries;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Check if we're using Neon (cloud) or local PostgreSQL
    const isNeon = process.env.DATABASE_URL.includes('neon.tech') ||
                    process.env.DATABASE_URL.includes('neon');

    if (isNeon) {
      // Neon database connection (HTTP-based, no pool needed)
      const sql = neon(process.env.DATABASE_URL);
      this.db = drizzle(sql);
    } else {
      // Local PostgreSQL connection with proper pool sizing
      const sql = postgres(process.env.DATABASE_URL, {
        max: 10,
        idle_timeout: 30,
        connect_timeout: 5,
      });
      this.db = drizzlePostgres(sql);
    }

    // Initialize entity query delegates
    this.userQueries = new DbUserQueries(this.db);
    this.sessionQueries = new DbSessionQueries(this.db);
    this.guestQueries = new DbGuestQueries(this.db);
    this.capsuleQueries = new DbCapsuleQueries(this.db);
    this.problemQueries = new DbProblemQueries(this.db);
    this.tokenQueries = new DbTokenQueries(this.db);
    this.notificationQueries = new DbNotificationQueries(this.db);
    this.settingsQueries = new DbSettingsQueries(this.db);
    this.expenseQueries = new DbExpenseQueries(this.db);
  }

  // ─── IUserStorage (delegates to DbUserQueries) ─────────────────────────────

  getUser(id: string) { return this.userQueries.getUser(id); }
  getAllUsers() { return this.userQueries.getAllUsers(); }
  getUserByUsername(username: string) { return this.userQueries.getUserByUsername(username); }
  getUserByEmail(email: string) { return this.userQueries.getUserByEmail(email); }
  getUserByGoogleId(googleId: string) { return this.userQueries.getUserByGoogleId(googleId); }
  createUser(user: InsertUser) { return this.userQueries.createUser(user); }
  updateUser(id: string, updates: Partial<User>) { return this.userQueries.updateUser(id, updates); }
  deleteUser(id: string) { return this.userQueries.deleteUser(id); }

  // ─── ISessionStorage (delegates to DbSessionQueries) ───────────────────────

  createSession(userId: string, token: string, expiresAt: Date) { return this.sessionQueries.createSession(userId, token, expiresAt); }
  getSessionByToken(token: string) { return this.sessionQueries.getSessionByToken(token); }
  deleteSession(token: string) { return this.sessionQueries.deleteSession(token); }
  cleanExpiredSessions() { return this.sessionQueries.cleanExpiredSessions(); }

  // ─── IGuestStorage (delegates to DbGuestQueries, with cross-entity coordination) ─

  createGuest(guest: InsertGuest) { return this.guestQueries.createGuest(guest); }
  getGuest(id: string) { return this.guestQueries.getGuest(id); }
  getAllGuests(pagination?: PaginationParams) { return this.guestQueries.getAllGuests(pagination); }
  getCheckedInGuests(pagination?: PaginationParams) { return this.guestQueries.getCheckedInGuests(pagination); }
  getGuestHistory(pagination?: PaginationParams, sortBy?: string, sortOrder?: 'asc' | 'desc', filters?: { search?: string; nationality?: string; capsule?: string }) {
    return this.guestQueries.getGuestHistory(pagination, sortBy, sortOrder, filters);
  }
  updateGuest(id: string, updates: Partial<Guest>) { return this.guestQueries.updateGuest(id, updates); }
  getGuestsWithCheckoutToday() { return this.guestQueries.getGuestsWithCheckoutToday(); }
  getRecentlyCheckedOutGuest() { return this.guestQueries.getRecentlyCheckedOutGuest(); }
  getGuestByCapsuleAndName(capsuleNumber: string, name: string) { return this.guestQueries.getGuestByCapsuleAndName(capsuleNumber, name); }
  getGuestByToken(token: string) { return this.guestQueries.getGuestByToken(token); }

  /** Cross-entity: checkout guest then update capsule cleaning status */
  async checkoutGuest(id: string): Promise<Guest | undefined> {
    // Update guest checkout status
    const guest = await this.guestQueries.getGuest(id);
    if (!guest) return undefined;

    const result = await this.guestQueries.updateGuest(id, {
      checkoutTime: new Date(),
      isCheckedIn: false,
    });

    // Mark capsule as needing cleaning after checkout
    if (result?.capsuleNumber) {
      await this.db.update(capsules).set({
        cleaningStatus: "to_be_cleaned",
        isAvailable: true,
      }).where(eq(capsules.number, result.capsuleNumber));
    }

    return result;
  }

  /** Cross-entity: occupancy requires guest + capsule data */
  async getCapsuleOccupancy(): Promise<{ total: number; occupied: number; available: number; occupancyRate: number }> {
    // Count only capsules that are available for rent (toRent = true)
    const allCapsules = await this.capsuleQueries.getAllCapsules();
    const rentableCapsules = allCapsules.filter(c => c.toRent === true);
    const totalCapsules = rentableCapsules.length;
    const rentableCapsuleNumbers = new Set(rentableCapsules.map(c => c.number));

    // Count only guests in rentable capsules
    const checkedInGuestsResponse = await this.getCheckedInGuests();
    const occupied = checkedInGuestsResponse.data.filter(g => rentableCapsuleNumbers.has(g.capsuleNumber)).length;

    // Clamp values to prevent invalid metrics
    const available = Math.max(0, totalCapsules - occupied);
    const occupancyRate = totalCapsules > 0 ? Math.min(100, Math.round((occupied / totalCapsules) * 100)) : 0;

    return {
      total: totalCapsules,
      occupied,
      available,
      occupancyRate,
    };
  }

  /** Cross-entity: available capsules requires guest + capsule data */
  async getAvailableCapsules(): Promise<Capsule[]> {
    const checkedInGuests = await this.getCheckedInGuests();
    const occupiedCapsules = new Set(checkedInGuests.data.map(guest => guest.capsuleNumber));

    const allCapsules = await this.capsuleQueries.getAllCapsules();
    return allCapsules.filter(capsule =>
      capsule.isAvailable &&
      !occupiedCapsules.has(capsule.number) &&
      capsule.cleaningStatus === "cleaned" &&
      capsule.toRent === true
    );
  }

  /** Cross-entity: uncleaned available capsules requires guest + capsule data */
  async getUncleanedAvailableCapsules(): Promise<Capsule[]> {
    const checkedInGuests = await this.getCheckedInGuests();
    const occupiedCapsules = new Set(checkedInGuests.data.map(guest => guest.capsuleNumber));

    const allCapsules = await this.capsuleQueries.getAllCapsules();
    return allCapsules.filter(capsule =>
      capsule.isAvailable &&
      !occupiedCapsules.has(capsule.number) &&
      capsule.cleaningStatus === "to_be_cleaned" &&
      capsule.toRent === true
    );
  }

  // ─── ICapsuleStorage (delegates to DbCapsuleQueries) ───────────────────────

  getAllCapsules() { return this.capsuleQueries.getAllCapsules(); }
  getCapsule(number: string) { return this.capsuleQueries.getCapsule(number); }
  getCapsuleById(id: string) { return this.capsuleQueries.getCapsuleById(id); }
  updateCapsule(number: string, updates: Partial<Capsule>) { return this.capsuleQueries.updateCapsule(number, updates); }
  createCapsule(capsule: InsertCapsule) { return this.capsuleQueries.createCapsule(capsule); }
  deleteCapsule(number: string) { return this.capsuleQueries.deleteCapsule(number); }
  markCapsuleCleaned(capsuleNumber: string, cleanedBy: string) { return this.capsuleQueries.markCapsuleCleaned(capsuleNumber, cleanedBy); }
  markCapsuleNeedsCleaning(capsuleNumber: string) { return this.capsuleQueries.markCapsuleNeedsCleaning(capsuleNumber); }
  getCapsulesByCleaningStatus(status: "cleaned" | "to_be_cleaned") { return this.capsuleQueries.getCapsulesByCleaningStatus(status); }

  /** Cross-entity: getGuestsByCapsule queries guests by capsule number */
  getGuestsByCapsule(capsuleNumber: string) { return this.guestQueries.getGuestsByCapsule(capsuleNumber); }

  // ─── IProblemStorage (delegates to DbProblemQueries) ───────────────────────

  createCapsuleProblem(problem: InsertCapsuleProblem) { return this.problemQueries.createCapsuleProblem(problem); }
  getCapsuleProblems(capsuleNumber: string) { return this.problemQueries.getCapsuleProblems(capsuleNumber); }
  getActiveProblems(pagination?: PaginationParams) { return this.problemQueries.getActiveProblems(pagination); }
  getAllProblems(pagination?: PaginationParams) { return this.problemQueries.getAllProblems(pagination); }
  updateProblem(problemId: string, updates: Partial<InsertCapsuleProblem>) { return this.problemQueries.updateProblem(problemId, updates); }
  resolveProblem(problemId: string, resolvedBy: string, notes?: string) { return this.problemQueries.resolveProblem(problemId, resolvedBy, notes); }
  deleteProblem(problemId: string) { return this.problemQueries.deleteProblem(problemId); }

  // ─── ITokenStorage (delegates to DbTokenQueries) ──────────────────────────

  createGuestToken(token: InsertGuestToken) { return this.tokenQueries.createGuestToken(token); }
  getGuestToken(token: string) { return this.tokenQueries.getGuestToken(token); }
  getGuestTokenById(id: string) { return this.tokenQueries.getGuestTokenById(id); }
  getActiveGuestTokens(pagination?: PaginationParams) { return this.tokenQueries.getActiveGuestTokens(pagination); }
  markTokenAsUsed(token: string) { return this.tokenQueries.markTokenAsUsed(token); }
  updateGuestTokenCapsule(tokenId: string, capsuleNumber: string | null, autoAssign: boolean) { return this.tokenQueries.updateGuestTokenCapsule(tokenId, capsuleNumber, autoAssign); }
  deleteGuestToken(id: string) { return this.tokenQueries.deleteGuestToken(id); }
  cleanExpiredTokens() { return this.tokenQueries.cleanExpiredTokens(); }

  // ─── INotificationStorage (delegates to DbNotificationQueries) ─────────────

  createAdminNotification(notification: InsertAdminNotification) { return this.notificationQueries.createAdminNotification(notification); }
  getAdminNotifications(pagination?: PaginationParams) { return this.notificationQueries.getAdminNotifications(pagination); }
  getUnreadAdminNotifications(pagination?: PaginationParams) { return this.notificationQueries.getUnreadAdminNotifications(pagination); }
  markNotificationAsRead(id: string) { return this.notificationQueries.markNotificationAsRead(id); }
  markAllNotificationsAsRead() { return this.notificationQueries.markAllNotificationsAsRead(); }
  createPushSubscription(subscription: InsertPushSubscription) { return this.notificationQueries.createPushSubscription(subscription); }
  getPushSubscription(id: string) { return this.notificationQueries.getPushSubscription(id); }
  getPushSubscriptionByEndpoint(endpoint: string) { return this.notificationQueries.getPushSubscriptionByEndpoint(endpoint); }
  getAllPushSubscriptions() { return this.notificationQueries.getAllPushSubscriptions(); }
  getUserPushSubscriptions(userId: string) { return this.notificationQueries.getUserPushSubscriptions(userId); }
  updatePushSubscriptionLastUsed(id: string) { return this.notificationQueries.updatePushSubscriptionLastUsed(id); }
  deletePushSubscription(id: string) { return this.notificationQueries.deletePushSubscription(id); }
  deletePushSubscriptionByEndpoint(endpoint: string) { return this.notificationQueries.deletePushSubscriptionByEndpoint(endpoint); }

  // ─── ISettingsStorage (delegates to DbSettingsQueries) ─────────────────────

  getAppSetting(key: string) { return this.settingsQueries.getAppSetting(key); }
  upsertAppSetting(setting: InsertAppSetting) { return this.settingsQueries.upsertAppSetting(setting); }
  getAllAppSettings() { return this.settingsQueries.getAllAppSettings(); }
  deleteAppSetting(key: string) { return this.settingsQueries.deleteAppSetting(key); }
  getSetting(key: string) { return this.settingsQueries.getSetting(key); }
  setSetting(key: string, value: string, description?: string, updatedBy?: string) { return this.settingsQueries.setSetting(key, value, description, updatedBy); }
  getAllSettings() { return this.settingsQueries.getAllSettings(); }
  getGuestTokenExpirationHours() { return this.settingsQueries.getGuestTokenExpirationHours(); }

  // ─── IExpenseStorage (delegates to DbExpenseQueries) ───────────────────────

  getExpenses(pagination?: PaginationParams) { return this.expenseQueries.getExpenses(pagination); }
  addExpense(expense: InsertExpense & { createdBy: string }) { return this.expenseQueries.addExpense(expense); }
  updateExpense(expense: UpdateExpense) { return this.expenseQueries.updateExpense(expense); }
  deleteExpense(id: string) { return this.expenseQueries.deleteExpense(id); }
}
