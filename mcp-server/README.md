# Pelangi MCP Server

HTTP-based MCP server + Rainbow AI WhatsApp assistant for PelangiManager hostel management.

## Architecture

```
mcp-server/
├── src/
│   ├── index.ts              # Entry point (Express + MCP + WhatsApp)
│   ├── server.ts             # MCP JSON-RPC protocol handler
│   ├── ollama-mcp.ts         # Ollama model MCP tools
│   ├── assistant/            # Rainbow AI WhatsApp assistant
│   │   ├── ai-client.ts      # Multi-provider AI (NVIDIA, Ollama, OpenRouter)
│   │   ├── config-store.ts   # Settings, intents, workflows persistence
│   │   ├── conversation.ts   # Conversation state machine
│   │   ├── fuzzy-matcher.ts  # Intent matching with fuzzy search
│   │   ├── knowledge-base.ts # Knowledge base for RAG
│   │   ├── message-router.ts # Incoming message dispatcher
│   │   ├── workflow-executor.ts  # Multi-step workflow engine
│   │   └── workflow-enhancer.ts  # Real actions (WhatsApp forwarding, API calls)
│   ├── lib/
│   │   ├── baileys-client.ts # WhatsApp via Baileys (direct)
│   │   ├── http-client.ts    # PelangiManager API client
│   │   └── daily-report.ts   # Scheduled daily reports
│   ├── routes/
│   │   └── admin.ts          # /api/rainbow/* admin endpoints
│   ├── tools/                # MCP tool implementations
│   │   ├── registry.ts       # Tool registration
│   │   ├── guests.ts         # Guest read tools
│   │   ├── guests-write.ts   # Guest write tools (check-in, checkout)
│   │   ├── capsules.ts       # Capsule read tools
│   │   ├── capsules-write.ts # Capsule write tools
│   │   ├── dashboard.ts      # Dashboard & analytics tools
│   │   ├── problems.ts       # Problem read tools
│   │   ├── problems-write.ts # Problem write tools
│   │   ├── analytics.ts      # Reports & CSV export
│   │   └── whatsapp.ts       # WhatsApp export tools
│   └── types/
│       └── mcp.ts            # MCP type definitions
├── src/public/
│   └── rainbow-admin.html    # Rainbow AI admin dashboard (SPA)
├── src/assistant/data/        # Runtime config (intents, workflows, settings)
└── .rainbow-kb/               # Knowledge base files
```

## Module Boundary

- Communicates with PelangiManager web app **via HTTP API only** (no direct imports)
- Has its own types in `src/assistant/types.ts` and `src/types/mcp.ts`
- Can be deployed independently on Zeabur
- Does NOT import from `server/`, `client/`, or `shared/`

## Quick Start

```bash
cd mcp-server
npm install
cp .env.example .env    # Edit: add API token, set port
npm run dev             # Starts on port from .env (default 3001, typically 3002)
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PELANGI_API_URL` | Yes | PelangiManager API (e.g., `https://pelangi.zeabur.app`) |
| `PELANGI_API_TOKEN` | Yes | Admin API token from Settings > Security |
| `MCP_SERVER_PORT` | No | Server port (default: 3001) |
| `NVIDIA_API_KEY` | No | For Kimi K2.5 AI provider |
| `OPENROUTER_API_KEY` | No | For OpenRouter free models |
| `NODE_ENV` | No | `production` or `development` |

## MCP Tools (19 total)

### Guest Management (5 tools)
| Tool | Type | Description |
|------|------|-------------|
| `pelangi_list_guests` | Read | List all checked-in guests with pagination |
| `pelangi_get_guest` | Read | Get guest details by ID |
| `pelangi_search_guests` | Read | Search guests by name/capsule/nationality |
| `pelangi_check_in_guest` | Write | Check in a new guest |
| `pelangi_check_out_guest` | Write | Check out a guest |

