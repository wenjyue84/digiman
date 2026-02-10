# MCP Problems Feature Status Report

**Date**: 2026-02-08
**Issue**: Can the MCP list problems of the capsules?

---

## ✅ What's Available

The MCP server has **3 problem tracking tools**:

| Tool Name | Description |
|-----------|-------------|
| `pelangi_list_problems` | List all active maintenance problems with pagination |
| `pelangi_get_problem_summary` | Get summary statistics of active and resolved problems |
| `pelangi_export_whatsapp_issues` | Export maintenance issues in WhatsApp-friendly format |

---

## ❌ Current Issue

### Problem: Authentication Required

All problem endpoints require authentication (session token), but there are authentication issues:

**Test Result**:
```bash
curl -X POST https://mcp-pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_list_problems","arguments":{"activeOnly":true}},"id":1}'
```

**Error**:
```json
{
  "error": "Invalid or expired token (401 Unauthorized)"
}
```

---

## 🔍 Root Cause Analysis

### Authentication Flow

1. **PelangiManager API** uses session-based authentication
2. **Valid token** must be obtained by logging in first
3. **Token stored** in database sessions table
4. **Token expires** after configured TTL (Time To Live)

### Code Reference

From `server/routes/middleware/auth.ts`:
```typescript
export const authenticateToken = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const session = await storage.getSessionByToken(token);
  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  // ...
}
```

### Default Credentials

From `server/index.ts`:
```typescript
await ensureAdminUser("admin", "admin123");
```

**Admin Credentials**:
- Username: `admin`
- Password: `admin123`

---

## 🔧 What Needs to be Fixed

### Issue 1: PelangiManager API Login Endpoint

**Current Status**: Returns 502 Bad Gateway

```bash
curl -X POST https://pelangi-manager.zeabur.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admin123"}'
```

**Result**: `Bad Gateway`

**Expected**:
```json
{
  "token": "uuid-session-token",
  "user": { "id": 1, "email": "admin", "role": "admin" }
}
```

### Issue 2: MCP Server Token Configuration

**Current Environment Variables**:
- ✅ `PELANGI_API_URL` = `https://pelangi-manager.zeabur.app`
- ✅ `PELANGI_API_TOKEN` = `a30d5306-4e68-49db-9224-bb43c836fe12`

**Problem**: The token is not a valid session token - it's a hardcoded UUID that doesn't exist in the database.

---

## 🎯 Solutions

### Option 1: Fix PelangiManager API (Recommended)

The main PelangiManager app needs to be restarted or debugged:

```bash
# Check service status
zeabur service list

# Check runtime logs
zeabur service logs --id <pelangi-manager-service-id>

# Restart service
zeabur service restart --id <pelangi-manager-service-id>
```

Once the API is working:
1. Login to get a valid session token
2. Update `PELANGI_API_TOKEN` in MCP server
3. Restart MCP server

### Option 2: Create Public API Endpoints

Modify `server/routes/problems.ts` to add public endpoints:

```typescript
// Public endpoint - no auth required
router.get("/public/active", async (req, res) => {
  try {
    const problems = await storage.getActiveProblems({ page: 1, limit: 100 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch problems" });
  }
});
```

**Pros**: Simple, works immediately
**Cons**: Security risk - exposes data publicly

### Option 3: Implement Token-Based Authentication

Add API key authentication alongside session authentication:

```typescript
// In auth middleware
if (token === process.env.API_KEY) {
  // Create dummy admin user for API key auth
  req.user = { id: 0, username: 'api', role: 'admin' };
  return next();
}
```

**Pros**: Secure, works for MCP server
**Cons**: Requires code changes

---

## 📊 Summary

| Feature | Status | Blocker |
|---------|--------|---------|
| MCP Tools Available | ✅ Yes (3 tools) | None |
| Problem Endpoints | ✅ Exist | None |
| Authentication | ❌ Not Working | PelangiManager API down |
| Login Endpoint | ❌ 502 Error | Service issue |
| MCP Token | ❌ Invalid | Not a valid session token |

---

## 🚀 Immediate Next Steps

### Step 1: Check PelangiManager Service

```bash
# Get service ID
zeabur service list --project-id 6948c99fced85978abb44563

# Check status and logs
zeabur service logs --id <service-id> --tail 100
```

### Step 2: Restart PelangiManager

```bash
zeabur service restart --id <service-id>
```

### Step 3: Test Login Endpoint

```bash
curl -X POST https://pelangi-manager.zeabur.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admin123"}'
```

### Step 4: Update MCP Token

Once you get a valid token from Step 3:

```bash
zeabur variable update --id 697adbcaf2339c9e766cdb63 \
  -k PELANGI_API_TOKEN=<new-valid-token>

zeabur service restart --id 697adbcaf2339c9e766cdb63
```

---

## 📝 Alternative: Use Direct API Calls

While the MCP server is being fixed, you can access problems directly:

```bash
# 1. Login first
TOKEN=$(curl -s -X POST https://pelangi-manager.zeabur.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admin123"}' | jq -r '.token')

# 2. List problems
curl -s https://pelangi-manager.zeabur.app/api/problems/active \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ When It's Fixed

Once authentication is working, you'll be able to use these MCP tools:

```typescript
// List all active problems
{
  "name": "pelangi_list_problems",
  "arguments": { "activeOnly": true }
}

// Get problem summary
{
  "name": "pelangi_get_problem_summary",
  "arguments": {}
}

// Export for WhatsApp
{
  "name": "pelangi_export_whatsapp_issues",
  "arguments": {}
}
```

Expected response:
```json
{
  "data": [
    {
      "id": "1",
      "capsuleNumber": 15,
      "description": "AC not working",
      "severity": "high",
      "reportedBy": "Jay",
      "reportedAt": "2026-02-08T10:00:00Z",
      "isResolved": false
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```
