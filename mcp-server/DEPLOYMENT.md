# Pelangi MCP Server - Deployment Guide

## Zeabur Deployment

### Prerequisites

- Zeabur account with project access
- Admin API token from PelangiManager (Settings > Security > API Tokens)
- Git repository pushed to GitHub

### Step 1: Get Admin API Token

1. Open PelangiManager: `https://pelangi.zeabur.app`
2. Go to **Settings > Security > API Tokens**
3. Generate and copy the admin token

### Step 2: Create Zeabur Service

1. Go to `https://dash.zeabur.com`
2. Open your project (e.g., `pelangi-hostel`)
3. Click **Add Service > Git Repository**
4. Select the repository and set **Root Directory** to `mcp-server`

### Step 3: Set Environment Variables

In the Zeabur service's **Variable** tab:

| Variable | Value |
|----------|-------|
| `PELANGI_API_URL` | `https://pelangi.zeabur.app` |
| `PELANGI_API_TOKEN` | `<your-admin-token>` |
| `MCP_SERVER_PORT` | `3001` |
| `NODE_ENV` | `production` |
| `NVIDIA_API_KEY` | `<optional: for Kimi K2.5>` |
| `OPENROUTER_API_KEY` | `<optional: for free models>` |

### Step 4: Build Configuration

Zeabur auto-detects Node.js. Verify:

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Port**: 3001

### Step 5: Assign Domain

1. In the service settings, go to **Domains**
2. Add custom domain: `mcp-pelangi.zeabur.app` (or your preferred subdomain)

### Step 6: Verify

```bash
# Health check
curl https://mcp-pelangi.zeabur.app/health

# List tools
curl -X POST https://mcp-pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Test a tool
curl -X POST https://mcp-pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":2}'
```

## Docker Deployment (Alternative)

```bash
cd mcp-server
docker build -t pelangi-mcp .
docker run -p 3001:3001 \
  -e PELANGI_API_URL=https://pelangi.zeabur.app \
  -e PELANGI_API_TOKEN=your-token \
  -e NODE_ENV=production \
  pelangi-mcp
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 500 on tool calls | Check `PELANGI_API_TOKEN` is valid |
| Connection refused | Verify server is running, port not blocked |
| Empty data returned | Check PelangiManager DB has data |
| Build fails | Ensure `@rollup/rollup-linux-x64-musl` in `optionalDependencies` |
| 502 despite RUNNING | Check Zeabur forum for platform outages |

## Zeabur Project IDs

| Region | Project ID |
|--------|-----------|
| Singapore | `6948c99fced85978abb44563` |
| Frankfurt | `6988ba46ea91e8e06ef1420c` |

## Deploy Checklist

- [ ] Code committed and pushed
- [ ] Environment variables set in Zeabur
- [ ] Domain assigned
- [ ] Health check returns 200
- [ ] Tools/list returns all tools
- [ ] At least one tool call succeeds with real data
- [ ] MCP client (Claude Code/Cursor) can connect
