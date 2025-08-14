import { useContext, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, UserPlus, UserX, History, Settings, Clock, LayoutGrid, LogOut, ChevronRightCircle, CalendarDays, ListChecks, Database, HardDrive } from "lucide-react";
import { AuthContext } from "../lib/auth";
import { useQuery } from "@tanstack/react-query";

const navigationItems = [
  { path: "/", label: "Dashboard", icon: LayoutGrid, color: "text-indigo-600 bg-indigo-50" },
  { path: "/check-in", label: "Check In", icon: UserPlus, color: "text-green-600 bg-green-50", requireAuth: true },
  { path: "/check-out", label: "Check Out", icon: UserX, color: "text-red-600 bg-red-50", requireAuth: true },
  { path: "/cleaning", label: "Clean", icon: ListChecks, color: "text-emerald-600 bg-emerald-50", requireAuth: true },
  { path: "/history", label: "History", icon: ListChecks, color: "text-orange-600 bg-orange-50" },
  { path: "/settings", label: "Settings", icon: Settings, color: "text-blue-600 bg-blue-50", requireAuth: true },
];

export default function Navigation() {
  const [location] = useLocation();
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated || false;
  const user = authContext?.user;
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: occupancy } = useQuery<{total: number; available: number}>({
    queryKey: ["/api/occupancy"],
  });

  const { data: storageInfo } = useQuery<{type: string; isDatabase: boolean; label: string}>({
    queryKey: ["/api/storage/info"],
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
    <nav className="hidden md:flex space-x-1 mb-4 bg-white p-2 rounded-lg shadow-sm overflow-x-auto">
      {navigationItems.map((item) => {
        const isActive = location === item.path;
        const canAccess = !item.requireAuth || isAuthenticated;
        
        // Always show all navigation items but handle auth differently
        
        const href = canAccess ? item.path : `/login?redirect=${encodeURIComponent(item.path)}`;
        return (
          <Link key={item.path} href={href}>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="default"
              disabled={!canAccess}
              className={`flex items-center gap-2 text-sm px-3 py-2 whitespace-nowrap rounded-lg min-h-[44px] ${
                isActive
                  ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow" 
                  : canAccess
                    ? `hover:bg-gray-50 ${item.color}`
                    : "text-gray-400"
              }`}
              title={!canAccess ? "Login required" : ""}
            >
              <div className={`flex items-center justify-center h-6 w-6 rounded-full ${isActive ? "bg-white/20" : item.color?.replace("text-", "bg-")}`}>
                <item.icon className={`h-4 w-4 ${isActive ? "text-white" : item.color}`}/>
              </div>
              <span className="hidden sm:inline font-medium">
                {item.label}
              </span>
            </Button>
          </Link>
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
            <Button 
              onClick={authContext?.logout} 
              variant="outline" 
              size="sm"
              className="text-xs px-2 py-1"
            >
              Logout
            </Button>
            
            {/* Memory Storage Warning - Only show when using in-memory storage */}
            {storageInfo && !storageInfo.isDatabase && (
              <div 
                className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded text-xs text-orange-700 border border-orange-200 cursor-help"
                title="⚠️ DEVELOPMENT MODE: You are using in-memory storage (no database). All data will be lost when you restart the server. This is intended for local development only. For production, set DATABASE_URL environment variable to use a real database."
              >
                <HardDrive className="h-3 w-3 text-orange-600" />
                <span className="font-medium hidden sm:inline">
                  Memory
                </span>
                <span className="font-medium sm:hidden">
                  Mem
                </span>
              </div>
            )}
          </>
                 ) : (
           <div className="flex items-center gap-2">
             <Link href="/login">
               <Button 
                 variant="outline" 
                 size="sm"
                 className="text-xs px-2 py-1"
               >
                 Login
               </Button>
             </Link>
             
             {/* Storage Type Indicator */}
             {storageInfo && (
               <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-xs text-gray-600 border border-gray-200">
                 {storageInfo.isDatabase ? (
                   <Database className="h-3 w-3 text-blue-600" />
                 ) : (
                   <HardDrive className="h-3 w-3 text-orange-600" />
                 )}
                 <span className="font-medium hidden sm:inline">
                   {storageInfo.label}
                 </span>
                 <span className="font-medium sm:hidden">
                   {storageInfo.label === 'Database' ? 'DB' : 'Mem'}
                 </span>
               </div>
             )}
           </div>
         )}
      </div>
    </nav>
  );
}