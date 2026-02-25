import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, LogOut } from "lucide-react";
import { AuthContext } from "../lib/auth";
import { NetworkStatusBadge, PWAInstallButton } from "@/components/ui/offline-indicator";

import { useBusinessConfig } from "@/hooks/useBusinessConfig";
import { useSettings } from "@/hooks/useSettings";
import { getInitials } from "@/lib/utils";

export default function Header() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  const logout = authContext?.logout || (() => { });
  const isAuthenticated = authContext?.isAuthenticated || false;
  const business = useBusinessConfig();
  const { data: settings } = useSettings();

  const appTitle = settings?.appTitle || "";
  const propertyInitials = getInitials(appTitle);

  return (
    // US-007: Improved mobile header layout with reduced padding and collapsible user info
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-shrink">
          <h1 className="text-lg sm:text-2xl font-bold text-orange-700 truncate">{business.name}</h1>
          <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">{business.tagline}</p>
        </div>

        {isAuthenticated && user && (
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Network Status and PWA Install */}
            <div className="flex items-center gap-1 sm:gap-2">
              <NetworkStatusBadge />
              <PWAInstallButton />
            </div>

            {/* User info - hidden on mobile, shown on desktop */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium">{user.firstName || user.email}</span>
              <span className="text-gray-500 capitalize">({user.role})</span>
            </div>

            {/* Avatar-only on mobile */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="sm:hidden flex items-center justify-center h-9 w-9 rounded-full bg-orange-100 text-orange-700">
                    <User className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{user.firstName || user.email} ({user.role})</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Property Initials - Top Right Display */}
            {propertyInitials && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-700 text-white font-bold text-sm shadow-sm hover:bg-orange-800 transition-colors cursor-help">
                      {propertyInitials}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Property: {appTitle}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={logout} className="h-11 sm:h-9 px-3 sm:px-4">
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign out of your account</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </header>
  );
}
