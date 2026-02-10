# Comprehensive Zeabur Deployment Prompt for AI Assistant

**OBJECTIVE**: Deploy the PelangiManager MCP Server to Zeabur cloud hosting platform with complete configuration.

---

## 🎯 Task Overview

I need you to help me deploy an MCP (Model Context Protocol) server to Zeabur. This server provides 19 tools for managing a hostel/capsule hotel business through AI assistants.

**Repository**: https://github.com/wenjyue84/PelangiManager-Zeabur
**Target Directory**: `mcp-server` (subdirectory of the repo)
**Platform**: Zeabur (https://zeabur.com)
**My Zeabur Account**: Already logged in at https://dash.zeabur.com

---

## 📋 Step-by-Step Instructions

### Step 1: Navigate to Zeabur Dashboard
- Go to: https://dash.zeabur.com
- I'm already logged in
- Select my existing project: **"pelangi-hostel"** (Project ID: `6948c99fced85978abb44563`)
- If project doesn't exist, create new project named "pelangi-hostel"

### Step 2: Create New Service
Click **"Add Service"** or **"New Service"** button, then:

1. **Service Type**: Select **"Git Service"** or **"Deploy from GitHub"**
2. **Repository Selection**:
   - Provider: GitHub
   - Repository: `wenjyue84/PelangiManager-Zeabur`
   - Branch: `main`
3. **⚠️ CRITICAL SETTING - Root Directory**:
   - Find the "Root Directory" or "Base Directory" field
   - Set it to: `mcp-server`
   - This is REQUIRED because the MCP server code is in a subdirectory
4. **Service Name**: `pelangi-mcp-server` (or auto-generated is fine)

### Step 3: Configure Build Settings
Zeabur should auto-detect Node.js. Verify these settings:

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start` or `node dist/index.js`
- **Port**: `3001`
- **Framework**: Node.js (auto-detected)

If these fields don't exist, skip this step (Zeabur will auto-detect).

### Step 4: Set Environment Variables
This is CRITICAL. Add exactly 4 environment variables:

| Variable Name | Value |
|---------------|-------|
| `PELANGI_API_URL` | `https://pelangi.zeabur.app` |
| `PELANGI_API_TOKEN` | `a30d5306-4e68-49db-9224-bb43c836fe12` |
| `MCP_SERVER_PORT` | `3001` |
| `NODE_ENV` | `production` |

**How to add variables** (usually):
- Click "Variables" or "Environment Variables" tab
- Click "Add Variable" or "+" button
- Enter key-value pairs exactly as shown above
- Save each variable

**⚠️ IMPORTANT**:
- Copy these values EXACTLY (case-sensitive)
- The `PELANGI_API_TOKEN` is an authentication token - don't modify it
- All 4 variables are required for the server to work

### Step 5: Configure Domain
Find the "Domains" or "Networking" section:

1. Click **"Generate Domain"** or **"Add Domain"**
2. **Suggested domain name**: `mcp-pelangi` or `pelangi-mcp`
   - Final URL will be: `https://mcp-pelangi.zeabur.app`
3. Save the domain configuration

**Note the full domain URL** - you'll need it for MCP client configuration.

### Step 6: Deploy the Service
1. Click **"Deploy"** button (if not auto-deployed)
2. Monitor the **build logs** for any errors
3. Wait for deployment status to show **"Running"** or **"Active"** (green indicator)
4. This typically takes 2-5 minutes

**Watch for**:
- ✅ npm install succeeds
- ✅ TypeScript compilation succeeds (`npm run build`)
- ✅ Server starts successfully
- ❌ If errors occur, check the build logs and report them to me

---

## ✅ Verification Steps

Once the service shows "Running" status, test it:

### Test 1: Health Check
```bash
curl https://YOUR-DOMAIN.zeabur.app/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "pelangi-mcp-server",
  "version": "1.0.0",
  "timestamp": "2026-01-29T..."
}
```

### Test 2: MCP Protocol Initialization
```bash
curl -X POST https://YOUR-DOMAIN.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":0}'
```

**Expected Response**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {}},
    "serverInfo": {"name": "pelangi-manager", "version": "1.0.0"}
  },
  "id": 0
}
```

### Test 3: List All Tools
```bash
curl -X POST https://YOUR-DOMAIN.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

