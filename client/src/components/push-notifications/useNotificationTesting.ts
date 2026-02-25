/**
 * Hook for managing test notification sending, error categorization, and fetch interception
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { NotificationPreferences, TestNotificationError } from './types';

interface UseNotificationTestingOptions {
  subscribed: boolean;
  loading: boolean;
  testNotification: () => Promise<void>;
}

/**
 * Build a test payload for a specific notification type
 */
function buildTestPayload(type: keyof NotificationPreferences): Record<string, any> {
  switch (type) {
    case 'guestCheckIn':
      return {
        title: 'Test: Guest Check-in',
        body: 'John Doe has checked into Unit A1 (Test Notification)',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-guest-checkin',
        data: {
          type: 'test-guest-checkin',
          guestName: 'John Doe (Test)',
          unitNumber: 'A1',
          url: '/dashboard',
          isTest: true,
        },
        actions: [{ action: 'view', title: 'View Dashboard' }],
        requireInteraction: true,
        vibrate: [200, 100, 200],
      };

    case 'checkoutReminders':
      return {
        title: 'Test: Checkout Reminder',
        body: 'Jane Smith in Unit B2 is due for checkout today (Test Notification)',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-checkout-reminder',
        data: {
          type: 'test-checkout-reminder',
          guestName: 'Jane Smith (Test)',
          unitNumber: 'B2',
          url: '/dashboard',
          isTest: true,
        },
        actions: [
          { action: 'checkout', title: 'Check Out' },
          { action: 'view', title: 'View Details' },
        ],
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
      };

    case 'overdueCheckouts':
      return {
        title: 'Test: Overdue Checkout',
        body: 'Mike Johnson in Unit C3 is 2 day(s) overdue (Test Notification)',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-overdue-checkout',
        data: {
          type: 'test-overdue-checkout',
          guestName: 'Mike Johnson (Test)',
          unitNumber: 'C3',
          daysPast: 2,
          url: '/dashboard',
          isTest: true,
        },
        actions: [{ action: 'checkout', title: 'Check Out Now' }],
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500],
      };

    case 'maintenanceRequests':
      return {
        title: 'Test: Maintenance Request',
        body: 'Unit D4: Air conditioning not working (Test Notification)',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-maintenance',
        data: {
          type: 'test-maintenance',
          unitNumber: 'D4',
          issue: 'Air conditioning not working (Test)',
          url: '/dashboard',
          isTest: true,
        },
        actions: [{ action: 'view', title: 'View Details' }],
        requireInteraction: true,
        vibrate: [200, 100, 200],
      };

    case 'dailyReminders':
      return {
        title: 'Test: Daily Checkout Reminder',
        body: '3 checkouts due today, 1 overdue (Test Notification)',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-daily-reminder',
        data: {
          type: 'test-daily-reminder',
          checkoutCount: 3,
          overdueCount: 1,
          url: '/dashboard',
          isTest: true,
        },
        actions: [{ action: 'view', title: 'View Dashboard' }],
        requireInteraction: false,
        vibrate: [200, 100, 200],
      };

    default:
      throw new Error('Unknown notification type');
  }
}

/**
 * Categorize a generic error into a typed TestNotificationError
 */
