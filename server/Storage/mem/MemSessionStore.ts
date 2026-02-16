import type { Session } from "../../../shared/schema";
import type { ISessionStorage } from "../IStorage";
import { randomUUID } from "crypto";

export class MemSessionStore implements ISessionStorage {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  async createSession(userId: string, token: string, expiresAt: Date): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
    };
    this.sessions.set(token, session);
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    return this.sessions.get(token);
  }

  async deleteSession(token: string): Promise<boolean> {
    return this.sessions.delete(token);
  }

  async cleanExpiredSessions(): Promise<void> {
    const now = new Date();
    const sessionsArray = Array.from(this.sessions.entries());
    for (const [token, session] of sessionsArray) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
      }
    }
  }
}
