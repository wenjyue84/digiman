# Development Guide
# PelangiManager - Capsule Hostel Management System

**Document Version:** 2025.08  
**Date:** August 2025  
**Project:** Pelangi Capsule Hostel Management System  

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Development Environment](#2-development-environment)
3. [Project Structure](#3-project-structure)
4. [Development Workflow](#4-development-workflow)
5. [Testing](#5-testing)
6. [Database Management](#6-database-management)
7. [Configuration Management](#7-configuration-management)
8. [File Management](#8-file-management)
9. [Authentication System](#9-authentication-system)
10. [Real-time Features](#10-real-time-features)
11. [Deployment](#11-deployment)
12. [Troubleshooting](#12-troubleshooting)
13. [Best Practices](#13-best-practices)

---

## 1. Getting Started

### Prerequisites
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: For version control
- **PostgreSQL**: Optional (for production-like development)

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd PelangiManager

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:5000
```

### Default Credentials
- **Admin**: `admin` / `admin123`
- **Staff**: `Jay` / `Jay123`, `Le` / `Le123`, `Alston` / `Alston123`

---

## 2. Development Environment

### Environment Variables

#### Development (In-Memory Storage)
```bash
# No DATABASE_URL needed - uses in-memory storage
NODE_ENV=development
PORT=5000
```

#### Production-Like Development (PostgreSQL)
```bash
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=development
PORT=5000
```

#### Google OAuth (Optional)
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

#### File Storage (Optional)
```bash
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_CLOUD_KEY_FILE=path/to/key.json
```

### Available Scripts
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode

# Code Quality
npm run check        # TypeScript type checking
npm run db:push      # Push database schema changes (Drizzle)
```

---

## 3. Project Structure

```
PelangiManager/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and configurations
│   │   └── main.tsx       # Application entry point
│   ├── index.html         # HTML template
│   └── vite.config.ts     # Vite configuration
├── server/                 # Backend Node.js application
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # ⚠️ Re-export wrapper ONLY (46 lines)
│   ├── Storage/           # 🏗️ Modular Storage System
│   │   ├── IStorage.ts        # Interface definitions (75 lines)
│   │   ├── MemStorage.ts      # In-memory implementation (924 lines)
│   │   ├── DatabaseStorage.ts # Database implementation (517 lines)
│   │   ├── StorageFactory.ts  # Factory & initialization (20 lines)
│   │   └── index.ts           # Module exports (10 lines)
│   ├── configManager.ts   # Configuration management
│   └── objectStorage.ts   # File storage implementation
├── shared/                 # Shared code between frontend and backend
│   ├── schema.ts          # Database schemas and types
│   └── utils.ts           # Shared utilities
├── migrations/             # Database migration files
├── docs/                   # Documentation
└── tests/                  # Test files
```

### Key Directories Explained

#### `/client`
- **React 18** application with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** components for UI elements

#### `/server`
- **Express.js** server with TypeScript
- **🏗️ Modular storage system** (refactored from monolithic storage.ts)
- **Configuration management** with hot-reload
- **File storage** with Google Cloud integration

#### `/server/Storage` 🏗️ **NEW MODULAR ARCHITECTURE**
- **IStorage.ts**: Complete interface definition with 70+ methods
- **MemStorage.ts**: In-memory storage implementation (development)
- **DatabaseStorage.ts**: PostgreSQL implementation (production)
- **StorageFactory.ts**: Automatic storage selection logic
- **index.ts**: Clean module exports

**⚠️ CRITICAL**: The main `storage.ts` file is now ONLY a re-export wrapper:
```typescript
// ⚠️ DO NOT ADD IMPLEMENTATIONS TO THIS FILE! ⚠️
export { MemStorage, DatabaseStorage, createStorage } from "./Storage/index";
export { storage } from "./Storage/index";
export type { IStorage } from "./Storage/IStorage";
```

**Refactoring Results:**
- **BEFORE**: 1,557 lines in single file
- **AFTER**: 46 lines wrapper + 5 focused modules  
- **Benefits**: 96% reduction, better maintainability, team collaboration

#### `/shared`
- **Type definitions** used by both frontend and backend
- **Validation schemas** with Zod
- **Utility functions** shared across the application

---

## 4. Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# ... edit files ...

# Test changes
npm test

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push and create pull request
git push origin feature/new-feature
```

### 2. Code Quality Checks
```bash
# Type checking
npm run check

# Linting (if configured)
npm run lint

# Testing
npm test

# Build verification
npm run build
```

### 3. Database Changes
```bash
# Modify schema in shared/schema.ts
# Generate migration
npm run db:push

# Test with new schema
npm run dev
```

### 4. Configuration Changes
```bash
# Modify server/configManager.ts
# Add new configuration options
# Update types in shared/schema.ts
# Restart development server
npm run dev
```

---

## 5. Testing

### Testing Framework
- **Jest**: Primary testing framework
- **React Testing Library**: Component testing
- **TypeScript**: Type checking and validation

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- guest-table.test.tsx

# Run tests with coverage
npm test -- --coverage
```

### Test Structure
```
__tests__/
├── basic.test.ts              # Basic functionality tests
├── guest-table.test.tsx       # Component tests
├── business-logic.test.ts     # Business logic tests
└── integration.test.ts        # Integration tests
```

### Writing Tests
```typescript
// Example component test
import { render, screen } from '@testing-library/react';
import { GuestTable } from '../components/guest-table';

describe('GuestTable', () => {
  it('renders guest data correctly', () => {
    const guests = [
      { id: '1', name: 'John Doe', capsuleNumber: 'C1' }
    ];
    
    render(<GuestTable guests={guests} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('C1')).toBeInTheDocument();
  });
});
```

---

## 6. Database Management

### Schema Management
The system uses **Drizzle ORM** for type-safe database operations.

#### Adding New Tables
```typescript
// In shared/schema.ts
export const newTable = pgTable("new_table", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

#### Adding New Fields
```typescript
// In shared/schema.ts
export const guests = pgTable("guests", {
  // ... existing fields ...
  newField: text("new_field"), // Add new field
});
```

#### Running Migrations
```bash
# Generate and apply migrations
npm run db:push

# Check migration status
npm run db:studio
```

### Storage Interface
The system provides a unified storage interface:

```typescript
// In server/storage.ts
export interface IStorage {
  // Guest operations
  createGuest(guest: CreateGuestInput): Promise<Guest>;
  getGuest(id: string): Promise<Guest | undefined>;
  getAllGuests(): Promise<Guest[]>;
  updateGuest(id: string, updates: Partial<Guest>): Promise<Guest>;
  deleteGuest(id: string): Promise<boolean>;
  
  // Capsule operations
  createCapsule(capsule: CreateCapsuleInput): Promise<Capsule>;
  getCapsule(id: string): Promise<Capsule | undefined>;
  getAllCapsules(): Promise<Capsule[]>;
  updateCapsule(id: string, updates: Partial<Capsule>): Promise<Capsule>;
  deleteCapsule(id: string): Promise<boolean>;
}
```

### Storage Implementations

#### MemStorage (Development)
- **Purpose**: Fast development and testing
- **Data Persistence**: None (resets on restart)
- **Features**: Automatic data seeding, sample data

#### DatabaseStorage (Production)
- **Purpose**: Persistent data storage
- **Data Persistence**: Full PostgreSQL storage
- **Features**: ACID compliance, automatic backups

---

## 7. Configuration Management

### Configuration System
The system uses a centralized configuration management system with hot-reload capabilities.

#### Adding New Configuration
```typescript
// In server/configManager.ts
export interface AppConfig {
  // ... existing config ...
  newSetting: string;
  newNumber: number;
}

// In server/configManager.ts
const defaultConfig: AppConfig = {
  // ... existing defaults ...
  newSetting: "default_value",
  newNumber: 42,
};
```

#### Using Configuration
```typescript
// In any server file
import { getConfig } from './configManager';

const config = getConfig();
console.log(config.newSetting);
```

#### Configuration Validation
```typescript
// In server/configManager.ts
const configSchema = z.object({
  // ... existing validation ...
  newSetting: z.string(),
  newNumber: z.number().positive(),
});
```

### Settings Page Development

The Settings page is organized into multiple tabs for better user experience and organization:

#### Tab Structure
1. **General Tab** (`general`): Basic system configuration
2. **Capsules Tab** (`capsules`): Accommodation management  
3. **Maintenance Tab** (`maintenance`): Issue tracking
4. **Guest Guide Tab** (`guide`): Customer-facing content
5. **Users Tab** (`users`): Available in "More" dropdown
6. **Tests Tab** (`tests`): Available in "More" dropdown

#### Adding New Settings Tabs
```typescript
// 1. Create new tab component in /client/src/components/settings/
export default function NewTab({ prop1, prop2 }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>New Tab Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tab content */}
      </CardContent>
    </Card>
  );
}

// 2. Import and add to settings.tsx
import NewTab from "../components/settings/NewTab";

// 3. Add TabsTrigger in TabsList (or in DropdownMenu for secondary tabs)
<TabsTrigger value="newtab" className="flex items-center gap-2">
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-center justify-center h-5 w-5 rounded-full bg-purple-100">
        <Icon className="h-3 w-3 text-purple-600" />
      </div>
    </TooltipTrigger>
    <TooltipContent side="bottom">Descriptive tooltip for the new tab</TooltipContent>
  </Tooltip>
  <span className="hidden md:inline">New Tab</span>
</TabsTrigger>

// 4. Add TabsContent section
<TabsContent value="newtab" className="space-y-6">
  <NewTab prop1={value1} prop2={value2} />
</TabsContent>
```

#### Settings Tab Guidelines
- **Use Tooltips**: All navigation elements should have descriptive tooltips
- **Responsive Design**: Tabs should work on both desktop and mobile
- **Consistent Styling**: Follow existing color scheme and icon patterns
- **Proper Data Flow**: Use React Query for data fetching and mutations
- **Error Handling**: Include proper error states and user feedback

#### Important Notes
- **Users and Tests tabs**: Located in "More" dropdown to maintain clean tab layout
- **Tooltip positioning**: Use `side="bottom"` for main tabs, `side="right"` for dropdown items
- **Mobile compatibility**: Hide text labels on small screens, show only icons
- **Grid layout**: TabsList uses `grid-cols-5` (4 main tabs + 1 dropdown)

---

## 8. File Management

### File Storage System
The system supports dual file storage strategies:

#### Local File Storage (Development)
- **Location**: `uploads/` directory
- **Configuration**: No additional setup required
- **Features**: Fast access, no external dependencies

#### Google Cloud Storage (Production)
- **Location**: Google Cloud Storage buckets
- **Configuration**: Requires service account key
- **Features**: Global distribution, automatic scaling

### Adding File Support
```typescript
// In server/objectStorage.ts
export interface IFileStorage {
  uploadFile(file: Express.Multer.File): Promise<string>;
  getFile(fileId: string): Promise<Buffer>;
  deleteFile(fileId: string): Promise<boolean>;
  getFileUrl(fileId: string): Promise<string>;
}
```

### File Upload Endpoints
```typescript
// In server/routes.ts
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const fileId = await fileStorage.uploadFile(req.file!);
    res.json({ success: true, data: { fileId } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 9. Authentication System

### Authentication Methods
The system supports multiple authentication methods:

#### Local Authentication
- **Username/Password**: Traditional login
- **Session Management**: Express sessions with PostgreSQL storage
- **Password Hashing**: Secure password storage

#### Google OAuth
- **OAuth 2.0**: Modern social login
- **Passport.js**: Authentication middleware
- **Automatic Registration**: Creates user accounts on first login

### Adding New Authentication Methods
```typescript
// In server/routes.ts
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await storage.getUserByUsername(username);
    if (user && await verifyPassword(password, user.password)) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error);
  }
}));
```

### Role-Based Access Control
```typescript
// In server/routes.ts
const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === role || req.user?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
  };
};

// Usage
app.get('/api/admin/users', requireRole('admin'), async (req, res) => {
  // Admin-only endpoint
});
```

---

## 10. Real-time Features

### WebSocket Implementation
The system uses WebSockets for real-time updates:

#### Server-Side WebSocket
```typescript
// In server/index.ts
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (message) => {
    // Handle incoming messages
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
```

#### Client-Side WebSocket
```typescript
// In client/src/hooks/useWebSocket.ts
export const useWebSocket = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:5000');
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Handle real-time updates
    };
    
    return () => websocket.close();
  }, []);
  
  return ws;
};
```

### Broadcasting Updates
```typescript
// In server/storage.ts
export const broadcastUpdate = (type: string, data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, data }));
    }
  });
};

// Usage in storage operations
export const createGuest = async (guest: CreateGuestInput): Promise<Guest> => {
  const newGuest = await storage.createGuest(guest);
  broadcastUpdate('guest_created', newGuest);
  return newGuest;
};
```

---

## 11. Deployment

### Development Deployment
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Production Deployment
```bash
# Set production environment variables
export NODE_ENV=production
export DATABASE_URL=postgresql://...

# Build and start
npm run build
npm start
```

### Environment-Specific Configuration
```typescript
// In server/configManager.ts
const getEnvironmentConfig = () => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return {
        port: process.env.PORT || 5000,
        databaseUrl: process.env.DATABASE_URL,
        // Production-specific settings
      };
    case 'development':
      return {
        port: 5000,
        databaseUrl: undefined, // Use in-memory storage
        // Development-specific settings
      };
    default:
      return getEnvironmentConfig();
  }
};
```

### Docker Deployment (Optional)
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY shared ./shared

EXPOSE 5000
CMD ["npm", "start"]
```

---

## 12. Troubleshooting

### Common Development Issues

#### Server Won't Start
```bash
# Check if port is in use
lsof -i :5000

# Kill process using port
kill -9 <PID>

# Clear environment variables
unset DATABASE_URL

# Restart server
npm run dev
```

#### Database Connection Issues
```bash
# Check environment variables
echo $DATABASE_URL

# Verify database is running
pg_isready -h localhost -p 5432

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

#### Frontend Build Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Rebuild
npm run build
```

#### Test Failures
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- --testNamePattern="GuestTable"

# Check test environment
npm test -- --detectOpenHandles
```

---

## 13. Best Practices

### Code Organization
- **Separation of Concerns**: Keep business logic separate from UI
- **Component Composition**: Build complex UIs from simple components
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Type Safety**: Use TypeScript for all new code

### Performance
- **React Query**: Use for server state management
- **Memoization**: Memoize expensive calculations
- **Lazy Loading**: Load components and routes on demand
- **Image Optimization**: Compress and optimize images

### Security
- **Input Validation**: Validate all user inputs with Zod
- **Authentication**: Always verify user permissions
- **SQL Injection**: Use parameterized queries with Drizzle ORM
- **XSS Prevention**: Sanitize user-generated content

### Testing
- **Test Coverage**: Aim for high test coverage
- **Integration Tests**: Test component interactions
- **Mocking**: Mock external dependencies
- **Test Data**: Use consistent test data

### Error Handling
- **Graceful Degradation**: Handle errors gracefully
- **User Feedback**: Provide clear error messages
- **Logging**: Log errors for debugging
- **Fallbacks**: Provide alternative functionality when possible

---

## Conclusion

This development guide provides a comprehensive overview of the PelangiManager system development process. Follow these guidelines to ensure consistent, high-quality code development.

For additional questions or clarifications, refer to the other documentation files or contact the development team.

### Additional Resources
- [System Architecture Document](./System_Architecture_Document.md)
- [API Documentation](./API_Documentation.md)
- [Troubleshooting Guide](./Troubleshooting_Guide.md)
- [Storage System Guide](./Storage_System_Guide.md)
