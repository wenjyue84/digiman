/**
 * Guest Guide Persistence Service
 * Handles saving, loading, and synchronization of guest guide settings
 * Provides localStorage persistence with future backend integration support
 */

import {
  GuestGuideSettings,
  GuestGuideContent,
  GuestGuideVisibility,
  DEFAULT_GUEST_GUIDE_SETTINGS,
  validateGuestGuideContent
} from '@/lib/types/guest-guide';

// Storage configuration
const STORAGE_KEYS = {
  SETTINGS: 'pelangi-guest-guide-settings',
  BACKUP: 'pelangi-guest-guide-backup',
  VERSION: 'pelangi-guest-guide-version',
  LAST_SYNC: 'pelangi-guest-guide-last-sync'
} as const;

// Service interface for future backend integration
interface GuestGuideServiceInterface {
  saveSettings(settings: GuestGuideSettings): Promise<GuestGuideSettings>;
  loadSettings(): Promise<GuestGuideSettings>;
  createBackup(settings: GuestGuideSettings): Promise<void>;
  restoreFromBackup(): Promise<GuestGuideSettings | null>;
  syncWithServer(): Promise<GuestGuideSettings>;
  validateSettings(settings: Partial<GuestGuideSettings>): Promise<{ isValid: boolean; errors: string[] }>;
}

// Error types
export class GuestGuideServiceError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'GuestGuideServiceError';
  }
}

/**
 * Local Storage Implementation
 * Provides robust localStorage-based persistence with error handling
 */
class LocalStorageGuestGuideService implements GuestGuideServiceInterface {
  private readonly storageKeys = STORAGE_KEYS;

  /**
   * Save settings to localStorage with backup creation
   */
  async saveSettings(settings: GuestGuideSettings): Promise<GuestGuideSettings> {
    try {
      // Validate settings before saving
      const validation = await this.validateSettings(settings);
      if (!validation.isValid) {
        throw new GuestGuideServiceError(
          'Settings validation failed',
          'VALIDATION_ERROR',
          validation.errors
        );
      }

      // Create backup of current settings
      await this.createBackup(settings);

      // Prepare settings with metadata
      const settingsWithMetadata = {
        ...settings,
        lastModified: new Date(),
        version: this.generateVersion()
      };

      // Save to localStorage
      localStorage.setItem(
        this.storageKeys.SETTINGS,
        JSON.stringify(settingsWithMetadata)
      );

      // Update last sync timestamp
      localStorage.setItem(
        this.storageKeys.LAST_SYNC,
        new Date().toISOString()
      );

      console.log('[GuestGuideService] Settings saved successfully');
      return settingsWithMetadata;

    } catch (error) {
      if (error instanceof GuestGuideServiceError) {
        throw error;
      }
      throw new GuestGuideServiceError(
        'Failed to save settings',
        'SAVE_ERROR',
        error
      );
    }
  }

  /**
   * Load settings from localStorage with fallback handling
   */
  async loadSettings(): Promise<GuestGuideSettings> {
    try {
      const stored = localStorage.getItem(this.storageKeys.SETTINGS);
      
      if (!stored) {
        console.log('[GuestGuideService] No stored settings found, using defaults');
        return DEFAULT_GUEST_GUIDE_SETTINGS;
      }

      const parsed = JSON.parse(stored);
      
      // Validate loaded settings
      const validation = await this.validateSettings(parsed);
      if (!validation.isValid) {
        console.warn('[GuestGuideService] Stored settings invalid, using defaults', validation.errors);
        return DEFAULT_GUEST_GUIDE_SETTINGS;
      }

      console.log('[GuestGuideService] Settings loaded successfully');
      return {
        ...DEFAULT_GUEST_GUIDE_SETTINGS,
        ...parsed,
        lastModified: new Date(parsed.lastModified)
      };

    } catch (error) {
      console.error('[GuestGuideService] Error loading settings:', error);
      
      // Try to restore from backup
      const backup = await this.restoreFromBackup();
      if (backup) {
        console.log('[GuestGuideService] Restored settings from backup');
        return backup;
      }

      console.log('[GuestGuideService] Using default settings due to load error');
      return DEFAULT_GUEST_GUIDE_SETTINGS;
    }
  }

  /**
   * Create backup of current settings
   */
  async createBackup(settings: GuestGuideSettings): Promise<void> {
    try {
      const currentStored = localStorage.getItem(this.storageKeys.SETTINGS);
      if (currentStored) {
        localStorage.setItem(this.storageKeys.BACKUP, currentStored);
        console.log('[GuestGuideService] Backup created');
      }
    } catch (error) {
      console.warn('[GuestGuideService] Failed to create backup:', error);
      // Don't throw error for backup failures
    }
  }

  /**
   * Restore settings from backup
   */
  async restoreFromBackup(): Promise<GuestGuideSettings | null> {
    try {
      const backup = localStorage.getItem(this.storageKeys.BACKUP);
      if (!backup) {
        return null;
      }

      const parsed = JSON.parse(backup);
      const validation = await this.validateSettings(parsed);
      
      if (validation.isValid) {
        return {
          ...DEFAULT_GUEST_GUIDE_SETTINGS,
          ...parsed,
          lastModified: new Date(parsed.lastModified)
        };
      }

      return null;
    } catch (error) {
      console.error('[GuestGuideService] Error restoring from backup:', error);
      return null;
    }
  }

