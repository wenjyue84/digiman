/**
 * Centralized React Query configuration for different query types
 * Defines stale time and cache time for optimal performance
 * Now uses configurable values instead of hardcoded intervals
 */

import { DEFAULT_CONFIG } from '../hooks/useConfig';

// Helper function to get configuration values from localStorage or defaults
function getConfigValue<K extends keyof typeof DEFAULT_CONFIG>(key: K): typeof DEFAULT_CONFIG[K] {
  try {
    const cached = localStorage.getItem('app-config');
    if (cached) {
      const config = JSON.parse(cached);
      return config[key] || DEFAULT_CONFIG[key];
    }
  } catch (error) {
    console.warn('Failed to load cached config:', error);
  }
  return DEFAULT_CONFIG[key];
}

// Time constants in milliseconds
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * Query configuration presets for different data types
 */
export const queryConfigs = {
  // Real-time data that changes frequently
  realtime: {
    staleTime: 60 * SECOND,     // Consider stale after 60 seconds (optimized for dashboard performance)
    gcTime: getConfigValue('cacheTimeMinutes') * MINUTE, // Use configured cache time
    refetchInterval: 90 * SECOND, // Refetch every 90 seconds (optimized, was 30s)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Near real-time data (updates every few minutes)
  nearRealtime: {
    staleTime: 120 * SECOND,    // Consider stale after 120 seconds (optimized for dashboard performance)
    gcTime: getConfigValue('cacheTimeMinutes') * MINUTE, // Use configured cache time
    refetchInterval: 180 * SECOND, // Refetch every 180 seconds (optimized, was 60s)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Frequently changing data (but not real-time critical)
  frequent: {
    staleTime: 1 * MINUTE,       // Consider stale after 1 minute
    gcTime: getConfigValue('cacheTimeMinutes') * 3 * MINUTE, // 3x cache time for frequent data
    refetchInterval: false,      // No auto-refresh
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Moderately changing data
  moderate: {
    staleTime: 5 * MINUTE,       // Consider stale after 5 minutes
    gcTime: 30 * MINUTE,         // Keep in cache for 30 minutes
    refetchInterval: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Rarely changing data (settings, configurations)
  static: {
    staleTime: 30 * MINUTE,      // Consider stale after 30 minutes
    gcTime: 1 * HOUR,            // Keep in cache for 1 hour
    refetchInterval: false,
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnReconnect: false,
  },

  // User session data
  session: {
    staleTime: 10 * MINUTE,      // Consider stale after 10 minutes
    gcTime: 1 * HOUR,            // Keep in cache for 1 hour
    refetchInterval: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Infinite cache (manual invalidation only)
  infinite: {
    staleTime: Infinity,         // Never stale
    gcTime: Infinity,            // Never garbage collect
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
};

/**
 * Get query configuration based on endpoint
 * Maps API endpoints to appropriate cache strategies
 */
export function getQueryConfig(queryKey: unknown[]) {
  const endpoint = queryKey[0] as string;

  // Real-time critical data
  if (endpoint.includes('/api/guests/checked-in') || 
      endpoint.includes('/api/occupancy')) {
    return queryConfigs.realtime;
  }

  // Near real-time data
  if (endpoint.includes('/api/admin/notifications/unread') ||
      endpoint.includes('/api/guest-tokens/active') ||
      endpoint.includes('/api/capsules/available')) {
    return queryConfigs.nearRealtime;
  }

  // Frequently changing data
  if (endpoint.includes('/api/admin/notifications') ||
      endpoint.includes('/api/problems/active') ||
      endpoint.includes('/api/guests/checkout-today')) {
    return queryConfigs.frequent;
  }

  // Moderately changing data
  if (endpoint.includes('/api/guests/history') ||
      endpoint.includes('/api/problems') ||
      endpoint.includes('/api/capsules')) {
    return queryConfigs.moderate;
  }

  // Static/configuration data
  if (endpoint.includes('/api/admin/config') ||
      endpoint.includes('/api/settings') ||
      endpoint.includes('/api/users')) {
    return queryConfigs.static;
  }

  // User authentication/session
  if (endpoint.includes('/api/auth')) {
    return queryConfigs.session;
  }

  // Default configuration for unknown endpoints
  return queryConfigs.moderate;
}

/**
 * Helper to create query options with proper configuration
 */
export function createQueryOptions<T>(
  queryKey: unknown[],
  customConfig?: Partial<typeof queryConfigs.moderate>
) {
  const baseConfig = getQueryConfig(queryKey);
  
  return {
    queryKey,
    ...baseConfig,
    ...customConfig, // Allow overrides
  };
}