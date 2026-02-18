# 🚀 DEPLOYMENT & OPERATIONS GUIDE
# PelangiManager - Complete Deployment & Operations Reference

**Document Version:** 2026.02 (updated)
**Project:** Pelangi Capsule Hostel Management System

> **Primary deployment reference:** `.claude/skills/lightsail-deployment/SKILL.md`
> This file covers storage system details, email, performance, and general maintenance.

---

## 🏗️ **PRODUCTION ARCHITECTURE**

### Service Placement — Where Each Service Runs

| Service | Production Home | Rationale |
|---------|----------------|-----------|
| **Website** (frontend nginx + API port 5000) | **Lightsail only** (always on) | Stateless, no session files — colleagues need 24/7 access without Jay's PC being on |
| **Rainbow AI** (port 3002) | **Local PC (primary) + Lightsail (standby)** | Has WhatsApp auth session; local has better GPU for AI providers |

### Rainbow AI Dual-Server Failover

```
Local PC (primary)               AWS Lightsail (standby)
──────────────────               ──────────────────────
RAINBOW_ROLE=primary             RAINBOW_ROLE=standby
RAINBOW_PEER_URL=http://18.142.14.142:3002

isActive = true                  isActive = false
→ processes & replies            → suppresses replies
→ heartbeat every 20s ────────► → monitors heartbeat
                                 → no beat for 60s → activates
                                 → beat resumes → immediately deactivates
```

**Required env vars** (see `RainbowAI/.env.example` for full reference):
```bash
# Local PC .env
RAINBOW_ROLE=primary
RAINBOW_PEER_URL=http://18.142.14.142:3002
RAINBOW_FAILOVER_SECRET=<shared-secret-from-openssl-rand-hex-16>

# Lightsail .env (no RAINBOW_PEER_URL needed on standby)
RAINBOW_ROLE=standby
RAINBOW_FAILOVER_SECRET=<same-shared-secret>
```

**Dashboard:** Settings → 🔁 Failover tab shows role badge, last heartbeat time, and promote/demote controls.

### Production URLs

| URL | Service | Always On? |
|-----|---------|------------|
| `http://18.142.14.142/` | Website frontend (nginx) | ✅ Yes |
| `http://18.142.14.142/api/*` | Backend API (PM2 `pelangi-api`) | ✅ Yes |
| `http://18.142.14.142:3002/` | Rainbow AI dashboard (standby) | ✅ Yes (standby) |
| `http://localhost:3002/` | Rainbow AI dashboard (primary) | When PC is on |

### Deployment Commands

```bash
# Full deploy (build + upload website + Rainbow AI to Lightsail)
./deploy.sh

# Frontend only
./deploy-frontend.sh

# Check production status
ssh -i ~/.ssh/LightsailDefaultKeyPair.pem ubuntu@18.142.14.142 'pm2 list'
```

> **Full deployment steps, OOM prevention, nginx config, swap setup:** `.claude/skills/lightsail-deployment/SKILL.md`

---

## 💾 **STORAGE SYSTEM GUIDE**

### **Storage Architecture Overview**

The PelangiManager system supports multiple storage backends with automatic fallback:

```
Storage Factory
├── In-Memory Storage (Development)
├── PostgreSQL Storage (Production)
└── Hybrid Storage (Mixed mode)
```

### **In-Memory Storage (MemStorage)**

#### **Use Cases**
- **Development Environment**: Fast iteration and testing
- **Demo Purposes**: Quick demonstrations without database setup
- **Testing**: Unit and integration testing

#### **Configuration**
```bash
# No environment variables needed
# System automatically uses in-memory storage
npm run dev
```

#### **Features**
- **Instant Startup**: No database connection required
- **Fast Operations**: All data in memory
- **Automatic Initialization**: Sample data loaded on startup
- **No Persistence**: Data lost on server restart

#### **Limitations**
- **No Data Persistence**: All data lost on restart
- **Memory Usage**: Large datasets consume RAM
- **No Multi-Instance**: Single server instance only
- **No Backup**: No data recovery options

### **PostgreSQL Storage (DatabaseStorage)**

#### **Use Cases**
- **Production Environment**: Persistent data storage
- **Multi-Instance**: Multiple server instances
- **Data Backup**: Regular backup and recovery
- **Scalability**: Handle large datasets

