# CLAUDE.md - PelangiManager

Capsule hotel management system with AI WhatsApp assistant.
Three modules: web app (`client/` + `server/`), MCP server (`mcp-server/`), shared types (`shared/`).

## Critical Rules
1. **800-Line Rule**: Files >800 lines → ask user about refactoring
2. **Port-First**: Always `npm run dev:clean` to kill ports before starting
3. **Package Manager**: `npm` only (never pnpm/yarn)
4. **Delete Confirmation**: Always ask before deleting files
5. **Main Branch**: Work on `main`, use Conventional Commits

## Quick Commands

| Task | Command |
|------|---------|
| Start dev | `npm run dev:clean` (kills ports 3000/5000 first) |
| Build | `npm run build` |
| Test | `npm test` |
| Clear cache | `rm -rf node_modules/.vite && npm run dev` |
| Start MCP server | `cd mcp-server && npm run dev` |
| Push DB schema | `npm run db:push` |

## Architecture

### Three Modules (Clean Boundaries)

| Module | Port | Purpose | Docs |
|--------|------|---------|------|
| `client/` | 3000 | React SPA (Vite) | `client/README.md` |
| `server/` | 5000 | Express API + PostgreSQL | `server/README.md` |
| `mcp-server/` | 3002 | Rainbow AI + MCP tools + WhatsApp | `mcp-server/README.md` |
| `shared/` | — | Drizzle schemas + Zod types | `shared/README.md` |

**Import rules** (enforced):
- `mcp-server/` has ZERO imports from `server/`, `client/`, or `shared/`
- `client/` only imports types from `shared/` (never `server/`)
- `server/` only imports from `shared/` (never `client/` or `mcp-server/`)

### Proxy Config (vite.config.ts)

| Pattern | Target | Description |
|---------|--------|-------------|
| `/api/rainbow-kb/*` | port 5000 | KB CRUD (web backend) |
| `/api/rainbow/*` | port 3002 | Rainbow AI admin (MCP server) |
| `/api/*` | port 5000 | All other API (web backend) |
| `/objects/*` | port 5000 | File uploads |

See `docs/API-CONTRACT.md` for full inter-module API reference.

### Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| State | TanStack Query + React Hook Form + Zod |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Auth | Passport.js sessions |
| AI | NVIDIA Kimi K2.5 + Ollama + OpenRouter |
| WhatsApp | Baileys (direct connection) |
| Testing | Jest + Playwright |

## Key Directories

| Path | Purpose |
|------|---------|
| `client/src/pages/` | Route components |
| `client/src/components/` | Reusable UI components |
| `server/routes/` | Express API route handlers |
| `server/Storage/` | Storage implementations (PostgreSQL + in-memory) |
| `shared/schema.ts` | Drizzle table defs + Zod schemas + types |
| `mcp-server/src/assistant/` | Rainbow AI engine |
| `mcp-server/src/tools/` | MCP tool implementations |
| `mcp-server/src/routes/admin.ts` | Rainbow admin API |
| `docs/` | Documentation |
| `scripts/` | Utility batch/shell scripts |
| `archive/` | Archived files (gitignored) |

## Key File Locations

| Feature | File |
|---------|------|
| Check-in flow | `client/src/pages/check-in.tsx` |
| Check-out flow | `client/src/pages/check-out.tsx` |
| Settings UI | `client/src/pages/settings.tsx` |
| Storage factory | `server/Storage/StorageFactory.ts` |
| API routes | `server/routes/*.ts` |
| Shared schemas | `shared/schema.ts` |
| System config | `server/configManager.ts` |
| Rainbow AI entry | `mcp-server/src/assistant/message-router.ts` |
| MCP tools | `mcp-server/src/tools/registry.ts` |
| WhatsApp client | `mcp-server/src/lib/baileys-client.ts` |
| Rainbow dashboard | `mcp-server/src/public/rainbow-admin.html` |

## Dual Storage System

- **Primary**: PostgreSQL (Neon) via Drizzle ORM
- **Fallback**: In-memory storage (auto-failover)
- **Factory**: `server/Storage/StorageFactory.ts` selects based on DB availability
- **Models**: Guests, Capsules, Users, Problems, Settings, GuestTokens
- Always test DB connections with minimal scripts first

## Common Issues

| Problem | Solution |
|---------|----------|
| Port conflicts | `npm run dev:clean` |
| Component cache stale | `rm -rf node_modules/.vite && npm run dev` |
| DB schema mismatch | `npm run db:push` |
| Import errors | Check `@` and `@shared` aliases in `vite.config.ts` |
| MCP server white page | Check port 3002 is running, port matches `.env` |

## Skills Integration

| Task | Skill |
|------|-------|
| Token saving | `ollama-cloud`, `qwen-cli` |
| Deep debugging | `kimi-cli`, `deepseek-cli` |
| Database issues | `.claude/skills/database-troubleshooting/` |
| Zeabur deploy | `.claude/skills/zeabur-deployment/` |
| Git security | `.claude/skills/git-security-check/` |
| MCP testing | `.claude/skills/mcp-server-testing/` |
| Rainbow troubleshoot | `.claude/skills/rainbow-mcp-troubleshooting/` |

## Never Do (Token Saving)
1. Don't create files unless absolutely necessary
2. Don't create docs/README unless explicitly asked
3. Don't explain standard tools (React, TypeScript, etc.)
4. Don't add TODOs/comments unless user asks
5. Don't refactor beyond the requested scope
6. Don't add error handling for impossible scenarios

## Docs (Read Before Asking)

| Issue Type | Read First |
|------------|------------|
| Port conflicts, caching | `docs/MASTER_TROUBLESHOOTING_GUIDE.md` |
| Storage/DB errors | `docs/Storage_System_Guide.md` |
| Import/export errors | `docs/REFACTORING_TROUBLESHOOTING.md` |
| Inter-module API | `docs/API-CONTRACT.md` |
| Full architecture | `docs/System_Architecture_Document.md` |
