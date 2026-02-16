import type { Expense, InsertExpense, UpdateExpense, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import type { IExpenseStorage } from "../IStorage";
import { randomUUID } from "crypto";

export class MemExpenseStore implements IExpenseStorage {
  private expenses: Map<string, Expense>;

  constructor() {
    this.expenses = new Map();
  }

  async getExpenses(pagination?: PaginationParams): Promise<PaginatedResponse<Expense>> {
    const allExpenses = Array.from(this.expenses.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (!pagination) {
      return {
        data: allExpenses,
        pagination: {
          page: 1,
          limit: allExpenses.length,
          total: allExpenses.length,
          totalPages: 1,
          hasMore: false,
        },
      };
    }

    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;
    const paginatedExpenses = allExpenses.slice(offset, offset + limit);
    const total = allExpenses.length;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      data: paginatedExpenses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    };
  }

  async addExpense(expense: InsertExpense & { createdBy: string }): Promise<Expense> {
    const id = randomUUID();
    const now = new Date();
    const newExpense: Expense = {
      id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      subcategory: expense.subcategory || null,
      date: expense.date,
      notes: expense.notes || null,
      receiptPhotoUrl: expense.receiptPhotoUrl || null,
      itemPhotoUrl: expense.itemPhotoUrl || null,
      createdBy: expense.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.expenses.set(id, newExpense);
    return newExpense;
  }

  async updateExpense(expense: UpdateExpense): Promise<Expense | undefined> {
    const existingExpense = this.expenses.get(expense.id!);
    if (!existingExpense) {
      return undefined;
    }

    const updatedExpense: Expense = {
      ...existingExpense,
      ...expense,
      id: existingExpense.id,
      createdBy: existingExpense.createdBy,
      createdAt: existingExpense.createdAt,
      updatedAt: new Date(),
    };
    this.expenses.set(expense.id!, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }
}
