# PelangiManager

Capsule hotel management system with AI-powered WhatsApp assistant.

## Architecture

```
PelangiManager-Zeabur/
├── client/          # React frontend (port 3000)
├── server/          # Express backend (port 5000)
├── shared/          # Shared types (Drizzle schemas, Zod)
├── mcp-server/      # Rainbow AI + MCP server (port 3002)
├── docs/            # Documentation
└── scripts/         # Utility scripts
```

Three independent modules communicate via HTTP APIs:

| Module | Purpose | Port | Docs |
|--------|---------|------|------|
| **client/** | React SPA — dashboard, check-in/out, settings | 3000 | [client/README.md](client/README.md) |
| **server/** | Express API — guests, capsules, auth, DB | 5000 | [server/README.md](server/README.md) |
| **mcp-server/** | Rainbow AI WhatsApp bot + MCP tools | 3002 | [mcp-server/README.md](mcp-server/README.md) |
| **shared/** | Drizzle schemas, Zod types | — | [shared/README.md](shared/README.md) |

See [docs/API-CONTRACT.md](docs/API-CONTRACT.md) for inter-module communication details.

## Tech Stack

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
| Deploy | Zeabur |

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env        # Edit with your DB URL + API keys

# Push database schema
npm run db:push

# Start development (kills ports, starts frontend + backend)
npm run dev:clean
```

### Alternative: One-Click Backend Start

If the backend server (port 5000) is not running, the login page will automatically detect this and show a **"Start Backend Server"** button. Just click it to start the backend without using the terminal! See [docs/AUTO-START-BACKEND-FEATURE.md](docs/AUTO-START-BACKEND-FEATURE.md) for details.

### Start MCP Server (separate terminal)

```bash
cd mcp-server
npm install
cp .env.example .env        # Edit with API token + port
npm run dev
```

### Default Credentials

- **Admin**: `admin` / `admin123`

## Key Features

- **Guest Management**: Check-in/out, search, history, guest self-service
- **Capsule Operations**: Occupancy tracking, availability, cleaning status
- **Maintenance**: Problem reporting, tracking, WhatsApp export
- **Finance**: Expense tracking, analytics
- **Rainbow AI**: WhatsApp bot with intent detection, multi-language, knowledge base
- **MCP Tools**: 19 tools for programmatic hostel management
- **PWA**: Installable mobile app with offline support
- **Dev UX**: One-click backend start button on login page (no terminal needed!)

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:clean` | Kill ports + start full-stack dev |
| `npm run dev` | Start frontend + backend |
| `npm run build` | Production build |
| `npm test` | Run unit tests |
| `npm run db:push` | Push schema to database |
| `npm run check` | TypeScript type checking |

## Documentation

| Doc | Description |
|-----|-------------|
| [API Contract](docs/API-CONTRACT.md) | Inter-module HTTP API reference |
| [System Architecture](docs/System_Architecture_Document.md) | Full architecture overview |
| [Storage System](docs/Storage_System_Guide.md) | Dual storage (PostgreSQL + in-memory) |
| [Troubleshooting](docs/MASTER_TROUBLESHOOTING_GUIDE.md) | Common issues and fixes |
| [MCP Deployment](mcp-server/DEPLOYMENT.md) | Zeabur deployment guide |

## License

MIT
