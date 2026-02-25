/**
 * Custom hook for checkout filter state and filtering logic.
 * Manages filter state, date shortcuts, and the filtered guest list.
 */
import { useState, useMemo } from "react";
import type { Guest } from "@shared/schema";
import { isGuestPaid } from "@/lib/guest";
import { NATIONALITIES } from "@/lib/nationalities";
import {
  getToday,
  getYesterday,
  getTomorrow,
  getLengthOfStayDays,
  isDateToday,
} from "./checkout-utils";
import { type CheckoutFilters, DEFAULT_FILTERS } from "./checkout-types";

export function useCheckoutFilters(guests: Guest[]) {
  const [filters, setFilters] = useState<CheckoutFilters>({ ...DEFAULT_FILTERS });

  const hasActiveFilters =
    filters.gender !== 'any' ||
    filters.nationality !== 'any' ||
    filters.specificNationality !== 'any' ||
    filters.unitNumber !== 'any' ||
    filters.lengthOfStayMin !== '' ||
    filters.lengthOfStayMax !== '' ||
    filters.outstandingOnly ||
    filters.checkoutTodayOnly ||
    filters.checkinDateFrom !== '' ||
    filters.checkinDateTo !== '' ||
    filters.expectedCheckoutDateFrom !== '' ||
    filters.expectedCheckoutDateTo !== '';

  // Unique unit numbers for the unit filter dropdown
  const uniqueUnits = useMemo(() => {
    return Array.from(new Set(guests.map(g => g.unitNumber))).sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
  }, [guests]);

  // Available nationalities from the system list
  const availableNationalities = useMemo(() => {
    return NATIONALITIES.map(n => n.value).sort();
  }, []);

  // Date shortcut helpers
  const setCheckinDateShortcut = (type: 'today' | 'yesterday' | 'tomorrow') => {
    let dateValue = '';
    switch (type) {
      case 'today':
        dateValue = getToday();
        break;
      case 'yesterday':
        dateValue = getYesterday();
        break;
      case 'tomorrow':
        dateValue = getTomorrow();
        break;
    }
    setFilters(prev => ({
      ...prev,
      checkinDateFrom: dateValue,
      checkinDateTo: dateValue,
    }));
  };

  const setExpectedCheckoutDateShortcut = (type: 'today' | 'yesterday' | 'tomorrow') => {
    let dateValue = '';
    switch (type) {
      case 'today':
        dateValue = getToday();
        break;
      case 'yesterday':
        dateValue = getYesterday();
        break;
      case 'tomorrow':
        dateValue = getTomorrow();
        break;
    }
    setFilters(prev => ({
      ...prev,
      expectedCheckoutDateFrom: dateValue,
      expectedCheckoutDateTo: dateValue,
    }));
  };

  const clearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
  };

  // Filtered guest list
  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      // Gender filtering
      if (filters.gender !== 'any' && g.gender !== filters.gender) return false;

      // General nationality filtering (Malaysian vs Non-Malaysian)
      if (filters.nationality === 'malaysian' && g.nationality !== 'Malaysian') return false;
      if (filters.nationality === 'non-malaysian' && g.nationality === 'Malaysian') return false;

      // Specific nationality filtering
      if (filters.specificNationality !== 'any' && g.nationality !== filters.specificNationality) return false;

      // unit number filtering
      if (filters.unitNumber !== 'any' && g.unitNumber !== filters.unitNumber) return false;

      // Length of stay filtering (in days)
      const lengthOfStay = getLengthOfStayDays(g.checkinTime.toString());
      if (filters.lengthOfStayMin && lengthOfStay < parseInt(filters.lengthOfStayMin)) return false;
      if (filters.lengthOfStayMax && lengthOfStay > parseInt(filters.lengthOfStayMax)) return false;

      // Payment and checkout status filtering
      if (filters.outstandingOnly && isGuestPaid(g)) return false;
      if (filters.checkoutTodayOnly && !isDateToday(g.expectedCheckoutDate || undefined)) return false;

      // Check-in date filtering
      if (filters.checkinDateFrom) {
        const checkinDate = new Date(g.checkinTime).toISOString().split('T')[0];
        if (checkinDate < filters.checkinDateFrom) return false;
      }
      if (filters.checkinDateTo) {
        const checkinDate = new Date(g.checkinTime).toISOString().split('T')[0];
        if (checkinDate > filters.checkinDateTo) return false;
      }

      // Expected checkout date filtering
      if (filters.expectedCheckoutDateFrom && g.expectedCheckoutDate) {
        if (g.expectedCheckoutDate < filters.expectedCheckoutDateFrom) return false;
      }
      if (filters.expectedCheckoutDateTo && g.expectedCheckoutDate) {
        if (g.expectedCheckoutDate > filters.expectedCheckoutDateTo) return false;
      }

      return true;
    });
  }, [guests, filters]);

  return {
    filters,
    setFilters,
    hasActiveFilters,
    filteredGuests,
    uniqueUnits,
    availableNationalities,
    setCheckinDateShortcut,
    setExpectedCheckoutDateShortcut,
    clearFilters,
  };
}