**Expected**: Response should contain 19 tools in `result.tools` array

### Test 4: Call a Tool (Get Occupancy)
```bash
curl -X POST https://YOUR-DOMAIN.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":2}'
```

**Expected**: Should return occupancy statistics (total, occupied, available capsules)

---

## 📊 What This MCP Server Provides

Once deployed, this server exposes **19 tools** for AI assistants:

### Guest Management (6 tools)
- `pelangi_list_guests` - List all checked-in guests
- `pelangi_get_guest` - Get specific guest details
- `pelangi_search_guests` - Search guests by criteria
- `pelangi_checkin_guest` - Check in new guest
- `pelangi_checkout_guest` - Check out guest
- `pelangi_bulk_checkout` - Bulk checkout (overdue/today/all)

### Capsule Operations (7 tools)
- `pelangi_list_capsules` - List all capsules with status
- `pelangi_get_occupancy` - Get occupancy statistics
- `pelangi_check_availability` - Get available capsules
- `pelangi_capsule_utilization` - Utilization analytics
- `pelangi_mark_cleaned` - Mark capsule as cleaned
- `pelangi_bulk_mark_cleaned` - Mark all capsules cleaned
- `pelangi_get_dashboard` - Bulk dashboard data

### Problem Tracking (3 tools)
- `pelangi_list_problems` - List active problems
- `pelangi_get_problem_summary` - Problem summary
- `pelangi_export_whatsapp_issues` - WhatsApp-formatted issues

### Analytics & Reporting (3 tools)
- `pelangi_get_overdue_guests` - List overdue guests
- `pelangi_guest_statistics` - Guest statistics with nationality breakdown
- `pelangi_export_guests_csv` - Export guest data as CSV

---

## 🔧 Troubleshooting Guide

### Issue: Build Fails
**Symptoms**: Build logs show npm install errors or TypeScript compilation errors

**Solutions**:
1. Verify root directory is set to `mcp-server` (not project root)
2. Check that all `package.json` dependencies are accessible
3. Look for specific error messages in build logs

### Issue: Service Won't Start
**Symptoms**: Build succeeds but service crashes or shows "Stopped" status

**Solutions**:
1. Check runtime logs for errors
2. Verify all 4 environment variables are set correctly
3. Ensure `MCP_SERVER_PORT=3001` is set
4. Check that `PELANGI_API_TOKEN` has no extra spaces

### Issue: Health Check Returns 404
**Symptoms**: `curl https://domain/health` returns "Not Found"

**Solutions**:
1. Service may still be starting - wait 30 seconds and retry
2. Check service logs for startup errors
3. Verify domain is correctly configured and active
4. Check that port 3001 is exposed

### Issue: Tools Return "No token provided" Error
**Symptoms**: Health check works, but tool calls fail with authentication errors

**Solutions**:
1. Verify `PELANGI_API_TOKEN` environment variable is set correctly
2. Check that the token value hasn't been truncated
3. Ensure `PELANGI_API_URL=https://pelangi.zeabur.app` is correct
4. Test if PelangiManager API is accessible: `curl https://pelangi.zeabur.app/api/occupancy`

### Issue: Slow or Timeout Responses
**Symptoms**: Requests take >10 seconds or timeout

**Solutions**:
1. Zeabur free tier may have cold starts - first request can be slow
2. Check if service is sleeping (free tier sleeps after inactivity)
3. Consider upgrading Zeabur plan for always-on service
4. Check PelangiManager API response times

---

