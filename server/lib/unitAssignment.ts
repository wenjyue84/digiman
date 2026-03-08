import type { Unit } from "@shared/schema";

/**
 * Options that control how candidate units are ranked during auto-assignment.
 *
 * All fields are optional — sensible defaults are applied when omitted:
 *   deckPriority          → true  (prefer even/bottom-bunk numbers)
 *   maintenanceDeprioritize → false (do not push maintenance units to the end)
 *   deprioritizedUnits    → []
 */
export interface UnitSortOptions {
  /** When true, even-numbered (bottom-bunk) units are preferred. Default: true */
  deckPriority?: boolean;
  /** When true, units listed in `deprioritizedUnits` are pushed to the end. Default: false */
  maintenanceDeprioritize?: boolean;
  /** Unit numbers to deprioritize (only used when maintenanceDeprioritize is true). */
  deprioritizedUnits?: string[];
}

/**
 * Returns the section priority for a capsule number.
 * Back (1-6) = 1 (highest), middle (25-26) = 2, front/other = 3 (lowest).
 */
function sectionPriority(num: number): number {
  if (num >= 1 && num <= 6) return 1;   // back
  if (num >= 25 && num <= 26) return 2;  // middle
  return 3;                              // front
}

/**
 * Comparator for sorting units by assignment priority.
 *
 * Sort order:
 *   1. Non-maintenance units first (when `maintenanceDeprioritize` is true)
 *   2. Section priority: back (1-6) → middle (25-26) → front (11-24)
 *   3. Deck priority: even numbers (bottom bunk) first (when `deckPriority` is true)
 *   4. Ascending unit number
 *
 * Compatible with `Array.prototype.sort()`.
 */
export function unitSortComparator(
  opts: UnitSortOptions = {},
): (a: Unit, b: Unit) => number {
  const deckPriority = opts.deckPriority !== false;                   // default true
  const maintenanceDeprioritize = opts.maintenanceDeprioritize ?? false;
  const deprioritizedUnits = opts.deprioritizedUnits ?? [];

  return (a: Unit, b: Unit): number => {
    const aNum = parseInt(a.number.replace(/[A-Z]/g, ''));
    const bNum = parseInt(b.number.replace(/[A-Z]/g, ''));

    // 1. Deprioritize maintenance units
    if (maintenanceDeprioritize) {
      const aDepri = deprioritizedUnits.includes(a.number) ? 1 : 0;
      const bDepri = deprioritizedUnits.includes(b.number) ? 1 : 0;
      if (aDepri !== bDepri) return aDepri - bDepri;
    }

    // 2. Section priority: back > middle > front
    const aSec = sectionPriority(aNum);
    const bSec = sectionPriority(bNum);
    if (aSec !== bSec) return aSec - bSec;

    // 3. Deck priority: even (bottom bunk) first
    if (deckPriority) {
      if (aNum % 2 === 0 && bNum % 2 !== 0) return -1;
      if (aNum % 2 !== 0 && bNum % 2 === 0) return 1;
    }

    // 4. Ascending unit number
    return aNum - bNum;
  };
}
