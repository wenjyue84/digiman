import type { AppSetting, InsertAppSetting } from "../../../shared/schema";
import type { ISettingsStorage } from "../IStorage";
import { randomUUID } from "crypto";

export class MemSettingsStore implements ISettingsStorage {
  private appSettings: Map<string, AppSetting>;

  constructor() {
    this.appSettings = new Map();
  }

  async getSetting(key: string): Promise<AppSetting | undefined> {
    return this.appSettings.get(key);
  }

  async setSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<AppSetting> {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('Setting key is required and must be a non-empty string');
    }

    if (value === null || value === undefined) {
      throw new Error('Setting value is required');
    }

    const trimmedKey = key.trim();
    const stringValue = String(value);

    const existing = this.appSettings.get(trimmedKey);

    if (existing) {
      const updatedSetting: AppSetting = {
        ...existing,
        value: stringValue,
        description: description || existing.description,
        updatedBy: updatedBy || existing.updatedBy,
        updatedAt: new Date(),
      };
      this.appSettings.set(trimmedKey, updatedSetting);
      return updatedSetting;
    } else {
      const newSetting: AppSetting = {
        id: randomUUID(),
        key: trimmedKey,
        value: stringValue,
        description: description || null,
        updatedBy: updatedBy || null,
        updatedAt: new Date(),
      };
      this.appSettings.set(trimmedKey, newSetting);
      return newSetting;
    }
  }

  async getAllSettings(): Promise<AppSetting[]> {
    return Array.from(this.appSettings.values());
  }

  async getGuestTokenExpirationHours(): Promise<number> {
    const setting = await this.getSetting('guestTokenExpirationHours');
    return setting ? parseInt(setting.value) : 24;
  }

  async getAppSetting(key: string): Promise<AppSetting | undefined> {
    return this.getSetting(key);
  }

  async upsertAppSetting(setting: InsertAppSetting): Promise<AppSetting> {
    return this.setSetting(setting.key, setting.value, setting.description || undefined, setting.updatedBy || undefined);
  }

  async getAllAppSettings(): Promise<AppSetting[]> {
    return this.getAllSettings();
  }

  async deleteAppSetting(key: string): Promise<boolean> {
    return this.appSettings.delete(key);
  }
}
