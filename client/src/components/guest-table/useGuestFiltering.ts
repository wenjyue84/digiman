import { useState, useMemo } from "react";
import type { Guest } from "@shared/schema";
import { isGuestPaid } from "@/lib/guest";
import type { GuestFilters, CombinedDataItem, AllUnit } from "./types";

export function isDateToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    // dateStr in DB is often YYYY-MM-DD; fallback to local date string compare
    return dateStr.slice(0, 10) === todayStr;
  } catch {
    return false;
  }
}

interface UseGuestFilteringArgs {
  guests: Guest[];
  activeTokens: Array<{
    id: string;
    token: string;
    unitNumber: string;
    guestName: string | null;
    phoneNumber: string | null;
    createdAt: string;
    expiresAt: string;
  }>;
  showAllUnits: boolean;
  allUnits: AllUnit[];
}

export function useGuestFiltering({
  guests,
  activeTokens,
  showAllUnits,
  allUnits,
}: UseGuestFilteringArgs) {
  const [filters, setFilters] = useState<GuestFilters>({
    gender: 'any',
    nationality: 'any',
    outstandingOnly: false,
    checkoutTodayOnly: false,
  });

  const hasActiveGuestFilters = filters.gender !== 'any' || filters.nationality !== 'any' || filters.outstandingOnly || filters.checkoutTodayOnly;

  // Create a combined and filtered list of guests, pending check-ins, and empty units
  const filteredData = useMemo(() => {
    // 1. Build combined data (guests + pending + empty units)
    const guestData = guests.map(guest => ({ type: 'guest' as const, data: guest }));
    const pendingData = activeTokens.map(token => ({
      type: 'pending' as const,
      data: {
        id: token.id,
        name: token.guestName || 'Pending Check-in',
        unitNumber: token.unitNumber,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        phoneNumber: token.phoneNumber,
      }
    }));

    let data: CombinedDataItem[] = [...guestData, ...pendingData];

    // Add empty units when showAllUnits is enabled
    if (showAllUnits && allUnits.length > 0) {
      const occupiedUnits = new Set([
        ...guests.map(g => g.unitNumber),
        ...activeTokens.map(t => t.unitNumber)
      ]);

      const emptyUnits = allUnits
        .filter(unit => !occupiedUnits.has(unit.number) && unit.toRent !== false)
        .map(unit => ({
          type: 'empty' as const,
          data: {
            id: `empty-${unit.id}`,
            name: 'Empty',
            unitNumber: unit.number,
            checkinTime: null as null,
            expectedCheckoutDate: null as null,
            phoneNumber: null as null,
            gender: null as null,
            nationality: null as null,
            isPaid: true,
            paymentAmount: null as null,
            paymentMethod: null as null,
            paymentCollector: null as null,
            notes: null as null,
            email: null as null,
            idNumber: null as null,
            emergencyContact: null as null,
            emergencyPhone: null as null,
            age: null as null,
            profilePhotoUrl: null as null,
            selfCheckinToken: null as null,
            status: null as null,
            checkoutTime: null as null,
            isCheckedIn: false,
            section: unit.section,
            isAvailable: unit.isAvailable,
            cleaningStatus: unit.cleaningStatus,
            toRent: unit.toRent,
            remark: unit.remark,
          }
        }));

      data = [...data, ...emptyUnits];
    }

    // 2. Apply filters
    if (!data.length) return [];
    return data.filter(item => {
      if (item.type !== 'guest') {
        // Hide pending/empty rows when any guest-specific filter is active
        return !hasActiveGuestFilters;
      }
      const g = item.data as Guest;
      if (filters.gender !== 'any' && g.gender !== filters.gender) return false;
      if (filters.nationality === 'malaysian' && g.nationality !== 'Malaysian') return false;
      if (filters.nationality === 'non-malaysian' && g.nationality === 'Malaysian') return false;
      if (filters.outstandingOnly && isGuestPaid(g)) return false;
      if (filters.checkoutTodayOnly) {
        if (!g.expectedCheckoutDate) return false;
        if (!isDateToday(g.expectedCheckoutDate)) return false;
      }
      return true;
    });
  }, [guests, activeTokens, showAllUnits, allUnits, filters, hasActiveGuestFilters]);

  const clearFilters = () => {
    setFilters({ gender: 'any', nationality: 'any', outstandingOnly: false, checkoutTodayOnly: false });
  };

  return { filters, setFilters, hasActiveGuestFilters, filteredData, clearFilters };
}
