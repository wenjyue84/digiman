import { useEffect, useState } from 'react';
import { getEnvironmentConfig } from '../../../shared/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Cloud, HardDrive, Settings, CheckCircle, AlertTriangle } from 'lucide-react';

export function EnvironmentInfo() {
  const [config, setConfig] = useState<any>(null);

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
      }
    };

    fetchConfig();
  }, []);

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Environment Configuration
          </CardTitle>
          <CardDescription>Loading configuration...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getDatabaseIcon = (type: string) => {
    switch (type) {
      case 'replit':
        return <Cloud className="h-4 w-4 text-green-600" />;
      case 'docker':
        return <Database className="h-4 w-4 text-blue-600" />;
      case 'memory':
      default:
        return <HardDrive className="h-4 w-4 text-orange-600" />;
    }
  };

  const getDatabaseStatus = (config: any) => {
    if (config.database.type === 'replit' && config.database.url) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-700">Connected</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <span className="text-yellow-700">Not Configured</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Environment Configuration
          </CardTitle>
          <CardDescription>Current system configuration and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Environment Detection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">Environment Detection</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant={config.isLocalhost ? "default" : "secondary"}>
                  {config.isLocalhost ? "✅ Localhost" : "❌ Localhost"}
                </Badge>
                <Badge variant={config.isReplit ? "default" : "secondary"}>
                  {config.isReplit ? "✅ Replit" : "❌ Replit"}
                </Badge>
                <Badge variant={config.isProduction ? "default" : "secondary"}>
                  {config.isProduction ? "✅ Production" : "❌ Production"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">Features</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant={config.enablePWA ? "default" : "secondary"}>
                  {config.enablePWA ? "✅ PWA" : "❌ PWA"}
                </Badge>
                <Badge variant={config.showDemoFeatures ? "default" : "secondary"}>
                  {config.showDemoFeatures ? "✅ Demo Features" : "❌ Demo Features"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Database Configuration */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Database Configuration</h4>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              {getDatabaseIcon(config.database.type)}
              <div className="flex-1">
                <div className="font-medium">{config.database.label}</div>
                <div className="text-sm text-gray-600">
                  Type: {config.database.type}
                </div>
              </div>
              {getDatabaseStatus(config)}
            </div>
          </div>

          {/* Replit Specific Configuration */}
          {config.replitConfig && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">Replit Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Database Provider</div>
                  <div className="text-sm text-blue-700">{config.replitConfig.databaseProvider}</div>
                  {config.replitConfig.isNeonOptimized && (
                    <Badge variant="default" className="mt-1 text-xs">
                      Neon Optimized
                    </Badge>
                  )}
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-900">Object Storage</div>
                  <div className="text-sm text-green-700">
                    {config.replitConfig.bucketId ? "✅ Configured" : "❌ Not Set"}
                  </div>
                </div>

                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-purple-900">Upload Strategy</div>
                  <div className="text-sm text-purple-700">{config.uploadStrategy}</div>
                </div>

                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-sm font-medium text-orange-900">Private Directory</div>
                  <div className="text-sm text-orange-700">
                    {config.replitConfig.privateDir ? "✅ Set" : "❌ Not Set"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Environment Variables Status */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Required Environment Variables</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { key: 'DATABASE_URL', label: 'Database Connection' },
                { key: 'PRIVATE_OBJECT_DIR', label: 'Object Storage' },
                { key: 'DEFAULT_OBJECT_STORAGE_BUCKET_ID', label: 'Storage Bucket' },
                { key: 'JWT_SECRET', label: 'JWT Secret' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{key}</div>
                    <div className="text-xs text-gray-600">{label}</div>
                  </div>
                  <Badge variant={config.replitConfig?.[key] ? "default" : "secondary"}>
                    {config.replitConfig?.[key] ? "✅ Set" : "❌ Missing"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
