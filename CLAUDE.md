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

Rainbow is the core intelligence of this project — a WhatsApp AI concierge that answers guest inquiries, handles bookings, escalates complaints, and manages conversations in English, Malay, and Chinese.

### Message Processing Pipeline

Every incoming WhatsApp message flows through `message-router.ts`:

1. **Filter** — skip group messages, non-text (template reply), empty
2. **Staff commands** — `!update`, `!add`, `!list`, `!delete` for dynamic KB management
3. **Rate limit** — per-minute/per-hour via `rate-limiter.ts`
4. **Language detection** — auto-translate non-English to English before classification
5. **Conversation state** — `getOrCreate(phone)`, add message, check sentiment
6. **Active state check** — workflow in progress? booking in progress? handle those first
7. **Emergency regex** — fire, ambulance, theft, assault → instant escalation
8. **Intent classification** — tiered pipeline (see below)
9. **Routing** — `routing.json` maps intent → action (`static_reply`, `llm_reply`, `workflow`, `escalate`, `forward_payment`, `start_booking`)
10. **Layer 2 fallback** — if confidence < 0.8, retry with smarter model + 2× context
11. **Overrides** — complaint → LLM + escalate; repeat intent 3× → escalate
12. **Feedback** — optionally prompt thumbs up/down after reply

### Intent Tier System (T1–T5)

Classification uses a **tiered pipeline** — fast/cheap tiers tried first, LLM only as fallback:

| Tier | Method | Latency | When |
| ---- | ------ | ------- | ---- |
| T1 | Regex | <1 ms | Emergencies (fire, theft, locked card) |
| T2 | Fuse.js fuzzy match | <5 ms | Keyword/typo matching from `intent-keywords.json` |
| T3 | Xenova/MiniLM-L6-v2 embeddings | 50–200 ms | Semantic similarity ("wifi password" ≈ "internet code") |
| T4 | Fast 8B LLM classify-only | ~100 ms | When T2/T3 are uncertain |
| T5 | Full LLM (classify + reply) | 1–3 s | Complex/ambiguous messages |

Intents are organized by **guest journey phase**: `GENERAL_SUPPORT`, `PRE_ARRIVAL`, `ARRIVAL_CHECKIN`, `DURING_STAY`, `CHECKOUT_DEPARTURE`, `POST_CHECKOUT`.

### Knowledge Base (RAG)

- **Location**: `RainbowAI/.rainbow-kb/` (inside RainbowAI module)
- **Topic files**: `pricing.md`, `availability.md`, `checkin-wifi.md`, `facilities-capsules.md`, `location.md`, `faq.md`, etc.
- **Memory**: `RainbowAI/.rainbow-kb/memory/YYYY-MM-DD.md` (daily diary entries)
- **Persona**: `AGENTS.md` + `soul.md` always loaded into system prompt
- **Topic selection**: `guessTopicFiles(text)` regex matches message → loads only relevant files (progressive disclosure)
- **Static replies**: `knowledge.json` has pre-written en/ms/zh responses per intent (no AI needed)
- **Dynamic KB**: staff can add/update topics via `!update` / `!add` WhatsApp commands

### Workflow System

Multi-step interactive workflows defined in `workflows.json`:

- **Workflows**: `booking_payment_handler`, `checkin_full`, `complaint_handling`, `theft_emergency`, `card_locked_troubleshoot`, `tourist_guide`, `escalate`, `forward_payment`
- **Steps**: each has `message` (multilingual), `waitForReply`, optional `action`
- **Actions**: `send_to_staff`, `escalate`, `forward_payment`, `check_availability`, `get_police_gps`
- **State**: collected data persists per conversation via `workflowState`

### AI Provider Fallback Chain

Configured in `RainbowAI/src/assistant/data/settings.json`, sorted by priority (only enabled providers shown):

| Priority | Provider | Speed | Use Case |
| -------- | -------- | ----- | -------- |
| 1 | **Groq Llama 3.3 70B** | 280 tok/s | Primary - Balanced quality/speed, reliable chat responses, multilingual |
| 2 | **Ollama GPT-OSS 20B Cloud** | ~3s | Fastest cloud model, GPT-4 class quality, no rate limits, default fallback |
| 2 | **Groq Llama 3.1 8B Instant** | 560 tok/s | Ultra-fast classification, latency-critical structured JSON responses |
| 8 | **Ollama Gemini 3 Flash Cloud** | Fast | Google's multilingual specialist, excels at casual/slang input, free |

