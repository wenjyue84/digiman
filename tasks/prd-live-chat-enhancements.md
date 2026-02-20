# PRD: Live Chat & Chat Simulator Enhancements

**Created:** 2026-02-18
**Status:** Draft
**Module:** RainbowAI (port 3002)

---

## 1. Introduction / Overview

Rainbow AI's Live Chat (`#live-chat`) and Chat Simulator (`#chat-simulator`) are the primary interfaces for hostel staff to interact with WhatsApp guests and test AI responses. This PRD covers 21 enhancements grouped into 4 phases that improve visibility, usability, contact management, messaging power, and scheduling capabilities.

**Problem:** Staff currently lack key operational context (token costs, unit assignments, check-in dates) in the chat interface. Several UX issues (slow pane switching, truncated AI notes, misleading connection status) reduce productivity. Advanced messaging features (scheduled messages, custom templates, payment reminders) are missing entirely.

---

## 2. Goals

- **Visibility:** Surface token usage, read receipts, and AI vs. human message distinction
- **Efficiency:** Faster navigation, better filtering, one-click custom messages
- **Contact management:** Rich guest profiles with unit, tags, dates, and payment tracking
- **Automation:** Scheduled messages, repeating schedules, payment chase reminders
- **Reliability:** Fix connection status display, smooth pane transitions, truncation bugs

---

## 3. Phased User Stories

### Phase 1: Quick Fixes & UX Polish

> Low effort, high impact. Fix existing pain points first.

---

### US-001: Display Token Usage in Chat Simulator Live Simulation

**Description:** As a staff member testing AI responses, I want to see input/output token counts and context message count for each AI reply so that I can understand cost and context window usage.

**Acceptance Criteria:**
- [ ] In `#chat-simulator/live-simulation`, each AI reply with `tiered-LLM-fallback` (or any LLM tier) shows: input tokens, output tokens, total tokens
- [ ] Shows how many previous conversation messages were read to generate the reply (context window size)
- [ ] Token info displayed in a subtle metadata row below the AI reply bubble (e.g., `128 in / 256 out | 5 messages context`)
- [ ] Data sourced from the AI provider's response metadata (usage field)
- [ ] If token data is unavailable from provider, show "N/A" gracefully
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-002: Robot Icon for AI-Generated Replies

**Description:** As a staff member, I want AI-generated replies to have a robot icon prefix so that I can instantly distinguish between Rainbow AI auto-replies and manual staff messages.

**Acceptance Criteria:**
- [ ] All AI-generated replies in Live Chat (`#live-chat`) show a robot icon (e.g., unicode robot face or SVG) before the message text
- [ ] Robot icon appears in both the chat bubble (right pane) and the conversation preview (left pane)
- [ ] Manual staff replies do NOT show the robot icon
- [ ] In the left pane preview, format is: `[robot icon] Hello, welcome to Pelangi...` (as already shown in Image #1, but must also appear in actual conversation view)
- [ ] Robot icon also appears in Chat Simulator live simulation view for consistency
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-003: Guest Simulation Input Box at Top

**Description:** As a tester, I want the typing input box in Guest Simulation (`#chat-simulator` > Guest Simulation tab) to be at the top of the panel so that I can quickly type test messages without scrolling down.

**Acceptance Criteria:**
- [ ] In `#chat-simulator` Guest Simulation tab, the message input box is positioned at the top of the chat area
- [ ] This layout is specific to Guest Simulation only — Live Simulation and Live Chat keep input at the bottom
- [ ] Conversation messages flow below the input box
- [ ] Input box remains fixed/sticky at top when scrolling through messages
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-004: Dismissable Info/Warning Notifications

**Description:** As a staff member, I want to dismiss informational banner messages (like the "Reply for unknown exists but intent is routed to llm_reply" message in Image #2) so that they don't clutter my workspace, with the ability to review dismissed messages later.

**Acceptance Criteria:**
- [ ] Info/warning banners (blue `[i]` banners) have a visible "Dismiss" or "X" button
- [ ] Clicking dismiss hides the banner immediately
- [ ] Dismissed messages are stored in local state (sessionStorage or localStorage)
- [ ] A small icon/button in an appropriate location (e.g., toolbar or footer) shows count of dismissed messages
- [ ] Clicking the dismissed messages icon opens a panel/modal listing all previously dismissed messages
- [ ] User can restore (un-dismiss) a message from the dismissed list
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-005: Fix AI Notes Truncation & Show Context File

**Description:** As a staff member, I want the "Generate by AI" notes feature to show complete output without truncation, and I want to see and edit the context file after clicking "Add to Context".

**Acceptance Criteria:**
- [ ] a) In `#live-chat` > Contact Details > Notes, "Generate by AI" produces complete, untruncated output
- [ ] Notes textarea auto-expands or has adequate min-height to show full generated text
- [ ] b) After clicking "Add to Context", the saved context file path/name is displayed below the "Add to Context" button
- [ ] The displayed file path is clickable — clicking opens the file content in an editable textarea/modal
- [ ] User can edit and save changes to the context file directly from the UI
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-006: Smooth Conversation Pane Switching

