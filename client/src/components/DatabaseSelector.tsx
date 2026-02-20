/**
 * DatabaseStatus Component
 * 
 * Shows just "Memory" or "Database" - super minimal
 * No switching, no extra text, just the current mode
 */

import { useState, useEffect } from "react";
import { Database, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface DatabaseConfig {
  type: string;
  label: string;
  url?: string;
}

export interface DatabaseInfo {
  current: DatabaseConfig;
}

export function DatabaseStatus() {
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);

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

  const getIcon = (type: string) => {
    switch (type) {
      case 'database':
        return <Database className="h-3 w-3 text-blue-600" />;
      case 'memory':
      default:
        return <HardDrive className="h-3 w-3 text-orange-600" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'database':
        return 'Database';
      case 'memory':
      default:
        return 'Memory';
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'database':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'memory':
      default:
        return 'bg-orange-50 border-orange-200 text-orange-700';
    }
  };

  if (!databaseInfo) {
    return null; // Hide if loading or error
  }

  return (
    <Badge variant="outline" className={`flex items-center gap-1 text-xs px-2 py-1 ${getBadgeStyle(databaseInfo.current.type)}`}>
      {getIcon(databaseInfo.current.type)}
      <span className="font-medium">
        {getLabel(databaseInfo.current.type)}
      </span>
    </Badge>
  );
}
