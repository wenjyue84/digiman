import { useConfig, useQueryRefreshInterval, useCacheTime, useAppInfo } from "@/hooks/useConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Database, RefreshCw, Building2 } from "lucide-react";

/**
 * Demonstration component showing the configuration system in action
 * This replaces hardcoded values with database-driven configuration
 */
export function ConfigurationDemo() {
  const { config, isLoading, error } = useConfig();
  const refreshInterval = useQueryRefreshInterval();
  const cacheTime = useCacheTime();
  const { hostelName } = useAppInfo();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configuration System
          </CardTitle>
          <CardDescription>Loading configuration...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Database className="h-5 w-5" />
            Configuration Error
          </CardTitle>
          <CardDescription>
            Using default values. Error: {error.message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configuration System Status
          </CardTitle>
          <CardDescription>
            ✅ Successfully loaded from database - No more hardcoded values!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{hostelName}</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Refresh: {refreshInterval / 1000}s</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Cache: {cacheTime / (1000 * 60)}m</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {config.totalUnits} Capsules
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Settings</CardTitle>
            <CardDescription>Configurable refresh & cache times</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Query Refresh:</span>
              <Badge variant="outline">{config.queryRefreshIntervalSeconds}s</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cache Time:</span>
              <Badge variant="outline">{config.cacheTimeMinutes}m</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Page Size:</span>
              <Badge variant="outline">{config.defaultPageSize}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Business Rules</CardTitle>
            <CardDescription>Configurable limits & validations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Age Range:</span>
              <Badge variant="outline">{config.minGuestAge}-{config.maxGuestAge}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Max Stay:</span>
              <Badge variant="outline">{config.maxGuestStayDays} days</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Max Payment:</span>
              <Badge variant="outline">RM {config.maxPaymentAmount}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Settings</CardTitle>
            <CardDescription>Configurable defaults & preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Default Role:</span>
              <Badge variant="outline">{config.defaultUserRole}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Method:</span>
              <Badge variant="outline">{config.defaultPaymentMethod}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Token Expiry:</span>
              <Badge variant="outline">{config.guestTokenExpirationHours}h</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration Benefits</CardTitle>
          <CardDescription>What we've achieved by removing hardcoded values</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">✅ Now Configurable:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Query refresh intervals (was 30s hardcoded)</li>
                <li>• Cache durations (was 5min hardcoded)</li>
                <li>• Age validation limits (was 16-120 hardcoded)</li>
                <li>• Payment amount limits (was RM 9999.99 hardcoded)</li>
                <li>• Token expiration times (was 24h hardcoded)</li>
                <li>• Pagination defaults (was 20 hardcoded)</li>
                <li>• Default payment method (was 'cash' hardcoded)</li>
                <li>• User role defaults (was 'staff' hardcoded)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-700">🎯 Benefits:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• No code changes needed for config updates</li>
                <li>• Real-time configuration changes</li>
                <li>• Database-driven flexibility</li>
                <li>• Environment-specific settings</li>
                <li>• Better maintainability</li>
                <li>• Centralized configuration management</li>
                <li>• Audit trail of configuration changes</li>
                <li>• Easy rollback to defaults</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
