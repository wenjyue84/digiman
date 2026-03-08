import { ReactNode, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ children, requireAuth = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    if (isLoading) return;
    if (requireAuth && !isAuthenticated) {
      const redirectTarget = encodeURIComponent(locationRef.current || "/");
      setLocation(`/login?redirect=${redirectTarget}`);
    }
  }, [requireAuth, isAuthenticated, isLoading, setLocation]);

  if (isLoading) return null;
  return requireAuth && !isAuthenticated ? null : <>{children}</>;
}
