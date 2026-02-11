# PelangiManager Server Launcher - Browser Extension

Auto-detect when PelangiManager servers aren't running and start them with one click!

## Features

✅ **Auto-detect connection errors** - Shows floating button on ERR_CONNECTION_REFUSED
✅ **One-click start** - Launch all servers with single button
✅ **Status indicator** - See which ports are running from extension popup
✅ **Selective start** - Start main (3000+5000) or MCP (3002) independently
✅ **Auto-reload** - Browser automatically refreshes after servers start

## Installation

### Step 1: Start the Launcher Service

The browser extension communicates with a local HTTP server that actually starts the dev servers.

```bash
# Navigate to project root
cd /path/to/PelangiManager-Zeabur

# Install launcher dependencies
cd server-launcher
npm install

# Start the launcher (keep this running)
npm start
```

You should see:
```
🚀 Server Launcher running on http://localhost:9999
```

**Keep this terminal open!** The launcher must run in the background.

### Step 2: Install Browser Extension

#### Chrome/Edge:
1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `browser-extension/` folder
5. ✅ Extension installed!

#### Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from `browser-extension/`
4. ✅ Extension installed!

### Step 3: Create Icons (Optional)

If you want custom icons, create three PNG files:
- `icon16.png` (16x16) - Toolbar icon
- `icon48.png` (48x48) - Extension manager
- `icon128.png` (128x128) - Chrome Web Store

For now, you can use placeholder images or skip this (extension works without icons).

## Usage

### Automatic (Recommended)

1. Navigate to `http://localhost:3000/dashboard` (servers not running)
2. Chrome shows connection error page
3. **Floating purple button appears**: "🚀 Server Not Running"
4. Click "Start Dev Servers"
5. Wait 8 seconds → page auto-reloads
6. ✅ Dashboard loads!

### Manual (Extension Popup)

1. Click the extension icon in Chrome toolbar
2. Popup shows server status:
   - ✅ **Running** - Frontend (3000), Backend (5000), MCP (3002)
   - ❌ **Stopped** - All servers stopped
3. Click buttons:
   - **Start All Servers** - Launches both main + MCP
   - **Start Main Only** - Launches frontend (3000) + backend (5000)
   - **Start MCP Only** - Launches MCP server (3002)
   - **Stop All Servers** - Kills all processes

## How It Works

```
┌─────────────────┐
│  Browser Visit  │
│ localhost:3000  │
└────────┬────────┘
         │
         │ (ERR_CONNECTION_REFUSED)
         ▼
┌─────────────────────────┐
│  Content Script         │
│  Detects error          │
│  Injects button         │
└────────┬────────────────┘
         │
         │ (User clicks button)
         ▼
┌─────────────────────────┐
│  Fetch POST             │
│  localhost:9999/start   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Launcher Service       │
│  Executes:              │
│  spawn('npm run dev')   │
└────────┬────────────────┘
         │
         │ (8 seconds)
         ▼
┌─────────────────────────┐
│  Servers Started        │
│  Browser auto-reloads   │
│  ✅ Page loads!         │
└─────────────────────────┘
```

## Troubleshooting

### "Launcher Not Running" error

**Cause:** The launcher service (port 9999) isn't running.

**Fix:**
```bash
cd server-launcher
npm start
```

### Button doesn't appear on connection error

**Cause:** Content script not injecting properly.

**Fix:**
1. Check `chrome://extensions/` → Extension is enabled
2. Hard refresh the page: `Ctrl + Shift + R`
3. Check browser console for errors

### Servers don't start after clicking button

**Cause:** Launcher can't execute `npm run dev`.

**Fix:**
1. Check launcher terminal for errors
2. Verify project path in `server-launcher/server.js`
3. Try manually: `npm run dev` to see error

### Extension works but servers timeout

**Cause:** 8-second countdown too short (slow machine).

**Fix:** Edit `content.js` line ~95:
```javascript
let countdown = 15; // Increase from 8 to 15 seconds
```

## Auto-Start on Login (Optional)

### Windows

Create a shortcut to launcher in Startup folder:

1. Press `Win + R` → type `shell:startup`
2. Create shortcut to:
   ```
   cmd.exe /c "cd C:\path\to\PelangiManager-Zeabur\server-launcher && npm start"
   ```
3. Launcher starts automatically on login!

### macOS/Linux

Add to `~/.bashrc` or `~/.zshrc`:
```bash
# Auto-start PelangiManager launcher
(cd ~/path/to/PelangiManager-Zeabur/server-launcher && npm start) &
```

## Alternatives

If you don't want a browser extension:

### Option 1: Custom Error Page (Simpler)

Edit your `hosts` file to redirect localhost errors to a local HTML page with a "Start Servers" button.

### Option 2: Service Worker (No Extension)

Register a service worker on `localhost:3000` that intercepts failed requests and shows start button.

### Option 3: Windows Auto-Start Script

Use the existing `start-dev.bat` script and pin it to taskbar for one-click launch.

## Uninstallation

1. Stop the launcher: Close terminal running `npm start`
2. Remove extension: `chrome://extensions/` → Remove
3. Delete folders: `server-launcher/` and `browser-extension/`

---

**Tip:** Pin the extension to Chrome toolbar (puzzle icon → pin) for quick access to status/controls!
