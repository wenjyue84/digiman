import type { Guest } from "@shared/schema";

export function getGuestBalance(guest: Guest): number {
  // First check if there's a specific balance pattern in notes (new format)
  const balanceMatch = guest.notes?.match(/Balance:\s*RM(\d+\.?\d*)/);
  if (balanceMatch) {
    return Number(balanceMatch[1]);
  }
  
  // Fallback to old format for existing guests
  const oldMatch = guest.notes?.match(/RM(\d+\.?\d*)/);
  if (oldMatch) {
    return Number(oldMatch[1]);
  }
  
  // If no balance found in notes, calculate from payment fields
  const totalAmount = guest.paymentAmount ? parseFloat(guest.paymentAmount) || 0 : 0;
  if (totalAmount > 0 && !guest.isPaid) {
    // Assume there's still an outstanding balance if payment amount exists but not marked as paid
    // This is a rough estimation for existing data
    return Math.max(0, totalAmount * 0.2); // Assume 20% might be outstanding for existing data
  }
  
  return 0;
}

export function isGuestPaid(guest: Guest): boolean {
  return guest.isPaid || getGuestBalance(guest) <= 0;
}