**Description:** As a staff member, I want clicking a contact name in the left pane to instantly show their conversation in the right pane without a multi-second delay.

**Acceptance Criteria:**
- [ ] Clicking a contact in the left pane updates the right pane within 200ms (perceived instant)
- [ ] Use optimistic UI: immediately show cached conversation, then hydrate with fresh data in background
- [ ] Show a subtle loading indicator (spinner or skeleton) only if fresh data takes >500ms
- [ ] Previously loaded conversations are cached in memory for instant re-display
- [ ] No full-page re-render when switching contacts
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-007: Fix "Connecting..." Status Display

**Description:** As a staff member, I want the connection status indicator at the top-right of Live Chat to accurately reflect the actual WhatsApp connection state, because currently it shows "Connecting..." even when messages can be sent.

**Acceptance Criteria:**
- [ ] Connection status reflects actual Baileys WebSocket state (connected / connecting / disconnected)
- [ ] When WhatsApp is connected and messages can be sent, status shows "Connected" with a green indicator
- [ ] When genuinely disconnecting/reconnecting, status shows "Connecting..." with an amber indicator
- [ ] When disconnected, status shows "Disconnected" with a red indicator
- [ ] Status updates in real-time via WebSocket/SSE events from the server
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### Phase 2: Contact Management & Filtering

> Enrich guest profiles and add powerful filtering for operational efficiency.

---

### US-008: Filter Conversations by Tags

**Description:** As a staff member, I want to filter the conversation list by tags assigned in Contact Details so that I can quickly find guests matching a specific category (e.g., "VIP", "late-checkout", "complaint").

**Acceptance Criteria:**
- [ ] Left pane has a tag filter control (e.g., a filter icon or tag dropdown near the search bar)
- [ ] Clicking the filter shows available tags from all contacts
- [ ] Selecting one or more tags filters the conversation list to only show contacts with those tags
- [ ] Filter can be cleared to show all conversations again
- [ ] Tag filter works in combination with existing search and tab filters (All, Unread, Favourites, Groups)
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-009: Saved & Reusable Tags System

**Description:** As a staff member, I want tags to be saved into a global list so that when I click the Tags input for any guest, I see previously used tags as suggestions while still being able to create new ones.

**Acceptance Criteria:**
- [ ] When a user adds a tag to any contact, it is automatically saved to a global tag list
- [ ] Global tag list stored in Rainbow AI local storage (JSON file, atomic write pattern)
- [ ] When clicking the Tags input field in Contact Details, a dropdown shows all saved tags
- [ ] User can select an existing tag from the dropdown OR type a new tag
- [ ] New tags are added to the global list upon creation
- [ ] Duplicate tags are prevented (case-insensitive)
- [ ] Tags can be removed from contacts (but remain in global list for reuse)
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-010: Unit/Capsule Dropdown from Dashboard Data

