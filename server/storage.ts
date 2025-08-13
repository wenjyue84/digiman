import { type User, type InsertUser, type Guest, type InsertGuest, type Capsule, type InsertCapsule, type Session, type GuestToken, type InsertGuestToken, type CapsuleProblem, type InsertCapsuleProblem, type AdminNotification, type InsertAdminNotification, type AppSetting, type InsertAppSetting, type MarkCapsuleCleaned, type PaginationParams, type PaginatedResponse, users, guests, capsules, sessions, guestTokens, capsuleProblems, adminNotifications, appSettings } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, ne, and, lte, isNotNull, isNull } from "drizzle-orm";

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
  
  // Capsule management methods
  getAllCapsules(): Promise<Capsule[]>;
  getCapsule(number: string): Promise<Capsule | undefined>;
  getCapsuleById(id: string): Promise<Capsule | undefined>;
  updateCapsule(number: string, updates: Partial<Capsule>): Promise<Capsule | undefined>;
  createCapsule(capsule: InsertCapsule): Promise<Capsule>;
  deleteCapsule(number: string): Promise<boolean>;
  markCapsuleCleaned(capsuleNumber: string, cleanedBy: string): Promise<Capsule | undefined>;
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private guests: Map<string, Guest>;
  private capsules: Map<string, Capsule>;
  private sessions: Map<string, Session>;
  private guestTokens: Map<string, GuestToken>;
  private capsuleProblems: Map<string, CapsuleProblem>;
  private adminNotifications: Map<string, AdminNotification>;
  private appSettings: Map<string, AppSetting>;
  private totalCapsules = 22; // C1-C6 (6) + C25-C26 (2) + C11-C24 (14)

  constructor() {
    this.users = new Map();
    this.guests = new Map();
    this.capsules = new Map();
    this.sessions = new Map();
    this.guestTokens = new Map();
    this.capsuleProblems = new Map();
    this.adminNotifications = new Map();
    this.appSettings = new Map();
    
    // Initialize capsules, admin user, and sample guests
    this.initializeCapsules();
    this.initializeDefaultUsers();
    this.initializeDefaultSettings();
    this.initializeSampleGuests();
  }

  private initializeDefaultUsers() {
    // Create default admin user
    const adminUser: User = {
      id: randomUUID(),
      email: "admin@pelangi.com",
      username: "admin",
      password: "admin123", // In production, this should be hashed
      googleId: null,
      firstName: "Admin",
      lastName: "User",
      profileImage: null,
      role: "staff",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
    console.log("Initialized default admin user with email:", adminUser.email);
  }

  private initializeSampleGuests() {
    // In production, keep static dates to avoid confusion
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
      { name: "Siti", capsule: "C6", phone: "016-1234567", checkin: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), checkout: fmtDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)), nights: 1, nationality: "Malaysian", gender: "Female", email: "siti.rahman@gmail.com", age: 24, paymentStatus: "outstanding" },
    ] : [
      // Fallback static dataset (production)
      { name: "Keong", capsule: "C1", phone: "017-6632979", checkin: "2025-08-07T15:00:00", checkout: "2025-08-08", nights: 1, nationality: "Malaysian", gender: "Male", email: "keong.lim@gmail.com", age: 28, paymentStatus: "paid" },
      { name: "Prem", capsule: "C4", phone: "019-7418889", checkin: "2025-08-07T15:00:00", checkout: "2025-08-08", nights: 1, nationality: "Malaysian", gender: "Male", email: "prem.kumar@yahoo.com", age: 32, paymentStatus: "paid" },
      { name: "Jeevan", capsule: "C5", phone: "010-5218906", checkin: "2025-08-07T15:00:00", checkout: "2025-08-08", nights: 1, nationality: "Malaysian", gender: "Male", email: "jeevan.singh@hotmail.com", age: 25, paymentStatus: "paid" },
      { name: "Ahmad", capsule: "C25", phone: "012-3456789", checkin: "2025-08-06T15:00:00", checkout: "2025-08-08", nights: 2, nationality: "Malaysian", gender: "Male", email: "ahmad.ibrahim@gmail.com", age: 29, paymentStatus: "outstanding" },
      { name: "Siti", capsule: "C6", phone: "016-1234567", checkin: "2025-08-05T15:00:00", checkout: "2025-08-06", nights: 1, nationality: "Malaysian", gender: "Female", email: "siti.rahman@gmail.com", age: 24, paymentStatus: "outstanding" },
    ];

    sampleGuests.forEach(guest => {
      const standardRate = 45; // RM45 per night
      const totalAmount = guest.nights * standardRate;
      const isOutstanding = guest.paymentStatus === "outstanding";
      const paidAmount = isOutstanding ? Math.floor(totalAmount * 0.8) : totalAmount; // 80% paid for outstanding
      
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
        age: guest.age,
        profilePhotoUrl: null,
        selfCheckinToken: null,
      };
      
      this.guests.set(guestRecord.id, guestRecord);
      
      // Mark capsule as occupied
      const capsule = this.capsules.get(guest.capsule);
      if (capsule) {
        capsule.isAvailable = false;
        this.capsules.set(guest.capsule, capsule);
      }
    });

    console.log(`Initialized ${sampleGuests.length} sample guests`);
  }

  private initializeCapsules() {
    // Back section: C1-C6
    for (let i = 1; i <= 6; i++) {
      const capsule: Capsule = {
        id: randomUUID(),
        number: `C${i}`,
        section: 'back',
        isAvailable: true,
        cleaningStatus: 'cleaned',
        lastCleanedAt: null,
        lastCleanedBy: null,
        color: null,
        purchaseDate: null,
        position: null,
        remark: null,
      };
      this.capsules.set(capsule.number, capsule);
    }
    
    // Middle section: C25, C26
    for (const num of [25, 26]) {
      const capsule: Capsule = {
        id: randomUUID(),
        number: `C${num}`,
        section: 'middle',
        isAvailable: true,
        cleaningStatus: 'cleaned',
        lastCleanedAt: null,
        lastCleanedBy: null,
        color: null,
        purchaseDate: null,
        position: null,
        remark: null,
      };
      this.capsules.set(capsule.number, capsule);
    }
    
    // Front section: C11-C24
    for (let i = 11; i <= 24; i++) {
      const capsule: Capsule = {
        id: randomUUID(),
        number: `C${i}`,
        section: 'front',
        isAvailable: true,
        cleaningStatus: 'cleaned',
        lastCleanedAt: null,
        lastCleanedBy: null,
        color: null,
        purchaseDate: null,
        position: null,
        remark: null,
      };
      this.capsules.set(capsule.number, capsule);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      role: insertUser.role || "staff",
      username: insertUser.username || null,
      password: insertUser.password || null,
      googleId: insertUser.googleId || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImage: insertUser.profileImage || null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }

    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Session management methods
  async createSession(userId: string, token: string, expiresAt: Date): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
    };
    this.sessions.set(token, session);
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    return this.sessions.get(token);
  }

  async deleteSession(token: string): Promise<boolean> {
    return this.sessions.delete(token);
  }

  async cleanExpiredSessions(): Promise<void> {
    const now = new Date();
    const sessionsArray = Array.from(this.sessions.entries());
    for (const [token, session] of sessionsArray) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
      }
    }
  }

  async createGuest(insertGuest: InsertGuest): Promise<Guest> {
    const id = randomUUID();
    
    // Use custom check-in date if provided, otherwise use current time
    let checkinTime: Date;
    if (insertGuest.checkInDate) {
      // Parse the date string and set time to current time
      const [year, month, day] = insertGuest.checkInDate.split('-').map(Number);
      const now = new Date();
      checkinTime = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    } else {
      checkinTime = new Date();
    }
    
    const { checkInDate, ...guestData } = insertGuest;
    const guest: Guest = {
      ...guestData,
      id,
      checkinTime,
      checkoutTime: null,
      isCheckedIn: true,
      expectedCheckoutDate: insertGuest.expectedCheckoutDate || null,
      paymentAmount: insertGuest.paymentAmount || null,
      paymentMethod: insertGuest.paymentMethod || "cash",
      paymentCollector: insertGuest.paymentCollector || null,
      isPaid: insertGuest.isPaid || false,
      notes: insertGuest.notes || null,
      gender: insertGuest.gender || null,
      nationality: insertGuest.nationality || null,
      phoneNumber: insertGuest.phoneNumber || null,
      email: insertGuest.email || null,
      idNumber: insertGuest.idNumber || null,
      emergencyContact: insertGuest.emergencyContact || null,
      emergencyPhone: insertGuest.emergencyPhone || null,
      age: insertGuest.age || null,
      profilePhotoUrl: insertGuest.profilePhotoUrl || null,
      selfCheckinToken: insertGuest.selfCheckinToken || null,
    };
    this.guests.set(id, guest);
    return guest;
  }

  async getGuest(id: string): Promise<Guest | undefined> {
    return this.guests.get(id);
  }

  async getAllGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>> {
    const allGuests = Array.from(this.guests.values());
    return this.paginate(allGuests, pagination);
  }

  async getCheckedInGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>> {
    const checkedInGuests = Array.from(this.guests.values()).filter(guest => guest.isCheckedIn);
    return this.paginate(checkedInGuests, pagination);
  }

  async getGuestHistory(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>> {
    const guestHistory = Array.from(this.guests.values()).filter(guest => !guest.isCheckedIn);
    return this.paginate(guestHistory, pagination);
  }

  async checkoutGuest(id: string): Promise<Guest | undefined> {
    const guest = this.guests.get(id);
    if (guest && guest.isCheckedIn) {
      const updatedGuest: Guest = {
        ...guest,
        checkoutTime: new Date(),
        isCheckedIn: false,
      };
      this.guests.set(id, updatedGuest);
      
      // Set capsule status to 'to be cleaned' after checkout
      const capsule = this.capsules.get(guest.capsuleNumber);
      if (capsule) {
        const updatedCapsule: Capsule = {
          ...capsule,
          cleaningStatus: 'to_be_cleaned',
          isAvailable: true, // Make available for booking but needs cleaning
        };
        this.capsules.set(guest.capsuleNumber, updatedCapsule);
      }
      
      return updatedGuest;
    }
    return undefined;
  }

  async updateGuest(id: string, updates: Partial<Guest>): Promise<Guest | undefined> {
    const guest = this.guests.get(id);
    if (guest) {
      const updatedGuest = { ...guest, ...updates };
      this.guests.set(id, updatedGuest);
      return updatedGuest;
    }
    return undefined;
  }

  async getGuestsWithCheckoutToday(): Promise<Guest[]> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return Array.from(this.guests.values()).filter(
      guest => guest.isCheckedIn && 
      guest.expectedCheckoutDate === today
    );
  }

  async getCapsuleOccupancy(): Promise<{ total: number; occupied: number; available: number; occupancyRate: number }> {
    const checkedInGuestsResponse = await this.getCheckedInGuests();
    const occupied = checkedInGuestsResponse.pagination.total;
    const available = this.totalCapsules - occupied;
    const occupancyRate = Math.round((occupied / this.totalCapsules) * 100);

    return {
      total: this.totalCapsules,
      occupied,
      available,
      occupancyRate,
    };
  }

  async getAvailableCapsules(): Promise<Capsule[]> {
    const checkedInGuests = await this.getCheckedInGuests();
    const occupiedCapsules = new Set(checkedInGuests.data.map(guest => guest.capsuleNumber));
    
    return Array.from(this.capsules.values()).filter(
      capsule => capsule.isAvailable && !occupiedCapsules.has(capsule.number)
    );
  }

  async getAllCapsules(): Promise<Capsule[]> {
    return Array.from(this.capsules.values());
  }

  async getCapsule(number: string): Promise<Capsule | undefined> {
    return this.capsules.get(number);
  }

  async getCapsuleById(id: string): Promise<Capsule | undefined> {
    for (const capsule of Array.from(this.capsules.values())) {
      if (capsule.id === id) {
        return capsule;
      }
    }
    return undefined;
  }

  async updateCapsule(number: string, updates: Partial<Capsule>): Promise<Capsule | undefined> {
    const capsule = this.capsules.get(number);
    if (capsule) {
      const updatedCapsule = { ...capsule, ...updates };
      this.capsules.set(number, updatedCapsule);
      
      // Check if we're marking capsule as available again (problem resolved)
      if (updates.isAvailable === true && !capsule.isAvailable) {
        // Auto-resolve any active problems for this capsule
        const problems = Array.from(this.capsuleProblems.values()).filter(
          p => p.capsuleNumber === number && !p.isResolved
        );
        for (const problem of problems) {
          problem.isResolved = true;
          problem.resolvedAt = new Date();
          problem.resolvedBy = "System";
          problem.notes = "Auto-resolved when capsule marked as available";
        }
      }
      
      return updatedCapsule;
    }
    return undefined;
  }

  async createCapsule(insertCapsule: InsertCapsule): Promise<Capsule> {
    const id = randomUUID();
    const capsule: Capsule = { 
      ...insertCapsule, 
      id,
      lastCleanedAt: insertCapsule.lastCleanedAt || null,
      lastCleanedBy: insertCapsule.lastCleanedBy || null,
      color: insertCapsule.color || null,
      purchaseDate: insertCapsule.purchaseDate || null,
      position: insertCapsule.position || null,
      remark: insertCapsule.remark || null,
    };
    this.capsules.set(capsule.number, capsule);
    return capsule;
  }

  async deleteCapsule(number: string): Promise<boolean> {
    const exists = this.capsules.has(number);
    if (exists) {
      this.capsules.delete(number);
      
      // Also remove any associated problems
      const problemsToDelete = Array.from(this.capsuleProblems.entries())
        .filter(([_, problem]) => problem.capsuleNumber === number)
        .map(([id, _]) => id);
      
      for (const problemId of problemsToDelete) {
        this.capsuleProblems.delete(problemId);
      }
      
      return true;
    }
    return false;
  }

  async getGuestsByCapsule(capsuleNumber: string): Promise<Guest[]> {
    return Array.from(this.guests.values())
      .filter(guest => guest.capsuleNumber === capsuleNumber && guest.isCheckedIn);
  }

  // Cleaning management methods
  async markCapsuleCleaned(capsuleNumber: string, cleanedBy: string): Promise<Capsule | undefined> {
    const capsule = this.capsules.get(capsuleNumber);
    
    if (capsule) {
      const updatedCapsule: Capsule = {
        ...capsule,
        cleaningStatus: 'cleaned',
        lastCleanedAt: new Date(),
        lastCleanedBy: cleanedBy,
      };
      this.capsules.set(capsuleNumber, updatedCapsule);
      return updatedCapsule;
    }
    return undefined;
  }

  async getCapsulesByCleaningStatus(status: "cleaned" | "to_be_cleaned"): Promise<Capsule[]> {
    return Array.from(this.capsules.values()).filter(
      capsule => capsule.cleaningStatus === status
    );
  }

  // Capsule problem management
  async createCapsuleProblem(problem: InsertCapsuleProblem): Promise<CapsuleProblem> {
    const id = randomUUID();
    const capsuleProblem: CapsuleProblem = {
      id,
      capsuleNumber: problem.capsuleNumber,
      description: problem.description,
      reportedBy: problem.reportedBy,
      reportedAt: problem.reportedAt || new Date(),
      isResolved: false,
      resolvedBy: null,
      resolvedAt: null,
      notes: null,
    };
    this.capsuleProblems.set(id, capsuleProblem);
    
    // Mark capsule as unavailable
    const capsule = this.capsules.get(problem.capsuleNumber);
    if (capsule) {
      capsule.isAvailable = false;
      this.capsules.set(problem.capsuleNumber, capsule);
    }
    
    return capsuleProblem;
  }

  async getCapsuleProblems(capsuleNumber: string): Promise<CapsuleProblem[]> {
    return Array.from(this.capsuleProblems.values())
      .filter(p => p.capsuleNumber === capsuleNumber)
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
  }

  async getActiveProblems(pagination?: PaginationParams): Promise<PaginatedResponse<CapsuleProblem>> {
    const activeProblems = Array.from(this.capsuleProblems.values())
      .filter(p => !p.isResolved)
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    return this.paginate(activeProblems, pagination);
  }

  async getAllProblems(pagination?: PaginationParams): Promise<PaginatedResponse<CapsuleProblem>> {
    const allProblems = Array.from(this.capsuleProblems.values())
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    return this.paginate(allProblems, pagination);
  }

  async resolveProblem(problemId: string, resolvedBy: string, notes?: string): Promise<CapsuleProblem | undefined> {
    const problem = this.capsuleProblems.get(problemId);
    if (problem) {
      problem.isResolved = true;
      problem.resolvedBy = resolvedBy;
      problem.resolvedAt = new Date();
      problem.notes = notes || null;
      this.capsuleProblems.set(problemId, problem);
      
      // Check if there are any other active problems for this capsule
      const activeProblems = Array.from(this.capsuleProblems.values())
        .filter(p => p.capsuleNumber === problem.capsuleNumber && !p.isResolved);
      
      // If no other active problems, mark capsule as available
      if (activeProblems.length === 0) {
        const capsule = this.capsules.get(problem.capsuleNumber);
        if (capsule) {
          capsule.isAvailable = true;
          this.capsules.set(problem.capsuleNumber, capsule);
        }
      }
      
      return problem;
    }
    return undefined;
  }

  async deleteProblem(problemId: string): Promise<boolean> {
    const problem = this.capsuleProblems.get(problemId);
    if (problem) {
      // Remove the problem
      this.capsuleProblems.delete(problemId);
      
      // Check if there are any other active problems for this capsule
      const activeProblems = Array.from(this.capsuleProblems.values())
        .filter(p => p.capsuleNumber === problem.capsuleNumber && !p.isResolved);
      
      // If no other active problems, mark capsule as available
      if (activeProblems.length === 0) {
        const capsule = this.capsules.get(problem.capsuleNumber);
        if (capsule) {
          capsule.isAvailable = true;
          this.capsules.set(problem.capsuleNumber, capsule);
        }
      }
      
      return true;
    }
    return false;
  }

  // Guest token management methods
  async createGuestToken(insertToken: InsertGuestToken): Promise<GuestToken> {
    const token: GuestToken = {
      id: randomUUID(),
      token: insertToken.token,
      capsuleNumber: insertToken.capsuleNumber || null,
      autoAssign: insertToken.autoAssign || false,
      guestName: insertToken.guestName || null,
      phoneNumber: insertToken.phoneNumber || null,
      email: insertToken.email || null,
      expectedCheckoutDate: insertToken.expectedCheckoutDate || null,
      createdBy: insertToken.createdBy,
      isUsed: false,
      usedAt: null,
      expiresAt: insertToken.expiresAt,
      createdAt: new Date(),
    };
    this.guestTokens.set(token.token, token);
    return token;
  }

  async getGuestToken(token: string): Promise<GuestToken | undefined> {
    return this.guestTokens.get(token);
  }

  async getActiveGuestTokens(pagination?: PaginationParams): Promise<PaginatedResponse<GuestToken>> {
    const now = new Date();
    const activeTokens = Array.from(this.guestTokens.values())
      .filter(token => !token.isUsed && token.expiresAt > now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return this.paginate(activeTokens, pagination);
  }

  async markTokenAsUsed(token: string): Promise<GuestToken | undefined> {
    const guestToken = this.guestTokens.get(token);
    if (guestToken) {
      const updatedToken = { ...guestToken, isUsed: true, usedAt: new Date() };
      this.guestTokens.set(token, updatedToken);
      return updatedToken;
    }
    return undefined;
  }

  async deleteGuestToken(id: string): Promise<boolean> {
    // Find the token by iterating through the Map values
    let tokenToDelete: string | null = null;
    
    this.guestTokens.forEach((guestToken, token) => {
      if (guestToken.id === id) {
        tokenToDelete = token;
      }
    });
    
    if (tokenToDelete) {
      this.guestTokens.delete(tokenToDelete);
      return true;
    }
    
    return false;
  }

  async cleanExpiredTokens(): Promise<void> {
    const now = new Date();
    for (const [token, tokenData] of Array.from(this.guestTokens.entries())) {
      if (tokenData.expiresAt < now) {
        this.guestTokens.delete(token);
      }
    }
  }

  // Admin notification methods
  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const id = randomUUID();
    const adminNotification: AdminNotification = {
      id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      guestId: notification.guestId || null,
      capsuleNumber: notification.capsuleNumber || null,
      isRead: false,
      createdAt: new Date(),
    };
    this.adminNotifications.set(id, adminNotification);
    return adminNotification;
  }

  async getAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>> {
    const allNotifications = Array.from(this.adminNotifications.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return this.paginate(allNotifications, pagination);
  }

  async getUnreadAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>> {
    const unreadNotifications = Array.from(this.adminNotifications.values())
      .filter(n => !n.isRead)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return this.paginate(unreadNotifications, pagination);
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

  // App settings methods
  async getSetting(key: string): Promise<AppSetting | undefined> {
    return this.appSettings.get(key);
  }

  async setSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<AppSetting> {
    const setting: AppSetting = {
      id: randomUUID(),
      key,
      value,
      description: description || null,
      updatedBy: updatedBy || null,
      updatedAt: new Date(),
    };
    this.appSettings.set(key, setting);
    return setting;
  }

  async getAllSettings(): Promise<AppSetting[]> {
    return Array.from(this.appSettings.values());
  }

  async getGuestTokenExpirationHours(): Promise<number> {
    const setting = await this.getSetting('guestTokenExpirationHours');
    return setting ? parseInt(setting.value) : 24; // Default to 24 hours
  }

  // New app settings methods
  async getAppSetting(key: string): Promise<AppSetting | undefined> {
    return this.getSetting(key);
  }

  async upsertAppSetting(setting: InsertAppSetting): Promise<AppSetting> {
    return this.setSetting(setting.key, setting.value, setting.description, setting.updatedBy);
  }

  async getAllAppSettings(): Promise<AppSetting[]> {
    return this.getAllSettings();
  }

  async deleteAppSetting(key: string): Promise<boolean> {
    const deleted = this.appSettings.delete(key);
    return deleted;
  }

  private initializeDefaultSettings(): void {
    // Initialize default settings
    this.setSetting('guestTokenExpirationHours', '24', 'Hours before guest check-in tokens expire');
    this.setSetting('accommodationType', 'capsule', 'Type of accommodation (capsule, room, or house)');
    // Guest Guide defaults (can be edited in Settings > Guest Guide)
    this.setSetting(
      'guideIntro',
      'Pelangi Capsule Hostel is a modern, innovative accommodation designed to provide guests with comfort, privacy, and convenience at an affordable price. Our contemporary capsule concept offers private sleeping pods with essential amenities in a clean, safe, and friendly environment. Communal spaces encourage social interaction while maintaining personal privacy.',
      'Guest guide introduction'
    );
    this.setSetting(
      'guideAddress',
      '26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia\nPhone: +60 12-345 6789\nEmail: info@pelangicapsule.com\nWebsite: www.pelangicapsule.com',
      'Hostel address and contacts'
    );
    this.setSetting('guideWifiName', 'Pelangi_Guest', 'WiFi SSID');
    this.setSetting('guideWifiPassword', 'Pelangi2024!', 'WiFi password');
    this.setSetting(
      'guideCheckin',
      'Check-In Time: 2:00 PM\nCheck-Out Time: 12:00 PM\n\nHow to check in:\n1) Present a valid ID/passport at the front desk.\n2) If you have a self-check-in token, show it to staff.\n3) Early check-in / late check-out may be available upon request (subject to availability and charges).',
      'Check-in and check-out guidance'
    );
    this.setSetting(
      'guideOther',
      'House rules and guidance:\n- Quiet hours: [insert time] to [insert time]\n- Keep shared spaces clean\n- No smoking inside the premises\n- Follow staff instructions for safety\n\nAmenities overview:\n- Private capsules with light, power outlet, and privacy screen\n- Air conditioning throughout\n- Free high-speed Wi-Fi\n- Clean shared bathrooms with toiletries\n- Secure lockers\n- Lounge area\n- Pantry/kitchenette with microwave, kettle, and fridge\n- Self-service laundry (paid)\n- 24-hour security and CCTV\n- Reception assistance and local tips',
      'Other guest guidance and rules'
    );
    this.setSetting(
      'guideFaq',
      'Q: What are the check-in and check-out times?\nA: Standard check-in is at [insert time], and check-out is at [insert time]. Early/late options may be arranged based on availability.\n\nQ: Are towels and toiletries provided?\nA: Yes, fresh towels and basic toiletries are provided.\n\nQ: Is there parking available?\nA: [Insert parking information].\n\nQ: Can I store my luggage after check-out?\nA: Yes, complimentary luggage storage is available at the front desk.\n\nQ: Are there quiet hours?\nA: Yes, quiet hours are observed from [insert time] to [insert time].',
      'Frequently asked questions'
    );
    // Default visibility: show all sections to guests
    this.setSetting('guideShowIntro', 'true', 'Show intro to guests');
    this.setSetting('guideShowAddress', 'true', 'Show address to guests');
    this.setSetting('guideShowWifi', 'true', 'Show WiFi to guests');
    this.setSetting('guideShowCheckin', 'true', 'Show check-in guidance');
    this.setSetting('guideShowOther', 'true', 'Show other guidance');
    this.setSetting('guideShowFaq', 'true', 'Show FAQ');
    
    // Default time and access settings
    this.setSetting('guideCheckinTime', '2:00 PM', 'Check-in time');
    this.setSetting('guideCheckoutTime', '12:00 PM', 'Check-out time');
    this.setSetting('guideDoorPassword', '1270#', 'Door access password');
    this.setSetting('guideImportantReminders', 'Please keep your room key safe. Quiet hours are from 10:00 PM to 7:00 AM. No smoking inside the building. Keep shared spaces clean.', 'Important reminders for guests');
  }

  // Helper function for pagination
  private paginate<T>(items: T[], pagination?: PaginationParams): PaginatedResponse<T> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedItems = items.slice(startIndex, endIndex);
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;
    
    return {
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    };
  }
}

