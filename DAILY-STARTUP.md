# Daily Startup Guide - PelangiManager

## Quick Start (30 seconds)

```bash
# Option 1: Automated startup (recommended)
start-all.bat

# Wait for browser to open automatically with dashboard
# ✅ Done!
```

---

## Alternative: Manual Startup (if scripts fail)

```bash
# Terminal 1: Frontend + Backend
npm run dev:clean

# Wait 8 seconds for backend to initialize...

# Terminal 2: MCP Server
cd RainbowAI && npm run dev

# Wait 5 seconds for MCP to initialize...

# Open browser manually
start http://localhost:3002/dashboard
```

---

## Health Check (before opening dashboard)

```bash
check-health.bat
```

Expected output:
```
✅ Frontend running on port 3000
✅ Backend API healthy
✅ MCP Server healthy
```

If any ❌ appears → run `start-all.bat`

---

## Troubleshooting

### Dashboard shows "Loading..."?

**Quick fix (90% of cases):**
```bash
# 1. Restart MCP server
npx kill-port 3002 && cd RainbowAI && npm run dev

# 2. Wait 8 seconds

# 3. Hard refresh browser
Press Ctrl + Shift + R
```

**Nuclear option (if quick fix fails):**
```bash
start-all.bat
```

---

### After changing .env files?

**ALWAYS restart the affected server!**

```bash
# If you edited RainbowAI/.env:
npx kill-port 3002 && cd RainbowAI && npm run dev

# If you edited server/.env:
npm run dev:clean
```

---

## Quick Reference

| What you want | Command |
|---------------|---------|
| Start everything | `start-all.bat` |
| Check if servers running | `check-health.bat` |
| Restart MCP server only | `npx kill-port 3002 && cd RainbowAI && npm run dev` |
| Restart frontend + backend | `npm run dev:clean` |
| Nuclear restart (all) | `start-all.bat` |

---

## URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- **Rainbow Dashboard: http://localhost:3002/dashboard** ⭐

---

**Pro tip:** Bookmark `start-all.bat` and run it every morning!
