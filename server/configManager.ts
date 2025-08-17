import { ConfigService, ConfigUtils } from "./config";
import { type IStorage } from "./storage";

// Global singleton instances for configuration management
let configService: ConfigService | null = null;
let configUtils: ConfigUtils | null = null;

/**
 * Initialize the configuration service with storage backend
 * Sets up default settings and prepares the service for use
 */
export async function initializeConfig(storage: IStorage): Promise<void> {
  configService = new ConfigService(storage);
  configUtils = new ConfigUtils(configService);
  
  // Ensure default configuration values exist in storage
  await configService.initializeDefaults('system');
  
  console.log('✅ Configuration service initialized');
}

/**
 * Get the configuration service instance
 * Throws error if service hasn't been initialized
 */
export function getConfig(): ConfigService {
  if (!configService) {
    throw new Error('Configuration service not initialized. Call initializeConfig() first.');
  }
  return configService;
}

/**
 * Get the configuration utilities instance
 * Provides helper methods for common configuration operations
 */
export function getConfigUtils(): ConfigUtils {
  if (!configUtils) {
    throw new Error('Configuration utilities not initialized. Call initializeConfig() first.');
  }
  return configUtils;
}

/**
 * Static configuration accessor providing type-safe getters for all app settings
 * Simplifies access to frequently used configuration values
 */
export class AppConfig {
  private static config: ConfigService | null = null;
  private static utils: ConfigUtils | null = null;

  static initialize(config: ConfigService, utils: ConfigUtils) {
    this.config = config;
    this.utils = utils;
  }

  // Authentication and session configuration
  static async getTokenExpirationHours(): Promise<number> {
    return this.config!.get('guestTokenExpirationHours');
  }

  static async getSessionExpirationHours(): Promise<number> {
    return this.config!.get('sessionExpirationHours');
  }

  static async getTokenExpirationMs(): Promise<number> {
    return this.utils!.getTokenExpirationMs();
  }

  static async getSessionExpirationMs(): Promise<number> {
    return this.utils!.getSessionExpirationMs();
  }

  // Core system configuration
  static async getDefaultUserRole(): Promise<string> {
    return this.config!.get('defaultUserRole');
  }

  static async getMaxGuestStayDays(): Promise<number> {
    return this.config!.get('maxGuestStayDays');
  }

  // Financial and payment configuration
  static async getDefaultPaymentMethod(): Promise<string> {
    return this.config!.get('defaultPaymentMethod');
  }

  static async getMaxPaymentAmount(): Promise<number> {
    return this.config!.get('maxPaymentAmount');
  }

  // Accommodation and capsule configuration
  static async getTotalCapsules(): Promise<number> {
    return this.config!.get('totalCapsules');
  }

  static async getCapsuleSections(): Promise<string[]> {
    return this.config!.get('capsuleSections');
  }

  static async getCapsuleNumberFormat(): Promise<string> {
    return this.config!.get('capsuleNumberFormat');
  }

  // Performance and caching configuration
  static async getCacheTimeMinutes(): Promise<number> {
    return this.config!.get('cacheTimeMinutes');
  }

  static async getQueryRefreshIntervalSeconds(): Promise<number> {
    return this.config!.get('queryRefreshIntervalSeconds');
  }

  static async getCacheDurationMs(): Promise<number> {
    return this.utils!.getCacheDurationMs();
  }

  static async getQueryRefreshIntervalMs(): Promise<number> {
    return this.utils!.getQueryRefreshIntervalMs();
  }

  // Data pagination configuration
  static async getDefaultPageSize(): Promise<number> {
    return this.config!.get('defaultPageSize');
  }

  static async getMaxPageSize(): Promise<number> {
    return this.config!.get('maxPageSize');
  }

  // Business logic and validation rules
  static async getMinGuestAge(): Promise<number> {
    return this.config!.get('minGuestAge');
  }

  static async getMaxGuestAge(): Promise<number> {
    return this.config!.get('maxGuestAge');
  }

  static async isValidAge(age: number): Promise<boolean> {
    return this.utils!.isValidAge(age);
  }

  // Organization contact information
  static async getDefaultAdminEmail(): Promise<string> {
    return this.config!.get('defaultAdminEmail');
  }

  static async getSupportEmail(): Promise<string> {
    return this.config!.get('supportEmail');
  }

  static async getSupportPhone(): Promise<string> {
    return this.config!.get('supportPhone');
  }

  // Application identity and branding
  static async getHostelName(): Promise<string> {
    return this.config!.get('hostelName');
  }

  static async getTimezone(): Promise<string> {
    return this.config!.get('timezone');
  }

  // Notification and communication settings
  static async getNotificationRetentionDays(): Promise<number> {
    return this.config!.get('notificationRetentionDays');
  }
}

/**
 * Express middleware that injects configuration services into request object
 * Provides easy access to config throughout the request lifecycle
 */
export function configMiddleware() {
  return (req: any, res: any, next: any) => {
    // Make configuration services available on request object
    req.config = getConfig();
    req.configUtils = getConfigUtils();
    req.AppConfig = AppConfig;
    next();
  };
}

/**
 * Retrieves complete configuration data for API responses
 * Returns both settings values and metadata for client consumption
 */
export async function getConfigForAPI(): Promise<{
  settings: any;
  metadata: any[];
}> {
  const config = getConfig();
  const settings = await config.getAll();
  const metadata = await config.getAllWithMetadata();
  
  return {
    settings,
    metadata,
  };
}

/**
 * Validates configuration updates against schema rules
 * Returns validation results with detailed error messages
 */
export async function validateConfigUpdate(
  updates: Record<string, any>
): Promise<{ valid: boolean; errors: string[] }> {
  const config = getConfig();
  const errors: string[] = [];
  
  try {
    // Perform dry-run validation against configuration schema
    await config.updateMultiple(updates, 'validation');
    return { valid: true, errors: [] };
  } catch (error: any) {
    // Extract detailed validation errors for client feedback
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((err: any) => {
        errors.push(`${err.path?.join('.')}: ${err.message}`);
      });
    } else {
      errors.push(error.message || 'Invalid configuration update');
    }
    
    return { valid: false, errors };
  }
}