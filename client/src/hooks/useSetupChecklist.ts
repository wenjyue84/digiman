import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useCallback } from "react";

// localStorage is only a fast-path cache. Neon DB is the authoritative source.
const DISMISS_LS_KEY = "setupChecklistDismissed";

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  href: string;
  /** undefined means item is not a Rainbow AI item; false means Rainbow is offline */
  available?: boolean;
}

interface SetupChecklistData {
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
}

export function useSetupChecklist() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<SetupChecklistData>({
    queryKey: ["/api/setup/checklist"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60_000,
    retry: false,
  });

  // DB is authoritative; localStorage is a fast-path cache to avoid an extra round-trip.
  const { data: dismissStatus } = useQuery<{ dismissed: boolean }>({
    queryKey: ["/api/setup/dismiss-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: localStorage.getItem(DISMISS_LS_KEY) !== "true",
    staleTime: Infinity,
  });

  const isDismissed =
    localStorage.getItem(DISMISS_LS_KEY) === "true" ||
    dismissStatus?.dismissed === true;

  const dismissMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/setup/dismiss"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/setup/dismiss-status"] });
    },
  });

  const dismiss = useCallback(() => {
    // Fast-path: set localStorage immediately so the card disappears now
    localStorage.setItem(DISMISS_LS_KEY, "true");
    // Persist to Neon DB so it survives across browsers and sessions
    dismissMutation.mutate();
  }, [dismissMutation]);

  const items = data?.items ?? [];
  const completedCount = data?.completedCount ?? 0;
  const totalCount = data?.totalCount ?? 6;
  const isAllComplete = totalCount > 0 && completedCount === totalCount;

  return {
    items,
    completedCount,
    totalCount,
    isAllComplete,
    isDismissed,
    dismiss,
    isLoading,
  };
}
