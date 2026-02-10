# ✅ Zeabur MCP Server Deployment - Final Checklist

## Current Status

✅ **Code Ready**: All files committed (commit 4826331)
✅ **GitHub**: Pushed to https://github.com/wenjyue84/PelangiManager-Zeabur
✅ **Fixes Applied**: Node version, runtime config, engine constraints
✅ **Documentation**: Complete deployment guides available

---

## 🎯 What You Need to Do in Zeabur Dashboard

### Prerequisites
- ✅ Zeabur account (you have this)
- ✅ GitHub repo access (you have this)
- ✅ Project "pelangi-hostel" exists (ID: 6948c99fced85978abb44563)

---

## Step-by-Step Deployment

### 1️⃣ Go to Zeabur Dashboard
🔗 https://dash.zeabur.com/projects/6948c99fced85978abb44563

### 2️⃣ Create or Fix Service

**Option A: If MCP service already exists (failed build)**
- [ ] Click on the failed service
- [ ] Go to **Settings** tab
- [ ] Find **"Root Directory"** or **"Base Directory"**
- [ ] Ensure it says: **`mcp-server`** (not empty, not `/`, not `./mcp-server`)
- [ ] Save settings
- [ ] Click **"Redeploy"** button

**Option B: If no MCP service exists yet**
- [ ] Click **"Add Service"** button
- [ ] Select **"Git Service"** or **"Deploy from GitHub"**
- [ ] Choose repository: **wenjyue84/PelangiManager-Zeabur**
- [ ] Branch: **main**
- [ ] ⚠️ **CRITICAL**: Set **Root Directory** to **`mcp-server`**
- [ ] Service name: **pelangi-mcp-server** (or auto-generated)

### 3️⃣ Set Environment Variables

Click **"Variables"** or **"Environment"** tab and add these 4 variables:

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `PELANGI_API_URL` | `https://pelangi.zeabur.app` | Backend API endpoint |
| `PELANGI_API_TOKEN` | `a30d5306-4e68-49db-9224-bb43c836fe12` | Admin auth token |
| `MCP_SERVER_PORT` | `3001` | Server port |
| `NODE_ENV` | `production` | Runtime environment |

**How to add**:
- [ ] Click **"Add Variable"** or **"+"**
- [ ] Enter key: `PELANGI_API_URL`
- [ ] Enter value: `https://pelangi.zeabur.app`
- [ ] Click **"Save"** or confirm
- [ ] Repeat for all 4 variables

### 4️⃣ Configure Domain

- [ ] Go to **"Domains"** or **"Networking"** tab
- [ ] Click **"Generate Domain"** or **"Add Domain"**
- [ ] Suggested name: **`mcp-pelangi`** or **`pelangi-mcp`**
- [ ] Your URL will be: `https://mcp-pelangi.zeabur.app` (or similar)
- [ ] **Note down this URL** - you'll need it for MCP clients

### 5️⃣ Deploy

- [ ] Click **"Deploy"** button (if not auto-deployed)
- [ ] Wait for build to start (watch logs)
- [ ] Build should take 1-3 minutes
- [ ] Wait for status to show **"Running"** or **"Active"** (green indicator)

---

## 🧪 Verification Tests

Once status shows "Running", run these tests:

### Test 1: Health Check
```bash
curl https://YOUR-DOMAIN.zeabur.app/health
```

**Expected**:
```json
{
  "status": "ok",
  "service": "pelangi-mcp-server",
  "version": "1.0.0",
  "timestamp": "2026-01-29T..."
}
```

### Test 2: MCP Initialize
```bash
curl -X POST https://YOUR-DOMAIN.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":0}'
```

**Expected**: Should return protocol version and server info

### Test 3: Tool Count
```bash
curl -X POST https://YOUR-DOMAIN.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq '.result.tools | length'
```

**Expected**: `19`

### Test 4: Call a Tool
```bash
curl -X POST https://YOUR-DOMAIN.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":2}'
```

**Expected**: Should return occupancy data from your hostel

---

## 📋 Build Settings (Auto-Detected by Zeabur)

Zeabur should automatically detect these from your files:

| Setting | Value | Detected From |
|---------|-------|---------------|
| Framework | Node.js | `package.json` |
| Node Version | 20 | `.node-version` |
| Build Command | `npm install && npm run build` | `.zeabur.yaml` |
| Start Command | `npm start` | `.zeabur.yaml` |
| Port | 3001 | Environment variable |