export function categorizeError(error: any): TestNotificationError {
  const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';

  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
    return {
      type: 'network',
      message: 'Network Connection Issue',
      details: 'Unable to connect to the notification service',
      troubleshooting: [
        'Check your internet connection',
        'Ensure the server is running',
        'Try refreshing the page',
        "Check if you're behind a firewall or proxy",
      ],
      actionRequired: 'Check your connection and try again',
    };
  }

  // Permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('denied') || errorMessage.includes('blocked')) {
    return {
      type: 'permission',
      message: 'Notification Permission Issue',
      details: 'Browser has blocked notification permissions',
      troubleshooting: [
        'Click the lock/info icon in your browser address bar',
        'Set notifications to "Allow"',
        'Refresh the page after changing permissions',
        'Check browser settings for notification permissions',
      ],
      actionRequired: 'Enable notifications in your browser settings',
    };
  }

  // Subscription errors
  if (errorMessage.includes('subscription') || errorMessage.includes('subscribe') || errorMessage.includes('No active subscriptions')) {
    return {
      type: 'subscription',
      message: 'Subscription Not Active',
      details: 'You need to subscribe to push notifications first',
      troubleshooting: [
        'Click "Enable Push Notifications" above',
        'Grant permission when prompted',
        "Ensure you're logged in",
        'Check if the service worker is registered',
      ],
      actionRequired: 'Subscribe to push notifications first',
    };
  }

  // Server errors
  if (errorMessage.includes('500') || errorMessage.includes('server') || errorMessage.includes('internal')) {
    return {
      type: 'server',
      message: 'Server Error',
      details: 'The notification service encountered an error',
      troubleshooting: [
        'Wait a few minutes and try again',
        'Contact support if the problem persists',
        'Check server status',
        'Ensure VAPID keys are configured',
      ],
      actionRequired: 'Try again later or contact support',
    };
  }

  // Invalid key errors
  if (errorMessage.includes('INVALID_KEY') || errorMessage.includes('Setting key is required')) {
    return {
      type: 'server',
      message: 'Configuration Error',
      details: 'The system encountered a configuration issue while saving settings',
      troubleshooting: [
        'This is a system configuration issue',
        'Try refreshing the page and testing again',
        'Check if you have proper permissions',
        'Contact support if the problem persists',
      ],
      actionRequired: 'Refresh the page and try again',
    };
  }

  // Authentication errors (401)
  if (errorMessage.includes('401') || errorMessage.includes('Authentication required') || errorMessage.includes('Invalid or expired token')) {
    return {
      type: 'server',
      message: 'Authentication Required',
      details: 'Your session has expired or you need to log in again',
      troubleshooting: [
        'Try refreshing the page',
        'Log out and log back in',
        "Check if you're still logged in",
        'Clear browser cache and cookies',
        'Check if your session expired',
      ],
      actionRequired: 'Refresh the page or log in again',
    };
  }

  // Database constraint errors
  if (errorMessage.includes('constraint') || errorMessage.includes('null value') || errorMessage.includes('app_settings')) {
    return {
      type: 'server',
      message: 'Database Configuration Error',
      details: 'The system encountered a database configuration issue',
      troubleshooting: [
        'This is a system configuration issue',
        'Contact support with the error details',
        'Check server logs for more information',
        'Database may need to be reinitialized',
      ],
      actionRequired: 'Contact support - this is a system issue',
    };
  }

  // Browser compatibility
  if (errorMessage.includes('not supported') || errorMessage.includes('ServiceWorker') || errorMessage.includes('PushManager')) {
    return {
      type: 'browser',
      message: 'Browser Not Supported',
      details: "Your browser doesn't support push notifications",
      troubleshooting: [
        'Use Chrome, Firefox, Edge, or Safari',
        'Update to the latest browser version',
        'Enable JavaScript in your browser',
        "Check if you're in private/incognito mode",
      ],
      actionRequired: 'Use a supported browser',
    };
  }

  // Unknown errors
  return {
    type: 'unknown',
    message: 'Unexpected Error',
    details: 'An unexpected error occurred while testing notifications',
    troubleshooting: [
      'Refresh the page and try again',
      'Clear browser cache and cookies',
      'Check browser console for error details',
      'Contact support with error details',
    ],
    actionRequired: 'Try refreshing the page',
  };
}

/**
 * Categorize an error from a specific notification type test into a TestNotificationError
 */
function categorizeSpecificError(error: any): TestNotificationError {
  const errorMessage = error?.message || 'Unknown error occurred';
  let message = errorMessage;
  let details = 'An unexpected error occurred while testing notifications';
  let troubleshootingSteps = [
    'Check your internet connection',
    'Ensure the server is running',
    'Try refreshing the page',
    'Check browser console for detailed error logs',
    'Contact support if the problem persists',
  ];
  let actionRequired = 'Check browser console (F12) for detailed error information';

  if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
    message = 'Network Connection Issue';
    details = 'Unable to connect to the notification service. Please check your internet connection.';
  } else if (errorMessage.includes('No active subscriptions')) {
    message = 'No Active Subscriptions';
    details = 'You need to subscribe to push notifications first before testing individual notification types.';
    troubleshootingSteps = [
      'Click "Enable Push Notifications" button above first',
      'Grant browser permission when prompted',
      'Wait for "Active" status to appear',
      'Then try the individual test buttons',
    ];
    actionRequired = 'Subscribe to push notifications first';
  } else if (errorMessage.includes('401')) {
    message = 'Authentication Required';
    details = 'Your session has expired. Please refresh the page and try again.';
    troubleshootingSteps = [
      'Refresh the page to renew your session',
      'Log out and log back in',
      'Check if your session expired',
      'Clear browser cookies if needed',
    ];
    actionRequired = 'Refresh the page or log in again';
  } else if (errorMessage.includes('403')) {
    message = 'Access Denied';
    details = 'You do not have permission to send test notifications.';
  } else if (errorMessage.includes('404')) {
    message = 'API Endpoint Not Found';
    details = 'The individual test notification endpoint was not found. This has been fixed - please refresh the page.';
    troubleshootingSteps = [
      'Refresh the page to load the updated server endpoints',
      'Check if the server is running and up to date',
      'Clear browser cache if issues persist',
      'Contact support if the problem continues',
    ];
    actionRequired = 'Refresh the page and try again';
  } else if (errorMessage.includes('500')) {
    message = 'Server Error';
    details = 'The notification service encountered an internal error. Please try again later.';
  }

  return {
    type: 'unknown' as const,
    message,
    details,
    troubleshooting: troubleshootingSteps,
    actionRequired,
  };
}

