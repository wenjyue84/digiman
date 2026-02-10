# Rainbow MCP Server & AI Admin Skill

## When to Use This Skill
Use when starting the MCP/AI assistant server, accessing the Rainbow admin dashboard, troubleshooting white pages on `/admin/rainbow/*` URLs, or working on AI/WhatsApp features independently from the hostel app.

## Triggers
- "start mcp server"
- "rainbow admin white page"
- "admin rainbow not loading"
- "how to access AI dashboard"
- "work on rainbow / AI features"
- "mcp server port"
- "whatsapp admin page"

## Architecture Overview

### 3 Separate Servers (Local Dev)

```
Port 3000  →  Vite (React frontend)     — Hostel management UI
Port 5000  →  Express (Backend API)      — REST API, auth, database
Port 3002  →  MCP Server (Rainbow AI)    — AI dashboard, WhatsApp, chatbot admin
```

The MCP server is **independent** — it has its own Express app, serves its own HTML pages, and has its own API routes. It does NOT need React to work.

### URL Routing

| URL Pattern | Served By | Notes |
|-------------|-----------|-------|
| `localhost:3002/admin/rainbow` | MCP server directly | HTML dashboard (rainbow-admin.html) |
| `localhost:3002/admin/rainbow/status` | MCP server directly | Status page tab |
| `localhost:3002/api/rainbow/*` | MCP server API | Admin REST endpoints |
| `localhost:3000/admin/rainbow/kb` | React app | KB page stays in React |
| `localhost:3000/admin/rainbow/*` | React catch-all | Redirects to MCP server (port 3002) |

### Key Insight: Direct Access is Best
**For AI/Rainbow work, go directly to `http://localhost:3002/admin/rainbow`.**
No need to go through React (port 3000). The redirect exists only as a convenience for users navigating from the hostel app.

## Starting the Servers

### Start Everything (Hostel + AI)
```bash
# Terminal 1: Hostel app (frontend + backend)
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur
npx kill-port 3000 5000
npm run dev

# Terminal 2: MCP/AI server
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server
npx kill-port 3002
npm run dev
```

### Start Only MCP Server (AI work only)
```bash
# Backend must be running for API calls
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur
npx kill-port 5000
npm run dev:server

# Then MCP server
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server
npx kill-port 3002
npm run dev
```

## Port Configuration

### MCP Server Port
- **Config file:** `mcp-server/.env`
- **Variable:** `MCP_SERVER_PORT=3002`
- **Default (in code):** 3001 (from `mcp-server/src/index.ts`)
- **Actual:** 3002 (overridden by .env)

### Critical: Port Must Match in Two Places
1. `mcp-server/.env` → `MCP_SERVER_PORT=3002` (server listens here)
2. `client/src/pages/admin-rainbow.tsx` → `window.location.href = http://localhost:3002/...` (redirect target)

If these don't match, you get a white page after "Redirecting..." message.

## React Catch-All Route (White Page Fix)

### The Problem
React's `<Switch>` gatekeeps URLs. If a new MCP page is added (e.g., `/admin/rainbow/workflows`), React doesn't know about it and shows a 404/white page.

### The Fix (Applied)
In `client/src/App.tsx`:
```tsx
{/* Specific React page — must be ABOVE catch-all */}
<Route path="/admin/rainbow/kb">
  <ProtectedRoute requireAuth={true}>
    <AdminRainbowKB />
  </ProtectedRoute>
</Route>
{/* Catch-all — redirects everything else to MCP server */}
<Route path="/admin/rainbow/*?" component={AdminRainbow} />
```

### How It Works
- Wouter's `<Switch>` matches top-down
- `/admin/rainbow/kb` matches first → stays in React
- Any other `/admin/rainbow/*` → hits catch-all → `AdminRainbow` component → redirects to `localhost:3002`
- New MCP pages work automatically without touching React

### Adding a New React-Based Rainbow Page
If you want a specific rainbow sub-page in React (not MCP server):
1. Add the specific route **above** the `/*?` catch-all in `App.tsx`
2. Import and use the component as usual
3. The catch-all only fires for paths not matched above it

## MCP Server File Structure

```
mcp-server/
  src/
    index.ts              — Express app, port config, route mounting
    server.ts             — MCP protocol handler
    routes/
      admin.ts            — /api/rainbow/* REST endpoints (knowledge, intents, routing, etc.)
    assistant/
      index.ts            — WhatsApp AI assistant init
      ai-client.ts        — NVIDIA/Groq/Ollama AI providers
      knowledge-base.ts   — LLM knowledge base
      config-store.ts     — JSON config persistence
    lib/
      baileys-client.ts   — WhatsApp connection (Baileys)
    public/
      rainbow-admin.html  — The HTML dashboard served at /admin/rainbow
    tools/
      whatsapp.ts         — MCP tools for Claude
  .env                    — MCP_SERVER_PORT, API keys (NVIDIA, GROQ)
```

### Key Routes (mounted in index.ts)
- `GET /admin/rainbow/:tab?` → Serves `rainbow-admin.html`
- `USE /api/rainbow/*` → Admin REST API (routes/admin.ts)
- `POST /mcp` → MCP protocol endpoint for Claude tools
- `GET /health` → Health check

## Troubleshooting

### White Page on /admin/rainbow/*
1. **Is MCP server running?** Check `http://localhost:3002/health`
2. **Port mismatch?** Compare `mcp-server/.env` PORT with `admin-rainbow.tsx` redirect URL
3. **Missing catch-all?** Check `App.tsx` has `/*?` pattern, not explicit paths

### MCP Server Won't Start
1. **Port in use?** `npx kill-port 3002`
2. **Missing deps?** `cd mcp-server && npm install`
3. **Missing .env?** Copy `mcp-server/.env.example` to `mcp-server/.env`

### "Redirecting..." But Nothing Loads
- MCP server not running on expected port
- Fix: Start MCP server, or go directly to `http://localhost:3002/admin/rainbow`

### AI Features Not Working
- Check `mcp-server/.env` for `NVIDIA_API_KEY` and/or `GROQ_API_KEY`
- Test: `http://localhost:3002/api/rainbow/status` — shows AI provider status

## Future: When to Split Into Separate Services

Don't split yet. Split when you feel ONE of these pains:

| Pain Signal | Action |
|-------------|--------|
| AI code change breaks hostel app | Shared dependencies tangling — time to split |
| Deploying Rainbow restarts hostel | Single deployment = single failure domain |
| MCP server file > 1000 lines | Too many concerns in one service |
| Want Rainbow AI in another project | Make it a standalone service |

When ready, use a reverse proxy (Caddy/Nginx) to route URLs to separate services. See the architecture plan in the project for details.
