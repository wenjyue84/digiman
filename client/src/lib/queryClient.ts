import { QueryClient, QueryFunction, focusManager, MutationCache, QueryCache } from "@tanstack/react-query";
import { getQueryConfig } from "./queryConfig";
import { toast } from "@/hooks/use-toast";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {})
  };
  
  console.log('API Request:', { method, url, headers, data });
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log('API Response status:', res.status, res.statusText);
  
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers = getAuthHeaders();
    
    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Configure focus manager to use Page Visibility API
focusManager.setEventListener((handleFocus) => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      handleFocus();
    }
  };
  
  const handleWindowFocus = () => {
    handleFocus();
  };

  // Listen to visibility change
  document.addEventListener('visibilitychange', handleVisibilityChange, false);
  
  // Also listen to focus for better browser compatibility
  window.addEventListener('focus', handleWindowFocus, false);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleWindowFocus);
  };
});

// Only dispatch auth:unauthorized when user had a token (session expired),
// not for anonymous visitors browsing public pages.
function dispatchUnauthorizedIfAuthenticated() {
  if (localStorage.getItem('auth_token')) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }
}

// Global error handler for queries
const handleQueryError = (error: unknown) => {
  // Silently handle 401 errors — if user had a token, treat as session expiry
  if (error instanceof Error && error.message.includes('401:')) {
    dispatchUnauthorizedIfAuthenticated();
    return;
  }

  console.error('Query error:', error);

  if (error instanceof Error && error.message) {
    // Handle specific error types
    if (error.message.includes('401:')) {
      dispatchUnauthorizedIfAuthenticated();
      return;
    }
    
    // Only show connection error for actual network/fetch failures
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'NetworkError') {
      toast({
        title: "Connection Problem",
        description: "Please check your internet connection and try again. If you're running locally, make sure the server is started: run 'npm run dev' in the project root.",
        variant: "destructive",
      });
      return;
    }
    
    if (error.message.includes('500:')) {
      toast({
        title: "Server Error",
        description: "Something went wrong on our end. Please try again later.",
        variant: "destructive",
      });
      return;
    }
    
    // Don't show toast for other errors - they might be handled elsewhere
    // or might be empty error objects
  }
};

// Global error handler for mutations
const handleMutationError = (error: unknown) => {
  console.error('Mutation error:', error);
  
  if (error instanceof Error) {
    // Network/connection failures for mutations
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'NetworkError') {
      toast({
        title: "Connection Problem",
        description: "Please check your internet connection and try again. If you're running locally, make sure the server is started: run 'npm run dev' in the project root.",
        variant: "destructive",
      });
      return;
    }
    // Handle validation errors (400)
    if (error.message.includes('400:')) {
      try {
        const errorData = JSON.parse(error.message.split('400: ')[1]);
        if (errorData.errors && Array.isArray(errorData.errors)) {
          // Show validation errors
          errorData.errors.slice(0, 3).forEach((err: any) => {
            toast({
              title: "Validation Error",
              description: err.message || 'Please check your input and try again.',
              variant: "destructive",
            });
          });
          return;
        }
      } catch {
        // Fallback for malformed validation errors
        toast({
          title: "Validation Error",
          description: "Please check your input and try again.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Handle authorization errors
    if (error.message.includes('401:') || error.message.includes('403:')) {
      dispatchUnauthorizedIfAuthenticated();
      return;
    }
    
    // Specific: request entity too large (413)
    if (error.message.includes('413:')) {
      toast({
        title: "Photo too large",
        description: "Please upload an image under 5 MB. If you took it on a phone, use the 'Small' size or compress it and try again. If this keeps happening with small images, try refreshing the page and reselecting the file.",
        variant: "destructive",
      });
      return;
    }

    // Generic error fallback
    toast({
      title: "Operation Failed",
      description: "Something went wrong. Please try again.",
      variant: "destructive",
    });
  }
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleQueryError,
  }),
  mutationCache: new MutationCache({
    onError: handleMutationError,
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Dynamic configuration based on query key
      staleTime: 5 * 60 * 1000, // Default: 5 minutes
      gcTime: 30 * 60 * 1000,   // Default: 30 minutes cache time
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && error.message.match(/^4\d{2}:/)) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on client errors
        if (error instanceof Error && error.message.match(/^4\d{2}:/)) {
          return false;
        }
        // Retry once for server errors
        return failureCount < 1;
      },
      gcTime: 5 * 60 * 1000, // Keep mutation results for 5 minutes
    },
  },
});

// Override default query behavior with endpoint-specific configurations
const originalQuery = queryClient.defaultQueryOptions;
queryClient.setQueryDefaults = function(queryKey: unknown[], options: any) {
  const config = getQueryConfig(queryKey);
  return queryClient.setQueryDefaults(queryKey, {
    ...config,
    ...options,
  });
};
