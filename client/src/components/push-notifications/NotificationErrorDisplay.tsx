/**
 * NotificationErrorDisplay - error rendering with troubleshooting steps
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  AlertTriangle,
  Info,
  HelpCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type { TestNotificationError } from './types';

interface NotificationErrorDisplayProps {
  testError: TestNotificationError;
  onRetry: () => void;
  onOpenBrowserSettings: () => void;
}

export function NotificationErrorDisplay({
  testError,
  onRetry,
  onOpenBrowserSettings,
}: NotificationErrorDisplayProps) {
  return (
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
              onClick={onRetry}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            {testError.type === 'permission' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenBrowserSettings}
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
  );
}
