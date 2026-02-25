# digiman — Backend (server/)

Express API server for capsule hotel operations.

## Tech Stack

- Node.js + Express + TypeScript
- PostgreSQL (Neon) + Drizzle ORM
- Passport.js (session auth)
- Multer (file uploads)

## Entry Point

`index.ts` — Express app bootstrap (imported by root `server/vite.ts` in dev)

## Key Files

| File | Purpose |
|------|---------|
| `routes.ts` | Main route registration |
| `routes/` | Route handlers by domain |
| `storage.ts` | Storage interface |
| `Storage/` | Storage implementations |
| `db.ts` | Database connection |
| `configManager.ts` | System configuration |
| `validation.ts` | Input validation |
| `objectStorage.ts` | File upload handling |

## API Routes

| Prefix | Handler | Description |
|--------|---------|-------------|
| `/api/guests/*` | `routes/guests.ts` | Guest CRUD + check-in/out |
| `/api/capsules/*` | `routes/capsules.ts` | Capsule management |
| `/api/dashboard/*` | `routes/dashboard.ts` | Occupancy stats |
| `/api/problems/*` | `routes/problems.ts` | Maintenance tracking |
| `/api/settings/*` | `routes/settings.ts` | System config |
| `/api/auth/*` | `routes/auth.ts` | Authentication |
| `/api/users/*` | `routes/users.ts` | User management |
| `/api/expenses/*` | `routes/expenses.ts` | Finance tracking |
| `/api/guest-tokens/*` | `routes/guest-tokens.ts` | Guest self-service tokens |
| `/api/rainbow-kb/*` | `routes/rainbow-kb.ts` | Knowledge base CRUD |
| `/api/admin/*` | `routes/admin.ts` | Admin operations |
| `/objects/*` | `routes/objects.ts` | File uploads/downloads |

## Dual Storage System

- **Primary**: PostgreSQL via Drizzle ORM (`Storage/DatabaseStorage.ts`)
- **Fallback**: In-memory storage (`Storage/MemStorage.ts`)
- **Factory**: `Storage/StorageFactory.ts` auto-selects based on DB availability

## Module Boundary

- Imports types from `shared/schema.ts`
- Serves the built frontend from `dist/public/` in production
- Does NOT import from `client/` or `mcp-server/`
- MCP server calls this API via HTTP (Bearer token auth)

## Development

```bash
# Requires Node.js 18+
# Backend only (from project root)
npm run dev:server      # Express on port 5000

# Full stack
npm run dev             # Frontend + backend
```
