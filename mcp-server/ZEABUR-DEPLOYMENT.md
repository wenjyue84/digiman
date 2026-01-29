# Zeabur Deployment Guide - Pelangi MCP Server

## Prerequisites

- [x] Code committed to Git repository
- [ ] Zeabur account access
- [ ] Admin API token from PelangiManager

## Step 1: Get Admin API Token

1. Open PelangiManager: https://pelangi.zeabur.app
2. Login with admin credentials
3. Go to **Settings** (⚙️ icon)
4. Navigate to **Security** or **API** section
5. Click **Generate API Token** or **Create Token**
6. Copy the generated token
7. Save it securely - you'll need it for environment variables

**Alternative Method (via API):**
```bash
# Login and get token
curl -X POST https://pelangi.zeabur.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pelangi.com","password":"admin123"}' \
  | jq -r '.token'
```

## Step 2: Create Zeabur Service

### Via Zeabur Dashboard

1. **Login to Zeabur**
   - Go to https://zeabur.com
   - Login with your account

2. **Create New Project** (if needed)
   - Click **New Project**
   - Name: `pelangi-hostel`

3. **Add Service**
   - Click **Add Service**
   - Select **Git Service**
   - Choose your repository
   - **Important:** Set root directory to `mcp-server`

4. **Configure Build**
   - Zeabur should auto-detect Node.js
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Port: `3001`

## Step 3: Set Environment Variables

In Zeabur service settings, add these environment variables:

```bash
PELANGI_API_URL=https://pelangi.zeabur.app
PELANGI_API_TOKEN=<paste-your-token-here>
MCP_SERVER_PORT=3001
NODE_ENV=production
```

**Example:**
```
PELANGI_API_URL=https://pelangi.zeabur.app
PELANGI_API_TOKEN=a30d5306-4e68-49db-9224-bb43c836fe12
MCP_SERVER_PORT=3001
NODE_ENV=production
```

## Step 4: Configure Domain

1. In Zeabur service settings, go to **Domains**
2. Click **Generate Domain** or **Add Custom Domain**
3. Recommended: `mcp-pelangi.zeabur.app` or `pelangi-mcp.zeabur.app`
4. Save and wait for domain to activate (~1-2 minutes)

**Your MCP endpoint will be:**
```
https://mcp-pelangi.zeabur.app/mcp
```

## Step 5: Deploy

1. **Trigger Deployment**
   - Push to main branch (already done ✅)
   - Or click **Redeploy** in Zeabur dashboard

2. **Monitor Build Logs**
   - Watch for errors in build logs
   - Build should complete in 30-60 seconds

3. **Check Deployment Status**
   - Wait for status to show **Running**
   - Green indicator means deployment successful

## Step 6: Verify Deployment

### Test Health Endpoint

```bash
curl https://mcp-pelangi.zeabur.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "pelangi-mcp-server",
  "version": "1.0.0",
  "timestamp": "2026-01-29T..."
}
```

### Test MCP Protocol

```bash
curl -X POST https://mcp-pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":0}'
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": {
      "name": "pelangi-manager",
      "version": "1.0.0"
    }
  },
  "id": 0
}
```

### List All Tools

```bash
curl -X POST https://mcp-pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \
  | jq '.result.tools | length'
```

**Expected Output:** `19`

### Test a Tool

```bash
curl -X POST https://mcp-pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"pelangi_get_occupancy",
      "arguments":{}
    },
    "id":2
  }' | jq '.result.content[0].text | fromjson'
```

**Expected Output:**
```json
{
  "total": 22,
  "occupied": 9,
  "available": 13,
  "occupancyRate": 41
}
```

## Troubleshooting

### Build Fails

**Issue:** `npm install` fails
- Check that `package.json` is in `mcp-server/` directory
- Verify root directory is set to `mcp-server` in Zeabur

**Issue:** TypeScript compilation errors
- Ensure all dependencies are in `package.json`
- Check build logs for specific errors

### Service Won't Start

**Issue:** Port binding error
- Verify `MCP_SERVER_PORT=3001` in environment variables
- Check that port 3001 is not hardcoded differently

**Issue:** Environment variable not set
- Double-check `PELANGI_API_TOKEN` is set correctly
- Verify `PELANGI_API_URL` points to correct PelangiManager instance

### Tools Return Errors

**Issue:** "No token provided" or 401 errors
- Generate new API token from PelangiManager
- Update `PELANGI_API_TOKEN` environment variable
- Redeploy service

**Issue:** "API endpoint not found"
- Verify `PELANGI_API_URL` is correct
- Check PelangiManager is running and accessible
- Test API endpoint directly: `curl https://pelangi.zeabur.app/api/occupancy`

## Post-Deployment

### Update MCP Client Configurations

Once deployed, update your MCP clients with the new URL:

**Replace:**
```
http://localhost:3001/mcp
```

**With:**
```
https://mcp-pelangi.zeabur.app/mcp
```

See `MCP-CLIENT-CONFIGS.md` for specific client configuration instructions.

### Monitor Service

1. **Zeabur Dashboard**
   - Check service status regularly
   - Monitor resource usage (CPU, Memory)
   - Review deployment logs

2. **Health Checks**
   - Set up automated health check pings
   - Monitor `/health` endpoint uptime

3. **Usage Metrics**
   - Track tool usage via logs
   - Monitor API token usage
   - Review error rates

## Scaling Considerations

### Current Limits
- **Concurrent Requests:** Unlimited (HTTP server handles concurrency)
- **Rate Limiting:** Inherits from PelangiManager API
- **Memory:** ~100MB base + request overhead

### If You Need More Performance
1. Enable Zeabur auto-scaling
2. Add caching layer (Redis)
3. Implement direct database access (Phase 3)
4. Deploy multiple instances with load balancing

## Security Notes

### API Token Security
- ✅ Token stored in environment variables (not in code)
- ✅ HTTPS encryption for all requests
- ⚠️ Token has full admin access - protect it

### Recommendations
1. Rotate API token monthly
2. Use separate tokens for different MCP clients (when supported)
3. Monitor token usage for suspicious activity
4. Set up IP allowlisting in PelangiManager (if available)

## Cost Estimation

**Zeabur Pricing (as of 2026):**
- Free tier: Sufficient for testing
- Pro tier (~$5-10/month): Recommended for production
- Enterprise: For high-traffic usage

**Expected Resource Usage:**
- CPU: <5% average
- Memory: ~100-200MB
- Bandwidth: Minimal (API calls are small JSON payloads)

## Deployment Checklist

- [ ] Git repository committed and pushed
- [ ] Admin API token generated from PelangiManager
- [ ] Zeabur service created with root directory set to `mcp-server`
- [ ] Environment variables configured correctly
- [ ] Domain configured and active
- [ ] Build completed successfully
- [ ] Service status shows "Running"
- [ ] Health endpoint returns 200 OK
- [ ] Tools/list returns 19 tools
- [ ] Sample tool call works correctly
- [ ] MCP clients updated with new URL

## Next Steps

1. ✅ Deployment complete
2. Configure MCP clients (see `MCP-CLIENT-CONFIGS.md`)
3. Create n8n workflows
4. Set up WhatsApp integration via Periskope
5. Monitor and optimize

---

**Deployment URL:** https://mcp-pelangi.zeabur.app
**Health Check:** https://mcp-pelangi.zeabur.app/health
**MCP Endpoint:** https://mcp-pelangi.zeabur.app/mcp
