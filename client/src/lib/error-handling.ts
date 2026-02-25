/**
 * Consolidated Error Handling Module for digiman
 *
 * Merges errorHandler.ts (detailed API error parsing, toast creation, fetch wrapper)
 * and errorUtils.ts (AppError type, retry logic, error boundary utilities, reporting).
 *
 * Naming note: Both source files exported a function named `parseApiError`.
 * - The async version from errorHandler.ts keeps the name `parseApiError`.
 * - The sync version from errorUtils.ts is renamed to `parseToAppError`.
 *   errorUtils.ts re-exports `parseToAppError` under both names so existing
 *   consumers of either file continue to work.
 */

// ────────────────────────────────────────────
// Types & Interfaces
// ────────────────────────────────────────────

/** Detailed error representation used by API request/toast helpers (from errorHandler). */
export interface DetailedError {
  message: string;
  details?: string;
  endpoint?: string;
  statusCode?: number;
  errorCode?: string;
  solution?: string;
  debugInfo?: {
    timestamp: string;
    userAgent: string;
    url: string;
    method?: string;
    requestData?: any;
    responseData?: any;
  };
}

/** Options returned by `createErrorToast` (from errorHandler). */
export interface ErrorToastOptions {
  title: string;
  description: string;
  variant?: "default" | "destructive";
  debugDetails?: string;
}

/** Application-level error with severity/retry metadata (from errorUtils). */
export interface AppError extends Error {
  code?: string;
  severity?: 'low' | 'medium' | 'high';
  context?: Record<string, any>;
  retryable?: boolean;
}

/**
 * Well-known error type codes (from errorUtils).
 */
export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CHUNK_LOAD_ERROR: 'CHUNK_LOAD_ERROR',
} as const;

// ────────────────────────────────────────────
// AppError Factory (from errorUtils)
// ────────────────────────────────────────────

/**
 * Creates a standardised AppError instance.
 */
export const createAppError = (
  message: string,
  options: {
    code?: string;
    severity?: 'low' | 'medium' | 'high';
    context?: Record<string, any>;
    retryable?: boolean;
    cause?: Error;
  } = {}
): AppError => {
  const error = new Error(message) as AppError;
  error.code = options.code;
  error.severity = options.severity || 'medium';
  error.context = options.context;
  error.retryable = options.retryable !== false; // Default to retryable

  if (options.cause) {
    error.cause = options.cause;
    error.stack = options.cause.stack;
  }

  return error;
};

// ────────────────────────────────────────────
// Detailed API Error Parsing (from errorHandler)
// ────────────────────────────────────────────

/**
 * Parse an API error response and extract detailed information.
 * Async because it may need to read a Response body.
 */
export async function parseApiError(
  error: any,
  endpoint?: string,
  method?: string,
  requestData?: any
): Promise<DetailedError> {
  const timestamp = new Date().toISOString();
  const userAgent = navigator.userAgent;
  const url = window.location.href;

  let detailedError: DetailedError = {
    message: "Unknown error occurred",
    endpoint,
    debugInfo: {
      timestamp,
      userAgent,
      url,
      method,
      requestData,
    }
  };

  try {
    if (error instanceof Response) {
      detailedError.statusCode = error.status;

      try {
        const responseText = await error.text();
        let responseData: any = responseText;

        try {
          responseData = JSON.parse(responseText);
        } catch {
          // Response is not JSON, keep as text
        }

        detailedError.debugInfo!.responseData = responseData;

        if (typeof responseData === 'object' && responseData.message) {
          detailedError.message = responseData.message;
          detailedError.details = responseData.details;
          detailedError.solution = responseData.solution;
          detailedError.errorCode = responseData.errorCode;
        } else {
          detailedError.message = responseText || error.statusText || `HTTP ${error.status} Error`;
        }
      } catch {
        detailedError.message = error.statusText || `HTTP ${error.status} Error`;
      }
    } else if (error instanceof Error) {
      detailedError.message = error.message;

      const statusMatch = error.message.match(/^(\d{3}):\s*(.+)$/);
      if (statusMatch) {
        detailedError.statusCode = parseInt(statusMatch[1]);
        detailedError.message = statusMatch[2];
      }
    } else if (typeof error === 'string') {
      detailedError.message = error;
    } else if (error && typeof error === 'object') {
      detailedError.message = error.message || error.error || error.description || "Unknown error";
      detailedError.statusCode = error.status || error.statusCode;
      detailedError.details = error.details;
      detailedError.solution = error.solution;
      detailedError.errorCode = error.errorCode;
    }

    detailedError = enhanceErrorWithContext(detailedError);
  } catch (parseError) {
    console.error('Error parsing error:', parseError);
    detailedError.message = "Failed to parse error details";
    detailedError.details = String(error);
  }

  return detailedError;
}

/**
 * Enhance error with contextual information and suggested solutions.
 */
