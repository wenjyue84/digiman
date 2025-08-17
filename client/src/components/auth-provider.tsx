import React, { useState, useEffect, ReactNode } from "react";
import { AuthContext, type User, type AuthContextType, getStoredToken, setStoredToken, removeStoredToken } from "../lib/auth";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider component
 */
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Authentication provider that manages user state and authentication methods
 * Handles login, logout, and session persistence across app restarts
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore authentication state from stored token on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = getStoredToken();
      if (storedToken) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setToken(storedToken);
          } else {
            // Token is invalid, clear stored credentials
            removeStoredToken();
          }
        } catch (error) {
          // Network error or server issue, clear stored credentials
          removeStoredToken();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  /**
   * Authenticate user with email and password
   * Returns true on success, false on failure
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(data.token);
        setStoredToken(data.token);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  /**
   * Authenticate user with Google OAuth token
   * Returns true on success, false on failure
   */
  const loginWithGoogle = async (googleToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: googleToken })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(data.token);
        setStoredToken(data.token);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  /**
   * Sign out user and clear all authentication state
   * Attempts server logout but continues even if it fails
   */
  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (error) {
        // Proceed with local logout even if server request fails
      }
    }

    setUser(null);
    setToken(null);
    removeStoredToken();
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user
  };

  // Show loading screen while checking authentication status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}