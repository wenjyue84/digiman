import { type User, type InsertUser, type Guest, type InsertGuest, type Unit, type InsertUnit, type Session, type GuestToken, type InsertGuestToken, type UnitProblem, type InsertUnitProblem, type AdminNotification, type InsertAdminNotification, type PushSubscription, type InsertPushSubscription, type AppSetting, type InsertAppSetting, type PaginationParams, type PaginatedResponse, type Expense, type InsertExpense, type UpdateExpense } from "../../shared/schema";

// ─── Domain Sub-Interfaces (Interface Segregation Principle) ─────────────────

/** User CRUD and authentication methods */
export interface IUserStorage {
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
}

/** Session store methods */
export interface ISessionStorage {
  createSession(userId: string, token: string, expiresAt: Date): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<boolean>;
  cleanExpiredSessions(): Promise<void>;
}

/** Guest CRUD, checkout, search, and occupancy queries */
export interface IGuestStorage {
  createGuest(guest: InsertGuest): Promise<Guest>;
  getGuest(id: string): Promise<Guest | undefined>;
  getAllGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>>;
  getCheckedInGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>>;
  getGuestHistory(
    pagination?: PaginationParams,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    filters?: { search?: string; nationality?: string; unit?: string }
  ): Promise<PaginatedResponse<Guest>>;
  checkoutGuest(id: string): Promise<Guest | undefined>;
  updateGuest(id: string, updates: Partial<Guest>): Promise<Guest | undefined>;
  getGuestsWithCheckoutToday(): Promise<Guest[]>;
  getRecentlyCheckedOutGuest(): Promise<Guest | undefined>;
  getUnitOccupancy(): Promise<{ total: number; occupied: number; available: number; occupancyRate: number }>;
  getAvailableUnits(): Promise<Unit[]>;
  getUncleanedAvailableUnits(): Promise<Unit[]>;
  getGuestByUnitAndName(unitNumber: string, name: string): Promise<Guest | undefined>;
  getGuestByToken(token: string): Promise<Guest | undefined>;
  /** Get guests whose stay overlaps the given date range (checkinTime <= end AND (checkoutTime >= start OR still checked in)) */
  getGuestsByDateRange(start: Date, end: Date): Promise<Guest[]>;
}

/** Unit CRUD, availability, and cleaning status */
export interface IUnitStorage {
  getAllUnits(): Promise<Unit[]>;
  getUnit(number: string): Promise<Unit | undefined>;
  getUnitById(id: string): Promise<Unit | undefined>;
  updateUnit(number: string, updates: Partial<Unit>): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  deleteUnit(number: string): Promise<boolean>;
  markUnitCleaned(unitNumber: string, cleanedBy: string): Promise<Unit | undefined>;
  markUnitNeedsCleaning(unitNumber: string): Promise<Unit | undefined>;
  getUnitsByCleaningStatus(status: "cleaned" | "to_be_cleaned"): Promise<Unit[]>;
  getGuestsByUnit(unitNumber: string): Promise<Guest[]>;
}

/** Unit problem reporting and resolution */
export interface IProblemStorage {
  createUnitProblem(problem: InsertUnitProblem): Promise<UnitProblem>;
  getUnitProblems(unitNumber: string): Promise<UnitProblem[]>;
  getActiveProblems(pagination?: PaginationParams): Promise<PaginatedResponse<UnitProblem>>;
  getAllProblems(pagination?: PaginationParams): Promise<PaginatedResponse<UnitProblem>>;
  updateProblem(problemId: string, updates: Partial<InsertUnitProblem>): Promise<UnitProblem | undefined>;
  resolveProblem(problemId: string, resolvedBy: string, notes?: string): Promise<UnitProblem | undefined>;
  deleteProblem(problemId: string): Promise<boolean>;
}

/** Guest token management for self-checkin */
export interface ITokenStorage {
  createGuestToken(token: InsertGuestToken): Promise<GuestToken>;
  getGuestToken(token: string): Promise<GuestToken | undefined>;
  getGuestTokenById(id: string): Promise<GuestToken | undefined>;
  getActiveGuestTokens(pagination?: PaginationParams): Promise<PaginatedResponse<GuestToken>>;
  markTokenAsUsed(token: string): Promise<GuestToken | undefined>;
  updateGuestTokenUnit(tokenId: string, unitNumber: string | null, autoAssign: boolean): Promise<GuestToken | undefined>;
  deleteGuestToken(id: string): Promise<boolean>;
  cleanExpiredTokens(): Promise<void>;
}

/** Admin notifications and push subscription management */
export interface INotificationStorage {
  createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification>;
  getAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>>;
  getUnreadAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>>;
  markNotificationAsRead(id: string): Promise<AdminNotification | undefined>;
  markAllNotificationsAsRead(): Promise<void>;
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscription(id: string): Promise<PushSubscription | undefined>;
  getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  getUserPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  updatePushSubscriptionLastUsed(id: string): Promise<PushSubscription | undefined>;
  deletePushSubscription(id: string): Promise<boolean>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean>;
}

/** App settings CRUD and legacy settings methods */
export interface ISettingsStorage {
  getAppSetting(key: string): Promise<AppSetting | undefined>;
  upsertAppSetting(setting: InsertAppSetting): Promise<AppSetting>;
  getAllAppSettings(): Promise<AppSetting[]>;
  deleteAppSetting(key: string): Promise<boolean>;
  getSetting(key: string): Promise<AppSetting | undefined>;
  setSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<AppSetting>;
  getAllSettings(): Promise<AppSetting[]>;
  getGuestTokenExpirationHours(): Promise<number>;
}

/** Expense tracking and management */
export interface IExpenseStorage {
  getExpenses(pagination?: PaginationParams): Promise<PaginatedResponse<Expense>>;
  addExpense(expense: InsertExpense & { createdBy: string }): Promise<Expense>;
  updateExpense(expense: UpdateExpense): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
}

export interface IDatabaseMetrics {
  status: "ok" | "error";
  uptime: string;
  connections: number;
  size: string;
}

/**
 * Full storage interface — extends all domain sub-interfaces.
 * Implementations (MemStorage, DatabaseStorage) implement this composed interface.
 * Consumers that only need a subset of methods can type against a sub-interface instead.
 */
export interface IStorage extends
  IUserStorage,
  ISessionStorage,
  IGuestStorage,
  IUnitStorage,
  IProblemStorage,
  ITokenStorage,
  INotificationStorage,
  ISettingsStorage,
  IExpenseStorage {
  getDatabaseMetrics(): Promise<IDatabaseMetrics | null>;
}
