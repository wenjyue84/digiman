import type { Guest, InsertGuest, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import { guests } from "../../../shared/schema";
import { eq, and, isNotNull, count, desc, asc, or, ilike, lte, gte, isNull } from "drizzle-orm";
import { paginate } from "./paginate";

/**
 * Database guest queries — single-entity operations only.
 *
 * Cross-entity methods (checkoutGuest, getUnitOccupancy, getAvailableUnits,
 * getUncleanedAvailableUnits) are coordinated by the DatabaseStorage facade.
 */
export class DbGuestQueries {
  constructor(private readonly db: any) {}

  async createGuest(insertGuest: InsertGuest): Promise<Guest> {
    // Handle checkInDate to checkinTime conversion
    const { checkInDate, ...insertData } = insertGuest;
    if (checkInDate) {
      // Parse YYYY-MM-DD format and set time to current time
      const [year, month, day] = checkInDate.split('-').map(Number);
      const now = new Date();
      // checkinTime is automatically set by database default
    }

    const result = await this.db.insert(guests).values(insertData).returning();
    return result[0];
  }

  async getGuest(id: string): Promise<Guest | undefined> {
    const result = await this.db.select().from(guests).where(eq(guests.id, id)).limit(1);
    return result[0];
  }

  async deleteGuest(id: string): Promise<boolean> {
    const result = await this.db.delete(guests).where(eq(guests.id, id)).returning();
    return result.length > 0;
  }

  async getAllGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>> {
    const allGuests = await this.db.select().from(guests);
    return paginate(allGuests, pagination);
  }

  async getCheckedInGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>> {
    const checkedInGuests = await this.db.select().from(guests).where(eq(guests.isCheckedIn, true));
    return paginate(checkedInGuests, pagination);
  }

  async getGuestHistory(
    pagination?: PaginationParams,
    sortBy: string = 'checkoutTime',
    sortOrder: 'asc' | 'desc' = 'desc',
    filters?: { search?: string; nationality?: string; unit?: string }
  ): Promise<PaginatedResponse<Guest>> {
    // Helper for natural unit number sorting (C1, C2, ..., C10, C11 instead of C1, C10, C11, C2)
    // Handles both formats: "C1", "C11" and "C-01", "A-02"
    const parseUnitNum = (num: string) => {
      // Match formats like "C1", "C11", "C-01", "A-02", "R3"
      const match = num?.match(/^([A-Za-z]+)-?(\d+)$/);
      if (match) {
        return { prefix: match[1].toUpperCase(), num: parseInt(match[2], 10) };
      }
      return { prefix: num || '', num: 0 };
    };

    const sortUnitNumbers = (data: Guest[]) => {
      return data.sort((a, b) => {
        const aParsed = parseUnitNum(a.unitNumber);
        const bParsed = parseUnitNum(b.unitNumber);

        let comparison = 0;
        if (aParsed.prefix !== bParsed.prefix) {
          comparison = aParsed.prefix.localeCompare(bParsed.prefix);
        } else {
          comparison = aParsed.num - bParsed.num;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    };

    const orderColumn = sortBy === 'name' ? guests.name :
                       sortBy === 'unitNumber' ? guests.unitNumber :
                       sortBy === 'checkinTime' ? guests.checkinTime :
                       sortBy === 'checkoutTime' ? guests.checkoutTime :
                       guests.checkoutTime;

    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Build where conditions dynamically
    const conditions = [eq(guests.isCheckedIn, false)];

    // Add text search across multiple fields (case-insensitive)
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(guests.name, searchTerm),
          ilike(guests.phoneNumber, searchTerm),
          ilike(guests.email, searchTerm),
          ilike(guests.idNumber, searchTerm)
        )!
      );
    }

    // Add nationality filter (exact match)
    if (filters?.nationality) {
      conditions.push(eq(guests.nationality, filters.nationality));
    }

    // Add unit filter (exact match)
    if (filters?.unit) {
      conditions.push(eq(guests.unitNumber, filters.unit));
    }

    // For unitNumber sorting, we need to fetch all and sort in memory for natural order
    if (sortBy === 'unitNumber') {
      const allGuests = await this.db.select().from(guests)
        .where(and(...conditions));

      const sortedGuests = sortUnitNumbers(allGuests);

      if (!pagination) {
        return paginate(sortedGuests, pagination);
      }

      const page = Math.max(1, pagination.page || 1);
      const limit = Math.max(1, pagination.limit || 20);
      const offset = (page - 1) * limit;
      const total = sortedGuests.length;
      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      return {
        data: sortedGuests.slice(offset, offset + limit),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore
        }
      };
    }

    // If no pagination params, return all results
    if (!pagination) {
      const guestHistory = await this.db.select().from(guests)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn));
      return paginate(guestHistory, pagination);
    }

    // SQL-level pagination with count query
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.max(1, pagination.limit || 20);
    const offset = (page - 1) * limit;

    // Run count and data queries in parallel
    const [countResult, guestHistory] = await Promise.all([
      this.db.select({ count: count() }).from(guests).where(and(...conditions)),
      this.db.select().from(guests)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset)
    ]);

    const total = countResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      data: guestHistory,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore
      }
    };
  }

  async updateGuest(id: string, updates: Partial<Guest>): Promise<Guest | undefined> {
    const result = await this.db.update(guests).set(updates).where(eq(guests.id, id)).returning();
    return result[0];
  }

  async getGuestsWithCheckoutToday(): Promise<Guest[]> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return await this.db.select().from(guests).where(
      and(
        eq(guests.isCheckedIn, true),
        eq(guests.expectedCheckoutDate, today)
      )
    );
  }

  async getRecentlyCheckedOutGuest(): Promise<Guest | undefined> {
    const result = await this.db.select().from(guests)
      .where(
        and(
          eq(guests.isCheckedIn, false),
          isNotNull(guests.checkoutTime)
        )
      )
      .orderBy(desc(guests.checkoutTime))
      .limit(1);
    return result[0];
  }

  async getGuestByUnitAndName(unitNumber: string, name: string): Promise<Guest | undefined> {
    const result = await this.db.select().from(guests).where(
      and(
        eq(guests.unitNumber, unitNumber),
        eq(guests.name, name),
        eq(guests.isCheckedIn, true)
      )
    ).limit(1);
    return result[0];
  }

  async getGuestByToken(token: string): Promise<Guest | undefined> {
    const result = await this.db.select().from(guests).where(eq(guests.selfCheckinToken, token)).limit(1);
    return result[0];
  }

  async getGuestsByUnit(unitNumber: string): Promise<Guest[]> {
    return await this.db.select().from(guests).where(
      and(
        eq(guests.unitNumber, unitNumber),
        eq(guests.isCheckedIn, true)
      )
    );
  }

  /**
   * Get guests whose stay overlaps the given date range.
   * A guest overlaps if: checkinTime <= end AND (checkoutTime >= start OR checkoutTime IS NULL)
   */
  async getGuestsByDateRange(start: Date, end: Date): Promise<Guest[]> {
    return await this.db.select().from(guests).where(
      and(
        lte(guests.checkinTime, end),
        or(
          gte(guests.checkoutTime, start),
          isNull(guests.checkoutTime)
        )
      )
    );
  }
}
