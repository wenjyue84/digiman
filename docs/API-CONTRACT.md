# API Contract — Inter-Module Communication

This document defines the HTTP APIs used for communication between PelangiManager's three modules.

## Architecture Overview

```
┌─────────────┐     /api/*      ┌─────────────┐
│   client/   │ ──────────────> │   server/   │
│  (React)    │     port 5000   │  (Express)  │
│  port 3000  │                 │             │
└──────┬──────┘                 └──────┬──────┘
       │                               ▲
       │  /api/rainbow/*               │ /api/* (Bearer token)
       │  port 3002                    │
       ▼                               │
┌─────────────┐                        │
│ mcp-server/ │ ───────────────────────┘
│  (Rainbow)  │   HTTP calls to web app API
│  port 3002  │
└─────────────┘
```

## Response Envelope

All server API responses use a standardized envelope format (via `sendSuccess()`/`sendError()` in `server/lib/apiResponse.ts`):

```json
// Success
{ "success": true, "data": { ... } }
{ "success": true, "message": "Created", "data": { ... } }

// Error
{ "success": false, "error": "Validation failed", "message": "Email is required" }
```

**Client-side handling**: When consuming responses, unwrap with `data.data || data` to support both wrapped and legacy flat responses (see `auth-provider.tsx`).

## 1. Web App API (server/ on port 5000)

Called by: `client/` (via Vite proxy), `mcp-server/` (via HTTP with Bearer token)

### Authentication

- **Browser sessions**: Passport.js cookie-based sessions (client → server)
- **API token**: Bearer token in `Authorization` header (MCP server → server)
  - Token generated in Settings > Security > API Tokens

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/guests/checked-in` | List checked-in guests |
| GET | `/api/guests/:id` | Get guest by ID |
| POST | `/api/guests` | Create/check-in guest |
| PATCH | `/api/guests/:id` | Update guest |
| POST | `/api/guests/:id/checkout` | Check out guest |
| GET | `/api/capsules` | List all capsules |
| GET | `/api/occupancy` | Get occupancy stats |
| GET | `/api/capsules/available` | Available capsules |
| GET | `/api/dashboard` | Dashboard summary (includes todayArrivals, upcomingReservationCount) |
| GET | `/api/problems` | List problems |
| POST | `/api/problems` | Create problem |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user (raw JSON, not envelope) |
| GET | `/api/expenses` | List expenses |
| GET | `/api/rainbow-kb/*` | Knowledge base CRUD |
| GET | `/objects/uploads/*` | Uploaded files |

### Reservation Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reservations` | List reservations (filter by status, date range) |
| GET | `/api/reservations/:id` | Get reservation by ID |
| POST | `/api/reservations` | Create reservation |
| PATCH | `/api/reservations/:id` | Update reservation |
| DELETE | `/api/reservations/:id` | Cancel reservation |
| POST | `/api/reservations/:id/check-in` | Convert reservation to check-in |
| POST | `/api/reservations/:id/no-show` | Mark as no-show |
| GET | `/api/reservations/availability` | Check unit availability for date range |

**Auto-expiration**: Server runs hourly task to expire no-show reservations past their check-in date.

## 2. Rainbow MCP Admin API (mcp-server/ on port 3002)

Called by: `client/` (via Vite proxy at `/api/rainbow/*`)

### Authentication

- **Local requests**: Auto-allowed (localhost)
- **Remote requests**: `x-admin-key` header (matches `RAINBOW_ADMIN_KEY` env var)
- **Dev mode**: No key configured = allow all

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/mcp` | MCP JSON-RPC endpoint |
| GET | `/api/rainbow/settings` | Get AI settings |
| PUT | `/api/rainbow/settings` | Update AI settings |
| GET | `/api/rainbow/intents` | List intents |
| PUT | `/api/rainbow/intents` | Update intents |
| GET | `/api/rainbow/workflows` | List workflows |
| PUT | `/api/rainbow/workflows` | Update workflows |
| GET | `/api/rainbow/whatsapp/status` | WhatsApp connection status |
| POST | `/api/rainbow/whatsapp/pair` | Pair WhatsApp number |
| POST | `/api/rainbow/tests/run` | Run test suite |
| POST | `/api/rainbow/tests/coverage` | Get test coverage |
| GET | `/api/rainbow/kb/files` | Knowledge base files |
| GET | `/api/rainbow/conversations` | Chat conversation logs |
| POST | `/api/rainbow/ai/chat` | Test AI chat |
| POST | `/api/rainbow/ai/test-provider` | Test AI provider |

### MCP JSON-RPC Endpoint (`POST /mcp`)

Standard MCP protocol over HTTP:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "pelangi_get_occupancy",
    "arguments": {}
  },
  "id": 1
}
```

## 3. Vite Dev Proxy (client/ port 3000)

The Vite dev server proxies API requests to the correct backend:

| Pattern | Target | Description |
|---------|--------|-------------|
| `/api/rainbow-kb/*` | `localhost:5000` | KB CRUD (handled by web backend) |
| `/api/rainbow/*` | `localhost:3002` | Rainbow AI admin (MCP server) |
| `/api/*` | `localhost:5000` | All other API calls (web backend) |
| `/objects/*` | `localhost:5000` | File uploads/downloads |

**Order matters**: More specific routes must come before general `/api/*` catch-all.
