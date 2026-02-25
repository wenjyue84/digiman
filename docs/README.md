# PelangiManager Documentation

**AI agents:** For progressive disclosure, read **[INDEX.md](INDEX.md)** first. It defines a hierarchical reading order and when to load each doc; do not load all of `docs/` at once.

## Quick Navigation

| When you need... | Read this |
|------------------|-----------|
| **Doc map (AI agents)** | [INDEX.md](INDEX.md) — hierarchical index, read first |
| Something's broken | [MASTER_TROUBLESHOOTING_GUIDE.md](MASTER_TROUBLESHOOTING_GUIDE.md) |
| Development setup / architecture | [DEVELOPMENT_REFERENCE.md](DEVELOPMENT_REFERENCE.md) |
| **Fleet Manager (http://localhost:9999)** | [FLEET-MANAGER.md](FLEET-MANAGER.md) — local fleet status dashboard |
| Deployment / operations | [DEPLOYMENT_OPERATIONS.md](DEPLOYMENT_OPERATIONS.md) |
| Inter-module API reference | [API-CONTRACT.md](API-CONTRACT.md) |
| PWA features | [PWA_IMPLEMENTATION_GUIDE.md](PWA_IMPLEMENTATION_GUIDE.md) |

## Module Documentation

Each module has its own README with boundary docs:

| Module | README |
|--------|--------|
| Frontend | [client/README.md](../client/README.md) |
| Backend | [server/README.md](../server/README.md) |
| Shared Types | [shared/README.md](../shared/README.md) |
| MCP Server | [mcp-server/README.md](../mcp-server/README.md) |
| MCP Deployment | [mcp-server/DEPLOYMENT.md](../mcp-server/DEPLOYMENT.md) |

## Local services

| Service | URL | Doc |
|---------|-----|-----|
| Fleet Manager | http://localhost:9999 | [FLEET-MANAGER.md](FLEET-MANAGER.md) |

## Specialized Docs

| Topic | File |
|-------|------|
| Intent detection | [INTENT-DETECTION-DECISION-TREE.md](INTENT-DETECTION-DECISION-TREE.md) |
| Multilingual intents | [MULTILINGUAL-INTENT-DETECTION-GUIDE.md](MULTILINGUAL-INTENT-DETECTION-GUIDE.md) |
| WhatsApp unlink detection | [whatsapp-unlink-detection.md](whatsapp-unlink-detection.md) |
| Rainbow templates | [rainbow-template-management.md](rainbow-template-management.md) |
| Environment detection | [ENVIRONMENT_DETECTION_GUIDE.md](ENVIRONMENT_DETECTION_GUIDE.md) |

## Emergency Quick Start

```bash
# Requires Node.js 18+
# Clean restart (fixes 90% of issues)
npm run dev:clean

# If that fails
npx kill-port 5000 3000 && npm run dev

# DB schema mismatch
npm run db:push
```
