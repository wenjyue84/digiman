/**
 * Client-side Push Notification Service
 * Handles subscription, permission, and notification display
 */

export interface PushNotificationState {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  subscription: PushSubscription | null;
  loading: boolean;
  error: string | null;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationData {
  type: string;
  url?: string;
  [key: string]: any;
}

class PushNotificationManager {
  private state: PushNotificationState = {
    supported: false,
    permission: 'default',
    subscribed: false,
    subscription: null,
    loading: false,
    error: null,
  };

  private vapidPublicKey: string | null = null;
  private listeners: Map<string, Set<(state: PushNotificationState) => void>> = new Map();

  constructor() {
    this.checkSupport();
    this.updatePermissionState();
  }

  /**
   * Check if push notifications are supported
   */
  private checkSupport(): void {
    this.state.supported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
  }

  /**
   * Update permission state
   */
  private updatePermissionState(): void {
    if (this.state.supported) {
      this.state.permission = Notification.permission;
    }
    this.notifyStateChange();
  }

  /**
   * Get current state
   */
  getState(): PushNotificationState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(event: string, callback: (state: PushNotificationState) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(event: string, callback: (state: PushNotificationState) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Notify listeners of state changes
   */
  private notifyStateChange(): void {
    const stateCallbacks = this.listeners.get('stateChange');
    if (stateCallbacks) {
      stateCallbacks.forEach(callback => {
        try {
          callback(this.getState());
        } catch (error) {
          console.error('Error in push notification state change listener:', error);
        }
      });
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.state.supported) {
      throw new Error('Push notifications not supported');
    }

    try {
      this.state.loading = true;
      this.state.error = null;
      this.notifyStateChange();

      const permission = await Notification.requestPermission();
      this.state.permission = permission;
      
      if (permission === 'granted') {
        console.log('Push notification permission granted');
      } else if (permission === 'denied') {
        console.log('Push notification permission denied');
        this.state.error = 'Notification permission denied';
      } else {
        console.log('Push notification permission dismissed');
        this.state.error = 'Notification permission dismissed';
      }

      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      this.state.error = 'Failed to request permission';
      throw error;
    } finally {
      this.state.loading = false;
      this.notifyStateChange();
    }
  }

  /**
   * Get VAPID public key from server
   */
  private async getVapidPublicKey(): Promise<string> {
    if (this.vapidPublicKey) {
      return this.vapidPublicKey;
    }

    try {
      const response = await fetch('/api/push/vapid-key');
      if (!response.ok) {
        throw new Error('Failed to get VAPID key');
      }

      const data = await response.json();
      if (!data?.publicKey || typeof data.publicKey !== 'string') {
        throw new Error('Invalid VAPID key response');
      }
      this.vapidPublicKey = data.publicKey;
      return this.vapidPublicKey!;
    } catch (error) {
      console.error('Error getting VAPID public key:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(): Promise<boolean> {
    if (!this.state.supported) {
      throw new Error('Push notifications not supported');
    }

    if (this.state.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return false;
      }
    }

    try {
      this.state.loading = true;
      this.state.error = null;
      this.notifyStateChange();

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key
      const vapidPublicKey = await this.getVapidPublicKey();

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as Uint8Array<ArrayBuffer>,
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register push subscription on server');
      }

      this.state.subscribed = true;
      this.state.subscription = subscription;
      
      console.log('Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      this.state.error = 'Failed to subscribe to push notifications';
      throw error;
    } finally {
      this.state.loading = false;
      this.notifyStateChange();
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.state.subscription) {
      return true;
    }

    try {
      this.state.loading = true;
      this.state.error = null;
      this.notifyStateChange();

      // Unsubscribe from push manager
      const success = await this.state.subscription.unsubscribe();
      
      if (success) {
        // Notify server about unsubscription
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: this.state.subscription.endpoint,
          }),
        });

        this.state.subscribed = false;
        this.state.subscription = null;
        
        console.log('Successfully unsubscribed from push notifications');
      }

      return success;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      this.state.error = 'Failed to unsubscribe from push notifications';
      throw error;
    } finally {
      this.state.loading = false;
      this.notifyStateChange();
    }
  }

