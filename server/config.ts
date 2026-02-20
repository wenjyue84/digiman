import { type AppSetting, type InsertAppSetting, updateSettingsSchema, type UpdateSettings } from "@shared/schema";
import { type IStorage } from "./storage";

// Default configuration values
export const DEFAULT_CONFIG: Partial<UpdateSettings> = {
  // Token and Session Settings
  sessionExpirationHours: 168,
  
  // System Settings
  defaultUserRole: "staff",
  maxGuestStayDays: 30,
  
  // Payment Settings
  defaultPaymentMethod: "cash",
  maxPaymentAmount: 9999.99,
  
  // unit Settings
  totalUnits: 24,
  unitSections: ["front", "middle", "back"],
  unitNumberFormat: "A01",
  
  // Notification Settings
  notificationRetentionDays: 30,
  
  // Cache and Performance Settings
  cacheTimeMinutes: 5,
  queryRefreshIntervalSeconds: 30,
  
  // Data Pagination Settings
  defaultPageSize: 20,
  maxPageSize: 100,
  
  // Business Rules
  minGuestAge: 16,
  maxGuestAge: 120,
  
  // Contact Information
  defaultAdminEmail: "admin@pelangiunit.com",
  supportEmail: "support@pelangiunit.com",
  supportPhone: "+60123456789",
  
  // Application Settings
  hostelName: "Pelangi Capsule Hostel",
  timezone: "Asia/Kuala_Lumpur",
};

// Configuration setting descriptions
export const CONFIG_DESCRIPTIONS: Partial<Record<keyof UpdateSettings, string>> = {
  sessionExpirationHours: "User session duration before auto-logout (hours)",
  defaultUserRole: "Default role assigned to new users",
  maxGuestStayDays: "Maximum number of days a guest can stay",
  defaultPaymentMethod: "Default payment method selected in forms",
  maxPaymentAmount: "Maximum payment amount allowed per transaction (RM)",
  totalUnits: "Total number of units in the hostel",
  unitSections: "Available unit sections/areas",
  unitNumberFormat: "Format pattern for unit numbers",
  notificationRetentionDays: "How long to keep notifications before auto-deletion (days)",
  cacheTimeMinutes: "How long to cache frequently accessed data (minutes)",
  queryRefreshIntervalSeconds: "Auto-refresh interval for live data (seconds)",
  defaultPageSize: "Default number of items per page in lists",
  maxPageSize: "Maximum items allowed per page",
  minGuestAge: "Minimum age required for guests",
  maxGuestAge: "Maximum age accepted for guests",
  defaultAdminEmail: "Primary admin email address",
  supportEmail: "Customer support email address",
  supportPhone: "Customer support phone number",
  hostelName: "Official name of the hostel",
  timezone: "Timezone for date/time operations",
};

