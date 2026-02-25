import type { UnitProblem, InsertUnitProblem, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import type { IProblemStorage } from "../IStorage";
import { randomUUID } from "crypto";
import { paginate } from "./paginate";

export class MemProblemStore implements IProblemStorage {
  private unitProblems: Map<string, UnitProblem>;

  constructor() {
    this.unitProblems = new Map();
  }

  /** Expose the map so other stores (MemUnitStore) can reference it */
  getMap(): Map<string, UnitProblem> {
    return this.unitProblems;
  }

  async createUnitProblem(problem: InsertUnitProblem): Promise<UnitProblem> {
    const id = randomUUID();
    const unitProblem: UnitProblem = {
      id,
      unitNumber: problem.unitNumber,
      description: problem.description,
      reportedBy: problem.reportedBy,
      reportedAt: problem.reportedAt || new Date(),
      isResolved: false,
      resolvedBy: null,
      resolvedAt: null,
      notes: null,
    };
    this.unitProblems.set(id, unitProblem);
    return unitProblem;
  }

  async getUnitProblems(unitNumber: string): Promise<UnitProblem[]> {
    return Array.from(this.unitProblems.values())
      .filter(p => p.unitNumber === unitNumber)
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
  }

  async getActiveProblems(pagination?: PaginationParams): Promise<PaginatedResponse<UnitProblem>> {
    const activeProblems = Array.from(this.unitProblems.values())
      .filter(p => !p.isResolved)
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    return paginate(activeProblems, pagination);
  }

  async getAllProblems(pagination?: PaginationParams): Promise<PaginatedResponse<UnitProblem>> {
    const allProblems = Array.from(this.unitProblems.values())
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    return paginate(allProblems, pagination);
  }

  async updateProblem(problemId: string, updates: Partial<InsertUnitProblem>): Promise<UnitProblem | undefined> {
    const problem = this.unitProblems.get(problemId);
    if (problem) {
      const updatedProblem = {
        ...problem,
        ...updates,
        id: problem.id,
        reportedAt: problem.reportedAt,
        isResolved: problem.isResolved,
        resolvedBy: problem.resolvedBy,
        resolvedAt: problem.resolvedAt,
        notes: problem.notes
      };

      this.unitProblems.set(problemId, updatedProblem);
      return updatedProblem;
    }
    return undefined;
  }

  async resolveProblem(problemId: string, resolvedBy: string, notes?: string): Promise<UnitProblem | undefined> {
    const problem = this.unitProblems.get(problemId);
    if (problem) {
      problem.isResolved = true;
      problem.resolvedBy = resolvedBy;
      problem.resolvedAt = new Date();
      problem.notes = notes || null;
      this.unitProblems.set(problemId, problem);
      return problem;
    }
    return undefined;
  }

  async deleteProblem(problemId: string): Promise<boolean> {
    const problem = this.unitProblems.get(problemId);
    if (problem) {
      this.unitProblems.delete(problemId);
      return true;
    }
    return false;
  }
}
