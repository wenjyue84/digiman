import type { Unit, InsertUnit } from "../../../shared/schema";
import { units, unitProblems } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import type { IUnitStorage } from "../IStorage";

/**
 * Database unit queries implementing IUnitStorage via Drizzle ORM.
 *
 * Cross-entity methods (getGuestsByUnit, getAvailableUnits, etc.)
 * are coordinated by the DatabaseStorage facade.
 */
export class DbUnitQueries implements IUnitStorage {
  constructor(private readonly db: any) {}

  async getAllUnits(): Promise<Unit[]> {
    return await this.db.select().from(units);
  }

  async getUnit(number: string): Promise<Unit | undefined> {
    const result = await this.db.select().from(units).where(eq(units.number, number)).limit(1);
    return result[0];
  }

  async getUnitById(id: string): Promise<Unit | undefined> {
    const result = await this.db.select().from(units).where(eq(units.id, id)).limit(1);
    return result[0];
  }

  async updateUnit(number: string, updates: Partial<Unit>): Promise<Unit | undefined> {
    const result = await this.db.update(units).set(updates).where(eq(units.number, number)).returning();
    return result[0];
  }

  async markUnitCleaned(unitNumber: string, cleanedBy: string): Promise<Unit | undefined> {
    const result = await this.db.update(units).set({
      cleaningStatus: "cleaned",
      lastCleanedAt: new Date(),
      lastCleanedBy: cleanedBy,
    }).where(eq(units.number, unitNumber)).returning();
    return result[0];
  }

  async markUnitNeedsCleaning(unitNumber: string): Promise<Unit | undefined> {
    const result = await this.db.update(units).set({
      cleaningStatus: "to_be_cleaned",
      lastCleanedAt: null,
      lastCleanedBy: null,
    }).where(eq(units.number, unitNumber)).returning();
    return result[0];
  }

  async getUnitsByCleaningStatus(status: "cleaned" | "to_be_cleaned"): Promise<Unit[]> {
    return await this.db.select().from(units).where(eq(units.cleaningStatus, status));
  }

  async createUnit(unit: InsertUnit): Promise<Unit> {
    const result = await this.db.insert(units).values({
      ...unit,
      purchaseDate: unit.purchaseDate?.toISOString() || null
    }).returning();
    return result[0];
  }

  async deleteUnit(number: string): Promise<boolean> {
    try {
      // Delete related problems first
      await this.db.delete(unitProblems).where(eq(unitProblems.unitNumber, number));

      const result = await this.db.delete(units).where(eq(units.number, number)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting unit:", error);
      return false;
    }
  }

  // NOTE: getGuestsByUnit is defined in IGuestStorage / DbGuestQueries.
  // The facade delegates IUnitStorage.getGuestsByUnit to the guest queries.
  async getGuestsByUnit(_unitNumber: string): Promise<any[]> {
    // This should not be called directly; the facade routes to DbGuestQueries
    throw new Error("getGuestsByUnit must be called through the facade");
  }
}