function enhanceErrorWithContext(error: DetailedError): DetailedError {
  const enhanced = { ...error };

  switch (enhanced.statusCode) {
    case 401:
      enhanced.message = "Authentication Required";
      enhanced.details = "Your session has expired or you're not logged in.";
      enhanced.solution = "Please log in again to continue.";
      enhanced.errorCode = "AUTH_REQUIRED";
      break;

    case 403:
      enhanced.message = "Access Forbidden";
      enhanced.details = "You don't have permission to perform this action.";
      enhanced.solution = "Contact an administrator if you need access to this feature.";
      enhanced.errorCode = "ACCESS_FORBIDDEN";
      break;

    case 404:
      enhanced.message = "Endpoint Not Found";
      enhanced.details = `The API endpoint ${enhanced.endpoint} was not found on the server.`;
      enhanced.solution = "This might be a temporary server issue. Try refreshing the page or contact support.";
      enhanced.errorCode = "ENDPOINT_NOT_FOUND";
      break;

    case 409:
      enhanced.message = "Conflict Error";
      enhanced.details = "The requested action conflicts with the current state.";
      enhanced.solution = "Check if the resource is already in use or refresh the page to get the latest state.";
      enhanced.errorCode = "RESOURCE_CONFLICT";
      break;

    case 422:
      enhanced.message = "Validation Error";
      enhanced.details = "The submitted data failed server validation.";
      enhanced.solution = "Please check your input and try again.";
      enhanced.errorCode = "VALIDATION_ERROR";
      break;

    case 500:
      enhanced.message = "Server Error";
      enhanced.details = "An internal server error occurred.";
      enhanced.solution = "This is a server-side issue. Please try again in a moment or contact support.";
      enhanced.errorCode = "INTERNAL_SERVER_ERROR";
      break;

    case 502:
    case 503:
    case 504:
      enhanced.message = "Server Unavailable";
      enhanced.details = "The server is temporarily unavailable.";
      enhanced.solution = "Please wait a moment and try again. If the problem persists, the server may be restarting.";
      enhanced.errorCode = "SERVER_UNAVAILABLE";
      break;

    default:
      if (enhanced.message.includes('Failed to fetch') || enhanced.message.includes('NetworkError')) {
        enhanced.message = "Connection Failed";
        enhanced.details = "Unable to connect to the server. This could be a network issue or the server may be down.";
        enhanced.solution = "Check your internet connection and ensure the development server is running (npm run dev).";
        enhanced.errorCode = "CONNECTION_FAILED";
      }
      break;
  }

  if (enhanced.endpoint?.includes('/api/guest-tokens')) {
    if (enhanced.statusCode === 400) {
      enhanced.details = enhanced.details || "The guest token creation failed due to invalid data or unit unavailability.";
      enhanced.solution = "Check if the selected unit is available and all required fields are filled correctly.";
    }
  }

  if (enhanced.endpoint?.includes('/api/guests/checkin')) {
    if (enhanced.statusCode === 400) {
      enhanced.details = enhanced.details || "Guest check-in failed due to validation errors or unit conflicts.";
      enhanced.solution = "Verify all guest information is correct and the selected unit is available.";
    }
  }

  return enhanced;
}

// ────────────────────────────────────────────
// Toast Helper (from errorHandler)
// ────────────────────────────────────────────

/**
 * Create user-friendly toast options from a DetailedError.
 */
export function createErrorToast(error: DetailedError): ErrorToastOptions {
  let description = error.message;

  if (error.details) {
    description += `\n\nDetails: ${error.details}`;
  }

  if (error.solution) {
    description += `\n\nSolution: ${error.solution}`;
  }

  let debugDetails = "";
  if (process.env.NODE_ENV === 'development' && error.debugInfo) {
    debugDetails = `Debug Info:
• Timestamp: ${error.debugInfo.timestamp}
• Endpoint: ${error.endpoint || 'Unknown'}
• Status: ${error.statusCode || 'Unknown'}
• Error Code: ${error.errorCode || 'Unknown'}`;

    if (error.debugInfo.method && error.debugInfo.requestData) {
      debugDetails += `
• Request: ${error.debugInfo.method} ${error.endpoint}
• Data: ${JSON.stringify(error.debugInfo.requestData, null, 2)}`;
    }
  }

  return {
    title: error.statusCode === 401 ? "Authentication Required" : "Operation Failed",
    description,
    variant: "destructive",
    debugDetails,
  };
}

// ────────────────────────────────────────────
// Enhanced Fetch Wrapper (from errorHandler)
// ────────────────────────────────────────────

/**
 * Fetch wrapper that throws errors containing serialised DetailedError JSON.
 */
export async function apiRequestWithDetailedErrors(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  try {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(data ? { "Content-Type": "application/json" } : {})
    };

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      const detailedError = await parseApiError(response, url, method, data);
      const errorMessage = JSON.stringify(detailedError);
      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('{')) {
      throw error;
    }

    const detailedError = await parseApiError(error, url, method, data);
    const errorMessage = JSON.stringify(detailedError);
    throw new Error(errorMessage);
  }
}

// ────────────────────────────────────────────
// DetailedError Extraction (from errorHandler)
// ────────────────────────────────────────────

/**
 * Extract a DetailedError from a mutation-thrown error (typically JSON-encoded).
 */