#### **Configuration**
```bash
# Set database connection string
DATABASE_URL=postgresql://username:password@host:port/database

# Start server
npm run dev
```

#### **Features**
- **Data Persistence**: All data saved to database
- **ACID Compliance**: Transaction support
- **Backup & Recovery**: Database backup capabilities
- **Multi-Instance**: Multiple server instances
- **Data Migration**: Schema evolution support

#### **Setup Requirements**
- **PostgreSQL Server**: Version 12+ recommended
- **Database Creation**: Create database before first run
- **User Permissions**: Proper database user with permissions
- **Connection Pooling**: Configure connection limits

### **Storage Factory Pattern**

#### **Automatic Selection**
```typescript
// StorageFactory automatically selects storage type
const storage = StorageFactory.create();

// Selection logic:
if (process.env.DATABASE_URL) {
  return new DatabaseStorage();
} else {
  return new MemStorage();
}
```

#### **Fallback Strategy**
1. **Primary**: Check for DATABASE_URL environment variable
2. **Fallback**: Use in-memory storage if no database connection
3. **Validation**: Verify storage initialization success
4. **Error Handling**: Graceful degradation on failures

### **Data Migration & Schema Evolution**

#### **Drizzle Migrations**
```bash
# Generate new migration
npm run db:generate

# Apply migrations
npm run db:push

# Reset database
npm run db:reset
```

#### **Migration Files**
- **Location**: `migrations/` directory
- **Format**: SQL files with versioning
- **Naming**: Timestamp-based naming convention
- **Rollback**: Support for migration rollback

---

## 📧 **EMAIL SETUP GUIDE**

### **SendGrid Configuration**

#### **Setup Steps**
1. **Create SendGrid Account**
   - Visit [SendGrid](https://sendgrid.com)
   - Sign up for free account
   - Verify your domain

2. **Generate API Key**
   ```bash
   # In SendGrid dashboard
   Settings > API Keys > Create API Key
   # Select "Full Access" or "Restricted Access"
   ```

3. **Configure Environment Variables**
   ```bash
   SENDGRID_API_KEY=your_api_key_here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=Pelangi Hostel
   ```

4. **Verify Sender Identity**
   - Add domain to SendGrid
   - Verify domain ownership
   - Set up SPF and DKIM records

#### **Email Templates**

#### **Welcome Email**
```typescript
const welcomeEmail = {
  subject: "Welcome to Pelangi Capsule Hostel!",
  template: "welcome-email",
  variables: {
    guestName: guest.name,
    checkInDate: guest.checkInDate,
    capsuleId: guest.capsuleId
  }
};
```

#### **Check-out Reminder**
```typescript
const checkoutReminder = {
  subject: "Check-out Reminder",
  template: "checkout-reminder",
  variables: {
    guestName: guest.name,
    checkOutTime: "11:00 AM",
    hostelName: "Pelangi Capsule Hostel"
  }
};
```

#### **Payment Confirmation**
```typescript
const paymentConfirmation = {
  subject: "Payment Received",
  template: "payment-confirmation",
  variables: {
    guestName: guest.name,
    amount: guest.paymentAmount,
    currency: "RM",
    paymentMethod: guest.paymentMethod
  }
};
```

### **Email Configuration**

#### **SMTP Settings (Alternative to SendGrid)**
```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

#### **Email Validation**
- **Format Validation**: Check email format before sending
- **Domain Validation**: Verify sender domain authenticity
- **Bounce Handling**: Track and handle email bounces
- **Spam Prevention**: Follow email best practices

---

## 🚀 **PERFORMANCE OPTIMIZATION**

### **Frontend Performance**

#### **Code Splitting Strategy**
```typescript
// Lazy load heavy components
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// Use Suspense for loading states
<Suspense fallback={<Skeleton />}>
  <HeavyComponent />
</Suspense>
```

#### **Image Optimization**
- **WebP Format**: Modern image format with better compression
- **Responsive Images**: Different sizes for different devices
- **Lazy Loading**: Load images only when needed
- **CDN Integration**: Use CDN for static assets

#### **Bundle Optimization**
```typescript
// Vite configuration for optimal builds
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
});
```

### **Backend Performance**

#### **Database Optimization**
```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_guests_checkin_date ON guests(check_in_date);
CREATE INDEX idx_capsules_status ON capsules(status);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Use efficient queries
SELECT * FROM guests WHERE check_in_date >= CURRENT_DATE;
-- Instead of
SELECT * FROM guests WHERE DATE(check_in_date) = CURRENT_DATE;
```

#### **Caching Strategy**
```typescript
// In-memory caching for frequently accessed data
const cache = new Map();