**Description:** As a staff member, I want the "Unit/Capsule" field in Contact Details to default to a dropdown list fetched from the main dashboard's capsule data, with the ability to add custom entries.

**Acceptance Criteria:**
- [ ] Unit/Capsule field in Contact Details shows a dropdown with capsule list
- [ ] Capsule list fetched from port 5000 API (`/api/capsules`) on Rainbow AI startup, then cached
- [ ] Cache refreshes periodically (e.g., every 5 minutes) or on manual trigger
- [ ] Dropdown shows capsule names/numbers from the cached list
- [ ] User can type a custom unit name not in the list (combo-box behavior)
- [ ] Custom entries are saved and appear in future dropdowns for all contacts
- [ ] Selected unit is persisted in the contact's data
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-011: Unit/Capsule Filter in Left Pane

**Description:** As a staff member, I want a "Unit" filter button next to "Favourites, Groups" in the left pane so that I can view all conversations related to a specific capsule unit for troubleshooting (e.g., reviewing maintenance issues mentioned in past chats).

**Acceptance Criteria:**
- [ ] A "Unit" filter button/tab appears in the left pane filter row, next to All / Unread / Favourites / Groups
- [ ] Clicking "Unit" opens a dropdown/selector showing available unit/capsule options
- [ ] Selecting a unit filters conversations to only show contacts assigned to that unit
- [ ] Filter can be cleared to return to the full conversation list
- [ ] Works alongside other filters (search, tags)
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-012: Unit Prefix on Contact Names

**Description:** As a staff member, I want contacts with an assigned unit to show the unit as a prefix on their name in the left pane (e.g., "C2-Jay") so that I can instantly identify which capsule a guest occupies.

**Acceptance Criteria:**
- [ ] Once a unit/capsule is set for a contact, their display name in the left pane shows format: `[Unit]-[Name]` (e.g., "C2-Jay", "A5-Mr Dhai")
- [ ] Prefix only appears in the left pane conversation list, not in the actual chat header or contact details
- [ ] If no unit is assigned, name displays normally without prefix
- [ ] Prefix updates immediately when unit is changed in Contact Details
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-013: Staff Name Editing

**Description:** As a staff member, I want to edit my display name (shown left of "Connecting..." at the top-right) so that manual replies are attributed to me for responsibility tracing.

**Acceptance Criteria:**
- [ ] A staff name field appears to the left of the connection status indicator at top-right of Live Chat
- [ ] Default name is "Staff"
- [ ] Clicking the name makes it editable (inline edit or small modal)
- [ ] Name is saved in Rainbow AI settings (settings.json, atomic write)
- [ ] Staff name is stored with each manually-sent message for audit/tracing purposes
- [ ] Staff name persists across browser refreshes and server restarts
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-014: Check-in/Check-out Date Suffix on Names

**Description:** As a staff member, I want contacts with check-in and check-out dates to show a short date code suffix on their name in the left pane (e.g., "Jay - 310101") so that I can instantly know their stay dates.

**Format:** `DDDdmm` where:
- DD = check-in day (2 digits)
- DD = check-out day (2 digits)
- MM = check-in month (2 digits)
- Example: Check-in 31/1/25, Check-out 1/2/25 → `310101` (31 in, 01 out, 01 = January)

**Acceptance Criteria:**
- [ ] Contacts with both check-in and check-out dates show suffix: `[Name] - [DDDDMM]`
- [ ] Format follows the convention: `[check-in day][check-out day][check-in month]`
- [ ] Days are zero-padded (1 → 01, 31 → 31)
- [ ] Month is zero-padded (1 → 01, 12 → 12)
- [ ] If combined with unit prefix, format is: `[Unit]-[Name] - [DateCode]` (e.g., "C2-Jay - 310101")
- [ ] Suffix only appears in left pane, not in chat header
- [ ] If dates are not set, no suffix is shown
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### Phase 3: Messaging Enhancements