**Available (Disabled) Providers:**
- Groq Qwen3 32B (trilingual specialist, best for Chinese/Malay)
- Ollama DeepSeek V3.2 685B Cloud (MoE reasoning, complex multi-rule prompts)
- Ollama Qwen3 80B Cloud (parameter-efficient, bilingual Chinese/English)
- Groq Llama 4 Scout 17B (MoE, 4B active params, best speed/quality for chat)
- Groq DeepSeek R1 Distill 70B (chain-of-thought, multi-step logic)
- Moonshot Kimi K2.5 (262K context, multimodal, requires API key)
- OpenRouter free models (Qwen 32B, Llama 8B, Mistral 7B, Phi-3 Medium)

**Smart Fallback (Layer 2):** If confidence < 0.8, retry with higher-quality model + expanded context (e.g., DeepSeek V3.2, Kimi K2.5, or GPT-OSS with 2× conversation history).

### Rainbow Data Files (`RainbowAI/src/assistant/data/`)

| File | Purpose |
| ---- | ------- |
| `settings.json` | AI providers, routing mode, system prompt, staff phones, sentiment config |
| `routing.json` | Intent → action mapping (static_reply, llm_reply, workflow, escalate) |
| `intents.json` | Intent definitions by guest journey phase, per-intent confidence thresholds |
| `intent-keywords.json` | T2 fuzzy keywords per intent per language (en/ms/zh) |
| `intent-examples.json` | T3 semantic examples per intent |
| `knowledge.json` | Static responses (en/ms/zh) + dynamic knowledge topics |
| `templates.json` | System templates (non_text, rate_limited, thinking, error) |
| `workflow.json` | Escalation, payment forwarding, booking config |
| `workflows.json` | Multi-step workflow definitions with steps |
| `llm-settings.json` | Tier thresholds, T4 provider selection |

### Current Rainbow Configuration (settings.json)

**Routing Mode:**
- `tieredPipeline`: ✅ Enabled (uses T1-T5 tier system)
- `splitModel`: ❌ Disabled (same model for classify + reply)
- `classifyProvider`: `groq-llama-8b` (Groq Llama 3.1 8B Instant for T4)

**Rate Limits:**
- Per minute: 40 messages
- Per hour: 200 messages
- Applies per phone number

**Staff Phones:**
- Jay: `60127088789` (primary contact)
- Alston: `60167620815`
- Additional: `60103084289`

**Conversation Management:** ✅ Enabled
- After 10 messages → summarize messages 1-5, keep 6-20 verbatim
- Reduces context by ~50%, prevents token overflow

**Sentiment Analysis:** ✅ Enabled
- Auto-detects frustrated users
- Escalates after 2 consecutive negative messages
- 30-minute cooldown between escalations

**System Prompt:**
"You are Rainbow, a friendly female AI assistant for Pelangi Capsule Hostel in Johor Bahru, Malaysia. You always clarify that you are an AI bot when introducing yourself. You help guests with check-in info, pricing, availability, bookings, and general hostel questions. Be warm, concise, and helpful. Reply in the same language as the guest (English, Malay, or Chinese). Keep responses under 300 characters when possible. Sign off with \"— Rainbow 🌈\" on important messages. If unsure, suggest contacting staff."

**AI Model Settings:**
- Max classify tokens: 100
- Max chat tokens: 500
- Classify temperature: 0.05 (deterministic)
- Chat temperature: 0.7 (creative)

### Rainbow Admin Dashboard

SPA at `http://localhost:3002/admin/rainbow` with 4-section categorical navigation:

| Section | Tabs | Purpose |
| ------- | ---- | ------- |
| **Connect** (blue) | Dashboard, WhatsApp Accounts, System Status | Monitor connections |
| **Train** (green) | Understanding, Responses, Smart Routing | Configure intents, KB, routing |
| **Test** (yellow) | Chat Simulator, Automated Tests | Test AI before production |
| **Monitor** (gray) | Performance, Settings | Metrics and system config |

Entry: `rainbow-admin.html` → loads tab templates from `templates/tabs/` → JS modules: `main.js`, `api.js`, `core/state.js`, `core/tabs.js`.

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
