/**
 * Offline Indicator Component
 * Shows network status, service worker state, and offline queue information
 */

import React from 'react';
import { AlertTriangle, Wifi, WifiOff, Download, Upload, RefreshCw, X, CheckCircle, Clock } from 'lucide-react';
import { useOffline, useNetworkStatus, usePWAInstall } from '@/hooks/useOffline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineIndicator({ className = '', showDetails = false }: OfflineIndicatorProps) {
  const [state, actions] = useOffline();
  const { isOnline, isOffline } = useNetworkStatus();

  if (isOnline && state.queueSize === 0 && !state.updateAvailable) {
    return null; // Don't show anything when everything is normal
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}>
      {/* Offline Status */}
      {isOffline && (
        <Alert className="mb-2 border-red-200 bg-red-50">
          <WifiOff className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>You're offline.</strong> Changes will be saved and synced when connection is restored.
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Sync Queue */}
      {state.queueSize > 0 && (
        <Alert className="mb-2 border-amber-200 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 flex items-center justify-between">
            <span>
              <strong>{state.queueSize} changes</strong> waiting to sync
            </span>
            <div className="flex gap-1">
              {isOnline && !state.syncInProgress && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={actions.forceSync}
                  className="h-6 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync Now
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={actions.clearQueue}
                className="h-6 text-xs text-amber-600 hover:text-amber-800"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Sync in Progress */}
      {state.syncInProgress && (
        <Alert className="mb-2 border-blue-200 bg-blue-50">
          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">
            <strong>Syncing changes...</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* App Update Available */}
      {state.updateAvailable && (
        <Alert className="mb-2 border-green-200 bg-green-50">
          <Download className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 flex items-center justify-between">
            <span>
              <strong>App update available!</strong>
            </span>
            <Button
              size="sm"
              onClick={actions.updateServiceWorker}
              className="h-6 text-xs bg-green-600 hover:bg-green-700"
            >
              Update
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Status (when showDetails is true) */}
      {showDetails && (
        <Card className="mt-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Wifi className={`h-4 w-4 mr-2 ${isOnline ? 'text-green-600' : 'text-red-600'}`} />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Network:</span>
              <Badge variant={isOnline ? 'default' : 'destructive'}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Service Worker:</span>
              <Badge variant={state.serviceWorker.isRegistered ? 'default' : 'secondary'}>
                {state.serviceWorker.isRegistered ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Pending Sync:</span>
              <Badge variant={state.queueSize > 0 ? 'destructive' : 'default'}>
                {state.queueSize} items
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Simple network status indicator for the header
 */
export function NetworkStatusBadge() {
  const { isOnline } = useNetworkStatus();
  const [state] = useOffline();

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <Badge variant="destructive" className="text-xs">
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      )}
      
      {state.queueSize > 0 && (
        <Badge variant="secondary" className="text-xs">
          <Upload className="h-3 w-3 mr-1" />
          {state.queueSize}
        </Badge>
      )}
      
      {state.updateAvailable && (
        <Badge variant="default" className="text-xs">
          <Download className="h-3 w-3 mr-1" />
          Update
        </Badge>
      )}
    </div>
  );
}

/**
 * PWA Install Button
 */
export function PWAInstallButton() {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <Button onClick={install} size="sm" variant="outline">
      <Download className="h-4 w-4 mr-2" />
      Install App
    </Button>
  );
}

/**
 * Offline Toast Component for manual notifications
 */
export function OfflineToast({ 
  message, 
  type = 'info',
  onClose 
}: { 
  message: string; 
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
}) {
  const icons = {
    info: WifiOff,
    success: CheckCircle,
    warning: AlertTriangle,
    error: X,
  };

  const colors = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    error: 'border-red-200 bg-red-50 text-red-800',
  };

  const Icon = icons[type];

  return (
    <Alert className={`${colors[type]} shadow-lg`}>
      <Icon className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onClose && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Queue Status Component for debugging/admin
 */
export function QueueStatus({ detailed = false }: { detailed?: boolean }) {
  const [state, actions] = useOffline();

  if (!detailed && state.queueSize === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Offline Queue Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span>Total Requests:</span>
          <Badge>{state.queueSize}</Badge>
        </div>
        
        {detailed && state.queuedRequests.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium">Queued Requests:</span>
            {state.queuedRequests.slice(0, 5).map((request) => (
              <div key={request.id} className="text-xs p-2 bg-gray-50 rounded">
                <div className="flex items-center justify-between">
                  <span className="font-mono">{request.method}</span>
                  <Badge variant="outline" className="text-xs">
                    {request.type}
                  </Badge>
                </div>
                <div className="text-gray-600 truncate">
                  {request.url}
                </div>
                <div className="text-gray-500">
                  {new Date(request.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {state.queuedRequests.length > 5 && (
              <div className="text-xs text-gray-500 text-center">
                ...and {state.queuedRequests.length - 5} more
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={actions.forceSync}
            disabled={!navigator.onLine || state.syncInProgress}
            className="text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${state.syncInProgress ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={actions.clearQueue}
            className="text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
