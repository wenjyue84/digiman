import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { User, LogOut, Sun, Moon } from "lucide-react";
import { AuthContext } from "../lib/auth";
import { useTheme } from "../lib/theme";

export default function Header() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  const logout = authContext?.logout || (() => {});
  const isAuthenticated = authContext?.isAuthenticated || false;
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orange-700 dark:text-orange-400">Pelangi Capsule Hostel</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Management System - Johor Bahru</p>
        </div>
        
        {isAuthenticated && user && (
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="flex items-center gap-2"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="h-4 w-4" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="hidden sm:inline">Light</span>
                </>
              )}
            </Button>
            
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium dark:text-gray-200">{user.firstName || user.email}</span>
              <span className="text-gray-500 dark:text-gray-400 capitalize">({user.role})</span>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}