// Database Storage Implementation
class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
  }

  // Helper function for pagination
  private paginate<T>(items: T[], pagination?: PaginationParams): PaginatedResponse<T> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedItems = items.slice(startIndex, endIndex);
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;
    
    return {
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await this.db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // Session management methods
  async createSession(userId: string, token: string, expiresAt: Date): Promise<Session> {
    const result = await this.db.insert(sessions).values({
      userId,
      token,
      expiresAt,
    }).returning();
    return result[0];
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const result = await this.db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    return result[0];
  }

  async deleteSession(token: string): Promise<boolean> {
    const result = await this.db.delete(sessions).where(eq(sessions.token, token)).returning();
    return result.length > 0;
  }

  async cleanExpiredSessions(): Promise<void> {
    await this.db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  }

  async createGuest(insertGuest: InsertGuest): Promise<Guest> {
    // Prepare the data to insert
    const { checkInDate, ...insertData } = insertGuest;
    
    // If custom check-in date is provided, override the default
    if (checkInDate) {
      const [year, month, day] = checkInDate.split('-').map(Number);
      const now = new Date();
      (insertData as any).checkinTime = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    }
    
    const result = await this.db.insert(guests).values(insertData).returning();
    return result[0];
  }

  async getGuest(id: string): Promise<Guest | undefined> {
    const result = await this.db.select().from(guests).where(eq(guests.id, id)).limit(1);
    return result[0];
  }

  async getAllGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>> {
    const allGuests = await this.db.select().from(guests);
    return this.paginate(allGuests, pagination);
  }

  async getCheckedInGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>> {
    const checkedInGuests = await this.db.select().from(guests).where(eq(guests.isCheckedIn, true));
    return this.paginate(checkedInGuests, pagination);
  }

  async getGuestHistory(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>> {
    const guestHistory = await this.db.select().from(guests).where(eq(guests.isCheckedIn, false));
    return this.paginate(guestHistory, pagination);
  }

  async checkoutGuest(id: string): Promise<Guest | undefined> {
    const result = await this.db
      .update(guests)
      .set({ 
        checkoutTime: new Date(),
        isCheckedIn: false 
      })
      .where(eq(guests.id, id))
      .returning();
    
    // Update capsule cleaning status to 'to_be_cleaned' after checkout
    if (result[0]?.capsuleNumber) {
      await this.db
        .update(capsules)
        .set({ 
          cleaningStatus: 'to_be_cleaned',
          isAvailable: true 
        })
        .where(eq(capsules.number, result[0].capsuleNumber));
    }
    
    return result[0];
  }

  async updateGuest(id: string, updates: Partial<Guest>): Promise<Guest | undefined> {
    const result = await this.db
      .update(guests)
      .set(updates)
      .where(eq(guests.id, id))
      .returning();
    
    return result[0];
  }

  async getGuestsWithCheckoutToday(): Promise<Guest[]> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return await this.db
      .select()
      .from(guests)
      .where(and(
        eq(guests.isCheckedIn, true),
        eq(guests.expectedCheckoutDate, today)
      ));
  }

  async getCapsuleOccupancy(): Promise<{ total: number; occupied: number; available: number; occupancyRate: number }> {
    const checkedInGuestsResponse = await this.getCheckedInGuests();
    const occupied = checkedInGuestsResponse.pagination.total;
    const totalCapsules = 22; // C1-C6 (6) + C25-C26 (2) + C11-C24 (14) = 22 total
    const available = totalCapsules - occupied;
    const occupancyRate = Math.round((occupied / totalCapsules) * 100);

    return {
      total: totalCapsules,
      occupied,
      available,
      occupancyRate,
    };
  }

  async getAvailableCapsules(): Promise<Capsule[]> {
    const checkedInGuests = await this.getCheckedInGuests();
    const occupiedCapsules = new Set(checkedInGuests.data.map(guest => guest.capsuleNumber));
    
    const availableCapsules = await this.db
      .select()
      .from(capsules)
      .where(eq(capsules.isAvailable, true));
    
    return availableCapsules.filter(capsule => !occupiedCapsules.has(capsule.number));
  }

  async getAllCapsules(): Promise<Capsule[]> {
    return await this.db.select().from(capsules);
  }

  async getCapsule(number: string): Promise<Capsule | undefined> {
    const result = await this.db.select().from(capsules).where(eq(capsules.number, number)).limit(1);
    return result[0];
  }

  async getCapsuleById(id: string): Promise<Capsule | undefined> {
    const result = await this.db.select().from(capsules).where(eq(capsules.id, id)).limit(1);
    return result[0];
  }

  async updateCapsule(number: string, updates: Partial<Capsule>): Promise<Capsule | undefined> {
    const result = await this.db
      .update(capsules)
      .set(updates)
      .where(eq(capsules.number, number))
      .returning();
    
    return result[0];
  }

  // Capsule cleaning operations
  async markCapsuleCleaned(capsuleNumber: string, cleanedBy: string): Promise<Capsule | undefined> {
    const result = await this.db
      .update(capsules)
      .set({
        cleaningStatus: 'cleaned',
        lastCleanedAt: new Date(),
        lastCleanedBy: cleanedBy
      })
      .where(eq(capsules.number, capsuleNumber))
      .returning();
    
    return result[0];
  }

  async getCapsulesByCleaningStatus(status: 'cleaned' | 'to_be_cleaned'): Promise<Capsule[]> {
    return await this.db
      .select()
      .from(capsules)
      .where(eq(capsules.cleaningStatus, status));
  }

  async createCapsule(capsule: InsertCapsule): Promise<Capsule> {
    const result = await this.db.insert(capsules).values(capsule).returning();
    return result[0];
  }

  async deleteCapsule(number: string): Promise<boolean> {
    try {
      // First delete associated problems
      await this.db
        .delete(capsuleProblems)
        .where(eq(capsuleProblems.capsuleNumber, number));

      // Then delete the capsule
      const result = await this.db
        .delete(capsules)
        .where(eq(capsules.number, number))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting capsule:", error);
      return false;
    }
  }

  async getGuestsByCapsule(capsuleNumber: string): Promise<Guest[]> {
    return await this.db
      .select()
      .from(guests)
      .where(and(
        eq(guests.capsuleNumber, capsuleNumber),
        eq(guests.isCheckedIn, true)
      ));
  }

  // Capsule problem methods for DatabaseStorage
  async createCapsuleProblem(problem: InsertCapsuleProblem): Promise<CapsuleProblem> {
    const result = await this.db.insert(capsuleProblems).values(problem).returning();
    return result[0];
  }

  async getCapsuleProblems(capsuleNumber: string): Promise<CapsuleProblem[]> {
    return await this.db
      .select()
      .from(capsuleProblems)
      .where(eq(capsuleProblems.capsuleNumber, capsuleNumber))
      .orderBy(capsuleProblems.reportedAt);
  }

  async getActiveProblems(pagination?: PaginationParams): Promise<PaginatedResponse<CapsuleProblem>> {
    const activeProblems = await this.db
      .select()
      .from(capsuleProblems)
      .where(eq(capsuleProblems.isResolved, false))
      .orderBy(capsuleProblems.reportedAt);
    return this.paginate(activeProblems, pagination);
  }

  async getAllProblems(pagination?: PaginationParams): Promise<PaginatedResponse<CapsuleProblem>> {
    const allProblems = await this.db
      .select()
      .from(capsuleProblems)
      .orderBy(capsuleProblems.reportedAt);
    return this.paginate(allProblems, pagination);
  }

  async resolveProblem(problemId: string, resolvedBy: string, notes?: string): Promise<CapsuleProblem | undefined> {
    const result = await this.db
      .update(capsuleProblems)
      .set({ 
        isResolved: true, 
        resolvedBy, 
        resolvedAt: new Date(), 
        notes: notes || null 
      })
      .where(eq(capsuleProblems.id, problemId))
      .returning();
    
    return result[0];
  }

  async deleteProblem(problemId: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(capsuleProblems)
        .where(eq(capsuleProblems.id, problemId))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting problem:", error);
      return false;
    }
  }

  // Guest token methods for DatabaseStorage
  async createGuestToken(token: InsertGuestToken): Promise<GuestToken> {
    const result = await this.db.insert(guestTokens).values(token).returning();
    return result[0];
  }

  async getGuestToken(token: string): Promise<GuestToken | undefined> {
    const result = await this.db.select().from(guestTokens).where(eq(guestTokens.token, token)).limit(1);
    return result[0];
  }

  async markTokenAsUsed(token: string): Promise<GuestToken | undefined> {
    const result = await this.db
      .update(guestTokens)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(guestTokens.token, token))
      .returning();
    
    return result[0];
  }

  async deleteGuestToken(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(guestTokens)
        .where(eq(guestTokens.id, id))
        .returning();
      
      // Check if any rows were actually deleted
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting guest token:', error);
      return false;
    }
  }

  async getActiveGuestTokens(pagination?: PaginationParams): Promise<PaginatedResponse<GuestToken>> {
    const now = new Date();
    const activeTokens = await this.db
      .select()
      .from(guestTokens)
      .where(and(
        eq(guestTokens.isUsed, false),
        isNotNull(guestTokens.expiresAt)
      ))
      .orderBy(guestTokens.createdAt);
    // Filter out expired tokens
    const nonExpiredTokens = activeTokens.filter(token => token.expiresAt && token.expiresAt > now);
    return this.paginate(nonExpiredTokens, pagination);
  }

  async cleanExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.db.delete(guestTokens).where(lte(guestTokens.expiresAt, now));
  }

  // Admin notification methods for DatabaseStorage
  async createAdminNotification(notification: InsertAdminNotification): Promise<AdminNotification> {
    const result = await this.db.insert(adminNotifications).values(notification).returning();
    return result[0];
  }

  async getAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>> {
    const allNotifications = await this.db
      .select()
      .from(adminNotifications)
      .orderBy(adminNotifications.createdAt);
    return this.paginate(allNotifications, pagination);
  }

  async getUnreadAdminNotifications(pagination?: PaginationParams): Promise<PaginatedResponse<AdminNotification>> {
    const unreadNotifications = await this.db
      .select()
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, false))
      .orderBy(adminNotifications.createdAt);
    return this.paginate(unreadNotifications, pagination);
  }

  async markNotificationAsRead(id: string): Promise<AdminNotification | undefined> {
    const result = await this.db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.id, id))
      .returning();
    
    return result[0];
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await this.db
      .update(adminNotifications)
      .set({ isRead: true })
      .where(eq(adminNotifications.isRead, false));
  }

  // App settings methods for DatabaseStorage
  async getSetting(key: string): Promise<AppSetting | undefined> {
    const result = await this.db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    return result[0];
  }

  async setSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<AppSetting> {
    // First try to update existing setting
    const existing = await this.getSetting(key);
    if (existing) {
      const result = await this.db
        .update(appSettings)
        .set({ value, description: description || existing.description, updatedBy, updatedAt: new Date() })
        .where(eq(appSettings.key, key))
        .returning();
      return result[0];
    } else {
      // Create new setting
      const result = await this.db
        .insert(appSettings)
        .values({ key, value, description: description || null, updatedBy: updatedBy || null })
        .returning();
      return result[0];
    }
  }

  async getAllSettings(): Promise<AppSetting[]> {
    return await this.db.select().from(appSettings);
  }

  async getGuestTokenExpirationHours(): Promise<number> {
    const setting = await this.getSetting('guestTokenExpirationHours');
    return setting ? parseInt(setting.value) : 24; // Default to 24 hours
  }

  // New app settings methods
  async getAppSetting(key: string): Promise<AppSetting | undefined> {
    return this.getSetting(key);
  }

  async upsertAppSetting(setting: InsertAppSetting): Promise<AppSetting> {
    return this.setSetting(setting.key, setting.value, setting.description, setting.updatedBy);
  }

  async getAllAppSettings(): Promise<AppSetting[]> {
    return this.getAllSettings();
  }

  async deleteAppSetting(key: string): Promise<boolean> {
    const result = await this.db
      .delete(appSettings)
      .where(eq(appSettings.key, key))
      .returning();
    return result.length > 0;
  }
}


// Automatically choose storage based on environment
let storage: MemStorage | DatabaseStorage;

try {
  if (process.env.DATABASE_URL) {
    storage = new DatabaseStorage();
    console.log("✅ Using database storage");
  } else {
    storage = new MemStorage();
    console.log("✅ Using in-memory storage (no DATABASE_URL set)");
  }
} catch (error) {
  console.warn("⚠️ Database connection failed, falling back to in-memory storage:", error);
  storage = new MemStorage();
  console.log("✅ Using in-memory storage as fallback");
}

export { storage };

