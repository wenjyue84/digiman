import { useQuery } from '@tanstack/react-query';

/**
 * Application configuration interface defining all configurable settings
 * Used throughout the app for consistent behavior and easy customization
 */
export interface AppConfig {
  // Authentication and session management
  guestTokenExpirationHours: number;
  sessionExpirationHours: number;
  
  // System Settings
  defaultUserRole: string;
  maxGuestStayDays: number;
  
  // Payment Settings
  defaultPaymentMethod: string;
  maxPaymentAmount: number;
  
  // Capsule Settings
  totalCapsules: number;
  capsuleSections: string[];
  capsuleNumberFormat: string;
  
  // Notification Settings
  notificationRetentionDays: number;
  
  // Cache and Performance Settings
  cacheTimeMinutes: number;
  queryRefreshIntervalSeconds: number;
  
  // Data Pagination Settings
  defaultPageSize: number;
  maxPageSize: number;
  
  // Business Rules
  minGuestAge: number;
  maxGuestAge: number;
  
  // Contact Information
  defaultAdminEmail: string;
  supportEmail: string;
  supportPhone: string;
  
  // Application Settings
  hostelName: string;
  timezone: string;
}

/**
 * Default configuration values used as fallback when API is unavailable
 * Ensures application continues to function even without server config
 */
export const DEFAULT_CONFIG: AppConfig = {
  guestTokenExpirationHours: 24,
  sessionExpirationHours: 24,
  defaultUserRole: 'staff',
  maxGuestStayDays: 30,
  defaultPaymentMethod: 'cash',
  maxPaymentAmount: 9999.99,
  totalCapsules: 24,
  capsuleSections: ['front', 'middle', 'back'],
  capsuleNumberFormat: 'A01',
  notificationRetentionDays: 30,
  cacheTimeMinutes: 5,
  queryRefreshIntervalSeconds: 30,
  defaultPageSize: 20,
  maxPageSize: 100,
  minGuestAge: 16,
  maxGuestAge: 120,
  defaultAdminEmail: 'admin@pelangicapsule.com',
  supportEmail: 'support@pelangicapsule.com',
  supportPhone: '+60123456789',
  hostelName: 'Pelangi Capsule Hostel',
  timezone: 'Asia/Kuala_Lumpur',
};

/**
 * Primary hook for fetching and caching application configuration from server
 * Returns config object with fallback to defaults if fetch fails
 */
export function useConfig() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/admin/config'],
    queryFn: async () => {
      const response = await fetch('/api/admin/config');
      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }
      const result = await response.json();
      return result.settings as AppConfig;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });

  return {
    config: data || DEFAULT_CONFIG,
    isLoading,
    error,
  };
}

/**
 * Type-safe hook for accessing specific configuration values
 * Automatically falls back to defaults if server config unavailable
 */
export function useConfigValue<K extends keyof AppConfig>(key: K): AppConfig[K] {
  const { config } = useConfig();
  return config[key];
}

/**
 * Converts configured refresh interval from seconds to milliseconds
 * Used by React Query for automatic data refetching
 */
export function useQueryRefreshInterval(): number {
  const intervalSeconds = useConfigValue('queryRefreshIntervalSeconds');
  return intervalSeconds * 1000;
}

/**
 * Converts configured cache time from minutes to milliseconds
 * Used by React Query for data cache management
 */
export function useCacheTime(): number {
  const cacheMinutes = useConfigValue('cacheTimeMinutes');
  return cacheMinutes * 60 * 1000;
}

/**
 * Provides pagination configuration for data tables and lists
 * Ensures consistent pagination behavior across the application
 */
export function usePaginationConfig() {
  const defaultPageSize = useConfigValue('defaultPageSize');
  const maxPageSize = useConfigValue('maxPageSize');
  
  return {
    defaultPageSize,
    maxPageSize,
  };
}

/**
 * Provides guest age validation rules and helper function
 * Used for form validation and business rule enforcement
 */
export function useAgeValidation() {
  const minAge = useConfigValue('minGuestAge');
  const maxAge = useConfigValue('maxGuestAge');
  
  return {
    minAge,
    maxAge,
    isValidAge: (age: number) => age >= minAge && age <= maxAge,
  };
}

/**
 * Provides payment system configuration including methods and limits
 * Centralizes payment-related business rules
 */
export function usePaymentConfig() {
  const defaultMethod = useConfigValue('defaultPaymentMethod');
  const maxAmount = useConfigValue('maxPaymentAmount');
  
  return {
    defaultPaymentMethod: defaultMethod,
    maxPaymentAmount: maxAmount,
    paymentMethods: ['cash', 'tng', 'bank', 'platform'] as const,
  };
}

/**
 * Provides capsule management configuration and validation helpers
 * Defines hostel layout and numbering system
 */
export function useCapsuleConfig() {
  const totalCapsules = useConfigValue('totalCapsules');
  const sections = useConfigValue('capsuleSections');
  const numberFormat = useConfigValue('capsuleNumberFormat');
  
  return {
    totalCapsules,
    sections,
    numberFormat,
    // Validates capsule numbers against configured format pattern
    isValidCapsuleNumber: (number: string) => {
      const pattern = numberFormat.replace(/[A-Z]/g, '[A-Z]').replace(/\d/g, '\\d');
      return new RegExp(`^${pattern}$`).test(number);
    },
  };
}

/**
 * Provides organization contact information for support and administration
 * Used in error messages, help sections, and communication features
 */
export function useContactInfo() {
  const adminEmail = useConfigValue('defaultAdminEmail');
  const supportEmail = useConfigValue('supportEmail');
  const supportPhone = useConfigValue('supportPhone');
  
  return {
    adminEmail,
    supportEmail,
    supportPhone,
  };
}

/**
 * Provides application identity and localization information
 * Used for branding, time formatting, and display purposes
 */
export function useAppInfo() {
  const hostelName = useConfigValue('hostelName');
  const timezone = useConfigValue('timezone');
  
  return {
    hostelName,
    timezone,
  };
}