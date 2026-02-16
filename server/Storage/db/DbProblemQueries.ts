import type { CapsuleProblem, InsertCapsuleProblem, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import { capsuleProblems } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import type { IProblemStorage } from "../IStorage";
import { paginate } from "./paginate";

/** Database capsule problem queries implementing IProblemStorage via Drizzle ORM */
export class DbProblemQueries implements IProblemStorage {
  constructor(private readonly db: any) {}

  async createCapsuleProblem(problem: InsertCapsuleProblem): Promise<CapsuleProblem> {
    const result = await this.db.insert(capsuleProblems).values(problem).returning();
    return result[0];
  }

  async getCapsuleProblems(capsuleNumber: string): Promise<CapsuleProblem[]> {
    return await this.db.select().from(capsuleProblems).where(eq(capsuleProblems.capsuleNumber, capsuleNumber)).orderBy(capsuleProblems.reportedAt);
  }

  async getActiveProblems(pagination?: PaginationParams): Promise<PaginatedResponse<CapsuleProblem>> {
    const activeProblems = await this.db.select().from(capsuleProblems).where(eq(capsuleProblems.isResolved, false)).orderBy(capsuleProblems.reportedAt);
    return paginate(activeProblems, pagination);
  }

  async getAllProblems(pagination?: PaginationParams): Promise<PaginatedResponse<CapsuleProblem>> {
    const allProblems = await this.db.select().from(capsuleProblems).orderBy(capsuleProblems.reportedAt);
    return paginate(allProblems, pagination);
  }

  async updateProblem(problemId: string, updates: Partial<InsertCapsuleProblem>): Promise<CapsuleProblem | undefined> {
    const result = await this.db.update(capsuleProblems).set(updates).where(eq(capsuleProblems.id, problemId)).returning();
    return result[0];
  }

  async resolveProblem(problemId: string, resolvedBy: string, notes?: string): Promise<CapsuleProblem | undefined> {
    const result = await this.db.update(capsuleProblems).set({
      isResolved: true,
      resolvedBy,
      resolvedAt: new Date(),
      notes: notes || null,
    }).where(eq(capsuleProblems.id, problemId)).returning();
    return result[0];
  }

  async deleteProblem(problemId: string): Promise<boolean> {
    try {
      const result = await this.db.delete(capsuleProblems).where(eq(capsuleProblems.id, problemId)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting problem:", error);
      return false;
    }
  }
}
