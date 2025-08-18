import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  description?: string;
}

/**
 * Simple error fallback component for specific sections
 */
export function ErrorFallback({ 
  error, 
  resetError, 
  title = "Something went wrong",
  description = "An error occurred while loading this section."
}: ErrorFallbackProps) {
  return (
    <Card className="w-full max-w-md mx-auto my-8">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {resetError && (
          <Button onClick={resetError} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
        
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Error Details (Development)
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Minimal error fallback for inline use
 */
export function InlineErrorFallback({ 
  error, 
  resetError, 
  message = "Failed to load"
}: {
  error?: Error;
  resetError?: () => void;
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <span>{message}</span>
        {resetError && (
          <Button variant="ghost" size="sm" onClick={resetError}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}