# 🚀 DEVELOPMENT REFERENCE GUIDE
# PelangiManager - Complete Development & Architecture Reference

**Document Version:** 2025.01  
**Date:** January 2025  
**Project:** Pelangi Capsule Hostel Management System  

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **Frontend Architecture**
The client-side is built with React 18 using TypeScript and follows a component-based architecture:

- **UI Framework**: Utilizes shadcn/ui components built on Radix UI primitives for consistent, accessible interface elements
- **Styling**: TailwindCSS with custom CSS variables for theming, including hostel-specific color scheme
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Data Validation**: Comprehensive client-side validation with real-time feedback, input formatters, and security checks
- **Build Tool**: Vite for fast development and optimized production builds

### **Backend Architecture**
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety
- **Database**: Drizzle ORM with support for both in-memory and PostgreSQL storage
- **Authentication**: JWT-based with Passport.js integration
- **File Storage**: Flexible storage system supporting local files and cloud storage
- **API Design**: RESTful endpoints with consistent error handling

### **Storage System**
- **Dual Storage Support**: In-memory storage for development, database storage for production
- **Storage Factory Pattern**: Automatic selection based on environment variables
- **Migration Support**: Database schema evolution with Drizzle migrations
- **Data Persistence**: CSV-based configuration with database fallback

---

## 🛠️ **DEVELOPMENT SETUP**

### **Prerequisites**
- **Node.js**: Version 18+ required
- **Package Manager**: npm or yarn
- **Git**: For version control
- **Code Editor**: VS Code recommended with TypeScript support

### **Installation Steps**
```bash
# Clone repository
git clone <repository-url>
cd PelangiManager

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Environment Configuration**
```bash
# Development (in-memory storage)
# No DATABASE_URL needed

# Production (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/pelangi
```

### **Available Scripts**
```json
{
  "dev": "cross-env NODE_ENV=development tsx watch --clear-screen=false server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "cross-env NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "test": "jest --passWithNoTests",
  "test:e2e": "playwright test"
}
```

---

## 🔌 **API DOCUMENTATION**

### **Authentication Endpoints**

#### **POST /api/auth/login**
User authentication with email/password or username/password.

**Request Body:**
```json
{
  "email": "admin@pelangi.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "admin@pelangi.com",
    "role": "admin"
  }
}
```

#### **POST /api/auth/google**
Google OAuth authentication.

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@gmail.com",
    "role": "user"
  }
}
```

### **Guest Management Endpoints**

#### **GET /api/guests**
Retrieve all guests with pagination support.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by guest status
- `search`: Search by guest name or email

**Response:**
```json
{
  "data": [
    {
      "id": "guest_id",
      "name": "Guest Name",
      "email": "guest@email.com",
      "nationality": "Malaysian",
      "checkInDate": "2025-01-18",
      "checkOutDate": "2025-01-20",
      "capsuleId": "C1",
      "paymentStatus": "paid",
      "status": "checked-in"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### **POST /api/guests**
Create a new guest.

**Request Body:**
```json
{
  "name": "Guest Name",
  "email": "guest@email.com",
  "nationality": "Malaysian",
  "checkInDate": "2025-01-18",
  "checkOutDate": "2025-01-20",
  "capsuleId": "C1",
  "paymentAmount": 45,
  "paymentMethod": "cash"
}
```

#### **PUT /api/guests/:id**
Update guest information.

#### **DELETE /api/guests/:id**
Delete a guest (soft delete).

### **Capsule Management Endpoints**

#### **GET /api/capsules**
Retrieve all capsules.

**Response:**
```json
{
  "data": [
    {
      "id": "C1",
      "name": "Capsule 1",
      "status": "available",
      "type": "standard",
      "floor": 1,
      "toRent": true,
      "cleaningStatus": "clean"
    }
  ]
}
```

#### **GET /api/capsules/available**
Get available capsules for check-in.

#### **PUT /api/capsules/:id**
Update capsule status or information.

### **Settings Endpoints**

#### **GET /api/settings**
Retrieve all system settings.

#### **PUT /api/settings**
Update system settings.

**Request Body:**
```json
{
  "hostelName": "Pelangi Capsule Hostel",
  "checkInTime": "14:00",
  "checkOutTime": "11:00",
  "currency": "RM",
  "timezone": "Asia/Kuala_Lumpur"
}
```

### **File Upload Endpoints**

#### **POST /api/objects/upload**
Get upload URL for file uploads.

**Request Body:**
```json
{
  "fileName": "document.jpg",
  "fileType": "image/jpeg",
  "fileSize": 1024000
}
```

**Response:**
```json
{
  "uploadURL": "http://localhost:5000/api/objects/dev-upload/object_id",
  "objectId": "object_id"
}
```

#### **PUT /api/objects/dev-upload/:id**
Upload file content (development environment).

---

## 🧪 **TESTING SYSTEM**

### **Comprehensive Test Suite**
The system includes 18 detailed test scenarios covering all critical business processes:

#### **Authentication & Security Tests**
- User authentication and session management
- Role-based access control
- Token validation and expiration

#### **Guest Management Tests**
- Guest check-in/check-out workflows
- Payment processing validation
- Capsule assignment logic

#### **System Integration Tests**
- Storage system functionality
- API endpoint validation
- Error handling and recovery

### **Running Tests**

#### **Server-Side Tests**
```bash
# Run comprehensive system tests
curl -X POST http://localhost:5000/api/tests/run

