# 🚀 Deploy MCP Server to Frankfurt - Quick Start

## ✅ What's Ready

1. **✅ Code Pushed to GitHub**: All MCP server code is now on GitHub (main branch)
2. **✅ Frankfurt Main App**: Running successfully at https://pelangi-manager-2.zeabur.app
3. **✅ Deployment Scripts**: Ready to use
4. **✅ Configuration Files**: Dockerfile, .zeabur.yaml all configured

## 🎯 Deploy NOW - 2 Options

### Option A: Deploy via Zeabur Dashboard (5 minutes - RECOMMENDED)

**Step 1: Add Service**
1. Go to: https://dash.zeabur.com/projects/6988ba46ea91e8e06ef1420c
2. Click **"Add Service"** → **"Git"**
3. Select: **wenjyue84/PelangiManager-Zeabur**
4. Branch: **main**

**Step 2: Configure Root Directory**
1. After service created, go to **Settings**
2. Set **Root Directory**: `mcp-server`
3. Save

**Step 3: Set Environment Variables**

Go to **Variables** tab, add these (get values from `mcp-server/.env`):

```
PELANGI_API_URL=https://pelangi-manager-2.zeabur.app
PELANGI_API_TOKEN=<from mcp-server/.env>
MCP_SERVER_PORT=3001
NODE_ENV=production
NVIDIA_API_KEY=<from mcp-server/.env>
GROQ_API_KEY=<from mcp-server/.env>
OPENROUTER_API_KEY=<from mcp-server/.env>
```

**Step 4: Deploy**
- Click **"Redeploy"** button
- Wait 2-3 minutes

**Step 5: Test**
```bash
# Get your MCP server domain from Zeabur dashboard
curl https://[your-mcp-domain]/health
```

Expected: `{"status":"ok","service":"pelangi-mcp-server",...}`

---

### Option B: Deploy via Script (Advanced - Experimental)

```bash
# Load environment variables from mcp-server/.env
export ZEABUR_TOKEN=<your-zeabur-token>
export PELANGI_API_TOKEN=<from-mcp-server-env>
export NVIDIA_API_KEY=<from-mcp-server-env>
export GROQ_API_KEY=<from-mcp-server-env>
export OPENROUTER_API_KEY=<from-mcp-server-env>

# Run deployment script
node scripts/deploy-mcp-server-frankfurt.js
```

**Note**: This is experimental. If it fails, use Option A (Dashboard).

---

## 🧪 Verification Checklist

After deployment:

- [ ] Service shows **RUNNING** status in Zeabur dashboard
- [ ] Health endpoint responds: `curl https://[mcp-domain]/health`
- [ ] AI Assistant accessible at: `https://pelangi-manager-2.zeabur.app/admin/rainbow`
- [ ] Can send test message to AI assistant
- [ ] AI assistant responds correctly
- [ ] No errors in service logs

---

## 🔧 Quick Troubleshooting

**Service CRASHED?**
→ Check runtime logs in Zeabur dashboard
→ Verify all environment variables are set correctly
→ Ensure PELANGI_API_URL points to Frankfurt main app

**502 Bad Gateway?**
→ Wait 1-2 minutes (service still starting)
→ Check service status is RUNNING
→ Verify PORT environment variable

**AI Not Responding?**
→ Check NVIDIA_API_KEY and GROQ_API_KEY are set
→ Review MCP server logs for API errors
→ Test API keys manually if needed

---

## 📊 Expected Architecture After Deployment

```
Frankfurt Project (6988ba46ea91e8e06ef1420c)
├── pelangi-manager (RUNNING ✅)
│   └── https://pelangi-manager-2.zeabur.app
└── pelangi-mcp-server (Deploy this now! 👈)
    └── https://[auto-generated-domain].zeabur.app
```

---

## 📚 Full Documentation

See `MCP-SERVER-DEPLOYMENT-GUIDE.md` for comprehensive details including:
- Detailed troubleshooting
- Architecture overview
- Testing procedures
- Integration with main web app

---

## ⚡ TL;DR - Fastest Path

1. Open: https://dash.zeabur.com/projects/6988ba46ea91e8e06ef1420c
2. Add Service → Git → wenjyue84/PelangiManager-Zeabur
3. Settings → Root Directory = `mcp-server`
4. Variables → Copy from `mcp-server/.env`
5. Redeploy → Wait 2-3 minutes
6. Test: `curl https://[domain]/health`
7. ✅ Done!

---

**Ready to deploy?** Choose Option A (Dashboard) and follow the steps above! 🚀
