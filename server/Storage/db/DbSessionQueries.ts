import type { Session } from "../../../shared/schema";
import { sessions } from "../../../shared/schema";
import { eq, lte } from "drizzle-orm";
import type { ISessionStorage } from "../IStorage";

/** Database session queries implementing ISessionStorage via Drizzle ORM */
export class DbSessionQueries implements ISessionStorage {
  constructor(private readonly db: any) {}

  async createSession(userId: string, token: string, expiresAt: Date): Promise<Session> {
    const result = await this.db.insert(sessions).values({
      userId,
      token,
      expiresAt,
    }).returning();
    return result[0];
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const result = await this.db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
    return result[0];
  }

  async deleteSession(token: string): Promise<boolean> {
    const result = await this.db.delete(sessions).where(eq(sessions.token, token)).returning();
    return result.length > 0;
  }

  async cleanExpiredSessions(): Promise<void> {
    await this.db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  }
}
