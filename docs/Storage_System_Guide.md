# Storage System Technical Guide

## Overview

The Pelangi Manager uses a dual-storage architecture that automatically selects between in-memory storage (for development) and database storage (for production) based on environment variables. The system provides seamless fallback mechanisms and supports both data storage and file storage operations.

## Architecture

### Storage Interface
All storage implementations implement the `IStorage` interface, ensuring consistent API regardless of backend:

```typescript
export interface IStorage {
  // User management methods
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  // ... other methods
}
```

### Storage Classes

#### 1. MemStorage (In-Memory)
- **Purpose**: Local development and testing
- **Data Persistence**: None (resets on server restart)
- **Performance**: Fast, no network latency
- **Use Case**: Development, testing, demos
- **Features**: Automatic data seeding, sample data generation

#### 2. DatabaseStorage (PostgreSQL)
- **Purpose**: Production deployment
- **Data Persistence**: Full (Neon serverless database)
- **Performance**: Network-dependent, scalable
- **Use Case**: Production, staging, team collaboration
- **Features**: Full ACID compliance, automatic backups, scaling

## Automatic Selection Logic

The system automatically chooses storage based on environment:

```typescript
// server/storage.ts
let storage: MemStorage | DatabaseStorage;

try {
  if (process.env.DATABASE_URL) {
    storage = new DatabaseStorage();
    console.log("✅ Using database storage");
  } else {
    storage = new MemStorage();
    console.log("✅ Using in-memory storage (no DATABASE_URL set)");
  }
} catch (error) {
  console.warn("⚠️ Database connection failed, falling back to in-memory storage:", error);
  storage = new MemStorage();
  console.log("✅ Using in-memory storage as fallback");
}

export { storage };
```

## Environment Configuration

### Local Development (In-Memory)
```bash
# No DATABASE_URL needed
# System automatically uses MemStorage
npm run dev
```

### Replit Production (Database)
```bash
# Set in Replit Secrets
DATABASE_URL=postgresql://username:password@host:port/database
```

### File Storage Configuration

#### Local Development (Local Files)
```bash
# No additional environment variables needed
# System automatically uses local file storage
npm run dev
```

#### Production (Google Cloud Storage)
```bash
# Set in environment variables
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_KEY_FILE=path/to/service-account-key.json
```

## File Storage System

### File Storage Architecture
The system supports dual file storage strategies:

#### 1. Local File Storage (Development)
- **Purpose**: Local development and testing
- **Storage Location**: `uploads/` directory in project root
- **Features**: Fast access, no external dependencies
- **Use Case**: Development, testing, offline development

#### 2. Google Cloud Storage (Production)
- **Purpose**: Production file storage
- **Storage Location**: Google Cloud Storage buckets
- **Features**: Global distribution, automatic scaling, backup
- **Use Case**: Production, staging, team collaboration

### File Storage Interface
```typescript
export interface IFileStorage {
  uploadFile(file: Express.Multer.File): Promise<string>;
  getFile(fileId: string): Promise<Buffer>;
  deleteFile(fileId: string): Promise<boolean>;
  getFileUrl(fileId: string): Promise<string>;
}
```

### Automatic File Storage Selection
```typescript
// server/objectStorage.ts
let fileStorage: LocalFileStorage | GoogleCloudStorage;

try {
  if (process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_CLOUD_KEY_FILE) {
    fileStorage = new GoogleCloudStorage();
    console.log("✅ Using Google Cloud Storage");
  } else {
    fileStorage = new LocalFileStorage();
    console.log("✅ Using local file storage");
  }
} catch (error) {
  console.warn("⚠️ Google Cloud Storage failed, falling back to local storage:", error);
  fileStorage = new LocalFileStorage();
  console.log("✅ Using local file storage as fallback");
}
```

## Data Initialization

### MemStorage Initialization
```typescript
constructor() {
  this.users = new Map();
  this.guests = new Map();
  this.capsules = new Map();
  // ... other maps
  
  // Initialize with sample data
  this.initializeCapsules();
  this.initializeDefaultUsers();
  this.initializeDefaultSettings();
  this.initializeSampleGuests();
}
```