export class ConfigService {
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private storage: IStorage) {}

  /**
   * Get a configuration value by key
   */
  async get<K extends keyof UpdateSettings>(
    key: K
  ): Promise<UpdateSettings[K]> {
    // Check cache first
    if (this.cache.has(key) && this.cacheExpiry.has(key)) {
      const expiry = this.cacheExpiry.get(key)!;
      if (Date.now() < expiry) {
        return this.cache.get(key) as UpdateSettings[K];
      }
      // Clear expired cache
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    }

    try {
      const setting = await this.storage.getAppSetting(key);
      let value: any;

      if (setting) {
        // Parse the stored value based on the expected type
        value = this.parseValue(key, setting.value);
      } else {
        // Use default value and store it in the database
        value = (DEFAULT_CONFIG[key] as UpdateSettings[K]) ?? value;
        await this.set(key, value);
      }

      // Cache the value
      this.cache.set(key, value);
      this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);

      return value;
    } catch (error) {
      console.error(`Error getting config value for ${key}:`, error);
      return (DEFAULT_CONFIG[key] as UpdateSettings[K]) ?? (undefined as UpdateSettings[K]);
    }
  }

  /**
   * Set a configuration value
   */
  async set<K extends keyof UpdateSettings>(
    key: K,
    value: UpdateSettings[K],
    updatedBy?: string
  ): Promise<void> {
    try {
      // Validate the value using partial schema
      const validated = updateSettingsSchema.partial().parse({ [key]: value });

      const settingData: InsertAppSetting = {
        key,
        value: this.stringifyValue(value),
        description: CONFIG_DESCRIPTIONS[key] ?? `Configuration value for ${String(key)}`,
        updatedBy: updatedBy,
      };

      await this.storage.upsertAppSetting(settingData);

      // Update cache
      this.cache.set(key, value);
      this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
    } catch (error) {
      console.error(`Error setting config value for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all configuration values
   */
  async getAll(): Promise<UpdateSettings> {
    const config: Partial<UpdateSettings> = {};
    
    for (const key of Object.keys(DEFAULT_CONFIG) as (keyof UpdateSettings)[]) {
      config[key] = await this.get(key);
    }

    return config as UpdateSettings;
  }

  /**
   * Update multiple configuration values
   */
  async updateMultiple(
    updates: Partial<UpdateSettings>,
    updatedBy?: string
  ): Promise<void> {
    // Validate all updates first
    const validated = updateSettingsSchema.partial().parse(updates);

    // Update each setting
    for (const [key, value] of Object.entries(validated)) {
      if (value !== undefined) {
        await this.set(key as keyof UpdateSettings, value as any, updatedBy);
      }
    }
  }

  /**
   * Reset a configuration value to its default
   */
  async reset<K extends keyof UpdateSettings>(
    key: K,
    updatedBy?: string
  ): Promise<void> {
    await this.set(key, DEFAULT_CONFIG[key], updatedBy);
  }

  /**
   * Reset all configuration values to defaults
   */
  async resetAll(updatedBy?: string): Promise<void> {
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      await this.set(key as keyof UpdateSettings, value, updatedBy);
    }
  }

  /**
   * Clear the configuration cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get configuration with metadata
   */
  async getAllWithMetadata(): Promise<Array<{
    key: string;
    value: any;
    description: string;
    defaultValue: any;
    updatedAt?: Date;
    updatedBy?: string;
  }>> {
    const settings = await this.storage.getAllAppSettings();
    const result: Array<{
      key: string;
      value: any;
      description: string;
      defaultValue: any;
      updatedAt?: Date;
      updatedBy?: string;
    }> = [];

    for (const key of Object.keys(DEFAULT_CONFIG) as (keyof UpdateSettings)[]) {
      const setting = settings.find(s => s.key === key);
      const currentValue = await this.get(key);
      
      result.push({
        key,
        value: currentValue,
        description: CONFIG_DESCRIPTIONS[key] ?? `Configuration value for ${String(key)}`,
        defaultValue: DEFAULT_CONFIG[key],
        updatedAt: setting?.updatedAt,
        updatedBy: setting?.updatedBy || undefined,
      });
    }

    return result;
  }

  /**
   * Parse a stored string value back to its proper type
   */
  private parseValue<K extends keyof UpdateSettings>(
    key: K,
    value: string
  ): UpdateSettings[K] {
    const defaultValue = DEFAULT_CONFIG[key] as UpdateSettings[K] | undefined;
    
    try {
      if (typeof defaultValue === 'number') {
        return Number(value) as UpdateSettings[K];
      }
      
      if (typeof defaultValue === 'boolean') {
        return (value === 'true') as any as UpdateSettings[K];
      }
      
      if (Array.isArray(defaultValue)) {
        return JSON.parse(value) as UpdateSettings[K];
      }
      
      return value as UpdateSettings[K];
    } catch (error) {
      console.error(`Error parsing config value for ${key}:`, error);
      return (defaultValue as UpdateSettings[K]) ?? (value as UpdateSettings[K]);
    }
  }

  /**
   * Convert a value to a string for storage
   */
  private stringifyValue(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Initialize default configuration in the database
   */
  async initializeDefaults(updatedBy: string = 'system'): Promise<void> {
    try {
      console.log('🔧 Initializing default configuration...');
      
      const existingSettings = await this.storage.getAllAppSettings();
      const existingKeys = new Set(existingSettings.map(s => s.key));

      let initialized = 0;
      for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
        if (!existingKeys.has(key)) {
          await this.set(key as keyof UpdateSettings, value, updatedBy);
          initialized++;
        }
      }

      if (initialized > 0) {
        console.log(`✅ Initialized ${initialized} default configuration settings`);
      } else {
        console.log('✅ Configuration already initialized');
      }
    } catch (error) {
      console.error('❌ Error initializing default configuration:', error);
    }
  }
}

// Utility functions for specific configuration groups
export class ConfigUtils {
  constructor(private config: ConfigService) {}

  /**
   * Get token expiration time in milliseconds
   */
  async getTokenExpirationMs(): Promise<number> {
    // Default to 24 hours for guest tokens
    return 24 * 60 * 60 * 1000;
  }

  /**
   * Get session expiration time in milliseconds
   */
  async getSessionExpirationMs(): Promise<number> {
    const hours = await this.config.get('sessionExpirationHours');
    return hours * 60 * 60 * 1000;
  }

  /**
   * Get cache duration in milliseconds
   */
  async getCacheDurationMs(): Promise<number> {
    const minutes = await this.config.get('cacheTimeMinutes');
    return minutes * 60 * 1000;
  }

  /**
   * Get query refresh interval in milliseconds
   */
  async getQueryRefreshIntervalMs(): Promise<number> {
    const seconds = await this.config.get('queryRefreshIntervalSeconds');
    return seconds * 1000;
  }

  /**
   * Get maximum stay duration in milliseconds
   */
  async getMaxStayDurationMs(): Promise<number> {
    const days = await this.config.get('maxGuestStayDays');
    return days * 24 * 60 * 60 * 1000;
  }

  /**
   * Check if age is within allowed range
   */
  async isValidAge(age: number): Promise<boolean> {
    const minAge = await this.config.get('minGuestAge');
    const maxAge = await this.config.get('maxGuestAge');
    return age >= minAge && age <= maxAge;
  }

  /**
   * Get available payment methods
   */
  async getPaymentMethods(): Promise<string[]> {
    // This could be expanded to be configurable
    return ['cash', 'tng', 'bank', 'platform'];
  }

  /**
   * Get unit number pattern for validation
   */
  async getUnitNumberPattern(): Promise<RegExp> {
    const format = await this.config.get('unitNumberFormat');
    // Convert format like "A01" to regex pattern like "^[A-Z]\d{2}$"
    const pattern = format.replace(/[A-Z]/g, '[A-Z]').replace(/\d/g, '\\d');
    return new RegExp(`^${pattern}$`);
  }
}
