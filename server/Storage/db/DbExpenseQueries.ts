import type { Expense, InsertExpense, UpdateExpense, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import { expenses } from "../../../shared/schema";
import { eq, count } from "drizzle-orm";
import type { IExpenseStorage } from "../IStorage";

/** Database expense queries implementing IExpenseStorage via Drizzle ORM */
export class DbExpenseQueries implements IExpenseStorage {
  constructor(private readonly db: any) {}

  async getExpenses(pagination?: PaginationParams): Promise<PaginatedResponse<Expense>> {
    if (!pagination) {
      const data = await this.db.select().from(expenses).orderBy(expenses.createdAt);
      return {
        data,
        pagination: {
          page: 1,
          limit: data.length,
          total: data.length,
          totalPages: 1,
          hasMore: false,
        },
      };
    }

    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    // Get total count and paginated data
    const [totalResult, data] = await Promise.all([
      this.db.select({ count: count() }).from(expenses),
      this.db.select().from(expenses)
        .orderBy(expenses.createdAt)
        .limit(limit)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      data,
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
    const result = await this.db.insert(expenses).values({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      subcategory: expense.subcategory || null,
      date: expense.date,
      notes: expense.notes || null,
      receiptPhotoUrl: expense.receiptPhotoUrl || null,
      itemPhotoUrl: expense.itemPhotoUrl || null,
      createdBy: expense.createdBy,
    }).returning();
    return result[0];
  }

  async updateExpense(expense: UpdateExpense): Promise<Expense | undefined> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only include fields that are actually being updated
    if (expense.description !== undefined) updateData.description = expense.description;
    if (expense.amount !== undefined) updateData.amount = expense.amount;
    if (expense.category !== undefined) updateData.category = expense.category;
    if (expense.subcategory !== undefined) updateData.subcategory = expense.subcategory;
    if (expense.date !== undefined) updateData.date = expense.date;
    if (expense.notes !== undefined) updateData.notes = expense.notes;
    if (expense.receiptPhotoUrl !== undefined) updateData.receiptPhotoUrl = expense.receiptPhotoUrl;
    if (expense.itemPhotoUrl !== undefined) updateData.itemPhotoUrl = expense.itemPhotoUrl;

    const result = await this.db.update(expenses).set(updateData).where(eq(expenses.id, expense.id)).returning();
    return result[0];
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await this.db.delete(expenses).where(eq(expenses.id, id)).returning();
    return result.length > 0;
  }
}
