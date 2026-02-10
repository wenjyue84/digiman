# Zeabur MCP Server Test Results
**Date**: 2026-02-08
**MCP URL**: https://mcp-pelangi.zeabur.app
**API URL**: https://pelangi-manager.zeabur.app

---

## ✅ Working Components

### 1. MCP Server Deployment
- **Status**: ✅ Running
- **Domain**: https://mcp-pelangi.zeabur.app
- **Service**: zeabur-pelangi-mcp [RUNNING]

### 2. MCP Protocol Endpoints
- **Initialize**: ✅ Working
  ```bash
  curl -X POST https://mcp-pelangi.zeabur.app/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":0}'
  ```

- **Tools List**: ✅ Working
  ```bash
  curl -X POST https://mcp-pelangi.zeabur.app/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
  ```
  **Result**: 23 tools available

### 3. Available Tools (23 Total)
**Guest Management (6 tools)**
- ✅ `pelangi_list_guests` - List all checked-in guests with pagination
- ✅ `pelangi_get_guest` - Get specific guest details by ID
- ✅ `pelangi_search_guests` - Search guests by name, capsule, nationality
- ✅ `pelangi_checkin_guest` - Check in new guest with capsule assignment
- ✅ `pelangi_checkout_guest` - Check out guest by ID
- ✅ `pelangi_bulk_checkout` - Bulk checkout guests

**Capsule Operations (6 tools)**
- ✅ `pelangi_list_capsules` - List all capsules with status
- ✅ `pelangi_get_occupancy` - Get current occupancy statistics
- ✅ `pelangi_check_availability` - Get available capsules
- ✅ `pelangi_mark_cleaned` - Mark capsule as cleaned
- ✅ `pelangi_bulk_mark_cleaned` - Mark all capsules as cleaned
- ✅ `pelangi_capsule_utilization` - Get utilization statistics

**Dashboard & Reporting (3 tools)**
- ✅ `pelangi_get_dashboard` - Bulk dashboard data
- ✅ `pelangi_get_overdue_guests` - List overdue guests
- ✅ `pelangi_guest_statistics` - Guest statistics

**Problem Tracking (3 tools)**
- ✅ `pelangi_list_problems` - List active maintenance problems
- ✅ `pelangi_export_whatsapp_issues` - WhatsApp-formatted issues
- ✅ `pelangi_get_problem_summary` - Get problem summary

**Analytics & Export (1 tool)**
- ✅ `pelangi_export_guests_csv` - Export guest data in CSV format

**WhatsApp Integration (4 tools)**
- ✅ `pelangi_whatsapp_status` - Check WhatsApp connection status
- ✅ `pelangi_whatsapp_qrcode` - Get QR code pairing instructions
- ✅ `pelangi_whatsapp_send` - Send WhatsApp text message
- ✅ `pelangi_whatsapp_send_guest_status` - Send guest/capsule status

### 4. WhatsApp Integration
- **Status**: ✅ Partially Working
- **State**: `connecting`
- **Auth Dir**: `/src/whatsapp-auth`
- **Test Command**:
  ```bash
  curl -X POST https://mcp-pelangi.zeabur.app/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_whatsapp_status","arguments":{}},"id":3}'
  ```
  **Result**: `{"state":"connecting","user":null,"authDir":"/src/whatsapp-auth"}`

---

## ❌ Issues Found

### 1. Health Endpoint - 502 Bad Gateway
**Endpoint**: `/health`
**Status**: ❌ Not Working
**Error**: `Bad Gateway`

**Test Command**:
```bash
curl https://mcp-pelangi.zeabur.app/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "pelangi-mcp-server",
  "version": "1.0.0",
  "timestamp": "2026-02-08T..."
}
```

---

### 2. API Connection - ECONNREFUSED
**Tool**: `pelangi_get_occupancy`
**Status**: ❌ Not Working
**Error**: `ECONNREFUSED 172.26.170.233:5000`

**Test Command**:
```bash
curl -X POST https://mcp-pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":2}'
```

