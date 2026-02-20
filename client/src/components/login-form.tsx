import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { shouldShowDemoFeatures } from "@shared/utils";

declare global {
  interface Window {
    google: any;
  }
}

const DB_MESSAGE_KEY = "pelangi-login-db-message";

function isDatabaseError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("database unavailable") ||
    lower.includes("db:push") ||
    (lower.includes("neon") && (lower.includes("limit") || lower.includes("exceed") || lower.includes("suspended")))
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useLocation();
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [isStartingBackend, setIsStartingBackend] = useState(false);
  const [backendStartError, setBackendStartError] = useState<string | null>(null);

  // Persistent database-error message (bottom right); restored from sessionStorage on load
  const [databaseMessage, setDatabaseMessage] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return sessionStorage.getItem(DB_MESSAGE_KEY);
    } catch {
      return null;
    }
  });

  // Get storage info to determine if we should auto-fill credentials
  const { data: storageInfo, isLoading: isStorageLoading, error: storageError, refetch: refetchStorageInfo } = useQuery<{type: string; isDatabase: boolean; label: string}>({
    queryKey: ["/api/storage/info"],
    staleTime: 60000, // Cache for 1 minute
    retry: false // Don't retry if it fails
  });

  useEffect(() => {
    // If already authenticated, bounce to redirect target immediately
    if (isAuthenticated) {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(search);
      const rawRedirect = params.get("redirect") || "/dashboard";
      let redirect = "/dashboard";
      try {
        const decoded = decodeURIComponent(rawRedirect);
        redirect = decoded.startsWith('/') ? decoded : '/dashboard';
      } catch {
        redirect = '/dashboard';
      }
      setLocation(redirect);
      return;
    }

    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        console.log("Google Client ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "717199613266-2olcm8aqakh45pceuc6k8c9l295956g9.apps.googleusercontent.com",
          callback: handleGoogleSignIn,
        });

        // Delay rendering to ensure DOM element exists
        setTimeout(() => {
          const element = document.getElementById("google-signin-button");
          if (element) {
            window.google.accounts.id.renderButton(element, { 
              theme: "outline", 
              size: "large", 
              text: "signin_with",
              shape: "rectangular"
            });
          }
        }, 100);
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Auto-fill credentials when using memory storage (development mode)
  useEffect(() => {
    console.log("Storage info debug:", {
      storageInfo,
      isStorageLoading,
      storageError,
      isDatabase: storageInfo?.isDatabase,
      type: storageInfo?.type
    });
    
    if (storageInfo && !storageInfo.isDatabase) {
      console.log("Auto-filling credentials for memory storage");
      // Using memory storage - auto-fill credentials for development convenience
      setEmail("admin");
      setPassword("admin123");
    } else if (storageError) {
      console.error("Failed to get storage info:", storageError);
      // Fallback: auto-fill on localhost for development
      if (shouldShowDemoFeatures()) {
        console.log("Fallback: Auto-filling credentials on localhost");
        setEmail("admin");
        setPassword("admin123");
      }
    }
  }, [storageInfo, isStorageLoading, storageError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      toast({
        title: "🎉 Login Successful!",
        description: "Welcome back! Redirecting...",
        duration: 3000,
        className: "border-green-500 bg-green-50 text-green-800 shadow-lg text-base font-semibold"
      });
      // Redirect back to intended page if present
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(search);
      const rawRedirect = params.get("redirect") || "/dashboard";
      let redirect = "/dashboard";
      try {
        const decoded = decodeURIComponent(rawRedirect);
        redirect = decoded.startsWith('/') ? decoded : '/dashboard';
      } catch {
        redirect = '/dashboard';
      }
      setTimeout(() => {
        setLocation(redirect);
      }, 800);
    } else {
      // Show specific error message from server
      toast({
        title: "Login Failed",
        description: result.error || "An unexpected error occurred",
        variant: "destructive"
      });
      // If it's a database problem, show persistent message at bottom right
      if (result.error && isDatabaseError(result.error)) {
        const msg = result.error;
        setDatabaseMessage(msg);
        try {
          sessionStorage.setItem(DB_MESSAGE_KEY, msg);
        } catch {}
      }
    }
    
    setIsLoading(false);
  };

  const dismissDatabaseMessage = () => {
    setDatabaseMessage(null);
    try {
      sessionStorage.removeItem(DB_MESSAGE_KEY);
    } catch {}
  };

  const handleGoogleSignIn = async (response: any) => {
    setIsLoading(true);

    const result = await loginWithGoogle(response.credential);

    if (result.success) {
      toast({
        title: "🎉 Google Login Successful!",
        description: "Welcome! Redirecting...",
        duration: 3000,
        className: "border-green-500 bg-green-50 text-green-800 shadow-lg text-base font-semibold"
      });
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(search);
      const rawRedirect = params.get("redirect") || "/dashboard";
      let redirect = "/dashboard";
      try {
        const decoded = decodeURIComponent(rawRedirect);
        redirect = decoded.startsWith('/') ? decoded : '/dashboard';
      } catch {
        redirect = '/dashboard';
      }
      setTimeout(() => {
        setLocation(redirect);
      }, 800);
    } else {
      toast({
        title: "Google Login Failed",
        description: result.error || "Unable to sign in with Google",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  const handleStartBackend = async () => {
    setIsStartingBackend(true);
    setBackendStartError(null);

    try {
      const response = await fetch('/__dev/start-backend', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Backend Server Started!",
          description: data.alreadyRunning
            ? "Backend was already running"
            : "Backend server is now running on port 5000",
          duration: 3000,
          className: "border-green-500 bg-green-50 text-green-800"
        });

        // Refetch storage info to update UI
        setTimeout(() => {
          refetchStorageInfo();
        }, 1000);
      } else {
        setBackendStartError(data.message || 'Failed to start backend server');
        toast({
          title: "Failed to Start Backend",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setBackendStartError(errorMessage);
      toast({
        title: "Error Starting Backend",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsStartingBackend(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 px-4 py-8">
      <Card className="w-full max-w-sm sm:max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-orange-700">Pelangi Capsule Hostel</CardTitle>
          <CardDescription>Management System Login</CardDescription>

          {/* Backend Connection Error with Start Button */}
          {storageError && !isStartingBackend && (
            <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 text-red-700 font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Backend Server Not Running
                </div>
                <p className="text-xs text-red-600">
                  The backend server on port 5000 is not responding
                </p>
              </div>
              <Button
                onClick={handleStartBackend}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Start Backend Server
              </Button>
              {backendStartError && (
                <p className="text-xs text-red-600 mt-2">{backendStartError}</p>
              )}
            </div>
          )}

          {/* Backend Starting Indicator */}
          {isStartingBackend && (
            <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-semibold">Starting Backend Server...</span>
              </div>
              <p className="text-xs text-blue-600 text-center mt-2">
                This may take up to 30 seconds
              </p>
            </div>
          )}

          {/* Development Mode Indicators (when backend is running) */}
          {!storageError && storageInfo && !storageInfo.isDatabase && (
            <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700 border border-green-200">
              <strong>Development Mode:</strong> Credentials auto-filled (Memory Storage)
            </div>
          )}
          {!storageError && typeof window !== 'undefined' &&
            shouldShowDemoFeatures() &&
            (!storageInfo || storageInfo.isDatabase) && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-600">
                <strong>Demo Login:</strong> admin / admin123
              </div>
            )}
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Username or Email</Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          
          <div className="my-4 flex items-center">
            <hr className="flex-1 border-gray-300" />
            <span className="px-3 text-sm text-gray-500">or</span>
            <hr className="flex-1 border-gray-300" />
          </div>
          
          <div id="google-signin-button" className="w-full"></div>
          
          {typeof window !== 'undefined' &&
            shouldShowDemoFeatures() && (
              <div className="mt-4 text-sm text-gray-600 text-center">
                <p>Demo Login: admin@pelangi.com / admin123</p>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Persistent database-error message at bottom right */}
      {databaseMessage && (
        <div
          className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-lg"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Database issue</p>
              <p className="mt-1 text-sm text-amber-800">{databaseMessage}</p>
            </div>
            <button
              type="button"
              onClick={dismissDatabaseMessage}
              className="shrink-0 rounded p-1 text-amber-600 hover:bg-amber-200 hover:text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}