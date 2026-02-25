import type { UnitProblem, InsertUnitProblem, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import { unitProblems } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import type { IProblemStorage } from "../IStorage";
import { paginate } from "./paginate";

/** Database unit problem queries implementing IProblemStorage via Drizzle ORM */
export class DbProblemQueries implements IProblemStorage {
  constructor(private readonly db: any) {}

  async createUnitProblem(problem: InsertUnitProblem): Promise<UnitProblem> {
    const result = await this.db.insert(unitProblems).values(problem).returning();
    return result[0];
  }

  async getUnitProblems(unitNumber: string): Promise<UnitProblem[]> {
    return await this.db.select().from(unitProblems).where(eq(unitProblems.unitNumber, unitNumber)).orderBy(unitProblems.reportedAt);
  }

  async getActiveProblems(pagination?: PaginationParams): Promise<PaginatedResponse<UnitProblem>> {
    const activeProblems = await this.db.select().from(unitProblems).where(eq(unitProblems.isResolved, false)).orderBy(unitProblems.reportedAt);
    return paginate(activeProblems, pagination);
  }

  async getAllProblems(pagination?: PaginationParams): Promise<PaginatedResponse<UnitProblem>> {
    const allProblems = await this.db.select().from(unitProblems).orderBy(unitProblems.reportedAt);
    return paginate(allProblems, pagination);
  }

  async updateProblem(problemId: string, updates: Partial<InsertUnitProblem>): Promise<UnitProblem | undefined> {
    const result = await this.db.update(unitProblems).set(updates).where(eq(unitProblems.id, problemId)).returning();
    return result[0];
  }

  async resolveProblem(problemId: string, resolvedBy: string, notes?: string): Promise<UnitProblem | undefined> {
    const result = await this.db.update(unitProblems).set({
      isResolved: true,
      resolvedBy,
      resolvedAt: new Date(),
      notes: notes || null,
    }).where(eq(unitProblems.id, problemId)).returning();
    return result[0];
  }

  async deleteProblem(problemId: string): Promise<boolean> {
    try {
      const result = await this.db.delete(unitProblems).where(eq(unitProblems.id, problemId)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting problem:", error);
      return false;
    }
  }
}
