# 🚀 Replit Quick Start Guide

## For Replit Agents

This project automatically switches between storage types based on environment variables.

## ⚡ Quick Setup (3 Steps)

### 1. Import Project
- Import your PelangiManager project to Replit
- No code changes needed

### 2. Set Environment Variable
Go to **Tools → Secrets** and add:
```
Key: DATABASE_URL
Value: your_neon_database_connection_string
```

### 3. Run
```bash
npm install
npm run dev
```

## 🔄 What Happens Automatically

- **With DATABASE_URL**: Uses `DatabaseStorage` (full database)
- **Without DATABASE_URL**: Uses `MemStorage` (in-memory, sample data)

## 📊 Sample Data Included

- **Users**: admin/admin123, Jay/Jay123, Le/Le123, Alston/Alston123
- **Capsules**: 22 capsules (C1-C6, C11-C24, C25-C26)
- **Guests**: 8 sample guest records

## 🛠️ Available Commands

```bash
npm run dev      # Development server
npm run build    # Build for production  
npm run start    # Production server
npm run db:push  # Database schema setup
```

## 🔍 Troubleshooting

**Problem**: "DATABASE_URL environment variable is not set"
**Solution**: Set DATABASE_URL in Replit Secrets

**Problem**: Database connection failed
**Solution**: Check DATABASE_URL format and database accessibility

## 📁 Key Files

- `server/storage.ts` - Storage system logic
- `SETUP.md` - Full setup documentation
- `docs/Storage_System_Guide.md` - Technical storage guide

## ✨ Benefits

✅ **Zero Configuration**: Just set DATABASE_URL  
✅ **Same Codebase**: Works locally and on Replit  
✅ **Automatic Fallback**: Falls back to in-memory if database fails  
✅ **Production Ready**: Full database functionality  

## 🎯 For Replit Agents

**Remember**: This project is designed to work on Replit with minimal setup. Just set the `DATABASE_URL` environment variable and everything else happens automatically!

