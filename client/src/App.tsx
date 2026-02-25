import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { getQueryFn } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalErrorBoundary } from "./components/global-error-boundary";
import { DatabaseErrorBoundary } from "./components/DatabaseErrorBoundary";
import AuthProvider from "./components/auth-provider";
import { ProtectedRoute } from "./components/protected-route";
import { createI18nProvider } from "./lib/i18n";
import { LoginForm } from "./components/login-form";
import { useAuth } from "./lib/auth";
import NotFound from "./pages/not-found";
import Dashboard from "./pages/dashboard";
import CheckIn from "./pages/check-in";
import CheckOut from "./pages/check-out";
import History from "./pages/history";
import Cleaning from "./pages/cleaning";
import Settings from "./pages/settings";
import Help from "./pages/help";
import Finance from "./pages/finance";
import GuestCheckin from "./pages/guest-checkin";
import GuestEdit from "./pages/guest-edit";
import GuestSuccess from "./pages/guest-success";
import GuestGuide from "./pages/guest-guide";
// REMOVED: AdminRainbow - NO redirects from port 3000 to port 3002!
// Rainbow admin is ONLY accessible directly via VITE_RAINBOW_URL (defaults to http://localhost:3002/#dashboard)
import IntentManager from "./pages/intent-manager";
import Header from "./components/header";
import Navigation from "./components/navigation";
import MobileBottomNav from "./components/mobile-bottom-nav";
import { VisibilityIndicator } from "./components/visibility-indicator";
import { toast } from "@/hooks/use-toast";
import GlobalTopProgress from "./components/global-top-progress";
import { OfflineIndicator } from "./components/ui/offline-indicator";
import FirstRunWizard from "./components/FirstRunWizard";

/** Syncs document.title to the appTitle setting (falls back to "digiman") */
function AppTitleSync() {
  const { data: settings } = useQuery<{ appTitle?: string }>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60000,
    retry: false,
  });
  useEffect(() => {
    const title = settings?.appTitle?.trim();
    document.title = title || "digiman";
  }, [settings?.appTitle]);
  return null;
}

/**
 * Main router component handling all application routes
 * Wraps content with layout components and progress indicator
 */
function Router() {
  const [location] = useLocation();

  // Hide navigation for guest-facing pages and admin pages
  const isGuestPage = location?.startsWith('/guest-') || false;
  const isAdminPage = location?.startsWith('/admin/') || false;
  const shouldHideNavigation = isGuestPage || isAdminPage;

  return (
    <div className="min-h-screen bg-hostel-background">
      <GlobalTopProgress />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 md:pb-4 animate-fade-in">
        {!shouldHideNavigation && <Navigation />}
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/check-in">
            <ProtectedRoute requireAuth={true}>
              <CheckIn />
            </ProtectedRoute>
          </Route>
          <Route path="/check-out">
            <ProtectedRoute requireAuth={true}>
              <CheckOut />
            </ProtectedRoute>
          </Route>
          <Route path="/cleaning">
            <ProtectedRoute requireAuth={true}>
              <Cleaning />
            </ProtectedRoute>
          </Route>
          <Route path="/history" component={History} />
          <Route path="/guest-checkin" component={GuestCheckin} />
          <Route path="/guest-edit" component={GuestEdit} />
          <Route path="/guest-success" component={GuestSuccess} />
          <Route path="/settings">
            <ProtectedRoute requireAuth={true}>
              <Settings />
            </ProtectedRoute>
          </Route>
          <Route path="/help">
            <ProtectedRoute requireAuth={true}>
              <Help />
            </ProtectedRoute>
          </Route>
          <Route path="/finance">
            <ProtectedRoute requireAuth={true}>
              <Finance />
            </ProtectedRoute>
          </Route>
          <Route path="/guest-guide">
            <ProtectedRoute requireAuth={true}>
              <GuestGuide />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/intent-manager">
            <ProtectedRoute requireAuth={true}>
              <IntentManager />
            </ProtectedRoute>
          </Route>
          {/* REMOVED: /admin/rainbow route - NO redirects from port 3000 to port 3002! */}
          {/* Access Rainbow admin directly via VITE_RAINBOW_URL (defaults to http://localhost:3002/#dashboard) */}
          <Route path="/login" component={LoginForm} />
          <Route component={NotFound} />
        </Switch>
      </div>
      {!shouldHideNavigation && <MobileBottomNav />}
    </div>
  );
}

/** Reads auth state and passes it to FirstRunWizard — must be inside AuthProvider */
function FirstRunWizardBridge() {
  const { isAuthenticated } = useAuth();
  return <FirstRunWizard isAuthenticated={isAuthenticated} />;
}

// Initialize internationalization provider for multi-language support
const I18nProvider = createI18nProvider();

/**
 * Root application component with global providers and error handling
 * Sets up React Query, i18n, authentication, and error boundaries
 */
function App() {
  // Handle uncaught errors throughout the application
  const handleGlobalError = (error: Error) => {
    console.error('Global error caught:', error);

    // Display user-friendly error message to prevent confusion
    toast({
      title: "Something went wrong",
      description: "An unexpected error occurred. Please try refreshing the page.",
      variant: "destructive",
    });
  };

  return (
    <GlobalErrorBoundary onError={handleGlobalError}>
      <DatabaseErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <AuthProvider>
              <TooltipProvider>
                <AppTitleSync />
                <FirstRunWizardBridge />
                <Router />
                <Toaster />
                <VisibilityIndicator />
                <OfflineIndicator />
              </TooltipProvider>
            </AuthProvider>
          </I18nProvider>
        </QueryClientProvider>
      </DatabaseErrorBoundary>
    </GlobalErrorBoundary>
  );
}

export default App;
