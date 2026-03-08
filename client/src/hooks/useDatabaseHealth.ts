import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface DatabaseHealthStatus {
  isHealthy: boolean;
  isConnected: boolean;
  lastCheck: Date | null;
  errorMessage: string | null;
  retryCount: number;
  shouldShowWizard: boolean;
}

export function useDatabaseHealth() {
  const [healthStatus, setHealthStatus] = useState<DatabaseHealthStatus>({
    isHealthy: true,
    isConnected: true,
    lastCheck: null,
    errorMessage: null,
    retryCount: 0,
    shouldShowWizard: false
  });
  
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkDatabaseHealth = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    
    try {
      // Single unauthenticated health check — avoids auth race condition
      const response = await fetch('/api/database/health');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Health check failed: ${response.status}`);
      }

      // If we get here, database is healthy
      setHealthStatus(prev => ({
        ...prev,
        isHealthy: true,
        isConnected: true,
        lastCheck: new Date(),
        errorMessage: null,
        retryCount: 0,
        shouldShowWizard: false
      }));

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      const newRetryCount = healthStatus.retryCount + 1;
      
      setHealthStatus(prev => ({
        ...prev,
        isHealthy: false,
        isConnected: false,
        lastCheck: new Date(),
        errorMessage,
        retryCount: newRetryCount,
        shouldShowWizard: newRetryCount >= 2 // Show wizard after 2 failed attempts
      }));

      // Show toast notification for connection issues
      if (newRetryCount === 1) {
        toast({
          title: "Database Connection Issue",
          description: "Unable to connect to database. Retrying...",
          variant: "destructive",
        });
      } else if (newRetryCount >= 2) {
        toast({
          title: "Database Connection Failed",
          description: "Opening Deployment Wizard to help resolve the issue",
          variant: "destructive",
        });
      }

      return false;
    } finally {
      setIsChecking(false);
    }
  }, [healthStatus.retryCount, toast]);

  const resetHealthStatus = useCallback(() => {
    setHealthStatus({
      isHealthy: true,
      isConnected: true,
      lastCheck: null,
      errorMessage: null,
      retryCount: 0,
      shouldShowWizard: false
    });
  }, []);

  const dismissWizard = useCallback(() => {
    setHealthStatus(prev => ({
      ...prev,
      shouldShowWizard: false
    }));
  }, []);

  // Initial health check on mount
  useEffect(() => {
    checkDatabaseHealth();
  }, []);

  // Periodic health checks every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isChecking) {
        checkDatabaseHealth();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isChecking, checkDatabaseHealth]);

  // Auto-retry on connection failure (with exponential backoff)
  useEffect(() => {
    if (!healthStatus.isHealthy && healthStatus.retryCount < 3) {
      const timeout = setTimeout(() => {
        checkDatabaseHealth();
      }, Math.min(1000 * Math.pow(2, healthStatus.retryCount), 10000)); // Max 10 second delay

      return () => clearTimeout(timeout);
    }
  }, [healthStatus.isHealthy, healthStatus.retryCount, checkDatabaseHealth]);

  return {
    healthStatus,
    checkDatabaseHealth,
    resetHealthStatus,
    dismissWizard,
    isChecking
  };
}