export function extractDetailedError(error: any): DetailedError {
  if (error instanceof Error) {
    try {
      const detailedError = JSON.parse(error.message);
      if (detailedError && typeof detailedError === 'object' && detailedError.message) {
        return detailedError as DetailedError;
      }
    } catch {
      // Not a detailed error JSON, create one
    }
  }

  return {
    message: error?.message || String(error) || "Unknown error occurred",
    debugInfo: {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }
  };
}

// ────────────────────────────────────────────
// Lightweight Sync Error Parser (from errorUtils)
// ────────────────────────────────────────────

/**
 * Synchronously parse any thrown value into an AppError.
 *
 * Renamed from the original `parseApiError` in errorUtils.ts to avoid
 * collision with the async `parseApiError` from errorHandler.ts.
 */
export const parseToAppError = (error: unknown): AppError => {
  if (error instanceof Error) {
    const message = error.message;

    if (message.includes(': ')) {
      const [statusCode, responseText] = message.split(': ', 2);
      const status = parseInt(statusCode);

      if (status >= 400 && status < 500) {
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(responseText);
        } catch {
          parsedResponse = { message: responseText };
        }

        return createAppError(parsedResponse.message || 'Request failed', {
          code: status === 400 ? ErrorTypes.VALIDATION_ERROR :
                status === 401 || status === 403 ? ErrorTypes.AUTHORIZATION_ERROR :
                status === 404 ? ErrorTypes.NOT_FOUND_ERROR : 'CLIENT_ERROR',
          severity: status === 400 ? 'low' : status === 404 ? 'low' : 'medium',
          context: { status, response: parsedResponse },
          retryable: false,
        });
      }

      if (status >= 500) {
        return createAppError('Server error occurred', {
          code: ErrorTypes.SERVER_ERROR,
          severity: 'high',
          context: { status, response: responseText },
          retryable: true,
        });
      }
    }

    if (message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('fetch') ||
        message.toLowerCase().includes('connection')) {
      return createAppError('Network connection failed', {
        code: ErrorTypes.NETWORK_ERROR,
        severity: 'medium',
        retryable: true,
        cause: error,
      });
    }

    if (message.toLowerCase().includes('timeout')) {
      return createAppError('Request timed out', {
        code: ErrorTypes.TIMEOUT_ERROR,
        severity: 'medium',
        retryable: true,
        cause: error,
      });
    }

    if (message.toLowerCase().includes('loading chunk') ||
        message.toLowerCase().includes('chunkerror')) {
      return createAppError('Application update detected', {
        code: ErrorTypes.CHUNK_LOAD_ERROR,
        severity: 'high',
        retryable: false,
        cause: error,
      });
    }
  }

  return createAppError('An unexpected error occurred', {
    severity: 'medium',
    context: { originalError: error },
    cause: error instanceof Error ? error : undefined,
  });
};

// ────────────────────────────────────────────
// Async Error Handler Wrapper (from errorUtils)
// ────────────────────────────────────────────

/**
 * Wraps an async function with automatic error parsing.
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler?: (error: AppError) => void
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = parseToAppError(error);

      if (errorHandler) {
        errorHandler(appError);
      } else {
        throw appError;
      }
    }
  }) as T;
};

// ────────────────────────────────────────────
// Retry with Exponential Backoff (from errorUtils)
// ────────────────────────────────────────────

/**
 * Retry an async operation with exponential backoff.
 * Only retries when the parsed error has `retryable === true`.
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2
  } = options;

  let lastError: AppError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = parseToAppError(error);

      if (!lastError.retryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// ────────────────────────────────────────────
// Error Boundary Test Utilities (from errorUtils)
// ────────────────────────────────────────────

/**
 * Helpers for triggering errors in development / testing.
 */
export const errorBoundaryTests = {
  throwSyncError: () => {
    throw createAppError('Test synchronous error', {
      code: 'TEST_ERROR',
      severity: 'low',
    });
  },

  throwAsyncError: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    throw createAppError('Test asynchronous error', {
      code: 'TEST_ASYNC_ERROR',
      severity: 'medium',
    });
  },

  throwNetworkError: () => {
    throw createAppError('Simulated network error', {
      code: ErrorTypes.NETWORK_ERROR,
      severity: 'medium',
      retryable: true,
    });
  },

  throwChunkError: () => {
    const error = new Error('Loading chunk 5 failed.');
    error.name = 'ChunkLoadError';
    throw error;
  },
};

// ────────────────────────────────────────────
// Error Reporting (from errorUtils)
// ────────────────────────────────────────────

/**
 * Report an error to the console (dev) or remote endpoint (prod).
 */
export const reportError = async (error: AppError, context?: Record<string, any>) => {
  const errorReport = {
    timestamp: new Date().toISOString(),
    message: error.message,
    code: error.code,
    severity: error.severity,
    stack: error.stack,
    context: {
      ...error.context,
      ...context,
      url: window.location.href,
      userAgent: navigator.userAgent,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('Error Report:', errorReport);
  }

  if (process.env.NODE_ENV === 'production') {
    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport),
        credentials: 'include'
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }
};
