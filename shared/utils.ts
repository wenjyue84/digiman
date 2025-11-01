/**
 * Utility functions for the application
 */

/**
 * Calculates age from Malaysian IC number
 * Malaysian IC format: YYMMDD-PB-XXXX
 * First 6 digits represent birth date: YYMMDD
 * @param icNumber - 12-digit Malaysian IC number
 * @returns calculated age in years, or null if invalid
 */
export function calculateAgeFromIC(icNumber: string): number | null {
  if (!icNumber || icNumber.length !== 12) {
    return null;
  }

  try {
    // Extract date parts from IC (first 6 digits: YYMMDD)
    const year = parseInt(icNumber.substring(0, 2));
    const month = parseInt(icNumber.substring(2, 4));
    const day = parseInt(icNumber.substring(4, 6));

    // Validate date parts
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    // Convert 2-digit year to 4-digit year
    // Malaysian IC uses 2-digit years where:
    // 00-29 = 2000-2029
    // 30-99 = 1930-1999
    let fullYear: number;
    if (year <= 29) {
      fullYear = 2000 + year;
    } else {
      fullYear = 1900 + year;
    }

    // Create birth date
    const birthDate = new Date(fullYear, month - 1, day);
    
    // Validate the date (handles leap years, etc.)
    if (birthDate.getFullYear() !== fullYear || 
        birthDate.getMonth() !== month - 1 || 
        birthDate.getDate() !== day) {
      return null;
    }

    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Validate age is reasonable (0-120 years)
    if (age < 0 || age > 120) {
      return null;
    }

    return age;
  } catch (error) {
    return null;
  }
}

/**
 * Validates if a string is a valid Malaysian IC number
 * @param icNumber - IC number to validate
 * @returns true if valid, false otherwise
 */
export function isValidMalaysianIC(icNumber: string): boolean {
  if (!icNumber || icNumber.length !== 12) {
    return false;
  }

  // Check if all characters are digits
  if (!/^\d{12}$/.test(icNumber)) {
    return false;
  }

  // Check if age calculation is successful
  return calculateAgeFromIC(icNumber) !== null;
}

/**
 * Environment Detection Utilities
 * Centralized functions to detect where the application is running
 */

export interface EnvironmentInfo {
  isLocalhost: boolean;
  isReplit: boolean;
  isProduction: boolean;
  isDevelopment: boolean;
  isMemoryStorage: boolean;
  hostname: string;
  environment: 'localhost' | 'replit' | 'production' | 'development';
}

/**
 * Client-side environment detection
 * Use this in React components and client-side code
 */
export function getClientEnvironment(): EnvironmentInfo {
  if (typeof window === 'undefined') {
    // Server-side rendering - return default values
    return {
      isLocalhost: false,
      isReplit: false,
      isProduction: false,
      isDevelopment: true,
      isMemoryStorage: false,
      hostname: '',
      environment: 'development'
    };
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isReplit = hostname.includes('.replit.dev') || hostname.includes('.replit.app') || !!import.meta.env.VITE_REPL_ID;
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = !isProduction;

  let environment: EnvironmentInfo['environment'] = 'development';
  if (isLocalhost) environment = 'localhost';
  else if (isReplit) environment = 'replit';
  else if (isProduction) environment = 'production';

  return {
    isLocalhost,
    isReplit,
    isProduction,
    isDevelopment,
    isMemoryStorage: false, // Client can't determine this directly
    hostname,
    environment
  };
}

/**
 * Server-side environment detection - SIMPLIFIED!
 * Use this in server-side code and API routes
 */
export function getServerEnvironment(): EnvironmentInfo {
  const hostname = process.env.HOSTNAME || 'unknown';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || process.env.NODE_ENV === 'development';
  const isReplit = !!process.env.REPL_ID || !!process.env.REPL_SLUG || !!process.env.PRIVATE_OBJECT_DIR;
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = !isProduction;
  
  // SIMPLE: Just check if DATABASE_URL exists
  const isMemoryStorage = !process.env.DATABASE_URL && !process.env.PRIVATE_DATABASE_URL;

  let environment: EnvironmentInfo['environment'] = 'development';
  if (isLocalhost) environment = 'localhost';
  else if (isReplit) environment = 'replit';
  else if (isProduction) environment = 'production';

  return {
    isLocalhost,
    isReplit,
    isProduction,
    isDevelopment,
    isMemoryStorage,
    hostname,
    environment
  };
}

/**
 * Universal environment detection
 * Works on both client and server side
 */
export function getEnvironment(): EnvironmentInfo {
  if (typeof window !== 'undefined') {
    return getClientEnvironment();
  } else {
    return getServerEnvironment();
  }
}

/**
 * Check if demo features should be shown
 * Demo features are only shown in development/localhost environments
 */
export function shouldShowDemoFeatures(): boolean {
  const env = getEnvironment();
  return env.isLocalhost || env.isDevelopment;
}

/**
 * Check if PWA features should be enabled
 * PWA is now enabled in all environments including Replit for push notification support
 */
export function shouldEnablePWA(): boolean {
  const env = getEnvironment();
  // Enable PWA in all environments (localhost, Replit, and production)
  // This allows push notifications to work on mobile devices accessing via Replit URLs
  return true;
}

/**
 * Get appropriate database configuration for current environment - SIMPLIFIED!
 */
export function getEnvironmentDatabaseConfig() {
  const env = getEnvironment();
  
  if (env.isReplit) {
    const isNeon = process.env.DATABASE_URL?.includes('neon.tech');
    return {
      type: 'replit' as const,
      url: process.env.DATABASE_URL || process.env.PRIVATE_DATABASE_URL,
      label: isNeon ? 'Replit DB (Neon)' : 'Replit DB',
      ssl: isNeon ? 'require' : undefined,
      neonOptimized: isNeon
    };
  } else if (process.env.DATABASE_URL) {
    // SIMPLE: Any DATABASE_URL = use database
    return {
      type: 'database' as const,
      url: process.env.DATABASE_URL,
      label: 'Database'
    };
  } else {
    // SIMPLE: No DATABASE_URL = use memory
    return {
      type: 'memory' as const,
      label: 'Memory Storage'
    };
  }
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  const env = getEnvironment();
  
  return {
    // Database
    database: getEnvironmentDatabaseConfig(),
    
    // PWA
    enablePWA: shouldEnablePWA(),
    
    // Demo features
    showDemoFeatures: shouldShowDemoFeatures(),
    
    // Upload handling - enhanced for your Replit setup
    uploadStrategy: env.isReplit ? 'replit-object-storage' : 'local-filesystem',
    
    // Replit-specific configurations
    replitConfig: env.isReplit ? {
      bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID,
      publicPaths: process.env.PUBLIC_OBJECT_SEARCH_PATHS,
      privateDir: process.env.PRIVATE_OBJECT_DIR,
      databaseProvider: process.env.DATABASE_URL?.includes('neon.tech') ? 'neon' : 'replit-builtin',
      isNeonOptimized: process.env.DATABASE_URL?.includes('neon.tech') || false
    } : null,
    
    // Service worker
    enableServiceWorker: shouldEnablePWA(),
    
    // Environment info
    environment: env.environment,
    isLocalhost: env.isLocalhost,
    isReplit: env.isReplit,
    isProduction: env.isProduction
  };
}