import { getServerEnvironment } from "../../shared/utils";

export type DatabaseType = 'memory' | 'docker' | 'replit';

export interface DatabaseConfig {
  type: DatabaseType;
  url?: string;
  label: string;
  ssl?: string;
  neonOptimized?: boolean;
}

export const DATABASE_CONFIGS: Record<DatabaseType, DatabaseConfig> = {
  memory: {
    type: 'memory',
    label: 'Memory',
  },
  docker: {
    type: 'docker',
    url: 'postgresql://pelangi_user:pelangi_password@localhost:5432/pelangi_manager',
    label: 'Docker DB',
  },
  replit: {
    type: 'replit',
    url: process.env.DATABASE_URL || process.env.PRIVATE_DATABASE_URL,
    label: process.env.DATABASE_URL?.includes('neon.tech') ? 'Replit DB (Neon)' : 'Replit DB',
    // Add Neon-specific optimizations
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? 'require' : undefined,
    neonOptimized: process.env.DATABASE_URL?.includes('neon.tech') || false,
  },
};

export function getDatabaseConfig(): DatabaseConfig {
  // Check if user has selected a specific database type
  const selectedType = process.env.PELANGI_DB_TYPE as DatabaseType;
  
  if (selectedType && DATABASE_CONFIGS[selectedType]) {
    return DATABASE_CONFIGS[selectedType];
  }
  
  // Auto-detect based on environment using centralized utility
  const env = getServerEnvironment();
  
  if (env.isDocker) {
    return DATABASE_CONFIGS.docker;
  } else if (env.isReplit) {
    return DATABASE_CONFIGS.replit;
  } else {
    return DATABASE_CONFIGS.memory;
  }
}

export function setDatabaseType(type: DatabaseType): void {
  process.env.PELANGI_DB_TYPE = type;
  
  // Update DATABASE_URL based on selection
  if (type === 'docker') {
    process.env.DATABASE_URL = DATABASE_CONFIGS.docker.url;
  } else if (type === 'replit') {
    process.env.DATABASE_URL = DATABASE_CONFIGS.replit.url || '';
  } else {
    // Memory - remove DATABASE_URL to trigger in-memory storage
    delete process.env.DATABASE_URL;
  }
}