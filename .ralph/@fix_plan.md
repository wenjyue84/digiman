# Ralph Fix Plan — Speed Optimization Sprint (US-149 to US-169)

## Phase 1: Quick Wins (highest impact, smallest effort)

- [ ] **US-149** Add gzip compression middleware to both servers
  - Install `compression` package in RainbowAI/ and root
  - Add `app.use(compression())` before routes in `RainbowAI/src/index.ts` and `server/index.ts`
  - Verify: `curl -H 'Accept-Encoding: gzip' -I http://localhost:3002/api/rainbow/status`

- [ ] **US-150** Pre-compile all regexes in fuzzy-matcher and knowledge-base
  - `RainbowAI/src/assistant/fuzzy-matcher.ts:199,240-246` — move inline regexes to class properties
  - `RainbowAI/src/assistant/knowledge-base.ts:96-106` — create COMPILED_TOPIC_PATTERNS array at module load
  - No `new RegExp()` calls on the per-message hot path

- [ ] **US-151** Add composite database indexes for hot query patterns
  - `shared/schema-tables.ts` — add indexes:
    - `(phone, role, timestamp)` on rainbow_messages
    - `(created_at, intent)` on rainbow_feedback
    - `(was_correct, created_at)` on intent_predictions
    - `(is_read, created_at)` on admin_notifications
  - Run `npm run db:push` after changes

- [ ] **US-152** Enable HTTP keep-alive and connection pooling on http-client
  - `RainbowAI/src/lib/http-client.ts:10-17`
  - Add `http.Agent({ keepAlive: true, maxSockets: 20 })` to Axios instance

- [ ] **US-153** Cache dashboard HTML in memory instead of re-reading from disk
  - `RainbowAI/src/index.ts:148-171` — read once at startup, use stable hash for cache-bust
  - Add fs.watch for dev hot-reload

- [ ] **US-154** Parallelize all dashboard stat API calls
  - `RainbowAI/src/public/js/modules/dashboard.js:156-188`
  - Move `/conversations/stats/response-time` into the Promise.allSettled array

- [ ] **US-155** Skip semantic matcher when fuzzy confidence is high
  - Add guard: if fuzzy confidence >= 0.85, skip semantic match (saves 100-300ms)
  - Find where semantic-matcher.match() is invoked in the tier classification pipeline

## Phase 2: Major Refactors (high impact, more effort)

- [ ] **US-156** Eliminate N+1 query pattern in listConversations
  - `RainbowAI/src/assistant/conversation-logger.ts:301-347`
  - Replace for-loop (4 queries per conversation) with single joined query
  - Depends on: US-151 (indexes)

- [ ] **US-157** Cache KB system prompt template (rebuild only on config change)
  - `RainbowAI/src/assistant/knowledge-base.ts:276-399`
  - Cache core content + memory sections; only interpolate topic files per message
  - Invalidate cache on reloadAllKB()

- [ ] **US-158** Lazy-load frontend tab modules with dynamic import()
  - `RainbowAI/src/public/rainbow-admin.html:341-366`
  - Remove tab-specific script tags; load via dynamic `import()` when tab activated
  - Keep core modules (utils, tabs, sidebar) in static script tags

- [ ] **US-159** Replace 3-second Real Chat polling with SSE events
  - `RainbowAI/src/public/js/modules/real-chat-core.js:193`
  - Extend existing SSE endpoint to emit conversation_update events
  - Fallback to 15s polling if SSE disconnects
  - Depends on: US-156 (N+1 fix)

- [ ] **US-160** Clean up intervals and event listeners on tab exit
  - `real-chat-core.js:162-205` — $.autoRefresh, $.waStatusPoll, _rcTimestampUpdater
  - `performance-stats.js:108-115,228-235` — feedbackRefreshInterval, intentAccuracyRefreshInterval
  - `dashboard-helpers.js:373-378` — activity timestamp interval
  - Add cleanup functions called from tabs.js on tab switch

