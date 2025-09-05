# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# PelangiManager - Capsule System Management Platform

A comprehensive hostel/capsule hotel management system built with React, TypeScript, Express, and PostgreSQL.

## 🧱 Project Standards
- **Package Manager**: Always use `npm` (not pnpm)
- **Build Command**: `npm run build` for production builds
- **Development**: `npm run dev` for development server
- **Testing**: `npm test` for running tests
- **Linting**: `npm run lint` before commits when available
- **Type Checking**: `npm run typecheck` before commits when available

## 🚀 Development Workflow
- **Always kill port processes before starting servers** (prevention-first approach)
- **800-Line Rule**: Keep files under 800 lines - proactively suggest refactoring if exceeded
- **File Operations**: Always ask for confirmation before deleting any files
- **Git Operations**: Work primarily on **main** branch, use Conventional Commits format

## 🔧 Tech Stack
- **Frontend**: React 18 with TypeScript, Vite build system, Tailwind CSS
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM (falls back to in-memory storage)
- **Testing**: Jest for unit tests
- **UI Components**: Shadcn/ui with Radix UI primitives
- **State Management**: TanStack Query for server state
- **Form Management**: React Hook Form with Zod validation

## 🏗️ High-Level Architecture

### Full-Stack Structure
```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-based page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and service workers
│   │   └── main.tsx        # App entry point with PWA setup
├── server/                 # Node.js backend API
│   ├── routes/             # Express route handlers (auth, guests, capsules, etc.)
│   ├── storage/            # Data layer abstraction (Memory/Database)
│   ├── configManager.ts    # System configuration management
│   └── index.ts            # Server entry point with Vite middleware
├── shared/                 # Shared TypeScript schemas and utilities
│   ├── schema.ts           # Zod schemas for data validation
│   └── utils.ts            # Cross-platform utilities
└── docs/                   # Comprehensive system documentation
```

### Storage Architecture
- **Dual Storage System**: Automatic fallback from PostgreSQL to in-memory storage
- **Storage Factory Pattern**: `server/storage/StorageFactory.ts` manages storage selection
- **Data Models**: Guests, Capsules, Users, Problems, Settings, Guest Tokens
- **Migration Support**: Built-in database migration system via MigrationHelper

### API Structure
- **RESTful API**: `/api/{resource}` endpoints for all operations
- **Authentication**: Passport.js with session management
- **File Handling**: `/objects/` endpoints for file upload/download
- **Real-time Features**: WebSocket support for live updates

## 🌐 Development Server Configuration

### Current Port Setup
- **Frontend (Vite)**: `http://localhost:3000`
- **Backend (Express)**: `http://localhost:5000`
- **API Proxy**: Vite proxies `/api` and `/objects` requests to backend

### Starting Development
```bash
# Clean start (recommended)
npm run dev:clean

# Standard start
npm run dev

# Manual cleanup if needed
npx kill-port 5000 && npx kill-port 3000
```

## 📚 Core Features

### Guest Management System
- **Check-in Flow**: `/client/src/pages/check-in.tsx` with capsule assignment
- **Check-out System**: `/client/src/pages/check-out.tsx` with cleaning status
- **Guest Profiles**: CRUD operations with photo upload support
- **Guest Tokens**: Secure check-in tokens for contactless operations

### Capsule Operations
- **Visual Management**: Grid, list, and table views for capsule status
- **Cleaning Workflow**: Track cleaning schedules and maintenance
- **Problem Tracking**: Report and resolve capsule issues
- **Availability Engine**: Real-time availability calculation

### Settings & Configuration
- **Modular Settings**: Tab-based interface for different config areas
- **User Management**: Role-based access (admin/staff)
- **System Testing**: Built-in validation tools
- **Message Templates**: Customizable guest communications

## 🔒 Safety Protocols
- Backup before major file operations
- Never touch system directories without explicit permission
- Always confirm before permanent deletions
- Create archive backups before major refactoring

## 🚨 Critical Troubleshooting Patterns

### Hot Reload System (Current Setup)
**Development Configuration:**
- **Frontend**: `http://localhost:3000` (Vite dev server with instant hot reload)
- **Backend**: `http://localhost:5000` (Express with auto-restart)  
- **Single Command**: `npm run dev` starts both servers concurrently
- **Smart Proxy**: API calls automatically routed to backend

**Benefits:**
- ✅ React changes reflect instantly in browser
- ✅ Backend changes auto-restart server
- ✅ No manual builds needed for development

### Port Conflicts (Enhanced Prevention)
**Prevention-First Approach:**
```bash
# Clean restart with correct ports
npm run dev:clean

# Manual cleanup if needed
npx kill-port 5000 && npx kill-port 3000
npm run dev
```

### Component Caching Issues
**Problem:** Component changes not appearing despite file modifications
**Solution:**
```bash
rm -rf node_modules/.vite && npm run build && npm run dev
```

## 📝 Git Standards

### Commit Standards
- Use **Conventional Commits** format:
  - `feat:` for new features
  - `fix:` for bug fixes  
  - `docs:` for documentation
  - `refactor:` for code refactoring
  - `test:` for tests
  - `chore:` for maintenance

### Code Quality
- **Always perform code review** before commits
- Run appropriate tests based on project type
- Follow existing code patterns and conventions

## 🎨 React Development Experience

### Component Size Management (800-Line Rule)
**USER GUIDELINE:** "Keep files less than 800 lines, if it is more than that then you should check if it is suitable for refactoring and ask me."

### Refactoring Best Practices
1. **Conservative Approach:** One component at a time, test between changes
2. **Backup Strategy:** Always create backup before starting refactoring
3. **Logical Extraction:** Extract complete logical sections, not arbitrary code blocks
4. **Form Integration:** Maintain react-hook-form integration seamlessly
5. **Type Safety:** Ensure all extracted components are properly typed

## ⚠️ Important Instructions

### Always Follow These Rules
1. **Do what has been asked; nothing more, nothing less**
2. **NEVER create files unless they're absolutely necessary for achieving the goal**
3. **ALWAYS prefer editing an existing file to creating a new one**
4. **NEVER proactively create documentation files (*.md) or README files** unless explicitly requested
5. **Run linting and type-checking** before commits when commands are available
6. **Ask for confirmation** on destructive operations (deletions, force pushes)
7. **Use TodoWrite tool** to track complex multi-step tasks
8. **Refer to documentation files** in docs/ folder when encountering problems
9. **ALWAYS kill port processes before starting servers** (prevention-first approach)

### Code Standards
- Follow existing code patterns and conventions
- Maintain TypeScript type safety
- Use existing libraries (check package.json first)
- Follow security best practices
- Never expose secrets or keys
- Keep components focused and under 800 lines

## 📚 Documentation References

### Core Documentation
- `docs/MASTER_TROUBLESHOOTING_GUIDE.md` - Comprehensive troubleshooting patterns
- `docs/CLAUDE_PROJECT_NOTES.md` - Development history and refactoring records
- `docs/DEVELOPMENT_REFERENCE.md` - Project structure and development practices

### On-Demand References
- `docs/Storage_System_Guide.md` - Storage architecture documentation
- `docs/System_Architecture_Document.md` - Overall system architecture
- `docs/REFACTORING_TROUBLESHOOTING.md` - Import/export error solutions

---

*This configuration prioritizes efficiency while maintaining safety through confirmations on critical operations.*