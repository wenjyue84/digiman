import { createContext, useContext } from 'react';

/**
 * User interface representing authenticated user data
 * Supports both admin and staff roles with optional profile information
 */
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  role: 'admin' | 'staff';
}

/**
 * Authentication context interface defining available auth methods and state
 * Provides both traditional login and Google OAuth authentication
 */
/**
 * Login result interface to provide detailed error information
 */
export interface LoginResult {
  success: boolean;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginWithGoogle: (googleToken: string) => Promise<LoginResult>;
  logout: () => void;
  isAuthenticated: boolean;
}

// React context for authentication state and methods
export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Hook to access authentication context
 * Must be used within an AuthProvider component tree
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Utility functions for managing authentication tokens in localStorage
 * Provides centralized token storage management
 */
export const getStoredToken = () => localStorage.getItem('auth_token');
export const setStoredToken = (token: string) => localStorage.setItem('auth_token', token);
export const removeStoredToken = () => localStorage.removeItem('auth_token');

/**
 * Wrapper around fetch that automatically includes authentication headers
 * Simplifies making authenticated API requests throughout the application
 */
export const authenticatedFetch = (url: string, options: RequestInit = {}) => {
  const token = getStoredToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      // Include auth token if available
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  });
};