  /**
   * Check current subscription status
   */
  async checkSubscriptionStatus(): Promise<boolean> {
    if (!this.state.supported) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      this.state.subscribed = !!subscription;
      this.state.subscription = subscription;
      this.notifyStateChange();
      
      return !!subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Show a local notification (fallback when not subscribed)
   */
  showLocalNotification(title: string, options: NotificationOptions = {}): Promise<Notification> {
    return new Promise((resolve, reject) => {
      if (!this.state.supported) {
        reject(new Error('Notifications not supported'));
        return;
      }

      if (this.state.permission !== 'granted') {
        reject(new Error('Notification permission not granted'));
        return;
      }

      const notification = new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      resolve(notification);
    });
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Test push notifications
   */
  async testNotification(): Promise<void> {
    try {
      // Check if we have permission first
      if (Notification.permission !== 'granted') {
        throw new Error('Notification permission not granted. Please enable notifications in your browser settings.');
      }

      // Check if we have an active subscription
      if (!this.state.subscribed) {
        throw new Error('No active subscription found. Please subscribe to push notifications first.');
      }

      // Check if service worker is supported (less strict check)
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service worker not supported in this browser.');
      }

      // Try to send test notification via API first
      try {
        const response = await fetch('/api/push/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `Server responded with ${response.status}: ${response.statusText}`;
          
          if (response.status === 404) {
            throw new Error('Push notification service not found. Please check if the server is running.');
          } else if (response.status === 500) {
            throw new Error('Server error occurred while sending test notification. Please try again later.');
          } else if (response.status === 401) {
            throw new Error('Authentication required. Please log in again.');
          } else if (response.status === 403) {
            throw new Error('Access denied. You may not have permission to send test notifications.');
          } else {
            throw new Error(`Test notification failed: ${errorMessage}`);
          }
        }

        const result = await response.json();
        
        if (result.success) {
          console.log('Test notification sent successfully:', result.message);
          return;
        } else {
          throw new Error(result.error || 'Test notification failed with unknown error');
        }
      } catch (apiError) {
        console.warn('API test notification failed, trying fallback:', apiError);
        
        // Fallback: Show a local notification instead
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Test Notification', {
            body: 'This is a test notification from Pelangi Manager',
            icon: '/icon-192.png',
            tag: 'test-notification',
          });
          console.log('Fallback test notification shown successfully');
          return;
        }
        
        // If fallback also fails, throw the original error
        throw apiError;
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      
      // Enhance error with additional context
      if (error instanceof Error) {
        // Network errors
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
          error.message = 'Network error: Unable to connect to the notification service. Please check your internet connection.';
        }
        
        // Service worker errors
        if (error.message.includes('service worker') || error.message.includes('ServiceWorker')) {
          error.message = 'Service worker error: The notification service is not properly initialized. Please refresh the page.';
        }
        
        // Permission errors
        if (error.message.includes('permission') || error.message.includes('denied')) {
          error.message = 'Permission error: Browser has blocked notification permissions. Please enable notifications in your browser settings.';
        }
      }
      
      throw error;
    }
  }
}

// Singleton instance
export const pushNotificationManager = new PushNotificationManager();

/**
 * Hook for using push notifications in React components
 */
export function usePushNotifications() {
  const [state, setState] = React.useState(pushNotificationManager.getState());

  React.useEffect(() => {
    const handleStateChange = (newState: PushNotificationState) => {
      setState(newState);
    };

    pushNotificationManager.subscribe('stateChange', handleStateChange);
    
    // Check subscription status on mount
    pushNotificationManager.checkSubscriptionStatus().then(isSubscribed => {
      // Auto-request permission and subscribe if supported but not subscribed
      if (pushNotificationManager.getState().supported && !isSubscribed && Notification.permission === 'default') {
        // Only auto-request on PWA (when installed as app)
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
          pushNotificationManager.requestPermission().then(permission => {
            if (permission === 'granted') {
              pushNotificationManager.subscribeToPush().catch(console.error);
            }
          }).catch(console.error);
        }
      }
    });

    return () => {
      pushNotificationManager.unsubscribe('stateChange', handleStateChange);
    };
  }, []);

  return {
    ...state,
    requestPermission: () => pushNotificationManager.requestPermission(),
    subscribe: () => pushNotificationManager.subscribeToPush(),
    unsubscribe: () => pushNotificationManager.unsubscribeFromPush(),
    testNotification: () => pushNotificationManager.testNotification(),
    showLocalNotification: (title: string, options: NotificationOptions) =>
      pushNotificationManager.showLocalNotification(title, options),
  };
}

// Add React import for the hook
import * as React from 'react';

export default pushNotificationManager;
