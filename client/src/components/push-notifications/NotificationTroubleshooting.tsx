/**
 * NotificationTroubleshooting - collapsible troubleshooting guide
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TroubleshootingItem {
  color: string;
  title: string;
  steps: string[];
}

const troubleshootingItems: TroubleshootingItem[] = [
  {
    color: 'bg-blue-500',
    title: 'No notifications received?',
    steps: [
      'Check browser notification settings',
      'Ensure "Do Not Disturb" is off',
      'Check if notifications are blocked',
    ],
  },
  {
    color: 'bg-green-500',
    title: 'Permission denied?',
    steps: [
      'Click browser address bar lock icon',
      'Set notifications to "Allow"',
      'Refresh page after changing',
    ],
  },
  {
    color: 'bg-orange-500',
    title: 'Test button not working?',
    steps: [
      "Ensure you're subscribed first",
      'Check internet connection',
      'Try refreshing the page',
    ],
  },
  {
    color: 'bg-purple-500',
    title: 'Mobile notifications?',
    steps: [
      'Add app to home screen',
      'Check phone notification settings',
      'Ensure app has notification access',
    ],
  },
  {
    color: 'bg-red-500',
    title: "Still can't enable notifications?",
    steps: [
      'Try a different browser (Chrome, Firefox, Edge)',
      'Disable ad blockers and privacy extensions',
      'Check system notification settings',
      'Clear browser cache and cookies',
      'Avoid private/incognito browsing mode',
    ],
  },
  {
    color: 'bg-yellow-500',
    title: 'Browser-specific issues?',
    steps: [
      'Chrome: Check chrome://settings/content/notifications',
      'Firefox: Check about:preferences#privacy',
      'Edge: Check edge://settings/content/notifications',
      'Safari: Check Safari → Preferences → Websites',
    ],
  },
];

export function NotificationTroubleshooting() {
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const { toast } = useToast();

  return (
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
            {troubleshootingItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className={`w-2 h-2 ${item.color} rounded-full mt-2 flex-shrink-0`}></div>
                <div>
                  <strong>{item.title}</strong>
                  <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                    {item.steps.map((step, stepIdx) => (
                      <li key={stepIdx}>{'- ' + step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-200">
            <Button
              variant="link"
              size="sm"
              className="text-xs text-blue-600 p-0 h-auto"
              onClick={() => {
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
  );
}
