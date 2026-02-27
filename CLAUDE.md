# CLAUDE.md - PelangiManager

Capsule hotel management system with **Rainbow AI** — a WhatsApp assistant that handles guest inquiries, bookings, complaints, and escalations automatically.
Three modules: web app (`client/` + `server/`), MCP server (`RainbowAI/`), shared types (`shared/`).

## Critical Rules

1. **800-Line Rule**: Files >800 lines → ask user about refactoring
2. **Port-First**: Always `npm run dev:clean` to kill ports before starting
3. **Package Manager**: `npm` only (never pnpm/yarn)
4. **Delete Confirmation**: Always ask before deleting files
5. **Main Branch**: Work on `main`, use Conventional Commits

## Environment

This is a Windows development environment. When generating shell scripts, ALWAYS use LF line endings (not CRLF). Use `dos2unix` or write files with explicit LF. Bash scripts with CRLF will silently fail. Also prefer PowerShell over curl for HTTP requests on Windows.

## Deployment

When deploying to AWS Lightsail nano instances (512MB), ALWAYS build locally and transfer the tarball. Never run `npm install` on the instance — it will OOM-kill. Use `npm install --omit=dev`, build locally, tar the result, scp to server, and extract.

## Resource Management

When spawning background tasks or sub-agents, limit concurrent tasks to 3-4 maximum. Excessive parallel browser tasks or background processes cause OOM and crash the system. Always clean up zombie node processes before starting new servers (check with `netstat -ano | findstr "LISTENING"`).

## Tech Stack & Conventions

The primary stack is TypeScript (backend) + HTML/CSS/JavaScript (frontend dashboard). Use TypeScript for all backend code. The frontend uses modular CSS served via Express static middleware. When fixing CSS selectors, always inspect the actual DOM structure (`#app-sidebar`, `.app-topbar`) rather than assuming generic selectors (`body > header`).

After making CSS or UI changes, always verify by checking the actual rendered output. When adding Express static middleware, mount at the correct prefix (usually root `/` not `/public/`). Test that assets return 200, not 404.

## Database

**Two Postgres databases:**
- **Neon (Drizzle ORM):** Web app data — guests, capsules, users, settings. Schema in `shared/schema.ts`.
- **Neon (raw pg):** Rainbow AI config sync — `rainbow_configs`, `rainbow_kb_files`, `rainbow_config_audit`. Managed by `RainbowAI/src/lib/config-db.ts`.

Both use the same Neon Postgres instance but different tables. The config-db uses raw `pg` Pool (not Drizzle) to avoid coupling Rainbow AI to the web app schema.

When fixing database queries, be careful about column name casing. The database may use snake_case while the TypeScript code uses camelCase. Always verify the actual column names in the schema before writing queries. Also verify query time windows — matching 'duplicate' messages across weeks is wrong; use tight time windows (< 60 seconds).

## Production Architecture (Two Services, Different Homes)

> **Website always on Lightsail. Rainbow AI uses Lightsail (primary) + local PC (standby).**

| Service | Production Home | Reason |
| ------- | --------------- | ------ |
| **Website** (frontend + API, ports 80/5000) | **Lightsail only** | Stateless — colleagues need 24/7 access without your PC being on |
| **Rainbow AI** (port 3002) | **Lightsail (primary) + Local PC (standby)** | Lightsail is always-on 24/7; local PC behind NAT can't receive heartbeats |

**Config storage:** All Rainbow AI configs stored in shared Neon Postgres (`rainbow_configs` table). Both servers read from DB on startup. Changes via dashboard are dual-written (local file + DB). Audit trail in `rainbow_config_audit` table.

**Rainbow AI Failover rules:**
- Lightsail (`RAINBOW_ROLE=primary`) — sends WhatsApp replies, always-on
- Local PC (`RAINBOW_ROLE=standby`) — polls Lightsail `/health` every 10s (pull mode), activates after 60s unreachable
- When Lightsail comes back → local PC detects via poll and immediately steps down

## Quick Commands

| Task              | Command                                           |
| ----------------- | ------------------------------------------------- |
| **Start all (full fleet)** | `start-all.bat` ⭐ (starts Pelangi :3000/:5000/:3002 + Southern :8000/:8001/:8002 + Fleet :9999) |
| **Start Pelangi only** | `npm run dev:clean` (kills ports 3000/5000 first) |
| **Start Southern standby** | `start-southern.bat` (ports 8000/8001/8002) |
| **Fleet Manager** | `cd fleet-manager && node server.js` → http://localhost:9999 |
| **Check health**  | `check-health.bat` (verify all local servers running)   |
| Start Pelangi Rainbow AI | `cd RainbowAI && npm run dev`                 |
| Build             | `npm run build`                                   |
| Test              | `npm test`                                        |
| Clear cache       | `rm -rf node_modules/.vite && npm run dev`        |
| Push DB schema    | `npm run db:push`                                 |
| **Deploy website** | `./deploy.sh` (builds + uploads to Lightsail)   |
| **Deploy Rainbow** | `./deploy.sh` (same script, Lightsail primary) |

