import type { AppSetting, InsertAppSetting } from "../../../shared/schema";
import { appSettings } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import type { ISettingsStorage } from "../IStorage";

/** Database settings queries implementing ISettingsStorage via Drizzle ORM */
export class DbSettingsQueries implements ISettingsStorage {
  constructor(private readonly db: any) {}

  async getSetting(key: string): Promise<AppSetting | undefined> {
    const result = await this.db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    return result[0];
  }

  async setSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<AppSetting> {
    // Validate input parameters
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('Setting key is required and must be a non-empty string');
    }

    if (value === null || value === undefined) {
      throw new Error('Setting value is required');
    }

    const trimmedKey = key.trim();
    const stringValue = String(value);

    const existing = await this.getSetting(trimmedKey);

    if (existing) {
      const result = await this.db.update(appSettings).set({
        value: stringValue,
        description: description || existing.description,
        updatedBy,
        updatedAt: new Date(),
      }).where(eq(appSettings.key, trimmedKey)).returning();
      return result[0];
    } else {
      const result = await this.db.insert(appSettings).values({
        key: trimmedKey,
        value: stringValue,
        description: description || null,
        updatedBy: updatedBy || null,
      }).returning();
      return result[0];
    }
  }

  async getAllSettings(): Promise<AppSetting[]> {
    return await this.db.select().from(appSettings);
  }

  async getGuestTokenExpirationHours(): Promise<number> {
    const setting = await this.getSetting("guestTokenExpirationHours");
    return setting ? parseInt(setting.value) : 24; // Default to 24 hours
  }

  async getAppSetting(key: string): Promise<AppSetting | undefined> {
    return this.getSetting(key);
  }

  // CRITICAL: TypeScript error fix - DO NOT MODIFY without user approval
  // Fixed null handling for description parameter to prevent build failures
  // Last fixed: August 23, 2025 - TypeScript error resolution during system recovery
  async upsertAppSetting(setting: InsertAppSetting): Promise<AppSetting> {
    return this.setSetting(setting.key, setting.value, setting.description || undefined, setting.updatedBy || undefined);
  }

  async getAllAppSettings(): Promise<AppSetting[]> {
    return this.getAllSettings();
  }

  async deleteAppSetting(key: string): Promise<boolean> {
    const result = await this.db.delete(appSettings).where(eq(appSettings.key, key)).returning();
    return result.length > 0;
  }
}