### Capsule Operations (4 tools)
| Tool | Type | Description |
|------|------|-------------|
| `pelangi_list_capsules` | Read | List all capsules with status |
| `pelangi_get_occupancy` | Read | Get occupancy statistics |
| `pelangi_check_availability` | Read | Get available capsules |
| `pelangi_update_capsule` | Write | Update capsule status/cleaning |

### Dashboard & Analytics (4 tools)
| Tool | Type | Description |
|------|------|-------------|
| `pelangi_get_dashboard` | Read | Bulk fetch dashboard data |
| `pelangi_get_overdue_guests` | Read | List overdue guests |
| `pelangi_get_analytics` | Read | Revenue/occupancy analytics |
| `pelangi_export_csv` | Read | Export data as CSV |

### Problem Tracking (4 tools)
| Tool | Type | Description |
|------|------|-------------|
| `pelangi_list_problems` | Read | List active maintenance issues |
| `pelangi_create_problem` | Write | Create new maintenance problem |
| `pelangi_update_problem` | Write | Update problem status |
| `pelangi_export_whatsapp_issues` | Read | WhatsApp-formatted issues |

### WhatsApp (2 tools)
| Tool | Type | Description |
|------|------|-------------|
| `pelangi_send_whatsapp` | Write | Send WhatsApp message |
| `pelangi_get_whatsapp_status` | Read | Get WhatsApp connection status |

## Rainbow AI Assistant

The WhatsApp AI assistant handles guest inquiries automatically:

- **Intent detection**: Fuzzy matching + semantic matching for 20+ intents
- **Multi-language**: English, Malay, Chinese, Japanese support
- **Workflows**: Multi-step booking, complaint escalation, payment forwarding
- **Knowledge base**: RAG-powered answers from `.rainbow-kb/` files
- **Admin dashboard**: `http://localhost:3002/admin/rainbow` (Settings, Intents, Workflows, KB, Testing)

### AI Providers (configured in admin dashboard)

| Provider | Model | Use Case |
|----------|-------|----------|
| NVIDIA NIM | Kimi K2.5 | Deep reasoning (1T params) |
| Ollama Cloud | GPT-OSS, DeepSeek-v3.1 | Fast general queries |
| OpenRouter | Free models | Fallback |

## MCP Client Configuration

### Claude Code (`~/.claude/mcp_settings.json`)
```json
{
  "mcpServers": {
    "pelangi-mcp": {
      "transport": "http",
      "url": "https://mcp-pelangi.zeabur.app/mcp"
    }
  }
}
```

### Cursor
```json
{
  "mcp": {
    "servers": {
      "pelangi-mcp": {
        "url": "https://mcp-pelangi.zeabur.app/mcp"
      }
    }
  }
}
```

### n8n (HTTP Request node)
- **URL**: `https://mcp-pelangi.zeabur.app/mcp`
- **Method**: POST
- **Body**: JSON-RPC 2.0 format (see Testing section)

## Testing

```bash
# Health check
curl http://localhost:3002/health

# List MCP tools
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Call a tool
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":2}'

# Run unit tests (via admin API)
curl -X POST http://localhost:3002/api/rainbow/tests/run \
  -H "Content-Type: application/json" \
  -d '{"project":"unit"}'
```

## Scripts

```bash
npm run dev       # Development with hot reload
npm run build     # TypeScript compilation
npm start         # Production server
```

## Troubleshooting

**AI Provider Rate Limits:**
If you see `429` errors or rate limit warnings in logs, see [AI-PROVIDER-TROUBLESHOOTING.md](AI-PROVIDER-TROUBLESHOOTING.md) for detailed guidance.

**Common Issues:**
- MCP server not accessible → Check port 3002 is free, verify `.env` port setting
- WhatsApp not connecting → Check phone has internet, QR code not expired
- Tests failing → Ensure web app API is accessible at `PELANGI_API_URL`

See [DEPLOYMENT.md](DEPLOYMENT.md) for Zeabur deployment instructions.
