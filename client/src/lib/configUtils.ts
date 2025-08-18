/**
 * Advanced configuration management utilities
 * Complements useConfig.ts with additional configuration helpers
 * Eliminates repeated configuration fetching and processing patterns
 */

import { useQuery } from '@tanstack/react-query';
import { useConfig, useConfigValue, AppConfig } from '@/hooks/useConfig';

/**
 * Configuration constants and defaults for common UI patterns
 * Centralizes hardcoded values and makes them configurable
 */
export const CONFIG_DEFAULTS = {
  // Form defaults
  DEFAULT_PAYMENT_METHODS: ['cash', 'tng', 'bank', 'platform'] as const,
  DEFAULT_CAPSULE_STATUSES: ['available', 'occupied', 'maintenance', 'cleaning'] as const,
  DEFAULT_GUEST_GENDERS: ['Male', 'Female', 'Other'] as const,
  DEFAULT_PAYMENT_COLLECTORS: ['Admin', 'Staff', 'Self-Service'] as const,
  
  // Pagination defaults
  DEFAULT_PAGE_SIZES: [10, 20, 50, 100] as const,
  DEFAULT_TABLE_PAGE_SIZE: 20,
  
  // UI defaults
  DEFAULT_CACHE_TIME: 5 * 60 * 1000, // 5 minutes
  DEFAULT_STALE_TIME: 2 * 60 * 1000, // 2 minutes
  DEFAULT_RETRY_COUNT: 3,
  
  // Validation defaults
  DEFAULT_NAME_MAX_LENGTH: 100,
  DEFAULT_PHONE_MAX_LENGTH: 20,
  DEFAULT_EMAIL_MAX_LENGTH: 254,
  DEFAULT_NOTES_MAX_LENGTH: 500,
  
  // File upload defaults
  DEFAULT_MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  DEFAULT_ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'] as const,
  DEFAULT_MAX_FILES_PER_UPLOAD: 1,
} as const;

/**
 * Configuration-based form field helpers
 * Provides consistent form field configurations based on app settings
 */
export const useFormFieldConfig = () => {
  const { config } = useConfig();
  
  return {
    /**
     * Gets payment method options from configuration
     */
    getPaymentMethods: () => {
      return CONFIG_DEFAULTS.DEFAULT_PAYMENT_METHODS.map(method => ({
        value: method,
        label: method.charAt(0).toUpperCase() + method.slice(1),
        isDefault: method === config.defaultPaymentMethod,
      }));
    },

    /**
     * Gets payment amount presets based on configuration
     */
    getPaymentPresets: () => {
      // Common pricing tiers - could be made configurable
      const presets = [
        { value: '45', label: 'RM45 (Standard)', isDefault: true },
        { value: '48', label: 'RM48 (Premium)', isDefault: false },
        { value: '650', label: 'RM650 (Monthly Package)', isDefault: false },
      ];
      
      return presets.filter(preset => parseFloat(preset.value) <= config.maxPaymentAmount);
    },

    /**
     * Gets field length limits from configuration
     */
    getFieldLimits: () => ({
      nameMaxLength: CONFIG_DEFAULTS.DEFAULT_NAME_MAX_LENGTH,
      phoneMaxLength: CONFIG_DEFAULTS.DEFAULT_PHONE_MAX_LENGTH,
      emailMaxLength: CONFIG_DEFAULTS.DEFAULT_EMAIL_MAX_LENGTH,
      notesMaxLength: CONFIG_DEFAULTS.DEFAULT_NOTES_MAX_LENGTH,
      minGuestAge: config.minGuestAge,
      maxGuestAge: config.maxGuestAge,
      maxPaymentAmount: config.maxPaymentAmount,
    }),

    /**
     * Gets capsule configuration for forms
     */
    getCapsuleConfig: () => ({
      totalCapsules: config.totalCapsules,
      sections: config.capsuleSections,
      numberFormat: config.capsuleNumberFormat,
      statuses: CONFIG_DEFAULTS.DEFAULT_CAPSULE_STATUSES,
    }),
  };
};

/**
 * Configuration-based query options for React Query
 * Provides consistent query configurations based on app settings
 */
export const useQueryConfig = () => {
  const cacheTime = useConfigValue('cacheTimeMinutes') * 60 * 1000;
  const refreshInterval = useConfigValue('queryRefreshIntervalSeconds') * 1000;
  
  return {
    /**
     * Default query options for frequently changing data
     */
    getDefaultOptions: () => ({
      staleTime: cacheTime / 2,
      gcTime: cacheTime,
      retry: CONFIG_DEFAULTS.DEFAULT_RETRY_COUNT,
      refetchOnWindowFocus: false,
    }),

    /**
     * Query options for real-time data (guest check-ins, occupancy)
     */
    getRealTimeOptions: () => ({
      staleTime: 0, // Always consider stale for real-time data
      gcTime: 30 * 1000, // 30 seconds
      refetchInterval: refreshInterval,
      retry: CONFIG_DEFAULTS.DEFAULT_RETRY_COUNT,
    }),

    /**
     * Query options for static data (settings, configuration)
     */
    getStaticOptions: () => ({
      staleTime: cacheTime * 2, // Cache longer for static data
      gcTime: cacheTime * 4,
      retry: 1, // Fewer retries for static data
      refetchOnWindowFocus: false,
    }),

    /**
     * Query options for user-specific data
     */
    getUserOptions: () => ({
      staleTime: cacheTime,
      gcTime: cacheTime * 2,
      retry: CONFIG_DEFAULTS.DEFAULT_RETRY_COUNT,
      refetchOnWindowFocus: true, // Refetch when user returns
    }),
  };
};

