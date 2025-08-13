# Pelangi Manager Setup Guide

## Overview
Pelangi Manager is a full-stack capsule hostel management system with automatic storage selection:
- **Local Development**: Uses in-memory storage (no database setup required)
- **Replit Production**: Uses Neon database with full data persistence

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

The server will start on `http://localhost:5000` and automatically use in-memory storage.

## Storage System Architecture

The system automatically chooses storage based on environment:

```typescript
// Automatically choose storage based on environment
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
```

## Local Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Steps
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Access at: `http://localhost:5000`

### What Happens
- No `DATABASE_URL` environment variable = Uses `MemStorage`
- Sample data is automatically initialized (capsules, guests, users)
- All functionality works with in-memory data
- Data resets on each server restart

## Replit Deployment Setup

### Prerequisites
- Replit account
- Neon database (or any PostgreSQL database)

### Environment Variables Required
Set these in Replit's Secrets (Tools → Secrets):

```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

### Steps
1. Import your project to Replit
2. Set `DATABASE_URL` in Replit Secrets
3. Run `npm install`
4. Start with `npm run dev` or `npm start`

### What Happens
- `DATABASE_URL` detected = Uses `DatabaseStorage`
- Full database functionality with data persistence
- Same code, different storage backend
- All data is saved and persists between deployments

## Database Schema Setup

If using a fresh database, run migrations:

```bash
npm run db:push
```

## Default Users

The system automatically creates these users:

- **Admin**: `admin` / `admin123`
- **Staff**: `Jay` / `Jay123`
- **Staff**: `Le` / `Le123`
- **Staff**: `Alston` / `Alston123`

## Available Scripts

```bash
npm run dev          # Start development server (in-memory storage)
npm run build        # Build for production
npm run start        # Start production server
npm run db:push      # Push database schema changes
npm run test         # Run tests
```

## Troubleshooting

### Local Development Issues
- **Port already in use**: Change port in `server/index.ts` or kill existing process
- **Storage errors**: Ensure no `DATABASE_URL` is set locally

### Replit Issues
- **Database connection failed**: Check `DATABASE_URL` in Replit Secrets
- **Storage not working**: Verify environment variable is set correctly
- **Build errors**: Check Node.js version compatibility

### Storage Fallback
If database connection fails, the system automatically falls back to in-memory storage with a warning message.

## Architecture Benefits

✅ **Zero Configuration Local Development**: Just clone and run  
✅ **Production Ready**: Same codebase works on Replit  
✅ **Automatic Storage Selection**: No manual configuration needed  
✅ **Data Persistence**: Full database functionality on Replit  
✅ **Easy Testing**: In-memory storage for development/testing  

## File Structure

```
PelangiManager/
├── client/           # React frontend
├── server/           # Express backend
├── shared/           # Shared schemas and utilities
├── server/storage.ts # Storage system (MemStorage + DatabaseStorage)
└── SETUP.md         # This file
```

## Migration Between Environments

### Local → Replit
1. Set `DATABASE_URL` in Replit
2. Deploy code (no changes needed)
3. System automatically switches to database storage

### Replit → Local
1. Remove `DATABASE_URL` environment variable
2. System automatically switches to in-memory storage
3. All functionality remains the same

## Support

For issues or questions:
1. Check this SETUP.md file
2. Review console logs for storage selection messages
3. Verify environment variables are set correctly
4. Check database connection if using `DatabaseStorage`