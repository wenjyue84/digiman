# System Architecture Document
# PelangiManager - Capsule Hostel Management System

**Document Version:** 2025.08  
**Date:** August 2025  
**Author:** System Analyst  
**Project:** Pelangi Capsule Hostel Management System  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Data Architecture](#4-data-architecture)
5. [API Architecture](#5-api-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Authentication & Security](#7-authentication--security)
8. [Core Features](#8-core-features)
9. [Development Environment](#9-development-environment)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Performance & Scalability](#11-performance--scalability)
12. [Error Handling & Monitoring](#12-error-handling--monitoring)
13. [Testing Strategy](#13-testing-strategy)
14. [File Management System](#14-file-management-system)

---

## 1. System Overview

### 1.1 Purpose
PelangiManager is a comprehensive capsule hostel management system designed specifically for Pelangi Capsule Hostel. The system provides real-time management of guest check-ins/check-outs, capsule occupancy tracking, maintenance management, and administrative operations.

### 1.2 System Scope
The system manages **22 capsules** organized in three physical sections:
- **Back Section:** C1-C6 (6 capsules)
- **Front Section:** C11-C24 (14 capsules) 
- **Middle Section:** C25-C26 (2 capsules)

### 1.3 Key Capabilities
- **Real-time Guest Management**: Complete guest lifecycle from check-in to check-out
- **Occupancy Monitoring**: Live capsule availability and occupancy statistics
- **Maintenance Tracking**: Problem reporting and resolution workflow
- **Self-Service Check-in**: Token-based guest self check-in system
- **User Management**: Role-based access control (admin/staff)
- **Configuration Management**: Flexible system settings with hot-reload
- **Multi-language Support**: Internationalization ready
- **Emergency Access**: Unauthenticated dashboard access for emergency situations
- **File Management**: Photo uploads and document storage
- **Google OAuth Integration**: Modern authentication system
- **Real-time Notifications**: WebSocket-based updates

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (React + Vite)               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   Dashboard     │ │   Check-in/out  │ │   Maintenance   │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   Settings      │ │   History       │ │   User Mgmt     │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   File Upload   │ │   OAuth Login   │ │   Real-time     │   │
│  │   System        │ │   Integration   │ │   Updates       │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                               HTTPS/REST API + WebSocket
                                │
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (Node.js + Express)              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   API Routes    │ │   Auth Service  │ │   Validation    │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   Storage Layer │ │   Config Mgmt   │ │   Error Handler │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   File Storage  │ │   OAuth Flow    │ │   WebSocket     │   │
│  │   (Google Cloud)│ │   (Passport.js) │ │   Server        │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                        Storage Interface
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      Data Storage                               │
│  ┌─────────────────┐                   ┌─────────────────┐     │
│  │   In-Memory     │ ←─── Dev Mode ────│   PostgreSQL    │     │
│  │   Storage       │                   │   (Neon DB)     │     │
│  └─────────────────┘                   └─────────────────┘     │
│  ┌─────────────────┐                   ┌─────────────────┐     │
│  │   File Storage  │                   │   Google Cloud  │     │
│  │   (Local)       │                   │   Storage       │     │
│  └─────────────────┘                   └─────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Architectural Patterns
- **Layered Architecture**: Clear separation between presentation, business logic, and data layers
- **RESTful API**: Standard HTTP methods for CRUD operations
- **Repository Pattern**: Abstract storage interface for database-agnostic operations
- **Component-Based UI**: Modular React components with shadcn/ui
- **Service Layer**: Business logic encapsulation in backend services
- **Configuration Management**: Centralized configuration with hot-reload capabilities
- **Event-Driven Architecture**: WebSocket-based real-time updates
- **Strategy Pattern**: Storage implementation selection based on environment

---

## 3. Technology Stack

### 3.1 Frontend Technologies
- **React 18.3.1**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality React component library
- **React Query (TanStack Query)**: Server state management
- **React Hook Form**: Form handling and validation
- **Wouter**: Lightweight routing solution
- **Framer Motion**: Animation library
- **Lucide React**: Icon library

### 3.2 Backend Technologies
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **TypeScript**: Type-safe backend development
- **Passport.js**: Authentication middleware
- **Google OAuth 2.0**: Modern authentication
- **WebSocket (ws)**: Real-time communication
- **Multer**: File upload handling
- **Zod**: Schema validation
- **Drizzle ORM**: Type-safe database operations

### 3.3 Database & Storage
- **PostgreSQL**: Primary database (Neon serverless)
- **Drizzle ORM**: Type-safe database operations
- **In-Memory Storage**: Development and testing storage (automatic fallback)
- **Google Cloud Storage**: File storage (production)
- **Local File System**: File storage (development; dev upload fallback with CORS)

### 3.4 Development Tools
- **Jest**: Testing framework
- **ESBuild**: Fast TypeScript compilation
- **Cross-env**: Cross-platform environment variables
- **TSX**: TypeScript execution for development

### 3.5 Authentication & Security
- **JWT**: JSON Web Tokens for session management
- **Passport.js**: Authentication strategies
- **Google OAuth 2.0**: Social login integration
- **Session Management**: Express sessions with PostgreSQL storage
- **Role-Based Access Control**: Admin and staff user roles

---

## 4. Data Architecture

### 4.1 🏗️ Modular Storage Architecture (Refactored 2025)

The storage layer has been completely refactored into a modular, maintainable architecture:

```
server/
├── storage.ts (46 lines) ← Re-export wrapper ONLY
└── Storage/
    ├── IStorage.ts (75 lines) ← Interface definitions
    ├── MemStorage.ts (924 lines) ← In-memory implementation  
    ├── DatabaseStorage.ts (517 lines) ← Database implementation
    ├── StorageFactory.ts (20 lines) ← Factory & initialization
    └── index.ts (10 lines) ← Module exports
```

**Refactoring Benefits:**
- **96% reduction** in main storage file (1,557 → 46 lines)
- **Separation of concerns** - each file has single responsibility
- **Easy maintenance** - find and edit specific storage features quickly
- **Team collaboration** - multiple developers can work on different storage parts
- **Clean imports** - clear, typed interface for all consumers
- **Backward compatibility** - existing code continues working unchanged

### 4.2 Storage Interface (IStorage.ts)

All storage implementations follow the `IStorage` interface with 70+ methods:

```typescript
export interface IStorage {
  // User management (8 methods)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  // ... user operations

  // Guest management (13 methods) 
  createGuest(guest: InsertGuest): Promise<Guest>;
  getCheckedInGuests(pagination?: PaginationParams): Promise<PaginatedResponse<Guest>>;
  // ... guest operations

  // Capsule management (12 methods)
  getAllCapsules(): Promise<Capsule[]>;
  getAvailableCapsules(): Promise<Capsule[]>;
  // ... capsule operations

  // Problem tracking, tokens, notifications, settings, expenses
  // ... additional 37+ methods
}
```

### 4.3 Core Entities

#### Users
- **Fields**: id, email, username, password, googleId, firstName, lastName, profileImage, role, createdAt, updatedAt
- **Relationships**: One-to-many with sessions, one-to-many with capsule problems
- **Indexes**: email, username, role

#### Guests
- **Fields**: id, name, capsuleNumber, checkinTime, checkoutTime, expectedCheckoutDate, isCheckedIn, paymentAmount, paymentMethod, paymentCollector, isPaid, notes, gender, nationality, phoneNumber, email, idNumber, emergencyContact, emergencyPhone, age, profilePhotoUrl, selfCheckinToken
- **Relationships**: Many-to-one with capsules
- **Indexes**: capsuleNumber, isCheckedIn, checkinTime, checkoutTime

#### Capsules
- **Fields**: id, number, section, isAvailable, cleaningStatus, lastCleanedAt, lastCleanedBy, color, purchaseDate, position, remark
- **Relationships**: One-to-many with guests, one-to-many with problems
- **Indexes**: isAvailable, section, cleaningStatus, position

#### Capsule Problems
- **Fields**: id, capsuleNumber, description, reportedBy, reportedAt, isResolved, resolvedBy, resolvedAt, notes
- **Relationships**: Many-to-one with capsules, many-to-one with users
- **Indexes**: capsuleNumber, isResolved

#### Sessions
- **Fields**: id, userId, token, expiresAt, createdAt
- **Relationships**: Many-to-one with users
- **Indexes**: userId, token, expiresAt

### 4.4 Storage Strategy

#### Dual-Storage Architecture
The system uses a factory pattern for automatic storage selection:

```typescript
// ./Storage/StorageFactory.ts
export function createStorage(): IStorage {
  try {
    if (process.env.DATABASE_URL) {
      return new DatabaseStorage(); // Production
    } else {
      return new MemStorage(); // Development
    }
  } catch (error) {
    console.warn("Database failed, falling back to in-memory storage");
    return new MemStorage(); // Graceful fallback
  }
}
```

#### Storage Implementations
- **MemStorage (924 lines)**: In-memory storage with automatic data seeding
- **DatabaseStorage (517 lines)**: PostgreSQL with Neon serverless database
- **File Storage**: Google Cloud Storage with local fallback
- **Automatic Fallback**: System automatically switches to in-memory if database fails

#### Re-export Wrapper (storage.ts)
⚠️ **CRITICAL**: The main `server/storage.ts` file serves ONLY as a backward compatibility wrapper:

```typescript
// ⚠️ DO NOT ADD IMPLEMENTATIONS TO THIS FILE! ⚠️
export { MemStorage, DatabaseStorage, createStorage } from "./Storage/index";
export { storage } from "./Storage/index";
export type { IStorage } from "./Storage/IStorage";
```

---

## 5. API Architecture

### 5.1 RESTful Endpoints

#### Authentication
- `POST /api/auth/login` - User login (returns Bearer token)
- `POST /api/auth/logout` - User logout (Bearer token invalidation)
- `GET /api/auth/me` - Get current user (Bearer)
- `POST /api/auth/google` - Verify Google ID token and create session

#### Guest Management
- `GET /api/guests/checked-in` - Paginated checked-in
- `GET /api/guests/history` - Paginated history
- `POST /api/guests/checkin` - Check-in
- `POST /api/guests/checkout` - Check-out
- `POST /api/guests/recheckin` - Undo check-out
- Bulk: `/api/guests/checkout-overdue`, `/api/guests/checkout-today`, `/api/guests/checkout-all`
- `PATCH /api/guests/:id` - Update guest

#### Capsule Management
- `GET /api/capsules`, `/api/capsules/available`, `/api/capsules/cleaning-status/:status`
- `POST /api/capsules`
- `PATCH /api/capsules/:id` and `PATCH /api/capsules/:number`
- `DELETE /api/capsules/:id` and `DELETE /api/capsules/:number`
- `POST /api/capsules/:number/mark-cleaned`, `POST /api/capsules/mark-cleaned-all`

#### Maintenance
- `GET /api/problems`, `GET /api/problems/active`
- `GET /api/capsules/:number/problems`
- `POST /api/problems`
- `PATCH /api/problems/:id/resolve`
- `DELETE /api/problems/:id`

#### Settings & Configuration
- `GET /api/settings`, `PATCH /api/settings`
- `GET /api/admin/config`, `PUT /api/admin/config`, `POST /api/admin/config/reset`

#### File Management
- `POST /api/upload` - Upload file
- `GET /api/files/:id` - Get file
- `DELETE /api/files/:id` - Delete file

### 5.2 Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 5.3 Error Handling
- **HTTP Status Codes**: Standard REST status codes
- **Error Middleware**: Centralized error handling
- **Validation**: Zod schema validation
- **Graceful Degradation**: Fallback to in-memory storage

---

## 6. Frontend Architecture

### 6.1 Component Structure
```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── auth-provider.tsx      # Authentication context
│   ├── guest-table.tsx        # Guest management
│   ├── capsule-cleaning-status.tsx # Capsule status
│   ├── maintenance-manage.tsx # Maintenance management
│   ├── settings.tsx           # System configuration
│   └── ...
├── pages/                     # Route components
├── hooks/                     # Custom React hooks
├── lib/                       # Utilities and configurations
└── main.tsx                   # Application entry point
```

### 6.2 State Management
- **React Query**: Server state management
- **React Context**: Authentication and theme state
- **Local State**: Component-level state with useState
- **Form State**: React Hook Form for form management

### 6.3 Routing
- **Wouter**: Lightweight routing
- **Protected Routes**: Authentication-based route protection
- **Dynamic Routes**: Parameter-based routing

### 6.4 Styling
- **Tailwind CSS**: Utility-first CSS
- **CSS Variables**: Theme customization
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Theme switching capability

---

## 7. Authentication & Security

### 7.1 Authentication Methods
- **Local Authentication**: Username/password
- **Google OAuth 2.0**: Social login integration
- **Session Management**: Express sessions with PostgreSQL storage
- **Token-Based**: JWT tokens for API access

### 7.2 Security Features
- **Password Hashing**: Secure password storage
- **CSRF Protection**: Cross-site request forgery prevention
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Parameterized queries with Drizzle ORM
- **XSS Protection**: Content Security Policy headers

### 7.3 User Roles
- **Admin**: Full system access, user management
- **Staff**: Guest management, maintenance reporting
- **Guest**: Limited access via self-check-in tokens

---

## 8. Core Features

### 8.1 Guest Management
- **Check-in Process**: Complete guest registration
- **Check-out Process**: Guest departure management
- **Profile Management**: Guest information storage
- **Payment Tracking**: Payment status and method tracking
- **Photo Management**: Guest profile photos

### 8.2 Capsule Management
- **Occupancy Tracking**: Real-time availability status
- **Cleaning Management**: Cleaning status and scheduling
- **Section Organization**: Back, front, and middle sections
- **Position Tracking**: Top/bottom positioning for stacked capsules

### 8.3 Maintenance System
- **Problem Reporting**: Staff can report capsule issues
- **Issue Tracking**: Problem status and resolution workflow
- **Assignment**: Problem assignment to staff members
- **Resolution Tracking**: Complete problem lifecycle

### 8.4 Configuration Management

The Settings page provides comprehensive system configuration through a tabbed interface with tooltips for enhanced user experience:

#### Settings Page Tab Structure
1. **General Tab**: System-wide configuration
   - Accommodation type settings (Capsule/Room/Dormitory)
   - System messages and notifications
   - Basic operational parameters

2. **Capsules Tab**: Accommodation management
   - Add, edit, and remove capsules/rooms
   - Manage capsule availability status
   - Configure physical sections and numbering

3. **Maintenance Tab**: Issue tracking and resolution
   - Report capsule problems and maintenance issues
   - Track repair status and assignments
   - Manage maintenance workflows

4. **Guest Guide Tab**: Customer-facing content management
   - Configure guest success page content
   - Set check-in/check-out instructions
   - Manage WiFi details and contact information
   - HTML editor for custom page layouts
   - Preview functionality for mobile/desktop views

5. **Users Tab** (Available in "More" dropdown): User management
   - Create and manage user accounts
   - Set user roles and permissions (admin/staff)
   - Edit user profiles and credentials

6. **Tests Tab** (Available in "More" dropdown): System testing
   - Run system validation tests
   - Test business logic and data validation
   - Performance monitoring and diagnostics

#### Technical Features
- **CSV-based Storage**: Settings persisted in CSV format for portability
- **Hot Reload**: Configuration changes without system restart
- **Default Values**: Pre-configured system defaults
- **Environment Override**: Environment variable configuration
- **Tooltips**: Comprehensive help system for all navigation elements
- **Responsive Design**: Mobile-optimized interface with icon-only display

### 8.5 File Management
- **Photo Uploads**: Guest and capsule photos
- **Document Storage**: Important documents and files
- **Cloud Integration**: Google Cloud Storage support
- **Local Fallback**: Development environment support

---

## 9. Development Environment

### 9.1 Setup Requirements
- **Node.js**: Version 18 or higher
- **npm**: Package manager
- **TypeScript**: Type-safe development
- **PostgreSQL**: Database (optional for development)

### 9.2 Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run check

# Database operations
npm run db:push
```

### 9.3 Environment Configuration
```bash
# Development (in-memory storage)
# No DATABASE_URL needed

# Production (PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# File Storage
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_CLOUD_KEY_FILE=path/to/key.json
```

---

## 10. Deployment Architecture

### 10.1 Production Environment
- **Hosting**: Cloud-based deployment (Replit, Vercel, etc.)
- **Database**: Neon PostgreSQL (serverless) with in-memory fallback on failure
- **File Storage**: Google Cloud Storage (with dev/local fallback upload endpoint)
- **CDN**: Content delivery network for static assets

### 10.2 Deployment Process
1. **Build**: Production build with ESBuild
2. **Environment Setup**: Configure production environment variables
3. **Database Migration**: Run Drizzle migrations
4. **File Upload**: Deploy to hosting platform
5. **Health Check**: Verify system functionality

### 10.3 Scaling Considerations
- **Database**: Neon serverless auto-scaling
- **File Storage**: Google Cloud Storage global distribution
- **CDN**: Static asset caching and distribution
- **Load Balancing**: Multiple server instances if needed

---

## 11. Performance & Scalability

### 11.1 Performance Optimizations
- **React Query**: Intelligent caching and background updates
- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Compressed and optimized images
- **Bundle Optimization**: Tree shaking and minification

### 11.2 Scalability Features
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections
- **Caching Strategy**: Multi-level caching approach
- **Async Operations**: Non-blocking I/O operations

### 11.3 Monitoring
- **Performance Metrics**: Response time tracking
- **Error Tracking**: Comprehensive error logging
- **Usage Analytics**: System usage patterns
- **Health Checks**: System status monitoring

---

## 12. Error Handling & Monitoring

### 12.1 Error Categories
- **Validation Errors**: Input validation failures
- **Authentication Errors**: Login and authorization failures
- **Database Errors**: Storage operation failures
- **Network Errors**: API communication failures
- **System Errors**: Unexpected system failures

### 12.2 Error Handling Strategy
- **Graceful Degradation**: Fallback to alternative storage
- **User-Friendly Messages**: Clear error communication
- **Logging**: Comprehensive error logging
- **Recovery**: Automatic error recovery when possible

### 12.3 Monitoring Tools
- **Console Logging**: Development environment logging
- **Error Boundaries**: React error boundary components
- **Performance Monitoring**: Response time tracking
- **Health Checks**: System status verification

---

## 13. Testing Strategy

### 13.1 Testing Framework
- **Jest**: Primary testing framework
- **React Testing Library**: Component testing
- **TypeScript**: Type checking and validation
- **Mocking**: Storage and API mocking

### 13.2 Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **API Tests**: Backend endpoint testing
- **Storage Tests**: Data persistence testing

### 13.3 Test Coverage
- **Component Coverage**: All React components
- **API Coverage**: All backend endpoints
- **Storage Coverage**: All storage operations
- **Error Handling**: Error scenarios and recovery

---

## 14. File Management System

### 14.1 File Storage Architecture
- **Development**: Local file system storage
- **Production**: Google Cloud Storage integration
- **Fallback Strategy**: Automatic storage method selection
- **File Types**: Images, documents, and media files

### 14.2 File Operations
- **Upload**: Drag-and-drop file upload interface
- **Storage**: Secure file storage with metadata
- **Retrieval**: Fast file access and delivery
- **Deletion**: Secure file removal and cleanup

### 14.3 Security Features
- **File Validation**: Type and size validation
- **Access Control**: Role-based file access
- **Virus Scanning**: File security scanning
- **Backup Strategy**: File backup and recovery

---

## Conclusion

PelangiManager represents a modern, scalable, and maintainable solution for capsule hostel management. The system's architecture emphasizes:

- **Modularity**: Clear separation of concerns and reusable components
- **Scalability**: Cloud-native architecture with auto-scaling capabilities
- **Security**: Comprehensive authentication and authorization
- **Performance**: Optimized frontend and backend operations
- **Maintainability**: Type-safe development and comprehensive testing
- **Flexibility**: Multiple storage and deployment options

The system is designed to grow with the business needs while maintaining high performance and reliability standards.
