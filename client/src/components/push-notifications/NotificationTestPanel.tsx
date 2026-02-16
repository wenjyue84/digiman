/**
 * NotificationTestPanel - test send button with status and save button
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationTestPanelProps {
  testAttempts: number;
  loading: boolean;
  onTestNotification: (e?: React.MouseEvent) => void;
}

export function NotificationTestPanel({
  testAttempts,
  loading,
  onTestNotification,
}: NotificationTestPanelProps) {
  const { toast } = useToast();

  return (
    <div className="pt-4 border-t space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-gray-900">Test Notifications</h4>
        {testAttempts > 0 && (
          <Badge variant="secondary" className="text-xs">
            {testAttempts} attempt{testAttempts !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="default"
          onClick={() => {
            toast({
              title: 'Settings Saved',
              description: 'Your notification preferences have been saved.',
            });
          }}
          className="flex-1"
        >
          <Settings className="h-4 w-4 mr-2" />
          Save
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onTestNotification}
          disabled={loading}
          className="flex-1"
        >
          <TestTube className="h-4 w-4 mr-2" />
          {loading ? 'Sending...' : 'Send Test Notification'}
        </Button>
      </div>
    </div>
  );
}
