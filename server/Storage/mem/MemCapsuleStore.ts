import type { Capsule, InsertCapsule, CapsuleProblem } from "../../../shared/schema";
import type { ICapsuleStorage } from "../IStorage";
import { randomUUID } from "crypto";

/**
 * Capsule entity store.
 *
 * Cross-entity methods (getGuestsByCapsule, getAvailableCapsules, etc.)
 * are coordinated by the facade. This store owns the capsules map and
 * receives a reference to the capsuleProblems map for updateCapsule
 * auto-resolve logic.
 */
export class MemCapsuleStore {
  private capsules: Map<string, Capsule>;
  private capsuleProblems: Map<string, CapsuleProblem>;

  constructor(capsuleProblems: Map<string, CapsuleProblem>) {
    this.capsules = new Map();
    this.capsuleProblems = capsuleProblems;
  }

  /** Expose the map for initialization from the facade */
  getMap(): Map<string, Capsule> {
    return this.capsules;
  }

  async getAllCapsules(): Promise<Capsule[]> {
    return Array.from(this.capsules.values());
  }

  async getCapsule(number: string): Promise<Capsule | undefined> {
    return this.capsules.get(number);
  }

  async getCapsuleById(id: string): Promise<Capsule | undefined> {
    for (const capsule of Array.from(this.capsules.values())) {
      if (capsule.id === id) {
        return capsule;
      }
    }
    return undefined;
  }

  async updateCapsule(number: string, updates: Partial<Capsule>): Promise<Capsule | undefined> {
    const capsule = this.capsules.get(number);
    if (capsule) {
      const updatedCapsule = { ...capsule, ...updates };
      this.capsules.set(number, updatedCapsule);

      // Check if we're marking capsule as available again (problem resolved)
      if (updates.isAvailable === true && !capsule.isAvailable) {
        // Auto-resolve any active problems for this capsule
        const problems = Array.from(this.capsuleProblems.values()).filter(
          p => p.capsuleNumber === number && !p.isResolved
        );
        for (const problem of problems) {
          problem.isResolved = true;
          problem.resolvedAt = new Date();
          problem.resolvedBy = "System";
          problem.notes = "Auto-resolved when capsule marked as available";
        }
      }

      return updatedCapsule;
    }
    return undefined;
  }

  async createCapsule(insertCapsule: InsertCapsule): Promise<Capsule> {
    const id = randomUUID();
    const capsule: Capsule = {
      ...insertCapsule,
      id,
      lastCleanedAt: insertCapsule.lastCleanedAt || null,
      lastCleanedBy: insertCapsule.lastCleanedBy || null,
      color: insertCapsule.color || null,
      purchaseDate: insertCapsule.purchaseDate?.toISOString() || null,
      position: insertCapsule.position || null,
      remark: insertCapsule.remark || null,
      branch: null,
    };
    this.capsules.set(capsule.number, capsule);
    return capsule;
  }

  async deleteCapsule(number: string): Promise<boolean> {
    const exists = this.capsules.has(number);
    if (exists) {
      this.capsules.delete(number);

      // Also remove any associated problems
      const problemsToDelete = Array.from(this.capsuleProblems.entries())
        .filter(([_, problem]) => problem.capsuleNumber === number)
        .map(([id, _]) => id);

      for (const problemId of problemsToDelete) {
        this.capsuleProblems.delete(problemId);
      }

      return true;
    }
    return false;
  }

  async markCapsuleCleaned(capsuleNumber: string, cleanedBy: string): Promise<Capsule | undefined> {
    const capsule = this.capsules.get(capsuleNumber);

    if (capsule) {
      const updatedCapsule: Capsule = {
        ...capsule,
        cleaningStatus: 'cleaned',
        lastCleanedAt: new Date(),
        lastCleanedBy: cleanedBy,
      };
      this.capsules.set(capsuleNumber, updatedCapsule);
      return updatedCapsule;
    }
    return undefined;
  }

  async markCapsuleNeedsCleaning(capsuleNumber: string): Promise<Capsule | undefined> {
    const capsule = this.capsules.get(capsuleNumber);

    if (capsule) {
      const updatedCapsule: Capsule = {
        ...capsule,
        cleaningStatus: 'to_be_cleaned',
        lastCleanedAt: null,
        lastCleanedBy: null,
      };
      this.capsules.set(capsuleNumber, updatedCapsule);
      return updatedCapsule;
    }
    return undefined;
  }

  async getCapsulesByCleaningStatus(status: "cleaned" | "to_be_cleaned"): Promise<Capsule[]> {
    return Array.from(this.capsules.values()).filter(
      capsule => capsule.cleaningStatus === status
    );
  }
}
