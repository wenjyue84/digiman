/**
 * Shared types for push notification components
 */

export interface PushNotificationSettingsProps {
  className?: string;
}

export interface NotificationPreferences {
  guestCheckIn: boolean;
  checkoutReminders: boolean;
  overdueCheckouts: boolean;
  maintenanceRequests: boolean;
  dailyReminders: boolean;
}

export interface TestNotificationError {
  type: 'network' | 'permission' | 'subscription' | 'server' | 'browser' | 'unknown';
  message: string;
  details: string;
  troubleshooting: string[];
  actionRequired?: string;
}
