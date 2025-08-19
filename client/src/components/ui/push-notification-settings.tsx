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

  const handlePreferencesChange = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      setPreferences(prev => ({ ...prev, [key]: value }));
      // Here you would typically save to backend
      toast({
        title: 'Settings Updated',
        description: 'Your notification preferences have been saved',
      });
    } catch (error) {
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
    try {
      setTestError(null);
      setTestAttempts(prev => prev + 1);
      
      await testNotification();
      
      toast({
        title: 'Test Sent Successfully! 🎉',
        description: 'Check your device for the test notification. If you don\'t see it, check your notification settings.',
      });
      
      // Clear any previous errors
      setTestError(null);
    } catch (error) {
      console.error('Test notification error:', error);
      
      const categorizedError = categorizeError(error);
      setTestError(categorizedError);
      
      toast({
        title: 'Test Failed',
        description: categorizedError.message,
        variant: 'destructive',
      });
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
            <AlertDescription className="space-y-2">
              <div>Notification permission was denied. You need to enable it in your browser settings.</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={openBrowserSettings}
                className="mt-2"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                How to Enable Notifications
              </Button>
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