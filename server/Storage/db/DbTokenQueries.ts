import type { GuestToken, InsertGuestToken, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import { guestTokens } from "../../../shared/schema";
import { eq, and, isNotNull, lte } from "drizzle-orm";
import type { ITokenStorage } from "../IStorage";
import { paginate } from "./paginate";

/** Database guest token queries implementing ITokenStorage via Drizzle ORM */
export class DbTokenQueries implements ITokenStorage {
  constructor(private readonly db: any) {}

  async createGuestToken(token: InsertGuestToken): Promise<GuestToken> {
    const result = await this.db.insert(guestTokens).values(token).returning();
    return result[0];
  }

  async getGuestToken(token: string): Promise<GuestToken | undefined> {
    const result = await this.db.select().from(guestTokens).where(eq(guestTokens.token, token)).limit(1);
    return result[0];
  }

  async getGuestTokenById(id: string): Promise<GuestToken | undefined> {
    const result = await this.db.select().from(guestTokens).where(eq(guestTokens.id, id)).limit(1);
    return result[0];
  }

  async getActiveGuestTokens(pagination?: PaginationParams): Promise<PaginatedResponse<GuestToken>> {
    const now = new Date();
    const activeTokens = await this.db.select().from(guestTokens).where(
      and(
        eq(guestTokens.isUsed, false),
        isNotNull(guestTokens.expiresAt)
      )
    ).orderBy(guestTokens.createdAt);

    // Filter out expired tokens (this could be done in SQL but keeping it simple)
    const nonExpiredTokens = activeTokens.filter((token: GuestToken) =>
      token.expiresAt && token.expiresAt > now
    );

    return paginate(nonExpiredTokens, pagination);
  }

  async markTokenAsUsed(token: string): Promise<GuestToken | undefined> {
    const result = await this.db.update(guestTokens).set({
      isUsed: true,
      usedAt: new Date(),
    }).where(eq(guestTokens.token, token)).returning();
    return result[0];
  }

  async updateGuestTokenUnit(tokenId: string, unitNumber: string | null, autoAssign: boolean): Promise<GuestToken | undefined> {
    const result = await this.db.update(guestTokens).set({
      unitNumber: unitNumber,
      autoAssign: autoAssign,
    }).where(eq(guestTokens.id, tokenId)).returning();
    return result[0];
  }

  async deleteGuestToken(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(guestTokens).where(eq(guestTokens.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting guest token:", error);
      return false;
    }
  }

  async cleanExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.db.delete(guestTokens).where(lte(guestTokens.expiresAt, now));
  }
}
