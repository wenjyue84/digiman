import { type User, type InsertUser, type Guest, type InsertGuest, type Unit, type InsertUnit, type Session, type GuestToken, type InsertGuestToken, type UnitProblem, type InsertUnitProblem, type AdminNotification, type InsertAdminNotification, type PushSubscription, type InsertPushSubscription, type AppSetting, type InsertAppSetting, type PaginationParams, type PaginatedResponse, type Expense, type InsertExpense, type UpdateExpense } from "../../shared/schema";
import { randomUUID } from "crypto";
import { IStorage } from "./IStorage";
import {
  MemUserStore,
  MemSessionStore,
  MemGuestStore,
  MemUnitStore,
  MemProblemStore,
  MemTokenStore,
  MemNotificationStore,
  MemSettingsStore,
  MemExpenseStore,
} from "./mem";
import { DEFAULT_BUSINESS_CONFIG } from "../../shared/business-config";

/** Storage seed data constants */
export const STORAGE_CONSTANTS = {
  TOTAL_UNITS: 22,
  STANDARD_RATE: 45,
  OUTSTANDING_PAYMENT_RATIO: 0.8,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * In-memory storage facade.
 *
 * Delegates all domain operations to entity-specific stores under `./mem/`.
 * Cross-entity methods (checkout, occupancy, available units) are
 * coordinated here in the facade layer.
 */
export class MemStorage implements IStorage {
  private readonly userStore: MemUserStore;
  private readonly sessionStore: MemSessionStore;
  private readonly guestStore: MemGuestStore;
  private readonly unitStore: MemUnitStore;
  private readonly problemStore: MemProblemStore;
  private readonly tokenStore: MemTokenStore;
  private readonly notificationStore: MemNotificationStore;
  private readonly settingsStore: MemSettingsStore;
  private readonly expenseStore: MemExpenseStore;

  constructor() {
    // Create entity stores (problem store first — unit store needs its map)
    this.userStore = new MemUserStore();
    this.sessionStore = new MemSessionStore();
    this.guestStore = new MemGuestStore();
    this.problemStore = new MemProblemStore();
    this.unitStore = new MemUnitStore(this.problemStore.getMap());
    this.tokenStore = new MemTokenStore();
    this.notificationStore = new MemNotificationStore();
    this.settingsStore = new MemSettingsStore();
    this.expenseStore = new MemExpenseStore();

    // Initialize seed data
    this.initializeUnits();
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
      email: DEFAULT_BUSINESS_CONFIG.email,
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
      { name: "Keong", unit: "C1", phone: "017-6632979", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "Male", email: "keong.lim@gmail.com", age: 28, paymentStatus: "paid" },
      { name: "Prem", unit: "C4", phone: "019-7418889", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "Male", email: "prem.kumar@yahoo.com", age: 32, paymentStatus: "paid" },
      { name: "Jeevan", unit: "C5", phone: "010-5218906", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "Male", email: "jeevan.singh@hotmail.com", age: 25, paymentStatus: "paid" },
      { name: "Ahmad", unit: "C25", phone: "012-3456789", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "Male", email: "ahmad.ibrahim@gmail.com", age: 29, paymentStatus: "outstanding" },
      { name: "Wei Ming", unit: "C26", phone: "011-9876543", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "Male", email: "weiming.tan@outlook.com", age: 31, paymentStatus: "paid" },
      { name: "Raj", unit: "C11", phone: "013-2468135", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Indian", gender: "Male", email: "raj.patel@gmail.com", age: 27, paymentStatus: "paid" },
      { name: "Hassan", unit: "C12", phone: "014-3579246", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "Male", email: "hassan.ali@yahoo.com", age: 26, paymentStatus: "paid" },
      { name: "Li Wei", unit: "C13", phone: "015-4681357", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Chinese", gender: "Male", email: "liwei.chen@hotmail.com", age: 30, paymentStatus: "outstanding" },
      { name: "Siti", unit: "C6", phone: "016-1234567", checkin: new Date(today.getTime() - 2 * STORAGE_CONSTANTS.MS_PER_DAY).toISOString(), checkout: fmtDate(new Date(today.getTime() - 1 * STORAGE_CONSTANTS.MS_PER_DAY)), nights: 1, nationality: "Malaysian", gender: "Female", email: "siti.rahman@gmail.com", age: 24, paymentStatus: "outstanding" },
    ] : [
      { name: "Keong", unit: "C1", phone: "017-6632979", checkin: "2025-08-07T15:00:00", checkout: "2025-08-08", nights: 1, nationality: "Malaysian", gender: "Male", email: "keong.lim@gmail.com", age: 28, paymentStatus: "paid" },
      { name: "Prem", unit: "C4", phone: "019-7418889", checkin: "2025-08-07T15:00:00", checkout: "2025-08-08", nights: 1, nationality: "Malaysian", gender: "Male", email: "prem.kumar@yahoo.com", age: 32, paymentStatus: "paid" },
      { name: "Jeevan", unit: "C5", phone: "010-5218906", checkin: "2025-08-07T15:00:00", checkout: "2025-08-08", nights: 1, nationality: "Malaysian", gender: "Male", email: "jeevan.singh@hotmail.com", age: 25, paymentStatus: "paid" },
      { name: "Ahmad", unit: "C25", phone: "012-3456789", checkin: "2025-08-06T15:00:00", checkout: "2025-08-08", nights: 2, nationality: "Malaysian", gender: "Male", email: "ahmad.ibrahim@gmail.com", age: 29, paymentStatus: "outstanding" },
      { name: "Siti", unit: "C6", phone: "016-1234567", checkin: "2025-08-05T15:00:00", checkout: "2025-08-06", nights: 1, nationality: "Malaysian", gender: "Female", email: "siti.rahman@gmail.com", age: 24, paymentStatus: "outstanding" },
    ];

    const guestMap = this.guestStore.getMap();
    const unitMap = this.unitStore.getMap();

    sampleGuests.forEach(guest => {
      const standardRate = STORAGE_CONSTANTS.STANDARD_RATE;
      const totalAmount = guest.nights * standardRate;
      const isOutstanding = guest.paymentStatus === "outstanding";
      const paidAmount = isOutstanding ? Math.floor(totalAmount * STORAGE_CONSTANTS.OUTSTANDING_PAYMENT_RATIO) : totalAmount;

      const guestRecord: Guest = {
        id: randomUUID(),
        name: guest.name,
        unitNumber: guest.unit,
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

      const unit = unitMap.get(guest.unit);
      if (unit) {
        unit.isAvailable = false;
        unitMap.set(guest.unit, unit);
      }
    });

    console.log(`Initialized ${sampleGuests.length} sample guests`);
  }

  private initializeUnits() {
    const unitMap = this.unitStore.getMap();
    const makeUnit = (num: number, section: string): Unit => ({
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
      unitType: null,
      maxOccupancy: null,
      pricePerNight: null,
    });

    // Back section: C1-C6
    for (let i = 1; i <= 6; i++) unitMap.set(`C${i}`, makeUnit(i, 'back'));
    // Middle section: C25, C26
    for (const n of [25, 26]) unitMap.set(`C${n}`, makeUnit(n, 'middle'));
    // Front section: C11-C24
    for (let i = 11; i <= 24; i++) unitMap.set(`C${i}`, makeUnit(i, 'front'));
  }

  private initializeDefaultSettings(): void {
    this.settingsStore.setSetting('guestTokenExpirationHours', '24', 'Hours before guest check-in tokens expire');
    this.settingsStore.setSetting('accommodationType', 'unit', 'Type of accommodation (capsule, room, or house)');
    this.settingsStore.setSetting('guideIntro', 'Pelangi Capsule Hostel is a modern, innovative accommodation designed to provide guests with comfort, privacy, and convenience at an affordable price. Our contemporary unit concept offers private sleeping pods with essential amenities in a clean, safe, and friendly environment. Communal spaces encourage social interaction while maintaining personal privacy.', 'Guest guide introduction');
    this.settingsStore.setSetting('guideAddress', `${DEFAULT_BUSINESS_CONFIG.address}\nPhone: ${DEFAULT_BUSINESS_CONFIG.phone}\nEmail: ${DEFAULT_BUSINESS_CONFIG.email}\nWebsite: ${DEFAULT_BUSINESS_CONFIG.website}`, 'Hostel address and contacts');
    this.settingsStore.setSetting('guideWifiName', process.env.DEFAULT_WIFI_NAME || `${DEFAULT_BUSINESS_CONFIG.shortName}_Guest`, 'WiFi SSID');
    this.settingsStore.setSetting('guideWifiPassword', process.env.DEFAULT_WIFI_PASSWORD || 'Welcome2024!', 'WiFi password');
    this.settingsStore.setSetting('guideCheckin', 'Check-In Time: 2:00 PM\nCheck-Out Time: 12:00 PM\n\nHow to check in:\n1) Present a valid ID/passport at the front desk.\n2) If you have a self-check-in token, show it to staff.\n3) Early check-in / late check-out may be available upon request (subject to availability and charges).', 'Check-in and check-out guidance');
    this.settingsStore.setSetting('guideOther', 'House rules and guidance:\n- Quiet hours: [insert time] to [insert time]\n- Keep shared spaces clean\n- No smoking inside the premises\n- Follow staff instructions for safety\n\nAmenities overview:\n- Private units with light, power outlet, and privacy screen\n- Air conditioning throughout\n- Free high-speed Wi-Fi\n- Clean shared bathrooms with toiletries\n- Secure lockers\n- Lounge area\n- Pantry/kitchenette with microwave, kettle, and fridge\n- Self-service laundry (paid)\n- 24-hour security and CCTV\n- Reception assistance and local tips', 'Other guest guidance and rules');
    this.settingsStore.setSetting('guideFaq', 'Q: What are the check-in and check-out times?\nA: Standard check-in is at [insert time], and check-out is at [insert time]. Early/late options may be arranged based on availability.\n\nQ: Are towels and toiletries provided?\nA: Yes, fresh towels and basic toiletries are provided.\n\nQ: Is there parking available?\nA: [Insert parking information].\n\nQ: Can I store my luggage after check-out?\nA: Yes, complimentary luggage storage is available at the front desk.\n\nQ: Are there quiet hours?\nA: Yes, quiet hours are observed from [insert time] to [insert time].', 'Frequently asked questions');
    this.settingsStore.setSetting('guideShowIntro', 'true', 'Show intro to guests');
    this.settingsStore.setSetting('guideShowAddress', 'true', 'Show address to guests');
    this.settingsStore.setSetting('guideShowWifi', 'true', 'Show WiFi to guests');
    this.settingsStore.setSetting('guideShowCheckin', 'true', 'Show check-in guidance');
    this.settingsStore.setSetting('guideShowOther', 'true', 'Show other guidance');
    this.settingsStore.setSetting('guideShowFaq', 'true', 'Show FAQ');
    this.settingsStore.setSetting('guideCheckinTime', '3:00 PM', 'Check-in time');
    this.settingsStore.setSetting('guideCheckoutTime', '12:00 PM', 'Check-out time');
    this.settingsStore.setSetting('guideDoorPassword', process.env.DEFAULT_DOOR_PASSWORD || '1234#', 'Door access password');
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
  getGuestHistory(pagination?: PaginationParams, sortBy?: string, sortOrder?: 'asc' | 'desc', filters?: { search?: string; nationality?: string; unit?: string }) {
    return this.guestStore.getGuestHistory(pagination, sortBy, sortOrder, filters);
  }
  deleteGuest(id: string) { return this.guestStore.deleteGuest(id); }
  updateGuest(id: string, updates: Partial<Guest>) { return this.guestStore.updateGuest(id, updates); }
  getGuestsWithCheckoutToday() { return this.guestStore.getGuestsWithCheckoutToday(); }
  getRecentlyCheckedOutGuest() { return this.guestStore.getRecentlyCheckedOutGuest(); }
  getGuestByUnitAndName(unitNumber: string, name: string) { return this.guestStore.getGuestByUnitAndName(unitNumber, name); }
  getGuestByToken(token: string) { return this.guestStore.getGuestByToken(token); }
  getGuestsByDateRange(start: Date, end: Date) { return this.guestStore.getGuestsByDateRange(start, end); }

  /** Cross-entity: checkout guest then update unit cleaning status */
  async checkoutGuest(id: string): Promise<Guest | undefined> {
    const updatedGuest = await this.guestStore.checkoutGuest(id);
    if (updatedGuest) {
      // Set unit status to 'to be cleaned' after checkout
      const unit = await this.unitStore.getUnit(updatedGuest.unitNumber);
      if (unit) {
        await this.unitStore.updateUnit(updatedGuest.unitNumber, {
          cleaningStatus: 'to_be_cleaned',
          isAvailable: true,
        });
      }
    }
    return updatedGuest;
  }

  /** Cross-entity: occupancy requires guest + unit data */
  async getUnitOccupancy(): Promise<{ total: number; occupied: number; available: number; occupancyRate: number }> {
    const allUnits = await this.unitStore.getAllUnits();
    const rentableUnits = allUnits.filter(u => u.toRent !== false);
    const totalUnits = rentableUnits.length;
    const rentableUnitNumbers = new Set(rentableUnits.map(u => u.number));

    const checkedInGuestsResponse = await this.guestStore.getCheckedInGuests();
    const occupied = checkedInGuestsResponse.data.filter(g => rentableUnitNumbers.has(g.unitNumber)).length;

    const available = Math.max(0, totalUnits - occupied);
    const occupancyRate = totalUnits > 0 ? Math.min(100, Math.round((occupied / totalUnits) * 100)) : 0;

    return { total: totalUnits, occupied, available, occupancyRate };
  }

  /** Cross-entity: available units requires guest + unit data */
  async getAvailableUnits(): Promise<Unit[]> {
    const checkedInGuests = await this.guestStore.getCheckedInGuests();
    const occupiedUnits = new Set(checkedInGuests.data.map(guest => guest.unitNumber));

    const allUnits = await this.unitStore.getAllUnits();
    const availableUnits = allUnits.filter(
      unit => unit.isAvailable &&
        !occupiedUnits.has(unit.number) &&
        unit.cleaningStatus === "cleaned" &&
        unit.toRent !== false
    );

    return availableUnits.sort((a, b) => {
      const aNum = parseInt(a.number.replace('C', ''));
      const bNum = parseInt(b.number.replace('C', ''));
      return aNum - bNum;
    });
  }

  /** Cross-entity: uncleaned available units requires guest + unit data */
  async getUncleanedAvailableUnits(): Promise<Unit[]> {
    const checkedInGuests = await this.guestStore.getCheckedInGuests();
    const occupiedUnits = new Set(checkedInGuests.data.map(guest => guest.unitNumber));

    const allUnits = await this.unitStore.getAllUnits();
    return allUnits.filter(
      unit => unit.isAvailable &&
        !occupiedUnits.has(unit.number) &&
        unit.cleaningStatus === "to_be_cleaned" &&
        unit.toRent !== false
    );
  }

  // ─── IUnitStorage (delegates to MemUnitStore) ──────────────────────────────

  getAllUnits() { return this.unitStore.getAllUnits(); }
  getUnit(number: string) { return this.unitStore.getUnit(number); }
  getUnitById(id: string) { return this.unitStore.getUnitById(id); }
  updateUnit(number: string, updates: Partial<Unit>) { return this.unitStore.updateUnit(number, updates); }
  createUnit(unit: InsertUnit) { return this.unitStore.createUnit(unit); }
  deleteUnit(number: string) { return this.unitStore.deleteUnit(number); }
  markUnitCleaned(unitNumber: string, cleanedBy: string) { return this.unitStore.markUnitCleaned(unitNumber, cleanedBy); }
  markUnitNeedsCleaning(unitNumber: string) { return this.unitStore.markUnitNeedsCleaning(unitNumber); }
  getUnitsByCleaningStatus(status: "cleaned" | "to_be_cleaned") { return this.unitStore.getUnitsByCleaningStatus(status); }

  /** Cross-entity: getGuestsByUnit queries guests by unit number */
  getGuestsByUnit(unitNumber: string) { return this.guestStore.getGuestsByUnit(unitNumber); }

  // ─── IProblemStorage (delegates to MemProblemStore) ────────────────────────

  createUnitProblem(problem: InsertUnitProblem) { return this.problemStore.createUnitProblem(problem); }
  getUnitProblems(unitNumber: string) { return this.problemStore.getUnitProblems(unitNumber); }
  getActiveProblems(pagination?: PaginationParams) { return this.problemStore.getActiveProblems(pagination); }
  getAllProblems(pagination?: PaginationParams) { return this.problemStore.getAllProblems(pagination); }
  updateProblem(problemId: string, updates: Partial<InsertUnitProblem>) { return this.problemStore.updateProblem(problemId, updates); }
  resolveProblem(problemId: string, resolvedBy: string, notes?: string) { return this.problemStore.resolveProblem(problemId, resolvedBy, notes); }
  deleteProblem(problemId: string) { return this.problemStore.deleteProblem(problemId); }

  // ─── ITokenStorage (delegates to MemTokenStore) ────────────────────────────

  createGuestToken(token: InsertGuestToken) { return this.tokenStore.createGuestToken(token); }
  getGuestToken(token: string) { return this.tokenStore.getGuestToken(token); }
  getGuestTokenById(id: string) { return this.tokenStore.getGuestTokenById(id); }
  getActiveGuestTokens(pagination?: PaginationParams) { return this.tokenStore.getActiveGuestTokens(pagination); }
  markTokenAsUsed(token: string) { return this.tokenStore.markTokenAsUsed(token); }
  updateGuestTokenUnit(tokenId: string, unitNumber: string | null, autoAssign: boolean) { return this.tokenStore.updateGuestTokenUnit(tokenId, unitNumber, autoAssign); }
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

  async getDatabaseMetrics() {
    return {
      status: "ok" as const,
      uptime: "in-memory",
      connections: 0,
      size: "in-memory"
    };
  }
}