/**
 * Configuration-based pagination helpers
 * Provides consistent pagination behavior based on app settings
 */
export const usePaginationConfig = () => {
  const defaultPageSize = useConfigValue('defaultPageSize');
  const maxPageSize = useConfigValue('maxPageSize');
  
  return {
    /**
     * Gets default pagination settings
     */
    getDefaultPagination: () => ({
      page: 1,
      limit: defaultPageSize,
      maxLimit: maxPageSize,
    }),

    /**
     * Gets page size options for dropdowns
     */
    getPageSizeOptions: () => {
      return CONFIG_DEFAULTS.DEFAULT_PAGE_SIZES
        .filter(size => size <= maxPageSize)
        .map(size => ({
          value: size.toString(),
          label: `${size} items`,
          isDefault: size === defaultPageSize,
        }));
    },

    /**
     * Calculates pagination info
     */
    calculatePagination: (total: number, page: number, limit: number) => ({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
      startItem: ((page - 1) * limit) + 1,
      endItem: Math.min(page * limit, total),
    }),
  };
};

/**
 * Configuration-based file upload helpers
 * Provides consistent file upload settings based on app configuration
 */
export const useFileUploadConfig = () => {
  const { config } = useConfig();
  
  return {
    /**
     * Gets file upload configuration for documents/photos
     */
    getUploadConfig: () => ({
      maxFileSize: CONFIG_DEFAULTS.DEFAULT_MAX_FILE_SIZE,
      maxFiles: CONFIG_DEFAULTS.DEFAULT_MAX_FILES_PER_UPLOAD,
      acceptedTypes: CONFIG_DEFAULTS.DEFAULT_ACCEPTED_IMAGE_TYPES,
      showCameraOption: true,
    }),

    /**
     * Validates file before upload
     */
    validateFile: (file: File) => {
      const errors: string[] = [];
      
      if (file.size > CONFIG_DEFAULTS.DEFAULT_MAX_FILE_SIZE) {
        errors.push(`File size must be less than ${CONFIG_DEFAULTS.DEFAULT_MAX_FILE_SIZE / 1024 / 1024}MB`);
      }
      
      if (!CONFIG_DEFAULTS.DEFAULT_ACCEPTED_IMAGE_TYPES.includes(file.type as any)) {
        errors.push('File must be a JPEG, PNG, or GIF image');
      }
      
      return {
        isValid: errors.length === 0,
        errors,
      };
    },

    /**
     * Formats file size for display
     */
    formatFileSize: (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
  };
};

/**
 * Configuration-based business rules helpers
 * Centralizes business logic that depends on configuration
 */
export const useBusinessRules = () => {
  const { config } = useConfig();
  
  return {
    /**
     * Gets age validation rules
     */
    getAgeRules: () => ({
      minAge: config.minGuestAge,
      maxAge: config.maxGuestAge,
      isValidAge: (age: number) => age >= config.minGuestAge && age <= config.maxGuestAge,
      getAgeError: (age: number) => {
        if (age < config.minGuestAge) return `Minimum age is ${config.minGuestAge}`;
        if (age > config.maxGuestAge) return `Maximum age is ${config.maxGuestAge}`;
        return null;
      },
    }),

    /**
     * Gets payment validation rules
     */
    getPaymentRules: () => ({
      maxAmount: config.maxPaymentAmount,
      defaultMethod: config.defaultPaymentMethod,
      isValidAmount: (amount: number) => amount >= 0 && amount <= config.maxPaymentAmount,
      getAmountError: (amount: number) => {
        if (amount < 0) return 'Amount cannot be negative';
        if (amount > config.maxPaymentAmount) return `Maximum amount is RM${config.maxPaymentAmount}`;
        return null;
      },
    }),

    /**
     * Gets stay duration rules
     */
    getStayRules: () => ({
      maxStayDays: config.maxGuestStayDays,
      isValidStay: (days: number) => days > 0 && days <= config.maxGuestStayDays,
      getStayError: (days: number) => {
        if (days <= 0) return 'Stay duration must be at least 1 day';
        if (days > config.maxGuestStayDays) return `Maximum stay is ${config.maxGuestStayDays} days`;
        return null;
      },
      getMaxCheckoutDate: () => {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + config.maxGuestStayDays);
        return maxDate.toISOString().split('T')[0];
      },
    }),
  };
};

