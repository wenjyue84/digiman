# CLAUDE.md - PelangiManager

Capsule hotel management system with **Rainbow AI** — a WhatsApp assistant that handles guest inquiries, bookings, complaints, and escalations automatically.
Three modules: web app (`client/` + `server/`), MCP server (`RainbowAI/`), shared types (`shared/`).

## Critical Rules

1. **800-Line Rule**: Files >800 lines → ask user about refactoring
2. **Port-First**: Always `npm run dev:clean` to kill ports before starting
3. **Package Manager**: `npm` only (never pnpm/yarn)
4. **Delete Confirmation**: Always ask before deleting files
5. **Main Branch**: Work on `main`, use Conventional Commits

## Quick Commands

| Task              | Command                                           |
| ----------------- | ------------------------------------------------- |
| **Start all servers** | `start-all.bat` ⭐ (recommended - starts all 3 servers automatically) |
| **Check health**  | `check-health.bat` (verify all servers running)   |
| Start dev         | `npm run dev:clean` (kills ports 3000/5000 first) |
| Start MCP server  | `cd RainbowAI && npm run dev`                     |
| Build             | `npm run build`                                   |
| Test              | `npm test`                                        |
| Clear cache       | `rm -rf node_modules/.vite && npm run dev`        |
| Push DB schema    | `npm run db:push`                                 |

**🚀 Daily Startup:** Run `start-all.bat` to start all 3 servers with one command!

**⚠️ CRITICAL:** Rainbow dashboard (`http://localhost:3002`) requires **ALL 3 servers running**:
- Port 3000: Frontend (Vite)
- Port 5000: Backend API (Express) — MCP server fetches data from here!
- Port 3002: MCP server (Rainbow AI)

If dashboard shows "Loading..." → verify all 3 servers running, then hard refresh browser (`Ctrl+Shift+R`). See `fix.md` for full troubleshooting.

## Architecture

### Three Modules (Clean Boundaries)

| Module        | Port | Purpose                           | Docs                   |
| ------------- | ---- | --------------------------------- | ---------------------- |
| `client/`     | 3000 | React SPA (Vite)                  | `client/README.md`     |
| `server/`     | 5000 | Express API + PostgreSQL          | `server/README.md`     |
| `RainbowAI/` | 3002 | Rainbow AI + MCP tools + WhatsApp | `RainbowAI/README.md` |
| `shared/`     | —    | Drizzle schemas + Zod types       | `shared/README.md`     |

**Import rules** (enforced):

- `RainbowAI/` has ZERO imports from `server/`, `client/`, or `shared/`
- `client/` only imports types from `shared/` (never `server/`)
- `server/` only imports from `shared/` (never `client/` or `RainbowAI/`)

### Proxy Config (vite.config.ts)

| Pattern             | Target    | Description                   |
| ------------------- | --------- | ----------------------------- |
| `/api/rainbow-kb/*` | port 5000 | KB CRUD (web backend)         |
| `/api/rainbow/*`    | port 3002 | Rainbow AI admin (MCP server) |
| `/api/*`            | port 5000 | All other API (web backend)   |
| `/objects/*`        | port 5000 | File uploads                  |

See `docs/API-CONTRACT.md` for full inter-module API reference.

### Tech Stack

| Layer    | Tech                                                |
| -------- | --------------------------------------------------- |
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| State    | TanStack Query + React Hook Form + Zod              |
| Backend  | Node.js + Express + TypeScript                      |
| Database | PostgreSQL (Neon) + Drizzle ORM                     |
| Auth     | Passport.js sessions                                |
| AI       | NVIDIA Kimi K2.5 + Ollama + OpenRouter              |
| WhatsApp | Baileys (direct connection)                         |
| Testing  | Jest + Playwright                                   |

## Rainbow AI Assistant

WhatsApp AI concierge — handles guest inquiries, bookings, complaints, escalation in en/ms/zh.

**Full reference:** `RainbowAI/README.md` (pipeline, tiers, KB, workflows, providers, data files)
**Live config:** `RainbowAI/src/assistant/data/settings.json` (providers, routing, rate limits, staff phones)
**Dashboard:** `http://localhost:3002/admin/rainbow` (Connect / Train / Test / Monitor sections)

### Rainbow Conventions (Must Follow)

1. **Routing is separate from classification** — intents classify what the user said; `routing.json` decides the action
2. **Multi-language always** — any new template/response needs `en`, `ms`, `zh` variants
3. **Escalation triggers** — emergency regex, complaint intent, low confidence, repeat intent 3×, negative sentiment
4. **KB is progressive** — only load topic files matching the message, never dump everything
5. **Config is atomic** — `config-store.ts` writes `.tmp` then `renameSync` to prevent corruption
6. **Admin API auth** — localhost is unauthenticated; remote requires `X-Admin-Key` header
7. **Test before deploy** — use Chat Simulator tab to verify intent changes before production

## Key Directories

