import { type User, type InsertUser, type Guest, type InsertGuest, type Capsule, type InsertCapsule, type Session, type GuestToken, type InsertGuestToken, type CapsuleProblem, type InsertCapsuleProblem, type AdminNotification, type InsertAdminNotification, type PushSubscription, type InsertPushSubscription, type AppSetting, type InsertAppSetting, type PaginationParams, type PaginatedResponse, type Expense, type InsertExpense, type UpdateExpense } from "../../shared/schema";
import { randomUUID } from "crypto";
import { IStorage } from "./IStorage";
import {
  MemUserStore,
  MemSessionStore,
  MemGuestStore,
  MemCapsuleStore,
  MemProblemStore,
  MemTokenStore,
  MemNotificationStore,
  MemSettingsStore,
  MemExpenseStore,
} from "./mem";

/** Storage seed data constants */
export const STORAGE_CONSTANTS = {
  TOTAL_CAPSULES: 22,
  STANDARD_RATE: 45,
  OUTSTANDING_PAYMENT_RATIO: 0.8,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * In-memory storage facade.
 *
 * Delegates all domain operations to entity-specific stores under `./mem/`.
 * Cross-entity methods (checkout, occupancy, available capsules) are
 * coordinated here in the facade layer.
 */
export class MemStorage implements IStorage {
  private readonly userStore: MemUserStore;
  private readonly sessionStore: MemSessionStore;
  private readonly guestStore: MemGuestStore;
  private readonly capsuleStore: MemCapsuleStore;
  private readonly problemStore: MemProblemStore;
  private readonly tokenStore: MemTokenStore;
  private readonly notificationStore: MemNotificationStore;
  private readonly settingsStore: MemSettingsStore;
  private readonly expenseStore: MemExpenseStore;

  constructor() {
    // Create entity stores (problem store first — capsule store needs its map)
    this.userStore = new MemUserStore();
    this.sessionStore = new MemSessionStore();
    this.guestStore = new MemGuestStore();
    this.problemStore = new MemProblemStore();
    this.capsuleStore = new MemCapsuleStore(this.problemStore.getMap());
    this.tokenStore = new MemTokenStore();
    this.notificationStore = new MemNotificationStore();
    this.settingsStore = new MemSettingsStore();
    this.expenseStore = new MemExpenseStore();

    // Initialize seed data
    this.initializeCapsules();
    this.initializeDefaultUsers();
    this.initializeDefaultSettings();
    this.initializeSampleGuests();
  }

  // ─── Initialization ─────────────────────────────────────────────────────────

  private initializeDefaultUsers() {
    const bcrypt = require('bcryptjs');
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const adminUser: User = {
      id: randomUUID(),
      email: "admin@pelangi.com",
      username: "admin",
      password: bcrypt.hashSync(adminPassword, 10),
      googleId: null,
      firstName: "Admin",
      lastName: "User",
      profileImage: null,
      role: "staff",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userStore.getMap().set(adminUser.id, adminUser);
    console.log("Initialized default admin user with email:", adminUser.email);
  }

  private initializeSampleGuests() {
    const now = new Date();
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);

    const fmtDate = (d: Date) => d.toISOString().split('T')[0];

    const sampleGuests = isDev ? [
      { name: "Keong", capsule: "C1", phone: "017-6632979", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "Male", email: "keong.lim@gmail.com", age: 28, paymentStatus: "paid" },
      { name: "Prem", capsule: "C4", phone: "019-7418889", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "Male", email: "prem.kumar@yahoo.com", age: 32, paymentStatus: "paid" },
      { name: "Jeevan", capsule: "C5", phone: "010-5218906", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "Male", email: "jeevan.singh@hotmail.com", age: 25, paymentStatus: "paid" },
      { name: "Ahmad", capsule: "C25", phone: "012-3456789", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "Male", email: "ahmad.ibrahim@gmail.com", age: 29, paymentStatus: "outstanding" },
      { name: "Wei Ming", capsule: "C26", phone: "011-9876543", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "Male", email: "weiming.tan@outlook.com", age: 31, paymentStatus: "paid" },
      { name: "Raj", capsule: "C11", phone: "013-2468135", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Indian", gender: "Male", email: "raj.patel@gmail.com", age: 27, paymentStatus: "paid" },
      { name: "Hassan", capsule: "C12", phone: "014-3579246", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "Male", email: "hassan.ali@yahoo.com", age: 26, paymentStatus: "paid" },
      { name: "Li Wei", capsule: "C13", phone: "015-4681357", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Chinese", gender: "Male", email: "liwei.chen@hotmail.com", age: 30, paymentStatus: "outstanding" },
      { name: "Siti", capsule: "C6", phone: "016-1234567", checkin: new Date(today.getTime() - 2 * STORAGE_CONSTANTS.MS_PER_DAY).toISOString(), checkout: fmtDate(new Date(today.getTime() - 1 * STORAGE_CONSTANTS.MS_PER_DAY)), nights: 1, nationality: "Malaysian", gender: "Female", email: "siti.rahman@gmail.com", age: 24, paymentStatus: "outstanding" },
    ] : [
      { name: "Keong", capsule: "C1", phone: "017-6632979", checkin: "2025-08-07T15:00:00", checkout: "2025-08-08", nights: 1, nationality: "Malaysian", gender: "Male", email: "keong.lim@gmail.com", age: 28, paymentStatus: "paid" },
      { name: "Prem", capsule: "C4", phone: "019-7418889", checkin: "2025-08-07T15:00:00", checkout: "2025-08-08", nights: 1, nationality: "Malaysian", gender: "Male", email: "prem.kumar@yahoo.com", age: 32, paymentStatus: "paid" },
      { name: "Jeevan", capsule: "C5", phone: "010-5218906", checkin: "2025-08-07T15:00:00", checkout: "2025-08-08", nights: 1, nationality: "Malaysian", gender: "Male", email: "jeevan.singh@hotmail.com", age: 25, paymentStatus: "paid" },
      { name: "Ahmad", capsule: "C25", phone: "012-3456789", checkin: "2025-08-06T15:00:00", checkout: "2025-08-08", nights: 2, nationality: "Malaysian", gender: "Male", email: "ahmad.ibrahim@gmail.com", age: 29, paymentStatus: "outstanding" },
      { name: "Siti", capsule: "C6", phone: "016-1234567", checkin: "2025-08-05T15:00:00", checkout: "2025-08-06", nights: 1, nationality: "Malaysian", gender: "Female", email: "siti.rahman@gmail.com", age: 24, paymentStatus: "outstanding" },
    ];

    const guestMap = this.guestStore.getMap();
    const capsuleMap = this.capsuleStore.getMap();

    sampleGuests.forEach(guest => {
      const standardRate = STORAGE_CONSTANTS.STANDARD_RATE;
      const totalAmount = guest.nights * standardRate;
      const isOutstanding = guest.paymentStatus === "outstanding";
      const paidAmount = isOutstanding ? Math.floor(totalAmount * STORAGE_CONSTANTS.OUTSTANDING_PAYMENT_RATIO) : totalAmount;

      const guestRecord: Guest = {
        id: randomUUID(),
        name: guest.name,
        capsuleNumber: guest.capsule,
        checkinTime: new Date(guest.checkin),
        checkoutTime: null,
        expectedCheckoutDate: guest.checkout,
        isCheckedIn: true,
        paymentAmount: paidAmount.toString(),
        paymentMethod: "cash",
        paymentCollector: isOutstanding ? null : "Admin",
        isPaid: !isOutstanding,
        notes: isOutstanding ? `Outstanding balance: RM${totalAmount - paidAmount}` : null,
        gender: guest.gender as "Male" | "Female" | null,
        nationality: guest.nationality,
        phoneNumber: guest.phone,
        email: guest.email,
        idNumber: null,
        emergencyContact: null,
        emergencyPhone: null,
        age: guest.age?.toString() || null,
        profilePhotoUrl: null,
        selfCheckinToken: null,
        status: null,
        alertSettings: null,
      };

      guestMap.set(guestRecord.id, guestRecord);

      const capsule = capsuleMap.get(guest.capsule);
      if (capsule) {
        capsule.isAvailable = false;
        capsuleMap.set(guest.capsule, capsule);
      }
    });

    console.log(`Initialized ${sampleGuests.length} sample guests`);
  }

  private initializeCapsules() {
    const capsuleMap = this.capsuleStore.getMap();
    const makeCapsule = (num: number, section: string): Capsule => ({
      id: randomUUID(),
      number: `C${num}`,
      section,
      isAvailable: true,
      cleaningStatus: 'cleaned',
      toRent: true,
      lastCleanedAt: null,
      lastCleanedBy: null,
      color: null,
      purchaseDate: '2024-01-01',
      position: num % 2 === 0 ? 'bottom' : 'top',
      remark: null,
      branch: null,
    });

    // Back section: C1-C6
    for (let i = 1; i <= 6; i++) capsuleMap.set(`C${i}`, makeCapsule(i, 'back'));
    // Middle section: C25, C26
    for (const n of [25, 26]) capsuleMap.set(`C${n}`, makeCapsule(n, 'middle'));
    // Front section: C11-C24
    for (let i = 11; i <= 24; i++) capsuleMap.set(`C${i}`, makeCapsule(i, 'front'));
  }

  private initializeDefaultSettings(): void {
    this.settingsStore.setSetting('guestTokenExpirationHours', '24', 'Hours before guest check-in tokens expire');
    this.settingsStore.setSetting('accommodationType', 'capsule', 'Type of accommodation (capsule, room, or house)');
    this.settingsStore.setSetting('guideIntro', 'Pelangi Capsule Hostel is a modern, innovative accommodation designed to provide guests with comfort, privacy, and convenience at an affordable price. Our contemporary capsule concept offers private sleeping pods with essential amenities in a clean, safe, and friendly environment. Communal spaces encourage social interaction while maintaining personal privacy.', 'Guest guide introduction');
    this.settingsStore.setSetting('guideAddress', '26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia\nPhone: +60 12-345 6789\nEmail: info@pelangicapsule.com\nWebsite: www.pelangicapsule.com', 'Hostel address and contacts');
    this.settingsStore.setSetting('guideWifiName', 'Pelangi_Guest', 'WiFi SSID');
    this.settingsStore.setSetting('guideWifiPassword', 'Pelangi2024!', 'WiFi password');
    this.settingsStore.setSetting('guideCheckin', 'Check-In Time: 2:00 PM\nCheck-Out Time: 12:00 PM\n\nHow to check in:\n1) Present a valid ID/passport at the front desk.\n2) If you have a self-check-in token, show it to staff.\n3) Early check-in / late check-out may be available upon request (subject to availability and charges).', 'Check-in and check-out guidance');
    this.settingsStore.setSetting('guideOther', 'House rules and guidance:\n- Quiet hours: [insert time] to [insert time]\n- Keep shared spaces clean\n- No smoking inside the premises\n- Follow staff instructions for safety\n\nAmenities overview:\n- Private capsules with light, power outlet, and privacy screen\n- Air conditioning throughout\n- Free high-speed Wi-Fi\n- Clean shared bathrooms with toiletries\n- Secure lockers\n- Lounge area\n- Pantry/kitchenette with microwave, kettle, and fridge\n- Self-service laundry (paid)\n- 24-hour security and CCTV\n- Reception assistance and local tips', 'Other guest guidance and rules');
    this.settingsStore.setSetting('guideFaq', 'Q: What are the check-in and check-out times?\nA: Standard check-in is at [insert time], and check-out is at [insert time]. Early/late options may be arranged based on availability.\n\nQ: Are towels and toiletries provided?\nA: Yes, fresh towels and basic toiletries are provided.\n\nQ: Is there parking available?\nA: [Insert parking information].\n\nQ: Can I store my luggage after check-out?\nA: Yes, complimentary luggage storage is available at the front desk.\n\nQ: Are there quiet hours?\nA: Yes, quiet hours are observed from [insert time] to [insert time].', 'Frequently asked questions');
    this.settingsStore.setSetting('guideShowIntro', 'true', 'Show intro to guests');
    this.settingsStore.setSetting('guideShowAddress', 'true', 'Show address to guests');
    this.settingsStore.setSetting('guideShowWifi', 'true', 'Show WiFi to guests');
    this.settingsStore.setSetting('guideShowCheckin', 'true', 'Show check-in guidance');
    this.settingsStore.setSetting('guideShowOther', 'true', 'Show other guidance');
    this.settingsStore.setSetting('guideShowFaq', 'true', 'Show FAQ');
    this.settingsStore.setSetting('guideCheckinTime', '3:00 PM', 'Check-in time');
    this.settingsStore.setSetting('guideCheckoutTime', '12:00 PM', 'Check-out time');
    this.settingsStore.setSetting('guideDoorPassword', '1270#', 'Door access password');
    this.settingsStore.setSetting('guideImportantReminders', 'Please keep your room key safe. Quiet hours are from 10:00 PM to 7:00 AM. No smoking inside the building. Keep shared spaces clean.', 'Important reminders for guests');
  }

  // ─── IUserStorage (delegates to MemUserStore) ──────────────────────────────

  getUser(id: string) { return this.userStore.getUser(id); }
  getAllUsers() { return this.userStore.getAllUsers(); }
  getUserByUsername(username: string) { return this.userStore.getUserByUsername(username); }
  getUserByEmail(email: string) { return this.userStore.getUserByEmail(email); }
  getUserByGoogleId(googleId: string) { return this.userStore.getUserByGoogleId(googleId); }
  createUser(user: InsertUser) { return this.userStore.createUser(user); }
  updateUser(id: string, updates: Partial<User>) { return this.userStore.updateUser(id, updates); }
  deleteUser(id: string) { return this.userStore.deleteUser(id); }

  // ─── ISessionStorage (delegates to MemSessionStore) ────────────────────────

  createSession(userId: string, token: string, expiresAt: Date) { return this.sessionStore.createSession(userId, token, expiresAt); }
  getSessionByToken(token: string) { return this.sessionStore.getSessionByToken(token); }
  deleteSession(token: string) { return this.sessionStore.deleteSession(token); }
  cleanExpiredSessions() { return this.sessionStore.cleanExpiredSessions(); }

  // ─── IGuestStorage (delegates to MemGuestStore, with cross-entity coordination) ─

  createGuest(guest: InsertGuest) { return this.guestStore.createGuest(guest); }
  getGuest(id: string) { return this.guestStore.getGuest(id); }
  getAllGuests(pagination?: PaginationParams) { return this.guestStore.getAllGuests(pagination); }
  getCheckedInGuests(pagination?: PaginationParams) { return this.guestStore.getCheckedInGuests(pagination); }
  getGuestHistory(pagination?: PaginationParams, sortBy?: string, sortOrder?: 'asc' | 'desc', filters?: { search?: string; nationality?: string; capsule?: string }) {
    return this.guestStore.getGuestHistory(pagination, sortBy, sortOrder, filters);
  }
  updateGuest(id: string, updates: Partial<Guest>) { return this.guestStore.updateGuest(id, updates); }
  getGuestsWithCheckoutToday() { return this.guestStore.getGuestsWithCheckoutToday(); }
  getRecentlyCheckedOutGuest() { return this.guestStore.getRecentlyCheckedOutGuest(); }
  getGuestByCapsuleAndName(capsuleNumber: string, name: string) { return this.guestStore.getGuestByCapsuleAndName(capsuleNumber, name); }
  getGuestByToken(token: string) { return this.guestStore.getGuestByToken(token); }
  getGuestsByDateRange(start: Date, end: Date) { return this.guestStore.getGuestsByDateRange(start, end); }

  /** Cross-entity: checkout guest then update capsule cleaning status */
  async checkoutGuest(id: string): Promise<Guest | undefined> {
    const updatedGuest = await this.guestStore.checkoutGuest(id);
    if (updatedGuest) {
      // Set capsule status to 'to be cleaned' after checkout
      const capsule = await this.capsuleStore.getCapsule(updatedGuest.capsuleNumber);
      if (capsule) {
        await this.capsuleStore.updateCapsule(updatedGuest.capsuleNumber, {
          cleaningStatus: 'to_be_cleaned',
          isAvailable: true,
        });
      }
    }
    return updatedGuest;
  }

  /** Cross-entity: occupancy requires guest + capsule data */
  async getCapsuleOccupancy(): Promise<{ total: number; occupied: number; available: number; occupancyRate: number }> {
    const allCapsules = await this.capsuleStore.getAllCapsules();
    const rentableCapsules = allCapsules.filter(c => c.toRent !== false);
    const totalCapsules = rentableCapsules.length;
    const rentableCapsuleNumbers = new Set(rentableCapsules.map(c => c.number));

    const checkedInGuestsResponse = await this.guestStore.getCheckedInGuests();
    const occupied = checkedInGuestsResponse.data.filter(g => rentableCapsuleNumbers.has(g.capsuleNumber)).length;

    const available = Math.max(0, totalCapsules - occupied);
    const occupancyRate = totalCapsules > 0 ? Math.min(100, Math.round((occupied / totalCapsules) * 100)) : 0;

    return { total: totalCapsules, occupied, available, occupancyRate };
  }

  /** Cross-entity: available capsules requires guest + capsule data */
  async getAvailableCapsules(): Promise<Capsule[]> {
    const checkedInGuests = await this.guestStore.getCheckedInGuests();
    const occupiedCapsules = new Set(checkedInGuests.data.map(guest => guest.capsuleNumber));

    const allCapsules = await this.capsuleStore.getAllCapsules();
    const availableCapsules = allCapsules.filter(
      capsule => capsule.isAvailable &&
                  !occupiedCapsules.has(capsule.number) &&
                  capsule.cleaningStatus === "cleaned" &&
                  capsule.toRent !== false
    );

    return availableCapsules.sort((a, b) => {
      const aNum = parseInt(a.number.replace('C', ''));
      const bNum = parseInt(b.number.replace('C', ''));
      return aNum - bNum;
    });
  }

  /** Cross-entity: uncleaned available capsules requires guest + capsule data */
  async getUncleanedAvailableCapsules(): Promise<Capsule[]> {
    const checkedInGuests = await this.guestStore.getCheckedInGuests();
    const occupiedCapsules = new Set(checkedInGuests.data.map(guest => guest.capsuleNumber));

    const allCapsules = await this.capsuleStore.getAllCapsules();
    return allCapsules.filter(
      capsule => capsule.isAvailable &&
                  !occupiedCapsules.has(capsule.number) &&
                  capsule.cleaningStatus === "to_be_cleaned" &&
                  capsule.toRent !== false
    );
  }

  // ─── ICapsuleStorage (delegates to MemCapsuleStore) ────────────────────────

  getAllCapsules() { return this.capsuleStore.getAllCapsules(); }
  getCapsule(number: string) { return this.capsuleStore.getCapsule(number); }
  getCapsuleById(id: string) { return this.capsuleStore.getCapsuleById(id); }
  updateCapsule(number: string, updates: Partial<Capsule>) { return this.capsuleStore.updateCapsule(number, updates); }
  createCapsule(capsule: InsertCapsule) { return this.capsuleStore.createCapsule(capsule); }
  deleteCapsule(number: string) { return this.capsuleStore.deleteCapsule(number); }
  markCapsuleCleaned(capsuleNumber: string, cleanedBy: string) { return this.capsuleStore.markCapsuleCleaned(capsuleNumber, cleanedBy); }
  markCapsuleNeedsCleaning(capsuleNumber: string) { return this.capsuleStore.markCapsuleNeedsCleaning(capsuleNumber); }
  getCapsulesByCleaningStatus(status: "cleaned" | "to_be_cleaned") { return this.capsuleStore.getCapsulesByCleaningStatus(status); }

  /** Cross-entity: getGuestsByCapsule queries guests by capsule number */
  getGuestsByCapsule(capsuleNumber: string) { return this.guestStore.getGuestsByCapsule(capsuleNumber); }

  // ─── IProblemStorage (delegates to MemProblemStore) ────────────────────────

  createCapsuleProblem(problem: InsertCapsuleProblem) { return this.problemStore.createCapsuleProblem(problem); }
  getCapsuleProblems(capsuleNumber: string) { return this.problemStore.getCapsuleProblems(capsuleNumber); }
  getActiveProblems(pagination?: PaginationParams) { return this.problemStore.getActiveProblems(pagination); }
  getAllProblems(pagination?: PaginationParams) { return this.problemStore.getAllProblems(pagination); }
  updateProblem(problemId: string, updates: Partial<InsertCapsuleProblem>) { return this.problemStore.updateProblem(problemId, updates); }
  resolveProblem(problemId: string, resolvedBy: string, notes?: string) { return this.problemStore.resolveProblem(problemId, resolvedBy, notes); }
  deleteProblem(problemId: string) { return this.problemStore.deleteProblem(problemId); }

  // ─── ITokenStorage (delegates to MemTokenStore) ────────────────────────────

  createGuestToken(token: InsertGuestToken) { return this.tokenStore.createGuestToken(token); }
  getGuestToken(token: string) { return this.tokenStore.getGuestToken(token); }
  getGuestTokenById(id: string) { return this.tokenStore.getGuestTokenById(id); }
  getActiveGuestTokens(pagination?: PaginationParams) { return this.tokenStore.getActiveGuestTokens(pagination); }
  markTokenAsUsed(token: string) { return this.tokenStore.markTokenAsUsed(token); }
  updateGuestTokenCapsule(tokenId: string, capsuleNumber: string | null, autoAssign: boolean) { return this.tokenStore.updateGuestTokenCapsule(tokenId, capsuleNumber, autoAssign); }
  deleteGuestToken(id: string) { return this.tokenStore.deleteGuestToken(id); }
  cleanExpiredTokens() { return this.tokenStore.cleanExpiredTokens(); }

  // ─── INotificationStorage (delegates to MemNotificationStore) ──────────────

  createAdminNotification(notification: InsertAdminNotification) { return this.notificationStore.createAdminNotification(notification); }
  getAdminNotifications(pagination?: PaginationParams) { return this.notificationStore.getAdminNotifications(pagination); }
  getUnreadAdminNotifications(pagination?: PaginationParams) { return this.notificationStore.getUnreadAdminNotifications(pagination); }
  markNotificationAsRead(id: string) { return this.notificationStore.markNotificationAsRead(id); }
  markAllNotificationsAsRead() { return this.notificationStore.markAllNotificationsAsRead(); }
  createPushSubscription(subscription: InsertPushSubscription) { return this.notificationStore.createPushSubscription(subscription); }
  getPushSubscription(id: string) { return this.notificationStore.getPushSubscription(id); }
  getPushSubscriptionByEndpoint(endpoint: string) { return this.notificationStore.getPushSubscriptionByEndpoint(endpoint); }
  getAllPushSubscriptions() { return this.notificationStore.getAllPushSubscriptions(); }
  getUserPushSubscriptions(userId: string) { return this.notificationStore.getUserPushSubscriptions(userId); }
  updatePushSubscriptionLastUsed(id: string) { return this.notificationStore.updatePushSubscriptionLastUsed(id); }
  deletePushSubscription(id: string) { return this.notificationStore.deletePushSubscription(id); }
  deletePushSubscriptionByEndpoint(endpoint: string) { return this.notificationStore.deletePushSubscriptionByEndpoint(endpoint); }

  // ─── ISettingsStorage (delegates to MemSettingsStore) ──────────────────────

  getAppSetting(key: string) { return this.settingsStore.getAppSetting(key); }
  upsertAppSetting(setting: InsertAppSetting) { return this.settingsStore.upsertAppSetting(setting); }
  getAllAppSettings() { return this.settingsStore.getAllAppSettings(); }
  deleteAppSetting(key: string) { return this.settingsStore.deleteAppSetting(key); }
  getSetting(key: string) { return this.settingsStore.getSetting(key); }
  setSetting(key: string, value: string, description?: string, updatedBy?: string) { return this.settingsStore.setSetting(key, value, description, updatedBy); }
  getAllSettings() { return this.settingsStore.getAllSettings(); }
  getGuestTokenExpirationHours() { return this.settingsStore.getGuestTokenExpirationHours(); }

  // ─── IExpenseStorage (delegates to MemExpenseStore) ────────────────────────

  getExpenses(pagination?: PaginationParams) { return this.expenseStore.getExpenses(pagination); }
  addExpense(expense: InsertExpense & { createdBy: string }) { return this.expenseStore.addExpense(expense); }
  updateExpense(expense: UpdateExpense) { return this.expenseStore.updateExpense(expense); }
  deleteExpense(id: string) { return this.expenseStore.deleteExpense(id); }
}
