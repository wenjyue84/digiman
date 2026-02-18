# PRD: Dashboard Activity Fix & WhatsApp-Style Chat Simulator

## 1. Introduction/Overview

This PRD covers two improvements to the Rainbow AI Dashboard at `localhost:3002`:

1. **Fix "Connecting" bug** in Dashboard > Recent Activity — the SSE-based real-time activity stream shows "Connecting..." indefinitely instead of displaying live events. The full backend infrastructure exists (`activity-tracker.ts`, SSE route, client SSE code) and is integrated into 15+ files — this is a bug fix, not a new feature.

2. **WhatsApp-style Chat Simulator** — redesign the Live Simulation pane (above the "Type a manual reply" input) to closely match WhatsApp's native look while retaining developer-specific features for troubleshooting.

Both features must work identically on localhost (primary dev) and the Lightsail production server (`18.142.14.142:3002`).

---

## 2. Goals

- Restore real-time activity feed on the Dashboard so operators can monitor WhatsApp events, AI classifications, and system events as they happen
- Make the Chat Simulator Live Simulation visually indistinguishable from WhatsApp (except for clearly-marked developer overlays)
- Ensure all changes are environment-agnostic (work on both localhost and Lightsail)
- Maintain the existing developer metadata badges (intent, confidence, tier, provider, response time, etc.) but present them in a less intrusive, more polished way

---

## 3. User Stories

### US-001: Fix SSE Activity Stream Connection

**Description:** As a dashboard user, I want the Recent Activity section to show live events instead of "Connecting..." so that I can monitor WhatsApp traffic and AI activity in real time.

**Acceptance Criteria:**
- [ ] Opening Dashboard tab shows "LIVE" green dot within 2 seconds (not "Connecting...")
- [ ] SSE connection to `/api/rainbow/activity/stream` establishes successfully
- [ ] Incoming WhatsApp messages appear as activity events in real time
- [ ] AI classifications, responses sent, and connection events appear correctly
- [ ] Category tabs (All, Message, Reply, Connection, Classified) filter events correctly
- [ ] "Show more" / "Show less" expand/collapse works
- [ ] Relative timestamps update every 30 seconds
- [ ] SSE auto-reconnects after disconnect (shows "Reconnecting..." briefly, then "LIVE" again)
- [ ] Activity events persist across page refreshes (loaded from `data/recent-activity.json`)
- [ ] **Verify in browser using agent-browser**

### US-002: Debug & Verify Activity Tracker Integration

**Description:** As a developer, I want to confirm that `trackMessageReceived()`, `trackIntentClassified()`, `trackResponseSent()`, and other tracking functions are actually being called during the message pipeline so that activity events are generated.

**Acceptance Criteria:**
- [ ] Sending a test message via Chat Simulator generates at least 2 activity events (message_received + response_sent)
- [ ] Activity events include correct metadata (phone, intent, confidence, response time)
- [ ] `data/recent-activity.json` file gets created/updated with events
- [ ] Console logs show `[ActivityTracker]` entries during message processing
- [ ] No duplicate events appear in the feed

### US-003: WhatsApp-Style Chat Background & Layout

**Description:** As a user, I want the Live Simulation chat pane to look like the real WhatsApp desktop app so that I can preview conversations as guests would see them.

