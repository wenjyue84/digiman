/**
 * Push Notification Settings Component
 * Allows users to manage push notification preferences
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  Smartphone, 
  Laptop, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  TestTube
} from 'lucide-react';
import { usePushNotifications } from '@/lib/pushNotifications';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationSettingsProps {
  className?: string;
}

export function PushNotificationSettings({ className = '' }: PushNotificationSettingsProps) {
  const { toast } = useToast();
  const {
    supported,
    permission,
    subscribed,
    loading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
  } = usePushNotifications();

  const [preferences, setPreferences] = useState({
    guestCheckIn: true,
    checkoutReminders: true,
    overdueCheckouts: true,
    maintenanceRequests: true,
    dailyReminders: true,
  });

  const handleToggleSubscription = async () => {
    try {
      if (subscribed) {
        await unsubscribe();
        toast({
          title: 'Unsubscribed',
          description: 'You will no longer receive push notifications',
        });
      } else {
        await subscribe();
        toast({
          title: 'Subscribed',
          description: 'You will now receive push notifications',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        variant: 'destructive',
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      await testNotification();
      toast({
        title: 'Test Sent',
        description: 'Check your device for the test notification',
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Failed to send test notification',
        variant: 'destructive',
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

        {/* Main Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <Label className="text-base font-medium">
              Enable Push Notifications
            </Label>
            <p className="text-sm text-gray-600">
              Receive real-time notifications on this device
            </p>
          </div>
          <Switch
            checked={subscribed}
            onCheckedChange={handleToggleSubscription}
            disabled={loading || permission === 'denied'}
          />
        </div>

        {/* Permission Request */}
        {permission !== 'granted' && !subscribed && (
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
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
                    setPreferences(prev => ({ ...prev, guestCheckIn: checked }))
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
                    setPreferences(prev => ({ ...prev, checkoutReminders: checked }))
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
                    setPreferences(prev => ({ ...prev, overdueCheckouts: checked }))
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
                    setPreferences(prev => ({ ...prev, maintenanceRequests: checked }))
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
                    setPreferences(prev => ({ ...prev, dailyReminders: checked }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Test Notification */}
        {subscribed && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleTestNotification}
              disabled={loading}
              className="w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send Test Notification'}
            </Button>
          </div>
        )}

        {/* Success Message */}
        {subscribed && (
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
      </CardContent>
    </Card>
  );
}

export default PushNotificationSettings;