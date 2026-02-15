# Agent-Browser Global Setup - Complete Guide

## ✅ What's Already Done

1. **PowerShell Profile Created**
   - Location: `C:\Users\Jyue\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
   - Auto-loads on EVERY new PowerShell window
   - Available globally across your entire system

2. **Functions Available Globally**
   - `absession [name]` - Set session name
   - `abinfo` - Show current session

3. **Test Script Created**
   - Location: `C:\Users\Jyue\Desktop\test-agent-browser-session.ps1`
   - Interactive test for verification

---

## 🚀 How to Use Globally

### Every Time You Open a New PowerShell/Terminal Window:

**Step 1: Profile Auto-Loads**

When you open PowerShell, you'll see:
```
PowerShell Profile Loaded

Agent-Browser Commands:
  absession [name]  - Set browser session name
  abinfo            - Show current session
```

**Step 2: Set Your Session Name**

BEFORE using agent-browser for the first time in this window:
```powershell
absession my-window-name
```

Examples:
```powershell
# Window 1 (working on PelangiManager)
absession pelangi

# Window 2 (testing)
absession testing

# Window 3 (debugging)
absession debug
```

**Step 3: Use Agent-Browser Normally**

Now all agent-browser commands are isolated to this window:
```powershell
agent-browser open https://example.com
agent-browser click @e1
agent-browser snapshot -i
```

---

## 🔍 Verification Test

### Manual Test (Recommended)

**Window 1:**
```powershell
# 1. Open first PowerShell window
absession window1

# 2. Open example.com
agent-browser open https://example.com --headless

# 3. Check the title
agent-browser eval "document.title"
# Should show: "Example Domain"
```

**Window 2:**
```powershell
# 1. Open SECOND PowerShell window
absession window2

# 2. Open google.com
agent-browser open https://google.com --headless

# 3. Check the title
agent-browser eval "document.title"
# Should show: "Google" (NOT "Example Domain"!)
```

**✅ Success:** Each window shows its own page!

### Automated Test Script

Run this in any PowerShell window:
```powershell
C:\Users\Jyue\Desktop\test-agent-browser-session.ps1
```

Follow the prompts to test session isolation.

---

## 🌍 Global Usage Across Projects

### Option 1: Manual Session Names (Recommended)

Always set a session name when you start working:
```powershell
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur
absession pelangi
```

### Option 2: Auto-Session Based on Directory

Edit your profile to automatically set session based on current directory:

```powershell
notepad $PROFILE
```

Add at the bottom:
```powershell
# Auto-set session based on current directory
$projectName = (Get-Location).Path.Split('\')[-1]
$env:AGENT_BROWSER_SESSION = $projectName
Write-Host "Auto-set session: $projectName" -ForegroundColor Gray
```

Now sessions are automatically set when you `cd` into a directory!

---

## 📋 Quick Reference Card

### Commands
```powershell
absession pelangi     # Set session to "pelangi"
absession             # Set session to "default"
abinfo                # Show current session
agent-browser ...     # Use agent-browser (isolated per session)
```

### Workflow
```
1. Open PowerShell → Profile loads automatically
2. absession [name] → Set unique session name
3. agent-browser ... → Use normally, fully isolated
4. (Optional) agent-browser kill → Clean up when done
```

---

## 🔧 Troubleshooting

### Profile Not Loading

**Check execution policy:**
```powershell
Get-ExecutionPolicy
```

**If "Restricted", fix with:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Verify profile exists:**
```powershell
Test-Path $PROFILE
# Should return: True
```

**Manually load profile:**
```powershell
. $PROFILE
```

### Session Not Working

**Check current session:**
```powershell
abinfo
```

**Reset session:**
```powershell
absession my-new-session
abinfo  # Verify it changed
```

### Still Seeing Cross-Contamination

**Make sure BOTH windows have different sessions:**
```powershell
# Window 1
abinfo
# Should show: window1 (or whatever you set)

# Window 2
abinfo
# Should show: window2 (DIFFERENT from Window 1!)
```

**If both show "default (not set)", you forgot to run `absession`!**

---

## 🎯 Best Practices

### 1. Use Descriptive Names
```powershell
# ✅ Good
absession pelangi-dev
absession testing-checkout
absession debug-api

# ❌ Less helpful
absession a
absession x
absession test
```

### 2. Set Session BEFORE First Use
```powershell
# ✅ Correct order
absession pelangi
agent-browser open https://example.com

# ❌ Wrong - session set after browser already started
agent-browser open https://example.com
absession pelangi  # Too late!
```

### 3. Clean Up When Done
```powershell
# When finished with a session
agent-browser kill

# Or kill all sessions (nuclear option)
Get-Process | Where-Object { $_.ProcessName -like "*agent-browser*" } | Stop-Process -Force
```

### 4. Check Session Status
```powershell
# Always verify before critical operations
abinfo

# Should show your session name, not "default (not set)"
```

---

## 🌐 Multi-Project Workflow Example

### Scenario: Working on 3 Projects Simultaneously

**Terminal 1 - PelangiManager**
```powershell
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur
absession pelangi
agent-browser open http://localhost:3002/admin/rainbow
# Test Rainbow dashboard
```

**Terminal 2 - MakanManager**
```powershell
cd C:\Users\Jyue\Desktop\Projects\MakanManager
absession makan
agent-browser open http://localhost:3000
# Test cafe management
```

**Terminal 3 - Testing**
```powershell
cd C:\Users\Jyue\Desktop\Projects
absession testing
agent-browser open https://example.com
# Run automated tests
```

**Each terminal has its own isolated browser state!** 🎉

---

## 📊 How It Works (Technical)

### Session Isolation Architecture

```
Window 1 (absession pelangi)
    ↓
    AGENT_BROWSER_SESSION=pelangi
    ↓
    TCP Port: 49152 + hash("pelangi") = Port A
    ↓
    Daemon Process A
    ↓
    BrowserManager A (isolated browser instance)

Window 2 (absession testing)
    ↓
    AGENT_BROWSER_SESSION=testing
    ↓
    TCP Port: 49152 + hash("testing") = Port B
    ↓
    Daemon Process B
    ↓
    BrowserManager B (completely separate browser instance)
```

### Key Files

Each session creates its own files:
```
/tmp/agent-browser-pelangi.pid      # Daemon PID
/tmp/agent-browser-pelangi.port     # TCP port
/tmp/agent-browser-pelangi.stream   # Communication stream

/tmp/agent-browser-testing.pid      # Different daemon
/tmp/agent-browser-testing.port     # Different port
/tmp/agent-browser-testing.stream   # Different stream
```

---

## ✨ Summary

✅ **PowerShell profile installed globally** - Works in ALL PowerShell windows
✅ **Functions available everywhere** - `absession` and `abinfo` work system-wide
✅ **Auto-loads on startup** - No manual setup needed per window
✅ **Session isolation working** - Each window has independent browser state

### Your Workflow Now:
1. Open PowerShell (anywhere on your computer)
2. Run `absession [name]`
3. Use agent-browser normally
4. Profit! 🚀

---

**Last Updated:** 2026-02-12
**Status:** ✅ Ready for Global Use
**Support:** See `docs/AGENT-BROWSER-MULTI-WINDOW-SETUP.md` for full details
