import type { Reservation, InsertReservation, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import { reservations } from "../../../shared/schema";
import { eq, and, gte, lte, or, ilike, count, desc, sql } from "drizzle-orm";
import type { IReservationStorage } from "../IStorage";

/** Database reservation queries implementing IReservationStorage via Drizzle ORM */
export class DbReservationQueries implements IReservationStorage {
  constructor(private readonly db: any) {}

  async createReservation(data: InsertReservation & { createdBy: string; confirmationNumber: string }): Promise<Reservation> {
    const result = await this.db.insert(reservations).values({
      confirmationNumber: data.confirmationNumber,
      guestName: data.guestName,
      guestPhone: data.guestPhone || null,
      guestEmail: data.guestEmail || null,
      guestNationality: data.guestNationality || null,
      numberOfGuests: data.numberOfGuests ?? 1,
      unitNumber: data.unitNumber || null,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      numberOfNights: data.numberOfNights,
      totalAmount: data.totalAmount || null,
      depositAmount: data.depositAmount || null,
      depositMethod: data.depositMethod || null,
      depositPaid: data.depositPaid ?? false,
      refundStatus: data.refundStatus || null,
      status: data.status || "confirmed",
      source: data.source || "walk_in",
      specialRequests: data.specialRequests || null,
      internalNotes: data.internalNotes || null,
      createdBy: data.createdBy,
    }).returning();
    return result[0];
  }

  async getReservation(id: string): Promise<Reservation | undefined> {
    const result = await this.db.select().from(reservations).where(eq(reservations.id, id));
    return result[0];
  }

  async getReservationByConfirmation(num: string): Promise<Reservation | undefined> {
    const result = await this.db.select().from(reservations).where(eq(reservations.confirmationNumber, num));
    return result[0];
  }

  async getReservations(pagination?: PaginationParams, filters?: {
    status?: string; dateFrom?: string; dateTo?: string;
    unitNumber?: string; search?: string; source?: string;
  }): Promise<PaginatedResponse<Reservation>> {
    const conditions: any[] = [];

    if (filters?.status) {
      conditions.push(eq(reservations.status, filters.status));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(reservations.checkInDate, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(reservations.checkInDate, filters.dateTo));
    }
    if (filters?.unitNumber) {
      conditions.push(eq(reservations.unitNumber, filters.unitNumber));
    }
    if (filters?.source) {
      conditions.push(eq(reservations.source, filters.source));
    }
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(reservations.guestName, searchTerm),
          ilike(reservations.confirmationNumber, searchTerm),
          ilike(reservations.guestPhone, searchTerm),
          ilike(reservations.guestEmail, searchTerm),
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    if (!pagination) {
      const data = whereClause
        ? await this.db.select().from(reservations).where(whereClause).orderBy(desc(reservations.checkInDate))
        : await this.db.select().from(reservations).orderBy(desc(reservations.checkInDate));
      return {
        data,
        pagination: { page: 1, limit: data.length, total: data.length, totalPages: 1, hasMore: false },
      };
    }

    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const totalQuery = whereClause
      ? this.db.select({ count: count() }).from(reservations).where(whereClause)
      : this.db.select({ count: count() }).from(reservations);

    const dataQuery = whereClause
      ? this.db.select().from(reservations).where(whereClause).orderBy(desc(reservations.checkInDate)).limit(limit).offset(offset)
      : this.db.select().from(reservations).orderBy(desc(reservations.checkInDate)).limit(limit).offset(offset);

    const [totalResult, data] = await Promise.all([totalQuery, dataQuery]);
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async getReservationsByUnit(unitNumber: string, start: Date, end: Date): Promise<Reservation[]> {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    return this.db.select().from(reservations).where(
      and(
        eq(reservations.unitNumber, unitNumber),
        lte(reservations.checkInDate, endStr),
        gte(reservations.checkOutDate, startStr),
        or(
          eq(reservations.status, "confirmed"),
          eq(reservations.status, "pending"),
          eq(reservations.status, "checked_in"),
        ),
      )
    );
  }

  async getUpcomingReservations(days: number = 7): Promise<Reservation[]> {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    return this.db.select().from(reservations).where(
      and(
        gte(reservations.checkInDate, today),
        lte(reservations.checkInDate, futureDateStr),
        or(
          eq(reservations.status, "confirmed"),
          eq(reservations.status, "pending"),
        ),
      )
    ).orderBy(reservations.checkInDate);
  }

  async getTodayArrivals(): Promise<Reservation[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.db.select().from(reservations).where(
      and(
        eq(reservations.checkInDate, today),
        or(
          eq(reservations.status, "confirmed"),
          eq(reservations.status, "pending"),
        ),
      )
    ).orderBy(reservations.guestName);
  }

  async updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation | undefined> {
    const updateData: any = { updatedAt: new Date() };
    const allowedFields = [
      'guestName', 'guestPhone', 'guestEmail', 'guestNationality',
      'numberOfGuests', 'unitNumber', 'checkInDate', 'checkOutDate',
      'numberOfNights', 'totalAmount', 'depositAmount', 'depositMethod',
      'depositPaid', 'refundStatus', 'status', 'source',
      'specialRequests', 'internalNotes', 'guestId',
      'cancelledAt', 'cancelledBy', 'cancelReason',
    ];
    for (const field of allowedFields) {
      if ((updates as any)[field] !== undefined) {
        updateData[field] = (updates as any)[field];
      }
    }

    const result = await this.db.update(reservations).set(updateData).where(eq(reservations.id, id)).returning();
    return result[0];
  }

  async deleteReservation(id: string): Promise<boolean> {
    const result = await this.db.delete(reservations).where(eq(reservations.id, id)).returning();
    return result.length > 0;
  }

  async expireNoShowReservations(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.db.update(reservations).set({
      status: "no_show",
      updatedAt: new Date(),
    }).where(
      and(
        eq(reservations.status, "confirmed"),
        sql`${reservations.checkInDate} < ${today}`,
      )
    ).returning();
    return result.length;
  }
}
