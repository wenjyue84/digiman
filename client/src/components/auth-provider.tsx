import React, { useState, useEffect, ReactNode } from "react";
import { AuthContext, type User, type AuthContextType, type LoginResult, getStoredToken, setStoredToken, removeStoredToken } from "../lib/auth";

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
   * Returns detailed result with error information
   */
  const login = async (email: string, password: string): Promise<LoginResult> => {
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
        return { success: true };
      } else {
        // Try to get error message from server
        try {
          const errorData = await response.json();
          return { 
            success: false, 
            error: errorData.message || `Server error (${response.status})` 
          };
        } catch {
          return { 
            success: false, 
            error: `Server error (${response.status}: ${response.statusText})` 
          };
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error - please check your connection' 
      };
    }
  };

  /**
   * Authenticate user with Google OAuth token
   * Returns detailed result with error information
   */
  const loginWithGoogle = async (googleToken: string): Promise<LoginResult> => {
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
        return { success: true };
      } else {
        // Try to get error message from server
        try {
          const errorData = await response.json();
          return { 
            success: false, 
            error: errorData.message || `Google login failed (${response.status})` 
          };
        } catch {
          return { 
            success: false, 
            error: `Google login failed (${response.status}: ${response.statusText})` 
          };
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error during Google login' 
      };
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