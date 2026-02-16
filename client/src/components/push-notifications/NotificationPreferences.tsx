/**
 * NotificationPreferences - toggle settings for each notification type with per-type test buttons
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Info, HelpCircle, Play, RefreshCw } from 'lucide-react';
import type { NotificationPreferences as Preferences } from './types';

interface NotificationPreferencesProps {
  preferences: Preferences;
  isTestInProgress: boolean;
  onPreferenceChange: (key: keyof Preferences, value: boolean) => void;
  onTestSpecific: (type: keyof Preferences, e?: React.MouseEvent) => void;
}

interface PreferenceRowProps {
  id: string;
  label: string;
  checked: boolean;
  isTestInProgress: boolean;
  testTitle: string;
  onCheckedChange: (checked: boolean) => void;
  onTest: (e: React.MouseEvent) => void;
}

function PreferenceRow({
  id,
  label,
  checked,
  isTestInProgress,
  testTitle,
  onCheckedChange,
  onTest,
}: PreferenceRowProps) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onTest}
          disabled={isTestInProgress}
          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={testTitle}
        >
          {isTestInProgress ? (
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          ) : (
            <Play className="h-4 w-4 text-blue-600" />
          )}
        </Button>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      </div>
    </div>
  );
}

export function NotificationPreferences({
  preferences,
  isTestInProgress,
  onPreferenceChange,
  onTestSpecific,
}: NotificationPreferencesProps) {
  const preferenceItems: Array<{
    id: string;
    key: keyof Preferences;
    label: string;
    testTitle: string;
  }> = [
    { id: 'guest-checkin', key: 'guestCheckIn', label: 'Guest Check-ins', testTitle: 'Test Guest Check-in Notification' },
    { id: 'checkout-reminders', key: 'checkoutReminders', label: 'Checkout Reminders', testTitle: 'Test Checkout Reminder Notification' },
    { id: 'overdue-checkouts', key: 'overdueCheckouts', label: 'Overdue Checkouts', testTitle: 'Test Overdue Checkout Notification' },
    { id: 'maintenance', key: 'maintenanceRequests', label: 'Maintenance Requests', testTitle: 'Test Maintenance Request Notification' },
    { id: 'daily-reminders', key: 'dailyReminders', label: 'Daily Reminders (12 PM)', testTitle: 'Test Daily Reminder Notification' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-gray-900">Notification Types</h4>

        {/* Test Button Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-blue-800">Test Your Notifications</div>
              <div className="text-xs text-blue-700">
                Click the <Play className="h-3 w-3 inline text-blue-600" /> button beside each toggle to test that specific notification type.
                These are safe test notifications that won't affect your production data.
              </div>
            </div>
          </div>
        </div>

        {/* Debugging Help */}
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-amber-800">Having Issues?</div>
              <div className="text-xs text-amber-700">
                {"If test buttons don't work, check the browser console (F12 → Console) for detailed error logs. "}
                The system will automatically try fallback methods if the primary endpoint fails.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {preferenceItems.map((item) => (
          <PreferenceRow
            key={item.key}
            id={item.id}
            label={item.label}
            checked={preferences[item.key]}
            isTestInProgress={isTestInProgress}
            testTitle={item.testTitle}
            onCheckedChange={(checked) => onPreferenceChange(item.key, checked)}
            onTest={(e) => onTestSpecific(item.key, e)}
          />
        ))}
      </div>
    </div>
  );
}
