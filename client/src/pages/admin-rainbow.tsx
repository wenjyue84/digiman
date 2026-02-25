import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Redirects to the HTML-based Rainbow Admin Dashboard
 * served directly by the MCP server (no CORS issues).
 * Handles all /admin/rainbow/* sub-paths dynamically.
 */
export default function AdminRainbow() {
  const [location] = useLocation();

  useEffect(() => {
    // Extract the sub-path after /admin/rainbow (e.g., /dashboard, /responses, etc.)
    const subPath = location.replace('/admin/rainbow', '').replace(/^\//, '');
    const hash = subPath ? `#${subPath}` : '#dashboard';
    const RAINBOW_URL = import.meta.env.VITE_RAINBOW_URL || "http://localhost:3002";
    window.location.href = `${RAINBOW_URL}/${hash}`;
  }, [location]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
      Redirecting to Rainbow Admin Dashboard...
    </div>
  );
}
