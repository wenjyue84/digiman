import { useState, useEffect } from "react";
import { Database, HardDrive, Cloud, ChevronDown, CheckCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export interface DatabaseConfig {
  type: string;
  label: string;
  url?: string;
}

export interface DatabaseInfo {
  current: DatabaseConfig;
  available: DatabaseConfig[];
}

export function DatabaseSelector() {
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSampleDataDialog, setShowSampleDataDialog] = useState(false);
  const [pendingDatabaseType, setPendingDatabaseType] = useState<string | null>(null);

  const { toast } = useToast();

  // Fetch current database config
  useEffect(() => {
    fetchDatabaseConfig();
  }, []);

  const fetchDatabaseConfig = async () => {
    try {
      const response = await fetch('/api/database/config');
      const data = await response.json();
      setDatabaseInfo(data);
    } catch (error) {
      console.error('Failed to fetch database config:', error);
    }
  };

  const switchDatabase = async (type: string, refreshSampleData = false) => {
    if (!databaseInfo || type === databaseInfo.current.type) {
      return;
    }

    // Show sample data dialog when switching to docker database
    if (type === 'docker' && !refreshSampleData) {
      setPendingDatabaseType(type);
      setShowSampleDataDialog(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/database/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      const result = await response.json();
      
      if (result.success) {
        // If refreshing sample data is requested, call the refresh endpoint
        if (refreshSampleData && type === 'docker') {
          try {
            const refreshResponse = await fetch('/api/tests/refresh-sample-guests', {
              method: 'POST',
            });
            const refreshResult = await refreshResponse.json();
            
            if (refreshResult.action === 'refreshed') {
              toast({
                title: "Database Switched with Fresh Sample Data",
                description: `${result.message} • Populated ${refreshResult.guestsCreated} sample guests for testing`,
              });
            } else {
              toast({
                title: "Database Switched",
                description: result.message,
              });
            }
          } catch (refreshError) {
            console.error('Failed to refresh sample data:', refreshError);
            toast({
              title: "Database Switched",
              description: result.message + " (Sample data refresh failed)",
              variant: "default",
            });
          }
        } else {
          toast({
            title: "Database Switched",
            description: result.message,
          });
        }
        
        // Refresh database info immediately since no restart is needed
        setTimeout(() => {
          fetchDatabaseConfig();
        }, 500);
      } else {
        throw new Error(result.error || 'Failed to switch database');
      }
    } catch (error) {
      console.error('Failed to switch database:', error);
      toast({
        title: "Database Switch Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setPendingDatabaseType(null);
      setShowSampleDataDialog(false);
    }
  };

  const handleSampleDataChoice = (refreshData: boolean) => {
    if (pendingDatabaseType) {
      switchDatabase(pendingDatabaseType, refreshData);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'docker':
        return <Database className="h-3 w-3 text-blue-600" />;
      case 'replit':
        // Check if this is a Neon database
        const isNeon = databaseInfo?.current?.url?.includes('neon.tech');
        return isNeon ? (
          <div className="flex items-center gap-1">
            <Cloud className="h-3 w-3 text-green-600" />
            <span className="text-xs text-green-600 font-bold">⚡</span>
          </div>
        ) : (
          <Cloud className="h-3 w-3 text-green-600" />
        );
      case 'memory':
      default:
        return <HardDrive className="h-3 w-3 text-orange-600" />;
    }
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'docker':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'replit':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'memory':
      default:
        return 'bg-orange-50 border-orange-200 text-orange-700';
    }
  };

  if (!databaseInfo) {
    return (
      <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-xs text-gray-600 border border-gray-200">
        <HardDrive className="h-3 w-3" />
        <span className="font-medium hidden sm:inline">Loading...</span>
      </div>
    );
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`text-xs px-2 py-1 h-7 gap-1 ${getStatusColor(databaseInfo.current.type)}`}
          disabled={isLoading}
        >
          {getIcon(databaseInfo.current.type)}
          <span className="font-medium hidden sm:inline">
            {databaseInfo.current.label}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
          Select Database
        </div>
        <DropdownMenuSeparator />
        {databaseInfo.available.map((config) => (
          <DropdownMenuItem
            key={config.type}
            onClick={() => switchDatabase(config.type)}
            className="cursor-pointer"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2 w-full">
              {getIcon(config.type)}
              <span className="flex-1">{config.label}</span>
              {config.type === databaseInfo.current.type && (
                <CheckCircle className="h-3 w-3 text-green-600" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        {isLoading && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-gray-500">
              Switching... Page will reload automatically.
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    <AlertDialog open={showSampleDataDialog} onOpenChange={setShowSampleDataDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Refresh Sample Guest Data?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You're switching to <strong>Docker Database</strong> mode for testing.
            </p>
            <p>
              Would you like to refresh the database with fresh sample guest data? This includes Keong, Prem, Jeevan, Ahmad, Wei Ming, Raj, Hassan, Li Wei, and Siti.
            </p>
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <p><strong>Yes:</strong> Clear existing data and populate 9 fresh sample guests for testing</p>
              <p><strong>No:</strong> Keep current persistent data (recommended for production)</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleSampleDataChoice(false)}>
            Keep Current Data
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => handleSampleDataChoice(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Refresh Sample Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}