/**
 * Configuration-based UI behavior helpers
 * Controls UI behavior based on configuration settings
 */
export const useUIConfig = () => {
  const { config } = useConfig();
  
  return {
    /**
     * Gets notification settings for UI
     */
    getNotificationConfig: () => ({
      retentionDays: config.notificationRetentionDays,
      autoRefresh: true,
      showUnreadCount: true,
      maxDisplayCount: 99,
    }),

    /**
     * Gets branding information
     */
    getBrandingConfig: () => ({
      hostelName: config.hostelName,
      timezone: config.timezone,
      supportEmail: config.supportEmail,
      supportPhone: config.supportPhone,
    }),

    /**
     * Gets feature flags based on configuration
     */
    getFeatureFlags: () => ({
      enableGuestSelfCheckin: config.guestTokenExpirationHours > 0,
      enableAdvancedReports: true, // Could be made configurable
      enableBulkOperations: true,
      enableGuestProfiles: true,
      maxConcurrentGuests: config.totalCapsules,
    }),

    /**
     * Gets display format preferences
     */
    getDisplayFormats: () => ({
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      currencySymbol: 'RM',
      currencyFormat: (amount: number) => `RM${amount.toFixed(2)}`,
      phoneFormat: (phone: string) => {
        // Format Malaysian phone numbers
        if (phone.startsWith('+60')) {
          return phone.replace(/(\+60)(\d{1,2})(\d{3,4})(\d{4})/, '$1 $2 $3 $4');
        }
        return phone;
      },
    }),
  };
};

/**
 * Configuration change detection and management
 * Helps manage configuration updates and their effects
 */
export const useConfigManagement = () => {
  const { config, isLoading, error } = useConfig();
  
  return {
    /**
     * Checks if configuration is loaded
     */
    isConfigReady: () => !isLoading && !error && config,

    /**
     * Gets configuration status
     */
    getConfigStatus: () => ({
      isLoading,
      hasError: !!error,
      isReady: !isLoading && !error,
      errorMessage: error?.message || null,
    }),

    /**
     * Compares configuration values
     */
    hasConfigChanged: (oldConfig: Partial<AppConfig>, newConfig: Partial<AppConfig>) => {
      const keys = Object.keys(oldConfig) as (keyof AppConfig)[];
      return keys.some(key => oldConfig[key] !== newConfig[key]);
    },

    /**
     * Gets configuration summary for debugging
     */
    getConfigSummary: () => ({
      totalCapsules: config.totalCapsules,
      paymentMethod: config.defaultPaymentMethod,
      maxAmount: config.maxPaymentAmount,
      cacheTime: config.cacheTimeMinutes,
      refreshInterval: config.queryRefreshIntervalSeconds,
      hostelName: config.hostelName,
      isDefaultConfig: !config.defaultAdminEmail.includes('pelangi'),
    }),
  };
};

/**
 * Utility for getting configuration-based CSS classes and styles
 * Provides consistent styling based on configuration
 */
export const useConfigStyles = () => {
  const { config } = useConfig();
  
  return {
    /**
     * Gets status-based CSS classes
     */
    getStatusStyles: (status: string) => {
      const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
      
      switch (status.toLowerCase()) {
        case 'available':
          return `${baseClasses} bg-green-100 text-green-800`;
        case 'occupied':
          return `${baseClasses} bg-blue-100 text-blue-800`;
        case 'maintenance':
          return `${baseClasses} bg-yellow-100 text-yellow-800`;
        case 'cleaning':
          return `${baseClasses} bg-purple-100 text-purple-800`;
        case 'active':
          return `${baseClasses} bg-green-100 text-green-800`;
        case 'inactive':
          return `${baseClasses} bg-gray-100 text-gray-800`;
        case 'paid':
          return `${baseClasses} bg-green-100 text-green-800`;
        case 'unpaid':
          return `${baseClasses} bg-red-100 text-red-800`;
        default:
          return `${baseClasses} bg-gray-100 text-gray-800`;
      }
    },

    /**
     * Gets priority-based CSS classes
     */
    getPriorityStyles: (priority: 'low' | 'medium' | 'high') => {
      const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
      
      switch (priority) {
        case 'high':
          return `${baseClasses} bg-red-100 text-red-800`;
        case 'medium':
          return `${baseClasses} bg-yellow-100 text-yellow-800`;
        case 'low':
          return `${baseClasses} bg-green-100 text-green-800`;
        default:
          return `${baseClasses} bg-gray-100 text-gray-800`;
      }
    },

    /**
     * Gets configuration-based theme classes
     */
    getThemeClasses: () => ({
      primaryButton: 'bg-hostel-accent hover:bg-hostel-accent/90 text-white',
      secondaryButton: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
      dangerButton: 'bg-red-500 hover:bg-red-600 text-white',
      successButton: 'bg-green-500 hover:bg-green-600 text-white',
      cardBackground: 'bg-white border border-gray-200 rounded-lg shadow-sm',
      inputField: 'border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-hostel-accent',
    }),
  };
};