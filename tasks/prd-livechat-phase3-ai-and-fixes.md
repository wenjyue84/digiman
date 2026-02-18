# PRD: Live Chat Phase 3 — WhatsApp UX Parity, Prisma AI & Bug Fixes

**Created:** 2026-02-19
**Status:** Draft
**Branch:** ralph/live-chat-enhancements
**Module:** RainbowAI (port 3002) — `#live-chat`, `#settings/ai-models`, `#staff-review`, `#chat-simulator/live-simulation`

---

## 1. Introduction / Overview

This PRD covers 22 user stories across 7 areas:

1. **Settings — Ollama UX** (US-001–002): Surface useful guidance when Ollama fails so staff don't waste time debugging.
2. **Live Chat — WhatsApp UX Parity** (US-003–005, 008, 014): Match the interaction patterns WhatsApp Web users already know.
3. **Live Chat — Bug Fixes** (US-006, 007, 016): Fix translate toggle, avatar placeholder, and staff-review prediction error.
4. **Live Chat — Prisma AI Bot** (US-009–013): Inline AI assistant for new staff to look up answers without leaving the chat.
5. **Chat Simulator Parity** (US-015): Every feature added to `#live-chat` must also work in `#chat-simulator/live-simulation`.
6. **Infrastructure Bugs** (US-017–018): Fix broken self-check-in link URL and production CORS login error.
7. **Rainbow AI Content & Config** (US-019–022): First-contact experience, workflow dead ends, conversation naturalness, and response mode tuning.

---

## 2. Goals

- Reduce staff confusion when Ollama is unavailable (local or cloud)
- Match WhatsApp Web UX conventions (filter chips, context menu, avatar initials, date-jump search)
- Fix broken features: translate toggle, schedule time picker, prediction marking
- Give new staff an AI co-pilot (Prisma) without switching tabs
- Keep Live Chat and Chat Simulator in feature parity

---

## 3. User Stories

---

### US-001: Ollama troubleshooting guide on speed test error

**Description:** As a staff member, I want to see a troubleshooting guide when an Ollama model fails the speed test, so that I know it's a local software issue and how to fix it.

**Acceptance Criteria:**
- [ ] When "Test Speed" is clicked on an Ollama model and it returns an error, a collapsible troubleshooting panel appears below the model card (not a toast — it must persist)
- [ ] The panel contains: (1) explanation "Ollama runs locally on your computer and must be started before use", (2) steps: install Ollama → run `ollama serve` → pull the model → retry, (3) a "Retry" button that re-runs the speed test inline
- [ ] The panel does NOT appear for non-Ollama providers (OpenAI, Anthropic, etc.)
- [ ] If the retry succeeds, the panel collapses and the speed result is shown normally
- [ ] Verify in browser using agent-browser

---

### US-002: Cloud environment Ollama unavailability warning

**Description:** As a cloud server admin, I want to see a persistent notice that Ollama is not available in the cloud environment, so that I don't waste time enabling it on the production server.

**Acceptance Criteria:**
- [ ] Detect cloud/production context: if `process.env.NODE_ENV === 'production'` OR `RAINBOW_ROLE === 'primary'` (Lightsail), treat as cloud
- [ ] In `#settings/ai-models`, Ollama model cards show a yellow warning badge: "Not available on cloud server — Ollama requires local installation"
- [ ] The "Activate" toggle for Ollama models is disabled (greyed out) in cloud context with tooltip explaining why
- [ ] "Test Speed" button for Ollama is also disabled in cloud context
- [ ] In local/dev mode, the warning does NOT appear and normal Ollama behaviour is preserved
- [ ] Verify in browser using agent-browser

---

### US-003: Redesign chat filter bar to WhatsApp-style pill chips

**Description:** As a staff member, I want the Tags and Unit filter icons in the chat list to look like WhatsApp's horizontal pill chip row, so that the interface feels familiar and the filters are visually consistent.

