import type { GuestToken, InsertGuestToken, PaginationParams, PaginatedResponse } from "../../../shared/schema";
import type { ITokenStorage } from "../IStorage";
import { randomUUID } from "crypto";
import { paginate } from "./paginate";

export class MemTokenStore implements ITokenStorage {
  private guestTokens: Map<string, GuestToken>;

  constructor() {
    this.guestTokens = new Map();
  }

  async createGuestToken(insertToken: InsertGuestToken): Promise<GuestToken> {
    const token: GuestToken = {
      id: randomUUID(),
      token: insertToken.token,
      unitNumber: insertToken.unitNumber || null,
      autoAssign: insertToken.autoAssign || false,
      guestName: insertToken.guestName || null,
      phoneNumber: insertToken.phoneNumber || null,
      email: insertToken.email || null,
      expectedCheckoutDate: insertToken.expectedCheckoutDate || null,
      createdBy: insertToken.createdBy,
      isUsed: false,
      usedAt: null,
      expiresAt: insertToken.expiresAt,
      createdAt: new Date(),
    };
    this.guestTokens.set(token.token, token);
    return token;
  }

  async getGuestToken(token: string): Promise<GuestToken | undefined> {
    return this.guestTokens.get(token);
  }

  async getGuestTokenById(id: string): Promise<GuestToken | undefined> {
    for (const token of Array.from(this.guestTokens.values())) {
      if (token.id === id) {
        return token;
      }
    }
    return undefined;
  }

  async getActiveGuestTokens(pagination?: PaginationParams): Promise<PaginatedResponse<GuestToken>> {
    const now = new Date();
    const activeTokens = Array.from(this.guestTokens.values())
      .filter(token => !token.isUsed && token.expiresAt > now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return paginate(activeTokens, pagination);
  }

  async markTokenAsUsed(token: string): Promise<GuestToken | undefined> {
    const guestToken = this.guestTokens.get(token);
    if (guestToken) {
      const updatedToken = { ...guestToken, isUsed: true, usedAt: new Date() };
      this.guestTokens.set(token, updatedToken);
      return updatedToken;
    }
    return undefined;
  }

  async updateGuestTokenUnit(tokenId: string, unitNumber: string | null, autoAssign: boolean): Promise<GuestToken | undefined> {
    let tokenKey: string | null = null;
    let foundToken: GuestToken | undefined = undefined;

    this.guestTokens.forEach((token, key) => {
      if (token.id === tokenId) {
        tokenKey = key;
        foundToken = token;
      }
    });

    if (foundToken && tokenKey) {
      const updatedToken: GuestToken = {
        ...(foundToken as GuestToken),
        unitNumber: unitNumber,
        autoAssign: autoAssign
      };
      this.guestTokens.set(tokenKey, updatedToken);
      return updatedToken;
    }
    return undefined;
  }

  async deleteGuestToken(id: string): Promise<boolean> {
    let tokenToDelete: string | null = null;

    this.guestTokens.forEach((guestToken, token) => {
      if (guestToken.id === id) {
        tokenToDelete = token;
      }
    });

    if (tokenToDelete) {
      this.guestTokens.delete(tokenToDelete);
      return true;
    }

    return false;
  }

  async cleanExpiredTokens(): Promise<void> {
    const now = new Date();
    for (const [token, tokenData] of Array.from(this.guestTokens.entries())) {
      if (tokenData.expiresAt < now) {
        this.guestTokens.delete(token);
      }
    }
  }
}
