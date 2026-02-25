import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { getQueryConfig } from '@/lib/queryConfig';

/**
 * Intelligent React Query wrapper that applies optimal caching strategies
 * Automatically configures stale time, cache time, and refetch behavior based on endpoint patterns
 * @param queryKey - Query key array where first element should be the API endpoint
 * @param options - Additional query options that can override default configuration
 * @returns Configured useQuery result with smart caching applied
 */
export function useConfiguredQuery<TData = unknown>(
  queryKey: unknown[],
  options?: Omit<UseQueryOptions<TData>, 'queryKey'>
): UseQueryResult<TData> {
  // Apply endpoint-specific caching strategy automatically
  const smartConfig = getQueryConfig(queryKey);
  
  return useQuery<TData>({
    queryKey,
    ...smartConfig,
    ...options, // Custom options take precedence over smart config
  } as UseQueryOptions<TData>);
}
