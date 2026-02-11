# CLAUDE.md - PelangiManager

Capsule hotel management system: React + TypeScript + Express + PostgreSQL + Drizzle ORM.

## 🎯 Critical Rules
1. **800-Line Rule**: Files >800 lines → ask user about refactoring
2. **Port-First**: Always `npm run dev:clean` to kill ports before starting
3. **Package Manager**: `npm` only (never pnpm/yarn)
4. **Delete Confirmation**: Always ask before deleting files
5. **Main Branch**: Work on `main`, use Conventional Commits

## ⚡ Quick Commands

| Task | Command | Notes |
|------|---------|-------|
| **Start dev** | `npm run dev:clean` | Kills ports 3000/5000 first |
| **Build** | `npm run build` | Production build |
| **Test** | `npm test` | Jest unit tests |
| **Clear cache** | `rm -rf node_modules/.vite && npm run dev` | Component caching issues |
| **Manual port kill** | `npx kill-port 5000 && npx kill-port 3000` | If dev:clean fails |

## 🏗️ Architecture Quick Reference

### Ports & Endpoints
- **Frontend**: `http://localhost:3000` (Vite dev server)
- **Backend**: `http://localhost:5000` (Express API)
- **Proxy**: `/api/*` and `/objects/*` → backend

### Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| State | TanStack Query + React Hook Form + Zod |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Auth | Passport.js sessions |
| Testing | Jest + Playwright |

### Key Directories

| Path | Purpose |
|------|---------|
| `client/src/pages/` | Route components (check-in, check-out, settings, etc.) |
| `client/src/components/` | Reusable UI components |
| `server/routes/` | Express API handlers |
| `server/storage/` | Data layer (dual: PostgreSQL/in-memory) |
| `shared/schema.ts` | Zod schemas + types |
| `docs/` | Troubleshooting guides (read before asking) |

### Workflow Methodology

| Criteria | Use SPARC | Use BMAD |
|----------|-----------|----------|
| Files affected | 1-3 | 4+ |
| File size | <800 lines | ≥800 lines |
| Effort | Hours-1 day | Days-weeks |
| Docs | `.sparc/README.md` | `.bmad/README.md` + `HYBRID-WORKFLOW-GUIDE.md` |

## 🔥 Common Issues → Solutions

| Problem | Solution | Command |
|---------|----------|---------|
| Port conflicts | Clean start | `npm run dev:clean` |
| Component cache stale | Clear Vite cache | `rm -rf node_modules/.vite && npm run dev` |
| Hot reload broken | Restart dev servers | `npx kill-port 5000 3000 && npm run dev` |
| DB schema mismatch | Push schema | `npm run db:push` |
| Import errors | Check path aliases | See `docs/REFACTORING_TROUBLESHOOTING.md` |

## 🎯 Project-Specific Patterns

### Dual Storage System (UNIQUE)
- **Primary**: PostgreSQL (Neon) via Drizzle ORM
- **Fallback**: In-memory storage (auto-failover)
- **Factory**: `server/storage/StorageFactory.ts` selects storage
- **Models**: Guests, Capsules, Users, Problems, Settings, GuestTokens
- **⚠️ Note**: Always test DB connections with minimal scripts first (see `.claude/skills/database-troubleshooting/`)

### Key File Locations

| Feature | File Path |
|---------|-----------|
| Check-in flow | `client/src/pages/check-in.tsx` |
| Check-out flow | `client/src/pages/check-out.tsx` |
| Settings UI | `client/src/pages/settings.tsx` |
| Storage factory | `server/storage/StorageFactory.ts` |
| API routes | `server/routes/*.ts` |
| Shared schemas | `shared/schema.ts` |
| System config | `server/configManager.ts` |

### API Patterns
- **REST**: `/api/{resource}` (CRUD operations)
- **Auth**: Passport.js sessions (not JWT)
- **Files**: `/objects/` endpoints for uploads/downloads
- **WebSocket**: Real-time updates (when needed)

## 🛠️ Skills Integration

| Task | Skill | Example |
|------|-------|---------|
| Token saving (reasoning) | `ollama-cloud`, `qwen-cli` | Analyze code patterns |
| Deep debugging | `kimi-cli`, `deepseek-cli` | Complex logic issues |
| Database issues | `.claude/skills/database-troubleshooting/` | Schema mismatches |
| Zeabur deploy | `.claude/skills/zeabur-deployment/` | Deployment issues |
| Git security | `.claude/skills/git-security-check/` | Pre-commit hook active |

## 🚫 Never Do (Token Saving)
1. Don't create new files unless absolutely necessary
2. Don't create docs/README unless explicitly asked
3. Don't explain standard tools (React, TypeScript, etc.)
4. Don't add TODOs/comments unless user asks
5. Don't refactor beyond the requested scope
6. Don't add error handling for impossible scenarios

## 📚 Docs (Read Before Asking)

| Issue Type | Read First |
|------------|------------|
| Port conflicts, caching | `docs/MASTER_TROUBLESHOOTING_GUIDE.md` |
| Storage/DB errors | `docs/Storage_System_Guide.md` |
| Import/export errors | `docs/REFACTORING_TROUBLESHOOTING.md` |
| SPARC vs BMAD choice | `HYBRID-WORKFLOW-GUIDE.md` |
| Development history | `docs/CLAUDE_PROJECT_NOTES.md` |
| Full architecture | `docs/System_Architecture_Document.md` |

## 🧠 Performance Optimizations

### For Claude (Token Saving)
- **Delegate reasoning** to `ollama-cloud` (3-17s, GPT-4 class) or `qwen-cli` (10s, 2K/day limit)
- **Deep analysis** to `kimi-cli` (1T params, 9-30s)
- **Check memory first** for project context (`.claude/projects/.../memory/MEMORY.md`)
- **Use skills** instead of explaining (git-security, database-troubleshooting, zeabur-deployment)

### For Development
- **Port-first workflow**: `dev:clean` prevents 90% of issues
- **Cache strategy**: Only clear when changes don't appear (rare)
- **Minimal restarts**: Vite hot reload handles most changes
- **DB schema**: Push schema before assuming connection issues

---

**Summary**: Port-first workflow, 800-line rule, `npm` only, ask before deleting, main branch. Read `docs/` before troubleshooting.