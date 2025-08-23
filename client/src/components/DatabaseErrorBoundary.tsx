import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Database, Rocket, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showWizard: boolean;
}

export class DatabaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showWizard: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is a database-related error
    const isDatabaseError = this.isDatabaseError(error);
    
    return {
      hasError: true,
      error,
      showWizard: isDatabaseError
    };
  }

  private static isDatabaseError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const databaseKeywords = [
      'database',
      'connection',
      'postgresql',
      'sql',
      'connection refused',
      'timeout',
      'network',
      'fetch',
      'api',
      '500',
      '502',
      '503',
      '504'
    ];

    return databaseKeywords.some(keyword => errorMessage.includes(keyword));
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DatabaseErrorBoundary caught an error:', error, errorInfo);
    
    // Log to console for debugging
    console.group('Database Error Details');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Stack Trace:', error.stack);
    console.groupEnd();
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showWizard: false
    });
    
    // Force a page refresh to retry
    window.location.reload();
  };

  private handleOpenWizard = () => {
    // Trigger the deployment wizard
    const wizardButton = document.getElementById('replit-wizard-trigger');
    if (wizardButton) {
      wizardButton.click();
    }
  };

  private handleDismiss = () => {
    this.setState({ showWizard: false });
  };

  render() {
    if (this.state.hasError) {
      // If it's a database error and we should show the wizard
      if (this.state.showWizard) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Database className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-red-600">
                  Database Connection Failed
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Your app encountered a database connection issue. Let's fix this together!
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Error:</strong> {this.state.error?.message || 'Unknown database error'}
                  </AlertDescription>
                </Alert>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">What happened?</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• The app couldn't connect to your database</li>
                    <li>• This usually means environment variables need to be configured</li>
                    <li>• The Deployment Wizard will guide you through the setup</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    className="h-12 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>
                  
                  <Button
                    onClick={this.handleOpenWizard}
                    className="h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Rocket className="w-4 h-4" />
                    Open Setup Wizard
                  </Button>
                </div>

                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={this.handleDismiss}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Dismiss for now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      // For non-database errors, show a generic error fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-red-600">
                Something went wrong
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              
              <div className="text-center">
                <Button onClick={this.handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
