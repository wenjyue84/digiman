import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Cloud, 
  Database, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReplitConfigGuideProps {
  config?: any;
}

export function ReplitConfigGuide({ config }: ReplitConfigGuideProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (isSet: boolean, label: string) => (
    <Badge variant={isSet ? "default" : "secondary"}>
      {isSet ? "✅ Set" : "❌ Missing"}
    </Badge>
  );

  const requiredEnvVars = [
    {
      key: 'DATABASE_URL',
      label: 'Database Connection',
      description: 'Your Neon PostgreSQL connection string',
      example: 'postgresql://user:password@host:port/database?sslmode=require',
      isSet: !!config?.envVars?.DATABASE_URL
    },
    {
      key: 'PRIVATE_OBJECT_DIR',
      label: 'Object Storage',
      description: 'Replit object storage private directory',
      example: '/replit-objstore-xxx/.private',
      isSet: !!config?.envVars?.PRIVATE_OBJECT_DIR
    },
    {
      key: 'DEFAULT_OBJECT_STORAGE_BUCKET_ID',
      label: 'Storage Bucket',
      description: 'Replit object storage bucket ID',
      example: 'replit-objstore-xxx',
      isSet: !!config?.envVars?.DEFAULT_OBJECT_STORAGE_BUCKET_ID
    },
    {
      key: 'JWT_SECRET',
      label: 'JWT Secret',
      description: 'Secret key for authentication',
      example: 'your-super-secret-jwt-key-here',
      isSet: !!config?.envVars?.JWT_SECRET
    }
  ];

  const setupSteps = [
    {
      step: 1,
      title: "Set Environment Variables",
      description: "Go to Tools → Secrets in Replit and add the required variables",
      action: "Go to Secrets",
      actionType: "info" as const
    },
    {
      step: 2,
      title: "Configure Database",
      description: "Set DATABASE_URL with your Neon connection string",
      action: "View Example",
      actionType: "copy" as const,
      copyText: "postgresql://neondb_owner:npg_mWH9OJ1xGLBK@ep-calm-star-afnavipz.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
    },
    {
      step: 3,
      title: "Set Object Storage",
      description: "Configure Replit object storage bucket settings",
      action: "View Example",
      actionType: "copy" as const,
      copyText: "/replit-objstore-41840e1d-0b95-4730-9ee1-98ce1e1f6df7/.private"
    },
    {
      step: 4,
      title: "Restart Application",
      description: "Restart your Replit app to apply changes",
      action: "Restart Now",
      actionType: "restart" as const
    }
  ];

  const handleAction = (step: any) => {
    switch (step.actionType) {
      case 'copy':
        copyToClipboard(step.copyText, step.title);
        break;
      case 'info':
        toast({
          title: "Setup Instructions",
          description: "Go to Tools → Secrets in your Replit workspace",
        });
        break;
      case 'restart':
        toast({
          title: "Restart Required",
          description: "Please restart your Replit application manually",
        });
        break;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-green-600" />
          Replit Configuration Guide
        </CardTitle>
        <CardDescription>
          Complete setup guide for running digiman on Replit with Neon database
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="setup">Setup Steps</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Database (Neon)</h4>
                <p className="text-sm text-blue-700">
                  Uses Neon PostgreSQL for persistent data storage with SSL encryption
                </p>
                <Badge variant="default" className="mt-2">
                  {config?.database?.neonOptimized ? "⚡ Neon Optimized" : "Standard"}
                </Badge>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Object Storage</h4>
                <p className="text-sm text-green-700">
                  Files are stored in Replit's Google Cloud Storage bucket
                </p>
                <Badge variant="default" className="mt-2">
                  Cloud Storage
                </Badge>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Features</h4>
                <p className="text-sm text-purple-700">
                  PWA disabled, demo features hidden, production-ready
                </p>
                <Badge variant="secondary" className="mt-2">
                  Production Mode
                </Badge>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Environment</h4>
                <p className="text-sm text-orange-700">
                  Automatically detected and configured for Replit
                </p>
                <Badge variant="default" className="mt-2">
                  Auto-Detected
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="setup" className="space-y-4">
            <div className="space-y-4">
              {setupSteps.map((step) => (
                <div key={step.step} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{step.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    {step.copyText && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                        {step.copyText}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(step)}
                    className="flex-shrink-0"
                  >
                    {step.actionType === 'copy' && <Copy className="h-4 w-4 mr-2" />}
                    {step.actionType === 'info' && <Info className="h-4 w-4 mr-2" />}
                    {step.actionType === 'restart' && <Settings className="h-4 w-4 mr-2" />}
                    {step.action}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Environment Variables Status</h4>
              <div className="grid grid-cols-1 gap-3">
                {requiredEnvVars.map((envVar) => (
                  <div key={envVar.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{envVar.key}</div>
                      <div className="text-xs text-gray-600">{envVar.description}</div>
                    </div>
                    {getStatusBadge(envVar.isSet, envVar.label)}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-2">Configuration Summary</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Database Type:</span>
                    <span className="ml-2 font-medium">{config?.database?.type || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Upload Strategy:</span>
                    <span className="ml-2 font-medium">{config?.uploadStrategy || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">PWA Enabled:</span>
                    <span className="ml-2 font-medium">{config?.enablePWA ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Demo Features:</span>
                    <span className="ml-2 font-medium">{config?.showDemoFeatures ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