### DatabaseStorage Initialization
```typescript
constructor() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const sql = neon(process.env.DATABASE_URL);
  this.db = drizzle(sql);
}
```

## Sample Data

### Default Users
- **Admin**: `admin` / `admin123`
- **Staff**: `Jay` / `Jay123`, `Le` / `Le123`, `Alston` / `Alston123`

### Capsules
- **Back Section**: C1-C6 (6 capsules)
- **Middle Section**: C25-C26 (2 capsules)  
- **Front Section**: C11-C24 (14 capsules)
- **Total**: 22 capsules

### Sample Guests
- Automatically populated with realistic data
- Configurable via `initializeSampleGuests()` method

## Migration Between Storage Types

### Switching from In-Memory to Database
1. Set `DATABASE_URL` environment variable
2. Restart server
3. System automatically switches to `DatabaseStorage`
4. Run `npm run db:push` to create database schema

### Switching from Database to In-Memory
1. Remove `DATABASE_URL` environment variable
2. Restart server
3. System automatically switches to `MemStorage`
4. All data resets to sample data

## Error Handling

### Database Connection Failures
```typescript
try {
  if (process.env.DATABASE_URL) {
    storage = new DatabaseStorage();
  } else {
    storage = new MemStorage();
  }
} catch (error) {
  // Graceful fallback to in-memory storage
  console.warn("⚠️ Database connection failed, falling back to in-memory storage:", error);
  storage = new MemStorage();
}
```

### Benefits
- **Zero Downtime**: System continues working even if database fails
- **Development Friendly**: Always works locally without setup
- **Production Ready**: Full database functionality when configured

## Performance Characteristics

### MemStorage
- **Read Operations**: O(1) for direct lookups, O(n) for searches
- **Write Operations**: O(1)
- **Memory Usage**: Proportional to data size
- **Scalability**: Limited by available RAM

### DatabaseStorage
- **Read Operations**: O(log n) with proper indexing
- **Write Operations**: O(log n) with proper indexing
- **Memory Usage**: Minimal (connection pooling)
- **Scalability**: High (distributed, persistent)

## Development Workflow

### 1. Local Development
```bash
# Clone and run
git clone <repository>
cd PelangiManager
npm install
npm run dev
# Automatically uses MemStorage
```

### 2. Testing Database Features
```bash
# Set DATABASE_URL locally for testing
export DATABASE_URL="your_test_database_url"
npm run dev
# Uses DatabaseStorage
```

### 3. Production Deployment
```bash
# On Replit, set DATABASE_URL in Secrets
# Deploy code
npm run dev
# Automatically uses DatabaseStorage
```

## Troubleshooting

### Common Issues

#### "DATABASE_URL environment variable is not set"
- **Cause**: Trying to use DatabaseStorage without configuration
- **Solution**: Set DATABASE_URL or remove it to use MemStorage

#### "Database connection failed"
- **Cause**: Invalid DATABASE_URL or network issues
- **Solution**: Check connection string, network access, database status

#### "Storage not working"
- **Cause**: Environment variable configuration issues
- **Solution**: Verify DATABASE_URL format and accessibility

### Debug Steps
1. Check console logs for storage selection messages
2. Verify environment variables are set correctly
3. Test database connection independently
4. Check network/firewall settings

## Best Practices

### Development
- Use MemStorage for local development
- Test with sample data before database setup
- Keep DATABASE_URL unset locally

### Production
- Always set DATABASE_URL in production
- Use connection pooling for performance
- Monitor database connection health
- Implement proper error handling

### Testing
- Test both storage types
- Verify data persistence across restarts
- Test fallback behavior

## Future Enhancements

### Potential Improvements
- **Caching Layer**: Redis integration for performance
- **Multiple Database Support**: MySQL, SQLite options
- **Data Migration Tools**: Easy data transfer between storage types
- **Performance Monitoring**: Storage operation metrics

### Extension Points
- **Custom Storage Backends**: Implement IStorage for other databases
- **Hybrid Storage**: Mix in-memory and database for different data types
- **Data Synchronization**: Sync between storage types

