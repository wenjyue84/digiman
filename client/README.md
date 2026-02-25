# digiman — Frontend (client/)

React SPA for capsule hotel management.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- TanStack Query (server state)
- React Hook Form + Zod (forms)
- Wouter (routing)

## Entry Point

`src/App.tsx` — route definitions and layout

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `dashboard.tsx` | Occupancy overview |
| `/check-in` | `check-in.tsx` | Guest check-in flow |
| `/check-out` | `check-out.tsx` | Guest check-out flow |
| `/history` | `history.tsx` | Guest history |
| `/maintenance` | `maintenance.tsx` | Problem reporting |
| `/cleaning` | `cleaning.tsx` | Capsule cleaning tracker |
| `/finance` | `finance.tsx` | Expense tracking |
| `/settings` | `settings.tsx` | System settings |
| `/admin/rainbow` | `admin-rainbow.tsx` | Rainbow AI dashboard (redirects to MCP server) |
| `/admin/rainbow/kb` | `admin-rainbow-kb.tsx` | Knowledge base management |

## Module Boundary

- Imports types from `shared/schema.ts` via `@shared` alias
- Communicates with backend via `/api/*` proxy (Vite dev server proxies to port 5000)
- `/api/rainbow/*` proxied to MCP server (port 3002)
- Does NOT import from `server/` or `mcp-server/`

## Development

```bash
# Requires Node.js 18+ (Vite 5 uses top-level await)
# Frontend only (from project root)
npm run dev:frontend    # Vite on port 3000

# Full stack
npm run dev             # Frontend + backend
npm run dev:clean       # Kill ports first, then start
```

## Build

```bash
npm run build           # Output: dist/public/
```
