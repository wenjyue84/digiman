import type { Guest } from "@shared/schema";

export function getGuestBalance(guest: Guest): number {
  const match = guest.notes?.match(/RM(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function isGuestPaid(guest: Guest): boolean {
  return guest.isPaid || getGuestBalance(guest) <= 0;
}