**Acceptance Criteria:**
- [ ] Chat area has WhatsApp's doodle background pattern (subtle beige/green pattern, not plain `#efeae2`)
- [ ] Messages area uses WhatsApp's exact spacing and padding
- [ ] Chat header matches WhatsApp style: avatar circle (40px), contact name, "online"/"last seen" status, right-side action buttons
- [ ] Date separators between message groups use WhatsApp's pill-shaped style (rounded, centered, semi-transparent background)
- [ ] Scroll-to-bottom button appears when scrolled up (WhatsApp's circular arrow button)
- [ ] **Verify in browser using agent-browser**

### US-004: WhatsApp-Style Message Bubbles

**Description:** As a user, I want message bubbles to closely match WhatsApp's native design including timestamps, read receipts, and tail shapes.

**Acceptance Criteria:**
- [ ] Guest messages: white (`#fff`) bubbles, left-aligned, with pointed tail on top-left
- [ ] AI/bot messages: light green (`#d9fdd3`) bubbles, right-aligned, with pointed tail on top-right
- [ ] Each bubble shows timestamp in bottom-right corner (HH:MM format, small gray text)
- [ ] Bot messages show double-checkmark (✓✓) read receipt icon next to timestamp
- [ ] Manual replies show "✋ Manual" indicator
- [ ] Long messages wrap naturally with WhatsApp's max-width (~65%)
- [ ] Consecutive messages from same sender have reduced spacing (no repeated tail)
- [ ] **Verify in browser using agent-browser**

### US-005: WhatsApp-Style Input Area

**Description:** As a user, I want the input area below the chat to match WhatsApp's design with attachment button, emoji placeholder, and green send button.

**Acceptance Criteria:**
- [ ] Input area has WhatsApp's light gray background (`#f0f2f5`)
- [ ] Text input is rounded pill-shape with no visible border
- [ ] Attachment (📎) button on the left side of input
- [ ] Green circular send button (42x42px, `#00a884`) on the right
- [ ] Input auto-resizes from 1 to 5 rows as text grows
- [ ] Enter sends message, Shift+Enter adds newline
- [ ] File preview bar appears above input when file is attached
- [ ] Translation preview appears below input when translation mode is active
- [ ] **Verify in browser using agent-browser**

### US-006: Developer Metadata Overlay (Dev Mode)

**Description:** As a developer, I want to toggle a "Dev Mode" that shows AI classification details overlaid on messages without breaking the WhatsApp aesthetic.

**Acceptance Criteria:**
- [ ] 🔧 Dev button in chat header toggles developer mode on/off
- [ ] When OFF: messages look exactly like WhatsApp (clean, no metadata)
- [ ] When ON: each AI response bubble shows a collapsible metadata panel below the message text
- [ ] Metadata panel shows: Detection Tier badge, Intent name, Confidence %, AI Provider/Model, Response Time, Routing Action, Sentiment, KB files used
- [ ] Metadata panel uses subtle styling (muted colors, smaller font) that doesn't overpower the message
- [ ] Inline edit buttons (✏️ Edit, 📚 Add example) appear in dev mode only
- [ ] Dev mode state persists in localStorage across page loads
- [ ] **Verify in browser using agent-browser**

### US-007: Environment Compatibility (Localhost + Lightsail)

**Description:** As a developer, I want all dashboard and chat simulator features to work identically on localhost:3002 and on the Lightsail production server so that both environments provide the same experience.

**Acceptance Criteria:**
- [ ] SSE activity stream works when accessed at `localhost:3002` (direct)
- [ ] SSE activity stream works when accessed at `18.142.14.142:3002` (Lightsail)
- [ ] SSE activity stream works when proxied through Vite at `localhost:3000` (dev mode)
- [ ] Chat Simulator Live Simulation works on both environments
- [ ] No hardcoded `localhost` URLs — all API calls use relative paths or `window.location.origin`
- [ ] CSS/JS assets load correctly on both environments (no path issues)

---

## 4. Functional Requirements

**Activity Feed:**
- FR-1: The SSE endpoint `/api/rainbow/activity/stream` must send an `init` event with recent events on connection, then broadcast `activity` events in real time
- FR-2: The activity tracker must emit events for: message_received, intent_classified, response_sent, whatsapp_connected, whatsapp_disconnected, escalation, workflow_started, booking_started, error, feedback, rate_limited, emergency
- FR-3: Activity events must persist to `RainbowAI/data/recent-activity.json` with debounced writes (2s) and atomic file operations (tmp + rename)
- FR-4: The SSE connection must include a 30-second heartbeat to prevent proxy timeouts
- FR-5: Activity feed must show max 100 events, default 3 visible with expand/collapse

**Chat Simulator:**
- FR-6: The Live Simulation pane must render messages using `renderMessageBubble()` from `chat-renderer.js` with WhatsApp-accurate styling
- FR-7: The chat header must show: contact avatar, name, phone number, instance badge, online/offline status
- FR-8: Developer mode must be toggleable via the 🔧 button and must show/hide metadata badges from `metadata-badges.js`
- FR-9: The input area must support: text input, file attachments (photo + document), translation mode, auto-resize
- FR-10: All message rendering, input handling, and API calls must use relative URLs (no hardcoded hosts/ports)

---

## 5. Non-Goals (Out of Scope)

- Voice message recording UI
- Emoji picker
- Message reactions
- End-to-end encryption indicators
- WhatsApp status/stories
- Group chat simulation
- Video/voice call UI
- Message forwarding UI
- Changing the Quick Test tab design (only Live Simulation gets WhatsApp styling)
- Deploying to Lightsail (just ensure code compatibility)

---

## 6. Technical Considerations

### Existing Files to Modify

| File | Changes |
|------|---------|
| `RainbowAI/src/lib/activity-tracker.ts` | Verify event emission, add debug logging if needed |
| `RainbowAI/src/routes/admin/activity.ts` | Verify SSE headers, check nginx `X-Accel-Buffering` |
| `RainbowAI/src/public/js/modules/dashboard-helpers.js` | Fix SSE connection logic, verify `EventSource` URL |
| `RainbowAI/src/public/js/modules/dashboard.js` | Verify `initActivityStream()` is called correctly |
| `RainbowAI/src/public/templates/tabs/dashboard.html` | Verify activity section HTML structure |
| `RainbowAI/src/public/templates/tabs/chat-simulator.html` | Redesign Live Simulation pane (WhatsApp styling) |
| `RainbowAI/src/public/js/components/chat-renderer.js` | Update `renderMessageBubble()` for WhatsApp accuracy |
| `RainbowAI/src/public/js/components/metadata-badges.js` | Collapsible dev metadata panel |
| `RainbowAI/src/public/css/rainbow-livechat-core.css` | WhatsApp-accurate bubble styles, background pattern |
| `RainbowAI/src/public/css/rainbow-livechat-ui.css` | Input area, header, date separator styles |
| `RainbowAI/src/public/css/rainbow-base.css` | Activity card styles (if needed) |

### Key Architecture Points

- **SSE, not WebSocket**: Activity feed uses Server-Sent Events (built-in browser `EventSource`) — simpler, auto-reconnects, works through proxies
- **Atomic config writes**: Activity persistence uses `writeFileSync` + `renameSync` (consistent with `config-store.ts` pattern)
- **CSS-only WhatsApp pattern**: Use CSS `background-image` with a subtle repeating SVG pattern for WhatsApp's chat background (no external assets)
- **Import boundary**: `RainbowAI/` must have zero imports from `server/`, `client/`, `shared/`
- **No nested template literals**: Use string concatenation for HTML generation in JS (known gotcha from memory)

### Lightsail Compatibility Notes

- Lightsail runs behind nginx — SSE needs `X-Accel-Buffering: no` header (already in activity.ts)
- PM2 process `rainbow-ai` on Lightsail runs in standby mode but still serves the dashboard
- Port 3002 is open in Lightsail firewall

---

## 7. Success Metrics

| Metric | Target |
|--------|--------|
| Activity stream connects within | < 2 seconds |
| SSE reconnection after network drop | < 5 seconds |
| Activity events appear in feed after WhatsApp message | < 1 second |
| Chat Simulator visual match to WhatsApp | 90%+ similarity (layout, colors, spacing) |
| Dev mode metadata fully visible for AI responses | All 8 metadata fields shown |
| Works on both localhost and Lightsail | 100% feature parity |

---

## 8. Open Questions

1. ~~What should "Recent Activity" display?~~ **Resolved:** Both messages AND system events, with category tabs for filtering
2. ~~How should the dev metadata be presented?~~ **Resolved:** Collapsible panel below each AI message, visible only in dev mode
3. Should the WhatsApp background pattern use a CSS-only approach or a small SVG asset? (Recommend CSS-only for simplicity)
4. Should we add a "sound notification" when new activity events arrive? (Not in scope for v1)
