# digiman — Shared Types (shared/)

Shared type definitions and schemas used by both `client/` and `server/`.

## Files

| File | Purpose |
|------|---------|
| `schema.ts` | Drizzle ORM table definitions + Zod schemas + TypeScript types |
| `utils.ts` | Shared utility functions |

## What Belongs Here

- Database table definitions (Drizzle `pgTable`)
- Zod validation schemas (insert/select)
- TypeScript types derived from schemas
- Utility functions used by both client and server

## What Does NOT Belong Here

- Module-specific types (put in `client/src/types/` or `server/types/`)
- Business logic (put in `server/`)
- UI components (put in `client/`)
- MCP server types (MCP server has its own types in `mcp-server/src/types/`)

## Module Boundary

- Imported by `client/` via `@shared` alias
- Imported by `server/` via relative path
- NOT imported by `mcp-server/` (intentional — MCP server is independently deployable)
