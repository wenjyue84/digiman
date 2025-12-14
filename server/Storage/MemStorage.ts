import { type User, type InsertUser, type Guest, type InsertGuest, type Capsule, type InsertCapsule, type Session, type GuestToken, type InsertGuestToken, type CapsuleProblem, type InsertCapsuleProblem, type AdminNotification, type InsertAdminNotification, type PushSubscription, type InsertPushSubscription, type AppSetting, type InsertAppSetting, type PaginationParams, type PaginatedResponse, type Expense, type InsertExpense, type UpdateExpense } from "../../shared/schema";
import { randomUUID } from "crypto";
import { IStorage } from "./IStorage";

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private guests: Map<string, Guest>;
  private capsules: Map<string, Capsule>;
  private expenses: Map<string, Expense>;
  private sessions: Map<string, Session>;
  private guestTokens: Map<string, GuestToken>;
  private capsuleProblems: Map<string, CapsuleProblem>;
  private adminNotifications: Map<string, AdminNotification>;
  private pushSubscriptions: Map<string, PushSubscription>;
  private appSettings: Map<string, AppSetting>;
  private totalCapsules = 22; // C1-C6 (6) + C25-C26 (2) + C11-C24 (14)

  constructor() {
    this.users = new Map();
    this.guests = new Map();
    this.capsules = new Map();
    this.expenses = new Map();
    this.sessions = new Map();
    this.guestTokens = new Map();
    this.capsuleProblems = new Map();
    this.adminNotifications = new Map();
    this.pushSubscriptions = new Map();
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
        age: guest.age?.toString() || null,
        profilePhotoUrl: null,
        selfCheckinToken: null,
        status: null, // Add missing status field
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
      const isEven = i % 2 === 0;
      const capsule: Capsule = {
        id: randomUUID(),
        number: `C${i}`,
        section: 'back',
        isAvailable: true,
        cleaningStatus: 'cleaned',
        toRent: true,
        lastCleanedAt: null,
        lastCleanedBy: null,
        color: null,
        purchaseDate: '2024-01-01', // 01 Jan 24
        position: isEven ? 'bottom' : 'top', // Even = bottom, Odd = top
        remark: null,
      };
      this.capsules.set(capsule.number, capsule);
    }
    
    // Middle section: C25, C26
    for (const num of [25, 26]) {
      const isEven = num % 2 === 0;
      const capsule: Capsule = {
        id: randomUUID(),
        number: `C${num}`,
        section: 'middle',
        isAvailable: true,
        cleaningStatus: 'cleaned',
        toRent: true,
        lastCleanedAt: null,
        lastCleanedBy: null,
        color: null,
        purchaseDate: '2024-01-01', // 01 Jan 24
        position: isEven ? 'bottom' : 'top', // Even = bottom, Odd = top
        remark: null,
      };
      this.capsules.set(capsule.number, capsule);
    }
    
    // Front section: C11-C24
    for (let i = 11; i <= 24; i++) {
      const isEven = i % 2 === 0;
      const capsule: Capsule = {
        id: randomUUID(),
        number: `C${i}`,
        section: 'front',
        isAvailable: true,
        cleaningStatus: 'cleaned',
        toRent: true,
        lastCleanedAt: null,
        lastCleanedBy: null,
        color: null,
        purchaseDate: '2024-01-01', // 01 Jan 24
        position: isEven ? 'bottom' : 'top', // Even = bottom, Odd = top
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
      (user) => user.username?.toLowerCase() === username.toLowerCase(),
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
      status: insertGuest.status || null,
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

  async getGuestHistory(
    pagination?: PaginationParams, 
    sortBy: string = 'checkoutTime', 
    sortOrder: 'asc' | 'desc' = 'desc',
    filters?: { search?: string; nationality?: string; capsule?: string }
  ): Promise<PaginatedResponse<Guest>> {
    let guestHistory = Array.from(this.guests.values()).filter(guest => {
      // Base condition: must be checked out
      if (guest.isCheckedIn) return false;
      
      // Text search across multiple fields (case-insensitive)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          guest.name?.toLowerCase().includes(searchLower) ||
          guest.phoneNumber?.toLowerCase().includes(searchLower) ||
          guest.email?.toLowerCase().includes(searchLower) ||
          guest.idNumber?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Nationality filter (exact match)
      if (filters?.nationality && guest.nationality !== filters.nationality) {
        return false;
      }
      
      // Capsule filter (exact match)
      if (filters?.capsule && guest.capsuleNumber !== filters.capsule) {
        return false;
      }
      
      return true;
    });
    
    // Sort the history
    guestHistory.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortBy === 'name') {
        aVal = a.name;
        bVal = b.name;
      } else if (sortBy === 'capsuleNumber') {
        aVal = a.capsuleNumber;
        bVal = b.capsuleNumber;
      } else if (sortBy === 'checkinTime') {
        aVal = new Date(a.checkinTime).getTime();
        bVal = new Date(b.checkinTime).getTime();
      } else if (sortBy === 'checkoutTime') {
        aVal = a.checkoutTime ? new Date(a.checkoutTime).getTime() : 0;
        bVal = b.checkoutTime ? new Date(b.checkoutTime).getTime() : 0;
      } else {
        aVal = a.checkoutTime ? new Date(a.checkoutTime).getTime() : 0;
        bVal = b.checkoutTime ? new Date(b.checkoutTime).getTime() : 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
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

  async getRecentlyCheckedOutGuest(): Promise<Guest | undefined> {
    const checkedOutGuests = Array.from(this.guests.values()).filter(
      guest => !guest.isCheckedIn && guest.checkoutTime !== null
    );
    
    if (checkedOutGuests.length === 0) {
      return undefined;
    }
    
    // Sort by checkout time descending and return the most recent
    checkedOutGuests.sort((a, b) => {
      if (!a.checkoutTime || !b.checkoutTime) return 0;
      return b.checkoutTime.getTime() - a.checkoutTime.getTime();
    });
    
    return checkedOutGuests[0];
  }

  async getCapsuleOccupancy(): Promise<{ total: number; occupied: number; available: number; occupancyRate: number }> {
    // Count only capsules that are available for rent (toRent = true)
    const rentableCapsules = Array.from(this.capsules.values()).filter(c => c.toRent !== false);
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

  async getAvailableCapsules(): Promise<Capsule[]> {
    const checkedInGuests = await this.getCheckedInGuests();
    const occupiedCapsules = new Set(checkedInGuests.data.map(guest => guest.capsuleNumber));
    
    const availableCapsules = Array.from(this.capsules.values()).filter(
      capsule => capsule.isAvailable && 
                  !occupiedCapsules.has(capsule.number) && 
                  capsule.cleaningStatus === "cleaned" &&
                  capsule.toRent !== false
    );

    // Sort by sequential order: C1, C2, C3, C4... C20, C21, C24
    return availableCapsules.sort((a, b) => {
      const aNum = parseInt(a.number.replace('C', ''));
      const bNum = parseInt(b.number.replace('C', ''));
      
      // Simple numerical sort: lowest to highest
      return aNum - bNum;
    });
  }

  // Get capsules that are available but not cleaned yet (for admin warnings)
  async getUncleanedAvailableCapsules(): Promise<Capsule[]> {
    const checkedInGuests = await this.getCheckedInGuests();
    const occupiedCapsules = new Set(checkedInGuests.data.map(guest => guest.capsuleNumber));
    
    return Array.from(this.capsules.values()).filter(
      capsule => capsule.isAvailable && 
                  !occupiedCapsules.has(capsule.number) && 
                  capsule.cleaningStatus === "to_be_cleaned" &&
                  capsule.toRent !== false
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
      purchaseDate: insertCapsule.purchaseDate?.toISOString() || null,
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

  async getGuestByCapsuleAndName(capsuleNumber: string, name: string): Promise<Guest | undefined> {
    return Array.from(this.guests.values())
      .find(guest => 
        guest.capsuleNumber === capsuleNumber && 
        guest.name === name && 
        guest.isCheckedIn === true
      );
  }

  async getGuestByToken(token: string): Promise<Guest | undefined> {
    return Array.from(this.guests.values())
      .find(guest => guest.selfCheckinToken === token);
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

  async markCapsuleNeedsCleaning(capsuleNumber: string): Promise<Capsule | undefined> {
    const capsule = this.capsules.get(capsuleNumber);
    
    if (capsule) {
      const updatedCapsule: Capsule = {
        ...capsule,
        cleaningStatus: 'to_be_cleaned',
        lastCleanedAt: null,
        lastCleanedBy: null,
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
    
    // Note: We no longer automatically mark capsules as unavailable when problems are created.
    // Users can manually mark capsules as unavailable in Settings if needed.
    
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

  async updateProblem(problemId: string, updates: Partial<InsertCapsuleProblem>): Promise<CapsuleProblem | undefined> {
    const problem = this.capsuleProblems.get(problemId);
    if (problem) {
      // Update the problem with the new data, preserving existing fields
      const updatedProblem = {
        ...problem,
        ...updates,
        // Keep original timestamps and resolved status
        id: problem.id,
        reportedAt: problem.reportedAt,
        isResolved: problem.isResolved,
        resolvedBy: problem.resolvedBy,
        resolvedAt: problem.resolvedAt,
        notes: problem.notes
      };
      
      this.capsuleProblems.set(problemId, updatedProblem);
      return updatedProblem;
    }
    return undefined;
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
      
      // Note: We no longer automatically manage capsule availability based on problems.
      // Users can manually control availability in Settings.
      
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
      
      // Note: We no longer automatically manage capsule availability based on problems.
      // Users can manually control availability in Settings.
      
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

  async getGuestTokenById(id: string): Promise<GuestToken | undefined> {
    // Find the token by ID
    for (const token of this.guestTokens.values()) {
      if (token.id === id) {
        return token;
      }
    }
    return undefined;
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

  async updateGuestTokenCapsule(tokenId: string, capsuleNumber: string | null, autoAssign: boolean): Promise<GuestToken | undefined> {
    // Find the token by ID
    let tokenKey: string | null = null;
    let guestToken: GuestToken | null = null;
    
    this.guestTokens.forEach((token, key) => {
      if (token.id === tokenId) {
        tokenKey = key;
        guestToken = token;
      }
    });
    
    if (guestToken && tokenKey) {
      const updatedToken = { 
        ...guestToken, 
        capsuleNumber: capsuleNumber,
        autoAssign: autoAssign 
      };
      this.guestTokens.set(tokenKey, updatedToken);
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
    // Validate input parameters
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('Setting key is required and must be a non-empty string');
    }
    
    if (value === null || value === undefined) {
      throw new Error('Setting value is required');
    }

    const trimmedKey = key.trim();
    const stringValue = String(value);
    
    const existing = this.appSettings.get(trimmedKey);
    
    if (existing) {
      const updatedSetting: AppSetting = {
        ...existing,
        value: stringValue,
        description: description || existing.description,
        updatedBy: updatedBy || existing.updatedBy,
        updatedAt: new Date(),
      };
      this.appSettings.set(trimmedKey, updatedSetting);
      return updatedSetting;
    } else {
      const newSetting: AppSetting = {
        id: randomUUID(),
        key: trimmedKey,
        value: stringValue,
        description: description || null,
        updatedBy: updatedBy || null,
        updatedAt: new Date(),
      };
      this.appSettings.set(trimmedKey, newSetting);
      return newSetting;
    }
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
    return this.setSetting(setting.key, setting.value, setting.description || undefined, setting.updatedBy || undefined);
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
    this.setSetting('guideCheckinTime', '3:00 PM', 'Check-in time');
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

  // Expense management methods
  async getExpenses(pagination?: PaginationParams): Promise<PaginatedResponse<Expense>> {
    const allExpenses = Array.from(this.expenses.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (!pagination) {
      return {
        data: allExpenses,
        pagination: {
          page: 1,
          limit: allExpenses.length,
          total: allExpenses.length,
          totalPages: 1,
          hasMore: false,
        },
      };
    }

    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    const paginatedExpenses = allExpenses.slice(offset, offset + limit);
    const total = allExpenses.length;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      data: paginatedExpenses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    };
  }

  async addExpense(expense: InsertExpense & { createdBy: string }): Promise<Expense> {
    const id = randomUUID();
    const now = new Date();
    const newExpense: Expense = {
      id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      subcategory: expense.subcategory || null,
      date: expense.date,
      notes: expense.notes || null,
      receiptPhotoUrl: expense.receiptPhotoUrl || null,
      itemPhotoUrl: expense.itemPhotoUrl || null,
      createdBy: expense.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.expenses.set(id, newExpense);
    return newExpense;
  }

  async updateExpense(expense: UpdateExpense): Promise<Expense | undefined> {
    const existingExpense = this.expenses.get(expense.id!);
    if (!existingExpense) {
      return undefined;
    }

    const updatedExpense: Expense = {
      ...existingExpense,
      ...expense,
      id: existingExpense.id,
      createdBy: existingExpense.createdBy,
      createdAt: existingExpense.createdAt,
      updatedAt: new Date(),
    };
    this.expenses.set(expense.id!, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Push subscription management methods
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