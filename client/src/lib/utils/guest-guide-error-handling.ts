/**
 * Guest Guide Error Handling and Monitoring System
 * Provides comprehensive error handling, logging, and recovery mechanisms
 */

import { toast } from '@/hooks/use-toast';
import React from 'react';

// Error types for the Guest Guide system
export enum GuestGuideErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  SYNC_ERROR = 'SYNC_ERROR',
  CONTEXT_ERROR = 'CONTEXT_ERROR',
  RENDER_ERROR = 'RENDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR'
}

export interface GuestGuideError {
  type: GuestGuideErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  userAgent?: string;
  url?: string;
  userId?: string;
  recoverable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Error logging service
class GuestGuideErrorLogger {
  private static instance: GuestGuideErrorLogger;
  private errors: GuestGuideError[] = [];
  private maxErrors = 50; // Keep last 50 errors

  static getInstance(): GuestGuideErrorLogger {
    if (!this.instance) {
      this.instance = new GuestGuideErrorLogger();
    }
    return this.instance;
  }

  log(error: Partial<GuestGuideError> & { type: GuestGuideErrorType; message: string }): void {
    const enrichedError: GuestGuideError = {
      ...error,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      recoverable: error.recoverable ?? true,
      severity: error.severity ?? 'medium'
    };

    this.errors.unshift(enrichedError);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`[GuestGuide] ${error.type} - ${enrichedError.severity.toUpperCase()}`);
      console.error(error.message);
      if (error.details) {
        console.error('Details:', error.details);
      }
      console.error('Full error:', enrichedError);
      console.groupEnd();
    }

    // Store in localStorage for debugging
    try {
      localStorage.setItem('guest-guide-errors', JSON.stringify(this.errors.slice(0, 10)));
    } catch (e) {
      console.warn('[GuestGuide] Could not store error log to localStorage');
    }

    // Send critical errors to monitoring service (if configured)
    if (enrichedError.severity === 'critical') {
      this.sendToMonitoring(enrichedError);
    }
  }

  private sendToMonitoring(error: GuestGuideError): void {
    // This would integrate with a monitoring service like Sentry, LogRocket, etc.
    // For now, just log to console
    console.error('[GuestGuide] Critical error detected:', error);
    
    // Example integration:
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(error.message), {
    //     tags: {
    //       component: 'guest-guide',
    //       errorType: error.type,
    //       severity: error.severity
    //     },
    //     extra: error.details
    //   });
    // }
  }

  getErrors(): GuestGuideError[] {
    return [...this.errors];
  }

  getErrorsByType(type: GuestGuideErrorType): GuestGuideError[] {
    return this.errors.filter(error => error.type === type);
  }

  getErrorStats(): {
    total: number;
    byType: Record<GuestGuideErrorType, number>;
    bySeverity: Record<string, number>;
    recent: number; // Errors in last hour
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return {
      total: this.errors.length,
      byType: this.errors.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {} as Record<GuestGuideErrorType, number>),
      bySeverity: this.errors.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recent: this.errors.filter(error => error.timestamp > oneHourAgo).length
    };
  }

  clearErrors(): void {
    this.errors = [];
    localStorage.removeItem('guest-guide-errors');
  }
}

// Error handler functions
export const handleValidationError = (message: string, details?: any): void => {
  GuestGuideErrorLogger.getInstance().log({
    type: GuestGuideErrorType.VALIDATION_ERROR,
    message,
    details,
    severity: 'medium'
  });

  toast({
    title: 'Validation Error',
    description: message,
    variant: 'destructive'
  });
};

export const handleStorageError = (message: string, details?: any): void => {
  GuestGuideErrorLogger.getInstance().log({
    type: GuestGuideErrorType.STORAGE_ERROR,
    message,
    details,
    severity: 'high',
    recoverable: false
  });

  toast({
    title: 'Storage Error',
    description: 'Failed to save your changes. Please try again.',
    variant: 'destructive'
  });
};

export const handleSyncError = (message: string, details?: any): void => {
  GuestGuideErrorLogger.getInstance().log({
    type: GuestGuideErrorType.SYNC_ERROR,
    message,
    details,
    severity: 'medium'
  });

  toast({
    title: 'Sync Error',
    description: 'Changes may not be synchronized across devices.',
    variant: 'destructive'
  });
};