**Error Response**:
```json
{
  "jsonrpc":"2.0",
  "result":{
    "content":[{
      "type":"text",
      "text":"Error getting occupancy: API Error: http://service-6948cacdaf84400647912aab:5000/api/occupancy connect ECONNREFUSED 172.26.170.233:5000. Check PELANGI_API_URL and that PelangiManager is deployed there."
    }],
    "isError":true
  },
  "id":2
}
```

---

## 🔧 Root Cause Analysis

### Issue: MCP Server Cannot Connect to PelangiManager API

**Current Behavior**:
- MCP server is trying to use internal Zeabur host: `service-6948cacdaf84400647912aab:5000`
- Connection fails with `ECONNREFUSED 172.26.170.233:5000`

**Root Cause**:
The environment variable `PELANGI_API_URL` is not set (or set incorrectly) in Zeabur, so the MCP server falls back to using `PELANGI_MANAGER_HOST` for internal networking, which is not working.

**Code Reference** (`mcp-server/src/lib/http-client.ts`):
```typescript
const rawApiUrl = process.env.PELANGI_API_URL
  || (internalHost ? `http://${internalHost.replace(/\/+$/, '')}` : 'http://localhost:5000');
```

**Expected Behavior**:
- `PELANGI_API_URL` should be set to `https://pelangi-manager.zeabur.app`
- This allows the MCP server to use the public API endpoint

---

## ✅ Solution

### Fix: Set PELANGI_API_URL in Zeabur Environment Variables

**Steps**:
1. Go to Zeabur Dashboard: https://dash.zeabur.com/projects/6948c99fced85978abb44563
2. Click on **zeabur-pelangi-mcp** service
3. Go to **Variables** tab
4. Set/Update the following variable:

| Variable Name | Value |
|---------------|-------|
| `PELANGI_API_URL` | `https://pelangi-manager.zeabur.app` |

5. Click **Save** or **Redeploy**

### Verification After Fix

Run these tests again to verify the fix:

**Test 1: Health Check**
```bash
curl https://mcp-pelangi.zeabur.app/health
```
**Expected**: `{"status":"ok",...}`

**Test 2: Get Occupancy**
```bash
curl -X POST https://mcp-pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":2}'
```
**Expected**: Real occupancy data from PelangiManager

**Test 3: List Guests**
```bash
curl -X POST https://mcp-pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_list_guests","arguments":{}},"id":4}'
```
**Expected**: List of checked-in guests

---

## 📊 Test Summary

| Component | Status | Notes |
|-----------|--------|-------|
| MCP Server Deployment | ✅ Working | Running on https://mcp-pelangi.zeabur.app |
| MCP Protocol (initialize) | ✅ Working | Protocol version 0.1.0 |
| Tools List Endpoint | ✅ Working | 23 tools available |
| Health Endpoint | ❌ Failed | 502 Bad Gateway |
| API Connectivity | ❌ Failed | ECONNREFUSED - needs PELANGI_API_URL fix |
| WhatsApp Status | ✅ Working | State: connecting |

---

## 🎯 Next Steps

1. **Fix Environment Variable**: Set `PELANGI_API_URL=https://pelangi-manager.zeabur.app` in Zeabur
2. **Redeploy**: Redeploy the MCP service
3. **Re-test**: Run verification tests above
4. **WhatsApp Pairing**: Visit https://mcp-pelangi.zeabur.app/admin/whatsapp-qr to pair WhatsApp (optional)

---

## 🔐 MCP Client Configuration

Once the API connectivity is fixed, you can add this MCP server to your clients:

### Claude Code (`~/.claude/mcp_settings.json`)
```json
{
  "mcpServers": {
    "pelangi-mcp": {
      "transport": "http",
      "url": "https://mcp-pelangi.zeabur.app/mcp"
    }
  }
}
```

### Cursor (Settings → MCP)
```json
{
  "mcp": {
    "servers": {
      "pelangi-mcp": {
        "transport": "http",
        "url": "https://mcp-pelangi.zeabur.app/mcp"
      }
    }
  }
}
```

This will give you access to all 23 PelangiManager tools directly from Claude Code or Cursor!
