# Replit Deployment Guide

This guide will help you deploy your capsule hostel application to Replit.com with persistent data storage.

## 🚀 Quick Start

### 1. Fork/Import to Replit
- Go to [replit.com](https://replit.com)
- Click "Create Repl"
- Choose "Import from GitHub" and paste your repository URL
- Or fork an existing repl

### 2. Set Environment Variables
In your Replit project, go to **Tools** → **Secrets** and add:

```
REPLIT_DB_PATH=/tmp/replit.db
NODE_ENV=production
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Build and Run
```bash
npm run build
npm start
```

## 📊 Data Persistence Options

### Option 1: Replit's Built-in SQLite (Recommended)
- **Pros**: Free, persistent, no external dependencies
- **Cons**: Data stored in `/tmp` directory (survives repl restarts)
- **Best for**: Development, testing, small to medium applications

### Option 2: External Database (Production)
- **Pros**: Fully persistent, scalable, professional
- **Cons**: Requires external service, may have costs
- **Best for**: Production applications, high traffic

## 🔧 Configuration Details

### SQLite Database Path
The application automatically creates a SQLite database at `/tmp/replit.db` when `REPLIT_DB_PATH` is set.

### Environment Variables
| Variable | Value | Description |
|----------|-------|-------------|
| `REPLIT_DB_PATH` | `/tmp/replit.db` | SQLite database file path |
| `NODE_ENV` | `production` | Application environment |
| `PORT` | `5000` | Server port (auto-set by Replit) |

## 📁 File Structure for Replit

```
your-repl/
├── .replit                 # Replit configuration
├── package.json            # Dependencies
├── server/                 # Backend code
├── client/                 # Frontend code
├── /tmp/                   # Persistent data directory
│   └── replit.db          # SQLite database
└── dist/                   # Built application
```

## 🚨 Important Notes

### Data Persistence
- **Replit restarts**: Your data will persist through normal repl restarts
- **Repl deletion**: Data will be lost if you delete the repl
- **Backup**: Consider regular backups for important data

### Performance
- SQLite is suitable for small to medium applications
- For high-traffic production apps, consider PostgreSQL or MySQL
- Replit provides good performance for development and testing

### Security
- The SQLite database is stored in `/tmp` directory
- Access is restricted to your repl environment
- Consider encryption for sensitive data in production

## 🔄 Migration from In-Memory Storage

When you deploy to Replit:

1. **Automatic detection**: The app automatically detects `REPLIT_DB_PATH` and switches to SQLite
2. **Data initialization**: Default data (admin user, capsules) is automatically created
3. **Schema creation**: Database tables are created automatically on first run
4. **Fallback**: If SQLite fails, it falls back to in-memory storage

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check if REPLIT_DB_PATH is set
echo $REPLIT_DB_PATH

# Check if /tmp directory exists
ls -la /tmp
```

#### Permission Denied
```bash
# Ensure /tmp directory is writable
chmod 755 /tmp
```

#### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Logs
Check the console output for any error messages. The application logs database initialization and any issues.

## 📈 Scaling Considerations

### When to Upgrade from SQLite

Consider moving to an external database when:
- You have more than 1000 concurrent users
- You need real-time data synchronization across multiple instances
- You require advanced database features (transactions, complex queries)
- You need automatic backups and high availability

### External Database Options
1. **Neon** (PostgreSQL) - Already configured in your app
2. **PlanetScale** (MySQL) - Great for scaling
3. **Supabase** (PostgreSQL) - Full-featured backend
4. **Railway** (PostgreSQL) - Simple deployment

## 🎯 Best Practices

1. **Regular backups**: Export your SQLite database periodically
2. **Environment separation**: Use different databases for dev/staging/prod
3. **Monitoring**: Watch your repl's resource usage
4. **Updates**: Keep dependencies updated for security

## 📞 Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Check Replit's status page for any service issues

---

**Happy Deploying! 🚀**

Your capsule hostel application will now have persistent data storage on Replit!