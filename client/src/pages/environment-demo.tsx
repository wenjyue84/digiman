import { useState, useEffect } from 'react';
import { EnvironmentInfo } from '@/components/environment-info';
import { ReplitConfigGuide } from '@/components/ReplitConfigGuide';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Cloud, 
  Database, 
  HardDrive, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Zap
} from 'lucide-react';

export default function EnvironmentDemoPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/environment/config');
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (error) {
        console.error('Failed to fetch environment config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Settings className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading environment configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  const getEnvironmentIcon = () => {
    if (config?.isReplit) {
      return <Cloud className="h-6 w-6 text-green-600" />;
    } else if (config?.isLocalhost) {
      return <HardDrive className="h-6 w-6 text-blue-600" />;
    } else if (config?.isProduction) {
      return <Database className="h-6 w-6 text-purple-600" />;
    }
    return <Settings className="h-6 w-6 text-gray-600" />;
  };

  const getEnvironmentBadge = () => {
    if (config?.isReplit) {
      return <Badge variant="default" className="bg-green-100 text-green-800">☁️ Replit Environment</Badge>;
    } else if (config?.isLocalhost) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">🖥️ Localhost Development</Badge>;
    } else if (config?.isProduction) {
      return <Badge variant="default" className="bg-purple-100 text-purple-800">🚀 Production Environment</Badge>;
    }
    return <Badge variant="secondary">Unknown Environment</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          {getEnvironmentIcon()}
          <h1 className="text-3xl font-bold">Environment Configuration Demo</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This page demonstrates the comprehensive environment detection and configuration system 
          for digiman, showing how it automatically adapts to different deployment environments.
        </p>
        {getEnvironmentBadge()}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="replit">Replit Guide</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Environment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Environment Summary
              </CardTitle>
              <CardDescription>
                Current environment detection and configuration status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Database</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Type: <Badge variant="outline">{config?.database?.type || 'Unknown'}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Label: {config?.database?.label || 'Unknown'}
                  </div>
                  {config?.database?.neonOptimized && (
                    <Badge variant="default" className="mt-2 text-xs">
                      ⚡ Neon Optimized
                    </Badge>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Storage</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Strategy: <Badge variant="outline">{config?.uploadStrategy || 'Unknown'}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    PWA: <Badge variant={config?.enablePWA ? "default" : "secondary"}>
                      {config?.enablePWA ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Features</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Demo: <Badge variant={config?.showDemoFeatures ? "default" : "secondary"}>
                      {config?.showDemoFeatures ? 'Shown' : 'Hidden'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Environment: <Badge variant="outline">{config?.environment || 'Unknown'}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common environment-related actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <Settings className="h-4 w-4 mr-2" />
                  Refresh Configuration
                </Button>
                <Button variant="outline" onClick={() => window.open('/api/environment/config', '_blank')}>
                  <Database className="h-4 w-4 mr-2" />
                  View API Response
                </Button>
                {config?.isReplit && (
                  <Button variant="outline" onClick={() => window.open('https://replit.com', '_blank')}>
                    <Cloud className="h-4 w-4 mr-2" />
                    Open Replit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <EnvironmentInfo />
        </TabsContent>

        <TabsContent value="replit" className="space-y-6">
          {config?.isReplit ? (
            <ReplitConfigGuide config={config} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-gray-400" />
                  Replit Configuration Guide
                </CardTitle>
                <CardDescription>
                  This guide is only available when running on Replit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Cloud className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    You're currently not running on Replit. This guide shows setup instructions 
                    for deploying digiman on Replit with Neon database and object storage.
                  </p>
                  <Badge variant="secondary">
                    Current Environment: {config?.environment || 'Unknown'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          {/* Feature Flags */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Environment-specific feature configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700">Core Features</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">PWA Support</span>
                      <Badge variant={config?.enablePWA ? "default" : "secondary"}>
                        {config?.enablePWA ? "✅ Enabled" : "❌ Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Demo Features</span>
                      <Badge variant={config?.showDemoFeatures ? "default" : "secondary"}>
                        {config?.showDemoFeatures ? "✅ Shown" : "❌ Hidden"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Service Worker</span>
                      <Badge variant={config?.enableServiceWorker ? "default" : "secondary"}>
                        {config?.enableServiceWorker ? "✅ Active" : "❌ Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700">Storage & Upload</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Upload Strategy</span>
                      <Badge variant="outline">{config?.uploadStrategy || 'Unknown'}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Database Type</span>
                      <Badge variant="outline">{config?.database?.type || 'Unknown'}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Neon Optimized</span>
                      <Badge variant={config?.database?.neonOptimized ? "default" : "secondary"}>
                        {config?.database?.neonOptimized ? "⚡ Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environment Detection Details */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Detection Details</CardTitle>
              <CardDescription>
                How the system detected your current environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Client-Side Detection</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span>Hostname:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {config?.hostname || 'Unknown'}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Environment:</span>
                        <Badge variant="outline">{config?.environment || 'Unknown'}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Server-Side Detection</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span>NODE_ENV:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {config?.envVars?.NODE_ENV || 'Not Set'}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Replit ID:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {config?.envVars?.REPL_ID || 'Not Set'}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Detection Logic</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• <strong>Localhost:</strong> Detected when hostname is 'localhost' or '127.0.0.1'</p>
                    <p>• <strong>Replit:</strong> Detected when hostname contains '.replit.dev' or '.replit.app', or when REPL_ID is set</p>
                    <p>• <strong>Production:</strong> Detected when NODE_ENV is 'production'</p>
                    <p>• <strong>Database:</strong> Detected when DATABASE_URL environment variable is set</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
