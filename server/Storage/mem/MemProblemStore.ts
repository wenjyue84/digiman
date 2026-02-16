import type { CapsuleProblem, InsertCapsuleProblem, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import type { IProblemStorage } from "../IStorage";
import { randomUUID } from "crypto";
import { paginate } from "./paginate";

export class MemProblemStore implements IProblemStorage {
  private capsuleProblems: Map<string, CapsuleProblem>;

  constructor() {
    this.capsuleProblems = new Map();
  }

  /** Expose the map so other stores (MemCapsuleStore) can reference it */
  getMap(): Map<string, CapsuleProblem> {
    return this.capsuleProblems;
  }

  async createCapsuleProblem(problem: InsertCapsuleProblem): Promise<CapsuleProblem> {
    const id = randomUUID();
    const capsuleProblem: CapsuleProblem = {
      id,
      capsuleNumber: problem.capsuleNumber,
      description: problem.description,
      reportedBy: problem.reportedBy,
      reportedAt: problem.reportedAt || new Date(),
      isResolved: false,
      resolvedBy: null,
      resolvedAt: null,
      notes: null,
    };
    this.capsuleProblems.set(id, capsuleProblem);
    return capsuleProblem;
  }

  async getCapsuleProblems(capsuleNumber: string): Promise<CapsuleProblem[]> {
    return Array.from(this.capsuleProblems.values())
      .filter(p => p.capsuleNumber === capsuleNumber)
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
  }

  async getActiveProblems(pagination?: PaginationParams): Promise<PaginatedResponse<CapsuleProblem>> {
    const activeProblems = Array.from(this.capsuleProblems.values())
      .filter(p => !p.isResolved)
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    return paginate(activeProblems, pagination);
  }

  async getAllProblems(pagination?: PaginationParams): Promise<PaginatedResponse<CapsuleProblem>> {
    const allProblems = Array.from(this.capsuleProblems.values())
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    return paginate(allProblems, pagination);
  }

  async updateProblem(problemId: string, updates: Partial<InsertCapsuleProblem>): Promise<CapsuleProblem | undefined> {
    const problem = this.capsuleProblems.get(problemId);
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

      this.capsuleProblems.set(problemId, updatedProblem);
      return updatedProblem;
    }
    return undefined;
  }

  async resolveProblem(problemId: string, resolvedBy: string, notes?: string): Promise<CapsuleProblem | undefined> {
    const problem = this.capsuleProblems.get(problemId);
    if (problem) {
      problem.isResolved = true;
      problem.resolvedBy = resolvedBy;
      problem.resolvedAt = new Date();
      problem.notes = notes || null;
      this.capsuleProblems.set(problemId, problem);
      return problem;
    }
    return undefined;
  }

  async deleteProblem(problemId: string): Promise<boolean> {
    const problem = this.capsuleProblems.get(problemId);
    if (problem) {
      this.capsuleProblems.delete(problemId);
      return true;
    }
    return false;
  }
}
