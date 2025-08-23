import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Database, Rocket, Wrench } from "lucide-react";
import { ReplitDeploymentWizard } from "./ReplitDeploymentWizard";
import { useDatabaseHealth } from "@/hooks/useDatabaseHealth";

export function AutoDeploymentWizard() {
  const { healthStatus, dismissWizard, checkDatabaseHealth } = useDatabaseHealth();

  // Auto-open wizard when database issues are detected
  const shouldAutoOpen = healthStatus.shouldShowWizard && !healthStatus.isHealthy;

  const handleRetryConnection = async () => {
    await checkDatabaseHealth();
  };

  const handleDismiss = () => {
    dismissWizard();
  };

  const handleWizardComplete = () => {
    dismissWizard();
    // Trigger a health check after wizard completion
    setTimeout(() => {
      checkDatabaseHealth();
    }, 1000);
  };

  return (
    <Dialog open={shouldAutoOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Database Connection Issue Detected
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Summary */}
          <Alert variant="destructive">
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>Connection Failed:</strong> {healthStatus.errorMessage || 'Unable to connect to database'}
              <br />
              <span className="text-sm">
                Retry attempts: {healthStatus.retryCount}/3
              </span>
            </AlertDescription>
          </Alert>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleRetryConnection}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <Wrench className="w-6 h-6" />
              <span className="text-sm">Retry Connection</span>
            </Button>
            
            <Button
              onClick={() => document.getElementById('replit-wizard-trigger')?.click()}
              className="h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Rocket className="w-6 h-6" />
              <span className="text-sm">Open Setup Wizard</span>
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">What's happening?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your app can't connect to the database</li>
              <li>• This usually means environment variables aren't set correctly</li>
              <li>• The Deployment Wizard will help you configure everything</li>
              <li>• You can also try retrying the connection if it's a temporary issue</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleDismiss}>
              Dismiss for Now
            </Button>
            <Button 
              onClick={() => document.getElementById('replit-wizard-trigger')?.click()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Start Setup Wizard
            </Button>
          </div>
        </div>

        {/* Hidden trigger for the main wizard */}
        <div className="hidden">
          <ReplitDeploymentWizard onComplete={handleWizardComplete} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