export const handleContextError = (message: string, details?: any): void => {
  GuestGuideErrorLogger.getInstance().log({
    type: GuestGuideErrorType.CONTEXT_ERROR,
    message,
    details,
    severity: 'critical',
    recoverable: false
  });

  toast({
    title: 'System Error',
    description: 'A critical error occurred. Please refresh the page.',
    variant: 'destructive'
  });
};

export const handleRenderError = (message: string, details?: any): void => {
  GuestGuideErrorLogger.getInstance().log({
    type: GuestGuideErrorType.RENDER_ERROR,
    message,
    details,
    severity: 'high'
  });

  toast({
    title: 'Display Error',
    description: 'Some content may not display correctly.',
    variant: 'destructive'
  });
};

export const handleNetworkError = (message: string, details?: any): void => {
  GuestGuideErrorLogger.getInstance().log({
    type: GuestGuideErrorType.NETWORK_ERROR,
    message,
    details,
    severity: 'medium'
  });

  toast({
    title: 'Network Error',
    description: 'Please check your internet connection.',
    variant: 'destructive'
  });
};

// Recovery mechanisms
export const attemptErrorRecovery = async (errorType: GuestGuideErrorType): Promise<boolean> => {
  const logger = GuestGuideErrorLogger.getInstance();
  
  try {
    switch (errorType) {
      case GuestGuideErrorType.STORAGE_ERROR:
        // Try to clear corrupted localStorage data
        localStorage.removeItem('pelangi-guest-guide-settings');
        localStorage.removeItem('pelangi-guest-guide-backup');
        toast({
          title: 'Recovery Attempt',
          description: 'Storage cleared. Please reconfigure your settings.',
          variant: 'default'
        });
        return true;

      case GuestGuideErrorType.SYNC_ERROR:
        // Force reload from server/default settings
        window.location.reload();
        return true;

      case GuestGuideErrorType.CONTEXT_ERROR:
        // Force page refresh
        window.location.reload();
        return true;

      default:
        return false;
    }
  } catch (recoveryError) {
    logger.log({
      type: GuestGuideErrorType.CONTEXT_ERROR,
      message: 'Error recovery failed',
      details: recoveryError,
      severity: 'critical'
    });
    return false;
  }
};

// Performance monitoring
export const monitorPerformance = (operation: string, startTime: number): void => {
  const duration = performance.now() - startTime;
  
  if (duration > 1000) { // Longer than 1 second
    GuestGuideErrorLogger.getInstance().log({
      type: GuestGuideErrorType.RENDER_ERROR,
      message: `Slow operation detected: ${operation}`,
      details: { operation, duration: `${duration.toFixed(2)}ms` },
      severity: 'medium'
    });
  }

  // Log performance metrics in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[GuestGuide] Performance: ${operation} took ${duration.toFixed(2)}ms`);
  }
};

// Error boundary helper
export const createErrorBoundary = (fallbackComponent: React.ComponentType) => {
  return class GuestGuideErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      handleRenderError('React Error Boundary caught an error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }

    render() {
      if (this.state.hasError) {
        return React.createElement(fallbackComponent);
      }

      return this.props.children;
    }
  };
};

// Utility functions
export const withErrorHandling = <T extends (...args: any[]) => any>(
  fn: T,
  errorType: GuestGuideErrorType = GuestGuideErrorType.CONTEXT_ERROR
): T => {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch(error => {
          GuestGuideErrorLogger.getInstance().log({
            type: errorType,
            message: `Async error in ${fn.name || 'anonymous function'}`,
            details: error,
            severity: 'high'
          });
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      GuestGuideErrorLogger.getInstance().log({
        type: errorType,
        message: `Error in ${fn.name || 'anonymous function'}`,
        details: error,
        severity: 'high'
      });
      throw error;
    }
  }) as T;
};

// Export singleton instance
export const errorLogger = GuestGuideErrorLogger.getInstance();

// Health check function
export const performHealthCheck = (): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  errors: number;
} => {
  const logger = GuestGuideErrorLogger.getInstance();
  const stats = logger.getErrorStats();
  
  const checks = {
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    })(),
    context: typeof window !== 'undefined',
    recentErrors: stats.recent < 5, // Less than 5 errors in the last hour
    criticalErrors: (stats.bySeverity.critical || 0) === 0
  };

  const healthyChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (healthyChecks === totalChecks) {
    status = 'healthy';
  } else if (healthyChecks >= totalChecks * 0.7) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    status,
    checks,
    errors: stats.total
  };
};
