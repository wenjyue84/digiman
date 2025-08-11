import { useContext } from "react";
import { Link, useLocation } from "wouter";
import { Home, UserPlus, UserX, ListChecks, History, Settings } from "lucide-react";
import { AuthContext } from "@/lib/auth";

const navigationItems = [
  { path: "/", label: "Dashboard", icon: Home, color: "text-indigo-600 bg-indigo-50" },
  { path: "/check-in", label: "Check In", icon: UserPlus, requireAuth: true, color: "text-green-600 bg-green-50" },
  { path: "/check-out", label: "Check Out", icon: UserX, requireAuth: true, color: "text-red-600 bg-red-50" },
  { path: "/cleaning", label: "Clean", icon: ListChecks, requireAuth: true, color: "text-emerald-600 bg-emerald-50" },
  { path: "/history", label: "History", icon: History, color: "text-orange-600 bg-orange-50" },
  { path: "/settings", label: "Settings", icon: Settings, requireAuth: true, color: "text-blue-600 bg-blue-50" },
];

export default function MobileBottomNav() {
  const [location] = useLocation();
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated || false;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white/80 dark:bg-slate-900/70 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 gap-1 px-2 py-2">
        {navigationItems.slice(0, 5).map((item) => {
          const isActive = location === item.path;
          const canAccess = !item.requireAuth || isAuthenticated;
          const Icon = item.icon;
          const href = canAccess ? item.path : "/login";
          return (
            <li key={item.path} className="flex items-center justify-center">
              <Link
                href={href}
                title={!canAccess ? "Login required" : item.label}
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
                <span className="mt-1 text-[11px] font-medium leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


