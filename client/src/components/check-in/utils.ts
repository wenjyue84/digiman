import type { Guest, Capsule } from "@shared/schema";

// Date and time utilities
export function getCurrentDateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  const dateString = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  return { timeString, dateString };
}

export function getNextDayDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Guest name utilities
export function getNextGuestNumber(existingGuests: Guest[]): string {
  const guestNumbers = existingGuests
    .map(guest => {
      const match = guest.name.match(/^Guest(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);
  
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

// Capsule assignment rules type (mirrors server/routes/settings.ts)
export interface CapsuleAssignmentRules {
  deckPriority: boolean;
  excludedCapsules: string[];
  genderRules: {
    female: { preferred: string[]; fallbackToOther: boolean };
    male: { preferred: string[]; fallbackToOther: boolean };
  };
  maintenanceDeprioritize: boolean;
  deprioritizedCapsules: string[];
}

// Rules-driven capsule assignment logic
export function getRecommendedCapsule(gender: string, availableCapsules: any[], rules?: CapsuleAssignmentRules | null): string {
  if (!availableCapsules || availableCapsules.length === 0) {
    return "";
  }

  const assignableCapsules = availableCapsules.filter(capsule =>
    capsule.isAvailable && capsule.toRent !== false
  );

  if (assignableCapsules.length === 0) {
    return "";
  }

  // Apply rules-based assignment
  const excludedList = rules?.excludedCapsules || [];
  const deckPriority = rules?.deckPriority !== false;
  const maintenanceDeprioritize = rules?.maintenanceDeprioritize !== false;
  const deprioritizedList = rules?.deprioritizedCapsules || [];
  const genderPreferred = rules?.genderRules?.[gender as 'male' | 'female']?.preferred || [];
  const fallbackToOther = rules?.genderRules?.[gender as 'male' | 'female']?.fallbackToOther !== false;

  // Filter out excluded capsules
  let candidates = assignableCapsules.filter(c => !excludedList.includes(c.number));
  if (candidates.length === 0) candidates = assignableCapsules;

  // Gender preference: try preferred capsules first
  if (genderPreferred.length > 0) {
    const preferred = candidates.filter(c => genderPreferred.includes(c.number));
    if (preferred.length > 0) {
      candidates = preferred;
    } else if (!fallbackToOther) {
      return "";
    }
  }

  // Sort by priority: maintenance deprioritized → section → deck → number
  const sorted = [...candidates].sort((a, b) => {
    const aNum = parseInt(a.number.replace(/[A-Z]/g, ''));
    const bNum = parseInt(b.number.replace(/[A-Z]/g, ''));

    // Deprioritize maintenance capsules
    if (maintenanceDeprioritize) {
      const aDepri = deprioritizedList.includes(a.number) ? 1 : 0;
      const bDepri = deprioritizedList.includes(b.number) ? 1 : 0;
      if (aDepri !== bDepri) return aDepri - bDepri;
    }

    // Section priority: back(1-6) > front(25-26) > middle
    const section = (n: number) => n >= 1 && n <= 6 ? 1 : n >= 25 && n <= 26 ? 2 : 3;
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