export function useNotificationTesting({
  subscribed,
  loading,
  testNotification,
}: UseNotificationTestingOptions) {
  const { toast } = useToast();
  const [testError, setTestError] = useState<TestNotificationError | null>(null);
  const [testAttempts, setTestAttempts] = useState(0);
  const [isTestInProgress, setIsTestInProgress] = useState(false);

  // Clear test error when subscription status changes
  useEffect(() => {
    if (subscribed) {
      setTestError(null);
      setTestAttempts(0);
    }
  }, [subscribed]);

  // Intercept fetch calls during test to prevent accidental settings saves
  useEffect(() => {
    if (isTestInProgress) {
      console.log('Test in progress - blocking all preference saves');

      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const [url, options] = args;

        if (typeof url === 'string' && url.includes('/api/settings')) {
          console.log('INTERCEPTED SETTINGS API CALL during test:', { url, options });
          if (options?.body) {
            try {
              const body = JSON.parse(options.body as string);
              console.log('Request body:', body);
              if (!body.key || body.key === '') {
                console.error('INVALID KEY DETECTED:', body.key);
              }
            } catch (e) {
              console.error('Failed to parse request body:', e);
            }
          }
        }

        return originalFetch(...args);
      };

      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [isTestInProgress]);

  const handleTestNotification = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('Starting test notification...');
    setIsTestInProgress(true);
    try {
      setTestError(null);
      setTestAttempts(prev => prev + 1);

      console.log('Calling testNotification()...');
      await testNotification();

      console.log('Test notification sent successfully');
      toast({
        title: 'Test Sent Successfully!',
        description: "Check your device for the test notification. If you don't see it, check your notification settings.",
      });

      setTestError(null);
    } catch (error) {
      console.error('Test notification error:', error);

      const categorizedErr = categorizeError(error);
      setTestError(categorizedErr);

      toast({
        title: 'Test Failed',
        description: categorizedErr.message,
        variant: 'destructive',
      });
    } finally {
      console.log('Test notification process completed');
      setIsTestInProgress(false);
    }
  }, [testNotification, toast]);

  const handleTestSpecificNotification = useCallback(async (
    type: keyof NotificationPreferences,
    e?: React.MouseEvent,
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log(`Starting test notification for: ${type}`);
    setIsTestInProgress(true);

    try {
      setTestError(null);
      setTestAttempts(prev => prev + 1);

      const testPayload = buildTestPayload(type);
      console.log('Sending test payload:', testPayload);

      // Try specific endpoint first
      try {
        const response = await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload),
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          let errorData: any = {};
          try {
            errorData = await response.json();
            console.log('Error response data:', errorData);
          } catch (parseError) {
            const errorText = await response.text();
            console.log('Error response text:', errorText);
          }

          throw new Error(
            errorData.error ||
            errorData.message ||
            `Server responded with ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();
        console.log('Response result:', result);
        console.log('Specific test notification sent successfully via /api/push/send');

        toast({
          title: `Test ${type} Sent!`,
          description: `Test notification for ${type} has been sent. Check your device!`,
        });

        setTestError(null);
        return;
      } catch (endpointError: any) {
        console.log('Specific endpoint failed, trying fallback method:', endpointError.message);

        // Fallback to generic test notification
        try {
          console.log('Using fallback test notification method...');
          await testNotification();

          console.log('Fallback test notification sent successfully');
          toast({
            title: `Test ${type} Sent!`,
            description: 'Test notification sent via fallback method. Check your device!',
          });

          setTestError(null);
          return;
        } catch (fallbackError: any) {
          console.log('Both methods failed:', {
            endpointError: endpointError.message,
            fallbackError: fallbackError.message,
          });
          throw endpointError;
        }
      }
    } catch (error: any) {
      console.error(`Test notification error for ${type}:`, error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        cause: error?.cause,
      });

      const categorizedErr = categorizeSpecificError(error);
      setTestError(categorizedErr);

      toast({
        title: 'Test Failed',
        description: `Failed to send test ${type} notification: ${categorizedErr.message}`,
        variant: 'destructive',
      });
    } finally {
      console.log(`Test notification process completed for: ${type}`);
      setIsTestInProgress(false);
    }
  }, [testNotification, toast]);

  const retryTestNotification = useCallback(() => {
    setTestError(null);
    handleTestNotification();
  }, [handleTestNotification]);

  return {
    testError,
    testAttempts,
    isTestInProgress,
    handleTestNotification,
    handleTestSpecificNotification,
    retryTestNotification,
  };
}