**You don't need to manually configure these** - they're in your code files.

---

## ❌ Common Issues & Quick Fixes

### Issue: Build fails with "Cannot find module"
**Cause**: Root directory not set to `mcp-server`
**Fix**: Go to Settings → Set Root Directory to `mcp-server` → Redeploy

### Issue: "npm ERR! code ENOENT" or "package.json not found"
**Cause**: Root directory not set correctly
**Fix**: Verify Root Directory = `mcp-server` exactly (case-sensitive)

### Issue: Build succeeds but service won't start
**Cause**: Missing environment variables
**Fix**: Check all 4 environment variables are set correctly

### Issue: Health check returns 404 Not Found
**Cause**: Service still starting or crashed
**Fix**:
1. Wait 30 seconds and retry
2. Check runtime logs for errors
3. Verify `MCP_SERVER_PORT=3001` is set

### Issue: Tools return "No token provided"
**Cause**: `PELANGI_API_TOKEN` not set or incorrect
**Fix**: Verify token value is exactly: `a30d5306-4e68-49db-9224-bb43c836fe12`

---

## 🎯 Success Criteria

Deployment is successful when ALL checkboxes are ✅:

- [ ] Service status shows **"Running"** (green)
- [ ] Health check returns `{"status":"ok"}`
- [ ] MCP initialize returns protocol version
- [ ] Tools list shows **19 tools**
- [ ] Sample tool call returns real data
- [ ] No errors in runtime logs
- [ ] Domain is accessible from browser

---

## 📝 After Successful Deployment

### Save Your Deployment Info

**MCP Server URL**: `https://YOUR-DOMAIN.zeabur.app/mcp`

Replace `YOUR-DOMAIN` with your actual Zeabur domain in all client configurations.

### Configure MCP Clients

Use the prompts from these files:

1. **Quick Reference**: `mcp-server/CLIENT-PROMPTS.txt`
2. **Detailed Guide**: `mcp-server/MCP-CLIENT-CONFIGS.md`
3. **Ready to Deploy**: `mcp-server/READY-TO-DEPLOY.md`

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

**For Clawdbot/Antigravity**:
```
Add MCP server:
- Name: pelangi-mcp
- Type: HTTP
- URL: https://YOUR-DOMAIN.zeabur.app/mcp

This provides 19 tools for hostel management.
```

---

## 🔐 Security Notes

- **API Token**: The token `a30d5306-4e68-49db-9224-bb43c836fe12` is your admin token
- This gives **full access** to PelangiManager (guests, capsules, settings)
- The MCP server uses this token server-side (clients don't need it)
- **Rotate monthly** for security

---

## 📊 What You Get

### 19 Tools Total

**Guest Management (6 tools)**
- Check-in, checkout, search, list, bulk operations, statistics

**Capsule Operations (7 tools)**
- Status, occupancy, availability, cleaning, utilization, dashboard

**Problem Tracking (3 tools)**
- List, summary, WhatsApp export

**Analytics (3 tools)**
- Overdue guests, statistics, CSV export

---

## 🆘 Still Stuck?

If deployment keeps failing:

1. **Share the error logs**: Copy build logs from Zeabur and share them
2. **Screenshot**: Take screenshot of the error and send it
3. **Try manual verification**:
   ```bash
   # Clone and test locally
   git clone https://github.com/wenjyue84/PelangiManager-Zeabur.git
   cd PelangiManager-Zeabur/mcp-server
   npm install
   npm run build
   # If this works, issue is Zeabur-specific
   ```

---

## ✨ Quick Summary

**What you need to do in Zeabur dashboard:**

1. ✅ Set Root Directory = `mcp-server`
2. ✅ Add 4 environment variables
3. ✅ Generate domain
4. ✅ Deploy
5. ✅ Verify with health check

**That's it!** The code is ready, committed, and pushed. Just configure it in Zeabur dashboard.

---

**Repository**: https://github.com/wenjyue84/PelangiManager-Zeabur
**Latest Commit**: 4826331 (includes all fixes)
**Project ID**: 6948c99fced85978abb44563
**Dashboard**: https://dash.zeabur.com/projects/6948c99fced85978abb44563
