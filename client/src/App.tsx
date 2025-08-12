import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalErrorBoundary } from "./components/global-error-boundary";
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
import GuestCheckin from "./pages/guest-checkin";
import GuestEdit from "./pages/guest-edit";
import Header from "./components/header";
import Navigation from "./components/navigation";
import MobileBottomNav from "./components/mobile-bottom-nav";
import { VisibilityIndicator } from "./components/visibility-indicator";
import { toast } from "@/hooks/use-toast";
import GlobalTopProgress from "./components/global-top-progress";
import { ThemeProvider } from "./lib/theme";

function Router() {
  return (
    <div className="min-h-screen bg-hostel-background dark:bg-gray-900">
      <GlobalTopProgress />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 md:pb-4 animate-fade-in">
        <Navigation />
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
          <Route path="/settings">
            <ProtectedRoute requireAuth={true}>
              <Settings />
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

// Create I18n provider instance
const I18nProvider = createI18nProvider();

function App() {
  const handleGlobalError = (error: Error) => {
    console.error('Global error caught:', error);
    
    // Show user-friendly error toast
    toast({
      title: "Something went wrong",
      description: "An unexpected error occurred. Please try refreshing the page.",
      variant: "destructive",
    });
  };

  return (
    <GlobalErrorBoundary onError={handleGlobalError}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ThemeProvider>
            <AuthProvider>
              <TooltipProvider>
                <Router />
                <Toaster />
                <VisibilityIndicator />
              </TooltipProvider>
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
