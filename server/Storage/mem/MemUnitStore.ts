import type { Unit, InsertUnit, UnitProblem } from "../../../shared/schema";
import type { IUnitStorage } from "../IStorage";
import { randomUUID } from "crypto";

/**
 * Unit entity store.
 *
 * Cross-entity methods (getGuestsByUnit, getAvailableUnits, etc.)
 * are coordinated by the facade. This store owns the units map and
 * receives a reference to the unitProblems map for updateUnit
 * auto-resolve logic.
 */
export class MemUnitStore {
  private units: Map<string, Unit>;
  private unitProblems: Map<string, UnitProblem>;

  constructor(unitProblems: Map<string, UnitProblem>) {
    this.units = new Map();
    this.unitProblems = unitProblems;
  }

  /** Expose the map for initialization from the facade */
  getMap(): Map<string, Unit> {
    return this.units;
  }

  async getAllUnits(): Promise<Unit[]> {
    return Array.from(this.units.values());
  }

  async getUnit(number: string): Promise<Unit | undefined> {
    return this.units.get(number);
  }

  async getUnitById(id: string): Promise<Unit | undefined> {
    for (const unit of Array.from(this.units.values())) {
      if (unit.id === id) {
        return unit;
      }
    }
    return undefined;
  }

  async updateUnit(number: string, updates: Partial<Unit>): Promise<Unit | undefined> {
    const unit = this.units.get(number);
    if (unit) {
      const updatedUnit = { ...unit, ...updates };
      this.units.set(number, updatedUnit);

      // Check if we're marking unit as available again (problem resolved)
      if (updates.isAvailable === true && !unit.isAvailable) {
        // Auto-resolve any active problems for this unit
        const problems = Array.from(this.unitProblems.values()).filter(
          p => p.unitNumber === number && !p.isResolved
        );
        for (const problem of problems) {
          problem.isResolved = true;
          problem.resolvedAt = new Date();
          problem.resolvedBy = "System";
          problem.notes = "Auto-resolved when unit marked as available";
        }
      }

      return updatedUnit;
    }
    return undefined;
  }

  async createUnit(insertUnit: InsertUnit): Promise<Unit> {
    const id = randomUUID();
    const unit: Unit = {
      ...insertUnit,
      id,
      lastCleanedAt: insertUnit.lastCleanedAt || null,
      lastCleanedBy: insertUnit.lastCleanedBy || null,
      color: insertUnit.color || null,
      purchaseDate: insertUnit.purchaseDate?.toISOString() || null,
      position: insertUnit.position || null,
      remark: insertUnit.remark || null,
      branch: null,
      unitType: insertUnit.unitType || null,
      maxOccupancy: insertUnit.maxOccupancy || null,
      pricePerNight: insertUnit.pricePerNight || null,
    };
    this.units.set(unit.number, unit);
    return unit;
  }

  async deleteUnit(number: string): Promise<boolean> {
    const exists = this.units.has(number);
    if (exists) {
      this.units.delete(number);

      // Also remove any associated problems
      const problemsToDelete = Array.from(this.unitProblems.entries())
        .filter(([_, problem]) => problem.unitNumber === number)
        .map(([id, _]) => id);

      for (const problemId of problemsToDelete) {
        this.unitProblems.delete(problemId);
      }

      return true;
    }
    return false;
  }

  async markUnitCleaned(unitNumber: string, cleanedBy: string): Promise<Unit | undefined> {
    const unit = this.units.get(unitNumber);

    if (unit) {
      const updatedUnit: Unit = {
        ...unit,
        cleaningStatus: 'cleaned',
        lastCleanedAt: new Date(),
        lastCleanedBy: cleanedBy,
      };
      this.units.set(unitNumber, updatedUnit);
      return updatedUnit;
    }
    return undefined;
  }

  async markUnitNeedsCleaning(unitNumber: string): Promise<Unit | undefined> {
    const unit = this.units.get(unitNumber);

    if (unit) {
      const updatedUnit: Unit = {
        ...unit,
        cleaningStatus: 'to_be_cleaned',
        lastCleanedAt: null,
        lastCleanedBy: null,
      };
      this.units.set(unitNumber, updatedUnit);
      return updatedUnit;
    }
    return undefined;
  }

  async getUnitsByCleaningStatus(status: "cleaned" | "to_be_cleaned"): Promise<Unit[]> {
    return Array.from(this.units.values()).filter(
      unit => unit.cleaningStatus === status
    );
  }
}