> Power features for faster, richer communication.

---

### US-015: Custom Message Templates with `/` Command

**Description:** As a staff member, I want to type `/` in the message input to see and select predefined message templates (custom messages) so that I can send common replies instantly.

**Acceptance Criteria:**
- [ ] Typing `/` in the Live Chat message input opens a command palette/dropdown
- [ ] All static replies from the responses/quick-replies system are available as default custom messages
- [ ] User can add new custom message templates via a management UI (in Responses tab or a dedicated section)
- [ ] Command palette shows template name and preview of content
- [ ] Selecting a template inserts its content into the message input (editable before sending)
- [ ] Input placeholder text reads: `Type a message or type / to see custom commands`
- [ ] Custom messages are stored in Rainbow AI local JSON storage (atomic write pattern)
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-016: Workflow Triggers with `//` Command

**Description:** As a staff member, I want to type `//` in the message input to trigger a workflow (e.g., check-in flow, complaint escalation) so that I can initiate automated multi-step processes.

**Acceptance Criteria:**
- [ ] Typing `//` in the Live Chat message input opens a workflow palette/dropdown
- [ ] Available workflows are listed from Rainbow AI's workflow definitions
- [ ] Selecting a workflow triggers the workflow executor for the current conversation
- [ ] Workflow execution status is shown inline in the chat (e.g., "Workflow 'check-in' started...")
- [ ] `/` and `//` palettes are visually distinct (different header or icon)
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-017: WhatsApp Read Receipts (Double Tick / Blue Tick)

**Description:** As a staff member, I want to see delivery and read status indicators on sent messages so that I know if a guest received and read my message.

**Acceptance Criteria:**
- [ ] Sent messages show a single grey tick when sent
- [ ] Messages show double grey ticks when delivered to recipient's device
- [ ] Messages show double blue ticks when read by recipient (best-effort — Baileys detection)
- [ ] A small disclaimer/tooltip on hover explains: "Read receipts may not always be available"
- [ ] Tick status updates in real-time as Baileys receives status events
- [ ] If read receipt data is unavailable, show delivery ticks only (no false blue ticks)
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-018: Quick Reply Image Attachments

**Description:** As a staff member, I want to attach images to quick replies in `#responses/quick-replies` so that I can send visual content (e.g., maps, menus, room photos) as part of predefined responses.

**Acceptance Criteria:**
- [ ] Quick reply editor in `#responses/quick-replies` has an "Add Image" button/field
- [ ] User can upload an image file (jpg, png, webp) to attach to a quick reply
- [ ] Image is stored in Rainbow AI's local storage (e.g., `RainbowAI/uploads/` or equivalent)
- [ ] When the quick reply is triggered (manually or via static_reply routing), the image is sent along with the text
- [ ] Image preview shown in the quick reply editor
- [ ] Quick replies without images continue to work as text-only (backward compatible)
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### Phase 4: Scheduled Messaging & Reminders

> Proactive guest communication and payment tracking.

---

### US-019: Scheduled Messages

**Description:** As a staff member, I want to schedule a message to be sent at a future date/time so that I can prepare communications in advance (e.g., pre-arrival info, checkout reminders).

**Acceptance Criteria:**
- [ ] In Live Chat message input area, a "Schedule" button/icon is available (e.g., clock icon)
- [ ] Clicking Schedule opens a date/time picker for future send time
- [ ] User composes the message, sets the date/time, and confirms
- [ ] Scheduled message is saved in Rainbow AI local JSON storage (atomic write)
- [ ] A background scheduler checks and sends messages at the scheduled time
- [ ] Scheduled messages are visible in a "Scheduled" section (accessible from the chat or a dedicated tab)
- [ ] User can edit or cancel a scheduled message before it's sent
- [ ] Sent scheduled messages appear in the conversation as normal messages
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-020: Repeating Scheduled Messages