| Path                             | Purpose                                          |
| -------------------------------- | ------------------------------------------------ |
| `client/src/pages/`              | Route components                                 |
| `client/src/components/`         | Reusable UI components                           |
| `server/routes/`                 | Express API route handlers                       |
| `server/Storage/`                | Storage implementations (PostgreSQL + in-memory) |
| `shared/schema.ts`               | Drizzle table defs + Zod schemas + types         |
| `RainbowAI/src/assistant/`      | Rainbow AI engine                                |
| `RainbowAI/src/tools/`          | MCP tool implementations                         |
| `RainbowAI/src/routes/admin.ts` | Rainbow admin API (~50 endpoints)                |
| `RainbowAI/.rainbow-kb/`         | Knowledge base markdown files (RAG source)       |
| `RainbowAI/scripts/`             | Rainbow-specific scripts (health check, startup) |
| `RainbowAI/reports/autotest/`    | Rainbow autotest HTML reports                    |
| `RainbowAI/docs/`                | Rainbow documentation                            |
| `docs/`                          | Project-wide documentation                       |
| `scripts/`                       | Project-wide utility scripts                     |
| `archive/`                       | Archived files (gitignored)                      |

## Key File Locations

| Feature               | File                                         |
| --------------------- | -------------------------------------------- |
| Check-in flow         | `client/src/pages/check-in.tsx`              |
| Check-out flow        | `client/src/pages/check-out.tsx`             |
| Settings UI           | `client/src/pages/settings.tsx`              |
| Storage factory       | `server/Storage/StorageFactory.ts`           |
| API routes            | `server/routes/*.ts`                         |
| Shared schemas        | `shared/schema.ts`                           |
| System config         | `server/configManager.ts`                    |
| **Rainbow entry**     | `RainbowAI/src/assistant/message-router.ts` |
| **Intent matching**   | `RainbowAI/src/assistant/fuzzy-matcher.ts`  |
| **Semantic matching** | `RainbowAI/src/assistant/semantic-matcher.ts`|
| **AI client**         | `RainbowAI/src/assistant/ai-client.ts`      |
| **Knowledge base**    | `RainbowAI/src/assistant/knowledge-base.ts` |
| **Config store**      | `RainbowAI/src/assistant/config-store.ts`   |
| **Conversation**      | `RainbowAI/src/assistant/conversation.ts`   |
| **Workflow engine**   | `RainbowAI/src/assistant/workflow-executor.ts` |
| MCP tools             | `RainbowAI/src/tools/registry.ts`           |
| WhatsApp client       | `RainbowAI/src/lib/baileys-client.ts`       |
| Rainbow dashboard     | `RainbowAI/src/public/rainbow-admin.html`   |
| Rainbow admin API     | `RainbowAI/src/routes/admin.ts`             |

## Dual Storage System

- **Primary**: PostgreSQL (Neon) via Drizzle ORM
- **Fallback**: In-memory storage (auto-failover)
- **Factory**: `server/Storage/StorageFactory.ts` selects based on DB availability
- **Models**: Guests, Capsules, Users, Problems, Settings, GuestTokens
- Always test DB connections with minimal scripts first

## Common Issues

| Problem | Solution |
| --- | --- |
| Port conflicts | `npm run dev:clean` |
| Component cache stale | `rm -rf node_modules/.vite && npm run dev` |
| DB schema mismatch | `npm run db:push` |
| Import errors | Check `@` and `@shared` aliases in `vite.config.ts` |
| MCP server white page | Check port 3002 is running, port matches `.env` |
| **Dashboard "Loading..." stuck** | **Run `check-health.bat` to verify servers, or `start-all.bat` to restart all. Then hard refresh (`Ctrl+Shift+R`). See `docs/fix.md`** |
| Rainbow AI not replying | Check AI providers in `settings.json`, verify API keys in `.env` |
| Intent misclassified | Check `intent-keywords.json` (T2) and `intent-examples.json` (T3), test in Chat Simulator |
| Wrong routing action | Check `routing.json` intent→action mapping |
| KB not loading topic | Check `guessTopicFiles()` regex in `knowledge-base.ts` matches your topic file |
| WhatsApp not connecting | Check phone internet, QR not expired, Baileys session in `RainbowAI/auth/` |
| AI rate limited (429) | Provider hit limit — check logs, fallback chain should auto-switch |
| Config file corrupted | Restore from git; `config-store.ts` uses atomic writes to prevent this |

## Skills Integration

| Task                 | Skill                                         |
| -------------------- | --------------------------------------------- |
| Token saving         | `ollama-cloud`, `qwen-cli`                    |
| Deep debugging       | `kimi-cli`, `deepseek-cli`                    |
| Database issues      | `.claude/skills/database-troubleshooting/`    |
| Zeabur deploy        | `.claude/skills/zeabur-deployment/`           |
| Git security         | `.claude/skills/git-security-check/`          |
| MCP testing          | `.claude/skills/mcp-server-testing/`          |
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
| --- | --- |
| **Doc map (progressive disclosure)** | `docs/INDEX.md` — read first to choose which doc to load |
| Port conflicts, caching | `docs/MASTER_TROUBLESHOOTING_GUIDE.md` |
| Storage/DB errors | `docs/Storage_System_Guide.md` |
| Import/export errors | `docs/REFACTORING_TROUBLESHOOTING.md` |
| Inter-module API | `docs/API-CONTRACT.md` |
| Full architecture | `docs/System_Architecture_Document.md` |
| Rainbow AI overview | `RainbowAI/README.md` |
| Rainbow AI troubleshoot | `RainbowAI/AI-PROVIDER-TROUBLESHOOTING.md` |
| Rainbow admin dashboard | `RainbowAI/docs/` |
| Rainbow intent system | `RainbowAI/src/assistant/data/intents.json` + `routing.json` |