**⚠️ LOCAL DEV ONLY:** All local servers are STANDBY only. Local Rainbow AI instances use `RAINBOW_ROLE=standby` and will NOT reply to WhatsApp guests unless the corresponding Lightsail instance is unreachable for 60+ seconds.

**Local port map:**
```
LOCAL PC
├── Pelangi Manager  — Vite :3000 → Express :5000   (Pelangi standby)
├── Pelangi Rainbow  — :3002  RAINBOW_ROLE=standby
├── Southern Manager — Vite :8000 → Express :8001   (Southern standby, start-southern.bat)
├── Southern Rainbow — :8002  RAINBOW_ROLE=standby  (start-southern.bat)
└── Fleet Manager    — :9999  standalone             (fleet-manager/server.js)
```

If dashboard shows "Loading..." → verify all 3 servers running locally, then hard refresh browser (`Ctrl+Shift+R`). See `fix.md` for full troubleshooting.

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
**Dashboard:** `https://rainbow.pelangicapsulehostel.com/admin/rainbow` (prod) or `http://localhost:3002/admin/rainbow` (local)

### Rainbow Conventions (Must Follow)

1. **Routing is separate from classification** — intents classify what the user said; `routing.json` decides the action
2. **Multi-language always** — any new template/response needs `en`, `ms`, `zh` variants
3. **Escalation triggers** — emergency regex, complaint intent, low confidence, repeat intent 3×, negative sentiment
4. **KB is progressive** — only load topic files matching the message, never dump everything
5. **Config is dual-written** — `config-store.ts` writes local file (sync) + Postgres DB (async). DB is primary on startup; local file is fallback. Audit trail in `rainbow_config_audit` table.
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
| `docs/FLEET-MANAGER.md`          | Fleet Manager (http://localhost:9999)            |
| `fleet-manager/`                 | Fleet Manager app (server.js + public dashboard)  |
| `scripts/`                       | Project-wide utility scripts                     |
| `archive/`                       | Archived files (gitignored)                      |
| `deploy.sh`                      | Lightsail full deployment script                 |
| `ecosystem.config.cjs`           | PM2 process definitions (production)             |
| `lightsail-nginx.sh`             | nginx reverse proxy setup script                 |
| `lightsail-backup.sh`            | Automated snapshot backup script                 |

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
| **Config DB**         | `RainbowAI/src/lib/config-db.ts`            |
| **LLM settings**      | `RainbowAI/src/assistant/llm-settings-loader.ts` |
| **Failover**          | `RainbowAI/src/lib/failover-coordinator.ts` |
| **Conversation**      | `RainbowAI/src/assistant/conversation.ts`   |
| **Workflow engine**   | `RainbowAI/src/assistant/workflow-executor.ts` |
| MCP tools             | `RainbowAI/src/tools/registry.ts`           |
| WhatsApp client       | `RainbowAI/src/lib/baileys-client.ts`       |
| Rainbow dashboard     | `RainbowAI/src/public/rainbow-admin.html`   |
| Rainbow admin API     | `RainbowAI/src/routes/admin.ts`             |

## AWS Lightsail Production

### Instance

| Spec | Value |
| ---- | ----- |
| Instance name | `pelangi-production-v2` |
| Type | `micro_3_0` (1GB RAM, 40GB SSD) |
| Static IP | `18.142.14.142` (`pelangi-static-ip`) |
| OS | Ubuntu 22.04 LTS |
| Region | `ap-southeast-1` (Singapore) |
| SSH key | `~/.ssh/LightsailDefaultKeyPair.pem` |
| Cost | $7/mo (dual-stack) |

### Production URLs

| Service | URL | Served By | Always On? |
| ------- | --- | --------- | ---------- |
| **Frontend (Pelangi)** | `https://admin.pelangicapsulehostel.com/` | Cloudflare → nginx → `dist/public` | ✅ |
| **Frontend (Southern)** | `https://admin.southern-homestay.com/` | Cloudflare → nginx → `dist/public` | ✅ |
| **API** | `https://admin.pelangicapsulehostel.com/api/*` | Cloudflare → nginx → PM2 port 5000 | ✅ |
| **Rainbow AI Dashboard** | `https://rainbow.pelangicapsulehostel.com/` | Cloudflare → PM2 `rainbow-ai` port 3002 | ✅ |
| **Rainbow AI (local)** | `http://localhost:3002/` | Local dev server (standby) | When PC is on |
| **Raw IP (fallback)** | `http://18.142.14.142/` | nginx direct | ✅ |

**Note:** Port 3000 does NOT run in production — nginx on port 80 serves the pre-built frontend.

**Rainbow AI dual-server:** Lightsail `rainbow-ai` runs as **primary** (`RAINBOW_ROLE=primary`) — always-on, handles all WhatsApp messages. Local PC runs as **standby** (`RAINBOW_ROLE=standby`) and polls Lightsail's `/health` endpoint every 10s. If Lightsail is unreachable for 60+ seconds, local PC activates automatically. When Lightsail is reachable again, local PC deactivates. Dashboard is accessible on both servers independently. All config is shared via Neon Postgres (`rainbow_configs` table).

### PM2 Processes (`ecosystem.config.cjs`)

| Process | Script | Port | Heap Limit | Restart At |
| ------- | ------ | ---- | ---------- | ---------- |
| `pelangi-api` | `dist/server/index.js` | 5000 | 350MB | 400MB |
| `rainbow-ai` | `RainbowAI/dist/index.js` | 3002 | 450MB | 500MB |

Both use `fork` mode (not cluster — cluster breaks ESM imports).

### Deployment

```bash
# Full deploy (build + upload + restart)
./deploy.sh

# Skip build (upload existing dist/)
./deploy.sh --skip-build

# SSH into instance
ssh -i ~/.ssh/LightsailDefaultKeyPair.pem ubuntu@18.142.14.142

# Check PM2 status remotely
ssh -i ~/.ssh/LightsailDefaultKeyPair.pem ubuntu@18.142.14.142 'pm2 list'

# View logs remotely
ssh -i ~/.ssh/LightsailDefaultKeyPair.pem ubuntu@18.142.14.142 'pm2 logs --lines 50'
```

**Critical deployment rules** (see `.claude/skills/lightsail-deployment/SKILL.md` for full details):
- NEVER `npm install` without `--omit=dev` on the server (OOM risk)
- Always build locally, upload pre-built artifacts only
- 2GB swap must be active before any Node.js work
- Use esbuild for RainbowAI (not tsc — rootDir errors in monorepo)

### Deployment Scripts

| Script | Purpose |
| ------ | ------- |
| `deploy.sh` | Full deployment (build → package → upload → install → restart) |
| `deploy-frontend.sh` | Frontend-only deployment |
| `lightsail-nginx.sh` | nginx config setup (run on server) |
| `lightsail-backup.sh` | Weekly snapshot backup with rotation |
| `setup-weekly-backup.sh` | Cron setup for automated backups |
| `download-backups.sh` | Download backup snapshots |

### Firewall (Open Ports)

| Port | Service |
| ---- | ------- |
| 22 | SSH |
| 80 | nginx (frontend + API proxy) |
| 3002 | Rainbow AI (direct access) |

## Dual Storage System

**Web App (Drizzle ORM):**
- **Primary**: PostgreSQL (Neon) via Drizzle ORM
- **Fallback**: In-memory storage (auto-failover)
- **Factory**: `server/Storage/StorageFactory.ts` selects based on DB availability
- **Models**: Guests, Capsules, Users, Problems, Settings, GuestTokens

**Rainbow AI Config (raw pg):**
- **Primary**: PostgreSQL (Neon) — `rainbow_configs` (JSONB), `rainbow_kb_files`, `rainbow_config_audit`
- **Fallback**: Local JSON files in `RainbowAI/src/assistant/data/`
- **Pattern**: DB-first read on startup, dual-write (local + DB) on save, fire-and-forget async DB writes
- **Migration**: `npx tsx RainbowAI/scripts/migrate-configs-to-db.ts` (one-time seed from JSON to DB)
- **Audit API**: `GET /api/rainbow/config-audit?limit=50`
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
| WhatsApp not connecting | Check phone internet, QR not expired, Baileys session in `RainbowAI/whatsapp-auth/`. Verify `authDir` in `whatsapp-data/instances.json` matches actual project path |
| AI rate limited (429) | Provider hit limit — check logs, fallback chain should auto-switch |
| Config file corrupted | Restore from git; `config-store.ts` uses atomic writes to prevent this |
| **Production nginx 502** | PM2 process crashed — `ssh ubuntu@18.142.14.142 'pm2 list && pm2 restart all'` |
| **Production OOM** | Check swap with `free -h`; add 2GB swap if missing (see Lightsail skill) |
| **Deploy fails** | Run `./deploy.sh`; check SSH key exists at `~/.ssh/LightsailDefaultKeyPair.pem` |
| **Both servers replying to guests** | Both are `RAINBOW_ROLE=primary` — local PC `.env` must be `RAINBOW_ROLE=standby` |
| **Local PC not taking over when Lightsail down** | Check `RAINBOW_PEER_URL` in local `.env` points to Lightsail; verify `RAINBOW_FAILOVER_SECRET` matches; confirm local PC is linked as 2nd WA device |
| **Website down** (colleagues can't access) | Check Lightsail PM2: `pm2 list`. Website always on Lightsail — unrelated to local PC |
| **Failover tab not loading** | Settings → 🔁 Failover; ensure `RAINBOW_ROLE` is set in `.env` and server restarted |

## Skills Integration

| Task                 | Skill                                         |
| -------------------- | --------------------------------------------- |
| Token saving         | `ollama-cloud`, `qwen-cli`                    |
| Deep debugging       | `kimi-cli`, `deepseek-cli`                    |
| **Lightsail deploy** | `.claude/skills/lightsail-deployment/`        |
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
| **Fleet Manager (localhost:9999)** | `docs/FLEET-MANAGER.md` — fleet dashboard, start, endpoints |
| Port conflicts, caching | `docs/MASTER_TROUBLESHOOTING_GUIDE.md` |
| Storage/DB errors | `docs/Storage_System_Guide.md` |
| Import/export errors | `docs/REFACTORING_TROUBLESHOOTING.md` |
| Inter-module API | `docs/API-CONTRACT.md` |
| Full architecture | `docs/System_Architecture_Document.md` |
| Rainbow AI overview | `RainbowAI/README.md` |
| Rainbow AI troubleshoot | `RainbowAI/AI-PROVIDER-TROUBLESHOOTING.md` |
| Rainbow admin dashboard | `RainbowAI/docs/` |
| Rainbow intent system | `RainbowAI/src/assistant/data/intents.json` + `routing.json` |
| **Lightsail deployment** | `.claude/skills/lightsail-deployment/SKILL.md` |
| PM2 ecosystem config | `ecosystem.config.cjs` |

<!-- gitnexus:start -->
# GitNexus MCP

This project is indexed by GitNexus as **digiman** (9922 symbols, 21261 relationships, 300 execution flows).

GitNexus provides a knowledge graph over this codebase — call chains, blast radius, execution flows, and semantic search.

## Always Start Here

For any task involving code understanding, debugging, impact analysis, or refactoring, you must:

1. **Read `gitnexus://repo/{name}/context`** — codebase overview + check index freshness
2. **Match your task to a skill below** and **read that skill file**
3. **Follow the skill's workflow and checklist**

> If step 1 warns the index is stale, run `npx gitnexus analyze` in the terminal first.

## Skills

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/refactoring/SKILL.md` |

## Tools Reference

| Tool | What it gives you |
|------|-------------------|
| `query` | Process-grouped code intelligence — execution flows related to a concept |
| `context` | 360-degree symbol view — categorized refs, processes it participates in |
| `impact` | Symbol blast radius — what breaks at depth 1/2/3 with confidence |
| `detect_changes` | Git-diff impact — what do your current changes affect |
| `rename` | Multi-file coordinated rename with confidence-tagged edits |
| `cypher` | Raw graph queries (read `gitnexus://repo/{name}/schema` first) |
| `list_repos` | Discover indexed repos |

## Resources Reference

Lightweight reads (~100-500 tokens) for navigation:

| Resource | Content |
|----------|---------|
| `gitnexus://repo/{name}/context` | Stats, staleness check |
| `gitnexus://repo/{name}/clusters` | All functional areas with cohesion scores |
| `gitnexus://repo/{name}/cluster/{clusterName}` | Area members |
| `gitnexus://repo/{name}/processes` | All execution flows |
| `gitnexus://repo/{name}/process/{processName}` | Step-by-step trace |
| `gitnexus://repo/{name}/schema` | Graph schema for Cypher |

## Graph Schema

**Nodes:** File, Function, Class, Interface, Method, Community, Process
**Edges (via CodeRelation.type):** CALLS, IMPORTS, EXTENDS, IMPLEMENTS, DEFINES, MEMBER_OF, STEP_IN_PROCESS

```cypher
MATCH (caller)-[:CodeRelation {type: 'CALLS'}]->(f:Function {name: "myFunc"})
RETURN caller.name, caller.filePath
```

<!-- gitnexus:end -->
