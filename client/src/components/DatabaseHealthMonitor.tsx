import { useEffect, useState } from 'react';
import { useDatabaseHealth } from '@/hooks/useDatabaseHealth';
import { AutoDeploymentWizard } from './AutoDeploymentWizard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export function DatabaseHealthMonitor() {
  const { healthStatus, checkDatabaseHealth, isChecking } = useDatabaseHealth();
  const [showStatus, setShowStatus] = useState(false);

  // Auto-hide status after 5 seconds
  useEffect(() => {
    if (healthStatus.lastCheck) {
      setShowStatus(true);
      const timer = setTimeout(() => setShowStatus(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [healthStatus.lastCheck]);

  // Auto-trigger wizard when database is unhealthy
  useEffect(() => {
    if (healthStatus.shouldShowWizard && !healthStatus.isHealthy) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        const wizardButton = document.getElementById('replit-wizard-trigger');
        if (wizardButton) {
          wizardButton.click();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [healthStatus.shouldShowWizard, healthStatus.isHealthy]);

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="w-3 h-3 animate-spin" />;
    }
    
    if (healthStatus.isHealthy) {
      return <CheckCircle className="w-3 h-3 text-green-600" />;
    }
    
    return <AlertTriangle className="w-3 h-3 text-red-600" />;
  };

  const getStatusColor = () => {
    if (isChecking) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (healthStatus.isHealthy) return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking...';
    if (healthStatus.isHealthy) return ''; // Remove 'Connected' label when healthy
    return 'Disconnected';
  };

  return (
    <>
      {/* Health Status Badge */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              {getStatusText() && (
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-1 h-6 ${getStatusColor()}`}
                >
                  <Database className="w-3 h-3 mr-1" />
                  {getStatusText()}
                </Badge>
              )}
              
              {/* Removed status icon badge to clean up UI */}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">Database Status</p>
              <p className="text-xs text-gray-600">
                {healthStatus.isHealthy 
                  ? 'Database is healthy' 
                  : `Connection failed: ${healthStatus.errorMessage || 'Unknown error'}`
                }
              </p>
              {healthStatus.lastCheck && (
                <p className="text-xs text-gray-500 mt-1">
                  Last checked: {healthStatus.lastCheck.toLocaleTimeString()}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Manual Health Check Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkDatabaseHealth}
              disabled={isChecking}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Check database health</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Auto-Triggering Deployment Wizard */}
      <AutoDeploymentWizard />
    </>
  );
}
