import type { Capsule, InsertCapsule } from "../../../shared/schema";
import { capsules, capsuleProblems } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import type { ICapsuleStorage } from "../IStorage";

/**
 * Database capsule queries implementing ICapsuleStorage via Drizzle ORM.
 *
 * Cross-entity methods (getGuestsByCapsule, getAvailableCapsules, etc.)
 * are coordinated by the DatabaseStorage facade.
 */
export class DbCapsuleQueries implements ICapsuleStorage {
  constructor(private readonly db: any) {}

  async getAllCapsules(): Promise<Capsule[]> {
    return await this.db.select().from(capsules);
  }

  async getCapsule(number: string): Promise<Capsule | undefined> {
    const result = await this.db.select().from(capsules).where(eq(capsules.number, number)).limit(1);
    return result[0];
  }

  async getCapsuleById(id: string): Promise<Capsule | undefined> {
    const result = await this.db.select().from(capsules).where(eq(capsules.id, id)).limit(1);
    return result[0];
  }

  async updateCapsule(number: string, updates: Partial<Capsule>): Promise<Capsule | undefined> {
    const result = await this.db.update(capsules).set(updates).where(eq(capsules.number, number)).returning();
    return result[0];
  }

  async markCapsuleCleaned(capsuleNumber: string, cleanedBy: string): Promise<Capsule | undefined> {
    const result = await this.db.update(capsules).set({
      cleaningStatus: "cleaned",
      lastCleanedAt: new Date(),
      lastCleanedBy: cleanedBy,
    }).where(eq(capsules.number, capsuleNumber)).returning();
    return result[0];
  }

  async markCapsuleNeedsCleaning(capsuleNumber: string): Promise<Capsule | undefined> {
    const result = await this.db.update(capsules).set({
      cleaningStatus: "to_be_cleaned",
      lastCleanedAt: null,
      lastCleanedBy: null,
    }).where(eq(capsules.number, capsuleNumber)).returning();
    return result[0];
  }

  async getCapsulesByCleaningStatus(status: "cleaned" | "to_be_cleaned"): Promise<Capsule[]> {
    return await this.db.select().from(capsules).where(eq(capsules.cleaningStatus, status));
  }

  async createCapsule(capsule: InsertCapsule): Promise<Capsule> {
    const result = await this.db.insert(capsules).values({
      ...capsule,
      purchaseDate: capsule.purchaseDate?.toISOString() || null
    }).returning();
    return result[0];
  }

  async deleteCapsule(number: string): Promise<boolean> {
    try {
      // Delete related problems first
      await this.db.delete(capsuleProblems).where(eq(capsuleProblems.capsuleNumber, number));

      const result = await this.db.delete(capsules).where(eq(capsules.number, number)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting capsule:", error);
      return false;
    }
  }

  // NOTE: getGuestsByCapsule is defined in IGuestStorage / DbGuestQueries.
  // The facade delegates ICapsuleStorage.getGuestsByCapsule to the guest queries.
  async getGuestsByCapsule(_capsuleNumber: string): Promise<any[]> {
    // This should not be called directly; the facade routes to DbGuestQueries
    throw new Error("getGuestsByCapsule must be called through the facade");
  }
}
