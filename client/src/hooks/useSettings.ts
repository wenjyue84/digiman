import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { AuthContext } from "../lib/auth";

/**
 * Hook to access all application settings.
 * Fetches from /api/settings.
 * Requires authentication.
 */
export function useSettings() {
    const authContext = useContext(AuthContext);
    const isAuthenticated = authContext?.isAuthenticated || false;

    return useQuery<Record<string, any>>({
        queryKey: ["/api/settings"],
        enabled: isAuthenticated,
    });
}
