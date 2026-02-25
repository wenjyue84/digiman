import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { usePageVisibility } from './usePageVisibility';
import { getQueryConfig } from '@/lib/queryConfig';

interface VisibilityQueryOptions<TData> extends Omit<UseQueryOptions<TData>, 'enabled'> {
  enabled?: boolean;
  pauseWhenHidden?: boolean;
  refetchIntervalWhenVisible?: number | false;
  useSmartConfig?: boolean; // Use smart configuration based on endpoint
}

/**
 * Custom hook that wraps useQuery with visibility-aware behavior
 * Automatically pauses queries when the tab is hidden and resumes when visible
 * Applies smart caching configurations based on endpoint type
 */
export function useVisibilityQuery<TData = unknown>(
  options: VisibilityQueryOptions<TData>
): UseQueryResult<TData> {
  const isVisible = usePageVisibility();
  
  const {
    enabled = true,
    pauseWhenHidden = true,
    refetchIntervalWhenVisible,
    useSmartConfig = true,
    queryKey,
    refetchInterval,
    staleTime,
    gcTime,
    ...restOptions
  } = options;

  // Get smart configuration if enabled
  const smartConfig = useSmartConfig && queryKey ? getQueryConfig(Array.isArray(queryKey) ? queryKey : [queryKey]) : null;
  
  // Merge configurations with priority: custom > smart > default
  const finalStaleTime = staleTime ?? smartConfig?.staleTime;
  const finalGcTime = gcTime ?? smartConfig?.gcTime;
  const baseRefetchInterval = refetchInterval ?? smartConfig?.refetchInterval;
  
  // Determine if query should be enabled based on visibility
  const queryEnabled = pauseWhenHidden ? (enabled && isVisible) : enabled;
  
  // Use refetch interval only when visible
  const activeRefetchInterval = isVisible 
    ? (refetchIntervalWhenVisible || baseRefetchInterval) 
    : false;

  return useQuery({
    ...restOptions,
    queryKey,
    enabled: queryEnabled,
    refetchInterval: activeRefetchInterval as number | false,
    staleTime: finalStaleTime,
    gcTime: finalGcTime,
    refetchOnWindowFocus: smartConfig?.refetchOnWindowFocus ?? restOptions.refetchOnWindowFocus,
    refetchOnReconnect: smartConfig?.refetchOnReconnect ?? restOptions.refetchOnReconnect,
  });
}