## 📝 Post-Deployment: MCP Client Configuration

After successful deployment, you'll configure AI clients to use this server.

### Your Deployment URL
Replace `YOUR-DOMAIN` with your actual Zeabur domain in these configs:

**MCP Endpoint**: `https://YOUR-DOMAIN.zeabur.app/mcp`

### Quick Client Configuration Summary

**For Claude Code** (`~/.claude/mcp_settings.json`):
```json
{
  "mcpServers": {
    "pelangi-mcp": {
      "transport": "http",
      "url": "https://YOUR-DOMAIN.zeabur.app/mcp"
    }
  }
}
```

**For Cursor** (Settings → MCP):
```json
{
  "mcp": {
    "servers": {
      "pelangi-mcp": {
        "transport": "http",
        "url": "https://YOUR-DOMAIN.zeabur.app/mcp"
      }
    }
  }
}
```

**For Clawdbot/Antigravity** (send this prompt):
```
Add MCP server:
- Name: pelangi-mcp
- Type: HTTP
- URL: https://YOUR-DOMAIN.zeabur.app/mcp

This provides 19 tools for hostel management (guests, capsules, problems, analytics).
```

Detailed client configuration prompts are in:
- `mcp-server/CLIENT-PROMPTS.txt`
- `mcp-server/MCP-CLIENT-CONFIGS.md`
- `mcp-server/READY-TO-DEPLOY.md`

---

## 🎯 Success Criteria

Deployment is successful when ALL of these are true:

✅ Service status shows "Running" or "Active" (green)
✅ Health endpoint returns `{"status":"ok"}`
✅ MCP initialize returns protocol version "2024-11-05"
✅ Tools/list returns exactly 19 tools
✅ Sample tool call (pelangi_get_occupancy) returns data
✅ No errors in runtime logs
✅ Domain is active and accessible

---

## 📞 What to Report Back to Me

After completing the deployment, please provide:

1. **Deployment Status**: Success or Failed
2. **Domain URL**: The full URL (e.g., `https://mcp-pelangi.zeabur.app`)
3. **Service Status**: Running/Stopped/Error
4. **Test Results**:
   - Health check response
   - Tools count (should be 19)
   - Any errors encountered
5. **Build/Runtime Logs**: If any errors occurred, paste relevant log excerpts

---

## 🔐 Security Notes

- The `PELANGI_API_TOKEN` is a valid admin token for the PelangiManager system
- This token grants full access to guest data, capsules, and system settings
- The MCP server has no additional authentication layer - it uses the backend token
- The server is stateless and makes HTTP calls to the PelangiManager API
- No database connection is required (all data is via API)

---

## 📚 Additional Resources

**Full Documentation**:
- Deployment guide: `mcp-server/ZEABUR-DEPLOYMENT.md`
- Quick checklist: `mcp-server/DEPLOY-CHECKLIST.md`
- Tool documentation: `mcp-server/README.md`
- Phase 2 summary: `mcp-server/PHASE2-SUMMARY.md`

**Repository**: https://github.com/wenjyue84/PelangiManager-Zeabur
**MCP Server Code**: `/mcp-server` directory
**Main Application**: PelangiManager running at https://pelangi.zeabur.app

---

## ⚡ Quick Command Reference

All commands assume `YOUR-DOMAIN` is your Zeabur domain:

```bash
# Health check
curl https://YOUR-DOMAIN.zeabur.app/health

# Initialize MCP
curl -X POST https://YOUR-DOMAIN.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":0}'

# List all tools
curl -X POST https://YOUR-DOMAIN.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq '.result.tools | length'

# Get occupancy (test tool call)
curl -X POST https://YOUR-DOMAIN.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":2}' | jq '.result.content[0].text | fromjson'
```

---

**🚀 Ready to Deploy!**

Please proceed with the deployment following the steps above. The code is fully tested and production-ready. Expected deployment time: 5-10 minutes.
