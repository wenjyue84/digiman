/**
 * Business Configuration Types & Defaults
 *
 * Centralizes business identity so the same codebase can serve
 * different businesses (Pelangi Capsule Hostel, Southern Homestay, etc.)
 */

export interface BusinessConfig {
  name: string;
  shortName: string;
  tagline: string;
  accommodationType: "capsule" | "room" | "house";
  address: string;
  phone: string;
  email: string;
  website: string;
  receiptPrefix: string;
  primaryColor?: string;
}

export const DEFAULT_BUSINESS_CONFIG: BusinessConfig = {
  name: "Pelangi Capsule Hostel",
  shortName: "Pelangi",
  tagline: "Your Cozy Home in JB",
  accommodationType: "capsule",
  address: "26A, Jalan Perang, Taman Pelangi, 80400 Johor Bahru, Johor, Malaysia",
  phone: "+60127088789",
  email: "info@pelangicapsulehostel.com",
  website: "www.pelangicapsulehostel.com",
  receiptPrefix: "PEL",
  primaryColor: "#E11D48", // Rose-600
};
