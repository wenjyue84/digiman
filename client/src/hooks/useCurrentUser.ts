import { useAuth, User } from '../lib/auth';

export interface UseCurrentUserReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useCurrentUser(): UseCurrentUserReturn {
  const { user, isAuthenticated } = useAuth();
  
  return {
    user,
    isLoading: false, // Since auth context already handles loading state
    isAuthenticated
  };
}