import { ReactNode, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ children, requireAuth = false }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      const redirectTarget = encodeURIComponent(location || "/");
      setLocation(`/login?redirect=${redirectTarget}`);
    }
  }, [requireAuth, isAuthenticated, location, setLocation]);

  if (requireAuth && !isAuthenticated) return null;

  return <>{children}</>;
}