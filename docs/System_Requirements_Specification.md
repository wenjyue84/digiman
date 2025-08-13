# System Requirements Specification (SRS)
# PelangiManager - Capsule Hostel Management System

**Document Version:** 2.0  
**Date:** December 2024  
**Project:** Pelangi Capsule Hostel Management System  

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [System Features Detail](#5-system-features-detail)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Technical Requirements](#7-technical-requirements)
8. [Constraints](#8-constraints)
9. [Testing Requirements](#9-testing-requirements)
10. [Assumptions and Dependencies](#10-assumptions-and-dependencies)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for PelangiManager, a comprehensive capsule hostel management system designed to manage guest check-ins, check-outs, capsule occupancy, maintenance, and administrative operations for Pelangi Capsule Hostel.

### 1.2 Scope
PelangiManager is a full-stack web application that provides:
- Real-time guest management and occupancy tracking
- Capsule maintenance and problem reporting system
- User authentication and authorization
- Administrative dashboard with notifications
- Token-based guest self check-in system
- Multi-language support
- Comprehensive error handling and validation

### 1.3 Product Overview
The system manages 26 capsules organized in three sections:
- **Back Section:** C1-C6 (6 capsules)
- **Front Section:** C11-C24 (14 capsules)
- **Middle Section:** C25-C26 (2 capsules)

### 1.4 Definitions and Acronyms
- **SRS:** System Requirements Specification
- **API:** Application Programming Interface
- **UI:** User Interface
- **CRUD:** Create, Read, Update, Delete
- **JWT:** JSON Web Token
- **OAuth:** Open Authorization

---

## 2. Overall Description

### 2.1 Product Functions
- Guest check-in and check-out management
- Real-time capsule occupancy monitoring
- Maintenance problem tracking and resolution
- User account management with role-based access
- Guest token generation for self check-in
- Administrative notifications system
- Configuration management with hot-reload
- Data export and reporting capabilities
- Google OAuth authentication integration
- File upload and management system
- Real-time WebSocket updates
- Mobile-responsive design
- Multi-language support (i18n ready)
- Photo management for guests and capsules

### 2.2 User Classes and Characteristics
1. **Staff Users:**
   - Primary system users
   - Access to all guest management features
   - Can report and resolve maintenance issues
   - View administrative notifications

2. **Admin Users:**
   - Full system access
   - User management capabilities
   - System configuration access
   - Advanced reporting features

3. **Guests (Self Check-in):**
   - Limited access via token-based self check-in
   - Can complete check-in process independently

### 2.3 Operating Environment
- **Client:** Web browsers (Chrome, Firefox, Safari, Edge)
- **Server:** Node.js runtime environment with Express.js
- **Database:** PostgreSQL (Neon serverless) / In-memory storage (development)
- **Platform:** Cross-platform web application
- **Deployment:** Cloud-based hosting (Replit, Vercel, etc.)
- **File Storage:** Google Cloud Storage (production) / Local file system (development)
- **Build Tool:** Vite for frontend, ESBuild for backend

### 2.4 Design and Implementation Constraints
- Must support real-time updates for occupancy status
- Must handle concurrent user sessions
- Must maintain data integrity during peak usage
- Must provide offline-capable error handling
- Must support mobile-responsive design

---

## 3. System Features

### 3.1 Core Features
- **Guest Management**: Complete guest lifecycle management
- **Capsule Management**: Real-time occupancy and cleaning status
- **Maintenance System**: Problem reporting and resolution workflow
- **User Authentication**: Multi-method authentication system
- **Configuration Management**: Dynamic system configuration

### 3.2 Advanced Features
- **Google OAuth Integration**: Modern social login authentication
- **File Management**: Photo uploads and document storage
- **Real-time Updates**: WebSocket-based live updates
- **Mobile Responsiveness**: Optimized for mobile devices
- **Multi-language Support**: Internationalization framework
- **Photo Management**: Guest and capsule photo handling
- **Token-based Self Check-in**: Guest self-service capabilities
1. **Guest Management System**
2. **Capsule Occupancy Tracking**
3. **Maintenance Management**
4. **User Authentication & Authorization**
5. **Administrative Dashboard**
6. **Token-Based Self Check-in**
7. **Notification System**
8. **Configuration Management**
9. **Error Handling & Validation**
10. **Multi-language Support**

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- **Modern Web Interface:** React-based responsive UI
- **Mobile-Optimized:** Fully responsive design for tablets and smartphones
- **Dark/Light Theme:** User-configurable theme switching
- **Accessibility:** WCAG 2.1 AA compliance

### 4.2 Hardware Interfaces
- **Standard Web Browsers:** No special hardware requirements
- **Network Connection:** Internet connectivity required for cloud features

### 4.3 Software Interfaces
- **Database:** PostgreSQL 12+ for production
- **Authentication:** Google OAuth 2.0 integration
- **Email Service:** SendGrid API for notifications
- **Object Storage:** Cloud storage integration for file uploads

### 4.4 Communication Interfaces
- **HTTP/HTTPS:** RESTful API communication
- **WebSocket:** Real-time updates (future enhancement)
- **JSON:** Primary data exchange format

---

## 5. System Features Detail

### 5.1 Guest Management System

#### 5.1.1 Description
Complete lifecycle management of guest records from check-in to check-out.

#### 5.1.2 Functional Requirements
- **FR-1.1:** System shall allow staff to create new guest records with complete personal information
- **FR-1.2:** System shall assign available capsules to guests during check-in
- **FR-1.3:** System shall process guest check-out and update capsule availability
- **FR-1.4:** System shall maintain guest history records
- **FR-1.5:** System shall validate guest information format (phone, email, ID numbers)
- **FR-1.6:** System shall support payment tracking and status updates
- **FR-1.7:** System shall generate guest reports and export data

#### 5.1.3 Input/Output
- **Input:** Guest personal data, capsule assignment, payment information
- **Output:** Guest records, occupancy updates, check-in/out confirmations

### 5.2 Capsule Occupancy Tracking

#### 5.2.1 Description
Real-time monitoring and management of capsule availability and occupancy status.

#### 5.2.2 Functional Requirements
- **FR-2.1:** System shall display real-time occupancy rates and statistics
- **FR-2.2:** System shall track capsule cleaning status
- **FR-2.3:** System shall prevent double-booking of capsules
- **FR-2.4:** System shall automatically update capsule status on check-out
- **FR-2.5:** System shall provide occupancy calendar view
- **FR-2.6:** System shall generate occupancy reports

#### 5.2.3 Input/Output
- **Input:** Check-in/out events, cleaning status updates
- **Output:** Occupancy dashboard, availability lists, status reports

### 5.3 Maintenance Management

#### 5.3.1 Description
Tracking and resolution of capsule maintenance issues and problems.

#### 5.3.2 Functional Requirements
- **FR-3.1:** System shall allow staff to report capsule problems
- **FR-3.2:** System shall track problem status from report to resolution
- **FR-3.3:** System shall mark capsules as unavailable when problems are reported
- **FR-3.4:** System shall restore capsule availability when problems are resolved
- **FR-3.5:** System shall maintain maintenance history
- **FR-3.6:** System shall send notifications for critical maintenance issues

#### 5.3.3 Input/Output
- **Input:** Problem reports, resolution updates, maintenance notes
- **Output:** Problem tracking lists, maintenance status, availability updates

### 5.4 User Authentication & Authorization

#### 5.4.1 Description
Secure user access control with multiple authentication methods.

#### 5.4.2 Functional Requirements
- **FR-4.1:** System shall support email/password authentication
- **FR-4.2:** System shall integrate Google OAuth 2.0 authentication
- **FR-4.3:** System shall implement role-based access control (staff/admin)
- **FR-4.4:** System shall maintain secure session management
- **FR-4.5:** System shall provide password reset functionality
- **FR-4.6:** System shall log authentication events

#### 5.4.3 Input/Output
- **Input:** Login credentials, OAuth tokens, role assignments
- **Output:** Authentication status, session tokens, access permissions

### 5.5 Token-Based Self Check-in

#### 5.5.1 Description
Self-service check-in system for guests using generated tokens.

#### 5.5.2 Functional Requirements
- **FR-5.1:** System shall generate time-limited check-in tokens
- **FR-5.2:** System shall allow guests to complete check-in using tokens
- **FR-5.3:** System shall validate token authenticity and expiration
- **FR-5.4:** System shall automatically assign capsules for token check-ins
- **FR-5.5:** System shall track token usage and prevent reuse
- **FR-5.6:** System shall send token-based check-in notifications

#### 5.5.3 Input/Output
- **Input:** Token parameters, guest self-check-in data
- **Output:** Check-in tokens, completed registrations, notifications

---

## 6. Non-Functional Requirements

### 6.1 Performance Requirements
- **NFR-1.1:** System shall respond to user actions within 2 seconds
- **NFR-1.2:** System shall support up to 50 concurrent users
- **NFR-1.3:** Database queries shall complete within 500ms
- **NFR-1.4:** Page load times shall not exceed 3 seconds

### 6.2 Security Requirements
- **NFR-2.1:** All data transmission shall use HTTPS encryption
- **NFR-2.2:** User passwords shall be hashed using bcrypt
- **NFR-2.3:** API endpoints shall implement rate limiting
- **NFR-2.4:** Input validation shall prevent SQL injection and XSS attacks
- **NFR-2.5:** Session tokens shall expire after 24 hours of inactivity

### 6.3 Reliability Requirements
- **NFR-3.1:** System uptime shall be 99.5% or higher
- **NFR-3.2:** System shall gracefully handle database connection failures
- **NFR-3.3:** Data backups shall be performed daily
- **NFR-3.4:** System shall implement comprehensive error logging

### 6.4 Usability Requirements
- **NFR-4.1:** User interface shall be intuitive for non-technical staff
- **NFR-4.2:** System shall provide clear error messages and validation feedback
- **NFR-4.3:** Mobile interface shall maintain full functionality
- **NFR-4.4:** System shall support keyboard navigation and screen readers

### 6.5 Scalability Requirements
- **NFR-5.1:** System architecture shall support horizontal scaling
- **NFR-5.2:** Database shall handle up to 10,000 guest records
- **NFR-5.3:** System shall support multiple hostel locations (future)

---

## 7. Technical Requirements

### 7.1 Frontend Requirements
- **React 18+**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development environment
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality component library
- **React Query**: Server state management
- **Responsive Design**: Mobile-first approach

### 7.2 Backend Requirements
- **Node.js 18+**: JavaScript runtime environment
- **Express.js**: Web application framework
- **TypeScript**: Type-safe backend development
- **Passport.js**: Authentication middleware
- **Drizzle ORM**: Type-safe database operations
- **WebSocket Support**: Real-time communication
- **File Upload Handling**: Multer middleware

### 7.3 Database Requirements
- **PostgreSQL**: Primary database (Neon serverless)
- **In-Memory Storage**: Development and testing storage
- **Automatic Fallback**: Graceful degradation to in-memory storage
- **Data Migration**: Drizzle-based schema management

### 7.4 Storage Requirements
- **Google Cloud Storage**: Production file storage
- **Local File System**: Development file storage
- **Automatic Selection**: Environment-based storage method selection
- **File Validation**: Type and size validation
- **Framework:** React 18 with TypeScript
- **UI Library:** shadcn/ui components built on Radix UI
- **Styling:** TailwindCSS with custom CSS variables
- **State Management:** TanStack Query (React Query)
- **Routing:** Wouter lightweight router
- **Form Handling:** React Hook Form with Zod validation
- **Build Tool:** Vite with fast development server

### 7.2 Backend Technology Stack
- **Runtime:** Node.js with Express.js framework
- **Language:** TypeScript for type safety
- **Database ORM:** Drizzle ORM with PostgreSQL
- **Authentication:** Passport.js with Google OAuth
- **Validation:** Zod schema validation
- **Testing:** Jest with comprehensive test coverage

### 7.3 Development Tools
- **Version Control:** Git with branching strategy
- **Package Management:** npm with lock files
- **Code Quality:** ESLint and Prettier
- **Testing:** Jest, React Testing Library
- **Build Pipeline:** Automated CI/CD integration

### 7.4 Database Requirements
- **Primary Database:** PostgreSQL 12+
- **Development Database:** In-memory storage option
- **Migration System:** Drizzle migrations
- **Connection Pooling:** Built-in connection management
- **Backup Strategy:** Daily automated backups

---

## 8. Constraints

### 8.1 Technical Constraints
- **Browser Support:** Modern browsers only (ES2020+ support required)
- **Database:** PostgreSQL specific features utilized
- **Node.js Version:** Requires Node.js 18+ for ES modules
- **Memory Usage:** In-memory development mode limited to available RAM

### 8.2 Business Constraints
- **Capsule Layout:** Fixed 24-capsule configuration with specific numbering
- **User Roles:** Two-tier role system (staff/admin)
- **Operating Hours:** 24/7 system availability required
- **Data Retention:** Guest data retention per privacy regulations

### 8.3 Regulatory Constraints
- **Data Privacy:** GDPR compliance for guest personal data
- **Security Standards:** Industry standard encryption requirements
- **Accessibility:** WCAG 2.1 compliance for public interfaces

---

## 9. Testing Requirements

### 9.1 Testing Framework
- **Jest**: Primary testing framework
- **React Testing Library**: Component testing utilities
- **TypeScript**: Type checking and validation
- **Mocking**: Storage and API mocking capabilities

### 9.2 Test Coverage
- **Unit Tests**: Individual component and function testing
- **Integration Tests**: Component interaction testing
- **API Tests**: Backend endpoint testing
- **Storage Tests**: Data persistence testing
- **Error Handling**: Error scenarios and recovery testing

### 9.3 Testing Environment
- **Development**: In-memory storage for fast testing
- **CI/CD**: Automated testing in deployment pipeline
- **Coverage Reports**: Test coverage metrics and reporting

## 10. Assumptions and Dependencies

### 9.1 Assumptions
- **Network Connectivity:** Stable internet connection available
- **User Training:** Staff will receive basic system training
- **Browser Updates:** Users maintain updated browsers
- **Data Migration:** Existing guest data can be imported if needed

### 9.2 Dependencies
- **Third-Party Services:**
  - Google OAuth API for authentication
  - SendGrid API for email notifications
  - PostgreSQL database hosting
  - Cloud storage for file uploads

- **Infrastructure Dependencies:**
  - Cloud hosting platform availability
  - SSL certificate management
  - Domain name and DNS configuration
  - Monitoring and logging services

### 9.3 External Interfaces
- **Payment Gateways:** Future integration capability
- **Accounting Systems:** Export compatibility required
- **Communication APIs:** SMS notifications (future enhancement)
- **Property Management Systems:** Integration potential

---

## Appendices

### Appendix A: Data Models
- User entity with authentication fields
- Guest entity with personal information
- Capsule entity with status tracking
- Problem entity for maintenance tracking
- Token entity for self check-in
- Notification entity for admin alerts

### Appendix B: API Endpoints
- Authentication endpoints (/api/auth/*)
- Guest management (/api/guests/*)
- Capsule operations (/api/capsules/*)
- Maintenance tracking (/api/problems/*)
- Token management (/api/guest-tokens/*)
- Administrative functions (/api/admin/*)

### Appendix C: Error Codes
- Authentication errors (401, 403)
- Validation errors (400)
- Resource not found (404)
- Server errors (500)
- Custom business logic errors

---

**Document Control:**
- **Author:** System Analyst
- **Reviewed By:** Project Manager
- **Approved By:** Product Owner
- **Next Review Date:** September 9, 2025

---

*This document serves as the authoritative specification for the PelangiManager system development and maintenance.*