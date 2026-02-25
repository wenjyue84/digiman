import { useContext, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, UserPlus, UserX, ListChecks, Settings, MoreHorizontal, DollarSign, HelpCircle } from "lucide-react";
import { AuthContext } from "@/lib/auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const mainNavigationItems = [
  { 
    path: "/", 
    label: "Dashboard", 
    icon: Home, 
    color: "text-indigo-600 bg-indigo-50",
    tooltip: "View occupancy overview and system status"
  },
  { 
    path: "/check-in", 
    label: "Check In", 
    icon: UserPlus, 
    requireAuth: true, 
    color: "text-green-600 bg-green-50",
    tooltip: "Register new guests and assign units"
  },
  {
    path: "/check-out",
    label: "Check Out",
    icon: UserX,
    requireAuth: true,
    color: "text-red-600 bg-red-50",
    tooltip: "Process guest departures and free units"
  },
  {
    path: "/cleaning",
    label: "Clean",
    icon: ListChecks,
    requireAuth: true,
    color: "text-emerald-600 bg-emerald-50",
    tooltip: "Manage unit cleaning and maintenance"
  },
];

const moreNavigationItems = [
  {
    path: "/finance",
    label: "Finance",
    icon: DollarSign,
    requireAuth: true,
    color: "text-orange-600 bg-orange-50",
    tooltip: "Track expenses, repairs, utilities, and financial records"
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    requireAuth: true,
    color: "text-blue-600 bg-blue-50",
    tooltip: "Configure system settings and user management"
  },
  {
    path: "/help",
    label: "Help",
    icon: HelpCircle,
    requireAuth: true,
    color: "text-cyan-600 bg-cyan-50",
    tooltip: "Interactive guide to learn how to use digiman"
  },
];

export default function MobileBottomNav() {
  const [location] = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated || false;

  const handleMoreClick = () => {
    setShowMoreMenu(!showMoreMenu);
  };

  return (
    <TooltipProvider>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white/80 dark:bg-slate-900/70 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        {/* US-003: Improved navigation density with gap-2 and better spacing */}
        <ul className="grid grid-cols-5 gap-2 px-3 py-2">
          {mainNavigationItems.map((item) => {
            const isActive = location === item.path;
            const canAccess = !item.requireAuth || isAuthenticated;
            const Icon = item.icon;
            const href = canAccess ? item.path : `/login?redirect=${encodeURIComponent(item.path)}`;
            return (
              <li key={item.path} className="flex items-center justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      className={`flex flex-col items-center justify-center rounded-xl w-full py-2 min-h-[56px] select-none transition-all ${
                        isActive
                          ? "bg-gradient-to-br from-orange-500/90 to-pink-500/90 text-white shadow"
                          : "text-gray-600 hover:bg-gray-50"
                      } ${!canAccess ? "opacity-50" : ""}`}
                      aria-disabled={!canAccess}
                    >
                      <div className={`flex items-center justify-center h-7 w-7 rounded-full ${isActive ? "bg-white/20" : item.color?.replace("text-", "bg-")}` }>
                        <Icon className={`h-5 w-5 ${isActive ? "text-white" : item.color}` } />
                      </div>
                      <span className="mt-1 text-xs font-medium leading-none">{item.label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{!canAccess ? "Login required to access this feature" : item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
          
          {/* More Menu Button */}
          <li className="flex items-center justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleMoreClick}
                  className={`flex flex-col items-center justify-center rounded-xl w-full py-2 min-h-[56px] select-none transition-all ${
                    showMoreMenu
                      ? "bg-gradient-to-br from-orange-500/90 to-pink-500/90 text-white shadow"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  aria-label="More options"
                >
                  <div className={`flex items-center justify-center h-7 w-7 rounded-full ${showMoreMenu ? "bg-white/20" : "bg-gray-100"}`}>
                    <MoreHorizontal className={`h-5 w-5 ${showMoreMenu ? "text-white" : "text-gray-600"}`} />
                  </div>
                  <span className="mt-1 text-xs font-medium leading-none">More</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show additional navigation options</p>
              </TooltipContent>
            </Tooltip>
          </li>
        </ul>
      </nav>

      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div className="md:hidden fixed bottom-20 left-0 right-0 z-50 px-4 pb-4">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50">
            <div className="p-2">
              {moreNavigationItems.map((item) => {
                const isActive = location === item.path;
                const canAccess = !item.requireAuth || isAuthenticated;
                const Icon = item.icon;
                const href = canAccess ? item.path : `/login?redirect=${encodeURIComponent(item.path)}`;
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <Link
                        href={href}
                        className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-orange-500/90 to-pink-500/90 text-white"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        } ${!canAccess ? "opacity-50" : ""}`}
                        aria-disabled={!canAccess}
                        onClick={() => setShowMoreMenu(false)}
                      >
                        <div className={`flex items-center justify-center h-8 w-8 rounded-full ${isActive ? "bg-white/20" : item.color?.replace("text-", "bg-")}`}>
                          <Icon className={`h-5 w-5 ${isActive ? "text-white" : item.color}`} />
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{!canAccess ? "Login required to access this feature" : item.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close menu when tapping outside */}
      {showMoreMenu && (
        <div 
          className="md:hidden fixed inset-0 z-30 bg-black/20"
          onClick={() => setShowMoreMenu(false)}
        />
      )}
    </TooltipProvider>
  );
}


