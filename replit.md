# Overview

This is the "Pelangi Capsule Hostel" management system, a full-stack web application designed to manage guest check-ins, check-outs, and monitor occupancy across 24 capsules. It features a modern React frontend with TypeScript and a Node.js/Express backend, aimed at providing real-time hostel operations management. The system supports persistent data storage, push notifications for operational updates, and an unauthenticated dashboard access for emergency response.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is a React 18 application built with TypeScript, utilizing a component-based architecture. It uses `shadcn/ui` components based on Radix UI for its interface, styled with TailwindCSS. State management is handled by TanStack Query, routing by Wouter, and form handling by React Hook Form with Zod validation. Vite is used for fast development and optimized builds. Global error boundaries and comprehensive client-side validation are implemented.

## Backend Architecture
The server is built with Node.js and Express, adhering to a RESTful API pattern. It uses TypeScript for type safety. Data persistence is managed via PostgreSQL, abstracted through a flexible storage interface. Comprehensive server-side validation is implemented using Zod, including security measures against SQL injection and XSS. Centralized error handling middleware is also in place.

## Data Storage Solutions
The application uses PostgreSQL as its primary database, managed with Drizzle ORM for production persistence. The database schema includes tables for users, guests, capsules, sessions, guest tokens, capsule problems, admin notifications, and application settings. The system is designed for production with automatic data initialization and full TypeScript integration with Zod schemas for runtime validation and data integrity.

## Authentication and Authorization
Authentication is handled via Google OAuth with a fallback for traditional email/password login. User data, including Google OAuth fields, is stored in the database. A token-based session management system with 24-hour expiration is implemented.

## System Design Choices
- **Push Notifications**: Implemented with database-backed subscription persistence for multi-device support, ensuring notifications survive server restarts.
- **Global Error Handling**: Comprehensive error boundary system for standardized error handling, user-friendly fallback UI, and detailed error logging.
- **Validation**: Robust, comprehensive validation rules implemented across all input fields, both client-side and server-side, covering schema-level, security, and business rule validation.
- **Pagination**: Implemented for all data-heavy endpoints to improve performance with large datasets.
- **Page Visibility API Integration**: Optimizes performance by pausing/resuming data fetches based on tab visibility, reducing server load and improving battery life.
- **Unauthenticated Dashboard Access**: Critical feature allowing immediate guest table access for emergency response without login, while maintaining authentication for sensitive operations.

# External Dependencies

## Database Services
- **PostgreSQL**: Primary production database, configured via environment variables.
- **Drizzle ORM**: Type-safe SQL toolkit for database interactions.
- **Neon Database**: Serverless PostgreSQL provider integration.

## UI and Component Libraries
- **Radix UI**: Accessible UI primitives.
- **shadcn/ui**: Component library built on Radix UI.
- **Lucide React**: Icon library.
- **TailwindCSS**: Utility-first CSS framework.

## Development and Build Tools
- **Vite**: Fast build tool and development server.
- **ESBuild**: JavaScript bundler.
- **TypeScript**: Static type checking.

## Data Management and Validation
- **Zod**: Comprehensive schema validation library for runtime type checking, form validation, input sanitization, and security validation patterns.
- **TanStack Query**: Server state management for caching and data synchronization.

## External Authentication Services
- **Google OAuth 2.0**: Authentication provider.
- **Google Identity Services**: Frontend integration for Google Sign-In.
- **Google Auth Library**: Backend token verification.