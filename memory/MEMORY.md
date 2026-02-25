# MEMORY.md — digiman project notes

## Project Identity
- **Old name**: PelangiManager-Zeabur (was at `Desktop\Projects\PelangiManager-Zeabur`)
- **New name**: digiman (now at `Documents\1-projects\Projects\digiman`)
- **Folder rename completed**: 2026-02-21

## Architecture (3 modules)
- `client/` port 3000 — React SPA (Vite)
- `server/` port 5000 — Express API
- `RainbowAI/` port 3002 — WhatsApp AI + MCP
- `fleet-manager/` port 9999 — Fleet status dashboard

## All servers startup
- **Pelangi**: `npm run dev:clean` (ports 3000+5000)
- **Pelangi Rainbow AI**: `cd RainbowAI && npm run dev` (port 3002)
- **Southern Manager**: `.env.southern.local` → ports 8000+8001
- **Southern Rainbow AI**: `dotenv-cli -e .env.southern.local` → port 8002
- **Fleet Manager**: `cd fleet-manager && node server.js` (port 9999)
- **Start all**: `start-all.bat` (now uses `Start-Process` — works headlessly from Claude Code)

### Claude Code headless fix (2026-02-22)

`start "title" cmd /k` silently fails in Claude Code (no desktop session). Fixed `start-all.bat` to use:

```bat
powershell -Command "Start-Process cmd -ArgumentList '/k <cmd>' -WorkingDirectory '%CD%[subdir]'"
```

`Start-Process` calls Win32 `CreateProcess` directly — works in both GUI (double-click) and headless (Claude Code) contexts.

## Branding
- Business config: `shared/business-config.ts` → DEFAULT_BUSINESS_CONFIG = "Pelangi Capsule Hostel"
- React hook: `useBusinessConfig()` in `client/src/hooks/useBusinessConfig.ts`
- Server: `getBusinessConfig()` in `server/lib/business-config.ts`
- App title: controlled by `appTitle` setting; fallback = "digiman" (App.tsx)

## Fleet Manager – down services (2026-02-21)
- **Fleet Manager** at `http://localhost:9999/` shows service status. "Down" = that local server isn’t running.
- **Local Pelangi Rainbow** (port 3002): `cd RainbowAI && npm run dev`. If already listening but health times out, restart: `npx kill-port 3002` then start again.
- **Local Southern Rainbow** (port 8002): `cd RainbowAI && npx dotenv-cli -e .env.southern.local -- npx tsx watch --ignore src/public src/index.ts`. Full fix and port table in `docs/fix.md` (Fleet Manager – Down Services).

## Key issues fixed (2026-02-21)
- `App.tsx` fallback title: "Manager" → "digiman"
- `check-in.tsx`: replaced all hardcoded "Pelangi Unit Hostel" with `business.name` via useBusinessConfig
- `start-all.bat`, `deploy.sh`, `fleet-manager-startup.bat`, `register-startup.ps1`, `create-startup-shortcut.ps1`, `RainbowAI/backup-files.ps1`: old paths updated

## Southern Homestay Production DB Migration (2026-02-22)

Schema migration for capsule→unit rename required MANUAL SQL renames — `drizzle-kit push --force`
doesn't skip interactive prompts for column/table renames. Pattern for next migration:

1. **Deploy code first**: `bash deploy.sh southern`
2. **Rename tables via SQL**: `ALTER TABLE capsules RENAME TO units` etc.
3. **Rename columns via SQL**: `ALTER TABLE units RENAME COLUMN number TO unit_number` etc.
4. **Add new columns via SQL**: `ALTER TABLE units ADD COLUMN unit_type TEXT` etc.
5. **Then `db:push --force`** for remaining index/constraint changes

Note: `tablesFilter: ["!sessions"]` in drizzle.config.ts does NOT prevent drizzle from trying to
CREATE sessions during push (filter only applies to DB introspection). Ignore that error — sessions
is managed by passport separately and already exists in DB.

## PRD status summary
See `prd.json` for full story list. Key status:
- US-001 to US-018: passes=true (most renames done)
- US-019: passes=false (configurable seed units)
- US-028: passes=true (check-in.tsx branding fixed)
- US-029: passes=true (document.title fallback fixed)
- US-030: passes=true (script file paths fixed)
- US-023/024/025/026/027: passes=false (Southern infra, WhatsApp, migration — manual ops)