**Description:** As a staff member, I want to set scheduled messages to repeat daily, weekly, or monthly so that recurring communications (e.g., weekly cleaning reminders, monthly payment notices) are automated.

**Acceptance Criteria:**
- [ ] When scheduling a message (US-019), user can optionally set a repeat frequency: None, Daily, Weekly, Monthly
- [ ] Repeating messages execute at the same time on their repeat cycle
- [ ] Each repeat instance is logged in the conversation
- [ ] User can stop/pause a repeating schedule at any time
- [ ] Repeating schedule config stored alongside the scheduled message in JSON storage
- [ ] A "Scheduled Messages" management view shows all active repeating messages
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

### US-021: Payment Reminder System

**Description:** As a staff member, I want to set a payment reminder with a due date in Contact Details so that I get notified and can auto-send a chase message when payment is overdue.

**Acceptance Criteria:**
- [ ] In Contact Details, below the "Payment" section, there is a "Set Reminder" control with a date picker
- [ ] User can set a reminder date for payment chasing
- [ ] When the reminder date arrives:
  - [ ] The contact's entry in the left pane shows a special badge (e.g., red/orange payment icon)
  - [ ] A notification indicator appears at the top-left area of Live Chat (e.g., bell icon with count)
- [ ] User can optionally tick a checkbox to auto-send a predefined payment chase message on the reminder date
- [ ] Auto-send message is configurable (template text editable by user)
- [ ] User can dismiss/snooze the reminder
- [ ] Reminder data stored in Rainbow AI local JSON storage (atomic write)
- [ ] Multiple contacts can have independent payment reminders
- [ ] TypeScript compiles with zero errors
- [ ] **Verify in browser using agent-browser**

---

## 4. Functional Requirements

**Chat Simulator:**
- FR-1: The system must display token usage (in/out) and context message count for each LLM-tier AI reply in Live Simulation
- FR-2: The system must position the Guest Simulation input box at the top of the panel

**Message Display:**
- FR-3: The system must prefix AI-generated replies with a robot icon in all chat views
- FR-4: The system must NOT show robot icon on manually-sent staff messages
- FR-5: The system must show delivery ticks (single/double grey) and read ticks (double blue, best-effort) on sent messages

**UX & Navigation:**
- FR-6: The system must allow dismissal of info/warning banners with a "Dismiss" button
- FR-7: The system must provide access to previously dismissed messages
- FR-8: The system must switch conversation panes within 200ms of clicking a contact
- FR-9: The system must accurately display WhatsApp connection status (connected/connecting/disconnected)

**Contact Management:**
- FR-10: The system must support a global reusable tag system with autocomplete
- FR-11: The system must allow filtering conversations by assigned tags
- FR-12: The system must fetch and cache capsule list from port 5000 API on startup
- FR-13: The system must show unit prefix on contact names in left pane (e.g., "C2-Jay")
- FR-14: The system must show date suffix on contact names using DDDDMM format
- FR-15: The system must support filtering conversations by unit/capsule

**Staff Identity:**
- FR-16: The system must allow staff to set and persist their display name
- FR-17: The system must attribute manual messages to the current staff name

**Messaging:**
- FR-18: The system must support `/` command for custom message template selection
- FR-19: The system must support `//` command for workflow triggering
- FR-20: The system must support image attachments on quick replies

**Scheduling:**
- FR-21: The system must support scheduling messages for future send times
- FR-22: The system must support daily/weekly/monthly repeat cycles for scheduled messages
- FR-23: The system must support payment reminders with date-based notifications and optional auto-send

**AI Notes:**
- FR-24: The system must generate complete, untruncated AI notes
- FR-25: The system must display and allow editing of context files after "Add to Context"

---

## 5. Non-Goals (Out of Scope)