# Run tests in watch mode
curl -X POST "http://localhost:5000/api/tests/run?watch=1"
```

#### **Client-Side Tests**
```bash
# Run Jest unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run Playwright E2E tests
npm run test:e2e
```

#### **Frontend Test Runner**
Access the built-in test runner in Settings > Tests tab for:
- Quick system validation
- Pre/post-change verification
- Performance monitoring

### **Test Coverage Areas**
- **Core Business Logic**: Guest management, payments, capsule operations
- **Data Integrity**: Storage consistency, validation rules
- **User Experience**: Form validation, error handling, responsive design
- **Performance**: Load times, memory usage, database queries
- **Security**: Authentication, authorization, data protection

---

## 🔧 **CONFIGURATION SYSTEM**

### **Settings Management**
The system uses a hierarchical configuration approach:

#### **CSV-Based Configuration**
- Primary configuration source for development
- Located in `settings.csv`
- Automatically loaded on server startup
- Supports 28+ configurable parameters

#### **Database Configuration**
- Production configuration storage
- Real-time updates without restart
- User interface for configuration changes
- Audit trail for configuration modifications

#### **Environment Variables**
- Database connection strings
- API keys and secrets
- Environment-specific settings
- Deployment configuration

### **Configuration Categories**
- **Hostel Information**: Name, address, contact details
- **Business Rules**: Check-in/out times, payment policies
- **Guest Experience**: Welcome messages, guide URLs
- **System Settings**: Storage type, notification preferences
- **Integration Settings**: Email, payment gateway configuration

---

## 📱 **COMPONENT ARCHITECTURE**

### **Core Components**
- **Layout Components**: Header, Navigation, MobileBottomNav
- **Form Components**: Input, Select, Textarea with validation
- **Data Display**: Tables, Cards, Lists with sorting/filtering
- **Interactive Elements**: Modals, Dialogs, Dropdowns
- **Utility Components**: Loading states, Error boundaries, Progress indicators

### **Page Components**
- **Dashboard**: Guest overview, occupancy calendar, notifications
- **Check-in/Check-out**: Guest management workflows
- **Settings**: System configuration and management
- **Guest Check-in**: Self-service check-in interface
- **Maintenance**: Problem reporting and resolution

### **State Management**
- **React Query**: Server state management and caching
- **Local State**: Component-level state with useState
- **Context**: Authentication and theme management
- **Form State**: React Hook Form for complex forms

---

## 🚀 **PERFORMANCE OPTIMIZATION**

### **Frontend Optimization**
- **Code Splitting**: Lazy loading of heavy components
- **Image Optimization**: WebP format, responsive images
- **Bundle Optimization**: Tree shaking, minification
- **Caching Strategy**: React Query caching, browser caching

### **Backend Optimization**
- **Database Queries**: Optimized with Drizzle ORM
- **Caching**: In-memory caching for frequently accessed data
- **Connection Pooling**: Efficient database connection management
- **Async Operations**: Non-blocking I/O operations

### **Monitoring & Metrics**
- **Performance Monitoring**: Load times, response times
- **Error Tracking**: Comprehensive error logging
- **User Analytics**: Feature usage, user behavior
- **System Health**: Memory usage, CPU utilization

---

## 🔒 **SECURITY FEATURES**

### **Authentication & Authorization**
- **JWT Tokens**: Secure, stateless authentication
- **Role-Based Access**: Admin, staff, and guest roles
- **Session Management**: Secure session handling
- **Password Security**: Bcrypt hashing, salt generation

### **Data Protection**
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **CSRF Protection**: Token-based request validation

### **API Security**
- **Rate Limiting**: Request throttling and abuse prevention
- **CORS Configuration**: Cross-origin request handling
- **Request Validation**: Schema-based request validation
- **Error Handling**: Secure error messages without information leakage

---

**Document Control:**
- **Maintained By:** Development Team
- **Last Updated:** January 2025
- **Next Review:** When architecture changes

*This reference guide provides comprehensive development information for the PelangiManager system.*