- [ ] **US-161** Reduce body parser limits and add rate limiting to MCP endpoint
  - `server/index.ts:14-15` — change 50mb to 5mb
  - `RainbowAI/src/index.ts:59` — change 10mb to 2mb
  - Add express-rate-limit to /mcp (60 req/min) and /api/rainbow (120 req/min)

## Phase 3: Polish (medium impact)

- [ ] **US-162** Add selective cache headers for stable API endpoints
  - `RainbowAI/src/routes/admin/index.ts:47-53` — replace blanket no-cache
  - Stable endpoints (settings, templates): max-age=60
  - Semi-stable (feedback/stats): max-age=30
  - Volatile (conversations): keep no-cache

- [ ] **US-163** Add debounce to search inputs and auto-resize events
  - `real-chat-core.js:315` — debounce filterConversations by 300ms
  - `real-chat-messaging.js:174` — throttle autoResizeInput to 100ms

- [ ] **US-164** Replace Tailwind CDN with pre-built CSS
  - `rainbow-admin.html:27` — remove CDN script tag
  - Generate pre-built tailwind.min.css with only used classes
  - Add npm script: `build:css`

- [ ] **US-165** Consolidate feedback stats into fewer database queries
  - `RainbowAI/src/routes/admin/feedback.ts:53-91`
  - Either combine 4 queries into 2, or add 10-second in-memory cache

- [ ] **US-166** Batch UPDATE for intent prediction validation
  - `RainbowAI/src/routes/admin/intent-analytics.ts:414-425`
  - Replace for-loop UPDATEs with single inArray() batch update

- [ ] **US-167** Add date range filter to calendar occupancy endpoint
  - `server/routes/dashboard.ts:70` — filter guests by month instead of loading all

- [ ] **US-168** Wrap multi-step DB operations in transactions
  - `RainbowAI/src/assistant/conversation-logger.ts:165-236`
  - Wrap upsert + insert + delete in db.transaction()

## Verification

- [ ] **US-169** Verify all speed optimizations and run performance benchmark
  - Dashboard loads in under 2 seconds
  - API responses include Content-Encoding: gzip
  - listConversations uses 3 or fewer DB queries
  - No JavaScript errors on any dashboard tab
  - Intent accuracy test passes at 95%+
  - All 3 servers start without errors
  - Real Chat tab does not poll every 3 seconds
  - Switching tabs does not leave orphan intervals

## Completed
- [x] **US-149** Add gzip compression middleware — commit 079b24d
- [x] **US-150** Pre-compile regexes — commit 079b24d
- [x] **US-151** Add composite database indexes — commit 079b24d
- [x] **US-152** Enable HTTP keep-alive — commit 079b24d
- [x] **US-153** Cache dashboard HTML in memory — commit 079b24d
- [x] **US-154** Parallelize dashboard stat API calls — commit 079b24d
- [x] **US-155** Skip semantic matcher when fuzzy >= 0.85 — commit 079b24d
- [x] **US-156** Eliminate N+1 query in listConversations — commit bfd758a
- [x] **US-157** Cache KB system prompt template — commit bfd758a
- [x] **US-158** Lazy-load frontend tab modules — commit bfd758a
- [x] **US-159** Replace 3s polling with SSE — commit bfd758a
- [x] **US-160** Clean up intervals on tab exit — commit bfd758a
- [x] **US-161** Body limits + rate limiting — commit bfd758a
- [x] **US-162** Selective cache headers — Phase 3
- [x] **US-163** Debounce search inputs — Phase 3
- [x] **US-164** Pre-built Tailwind CSS — Phase 3
- [x] **US-165** Consolidate feedback stats queries — Phase 3
- [x] **US-166** Batch UPDATE with inArray — Phase 3
- [x] **US-167** Date range filter for calendar — Phase 3
- [x] **US-168** DB transactions for multi-step ops — Phase 3

## Notes
- Always read target files before editing
- Run `npm run db:push` after schema-tables.ts changes
- Test AI pipeline changes: `node RainbowAI/scripts/intent-accuracy-test.js`
- Start all servers: `start-all.bat` or individually: client (npm run dev), server (npm run dev), RainbowAI (cd RainbowAI && npm run dev)
