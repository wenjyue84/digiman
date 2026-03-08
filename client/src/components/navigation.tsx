import { useContext, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, LayoutGrid, LogOut, UserPlus, UserX, Settings, ListChecks, ExternalLink, DollarSign, HelpCircle, Rainbow, CalendarDays } from "lucide-react";
import { AuthContext } from "../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { DatabaseStatus } from "./DatabaseSelector";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

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
    path: "/reservations",
    label: "Bookings",
    icon: CalendarDays,
    color: "text-cyan-600 bg-cyan-50",
    requireAuth: true,
    tooltip: "Manage future bookings and reservations"
  },
  {
    path: "/check-in",
    label: "Check In",
    icon: UserPlus,
    color: "text-green-600 bg-green-50",
    requireAuth: true,
    tooltip: "Register new guests and assign units"
  },
  {
    path: "/check-out",
    label: "Check Out",
    icon: UserX,
    color: "text-red-600 bg-red-50",
    requireAuth: true,
    tooltip: "Process guest departures and free units"
  },
  {
    path: "/cleaning",
    label: "Clean",
    icon: ListChecks,
    color: "text-emerald-600 bg-emerald-50",
    requireAuth: true,
    tooltip: "Manage unit cleaning status and maintenance tasks"
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
    tooltip: "Interactive guide to learn how to use digiman",
    id: "nav-help"
  },
  {
    path: "/admin/rainbow-ai",
    label: "Rainbow AI",
    icon: ExternalLink,
    color: "text-pink-600 bg-pink-50",
    requireAuth: true,
    tooltip: "Open Rainbow AI admin dashboard",
    id: "nav-rainbow-ai",
    external: true,
    href: `${(import.meta.env.VITE_RAINBOW_URL as string | undefined)?.replace(/#.*$/, '') ?? 'http://localhost:3002'}/admin/rainbow`,
  },
];

export default function Navigation() {
  const [location] = useLocation();
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated || false;
  const user = authContext?.user;
  const { setOpen } = useSidebar();
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: occupancy } = useQuery<{ total: number; available: number }>({
    queryKey: ["/api/occupancy"],
  });

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
    <Sidebar
      collapsible="icon"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Header: brand logo + PMS text */}
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Rainbow className="h-5 w-5 text-white" />
          </div>
          <span
            className="font-semibold text-gray-900 text-base flex-1 truncate group-data-[collapsible=icon]:hidden"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            PMS
          </span>
        </div>
      </SidebarHeader>

      {/* Nav items */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigationItems.map((item) => {
              const isActive = location === item.path;
              const canAccess = !item.requireAuth || isAuthenticated;
              const href = canAccess ? item.path : `/login?redirect=${encodeURIComponent(item.path)}`;
              const iconColor = item.color.split(' ').find((c: string) => c.startsWith('text-')) ?? "text-gray-600";
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={canAccess ? item.tooltip : "Login required to access this feature"}
                    id={(item as { id?: string }).id}
                    className={
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-500 hover:to-pink-500 hover:text-white"
                        : undefined
                    }
                  >
                    {(item as { external?: boolean }).external ? (
                      <a href={(item as { href?: string }).href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full">
                        <item.icon className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
                        <span>{item.label}</span>
                      </a>
                    ) : (
                      <Link href={href}>
                        <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : iconColor}`} />
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: time + user + logout */}
      <SidebarFooter>
        {/* Expanded: full footer with clock, welcome, logout button */}
        <div className="flex flex-col gap-2 p-1 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1.5 rounded text-xs text-blue-800 border border-blue-200">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="font-medium truncate">{formatDateTime(currentTime)}</span>
          </div>

          {isAuthenticated && user ? (
            <>
              <span className="text-xs text-gray-500 px-1 truncate">
                Welcome, {user.firstName || user.email}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  onClick={authContext?.logout}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  Logout
                </Button>
                <DatabaseStatus />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <Link href="/login">
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  Login
                </Button>
              </Link>
              <DatabaseStatus />
            </div>
          )}
        </div>

        {/* Collapsed: logout icon with tooltip */}
        <SidebarMenu className="group-data-[state=expanded]:hidden">
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Logout" onClick={authContext?.logout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  );
}
