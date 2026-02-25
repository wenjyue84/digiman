import type { Guest } from "@shared/schema";

export type SortField =
  | "name"
  | "unitNumber"
  | "checkinTime"
  | "expectedCheckoutDate";
export type SortOrder = "asc" | "desc";

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export interface GuestFilters {
  gender: "any" | "male" | "female";
  nationality: "any" | "malaysian" | "non-malaysian";
  outstandingOnly: boolean;
  checkoutTodayOnly: boolean;
}

export interface PendingData {
  id: string;
  name: string;
  unitNumber: string;
  /** @deprecated Use unitNumber */
  capsuleNumber?: string;
  createdAt: string;
  expiresAt: string;
  phoneNumber: string | null;
}

export interface EmptyData {
  id: string;
  name: string;
  unitNumber: string;
  /** @deprecated Use unitNumber */
  capsuleNumber?: string;
  checkinTime: null;
  expectedCheckoutDate: null;
  phoneNumber: null;
  gender: null;
  nationality: null;
  isPaid: boolean;
  paymentAmount: null;
  paymentMethod: null;
  paymentCollector: null;
  notes: null;
  email: null;
  idNumber: null;
  emergencyContact: null;
  emergencyPhone: null;
  age: null;
  profilePhotoUrl: null;
  selfCheckinToken: null;
  status: null;
  checkoutTime: null;
  isCheckedIn: boolean;
  section: string;
  isAvailable: boolean;
  cleaningStatus: string;
  toRent: boolean;
  remark: string | null;
}

export type CombinedDataItem =
  | { type: "guest"; data: Guest }
  | { type: "pending"; data: PendingData }
  | { type: "empty"; data: EmptyData };

export interface AvailableUnit {
  id: string;
  number: string;
  section: string;
  isAvailable: boolean;
  cleaningStatus: string;
  toRent: boolean;
  position: string | null;
}

export interface AllUnit {
  id: string;
  number: string;
  section: string;
  isAvailable: boolean;
  cleaningStatus: string;
  toRent: boolean;
  lastCleanedAt: string | null;
  lastCleanedBy: string | null;
  color: string | null;
  purchaseDate: string | null;
  position: string | null;
  remark: string | null;
}

/** @deprecated Use AvailableUnit */
export type AvailableCapsule = AvailableUnit;
/** @deprecated Use AllUnit */
export type AllCapsule = AllUnit;
