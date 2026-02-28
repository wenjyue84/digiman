import type { Guest, InsertGuest, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import { randomUUID } from "crypto";
import { paginate } from "./paginate";

/**
 * Guest entity store implementing IGuestStorage.
 *
 * Some IGuestStorage methods (getAvailableUnits, getUncleanedAvailableUnits,
 * getUnitOccupancy, checkoutGuest) depend on unit data. These are handled
 * by the facade (MemStorage) which coordinates between MemGuestStore and MemUnitStore.
 *
 * Methods here operate only on the guests map.
 */
export class MemGuestStore {
  private guests: Map<string, Guest>;

  constructor() {
    this.guests = new Map();
  }

  /** Expose the map for initialization from the facade */
  getMap(): Map<string, Guest> {
    return this.guests;
  }

  async createGuest(insertGuest: InsertGuest): Promise<Guest> {
    const id = randomUUID();

    // Use custom check-in date if provided, otherwise use current time
    let checkinTime: Date;
    if (insertGuest.checkInDate) {
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
      alertSettings: null,
    };
    this.guests.set(id, guest);
    return guest;
  }

  async getGuest(id: string): Promise<Guest | undefined> {
    return this.guests.get(id);
  }

  async deleteGuest(id: string): Promise<boolean> {
    return this.guests.delete(id);
  }

  async getAllGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>> {
    const allGuests = Array.from(this.guests.values());
    return paginate(allGuests, pagination);
  }

  async getCheckedInGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>> {
    const checkedInGuests = Array.from(this.guests.values()).filter(guest => guest.isCheckedIn);
    return paginate(checkedInGuests, pagination);
  }

  async getGuestHistory(
    pagination?: PaginationParams,
    sortBy: string = 'checkoutTime',
    sortOrder: 'asc' | 'desc' = 'desc',
    filters?: { search?: string; nationality?: string; unit?: string }
  ): Promise<PaginatedResponse<Guest>> {
    let guestHistory = Array.from(this.guests.values()).filter(guest => {
      if (guest.isCheckedIn) return false;

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          guest.name?.toLowerCase().includes(searchLower) ||
          guest.phoneNumber?.toLowerCase().includes(searchLower) ||
          guest.email?.toLowerCase().includes(searchLower) ||
          guest.idNumber?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filters?.nationality && guest.nationality !== filters.nationality) {
        return false;
      }

      if (filters?.unit && guest.unitNumber !== filters.unit) {
        return false;
      }

      return true;
    });

    guestHistory.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortBy === 'name') {
        aVal = a.name;
        bVal = b.name;
      } else if (sortBy === 'unitNumber') {
        const parseUnitNum = (num: string) => {
          const match = num?.match(/^([A-Za-z]+)-?(\d+)$/);
          if (match) {
            return { prefix: match[1].toUpperCase(), num: parseInt(match[2], 10) };
          }
          return { prefix: num || '', num: 0 };
        };
        const aParsed = parseUnitNum(a.unitNumber);
        const bParsed = parseUnitNum(b.unitNumber);

        if (aParsed.prefix !== bParsed.prefix) {
          aVal = aParsed.prefix;
          bVal = bParsed.prefix;
        } else {
          aVal = aParsed.num;
          bVal = bParsed.num;
        }
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

    return paginate(guestHistory, pagination);
  }

  /**
   * Mark guest as checked out. Returns updated guest or undefined.
   * NOTE: Unit status update after checkout is handled by the facade.
   */
  async checkoutGuest(id: string): Promise<Guest | undefined> {
    const guest = this.guests.get(id);
    if (guest && guest.isCheckedIn) {
      const updatedGuest: Guest = {
        ...guest,
        checkoutTime: new Date(),
        isCheckedIn: false,
      };
      this.guests.set(id, updatedGuest);
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
    const today = new Date().toISOString().split('T')[0];
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

    checkedOutGuests.sort((a, b) => {
      if (!a.checkoutTime || !b.checkoutTime) return 0;
      return b.checkoutTime.getTime() - a.checkoutTime.getTime();
    });

    return checkedOutGuests[0];
  }

  async getGuestByUnitAndName(unitNumber: string, name: string): Promise<Guest | undefined> {
    return Array.from(this.guests.values())
      .find(guest =>
        guest.unitNumber === unitNumber &&
        guest.name === name &&
        guest.isCheckedIn === true
      );
  }

  async getGuestByToken(token: string): Promise<Guest | undefined> {
    return Array.from(this.guests.values())
      .find(guest => guest.selfCheckinToken === token);
  }

  /** Used by facade for getGuestsByUnit */
  async getGuestsByUnit(unitNumber: string): Promise<Guest[]> {
    return Array.from(this.guests.values())
      .filter(guest => guest.unitNumber === unitNumber && guest.isCheckedIn);
  }

  /**
   * Get guests whose stay overlaps the given date range.
   * A guest overlaps if: checkinTime <= end AND (checkoutTime >= start OR checkoutTime is null)
   */
  async getGuestsByDateRange(start: Date, end: Date): Promise<Guest[]> {
    return Array.from(this.guests.values()).filter(guest => {
      const checkinTime = new Date(guest.checkinTime);
      if (checkinTime > end) return false;
      if (guest.checkoutTime === null) return true;
      return new Date(guest.checkoutTime) >= start;
    });
  }
}
