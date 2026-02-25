import { useQuery } from "@tanstack/react-query";
import { BusinessConfig, DEFAULT_BUSINESS_CONFIG } from "@shared/business-config";

/**
 * Hook to access business configuration.
 * Uses React Query with a long staleTime as business config rarely changes.
 * Falls back to DEFAULT_BUSINESS_CONFIG (Pelangi) while loading or on error.
 */
export function useBusinessConfig(): BusinessConfig {
  const { data } = useQuery<BusinessConfig>({
    queryKey: ["/api/business-config"],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  return data || DEFAULT_BUSINESS_CONFIG;
}
