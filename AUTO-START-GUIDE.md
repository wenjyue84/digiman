# Auto-Start Server Solutions for PelangiManager

This guide provides **3 solutions** for automatically detecting and starting PelangiManager servers when you visit a URL and they're not running.

## 🏆 Recommended Solution Rankings

| Rank | Solution | Setup Time | Reliability | Features |
|------|----------|----------|-------------|----------|
| 🥇 1 | **Start Page Bookmark** | 2 min | ⭐⭐⭐⭐⭐ | Simple, cross-browser, no extension |
| 🥈 2 | **Browser Extension** | 15 min | ⭐⭐⭐⭐ | Auto-inject button on error page |
| 🥉 3 | **Windows Startup** | 5 min | ⭐⭐⭐⭐⭐ | Auto-start on login, no browser needed |

---

## Solution 1: Start Page Bookmark (Recommended) ⭐

**Best for:** Quick setup, works in any browser, no extensions needed.

### Setup (2 minutes)

1. **Start the launcher service:**
   ```bash
   cd server-launcher
   npm install
   npm start
   ```
   Keep this terminal open! Launcher runs on port 9999.

2. **Bookmark the start page:**
   - Open `file:///C:/Users/Jyue/Desktop/Projects/PelangiManager-Zeabur/start-page.html`
   - Press `Ctrl + D` to bookmark
   - Name it: "🚀 Start PelangiManager"
   - Add to bookmarks bar

3. **Done!**

### Usage

1. Click bookmark → Beautiful dashboard opens
2. Click "Start All Servers" button
3. Wait 8 seconds
4. Click any link (Dashboard, Rainbow AI, Settings)
5. ✅ App loads!

**Bonus:** Bookmark shows server status (running/stopped) in real-time.

---

## Solution 2: Browser Extension 🔌

**Best for:** Automatic detection, shows button on error pages without manual navigation.

### Setup (15 minutes)

#### Step 1: Start Launcher Service

```bash
cd server-launcher
npm install
npm start
```

#### Step 2: Install Extension

**Chrome/Edge:**
1. Open `chrome://extensions/`
2. Enable "Developer mode" (toggle top-right)
3. Click "Load unpacked"
4. Select `browser-extension/` folder
5. ✅ Extension installed

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from `browser-extension/`

#### Step 3: (Optional) Create Icons

If you want custom icons, add these files to `browser-extension/`:
- `icon16.png` (16×16)
- `icon48.png` (48×48)
- `icon128.png` (128×128)

Or use online generator: https://www.favicon-generator.org/

### Usage

**Automatic (No Action Needed):**
1. Navigate to `http://localhost:3000/dashboard`
2. If servers not running → ERR_CONNECTION_REFUSED
3. **Purple floating button appears automatically**
4. Click "Start Dev Servers"
5. Wait 8 seconds → Page auto-reloads
6. ✅ Dashboard loads

**Manual (Extension Popup):**
1. Click extension icon in toolbar
2. See server status in real-time
3. Click "Start All Servers" / "Start Main Only" / "Start MCP Only"

---

## Solution 3: Windows Auto-Start (Set and Forget) 🪟

**Best for:** Never worry about starting servers manually.

### Option A: Startup Folder (Recommended)

1. Press `Win + R` → type `shell:startup` → Enter
2. Right-click → New → Shortcut
3. Enter location:
   ```
   cmd.exe /c "cd /d C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\server-launcher && npm start"
   ```
4. Name it: "PelangiManager Launcher"
5. (Optional) Change icon: Right-click shortcut → Properties → Change Icon

**Result:** Launcher starts automatically on Windows login.

### Option B: Task Scheduler (Advanced)

For delayed start (e.g., 30 seconds after login):

1. Open Task Scheduler (`Win + R` → `taskschd.msc`)
2. Create Basic Task:
   - **Name:** PelangiManager Launcher
   - **Trigger:** At log on
   - **Action:** Start a program
   - **Program:** `cmd.exe`
   - **Arguments:** `/c cd /d C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\server-launcher && npm start`
3. Edit task → Conditions → Uncheck "Start only if on AC power"
4. ✅ Task created

### Option C: Batch Script