**Acceptance Criteria:**
- [ ] The filter row shows: `All` | `Unread` | `Favourites` | `Groups` | `Tags ▾` | `Unit ▾` as horizontal scrollable pill chips
- [ ] `All` chip has a filled/active style when no filter is active (matches Image #1 reference: green background)
- [ ] Tags and Unit chips show a downward chevron (▾) indicating they open a dropdown
- [ ] Active filter chip has a distinct active style (filled background)
- [ ] Chips are scrollable horizontally on narrow viewports without wrapping
- [ ] The existing icon-based Tags/Unit buttons are removed (replaced by chips)
- [ ] Verify in browser using agent-browser

---

### US-004: Wire Tags and Unit filter chips to backend conversation list

**Description:** As a staff member, I want clicking a Tag or Unit chip to actually filter the conversation list, so that I can quickly find guests by their assigned tag or capsule unit.

**Acceptance Criteria:**
- [ ] Clicking `Tags ▾` opens a dropdown listing all available tags fetched from the backend
- [ ] Selecting a tag filters the conversation list to show only conversations with that tag
- [ ] Clicking `Unit ▾` opens a dropdown listing all available unit numbers fetched from `GET /api/rainbow/contacts` or equivalent
- [ ] Selecting a unit filters the conversation list to show only conversations with that unit assignment
- [ ] Multiple filters can be active simultaneously (Tags AND Unit combined)
- [ ] A clear/reset option appears when any filter is active
- [ ] Filter state persists during the browser session (not wiped on tab switch)
- [ ] Verify in browser using agent-browser

---

### US-005: Reposition message action menu to appear near the message (WhatsApp style)

**Description:** As a staff member, I want the message action menu (Like, Love, Haha, Wow, Sad, Thanks, Reply, Copy, Forward) to appear adjacent to the message bubble — not in a fixed/off-position location — matching WhatsApp Web's context menu behaviour.

**Context (research):** WhatsApp Web renders the context menu as an absolute-positioned floating div anchored to the message bubble. Emoji reactions appear in a horizontal row above the text actions. The menu flips vertically if it would overflow the viewport bottom.

**Acceptance Criteria:**
- [ ] When the downward chevron on a message is clicked, the action menu appears immediately adjacent to that message bubble (right-aligned for outgoing, left-aligned for incoming)
- [ ] Emoji reactions (Like, Love, Haha, Wow, Sad, Thanks) appear in a horizontal icon row at the top of the menu
- [ ] Text actions (Reply, Copy, Forward) appear below the emoji row
- [ ] If the menu would overflow the bottom of the viewport, it opens upward from the chevron instead
- [ ] Clicking anywhere outside the menu closes it
- [ ] Works for both incoming and outgoing message bubbles
- [ ] Verify in browser using agent-browser

---

### US-006: Fix translate toggle in live-chat

**Description:** As a staff member, I want the Translate toggle to actually enable translation of incoming messages, so that I can understand guest messages in foreign languages.

**Context:** The feature was previously working. Check git log / backup files to find the last working state and identify the regression.

**Acceptance Criteria:**
- [ ] Identify root cause by checking git log for recent changes to translate-related code in `live-chat-actions.js`, `live-chat-core.js`, or the translate API route
- [ ] Translate toggle can be toggled ON without reverting back to OFF
- [ ] When ON, incoming messages are translated using the active AI provider and the translation appears below the original text
- [ ] When OFF, no translation is shown
- [ ] Toggle state persists across conversation switches within the same session
- [ ] Verify in browser using agent-browser: toggle ON, send a non-English message via chat simulator, confirm translation appears

---

### US-007: Colored initials avatar for contacts without a profile picture

**Description:** As a staff member, I want contacts without a profile picture to show a colored circle with their initials instead of a blank grey circle, so that conversations are visually distinguishable at a glance.

**Acceptance Criteria:**
- [ ] When a contact has no profile picture, their avatar is a filled circle with a deterministic background color (derived from the contact's phone number or name hash — same contact always gets same color)
- [ ] The initials shown are the first letter(s) of the contact's display name (e.g., "Alston Foo" → "AF", "Jay" → "J")
- [ ] Color palette uses at least 8 distinct, readable colors (not red/green to avoid confusion with status indicators)
- [ ] White or near-white text is used on dark backgrounds for legibility
- [ ] Applied in: conversation list avatars, chat header avatar, and message thread avatars
- [ ] Contacts with an actual profile picture are unaffected
- [ ] Verify in browser using agent-browser

---

### US-008: Improve Schedule Message picker with full date-time editing

**Description:** As a staff member, I want to edit the exact hour, minute, and second when scheduling a message, so that I can schedule messages with precision (e.g., exactly at check-in time).

**Acceptance Criteria:**
- [ ] The Schedule Message modal shows separate number input fields (or a time picker) for: Date, Hour (00–23), Minute (00–59), Second (00–59)
- [ ] Users can type directly into each field or use up/down arrows to increment/decrement
- [ ] The UI shows the composed datetime in a human-readable preview: e.g., "Will send: 19 Mar 2026 at 02:30:45"
- [ ] Validation prevents scheduling in the past — show inline error if datetime < now
- [ ] The existing date-only input (`<input type="datetime-local">`) is replaced or augmented with the above
- [ ] Repeat (None / Daily / Weekly) dropdown remains unchanged
- [ ] Schedule button submits the full datetime including seconds to the backend
- [ ] Verify in browser using agent-browser

---

### US-009: Add "Ask AI" (Prisma bot) entry point in conversation 3-dot menu

**Description:** As a staff member, I want an "Ask AI" option in the conversation's 3-dot menu, so that I can launch the Prisma AI assistant without leaving the chat.

**Acceptance Criteria:**
- [ ] The 3-dot (⋮) menu in the conversation header includes a new item: "Ask AI — Prisma"
- [ ] Clicking it opens the Prisma floating chat window (implemented in US-010) anchored to the bottom-right of the chat panel
- [ ] If Prisma is already open, clicking again focuses/toggles it
- [ ] The menu item has a distinguishing icon (e.g., sparkle ✦ or robot icon)
- [ ] Verify in browser using agent-browser

---

### US-010: Prisma AI floating chat window UI

**Description:** As a staff member, I want a floating Prisma AI chat window with a source selector and conversation history, so that I can ask questions and get answers without leaving the live chat.

**Acceptance Criteria:**
- [ ] A draggable floating panel appears with: title "Prisma AI", close (✕) button, source selector (see US-011), message input, send button, and scrollable response history
- [ ] Source selector shows 4 options as radio/toggle chips: "Knowledge Base" | "MCP Server" | "All History" | "Internet"
- [ ] Default source is "Knowledge Base"
- [ ] Conversation history within the panel persists for the current browser session (in-memory state)
- [ ] User messages appear right-aligned; Prisma responses appear left-aligned with a Prisma avatar
- [ ] A loading indicator (typing dots) appears while Prisma is fetching a response
- [ ] Panel can be minimised to a floating "Ask Prisma" button at bottom-right
- [ ] Panel does NOT interfere with sending messages to the guest (two separate input areas)
- [ ] Verify in browser using agent-browser

---

### US-011: Wire Prisma AI to Knowledge Base and AI provider

**Description:** As a staff member using Prisma with "Knowledge Base" source, I want Prisma to answer from the Rainbow KB files, so that I get accurate hostel-specific answers.

**Acceptance Criteria:**
- [ ] A new admin API endpoint `POST /api/rainbow/prisma/ask` accepts `{ question, source, conversationHistory }` and returns `{ answer, sourceUsed }`
- [ ] When source = "knowledge_base", the endpoint queries the existing KB (`knowledge-base.ts` / `.rainbow-kb/`) and passes relevant chunks to the active AI provider
- [ ] The response includes which KB topic files were consulted
- [ ] Errors (no KB match, AI failure) return a graceful fallback message
- [ ] TypeScript compiles with zero errors

---

### US-012: Add MCP Server, All History, and Internet sources to Prisma AI

**Description:** As a staff member, I want to select different sources for Prisma queries (MCP server, all conversation history, or internet), so that I get the most relevant answer for each question.

**Acceptance Criteria:**
- [ ] When source = "mcp_server": Prisma calls available MCP tools (e.g., booking lookup, capsule availability) and incorporates tool results in the answer
- [ ] When source = "all_history": Prisma is given the full conversation history of the currently open conversation as context
- [ ] When source = "internet": Prisma makes a web search call (or uses an internet-capable model/provider if configured) and cites sources in the answer
- [ ] Source label appears in the Prisma response bubble so staff know what was consulted
- [ ] If a source type is unavailable (e.g., no internet provider configured), the chip is greyed out with a tooltip explaining why
- [ ] TypeScript compiles with zero errors

---

### US-013: Prisma AI session conversation memory

**Description:** As a staff member having a multi-turn conversation with Prisma, I want Prisma to remember what I said earlier in the session, so that follow-up questions work naturally (e.g., "what about weekends?" after "what is the check-in time?").

**Acceptance Criteria:**
- [ ] The `POST /api/rainbow/prisma/ask` endpoint accepts a `conversationHistory` array (role/content pairs) and includes it in the AI prompt
- [ ] The frontend sends the full session history on each new message to Prisma
- [ ] After 20 exchanges, the history is trimmed to the last 20 messages to avoid token overflow (oldest dropped first)
- [ ] Clearing the Prisma window (✕ then re-open) resets the session history
- [ ] TypeScript compiles with zero errors

---

### US-014: Add date-jump to in-conversation message search

**Description:** As a staff member searching messages, I want a "Jump to date" option in the search bar so that I can navigate to messages from a specific date without scrolling, matching WhatsApp Web's behaviour.

**Acceptance Criteria:**
- [ ] The in-conversation search bar (shown in Image #5) has a calendar icon button beside it
- [ ] Clicking the calendar icon opens a date picker (not a datetime picker — date only)
- [ ] Selecting a date scrolls the message thread to the nearest message on or after that date, and highlights that section with a date separator
- [ ] If no messages exist for that date, a toast shows: "No messages found for [date]"
- [ ] The existing ▲ / ▼ navigation arrows for keyword search results are not affected
- [ ] Verify in browser using agent-browser

---

### US-015: Mirror all Phase 3 features in chat-simulator/live-simulation

**Description:** As a staff member testing via the Chat Simulator's live-simulation mode, I want all new live-chat features to also work in that tab, so that I don't have to switch tabs to test the full experience.

**Acceptance Criteria:**
- [ ] WhatsApp-style filter chips (US-003/US-004) appear and function in the simulator's conversation list panel
- [ ] Message action menu (US-005) appears correctly in the simulator's message thread
- [ ] Translate toggle (US-006) works in the simulator
- [ ] Colored initials avatars (US-007) render in the simulator
- [ ] Schedule message with full time editing (US-008) works in the simulator
- [ ] "Ask AI — Prisma" menu entry (US-009) and floating window (US-010/US-011/US-012/US-013) are accessible from the simulator
- [ ] Date-jump search (US-014) works in the simulator
- [ ] All features are tested via Chat Simulator before marking this story complete
- [ ] Verify in browser using agent-browser

---

### US-016: Fix "Failed to mark prediction" error in staff-review

**Description:** As an admin reviewing staff predictions in `#staff-review`, I want marking a prediction to succeed without errors, so that the review workflow is usable.

**Context:** The error "Failed to mark prediction" appears consistently (Image #6 shows every row returning Error). Root cause is unknown — investigate API endpoint, request payload, and response first.

**Acceptance Criteria:**
- [ ] Identify the failing API call via browser DevTools network tab (document the endpoint and error response in a code comment)
- [ ] Fix the root cause: likely a missing field, wrong content-type, auth header, or schema mismatch in the mark-prediction route
- [ ] Marking a prediction as correct or incorrect succeeds and the row updates its status visually
- [ ] No "Error" label appears for rows that were successfully processed
- [ ] Verify in browser using agent-browser: load `#staff-review`, click mark on any row, confirm success

---

---

### US-017: Fix self-check-in link URL to use public Lightsail IP

**Description:** As a guest receiving a self-check-in WhatsApp message, I want the check-in link to work from my phone, so that I can complete check-in without calling the hostel.

**Context:** The current generated link is `http://localhost:5000/guest-checkin?token=...` which only works on the server itself. Guests receive this and cannot open it. The fix is to use the Lightsail static IP `18.142.14.142` (or a configurable `PUBLIC_URL` env var) as the base URL.

**Acceptance Criteria:**
- [ ] A `PUBLIC_URL` env var (e.g., `http://18.142.14.142`) is read server-side when generating the self-check-in link
- [ ] The generated URL in the WhatsApp message uses `PUBLIC_URL` as the base: `http://18.142.14.142/guest-checkin?token=...`
- [ ] If `PUBLIC_URL` is not set, fall back to the request's `host` header (preserves local dev behaviour at `localhost:5000`)
- [ ] The same fix applies to any other place in the codebase that generates guest-facing links with `localhost` (search for `localhost:5000` in string templates)
- [ ] On local dev, the link still resolves to `localhost:5000` (or whatever host the request came from)
- [ ] The `.env.example` file is updated to document `PUBLIC_URL`
- [ ] TypeScript compiles with zero errors

---

### US-018: Fix CORS policy violation on production login

**Description:** As a staff member logging in at `http://18.142.14.142/login`, I want the sign-in to succeed without a CORS error, so that I can access the dashboard from a browser.

**Context:** The browser reports "CORS policy violation" when submitting the login form at the Lightsail IP. This is typically caused by the Express CORS middleware having an `origin` whitelist that does not include the production IP, or the Vite dev proxy not being involved at all in production (so the browser hits a different origin than the API).

**Acceptance Criteria:**
- [ ] Identify the root cause: check the `cors()` middleware config in `server/index.ts` (or equivalent) and compare allowed origins against `http://18.142.14.142`
- [ ] Fix: either add `http://18.142.14.142` to the allowed origins array, or use a `CORS_ORIGIN` env var that defaults to `*` in production when behind nginx (since nginx is on the same origin, CORS is irrelevant for same-origin requests)
- [ ] Login at `http://18.142.14.142/login` completes without CORS errors
- [ ] Local dev login (`http://localhost:3000`) is not broken
- [ ] The fix does NOT use `origin: '*'` permanently in production — use explicit origin list or `CORS_ORIGIN` env var
- [ ] Verify in browser using agent-browser: navigate to `http://18.142.14.142/login`, submit credentials, confirm no CORS error in console

---

### US-019: Add capability menu hint to first-contact greeting

**Description:** As a first-time guest messaging Rainbow, I want to receive a brief menu of what Rainbow can help with, so that I know how to interact with it on WhatsApp (where there is no visible nav bar).

**Context:** The current greeting static reply is a plain "Hi, welcome to Pelangi Capsule Hostel" with no hint of what the bot can do. On WhatsApp, guests cannot see a sidebar — so they need a gentle prompt.

**Target greeting (all 3 languages):**

English:
```
Hi! I'm Rainbow 🌈 I can help with:
• 🏨 Check-in / Check-out
• 💰 Pricing & availability
• 📍 Location & directions
• 🛁 Facilities & WiFi
• 🙋 Or just ask me anything!
```

**Acceptance Criteria:**
- [ ] Locate the greeting intent's static reply in `RainbowAI/src/assistant/data/` (likely `settings.json` or a static-replies config file)
- [ ] Update the `en` variant to include the capability menu hint above
- [ ] Add an equivalent `ms` (Malay) variant using natural conversational phrasing (e.g., "Hai! Saya Rainbow 🌈 Boleh bantu...")
- [ ] Add an equivalent `zh` (Chinese) variant
- [ ] The hint is shown only on the first message from a new contact — not on every greeting (check if there is a "first contact" flag in the conversation state; if not, tie it to conversation history length = 0)
- [ ] The 50-scenario accuracy test maintains 100% pass rate after this change
- [ ] Verify in Chat Simulator: send "hi" from a fresh conversation, confirm hint appears

---

### US-020: Fix workflow dead ends — cancel intent and routing gaps

**Description:** As a guest mid-workflow, I want to say "cancel" or "nevermind" and have Rainbow gracefully exit the workflow, so that I don't get confused responses when I change my mind.

**Context:** Three specific gaps identified:
1. No `cancel_workflow` intent — guests saying "cancel", "stop", "nevermind" get unhandled responses inside active workflows
2. `climate_control_complaint` is routed to `static_reply` — should trigger `complaint_handling` workflow
3. `billing_dispute` is routed to `static_reply` — should trigger `escalate` workflow (this is a contentious issue that deserves a human)

**Acceptance Criteria:**
- [ ] Add a `cancel_workflow` intent in `intent-keywords.json` with keywords: "cancel", "nevermind", "stop", "forget it", "batal", "tak nak", "算了"
- [ ] The workflow executor checks for `cancel_workflow` intent at each step and exits the active workflow gracefully with message: "No problem! Is there anything else I can help you with?"
- [ ] In `routing.json`: update `"climate_control_complaint"` action from `"static_reply"` to `"workflow"` with `"workflow_id": "complaint_handling"`
- [ ] In `routing.json`: update `"billing_dispute"` action from `"static_reply"` to `"workflow"` with `"workflow_id": "escalate"`
- [ ] The `complaint_handling` and `escalate` workflows exist (verify in `workflows.json`; create minimal versions if missing)
- [ ] The 50-scenario accuracy test maintains 100% pass rate after routing changes
- [ ] Verify in Chat Simulator: send "cancel" mid-booking-workflow, confirm graceful exit

---

### US-021: Improve booking workflow naturalness and Malay translations

**Description:** As a guest going through the booking process, I want Rainbow to ask questions directly without preamble filler messages, and in natural conversational Malay, so that the interaction feels human.

**Context:**
- Current `booking_payment_handler` Step 1 sends a preamble ("I'll help you with your booking or payment. Let me gather some information first.") then Step 2 asks the actual question. This double round-trip adds friction.
- Malay translations read as literal English-to-Malay. Natural Malaysian Malay uses "nak", "lah", "boleh" constructs.

**Target for first booking workflow message:**
- `en`: "Happy to help with your booking! How many guests will be staying?"
- `ms`: "Boleh bantu! Berapa orang tetamu nak check in?"
- `zh`: "好的，我来帮您办理！请问几位客人入住？"

**Acceptance Criteria:**
- [ ] Locate `booking_payment_handler` workflow definition in `RainbowAI/src/assistant/data/workflows.json`
- [ ] Collapse the preamble step: merge Step 1 (preamble) and Step 2 (first question) into a single opening message
- [ ] Update the `ms` variant of the opening message to use the natural phrasing above
- [ ] Review all other `ms` variants in this workflow for literal translations and rewrite any that sound unnatural (at minimum: guest count question, payment method question, confirmation message)
- [ ] The 50-scenario accuracy test maintains 100% pass rate after this change
- [ ] Verify in Chat Simulator: trigger booking workflow, confirm only ONE message is sent before the guest can respond

---

### US-022: Expand copilot auto-approve intent list

**Description:** As a hostel manager, I want Rainbow to auto-approve replies for all low-risk informational intents, so that guests on common questions don't wait 30 minutes for a staff member to manually approve the response.

**Context:** Currently only 3 intents are auto-approved (`greeting`, `thanks`, `wifi`). The `queue_timeout_minutes: 30` setting means guests asking about check-in times, directions, or facilities could wait 30 minutes in copilot mode. All informational intents are safe to auto-approve — they don't commit to bookings or payments.

**Target auto-approve list:**
```json
"auto_approve_intents": [
  "greeting", "thanks", "wifi",
  "directions", "checkin_info", "checkout_info",
  "facilities_info", "rules_policy", "payment_info",
  "luggage_storage", "extra_amenity_request"
]
```

**Acceptance Criteria:**
- [ ] Locate the `auto_approve_intents` config in `RainbowAI/src/assistant/data/settings.json` (or equivalent)
- [ ] Update the list to include all 11 intents listed above
- [ ] Verify all 11 intent names exist in `intent-keywords.json` / `routing.json` (no typos)
- [ ] In copilot mode, a message classified as `checkin_info` is auto-approved and sent without staff action
- [ ] The 50-scenario accuracy test maintains 100% pass rate after this change
- [ ] Verify in Chat Simulator: enable copilot mode, ask "what time is check in?", confirm Rainbow replies without waiting for approval

---

## 4. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | Ollama error detection must be provider-specific, not applied globally |
| FR-02 | Cloud detection uses `RAINBOW_ROLE` env var — no hardcoded IPs |
| FR-03 | Filter chip state must not reset on tab change within the same session |
| FR-04 | Context menu must use `position: absolute` anchored to message bubble, not `position: fixed` |
| FR-05 | Avatar color must be deterministic (same phone number → same color every time) |
| FR-06 | Prisma endpoint must be authenticated (require `X-Admin-Key` header in production) |
| FR-07 | Prisma history trimming must be client-side to avoid sending excessive tokens |
| FR-08 | Date-jump search must not break existing keyword search navigation |
| FR-09 | All new UI components must share CSS with existing `rainbow-livechat-*.css` stylesheets |
| FR-10 | Chat Simulator parity (US-015) must reuse the same JS modules, not duplicate code |
| FR-11 | Self-check-in URL base must come from `PUBLIC_URL` env var, not hardcoded to any IP |
| FR-12 | CORS allowed origins must be configurable via env var, not hardcoded strings |
| FR-13 | Greeting menu hint must only appear when conversation history length is 0 (true first contact) |
| FR-14 | `cancel_workflow` intent must be checked at every workflow step transition, not just at entry |
| FR-15 | Auto-approve intents list must be data-driven (editable in settings.json, no code change needed) |

---

## 5. Non-Goals (Out of Scope)

- Prisma AI is NOT a replacement for the main Rainbow AI bot — it is staff-only, never shown to guests
- Prisma does NOT send messages to guests on staff's behalf (read-only AI assistant)
- Internet source for Prisma does NOT require a new external service — use an existing internet-capable AI provider config if available
- Translate feature does NOT require a new translation API key — uses existing AI provider
- Avatar color feature does NOT persist color preferences to the database
- Tags/Unit filter does NOT support creating or editing tags from the filter dropdown (that's a separate management feature)

---

## 6. Technical Considerations

| Area | Notes |
|------|-------|
| Translate regression | Check git log for changes to translate-related code post-2025-12. Compare `live-chat-actions.js` in current vs last known-working commit |
| Prediction error | Check `RainbowAI/src/routes/admin/` for the mark-prediction endpoint; verify request shape matches frontend call |
| Prisma endpoint | Add to `RainbowAI/src/routes/admin/index.ts` under `/api/rainbow/prisma/ask` |
| Context menu | Use `getBoundingClientRect()` of the message bubble to calculate anchor position |
| Avatar hash | Use `charCodeAt` sum mod palette-length for deterministic color assignment |
| Cloud detection | Read `process.env.RAINBOW_ROLE` server-side and expose via an existing `/api/rainbow/status` endpoint |
| CSS | All new components go into `rainbow-livechat-ui.css` (UI layer); no inline styles |
| Self-check-in URL | Search `server/` for string templates containing `localhost:5000` or `/guest-checkin`. Use `req.protocol + '://' + req.get('host')` as fallback if `PUBLIC_URL` not set |
| CORS fix | Check `server/index.ts` cors() config. In production behind nginx on same origin, CORS is unnecessary — consider `origin: true` (reflect request origin) with an explicit allowlist for safety |
| Greeting first-contact | Check conversation history before routing to greeting intent. If `messages.length === 0`, inject the menu hint template into the reply |
| Workflow cancel | Add cancel check to `workflow-executor.ts` at the top of `processStep()` — if classified intent = `cancel_workflow`, call `exitWorkflow()` and return the farewell template |
| Malay translations | Target natural Malaysian conversational register, not formal Bahasa Malaysia. Key markers: "nak" (want to), "lah" (particle), "boleh" (can), "dah" (already) |

---

## 7. Success Metrics

- Ollama troubleshooting: Zero support requests about "Ollama not working" from staff who follow the guide
- Translate: Toggle works in first click, translation appears within 3 seconds
- Context menu: Menu appears within 100ms of click, positioned within 8px of message bubble edge
- Avatars: Every contact in the conversation list has a coloured avatar (no grey blanks)
- Prisma: New staff can answer a guest question using Prisma without opening a new tab
- Prediction marking: Zero "Failed to mark prediction" errors in normal usage
- Self-check-in link: Guest successfully opens the check-in URL from their phone without any redirect or 404
- CORS: Staff login at Lightsail IP completes without any browser console CORS error
- First-contact greeting: Guest's first message results in both a greeting and the capability menu hint (measured in Chat Simulator)
- Workflow cancel: Guest typing "cancel" mid-workflow gets a graceful exit in ≤1 message
- Booking naturalness: Only one message sent before guest can respond in booking workflow
- Auto-approve: Guest asking `checkin_info` in copilot mode receives reply without staff action

---

## 8. Open Questions

| # | Question | Impact |
|---|----------|--------|
| Q1 | Should Prisma's "Internet" source use the existing AI provider's web search capability, or a dedicated search API? | Affects US-012 implementation |
| Q2 | Should the date-jump in search scroll to the exact date or to the nearest message on/after that date? | Minor UX detail for US-014 |
| Q3 | Should Unit filter use the capsule unit data from the web app's Postgres (server:5000) or from the Rainbow contacts store (port 3002)? | Affects US-004 backend wiring |
| Q4 | For cloud detection, should we add a `/api/rainbow/env` endpoint, or expose `RAINBOW_ROLE` through the existing `/api/rainbow/status` response? | Affects US-002 implementation |
| Q5 | For US-017: should `PUBLIC_URL` live in `RainbowAI/.env` or in the root `server/.env`? The self-check-in link is generated by the `server/` module (port 5000), not Rainbow AI (port 3002). | Affects where the env var is read |
| Q6 | For US-019: is the first-contact detection already in the message pipeline (`message-router.ts`), or does it need to be added? | Affects US-019 implementation scope |
| Q7 | For US-022: does the `auto_approve_intents` list currently live in `settings.json` under the `copilot` key, or in a different config location? | Affects US-022 implementation |
