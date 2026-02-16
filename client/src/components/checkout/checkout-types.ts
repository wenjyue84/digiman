/**
 * Shared types for checkout components.
 */
import type { Guest } from "@shared/schema";
import type { UseMutationResult } from "@tanstack/react-query";

export type ViewMode = 'card' | 'list' | 'table';

export interface CheckoutFilters {
  gender: 'any' | 'male' | 'female';
  nationality: 'any' | 'malaysian' | 'non-malaysian';
  specificNationality: string;
  capsuleNumber: string;
  lengthOfStayMin: string;
  lengthOfStayMax: string;
  outstandingOnly: boolean;
  checkoutTodayOnly: boolean;
  checkinDateFrom: string;
  checkinDateTo: string;
  expectedCheckoutDateFrom: string;
  expectedCheckoutDateTo: string;
}

export const DEFAULT_FILTERS: CheckoutFilters = {
  gender: 'any',
  nationality: 'any',
  specificNationality: 'any',
  capsuleNumber: 'any',
  lengthOfStayMin: '',
  lengthOfStayMax: '',
  outstandingOnly: false,
  checkoutTodayOnly: false,
  checkinDateFrom: '',
  checkinDateTo: '',
  expectedCheckoutDateFrom: '',
  expectedCheckoutDateTo: '',
};

export interface AccommodationLabels {
  type: string;
  singular: string;
  plural: string;
  lowerSingular: string;
  lowerPlural: string;
  numberLabel: string;
  maintenanceTitle: string;
  capsule?: string;
}

export interface CheckoutViewProps {
  guests: Guest[];
  today: string;
  isCondensedView: boolean;
  checkoutMutation: UseMutationResult<any, any, string, unknown>;
  onCheckout: (guestId: string) => void;
  labels: AccommodationLabels;
}
