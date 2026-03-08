import type { Reservation, InsertReservation, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import type { IReservationStorage } from "../IStorage";
import { randomUUID } from "crypto";

export class MemReservationStore implements IReservationStorage {
  private reservations: Map<string, Reservation>;

  constructor() {
    this.reservations = new Map();
  }

  async createReservation(data: InsertReservation & { createdBy: string; confirmationNumber: string }): Promise<Reservation> {
    const id = randomUUID();
    const now = new Date();
    const reservation: Reservation = {
      id,
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
      guestId: null,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
    };
    this.reservations.set(id, reservation);
    return reservation;
  }

  async getReservation(id: string): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }

  async getReservationByConfirmation(num: string): Promise<Reservation | undefined> {
    return Array.from(this.reservations.values()).find(r => r.confirmationNumber === num);
  }

  async getReservations(pagination?: PaginationParams, filters?: {
    status?: string; dateFrom?: string; dateTo?: string;
    unitNumber?: string; search?: string; source?: string;
  }): Promise<PaginatedResponse<Reservation>> {
    let all = Array.from(this.reservations.values());

    if (filters?.status) {
      all = all.filter(r => r.status === filters.status);
    }
    if (filters?.dateFrom) {
      all = all.filter(r => r.checkInDate >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      all = all.filter(r => r.checkInDate <= filters.dateTo!);
    }
    if (filters?.unitNumber) {
      all = all.filter(r => r.unitNumber === filters.unitNumber);
    }
    if (filters?.source) {
      all = all.filter(r => r.source === filters.source);
    }
    if (filters?.search) {
      const term = filters.search.toLowerCase();
      all = all.filter(r =>
        r.guestName.toLowerCase().includes(term) ||
        r.confirmationNumber.toLowerCase().includes(term) ||
        (r.guestPhone?.toLowerCase().includes(term)) ||
        (r.guestEmail?.toLowerCase().includes(term))
      );
    }

    all.sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));

    if (!pagination) {
      return {
        data: all,
        pagination: { page: 1, limit: all.length, total: all.length, totalPages: 1, hasMore: false },
      };
    }

    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    const data = all.slice(offset, offset + limit);
    const total = all.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async getReservationsByUnit(unitNumber: string, start: Date, end: Date): Promise<Reservation[]> {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return Array.from(this.reservations.values()).filter(r =>
      r.unitNumber === unitNumber &&
      r.checkInDate <= endStr &&
      r.checkOutDate >= startStr &&
      ["confirmed", "pending", "checked_in"].includes(r.status)
    );
  }

  async getUpcomingReservations(days: number = 7): Promise<Reservation[]> {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    return Array.from(this.reservations.values())
      .filter(r =>
        r.checkInDate >= today &&
        r.checkInDate <= futureDateStr &&
        ["confirmed", "pending"].includes(r.status)
      )
      .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
  }

  async getTodayArrivals(): Promise<Reservation[]> {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(this.reservations.values())
      .filter(r =>
        r.checkInDate === today &&
        ["confirmed", "pending"].includes(r.status)
      )
      .sort((a, b) => a.guestName.localeCompare(b.guestName));
  }

  async updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation | undefined> {
    const existing = this.reservations.get(id);
    if (!existing) return undefined;

    const updated: Reservation = {
      ...existing,
      ...updates,
      id: existing.id,
      confirmationNumber: existing.confirmationNumber,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
      updatedAt: new Date(),
    };
    this.reservations.set(id, updated);
    return updated;
  }

  async deleteReservation(id: string): Promise<boolean> {
    return this.reservations.delete(id);
  }

  async expireNoShowReservations(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    let count = 0;
    const entries = Array.from(this.reservations.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, r] = entries[i];
      if (r.status === "confirmed" && r.checkInDate < today) {
        this.reservations.set(id, { ...r, status: "no_show", updatedAt: new Date() });
        count++;
      }
    }
    return count;
  }
}
