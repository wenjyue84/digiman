# Agent-Browser Multi-Window Setup Guide

**Problem Solved:** Prevents browser instance confusion when running agent-browser from multiple Claude Code windows simultaneously.

**Solution:** Each window uses an isolated browser session via unique session names.

---

## ✅ Installation Complete

PowerShell profile created at:
```
C:\Users\Jyue\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1
```

---

## 🚀 Quick Start

### 1. Reload PowerShell Profile

**Option A: Restart PowerShell** (Recommended)
- Close and reopen your PowerShell/terminal
- Profile loads automatically

**Option B: Reload in Current Session**
```powershell
. $PROFILE
```

### 2. Set Session Name for Each Window

**Window 1 (e.g., PelangiManager):**
```powershell
absession pelangi
# Output: 🌐 Agent-Browser Session: pelangi
```

**Window 2 (e.g., Testing):**
```powershell
absession testing
# Output: 🌐 Agent-Browser Session: testing
```

**Window 3 (e.g., Development):**
```powershell
absession dev
# Output: 🌐 Agent-Browser Session: dev
```

### 3. Use Agent-Browser Normally

Each window now operates independently:

```powershell
# Window 1 (pelangi session)
agent-browser open https://example.com

# Window 2 (testing session)
agent-browser open https://google.com

# ✅ No cross-contamination! Each window has its own browser.
```

---

## 📋 Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `absession <name>` | Set session name for current window | `absession pelangi` |
| `abinfo` | Show current session name | `abinfo` |

---

## 🔍 Verification Steps

Test that the fix works:

### 1. Open Two Claude Code Windows

### 2. Window 1 - Set Session and Open Page
```powershell
absession window1
agent-browser open https://example.com
agent-browser snapshot -i
```

**Expected:** Screenshot shows example.com

### 3. Window 2 - Set Different Session and Open Page
```powershell
absession window2
agent-browser open https://google.com
agent-browser snapshot -i
```

**Expected:** Screenshot shows google.com (NOT example.com!)

### 4. Verify Isolation
```powershell
# Window 1
agent-browser eval "document.title"
# Output: "Example Domain"

# Window 2
agent-browser eval "document.title"
# Output: "Google"

# ✅ Each window sees only its own browser state
```

### 5. Check Environment Variable
```powershell
# Window 1
echo $env:AGENT_BROWSER_SESSION
# Output: window1

# Window 2
echo $env:AGENT_BROWSER_SESSION
# Output: window2
```

---

## 💡 Best Practices

### Use Descriptive Session Names

Match session names to your projects or tasks:

```powershell
# Project-based
absession pelangi-dev
absession makanmanager-test
absession portfolio-debug

# Task-based
absession testing
absession debugging
absession automation

# Feature-based
absession checkout-flow
absession payment-testing
```

### Check Current Session Before Starting

Always verify which session you're in:

```powershell
abinfo
# Output: 🌐 Agent-Browser Session: pelangi
```

### Clean Up Old Sessions (Optional)

If you have many daemon processes running:

```powershell
# List all agent-browser processes
Get-Process | Where-Object { $_.ProcessName -like "*agent-browser*" }

# Kill current session's daemon
agent-browser kill

# Kill all sessions (nuclear option)
Get-Process | Where-Object { $_.ProcessName -like "*agent-browser*" } | Stop-Process -Force
```

---

## 🔧 Advanced: Auto-Session Based on Directory

Want sessions to automatically match your project directory?

Edit your profile:
```powershell
notepad $PROFILE
```

Uncomment these lines:
```powershell
$projectName = (Get-Location).Path.Split('\')[-1]
$env:AGENT_BROWSER_SESSION = $projectName
Write-Host "🌐 Auto-set Agent-Browser Session: $projectName" -ForegroundColor Gray
```

Now each project directory automatically gets its own session!

**Example:**
```powershell
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur
# Auto-set session: PelangiManager-Zeabur

cd C:\Users\Jyue\Desktop\Projects\MakanManager
# Auto-set session: MakanManager
```

---

## 🐛 Troubleshooting

### Issue: Session not working after reload

**Solution:** Restart PowerShell (close and reopen terminal)

### Issue: Profile not loading automatically

**Check execution policy:**
```powershell
Get-ExecutionPolicy
```

**If it says "Restricted", fix with:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Still seeing cross-contamination

**Verify session is set:**
```powershell
abinfo
```

**If it says "default (not set)":**
```powershell
absession mywindow
abinfo  # Should now show: mywindow
```

### Issue: Want to reset to default session

```powershell
absession default
# Or just:
absession
```

---

## 📊 How It Works

### Architecture

```
Window 1 (session: "pelangi")
    ↓
CLI → TCP Port 49152 + hash("pelangi") → Daemon Process A → Browser Instance A

Window 2 (session: "testing")
    ↓
CLI → TCP Port 49152 + hash("testing") → Daemon Process B → Browser Instance B
```

### Key Points

1. **Different Session Names** → Different TCP ports
2. **Different TCP Ports** → Different daemon processes
3. **Different Daemons** → Different BrowserManager instances
4. **Different BrowserManager** → Completely isolated browser states

### Session Files

Each session creates its own files in `/tmp/`:

```
/tmp/agent-browser-pelangi.pid    # Daemon process ID
/tmp/agent-browser-pelangi.port   # TCP port number
/tmp/agent-browser-pelangi.stream # Communication stream

/tmp/agent-browser-testing.pid
/tmp/agent-browser-testing.port
/tmp/agent-browser-testing.stream
```

---

## ✨ What's Next?

Your multi-window setup is ready! Now you can:

- ✅ Run different browser automation tasks in parallel
- ✅ Test in one window while developing in another
- ✅ Debug without interfering with other work
- ✅ Keep separate browser contexts for different projects

**Quick Reference Card:**

```powershell
# Set session (do this first in each window!)
absession mywindow

# Check current session
abinfo

# Use agent-browser normally
agent-browser open https://example.com
agent-browser click @e1
agent-browser snapshot -i

# Clean up when done
agent-browser kill
```

---

**Created:** 2026-02-12
**Status:** ✅ Implemented and Ready to Use
**Location:** `C:\Users\Jyue\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
