import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import Finance from "./pages/finance";
import GuestCheckin from "./pages/guest-checkin";
import GuestEdit from "./pages/guest-edit";
import GuestSuccess from "./pages/guest-success";
import GuestGuide from "./pages/guest-guide";
import Header from "./components/header";
import Navigation from "./components/navigation";
import MobileBottomNav from "./components/mobile-bottom-nav";
import { VisibilityIndicator } from "./components/visibility-indicator";
import { toast } from "@/hooks/use-toast";
import GlobalTopProgress from "./components/global-top-progress";
import { OfflineIndicator } from "./components/ui/offline-indicator";

/**
 * Main router component handling all application routes
 * Wraps content with layout components and progress indicator
 */
function Router() {
  const [location] = useLocation();
  
  // Hide navigation for guest-facing pages
  const isGuestPage = location?.startsWith('/guest-') || false;
  
  return (
    <div className="min-h-screen bg-hostel-background">
      <GlobalTopProgress />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 md:pb-4 animate-fade-in">
        {!isGuestPage && <Navigation />}
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
          <Route path="/login" component={LoginForm} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <MobileBottomNav />
    </div>
  );
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
