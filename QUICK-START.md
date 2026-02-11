# PelangiManager Quick Start

## 🚀 Option 1: Manual Start (Traditional)

```bash
# Terminal 1: Main servers
npm run dev

# Terminal 2: MCP server
cd mcp-server && npm run dev

# Wait 8 seconds, then open browser:
http://localhost:3000/dashboard
```

---

## ⚡ Option 2: One-Click Start (Smart)

### Setup Once (30 seconds):
```bash
cd server-launcher
npm install
npm start  # Keep this running
```

### Use Forever:
1. Open bookmark: `file:///.../start-page.html`
2. Click "Start All Servers"
3. Wait 8 seconds
4. Click any link → ✅ App loads

**Bookmark this page now!** Press `Ctrl + D`

---

## 🤖 Option 3: Auto-Start (Magic)

### Windows Setup (2 minutes):
1. Press `Win + R` → type `shell:startup`
2. Create shortcut to:
   ```
   cmd.exe /c "cd /d C:\path\to\PelangiManager-Zeabur\server-launcher && npm start"
   ```
3. **Done!** Servers start automatically on login.

### macOS/Linux:
Add to `~/.zshrc`:
```bash
(cd ~/path/to/PelangiManager-Zeabur/server-launcher && npm start) &
```

---

## ❓ Troubleshooting

### Empty pages / Connection refused?
```bash
# Check if servers are running
netstat -ano | findstr ":3000 :3002 :5000"

# If empty → servers not running! Start them.
```

### Want more control?
See `AUTO-START-GUIDE.md` for:
- Browser extension (auto-detect errors)
- Task scheduler (delayed start)
- Batch scripts (one-click all)

---

## 🎯 Recommended Setup

**Best experience (5 minutes total):**

1. ✅ **Auto-start launcher** (Windows Startup)
   - Launcher always available in background
   - Zero manual steps after Windows login

2. ✅ **Bookmark start page** (Ctrl + D)
   - Visual dashboard for manual control
   - See server status at a glance

3. ✅ **(Optional) Browser extension**
   - Automatic button injection on errors
   - Extra safety net

This combination gives you:
- 🔄 Automatic background service
- 🎨 Beautiful control dashboard
- 🛡️ Error detection safety net
- 🚀 Best developer experience

---

**Need help?** See:
- `AUTO-START-GUIDE.md` - Detailed setup guide
- `docs/fix.md` - Common issues
- `CLAUDE.md` - Full documentation
