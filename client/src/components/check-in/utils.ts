import type { Guest } from "@shared/schema";

// Date and time utilities
export function getCurrentDateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateString = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return { timeString, dateString };
}

export function getNextDayDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

// Guest name utilities
export function getNextGuestNumber(existingGuests: Guest[]): string {
  const guestNumbers = existingGuests
    .map((guest) => {
      const match = guest.name.match(/^Guest(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => num > 0);

  const maxNumber = guestNumbers.length > 0 ? Math.max(...guestNumbers) : 0;
  return `Guest${maxNumber + 1}`;
}

// User utilities
export function getDefaultCollector(user: any): string {
  if (!user) return "";
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.email === "admin@pelangi.com") {
    return "Admin";
  }
  return user.email || "";
}

// Unit assignment rules type (mirrors server/routes/settings.ts)
export interface UnitAssignmentRules {
  deckPriority: boolean;
  excludedUnits: string[];
  genderRules: {
    female: { preferred: string[]; fallbackToOther: boolean };
    male: { preferred: string[]; fallbackToOther: boolean };
  };
  maintenanceDeprioritize: boolean;
  deprioritizedUnits: string[];
}

// Rules-driven unit assignment logic
export function getRecommendedUnit(
  gender: string,
  availableUnits: any[],
  rules?: UnitAssignmentRules | null
): string {
  if (!availableUnits || availableUnits.length === 0) {
    return "";
  }

  const assignableUnits = availableUnits.filter(
    (unit) => unit.isAvailable && unit.toRent !== false
  );

  if (assignableUnits.length === 0) {
    return "";
  }

  // Apply rules-based assignment
  const excludedList = rules?.excludedUnits || [];
  const deckPriority = rules?.deckPriority !== false;
  const maintenanceDeprioritize = rules?.maintenanceDeprioritize !== false;
  const deprioritizedList = rules?.deprioritizedUnits || [];
  const genderPreferred =
    rules?.genderRules?.[gender as "male" | "female"]?.preferred || [];
  const fallbackToOther =
    rules?.genderRules?.[gender as "male" | "female"]?.fallbackToOther !== false;

  // Filter out excluded units
  let candidates = assignableUnits.filter((u) => !excludedList.includes(u.number));
  if (candidates.length === 0) candidates = assignableUnits;

  // Gender preference: try preferred units first
  if (genderPreferred.length > 0) {
    const preferred = candidates.filter((u) => genderPreferred.includes(u.number));
    if (preferred.length > 0) {
      candidates = preferred;
    } else if (!fallbackToOther) {
      return "";
    }
  }

  // Sort by priority: maintenance deprioritized -> section -> deck -> number
  const sorted = [...candidates].sort((a, b) => {
    const aNum = parseInt(a.number.replace(/[A-Z]/g, ""), 10);
    const bNum = parseInt(b.number.replace(/[A-Z]/g, ""), 10);

    // Deprioritize maintenance units
    if (maintenanceDeprioritize) {
      const aDepri = deprioritizedList.includes(a.number) ? 1 : 0;
      const bDepri = deprioritizedList.includes(b.number) ? 1 : 0;
      if (aDepri !== bDepri) return aDepri - bDepri;
    }

    // Section priority: back(1-6) > front(25-26) > middle
    const section = (n: number) =>
      n >= 1 && n <= 6 ? 1 : n >= 25 && n <= 26 ? 2 : 3;
    if (section(aNum) !== section(bNum)) return section(aNum) - section(bNum);

    // Deck priority: even numbers first (lower deck)
    if (deckPriority) {
      if (aNum % 2 === 0 && bNum % 2 !== 0) return -1;
      if (aNum % 2 !== 0 && bNum % 2 === 0) return 1;
    }

    return aNum - bNum;
  });

  return sorted[0]?.number || "";
}

/** @deprecated Use UnitAssignmentRules */
export type CapsuleAssignmentRules = UnitAssignmentRules;
/** @deprecated Use getRecommendedUnit */
export const getRecommendedCapsule = getRecommendedUnit;
