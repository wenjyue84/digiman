import { type User, type InsertUser, type Guest, type InsertGuest, type Capsule, type InsertCapsule, type Session, type GuestToken, type InsertGuestToken, type CapsuleProblem, type InsertCapsuleProblem, type AdminNotification, type InsertAdminNotification, type AppSetting, type InsertAppSetting, type PaginationParams, type PaginatedResponse, type Expense, type InsertExpense, type UpdateExpense } from "../../shared/schema";

export interface IStorage {
  // User management methods
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Session management methods
  createSession(userId: string, token: string, expiresAt: Date): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<boolean>;
  cleanExpiredSessions(): Promise<void>;
  
  // Guest management methods
  createGuest(guest: InsertGuest): Promise<Guest>;
  getGuest(id: string): Promise<Guest | undefined>;
  getAllGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>>;
  getCheckedInGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>>;
  getGuestHistory(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>>;
  checkoutGuest(id: string): Promise<Guest | undefined>;
  updateGuest(id: string, updates: Partial<Guest>): Promise<Guest | undefined>;
  getGuestsWithCheckoutToday(): Promise<Guest[]>;
  getCapsuleOccupancy(): Promise<{ total: number; occupied: number; available: number; occupancyRate: number }>;
  getAvailableCapsules(): Promise<Capsule[]>;
  getUncleanedAvailableCapsules(): Promise<Capsule[]>;
  getGuestByCapsuleAndName(capsuleNumber: string, name: string): Promise<Guest | undefined>;
  getGuestByToken(token: string): Promise<Guest | undefined>;
  
  // Capsule management methods
  getAllCapsules(): Promise<Capsule[]>;
  getCapsule(number: string): Promise<Capsule | undefined>;
  getCapsuleById(id: string): Promise<Capsule | undefined>;
  updateCapsule(number: string, updates: Partial<Capsule>): Promise<Capsule | undefined>;
  createCapsule(capsule: InsertCapsule): Promise<Capsule>;
  deleteCapsule(number: string): Promise<boolean>;
  markCapsuleCleaned(capsuleNumber: string, cleanedBy: string): Promise<Capsule | undefined>;
  markCapsuleNeedsCleaning(capsuleNumber: string): Promise<Capsule | undefined>;
  getCapsulesByCleaningStatus(status: "cleaned" | "to_be_cleaned"): Promise<Capsule[]>;
  getGuestsByCapsule(capsuleNumber: string): Promise<Guest[]>;
  
  // Capsule problem management
  createCapsuleProblem(problem: InsertCapsuleProblem): Promise<CapsuleProblem>;
  getCapsuleProblems(capsuleNumber: string): Promise<CapsuleProblem[]>;
  getActiveProblems(pagination?: PaginationParams): Promise<PaginatedResponse<CapsuleProblem>>;
  getAllProblems(pagination?: PaginationParams): Promise<PaginatedResponse<CapsuleProblem>>;
  resolveProblem(problemId: string, resolvedBy: string, notes?: string): Promise<CapsuleProblem | undefined>;
  deleteProblem(problemId: string): Promise<boolean>;

  // Guest token management methods
  createGuestToken(token: InsertGuestToken): Promise<GuestToken>;
  getGuestToken(token: string): Promise<GuestToken | undefined>;
  getActiveGuestTokens(pagination?: PaginationParams): Promise<PaginatedResponse<GuestToken>>;
  markTokenAsUsed(token: string): Promise<GuestToken | undefined>;
  deleteGuestToken(id: string): Promise<boolean>;
  cleanExpiredTokens(): Promise<void>;

  // Admin notification methods
  createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification>;
  getAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>>;
  getUnreadAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>>;
  markNotificationAsRead(id: string): Promise<AdminNotification | undefined>;
  markAllNotificationsAsRead(): Promise<void>;

  // App settings methods
  getAppSetting(key: string): Promise<AppSetting | undefined>;
  upsertAppSetting(setting: InsertAppSetting): Promise<AppSetting>;
  getAllAppSettings(): Promise<AppSetting[]>;
  deleteAppSetting(key: string): Promise<boolean>;
  
  // Legacy methods for backward compatibility
  getSetting(key: string): Promise<AppSetting | undefined>;
  setSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<AppSetting>;
  getAllSettings(): Promise<AppSetting[]>;
  getGuestTokenExpirationHours(): Promise<number>;
  
  // Expense management methods
  getExpenses(): Promise<Expense[]>;
  addExpense(expense: InsertExpense & { createdBy: string }): Promise<Expense>;
  updateExpense(expense: UpdateExpense): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
}