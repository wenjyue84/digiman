/**
 * Push Notification Settings Component
 * Allows users to manage push notification preferences
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  BellRing, 
  Settings, 
  Smartphone, 
  Laptop, 
  AlertTriangle, 
  CheckCircle, 
  TestTube,
  Info,
  HelpCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/lib/pushNotifications';

interface PushNotificationSettingsProps {
  className?: string;
}

interface NotificationPreferences {
  guestCheckIn: boolean;
  checkoutReminders: boolean;
  overdueCheckouts: boolean;
  maintenanceRequests: boolean;
  dailyReminders: boolean;
}

interface TestNotificationError {
  type: 'network' | 'permission' | 'subscription' | 'server' | 'browser' | 'unknown';
  message: string;
  details: string;
  troubleshooting: string[];
  actionRequired?: string;
}

export function PushNotificationSettings({ className = '' }: PushNotificationSettingsProps) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    guestCheckIn: true,
    checkoutReminders: true,
    overdueCheckouts: true,
    maintenanceRequests: true,
    dailyReminders: true,
  });
  const [testError, setTestError] = useState<TestNotificationError | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [testAttempts, setTestAttempts] = useState(0);
  const [isTestInProgress, setIsTestInProgress] = useState(false);

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

  useEffect(() => {
    // Clear test error when subscription status changes
    if (subscribed) {
      setTestError(null);
      setTestAttempts(0);
    }
  }, [subscribed]);

  // Prevent any automatic preference saving during test notifications
  useEffect(() => {
    if (isTestInProgress) {
      console.log('🛡️ Test in progress - blocking all preference saves');
      
      // Temporary: Intercept fetch calls to catch unexpected API calls
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const [url, options] = args;
        
        // ONLY intercept settings API calls, NOT push API calls
        if (typeof url === 'string' && url.includes('/api/settings')) {
          console.log('🚨 INTERCEPTED SETTINGS API CALL during test:', { url, options });
          if (options?.body) {
            try {
              const body = JSON.parse(options.body as string);
              console.log('📝 Request body:', body);
              if (!body.key || body.key === '') {
                console.error('❌ INVALID KEY DETECTED:', body.key);
              }
            } catch (e) {
              console.error('❌ Failed to parse request body:', e);
            }
          }
        }
        
        // For all other calls (including push notifications), use original fetch
        return originalFetch(...args);
      };
      
      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [isTestInProgress]);

  const handlePreferencesChange = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      // Debug logging to track preference changes
      console.log('🔧 handlePreferencesChange called with:', { key, value, isTestInProgress });
      
      // Validate the key parameter
      if (!key || typeof key !== 'string' || key.trim() === '') {
        console.error('❌ Invalid preference key:', key);
        toast({
          title: 'Error',
          description: 'Invalid preference key provided',
          variant: 'destructive',
        });
        return;
      }

      // Prevent saving during test notifications
      if (isTestInProgress) {
        console.log('⏸️ Skipping preference save during test notification');
        return;
      }

      console.log('💾 Saving preference:', { key, value });
      setPreferences(prev => ({ ...prev, [key]: value }));
      
      // Save notification preferences to backend with proper key format
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: `notification.${key}`, // Use proper key format
          value: String(value), // Convert boolean to string
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notification preferences');
      }

      console.log('✅ Preference saved successfully');
      toast({
        title: 'Settings Updated',
        description: 'Your notification preferences have been saved',
      });
    } catch (error) {
      console.error('❌ Error saving notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        variant: 'destructive',
      });
    }
  };

  const categorizeError = (error: any): TestNotificationError => {
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
          'Check if you\'re behind a firewall or proxy'
        ],
        actionRequired: 'Check your connection and try again'
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
          'Check browser settings for notification permissions'
        ],
        actionRequired: 'Enable notifications in your browser settings'
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
          'Ensure you\'re logged in',
          'Check if the service worker is registered'
        ],
        actionRequired: 'Subscribe to push notifications first'
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
          'Ensure VAPID keys are configured'
        ],
        actionRequired: 'Try again later or contact support'
      };
    }

    // Invalid key errors (from our validation)
    if (errorMessage.includes('INVALID_KEY') || errorMessage.includes('Setting key is required')) {
      return {
        type: 'server',
        message: 'Configuration Error',
        details: 'The system encountered a configuration issue while saving settings',
        troubleshooting: [
          'This is a system configuration issue',
          'Try refreshing the page and testing again',
          'Check if you have proper permissions',
          'Contact support if the problem persists'
        ],
        actionRequired: 'Refresh the page and try again'
      };
    }

    // Authentication errors (401 Unauthorized)
    if (errorMessage.includes('401') || errorMessage.includes('Authentication required') || errorMessage.includes('Invalid or expired token')) {
      return {
        type: 'server',
        message: 'Authentication Required',
        details: 'Your session has expired or you need to log in again',
        troubleshooting: [
          'Try refreshing the page',
          'Log out and log back in',
          'Check if you\'re still logged in',
          'Clear browser cache and cookies',
          'Check if your session expired'
        ],
        actionRequired: 'Refresh the page or log in again'
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
          'Database may need to be reinitialized'
        ],
        actionRequired: 'Contact support - this is a system issue'
      };
    }

    // Browser compatibility
    if (errorMessage.includes('not supported') || errorMessage.includes('ServiceWorker') || errorMessage.includes('PushManager')) {
      return {
        type: 'browser',
        message: 'Browser Not Supported',
        details: 'Your browser doesn\'t support push notifications',
        troubleshooting: [
          'Use Chrome, Firefox, Edge, or Safari',
          'Update to the latest browser version',
          'Enable JavaScript in your browser',
          'Check if you\'re in private/incognito mode'
        ],
        actionRequired: 'Use a supported browser'
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
        'Contact support with error details'
      ],
      actionRequired: 'Try refreshing the page'
    };
  };

  const handleTestNotification = async () => {
    console.log('🚀 Starting test notification...');
    setIsTestInProgress(true); // Set flag to prevent saving during test
    try {
      setTestError(null);
      setTestAttempts(prev => prev + 1);
      
      console.log('📡 Calling testNotification()...');
      await testNotification();
      
      console.log('✅ Test notification sent successfully');
      toast({
        title: 'Test Sent Successfully! 🎉',
        description: 'Check your device for the test notification. If you don\'t see it, check your notification settings.',
      });
      
      // Clear any previous errors
      setTestError(null);
    } catch (error) {
      console.error('❌ Test notification error:', error);
      
      const categorizedError = categorizeError(error);
      setTestError(categorizedError);
      
      toast({
        title: 'Test Failed',
        description: categorizedError.message,
        variant: 'destructive',
      });
    } finally {
      console.log('🏁 Test notification process completed');
      setIsTestInProgress(false); // Reset flag after test
    }
  };

  const retryTestNotification = () => {
    setTestError(null);
    handleTestNotification();
  };

  const openBrowserSettings = () => {
    // Try to open browser notification settings
    if ('Notification' in window && Notification.permission === 'denied') {
      // Show instructions for different browsers
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

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge className="bg-green-100 text-green-800">Granted</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="secondary">Not Requested</Badge>;
    }
  };

  const getDeviceIcon = () => {
    const userAgent = navigator.userAgent;
    if (/Mobi|Android/i.test(userAgent)) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Laptop className="h-4 w-4" />;
  };

  if (!supported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported on this device or browser.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          Push Notifications
          {subscribed && <Badge className="bg-green-100 text-green-800">Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getDeviceIcon()}
              <span className="text-sm font-medium">Device Support</span>
            </div>
            <Badge className="bg-green-100 text-green-800">Supported</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Permission</span>
            </div>
            {getPermissionBadge()}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm font-medium">Subscription</span>
            </div>
            <Badge variant={subscribed ? 'default' : 'secondary'}>
              {subscribed ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Permission Request Section */}
        {!subscribed && permission !== 'denied' && (
          <div className="space-y-3">
            {/* Information about notification permissions */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <div className="text-sm font-medium text-blue-800">Why do we need notification permission?</div>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p>Push notifications help you stay informed about important hostel activities:</p>
                    <ul className="ml-4 space-y-1 list-disc">
                      <li><strong>Guest Check-ins:</strong> Get notified when new guests arrive</li>
                      <li><strong>Checkout Reminders:</strong> Stay on top of guest departures</li>
                      <li><strong>Maintenance Alerts:</strong> Know about urgent repair requests</li>
                      <li><strong>Daily Updates:</strong> Receive morning summaries at 12 PM</li>
                    </ul>
                    <p className="mt-2"><strong>Note:</strong> We only send notifications for hostel-related activities. You can customize which types you receive.</p>
                  </div>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You need to grant notification permission to receive push notifications.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={requestPermission}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Requesting...' : 'Grant Permission'}
            </Button>
          </div>
        )}

        {/* Permission Denied Help */}
        {permission === 'denied' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-3">
              <div className="space-y-2">
                <div className="font-medium">Notification permission was denied. Here's why this happens and how to fix it:</div>
                
                {/* Common Reasons */}
                <div className="bg-red-50 border border-red-200 rounded-md p-3 space-y-2">
                  <div className="text-sm font-medium text-red-800">Common Reasons for Permission Denial:</div>
                  <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
                    <li><strong>Previous Denial:</strong> You previously clicked "Block" when the browser asked for permission</li>
                    <li><strong>Browser Settings:</strong> Your browser has notifications globally disabled</li>
                    <li><strong>Site Settings:</strong> This specific site is blocked in your browser's site settings</li>
                    <li><strong>Privacy Mode:</strong> You're browsing in incognito/private mode</li>
                    <li><strong>Browser Extensions:</strong> An ad blocker or privacy extension is blocking notifications</li>
                    <li><strong>System Settings:</strong> Your operating system has notifications disabled</li>
                  </ul>
                </div>

                {/* Browser-Specific Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
                  <div className="text-sm font-medium text-blue-800">How to Re-enable Notifications:</div>
                  
                  {/* Chrome Instructions */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-blue-700">🌐 Chrome / Edge:</div>
                    <ol className="text-xs text-blue-600 ml-4 space-y-1 list-decimal">
                      <li>Click the lock/info icon 🔒 in the address bar</li>
                      <li>Click "Site settings" or "Permissions"</li>
                      <li>Find "Notifications" and change from "Block" to "Allow"</li>
                      <li>Refresh the page</li>
                    </ol>
                  </div>

                  {/* Firefox Instructions */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-blue-700">🦊 Firefox:</div>
                    <ol className="text-xs text-blue-600 ml-4 space-y-1 list-decimal">
                      <li>Click the shield icon 🛡️ in the address bar</li>
                      <li>Click "Site Permissions" → "Notifications"</li>
                      <li>Change from "Block" to "Allow"</li>
                      <li>Refresh the page</li>
                    </ol>
                  </div>

                  {/* Safari Instructions */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-blue-700">🍎 Safari:</div>
                    <ol className="text-xs text-blue-600 ml-4 space-y-1 list-decimal">
                      <li>Safari → Preferences → Websites → Notifications</li>
                      <li>Find this site and change from "Deny" to "Allow"</li>
                      <li>Refresh the page</li>
                    </ol>
                  </div>
                </div>

                {/* Alternative Solutions */}
                <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-2">
                  <div className="text-sm font-medium text-green-800">Alternative Solutions:</div>
                  <ul className="text-xs text-green-700 space-y-1 ml-4 list-disc">
                    <li><strong>Try Different Browser:</strong> Test in Chrome, Firefox, or Edge</li>
                    <li><strong>Check Extensions:</strong> Temporarily disable ad blockers or privacy extensions</li>
                    <li><strong>System Settings:</strong> Check Windows/Mac notification settings</li>
                    <li><strong>Clear Site Data:</strong> Clear cookies and site data for this domain</li>
                    <li><strong>Contact Support:</strong> If nothing works, we can help troubleshoot</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={openBrowserSettings}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Show Browser Instructions
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    // Show system notification settings help
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
                  }}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings Help
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    // Show extension troubleshooting
                    toast({
                      title: 'Extension Troubleshooting',
                      description: 'Try disabling ad blockers, privacy extensions, or VPNs that might block notifications',
                    });
                  }}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <Info className="h-4 w-4 mr-2" />
                  Extension Help
                </Button>
              </div>

              {/* Quick Test */}
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">
                  <strong>Quick Test:</strong> After changing settings, click this button to check if permissions are working:
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    // Check current permission status
                    const currentPermission = Notification.permission;
                    let statusMessage = '';
                    
                    switch (currentPermission) {
                      case 'granted':
                        statusMessage = '✅ Great! Notifications are now enabled. You can subscribe to push notifications.';
                        break;
                      case 'denied':
                        statusMessage = '❌ Still denied. Please follow the steps above to enable notifications.';
                        break;
                      default:
                        statusMessage = '🤔 Permission not set. Please grant permission when prompted.';
                    }
                    
                    toast({
                      title: 'Permission Status Check',
                      description: statusMessage,
                      variant: currentPermission === 'granted' ? 'default' : 'destructive',
                    });
                  }}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Permission Status
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Notification Preferences */}
        {subscribed && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-900">Notification Types</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="guest-checkin" className="text-sm">
                  Guest Check-ins
                </Label>
                <Switch
                  id="guest-checkin"
                  checked={preferences.guestCheckIn}
                  onCheckedChange={(checked) =>
                    handlePreferencesChange('guestCheckIn', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="checkout-reminders" className="text-sm">
                  Checkout Reminders
                </Label>
                <Switch
                  id="checkout-reminders"
                  checked={preferences.checkoutReminders}
                  onCheckedChange={(checked) =>
                    handlePreferencesChange('checkoutReminders', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="overdue-checkouts" className="text-sm">
                  Overdue Checkouts
                </Label>
                <Switch
                  id="overdue-checkouts"
                  checked={preferences.overdueCheckouts}
                  onCheckedChange={(checked) =>
                    handlePreferencesChange('overdueCheckouts', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="maintenance" className="text-sm">
                  Maintenance Requests
                </Label>
                <Switch
                  id="maintenance"
                  checked={preferences.maintenanceRequests}
                  onCheckedChange={(checked) =>
                    handlePreferencesChange('maintenanceRequests', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="daily-reminders" className="text-sm">
                  Daily Reminders (12 PM)
                </Label>
                <Switch
                  id="daily-reminders"
                  checked={preferences.dailyReminders}
                  onCheckedChange={(checked) =>
                    handlePreferencesChange('dailyReminders', checked)
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Test Notification Section */}
        {subscribed && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-gray-900">Test Notifications</h4>
              {testAttempts > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {testAttempts} attempt{testAttempts !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={handleTestNotification}
              disabled={loading}
              className="w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send Test Notification'}
            </Button>

            {/* Test Error Display */}
            {testError && (
              <Alert variant="destructive" className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="font-medium">{testError.message}</div>
                    <div className="text-sm opacity-90">{testError.details}</div>
                    
                    {/* Troubleshooting Steps */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-700">Troubleshooting Steps:</span>
                      </div>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                        {testError.troubleshooting.map((step, index) => (
                          <li key={index} className="text-blue-600">{step}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Required */}
                    {testError.actionRequired && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="flex items-center gap-2 text-blue-800">
                          <Info className="h-4 w-4" />
                          <span className="font-medium">Action Required:</span>
                        </div>
                        <p className="text-sm text-blue-700 mt-1">{testError.actionRequired}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={retryTestNotification}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                      
                      {testError.type === 'permission' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openBrowserSettings}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Browser Settings
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Alert>
            )}
          </div>
        )}

        {/* Success Message */}
        {subscribed && !testError && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You're all set! You'll receive push notifications for hostel activities.
            </AlertDescription>
          </Alert>
        )}

        {/* Mobile Installation Hint */}
        {subscribed && /Mobi|Android/i.test(navigator.userAgent) && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <strong>Mobile Tip:</strong> Add this app to your home screen for the best notification experience.
            </AlertDescription>
          </Alert>
        )}

        {/* Troubleshooting Reference */}
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="w-full justify-between text-sm text-gray-600 hover:text-gray-900"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Troubleshooting Guide
            </span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {showTroubleshooting ? 'Hide' : 'Show'}
            </span>
          </Button>
          
          {showTroubleshooting && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
              <h5 className="font-medium text-sm text-gray-900">Common Issues & Solutions</h5>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>No notifications received?</strong>
                    <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                      <li>• Check browser notification settings</li>
                      <li>• Ensure "Do Not Disturb" is off</li>
                      <li>• Check if notifications are blocked</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Permission denied?</strong>
                    <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                      <li>• Click browser address bar lock icon</li>
                      <li>• Set notifications to "Allow"</li>
                      <li>• Refresh page after changing</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Test button not working?</strong>
                    <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                      <li>• Ensure you're subscribed first</li>
                      <li>• Check internet connection</li>
                      <li>• Try refreshing the page</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Mobile notifications?</strong>
                    <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                      <li>• Add app to home screen</li>
                      <li>• Check phone notification settings</li>
                      <li>• Ensure app has notification access</li>
                    </ul>
                  </div>
                </div>

                {/* New Permission Troubleshooting Section */}
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Still can't enable notifications?</strong>
                    <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                      <li>• Try a different browser (Chrome, Firefox, Edge)</li>
                      <li>• Disable ad blockers and privacy extensions</li>
                      <li>• Check system notification settings</li>
                      <li>• Clear browser cache and cookies</li>
                      <li>• Avoid private/incognito browsing mode</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Browser-specific issues?</strong>
                    <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                      <li>• <strong>Chrome:</strong> Check chrome://settings/content/notifications</li>
                      <li>• <strong>Firefox:</strong> Check about:preferences#privacy</li>
                      <li>• <strong>Edge:</strong> Check edge://settings/content/notifications</li>
                      <li>• <strong>Safari:</strong> Check Safari → Preferences → Websites</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs text-blue-600 p-0 h-auto"
                  onClick={() => {
                    // Open browser console or show debugging info
                    toast({
                      title: 'Debug Information',
                      description: 'Check browser console (F12) for detailed error logs',
                    });
                  }}
                >
                  <Info className="h-3 w-3 mr-1" />
                  Show Debug Info
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PushNotificationSettings;