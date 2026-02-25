# Fleet Manager (localhost:9999)

**URL:** [http://localhost:9999](http://localhost:9999)

The Fleet Manager is a **local-only** dashboard that shows the status of all local development services (Pelangi Manager, Pelangi Rainbow AI, Southern Manager, Southern Rainbow AI). It runs on port **9999** and is restricted to localhost access only.

## Purpose

- **Single pane of glass** — See health of Pelangi (3000/5000/3002) and Southern (8000/8001/8002) from one page.
- **Health proxy** — The dashboard uses same-origin requests to avoid CORS when checking backend health; the Fleet Manager proxies `/api/health-proxy?url=...` to localhost targets.
- **Local only** — Binds to `127.0.0.1`; non-localhost requests receive `403 Fleet Manager: localhost access only`.

## How to start

| Method | Command |
|--------|--------|
| **Manual** | `cd fleet-manager && node server.js` |
| **Full fleet** | `start-all.bat` (starts Pelangi + Southern + Fleet Manager and opens http://localhost:9999) |
| **Dedicated startup** | `fleet-manager-startup.bat` (Fleet Manager only) |
| **npm (forever)** | `npm run fleet-manager:start` |
| **npm (PM2)** | `npm run fleet-manager:pm2:start` |

When running, the server logs:

```
Fleet Manager running at http://localhost:9999
Access restricted to localhost only.
Health: http://localhost:9999/health  Metrics: http://localhost:9999/metrics
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard UI (static files from `fleet-manager/public/`) |
| `GET /health` | JSON health (status, pid, uptime, memory, node version) |
| `GET /metrics` | JSON metrics (same + port, platform, timestamps) |
| `GET /api/health-proxy?url=<encoded-localhost-url>` | Proxies a GET request to a localhost URL (used by dashboard to check :5000, :8001, :3002, :8002 without CORS) |

## npm scripts (root package.json)

| Script | Purpose |
|--------|--------|
| `npm run fleet-manager:start` | Start with forever |
| `npm run fleet-manager:stop` | Stop forever process |
| `npm run fleet-manager:restart` | Restart forever process |
| `npm run fleet-manager:logs` | Tail forever logs |
| `npm run fleet-manager:pm2:start` | Start with PM2 (`ecosystem.local.cjs`) |
| `npm run fleet-manager:pm2:stop` | Stop PM2 process |
| `npm run fleet-manager:pm2:restart` | Restart PM2 process |
| `npm run fleet-manager:pm2:logs` | Tail PM2 logs |
| `npm run fleet-manager:health` | Call `http://localhost:9999/health` (PowerShell) |
| `npm run fleet-manager:metrics` | Call `http://localhost:9999/metrics` (PowerShell) |

## Port and process

- **Port:** 9999 (fixed in `fleet-manager/server.js`; overridable via `PORT` in PM2/forever env).
- **Process:** Standalone Node.js (Express). Not part of the main web app or Rainbow AI; no Drizzle, no shared schema.
- **Kill port (Windows):** `npx kill-port 9999` or included in `start-all.bat`’s initial kill list (3000, 5000, 3002, 8000, 8001, 8002, 9999).

## Related

- **CLAUDE.md** — Quick Commands table and Local port map.
- **start-all.bat** — Starts all local services including Fleet Manager and opens http://localhost:9999.
- **RainbowAI/src/routes/admin/fleet.ts** — Fleet-related API used by the dashboard (e.g. X-Admin-Key auth from Fleet Manager).
