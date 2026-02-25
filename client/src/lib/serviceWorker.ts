/**
 * Service Worker registration and management utilities
 * Handles PWA installation, updates, and offline functionality
 */

import { Workbox } from 'workbox-window';

export interface ServiceWorkerState {
  isRegistered: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  installing: boolean;
  wb?: Workbox;
}

export type ServiceWorkerEventType = 
  | 'installed' 
  | 'waiting' 
  | 'controlling' 
  | 'activated'
  | 'redundant';

export interface ServiceWorkerManager {
  register: () => Promise<void>;
  update: () => Promise<void>;
  skipWaiting: () => Promise<void>;
  getState: () => ServiceWorkerState;
  addEventListener: (type: ServiceWorkerEventType, callback: (event: any) => void) => void;
  removeEventListener: (type: ServiceWorkerEventType, callback: (event: any) => void) => void;
  isOnline: () => boolean;
  isOffline: () => boolean;
}

class ServiceWorkerManagerImpl implements ServiceWorkerManager {
  private wb: Workbox | null = null;
  private state: ServiceWorkerState = {
    isRegistered: false,
    isOffline: !navigator.onLine,
    updateAvailable: false,
    installing: false,
  };
  private listeners: Map<ServiceWorkerEventType, Set<(event: any) => void>> = new Map();

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.state.isOffline = false;
      this.notifyStateChange();
    });

    window.addEventListener('offline', () => {
      this.state.isOffline = true;
      this.notifyStateChange();
    });
  }

  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      // Add timestamp to force update
      const swUrl = `/sw.js?t=${Date.now()}`;
      this.wb = new Workbox(swUrl);
      this.state.wb = this.wb;
      
      // Set up event listeners
      this.setupWorkboxListeners();

      // Register the service worker
      await this.wb.register();
      this.state.isRegistered = true;
      
      console.log('Service Worker registered successfully');
      this.notifyStateChange();
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  private setupWorkboxListeners(): void {
    if (!this.wb) return;

    this.wb.addEventListener('installed', (event) => {
      console.log('Service Worker installed:', event);
      this.state.installing = false;
      this.dispatchEvent('installed', event);
    });

    this.wb.addEventListener('waiting', (event) => {
      console.log('Service Worker waiting:', event);
      this.state.updateAvailable = true;
      this.dispatchEvent('waiting', event);
      this.notifyStateChange();
    });

    this.wb.addEventListener('controlling', (event) => {
      console.log('Service Worker controlling:', event);
      this.dispatchEvent('controlling', event);
      
      // Don't auto-reload to prevent deployment conflicts
      // window.location.reload();
    });

    this.wb.addEventListener('activated', (event) => {
      console.log('Service Worker activated:', event);
      this.dispatchEvent('activated', event);
    });

    this.wb.addEventListener('redundant', (event) => {
      console.log('Service Worker redundant:', event);
      this.dispatchEvent('redundant', event);
    });

    // Additional SW events handled via navigator.serviceWorker if needed
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Service Worker message:', event.data);
        
        // Handle notification clicks
        if (event.data?.type === 'NOTIFICATION_CLICK') {
          const { url, action, data } = event.data;
          
          // Navigate to the specified URL
          if (url && window.location.pathname !== url) {
            window.location.href = url;
          }
          
          // Handle specific actions
          if (action === 'checkout' && data?.guestName) {
            console.log('Quick checkout requested for:', data.guestName);
            // Could trigger a checkout modal here
          }
        }
      });
    }
  }

  async update(): Promise<void> {
    if (!this.wb) {
      throw new Error('Service Worker not registered');
    }

    try {
      await this.wb.update();
      console.log('Service Worker update check completed');
    } catch (error) {
      console.error('Service Worker update failed:', error);
      throw error;
    }
  }

  async skipWaiting(): Promise<void> {
    if (!this.wb) {
      throw new Error('Service Worker not registered');
    }

    try {
      await this.wb.messageSkipWaiting();
      console.log('Service Worker skip waiting triggered');
    } catch (error) {
      console.error('Service Worker skip waiting failed:', error);
      throw error;
    }
  }

  getState(): ServiceWorkerState {
    return { ...this.state };
  }

  addEventListener(type: ServiceWorkerEventType, callback: (event: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
  }

  removeEventListener(type: ServiceWorkerEventType, callback: (event: any) => void): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  isOffline(): boolean {
    return !navigator.onLine;
  }

  private dispatchEvent(type: ServiceWorkerEventType, event: any): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in ${type} event listener:`, error);
        }
      });
    }
  }

  private notifyStateChange(): void {
    // Dispatch custom event for state changes
    window.dispatchEvent(new CustomEvent('sw-state-change', {
      detail: this.getState()
    }));
  }
}

// Singleton instance
let serviceWorkerManager: ServiceWorkerManager | null = null;

/**
 * Get the singleton service worker manager instance
 */
export function getServiceWorkerManager(): ServiceWorkerManager {
  if (!serviceWorkerManager) {
    serviceWorkerManager = new ServiceWorkerManagerImpl();
  }
  return serviceWorkerManager;
}

/**
 * Register the service worker with default settings
 */
export async function registerServiceWorker(): Promise<ServiceWorkerManager> {
  const manager = getServiceWorkerManager();
  await manager.register();
  return manager;
}

/**
 * Check if the app can be installed as PWA
 */
export function canInstallPWA(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check if the app is running as PWA
 */
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         (window.navigator as any).standalone === true;
}

/**
 * Get PWA install prompt event if available
 */
export function getPWAInstallPrompt(): any {
  return (window as any).deferredPrompt;
}

/**
 * Clear PWA install prompt
 */
export function clearPWAInstallPrompt(): void {
  (window as any).deferredPrompt = null;
}

/**
 * Service worker utilities for debugging
 */
export const swDebug = {
  /**
   * Get all service worker registrations
   */
  async getRegistrations(): Promise<ServiceWorkerRegistration[]> {
    if (!('serviceWorker' in navigator)) return [];
    const registrations = await navigator.serviceWorker.getRegistrations();
    return Array.from(registrations);
  },

  /**
   * Unregister all service workers
   */
  async unregisterAll(): Promise<boolean[]> {
    const registrations = await this.getRegistrations();
    return Promise.all(registrations.map(reg => reg.unregister()));
  },

  /**
   * Get cache names
   */
  async getCacheNames(): Promise<string[]> {
    if (!('caches' in window)) return [];
    return await caches.keys();
  },

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<boolean[]> {
    const cacheNames = await this.getCacheNames();
    return Promise.all(cacheNames.map(name => caches.delete(name)));
  },

  /**
   * Get cache contents
   */
  async getCacheContents(cacheName: string): Promise<string[]> {
    if (!('caches' in window)) return [];
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    return requests.map(req => req.url);
  }
};
