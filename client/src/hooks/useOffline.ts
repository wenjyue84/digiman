/**
 * React hook for managing offline state and service worker functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { getServiceWorkerManager, ServiceWorkerState } from '@/lib/serviceWorker';
import { getOfflineQueueManager, QueuedRequest } from '@/lib/offlineQueue';

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  serviceWorker: ServiceWorkerState;
  queueSize: number;
  queuedRequests: QueuedRequest[];
  updateAvailable: boolean;
  syncInProgress: boolean;
}

export interface OfflineActions {
  updateServiceWorker: () => Promise<void>;
  clearQueue: () => Promise<void>;
  forceSync: () => Promise<void>;
  retrySync: () => Promise<void>;
}

export function useOffline(): [OfflineState, OfflineActions] {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    serviceWorker: {
      isRegistered: false,
      isOffline: !navigator.onLine,
      updateAvailable: false,
      installing: false,
    },
    queueSize: 0,
    queuedRequests: [],
    updateAvailable: false,
    syncInProgress: false,
  });

  const updateState = useCallback(async () => {
    const swManager = getServiceWorkerManager();
    const queueManager = getOfflineQueueManager();
    
    const [queueSize, queuedRequests] = await Promise.all([
      queueManager.getQueueSize(),
      queueManager.getQueue(),
    ]);

    setState(prevState => ({
      ...prevState,
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
      serviceWorker: swManager.getState(),
      queueSize,
      queuedRequests,
      updateAvailable: swManager.getState().updateAvailable,
    }));
  }, []);

  useEffect(() => {
    // Initial state update
    updateState();

    // Listen for online/offline events
    const handleOnline = () => updateState();
    const handleOffline = () => updateState();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker state changes
    const handleSWStateChange = () => updateState();
    window.addEventListener('sw-state-change', handleSWStateChange);

    // Listen for queue changes
    const queueManager = getOfflineQueueManager();
    const handleQueueChange = () => updateState();
    queueManager.addListener(handleQueueChange);

    // Periodic state updates
    const interval = setInterval(updateState, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sw-state-change', handleSWStateChange);
      queueManager.removeListener(handleQueueChange);
      clearInterval(interval);
    };
  }, [updateState]);

  const actions: OfflineActions = {
    updateServiceWorker: useCallback(async () => {
      const swManager = getServiceWorkerManager();
      await swManager.skipWaiting();
    }, []),

    clearQueue: useCallback(async () => {
      const queueManager = getOfflineQueueManager();
      await queueManager.clear();
      updateState();
    }, [updateState]),

    forceSync: useCallback(async () => {
      setState(prev => ({ ...prev, syncInProgress: true }));
      try {
        const queueManager = getOfflineQueueManager();
        await queueManager.sync();
      } finally {
        setState(prev => ({ ...prev, syncInProgress: false }));
        updateState();
      }
    }, [updateState]),

    retrySync: useCallback(async () => {
      if (navigator.onLine) {
        await actions.forceSync();
      }
    }, []),
  };

  return [state, actions];
}

/**
 * Hook for monitoring network connectivity
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
  };
}

/**
 * Hook for PWA installation
 */
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return false;

    const result = await installPrompt.prompt();
    const userChoice = result.outcome;

    if (userChoice === 'accepted') {
      setInstallPrompt(null);
      setIsInstallable(false);
      return true;
    }

    return false;
  }, [installPrompt]);

  return {
    isInstallable,
    isInstalled,
    install,
  };
}