  /**
   * Future: Sync with server
   * Currently returns local settings, but can be extended for API integration
   */
  async syncWithServer(): Promise<GuestGuideSettings> {
    // TODO: Implement server synchronization
    console.log('[GuestGuideService] Server sync not implemented, returning local settings');
    return this.loadSettings();
  }

  /**
   * Validate settings structure and content
   */
  async validateSettings(settings: Partial<GuestGuideSettings>): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate structure
      if (!settings) {
        errors.push('Settings object is null or undefined');
        return { isValid: false, errors };
      }

      // Validate content if present
      if (settings.content) {
        const contentValidation = validateGuestGuideContent(settings.content);
        errors.push(...contentValidation.errors);
      }

      // Validate visibility if present
      if (settings.visibility) {
        const requiredVisibilityKeys = [
          'showIntro', 'showAddress', 'showWifi', 'showCheckin',
          'showOther', 'showFaq', 'showunitIssues', 'showTimeAccess',
          'showHostelPhotos', 'showGoogleMaps', 'showCheckinVideo'
        ];

        for (const key of requiredVisibilityKeys) {
          if (!(key in settings.visibility)) {
            errors.push(`Missing visibility setting: ${key}`);
          }
        }
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Validation error: ${error}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Generate version string for settings
   */
  private generateVersion(): string {
    return `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get storage statistics
   */
  async getStorageInfo(): Promise<{
    hasSettings: boolean;
    hasBackup: boolean;
    lastSync: Date | null;
    version: string | null;
    storageSize: number;
  }> {
    const hasSettings = !!localStorage.getItem(this.storageKeys.SETTINGS);
    const hasBackup = !!localStorage.getItem(this.storageKeys.BACKUP);
    const lastSyncStr = localStorage.getItem(this.storageKeys.LAST_SYNC);
    const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;
    const version = localStorage.getItem(this.storageKeys.VERSION);
    
    // Calculate storage size (rough estimate)
    let storageSize = 0;
    Object.values(this.storageKeys).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        storageSize += new Blob([item]).size;
      }
    });

    return {
      hasSettings,
      hasBackup,
      lastSync,
      version,
      storageSize
    };
  }

  /**
   * Clear all guest guide data from localStorage
   */
  async clearAllData(): Promise<void> {
    Object.values(this.storageKeys).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('[GuestGuideService] All data cleared');
  }
}

/**
 * Future: API-based implementation
 * For when backend integration is needed
 */
class APIGuestGuideService implements GuestGuideServiceInterface {
  private baseURL: string;
  private localService: LocalStorageGuestGuideService;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.localService = new LocalStorageGuestGuideService();
  }

  async saveSettings(settings: GuestGuideSettings): Promise<GuestGuideSettings> {
    // TODO: Implement API save with fallback to localStorage
    return this.localService.saveSettings(settings);
  }

  async loadSettings(): Promise<GuestGuideSettings> {
    // TODO: Implement API load with fallback to localStorage
    return this.localService.loadSettings();
  }

  async createBackup(settings: GuestGuideSettings): Promise<void> {
    return this.localService.createBackup(settings);
  }

  async restoreFromBackup(): Promise<GuestGuideSettings | null> {
    return this.localService.restoreFromBackup();
  }

  async syncWithServer(): Promise<GuestGuideSettings> {
    // TODO: Implement actual server sync
    return this.localService.loadSettings();
  }

  async validateSettings(settings: Partial<GuestGuideSettings>): Promise<{ isValid: boolean; errors: string[] }> {
    return this.localService.validateSettings(settings);
  }
}

// Service factory
export const createGuestGuideService = (
  type: 'localStorage' | 'api' = 'localStorage',
  apiBaseURL?: string
): GuestGuideServiceInterface => {
  if (type === 'api' && apiBaseURL) {
    return new APIGuestGuideService(apiBaseURL);
  }
  return new LocalStorageGuestGuideService();
};

// Default service instance
export const guestGuideService = createGuestGuideService();

// Utility functions
export const exportGuestGuideSettings = async (): Promise<string> => {
  const settings = await guestGuideService.loadSettings();
  return JSON.stringify(settings, null, 2);
};

export const importGuestGuideSettings = async (jsonString: string): Promise<GuestGuideSettings> => {
  try {
    const settings = JSON.parse(jsonString);
    const validation = await guestGuideService.validateSettings(settings);
    
    if (!validation.isValid) {
      throw new GuestGuideServiceError(
        'Invalid settings format',
        'IMPORT_ERROR',
        validation.errors
      );
    }

    return guestGuideService.saveSettings(settings);
  } catch (error) {
    if (error instanceof GuestGuideServiceError) {
      throw error;
    }
    throw new GuestGuideServiceError(
      'Failed to import settings',
      'IMPORT_ERROR',
      error
    );
  }
};
