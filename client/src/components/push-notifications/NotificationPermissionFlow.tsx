/**
 * NotificationPermissionFlow - permission request UI and denied-state help
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell,
  BellRing,
  Settings,
  Smartphone,
  Laptop,
  AlertTriangle,
  Info,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface NotificationPermissionFlowProps {
  permission: NotificationPermission;
  subscribed: boolean;
  loading: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  openBrowserSettings: () => void;
  showSystemSettingsHelp: () => void;
  showExtensionHelp: () => void;
  checkPermissionStatus: () => void;
  getDeviceType: () => 'mobile' | 'desktop';
}

/** Status section showing device support, permission, and subscription state */
export function NotificationStatusSection({
  permission,
  subscribed,
  getDeviceType,
}: Pick<NotificationPermissionFlowProps, 'permission' | 'subscribed' | 'getDeviceType'>) {
  const DeviceIcon = getDeviceType() === 'mobile' ? Smartphone : Laptop;

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DeviceIcon className="h-4 w-4" />
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
  );
}

/** Permission request prompt (shown when not subscribed and permission not denied) */
export function PermissionRequestPrompt({
  loading,
  requestPermission,
}: Pick<NotificationPermissionFlowProps, 'loading' | 'requestPermission'>) {
  return (
    <div className="space-y-3">
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
  );
}

/** Permission denied help (shown when permission === 'denied') */
export function PermissionDeniedHelp({
  openBrowserSettings,
  showSystemSettingsHelp,
  showExtensionHelp,
  checkPermissionStatus,
}: Pick<
  NotificationPermissionFlowProps,
  'openBrowserSettings' | 'showSystemSettingsHelp' | 'showExtensionHelp' | 'checkPermissionStatus'
>) {
  return (
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

            <div className="space-y-1">
              <div className="text-xs font-medium text-blue-700">Chrome / Edge:</div>
              <ol className="text-xs text-blue-600 ml-4 space-y-1 list-decimal">
                <li>Click the lock/info icon in the address bar</li>
                <li>Click "Site settings" or "Permissions"</li>
                <li>Find "Notifications" and change from "Block" to "Allow"</li>
                <li>Refresh the page</li>
              </ol>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-blue-700">Firefox:</div>
              <ol className="text-xs text-blue-600 ml-4 space-y-1 list-decimal">
                <li>Click the shield icon in the address bar</li>
                <li>Click "Site Permissions" then "Notifications"</li>
                <li>Change from "Block" to "Allow"</li>
                <li>Refresh the page</li>
              </ol>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-blue-700">Safari:</div>
              <ol className="text-xs text-blue-600 ml-4 space-y-1 list-decimal">
                <li>{'Safari → Preferences → Websites → Notifications'}</li>
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
            onClick={showSystemSettingsHelp}
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            <Settings className="h-4 w-4 mr-2" />
            System Settings Help
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={showExtensionHelp}
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
            onClick={checkPermissionStatus}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Permission Status
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