Create `auto-start-all.bat`:
```batch
@echo off
title PelangiManager Auto-Start

echo Starting Server Launcher...
start "Launcher" cmd /c "cd /d C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\server-launcher && npm start"

timeout /t 3 /nobreak

echo Starting Main Servers...
cd /d C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur
start "Main Servers" cmd /c "npm run dev"

timeout /t 3 /nobreak

echo Starting MCP Server...
cd /d C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server
start "MCP Server" cmd /c "npm run dev"

echo.
echo ✅ All servers starting!
echo Close this window after 10 seconds.
timeout /t 10
exit
```

Pin to taskbar for one-click launch of everything.

---

## Comparison Table

| Feature | Start Page | Extension | Windows Auto-Start |
|---------|-----------|-----------|-------------------|
| Auto-detect errors | ❌ | ✅ | N/A |
| One-click start | ✅ | ✅ | Auto (no click) |
| Server status display | ✅ | ✅ | ❌ |
| Works offline | ✅ | ✅ | ✅ |
| Cross-platform | ✅ | ✅ | ❌ (Windows only) |
| Setup time | 2 min | 15 min | 5 min |
| Requires launcher | ✅ | ✅ | ❌ |
| Browser agnostic | ✅ | ❌ | ✅ |

---

## Troubleshooting

### "Launcher Not Running" Error

**Symptoms:**
- Start page shows "⚠️ Launcher Not Running"
- Extension shows "Launcher Not Running"

**Fix:**
```bash
cd server-launcher
npm install
npm start
```

**Verify:**
```bash
curl http://localhost:9999/status
# Should return: {"running":false,"ports":{...}}
```

### Extension Button Doesn't Appear

**Symptoms:**
- Visit `localhost:3000` → ERR_CONNECTION_REFUSED
- No purple button appears

**Fixes:**
1. Hard refresh: `Ctrl + Shift + R`
2. Check extension enabled: `chrome://extensions/`
3. Check browser console for errors (F12)
4. Re-load extension: Toggle off/on

### Servers Don't Start After Clicking Button

**Symptoms:**
- Click "Start All Servers"
- Nothing happens / error alert

**Fixes:**
1. Verify launcher running: `curl http://localhost:9999/status`
2. Check launcher terminal for errors
3. Try manual start: `npm run dev` to see actual error
4. Verify project path in `server-launcher/server.js`

### Auto-Start Not Working (Windows)

**Symptoms:**
- Restart Windows
- Servers not running

**Fixes:**
1. Check shortcut target path is correct
2. Test shortcut manually (double-click)
3. Check Task Scheduler task is enabled
4. View Task Scheduler history for errors

---

## Bonus: macOS/Linux Auto-Start

### macOS (LaunchAgent)

Create `~/Library/LaunchAgents/com.pelangi.launcher.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pelangi.launcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/PelangiManager-Zeabur/server-launcher/server.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load: `launchctl load ~/Library/LaunchAgents/com.pelangi.launcher.plist`

### Linux (systemd)

Create `/etc/systemd/system/pelangi-launcher.service`:
```ini
[Unit]
Description=PelangiManager Server Launcher
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/PelangiManager-Zeabur/server-launcher
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable: `sudo systemctl enable pelangi-launcher && sudo systemctl start pelangi-launcher`

---

## Summary: Which Solution Should I Use?

### Use **Start Page Bookmark** if:
- ✅ You want the simplest, fastest setup (2 minutes)
- ✅ You're okay manually opening a bookmark when you need servers
- ✅ You want a beautiful dashboard to control servers
- ✅ You use multiple browsers

### Use **Browser Extension** if:
- ✅ You want automatic detection (no manual step)
- ✅ You primarily use Chrome/Edge
- ✅ You want the "magic" experience (button appears on errors)
- ✅ You're willing to spend 15 minutes on setup

### Use **Windows Auto-Start** if:
- ✅ You want zero manual intervention
- ✅ You're on Windows
- ✅ You're okay with servers always running in background
- ✅ You want the ultimate "set and forget" solution

### Use **Combination** (Best Experience):
1. Windows Auto-Start → Launcher always running
2. Start Page Bookmark → Quick visual dashboard
3. Browser Extension → Auto-inject on errors

This gives you:
- Background launcher always available
- Visual control panel when needed
- Automatic detection as safety net

---

**Last Updated:** 2026-02-12
**Related:** `docs/fix.md`, `CLAUDE.md`
