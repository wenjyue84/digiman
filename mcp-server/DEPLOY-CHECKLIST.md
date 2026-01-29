# ✅ Zeabur Deployment Checklist

## Pre-Deployment

- [x] Code committed to Git
- [ ] Admin API token ready

## Zeabur Setup

### 1. Get API Token
```bash
# Login to PelangiManager
# Go to Settings → Security → Generate API Token
# Or use:
curl -X POST https://pelangi.zeabur.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pelangi.com","password":"admin123"}' \
  | jq -r '.token'
```

### 2. Create Zeabur Service
- [ ] Login to https://zeabur.com
- [ ] Create/select project: `pelangi-hostel`
- [ ] Add Git Service
- [ ] **Set root directory:** `mcp-server`
- [ ] Auto-detect: Node.js

### 3. Environment Variables
```bash
PELANGI_API_URL=https://pelangi.zeabur.app
PELANGI_API_TOKEN=<paste-token-here>
MCP_SERVER_PORT=3001
NODE_ENV=production
```

### 4. Domain Configuration
- [ ] Generate domain or add custom
- [ ] Suggested: `mcp-pelangi.zeabur.app`
- [ ] Wait for domain activation (~1-2 min)

### 5. Deploy
- [ ] Push to main branch (done ✅)
- [ ] Watch build logs
- [ ] Wait for "Running" status

## Post-Deployment Verification

### Test Health
```bash
curl https://mcp-pelangi.zeabur.app/health
```
**Expected:** `{"status":"ok",...}`

### Test Tools Count
```bash
curl -X POST https://mcp-pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \
  | jq '.result.tools | length'
```
**Expected:** `19`

### Test Occupancy
```bash
curl -X POST https://mcp-pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":2}' \
  | jq -r '.result.content[0].text | fromjson'
```
**Expected:** Occupancy data

## Configure MCP Clients

Replace `YOUR_DEPLOYED_URL` below with actual URL (e.g., `https://mcp-pelangi.zeabur.app/mcp`)

### Claude Code
```json
{
  "mcpServers": {
    "pelangi-mcp": {
      "transport": "http",
      "url": "YOUR_DEPLOYED_URL"
    }
  }
}
```
**File:** `~/.claude/mcp_settings.json`

### Cursor
```json
{
  "mcp": {
    "servers": {
      "pelangi-mcp": {
        "transport": "http",
        "url": "YOUR_DEPLOYED_URL"
      }
    }
  }
}
```
**Settings → MCP**

### Clawdbot Prompt
```
Configure MCP server:
- Name: pelangi-mcp
- Type: HTTP
- URL: YOUR_DEPLOYED_URL

This provides 19 tools for Pelangi Hostel management.
```

## Final Checks

- [ ] All 3 clients configured
- [ ] Can list tools in each client
- [ ] Can query occupancy
- [ ] Can list guests
- [ ] No authentication errors

## Done! 🎉

**Your MCP Server:**
- URL: `https://mcp-pelangi.zeabur.app/mcp`
- Tools: 19
- Status: ✅ Production Ready

**Next Steps:**
1. Create n8n workflows
2. Set up WhatsApp integration
3. Build automation routines

---

**Quick Reference:**
- Deployment Guide: `ZEABUR-DEPLOYMENT.md`
- Client Configs: `MCP-CLIENT-CONFIGS.md`
- All Tools: `README.md`
