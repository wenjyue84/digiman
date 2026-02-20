import { useContext, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Home, UserPlus, UserX, Settings, Clock, LayoutGrid, LogOut, ChevronRightCircle, CalendarDays, ListChecks, Database, HardDrive, DollarSign, User, HelpCircle } from "lucide-react";
import { AuthContext } from "../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { DatabaseStatus } from "./DatabaseSelector";

const navigationItems = [
  {
    path: "/",
    label: "Dashboard",
    icon: LayoutGrid,
    color: "text-indigo-600 bg-indigo-50",
    tooltip: "View occupancy overview, current guests, and system status",
    id: "nav-dashboard"
  },
  {
    path: "/history",
    label: "History",
    icon: Clock,
    color: "text-purple-600 bg-purple-50",
    requireAuth: true,
    tooltip: "View past guests and check-out history"
  },
  {
    path: "/check-in",
    label: "Check In",
    icon: UserPlus,
    color: "text-green-600 bg-green-50",
    requireAuth: true,
    tooltip: "Register new guests and assign capsules"
  },
  {
    path: "/check-out",
    label: "Check Out",
    icon: UserX,
    color: "text-red-600 bg-red-50",
    requireAuth: true,
    tooltip: "Process guest departures and free capsules"
  },
  {
    path: "/cleaning",
    label: "Clean",
    icon: ListChecks,
    color: "text-emerald-600 bg-emerald-50",
    requireAuth: true,
    tooltip: "Manage capsule cleaning status and maintenance tasks"
  },
  {
    path: "/finance",
    label: "Finance",
    icon: DollarSign,
    color: "text-orange-600 bg-orange-50",
    requireAuth: true,
    tooltip: "Track expenses, repairs, utilities, and financial records"
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    color: "text-blue-600 bg-blue-50",
    requireAuth: true,
    tooltip: "Configure system settings, guest guide, and user management",
    id: "nav-settings"
  },
  {
    path: "/help",
    label: "Help",
    icon: HelpCircle,
    color: "text-cyan-600 bg-cyan-50",
    requireAuth: true,
    tooltip: "Interactive guide to learn how to use PelangiManager",
    id: "nav-help"
  },
  {
    path: "/admin/intent-manager",
    label: "Monitor",
    icon: Database, // Using Database icon as placeholder if needed, or import something else
    color: "text-pink-600 bg-pink-50",
    requireAuth: true,
    tooltip: "Monitor chatbot conversations and intents",
    id: "nav-intent-manager"
  },
];

export default function Navigation() {
  const [location] = useLocation();
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated || false;
  const user = authContext?.user;
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: occupancy } = useQuery<{ total: number; available: number }>({
    queryKey: ["/api/occupancy"],
  });


  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <TooltipProvider>
      <nav className="hidden md:flex space-x-1 mb-4 bg-white p-2 rounded-lg shadow-sm overflow-x-auto">
        {navigationItems.map((item) => {
          const isActive = location === item.path;
          const canAccess = !item.requireAuth || isAuthenticated;

          // Always show all navigation items but handle auth differently

          const href = canAccess ? item.path : `/login?redirect=${encodeURIComponent(item.path)}`;
          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Link href={href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="default"
                    id={item.id}
                    disabled={!canAccess}
                    className={`flex items-center gap-2 text-sm px-3 py-2 whitespace-nowrap rounded-lg min-h-[44px] ${isActive
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow"
                        : canAccess
                          ? `hover:bg-gray-50 ${item.color}`
                          : "text-gray-400"
                      }`}
                  >
                    <div className={`flex items-center justify-center h-6 w-6 rounded-full ${isActive ? "bg-white/20" : item.color?.replace("text-", "bg-")}`}>
                      <item.icon className={`h-4 w-4 ${isActive ? "text-white" : item.color}`} />
                    </div>
                    <span className="hidden sm:inline font-medium">
                      {item.label}
                    </span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>{!canAccess ? "Login required to access this feature" : item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          {/* Date and Time Display */}
          <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-xs text-blue-800 border border-blue-200">
            <Clock className="h-3 w-3" />
            <span className="font-medium hidden sm:inline">
              {formatDateTime(currentTime)}
            </span>
            <span className="font-medium sm:hidden">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>

          {isAuthenticated && user ? (
            <>
              <span className="text-xs text-gray-600 hidden sm:inline">
                Welcome, {user.firstName || user.email}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={authContext?.logout}
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1"
                  >
                    Logout
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign out of your account</p>
                </TooltipContent>
              </Tooltip>

              {/* Database Status for authenticated users */}
              <DatabaseStatus />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/login">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1"
                    >
                      Login
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign in to access all features</p>
                </TooltipContent>
              </Tooltip>

              {/* Database Status */}
              <DatabaseStatus />
            </div>
          )}
        </div>
      </nav>
    </TooltipProvider>
  );
}
