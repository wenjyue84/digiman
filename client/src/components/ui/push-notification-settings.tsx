/**
 * Push Notification Settings Component
 * Orchestrator that composes sub-components for managing push notification preferences
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BellOff,
  BellRing,
  AlertTriangle,
  CheckCircle,
  Smartphone,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useNotificationPermission } from '@/components/push-notifications/useNotificationPermission';
import { useNotificationTesting } from '@/components/push-notifications/useNotificationTesting';
import {
  NotificationStatusSection,
  PermissionRequestPrompt,
  PermissionDeniedHelp,
} from '@/components/push-notifications/NotificationPermissionFlow';
import { NotificationPreferences } from '@/components/push-notifications/NotificationPreferences';
import { NotificationTestPanel } from '@/components/push-notifications/NotificationTestPanel';
import { NotificationErrorDisplay } from '@/components/push-notifications/NotificationErrorDisplay';
import { NotificationTroubleshooting } from '@/components/push-notifications/NotificationTroubleshooting';
import type { NotificationPreferences as NotificationPreferencesType } from '@/components/push-notifications/types';

// Re-export the TestNotificationError interface for consumers that import it from here
export type { TestNotificationError } from '@/components/push-notifications/types';

interface PushNotificationSettingsProps {
  className?: string;
}

export function PushNotificationSettings({ className = '' }: PushNotificationSettingsProps) {
  const { toast } = useToast();

  const [preferences, setPreferences] = useState<NotificationPreferencesType>({
    guestCheckIn: true,
    checkoutReminders: true,
    overdueCheckouts: true,
    maintenanceRequests: true,
    dailyReminders: true,
  });

  const {
    supported,
    permission,
    subscribed,
    error,
    loading,
    requestPermission,
    testNotification,
    openBrowserSettings,
    showSystemSettingsHelp,
    showExtensionHelp,
    checkPermissionStatus,
    getDeviceType,
  } = useNotificationPermission();

  const {
    testError,
    testAttempts,
    isTestInProgress,
    handleTestNotification,
    handleTestSpecificNotification,
    retryTestNotification,
  } = useNotificationTesting({ subscribed, loading, testNotification });

  const handlePreferencesChange = async (key: keyof NotificationPreferencesType, value: boolean) => {
    try {
      console.log('handlePreferencesChange called with:', { key, value, isTestInProgress });

      if (!key || typeof key !== 'string' || key.trim() === '') {
        console.error('Invalid preference key:', key);
        toast({
          title: 'Error',
          description: 'Invalid preference key provided',
          variant: 'destructive',
        });
        return;
      }

      if (isTestInProgress) {
        console.log('Skipping preference save during test notification');
        return;
      }

      console.log('Saving preference:', { key, value });
      setPreferences(prev => ({ ...prev, [key]: value }));

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `notification.${key}`,
          value: String(value),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notification preferences');
      }

      console.log('Preference saved successfully');
      toast({
        title: 'Settings Updated',
        description: 'Your notification preferences have been saved',
      });
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      toast({
        title: 'Error',
        description: 'Failed to update notification settings',
        variant: 'destructive',
      });
    }
  };

  // Not supported fallback
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
        <NotificationStatusSection
          permission={permission}
          subscribed={subscribed}
          getDeviceType={getDeviceType}
        />

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Permission Request Section */}
        {!subscribed && permission !== 'denied' && (
          <PermissionRequestPrompt
            loading={loading}
            requestPermission={requestPermission}
          />
        )}

        {/* Permission Denied Help */}
        {permission === 'denied' && (
          <PermissionDeniedHelp
            openBrowserSettings={openBrowserSettings}
            showSystemSettingsHelp={showSystemSettingsHelp}
            showExtensionHelp={showExtensionHelp}
            checkPermissionStatus={checkPermissionStatus}
          />
        )}

        {/* Notification Preferences */}
        {subscribed && (
          <NotificationPreferences
            preferences={preferences}
            isTestInProgress={isTestInProgress}
            onPreferenceChange={handlePreferencesChange}
            onTestSpecific={handleTestSpecificNotification}
          />
        )}

        {/* Test Notification Section */}
        {subscribed && (
          <>
            <NotificationTestPanel
              testAttempts={testAttempts}
              loading={loading}
              onTestNotification={handleTestNotification}
            />

            {/* Test Error Display */}
            {testError && (
              <NotificationErrorDisplay
                testError={testError}
                onRetry={retryTestNotification}
                onOpenBrowserSettings={openBrowserSettings}
              />
            )}
          </>
        )}

        {/* Success Message */}
        {subscribed && !testError && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {"You're all set! You'll receive push notifications for hostel activities."}
            </AlertDescription>
          </Alert>
        )}

        {/* Mobile Installation Hint */}
        {subscribed && getDeviceType() === 'mobile' && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <strong>Mobile Tip:</strong> Add this app to your home screen for the best notification experience.
            </AlertDescription>
          </Alert>
        )}

        {/* Troubleshooting Reference */}
        <NotificationTroubleshooting />
      </CardContent>
    </Card>
  );
}

export default PushNotificationSettings;