- **Group chat management** — this PRD focuses on 1:1 guest conversations only
- **Multi-device staff tracking** — staff name is a simple shared setting, not per-login
- **Payment processing** — only reminders and chase messages, no actual payment integration
- **WhatsApp Business API migration** — continues using Baileys direct connection
- **Capsule list CRUD in Rainbow AI** — Rainbow AI only reads/caches the capsule list; management stays in the main dashboard
- **Message encryption/E2EE indicators** — out of scope for this iteration
- **Bulk messaging / broadcast lists** — not included in this PRD

---

## 6. Technical Considerations

### Storage
- All new data (tags, schedules, reminders, staff name, custom messages) stored in Rainbow AI local JSON files using the atomic write pattern (`config-store.ts` → `.tmp` then `renameSync`)
- Capsule list fetched from port 5000 API and cached in memory with periodic refresh

### Background Scheduler
- A lightweight scheduler process (setInterval-based) needed for:
  - Sending scheduled messages at their due time
  - Triggering payment reminder notifications
  - Refreshing capsule cache
- Must survive server restarts (read pending schedules from JSON on startup)

### Baileys Integration
- Read receipts: Listen for `messages.update` events with `status` field (DELIVERY_ACK, READ, PLAYED)
- Connection status: Listen for `connection.update` events
- Image sending: Use `sendMessage` with `image` type for quick reply attachments

### Cross-Module API
- Rainbow AI (port 3002) makes HTTP GET to port 5000 `/api/capsules` for capsule list
- This is the only new cross-module dependency introduced
- Must handle port 5000 being unavailable gracefully (use cached data or manual list)

### Performance
- Conversation pane switching: Cache loaded conversations in a Map/LRU cache client-side
- Optimistic UI: Show cached data immediately, refresh in background

### Import Boundaries
- All changes are within `RainbowAI/` — zero new imports from `server/`, `client/`, or `shared/`
- Capsule data fetched via HTTP API, not direct import

---

## 7. Success Metrics

| Metric | Target |
| ------ | ------ |
| Conversation switch time | < 200ms perceived |
| Connection status accuracy | Matches actual Baileys state 100% of the time |
| Scheduled message delivery | Within 60 seconds of scheduled time |
| AI notes generation | Zero truncation on notes < 2000 chars |
| Tag autocomplete response | < 100ms |
| Staff adoption of `/` commands | > 50% of staff use within 1 week |
| Payment reminder delivery | 100% of set reminders trigger notification |

---

## 8. Open Questions

1. **Tag deletion from global list** — should there be a way to clean up unused tags from the global list? (Suggest: admin-only tag management)
2. **Scheduled message timezone** — which timezone for scheduling? Server local time (MYT/UTC+8) or let user pick? (Suggest: default to MYT since hostel is in Malaysia)
3. **Maximum scheduled messages** — should there be a limit per contact or globally? (Suggest: 50 active schedules max to prevent JSON bloat)
4. **Context file format** — when showing editable context files (US-005b), should edits auto-reload into Rainbow AI's KB, or require a manual refresh? (Suggest: auto-reload on save)
5. **Read receipt privacy** — should staff see if guest read their message, or could this create pressure? (Suggest: show by default, let admin disable in settings)

---

## Implementation Order (Suggested Ralph Iterations)

| Phase | Stories | Est. Iterations |
| ----- | ------- | --------------- |
| **Phase 1: Quick Fixes** | US-001 through US-007 | 4-5 iterations |
| **Phase 2: Contact Mgmt** | US-008 through US-014 | 5-6 iterations |
| **Phase 3: Messaging** | US-015 through US-018 | 4-5 iterations |
| **Phase 4: Scheduling** | US-019 through US-021 | 3-4 iterations |

**Dependencies:**
- US-009 (saved tags) should complete before US-008 (tag filtering)
- US-010 (capsule dropdown) should complete before US-011 (unit filter) and US-012 (unit prefix)
- US-019 (scheduled messages) must complete before US-020 (repeating) and US-021 (payment reminders)
- US-014 (date suffix) and US-012 (unit prefix) can be implemented independently but share display logic
