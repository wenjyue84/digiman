/**
 * Hook for managing notification permission state and browser settings helpers
 */

import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/lib/pushNotifications';

export function useNotificationPermission() {
  const { toast } = useToast();

  const {
    supported,
    permission,
    subscribed,
    error,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
  } = usePushNotifications();

  const openBrowserSettings = () => {
    if ('Notification' in window && Notification.permission === 'denied') {
      const isChrome = /Chrome/.test(navigator.userAgent);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      const isEdge = /Edg/.test(navigator.userAgent);

      let instructions = '';
      if (isChrome) {
        instructions = 'Chrome: Settings → Privacy and security → Site Settings → Notifications → Find this site → Allow';
      } else if (isFirefox) {
        instructions = 'Firefox: Settings → Privacy & Security → Permissions → Notifications → Settings → Allow';
      } else if (isEdge) {
        instructions = 'Edge: Settings → Cookies and site permissions → Notifications → Find this site → Allow';
      } else {
        instructions = 'Check your browser settings for notification permissions';
      }

      toast({
        title: 'Browser Settings Instructions',
        description: instructions,
      });
    }
  };

  const showSystemSettingsHelp = () => {
    const isWindows = navigator.platform.indexOf('Win') !== -1;
    const isMac = navigator.platform.indexOf('Mac') !== -1;

    let systemInstructions = '';
    if (isWindows) {
      systemInstructions = 'Windows: Settings → System → Notifications & actions → Turn on notifications';
    } else if (isMac) {
      systemInstructions = 'Mac: System Preferences → Notifications → Safari → Allow notifications';
    } else {
      systemInstructions = 'Check your operating system notification settings';
    }

    toast({
      title: 'System Notification Settings',
      description: systemInstructions,
    });
  };

  const showExtensionHelp = () => {
    toast({
      title: 'Extension Troubleshooting',
      description: 'Try disabling ad blockers, privacy extensions, or VPNs that might block notifications',
    });
  };

  const checkPermissionStatus = () => {
    const currentPermission = Notification.permission;
    let statusMessage = '';

    switch (currentPermission) {
      case 'granted':
        statusMessage = 'Great! Notifications are now enabled. You can subscribe to push notifications.';
        break;
      case 'denied':
        statusMessage = 'Still denied. Please follow the steps above to enable notifications.';
        break;
      default:
        statusMessage = 'Permission not set. Please grant permission when prompted.';
    }

    toast({
      title: 'Permission Status Check',
      description: statusMessage,
      variant: currentPermission === 'granted' ? 'default' : 'destructive',
    });
  };

  const getDeviceType = (): 'mobile' | 'desktop' => {
    return /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  };

  return {
    // State from usePushNotifications
    supported,
    permission,
    subscribed,
    error,
    loading,
    // Actions from usePushNotifications
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
    // Permission helpers
    openBrowserSettings,
    showSystemSettingsHelp,
    showExtensionHelp,
    checkPermissionStatus,
    getDeviceType,
  };
}