const getCachedData = async (key: string) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fetchData(key);
  cache.set(key, data);
  return data;
};
```

#### **Connection Pooling**
```typescript
// Database connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### **Monitoring & Metrics**

#### **Performance Monitoring**
- **Response Times**: Track API endpoint performance
- **Memory Usage**: Monitor server memory consumption
- **Database Queries**: Analyze query performance
- **Error Rates**: Track system error frequency

#### **User Experience Metrics**
- **Page Load Times**: Measure frontend performance
- **Time to Interactive**: Track when page becomes usable
- **First Contentful Paint**: Measure visual loading
- **Largest Contentful Paint**: Track main content loading

---

## 🔧 **MAINTENANCE & OPERATIONS**

### **Regular Maintenance Tasks**

#### **Daily Tasks**
- **System Health Check**: Verify all services are running
- **Error Log Review**: Check for new error patterns
- **Performance Monitoring**: Monitor response times and resource usage
- **Backup Verification**: Ensure backups are completing successfully

#### **Weekly Tasks**
- **Database Maintenance**: Run database optimization queries
- **Log Rotation**: Archive old log files
- **Security Updates**: Check for security patches
- **Performance Analysis**: Review performance trends

#### **Monthly Tasks**
- **Full System Backup**: Complete system backup
- **Security Audit**: Review access logs and permissions
- **Performance Review**: Analyze monthly performance metrics
- **Capacity Planning**: Review resource usage trends

### **Backup & Recovery**

#### **Database Backup**
```bash
# PostgreSQL backup
pg_dump -h localhost -U username -d pelangi > backup_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U username -d pelangi > "backup_$DATE.sql"
gzip "backup_$DATE.sql"
aws s3 cp "backup_$DATE.sql.gz" s3://backup-bucket/
```

#### **File Backup**
```bash
# Uploads directory backup
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
aws s3 cp uploads_backup_$(date +%Y%m%d).tar.gz s3://backup-bucket/
```

#### **Recovery Procedures**
1. **Database Recovery**
   ```bash
   # Restore from backup
   psql -h localhost -U username -d pelangi < backup_file.sql
   ```

2. **File Recovery**
   ```bash
   # Restore uploads
   tar -xzf uploads_backup_file.tar.gz
   ```

3. **System Recovery**
   - Stop all services
   - Restore database and files
   - Verify data integrity
   - Restart services

### **Monitoring & Alerting**

#### **System Monitoring**
- **Server Health**: CPU, memory, disk usage
- **Application Health**: Response times, error rates
- **Database Health**: Connection count, query performance
- **Network Health**: Latency, bandwidth usage

#### **Alert Configuration**
```typescript
// Example alert configuration
const alerts = {
  highCpu: { threshold: 80, action: 'email' },
  highMemory: { threshold: 85, action: 'sms' },
  highErrorRate: { threshold: 5, action: 'pager' },
  slowResponse: { threshold: 2000, action: 'email' }
};
```

---

## 🚨 **EMERGENCY PROCEDURES**

### **System Outage Response**

#### **Immediate Actions**
1. **Assess Impact**: Determine scope of outage
2. **Notify Stakeholders**: Alert management and users
3. **Implement Workarounds**: Use backup systems if available
4. **Document Incident**: Record what happened and when

#### **Recovery Steps**
1. **Identify Root Cause**: Analyze logs and error messages
2. **Implement Fix**: Apply necessary patches or configuration changes
3. **Verify Recovery**: Test system functionality
4. **Post-Incident Review**: Document lessons learned

### **Data Loss Recovery**

#### **Assessment**
- **Data Type**: Determine what data was lost
- **Recovery Point**: Identify last known good backup
- **Impact Analysis**: Assess business impact

#### **Recovery Process**
1. **Stop Data Changes**: Prevent further data loss
2. **Restore from Backup**: Use most recent backup
3. **Verify Integrity**: Check data consistency
4. **Resume Operations**: Gradually restore services

---

**Document Control:**
- **Maintained By:** Operations Team
- **Last Updated:** January 2025
- **Next Review:** When deployment processes change

*This guide provides comprehensive deployment and operations information for the PelangiManager system.*
