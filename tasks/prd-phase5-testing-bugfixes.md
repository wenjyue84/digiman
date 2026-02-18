# PRD: Rainbow AI Testing, Bug Fixes & Enhancements Phase 5

**Created:** 2026-02-18
**Status:** Active
**Module:** RainbowAI (port 3002)
**Branch:** ralph/live-chat-enhancements

---

## 1. Introduction / Overview

Phase 5 focuses on fixing broken features, improving test infrastructure, consolidating settings, and adding a capsule conflict resolution workflow. All changes are within `RainbowAI/` module only.

**Problem:** Several dashboard features are broken (test history, image attachments, tags/unit filters, contact details 'Set' button, AI notes truncation). Test infrastructure lacks multi-turn workflow testing and check-in process coverage. AI model settings are scattered across two different pages. The autotest scenario count is hardcoded.

---

## 2. Goals

- Fix all broken UI features (test history, image attachments, filters, contact details)
- Improve test coverage with check-in process test suite and multi-turn workflow tests
- Consolidate AI model settings into one location with OCR model support
- Add capsule conflict detection and resolution workflow
- Ensure all changes have regression tests
- Update documentation after all fixes

---

## 3. User Stories

### Phase A: Bug Fixes (Quick Wins)

---

### US-001: Fix Quick Test History showing nothing

**Description:** As a tester, I want the Test History in `#chat-simulator/quick-test` to display previous test results so I can track my testing progress.

**Acceptance Criteria:**
- [ ] Quick Test History modal shows previous test results when opened
- [ ] Test results are persisted to localStorage key `rainbow-quick-test-history`
- [ ] Each quick test result is saved after execution (input message, matched intent, confidence, timestamp)
- [ ] History survives page refresh
- [ ] Clear history button works
- [ ] Write regression test to verify history persistence
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- Quick test history function: `RainbowAI/src/public/js/modules/chat-send.js` (line 17: `QT_HISTORY_KEY`, line 42: `showQuickTestHistory()`)
- HTML template: `RainbowAI/src/public/templates/tabs/chat-simulator.html` (line 241: button, line 287: modal)
- Chunk import: `RainbowAI/src/public/js/module-chunks/chat-simulator-chunk.js` (line 39, 64)
- Check if `sendChatMessage()` actually calls the save-to-history logic after test completes
- Compare with working version in `rainbow-admin.html.original` (line 5434-5444) for localStorage logic

---

### US-002: Fix message-pipeline.test.ts in Testing tab

**Description:** As a developer, I want the message-pipeline.test.ts in `#testing` to run without errors so I can validate the message processing pipeline.

**Acceptance Criteria:**
- [ ] message-pipeline.test.ts runs successfully in the Testing tab
- [ ] All test assertions pass or have clear skip reasons
- [ ] Test file exists and is properly referenced
- [ ] Write regression test to verify test runner works
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors

**Technical Notes:**
- Testing page: `RainbowAI/src/public/templates/tabs/testing.html`
- Testing module: `RainbowAI/src/public/js/modules/testing.js`
- Testing route: `RainbowAI/src/routes/admin/testing.ts`
- No `message-pipeline.test.ts` found in source — may reference a deleted/renamed file. Check git history for the original file and recreate or update references
- Test files location: `RainbowAI/src/__tests__/`

---

### US-003: Fix image attachment "not found" in Quick Replies

**Description:** As a staff member, I want to attach images to quick replies without getting a "not found" error so I can include visual content in predefined responses.

**Acceptance Criteria:**
- [ ] Attaching an image in `#responses/quick-replies` works without "not found" error
- [ ] Image uploads successfully to server storage
- [ ] Image preview displays in the quick reply editor
- [ ] Saved image URL is valid and accessible
- [ ] Write regression test for image upload endpoint
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- Quick replies CRUD: `RainbowAI/src/public/js/modules/responses-crud.js` (lines 416-437: imageUrl handling)
- Templates route: `RainbowAI/src/routes/admin/templates.ts`
- Check image upload endpoint — likely returning 404 because the upload route or directory doesn't exist
- May need to create `RainbowAI/uploads/` directory and add multer middleware

---

### US-004: Fix autotest suite scenario count

**Description:** As a tester, I want the autotest suite count to always reflect the actual number of test scenarios instead of showing a hardcoded "58".

**Acceptance Criteria:**
- [ ] The scenario count in `#chat-simulator` dynamically reflects the total test count
- [ ] Count updates automatically when scenarios are added/removed
- [ ] Remove hardcoded "58 scenarios" text from HTML templates
- [ ] Use dynamic counting from `AUTOTEST_SCENARIOS.length`
- [ ] Write regression test to verify count accuracy
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- Hardcoded text: `RainbowAI/src/public/templates/tabs/chat-simulator.html` (line 37)
- Also hardcoded in: `RainbowAI/src/public/templates/tabs/preview.html` (line 15)
- Dynamic counting exists: `RainbowAI/src/public/js/modules/autotest-ui.js` (lines 353-355, uses `scenario-count` element ID)
- Scenarios defined in: `RainbowAI/src/public/js/modules/autotest-scenarios.js`
- Fix: Replace hardcoded "58" with `<span id="scenario-count">--</span>` in HTML templates

---

### US-005: Fix button overlap (delete/fullscreen)

**Description:** As a staff member, I want all buttons in the dashboard to be properly positioned without overlapping so I can click them reliably.

**Acceptance Criteria:**
- [ ] Delete and fullscreen buttons do not overlap
- [ ] All action buttons in test result cards have proper spacing
- [ ] Buttons are clickable without accidentally triggering adjacent buttons
- [ ] Fix applies across all tabs where this overlap occurs
- [ ] Write regression test for button layout
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- Likely in autotest result cards or chat simulator output panels
- Check CSS in: `RainbowAI/src/public/css/rainbow-livechat-core.css` and `rainbow-livechat-ui.css`
- Also check module-specific CSS for button positioning (absolute positioning conflicts)
- May need `gap`, `margin`, or `z-index` fixes

---

### US-006: Fix Tags and Unit filter buttons in Live Chat

**Description:** As a staff member, I want the Tags and Unit filter buttons in `#live-chat` to work properly — clicking Unit should show available units and clicking Tags should show available tags.

**Acceptance Criteria:**
- [ ] Clicking 'Unit' button in left pane shows dropdown of all existing units
- [ ] Clicking 'Tags' button in left pane shows dropdown of all existing tags
- [ ] Selecting a unit/tag filters conversations correctly
- [ ] Dropdown closes when clicking outside
- [ ] Clear filter restores full conversation list
- [ ] Write regression test for filter functionality
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- Filter implementation exists in: `RainbowAI/src/public/js/modules/live-chat-panels.js` (lines 816-958)
- Core filtering: `RainbowAI/src/public/js/modules/live-chat-core.js` (lines 433-449)
- Dropdown elements: `lc-tag-filter-dropdown`, `lc-unit-filter-dropdown`, `lc-tag-filter-btn`, `lc-unit-filter-btn`
- Click outside handler: `RainbowAI/src/public/js/modules/live-chat.js` (lines 266-274)
- Tags API: `RainbowAI/src/routes/admin/tags.ts` — GET /tags returns global tags
- Capsules API: `RainbowAI/src/routes/admin/capsules.ts` — provides unit list
- Likely issue: dropdown rendering function not loading data from API, or click handlers not wired in the modular version

---

### US-007: Fix Contact Details 'Set' button (Failed Not found)

**Description:** As a staff member, I want the 'Set' button in `#live-chat` contact details to work without showing "Failed Not found" so I can update guest contact information.

**Acceptance Criteria:**
- [ ] Clicking 'Set' in contact details updates the field without error
- [ ] The API endpoint exists and handles the request correctly
- [ ] All contact detail fields (name, unit, tags, dates) can be set
- [ ] Write regression test for contact detail update endpoint
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- Contact details panel: `RainbowAI/src/public/js/modules/live-chat-panels.js`
- Contact update API: `RainbowAI/src/routes/admin/conversations.ts`
- "Not found" likely means the API endpoint URL doesn't match what the frontend calls
- Check network tab to see the exact URL being called and compare with route definitions

---

### US-008: Fix AI Notes truncation in Contact Details

**Description:** As a staff member, I want 'Generate by AI' notes to show complete output without truncation so I can see the full AI-generated summary.

**Acceptance Criteria:**
- [ ] 'Generate by AI' produces complete, untruncated output
- [ ] Notes textarea auto-expands to show full content
- [ ] No max-height or overflow:hidden cutting off text
- [ ] AI provider returns full response (check token limits)
- [ ] Write regression test for notes generation
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- AI notes function: `RainbowAI/src/public/js/modules/live-chat-actions.js` (lines 1324-1353: `generateAINotes()`)
- Frontend auto-expand exists (line 1342-1343: `textarea.style.height = textarea.scrollHeight + 'px'`)
- API endpoint: `POST /conversations/:phone/generate-notes` in `RainbowAI/src/routes/admin/conversations.ts`
- Truncation likely in backend: check if AI provider has max_tokens limit set too low
- Also check if textarea CSS has `max-height` in the stylesheets

---

### Phase B: UI Improvements

---

### US-009: Move KB Accuracy Tester to top of Knowledge Base page

**Description:** As a staff member, I want the KB Accuracy Tester at the top of `#responses/knowledge-base` so I can test KB accuracy without scrolling, similar to the quick-test layout.

**Acceptance Criteria:**
- [ ] KB Accuracy Tester section is at the top of the Knowledge Base page
- [ ] Layout similar to `#chat-simulator/quick-test` (input + results above content)
- [ ] Existing KB management content below the tester
- [ ] No functionality regression in KB editing
- [ ] Write regression test for KB page layout
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- Knowledge base template: `RainbowAI/src/public/templates/tabs/responses.html` or related
- KB route: `RainbowAI/src/routes/admin/knowledge-base.ts`
- KB module: `RainbowAI/src/public/js/modules/knowledge.js` and `kb-editor.js`

---

### US-010: Token usage details in KB Accuracy Tester

**Description:** As a staff member, I want detailed token usage breakdown in KB Accuracy Tester so I can understand and optimize token consumption per question.

**Acceptance Criteria:**
- [ ] KB test results show: input tokens, output tokens, total tokens
- [ ] Show KB context tokens separately (how many tokens the loaded KB content uses)
- [ ] Show system prompt token count
- [ ] Breakdown helps identify which part uses most tokens
- [ ] Write regression test for token reporting
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- AI client: `RainbowAI/src/assistant/ai-client.ts` — returns usage data from provider
- KB test endpoint: likely in `RainbowAI/src/routes/admin/testing.ts` or `testing-preview.ts`
- Token data should come from the AI provider's response metadata (usage field)
- Break down: system_prompt_tokens + kb_context_tokens + user_message_tokens = input_tokens

---

### US-011: Consolidate AI Model Settings

**Description:** As a staff member, I want all AI model settings in one place at `#settings/ai-models` including OCR model, with a read-only reference link in `#understanding/t4`.

**Acceptance Criteria:**
- [ ] All AI model settings from `#settings/ai-models` and `#understanding/t4` combined at `#settings/ai-models`
- [ ] `#understanding/t4` shows read-only view with "Edit in Settings" link
- [ ] New OCR LLM model setting added (default: Google Gemini 2.5 Flash)
- [ ] OCR model selectable from existing provider list
- [ ] All model changes saved to settings.json atomically
- [ ] Write regression test for settings consolidation
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- Settings AI models module: `RainbowAI/src/public/js/modules/settings-ai-models.js`
- Settings template: `RainbowAI/src/public/templates/tabs/settings.html`
- Understanding module: `RainbowAI/src/public/js/modules/understanding.js`
- Settings data: `RainbowAI/src/assistant/data/settings.json` (has `providers` array with 15+ models)
- Add `ocr_provider` field to settings.json alongside existing `providers` and `routing_mode`
- T4 settings: check `understanding.html` for the T4 model configuration UI

---

### US-012: Move Staff name to 3-dot menu

**Description:** As a staff member, I want the Staff name moved from the header area into the 3-dot vertical menu to reduce header clutter.

**Acceptance Criteria:**
- [ ] Staff name no longer shows directly in the header beside connection status
- [ ] Staff name is accessible via the 3-dot menu (vertical ellipsis)
- [ ] Click to edit functionality works within the menu
- [ ] Staff name persists after editing
- [ ] Write regression test for staff name location
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- Staff name in header: `RainbowAI/src/public/js/modules/live-chat-core.js`
- Settings: `RainbowAI/src/assistant/data/settings.json` (field: `staffName`)
- Live chat template: `RainbowAI/src/public/templates/tabs/live-chat.html`
- 3-dot menu: look for existing vertical menu icon and its dropdown handler in live-chat template

---

### Phase C: Testing Infrastructure

---

### US-013: Add Check-in Process test suite

**Description:** As a tester, I want a dedicated 'Check-in Process' test suite in the Run All button options that tests the check-in workflow from easy to hard edge cases.

**Acceptance Criteria:**
- [ ] New 'Check-in Process' option in Run All dropdown
- [ ] Test suite includes 10+ scenarios from easy to hard:
  - Basic check-in inquiry
  - Check-in with specific date
  - Check-in with multiple guests
  - Check-in asking about capsule type preference
  - Check-in with special requests
  - Check-in with late arrival
  - Check-in with early arrival
  - Check-in when fully booked
  - Check-in with wrong date format
  - Check-in in different languages (en/ms/zh)
- [ ] Tests run programmatically and report pass/fail
- [ ] Failed tests generate user story suggestions
- [ ] Write regression test for test suite runner
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors

**Technical Notes:**
- Autotest scenarios: `RainbowAI/src/public/js/modules/autotest-scenarios.js`
- Autotest execution: `RainbowAI/src/public/js/modules/autotest-execution.js`
- Autotest UI: `RainbowAI/src/public/js/modules/autotest-ui.js`
- Add scenarios to autotest-scenarios.js with category 'check-in-process'
- Run All dropdown: extend with new test suite filter option

---

### US-014: Run All tests programmatically and generate user stories

**Description:** As a developer, I want to run all autotest scenarios programmatically via API and get structured results to auto-generate user stories from failures.

**Acceptance Criteria:**
- [ ] API endpoint `POST /api/rainbow/testing/run-all` triggers all tests programmatically
- [ ] Returns structured JSON with pass/fail for each scenario
- [ ] Failed scenarios include: scenario name, expected intent, actual intent, confidence, error message
- [ ] API endpoint `GET /api/rainbow/testing/generate-stories` converts failures to user story format
- [ ] Write regression test for programmatic test runner
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors

**Technical Notes:**
- Testing route: `RainbowAI/src/routes/admin/testing.ts`
- Autotest execution module: `RainbowAI/src/public/js/modules/autotest-execution.js`
- May need to move test execution logic from frontend to backend for programmatic access
- Test results should be saved to a file for later analysis

---

### US-015: Multi-turn workflow autotest

**Description:** As a tester, I want autotest workflow tests to simulate complete multi-turn conversations where the test answers ALL questions in a workflow, not just the first one.

**Acceptance Criteria:**
- [ ] Workflow autotest scenarios include multiple turns per workflow
- [ ] Each turn sends a realistic guest response to the workflow question
- [ ] Test verifies the AI asks the correct next question after each answer
- [ ] Test covers complete workflow from trigger to completion
- [ ] Tests handle: check-in workflow, complaint workflow, booking workflow
- [ ] Write regression test for multi-turn execution
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors

**Technical Notes:**
- Workflow scenarios: `RainbowAI/src/public/js/modules/autotest-scenarios-workflow.js`
- Workflow tester: `RainbowAI/src/public/js/features/workflow-tester.js`
- Workflow testing module: `RainbowAI/src/public/js/modules/workflow-testing.js`
- Each scenario needs: array of turns [{userMessage, expectedBotPattern}]
- Test execution needs to be sequential (send message, wait for response, send next)

---

### US-016: Create user stories from autotest errors

**Description:** As a developer, I want to run the full autotest suite after implementing multi-turn tests and automatically generate user stories from any failures found.

**Acceptance Criteria:**
- [ ] Run all autotests including new multi-turn workflow tests
- [ ] Collect all failures with detailed error info
- [ ] Generate prd.json-compatible user stories from each failure
- [ ] Stories include: title from failure description, acceptance criteria from expected behavior
- [ ] Append generated stories to prd.json (or output as separate file)
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors

**Technical Notes:**
- Depends on US-014 and US-015 being complete
- Use the programmatic test runner from US-014
- Output format should match prd.json userStories schema

---

### Phase D: New Features

---

### US-017: Capsule Conflict Detection and Resolution Workflow

**Description:** As a capsule operator, I want Rainbow AI to detect and resolve capsule occupancy conflicts — when a guest finds someone already in their assigned capsule — by notifying the operator, suggesting actions via LLM, and executing approved changes.

**Acceptance Criteria:**
- [ ] Rainbow AI detects capsule conflict when guest reports "someone in my capsule"
- [ ] AI identifies the intent as `capsule_conflict` (new intent)
- [ ] AI checks capsule assignment data via dashboard API
- [ ] AI notifies capsule operator via WhatsApp with conflict details
- [ ] AI uses LLM to analyze situation and suggest resolution:
  - If switch: suggest updating both capsule assignments
  - If unknown person: suggest physical inspection
  - If system error: suggest correction
- [ ] For simple capsule switch: AI can update system with operator approval
- [ ] For complex cases (unknown person): AI waits for operator decision
- [ ] Operator can approve/reject via WhatsApp reply
- [ ] AI confirms resolution to the guest
- [ ] All conflict events logged for audit
- [ ] Write regression tests for conflict detection and resolution flow
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors

**Technical Notes:**
- New intent: Add `capsule_conflict` to `RainbowAI/src/assistant/data/intent-keywords.json` and `intent-examples.json`
- Routing: Add `capsule_conflict` to `routing.json` with action `escalate_capsule_conflict`
- Capsule data: Use capsule cache (`RainbowAI/src/lib/capsule-cache.ts`) to check assignments
- Staff notification: Use WhatsApp instance (`RainbowAI/src/lib/whatsapp/instance.ts`) to message operator
- LLM suggestion: Use ai-client.ts with a capsule conflict analysis prompt
- Approval flow: Store pending approvals in JSON, operator replies trigger resolution
- Staff phones: `RainbowAI/src/assistant/data/settings.json` → `staff.phones`
- New workflow: May need a capsule-conflict workflow definition for multi-step handling

---

### Phase E: Documentation

---

### US-018: Update User Guide and Developer Guide

**Description:** As a staff member or developer, I want the guides in `#help` to reflect all Phase 5 changes so documentation stays current.

**Acceptance Criteria:**
- [ ] User guide updated with new features: KB Accuracy Tester location, consolidated AI settings, OCR model, capsule conflict handling
- [ ] Developer guide updated with: new test suites, programmatic testing API, multi-turn test format, new intents/routes
- [ ] All bug fixes mentioned in changelog section
- [ ] Screenshots or descriptions of UI changes
- [ ] TypeScript compiles with zero errors
- [ ] Server starts and dashboard loads without errors
- [ ] **Verify in browser using agent-browser**

**Technical Notes:**
- User guide: `RainbowAI/src/public/templates/tabs/help-user-guide.html`
- Developer guide: `RainbowAI/src/public/templates/tabs/help-developer-guide.html`
- Help module: `RainbowAI/src/public/js/modules/help.js`

---

## 4. Functional Requirements

**Bug Fixes:**
- FR-1: Quick Test History must persist and display test results from localStorage
- FR-2: message-pipeline.test.ts must execute without errors in Testing tab
- FR-3: Image attachment in quick replies must upload and display without "not found" errors
- FR-4: Autotest scenario count must dynamically update from actual scenario array length
- FR-5: Delete and fullscreen buttons must not overlap
- FR-6: Tags and Unit filter buttons must show dropdowns and filter conversations
- FR-7: Contact Details 'Set' button must update fields without 404 errors
- FR-8: AI notes generation must produce complete untruncated output

**UI Improvements:**
- FR-9: KB Accuracy Tester must be positioned at top of Knowledge Base page
- FR-10: KB Accuracy Tester must show detailed token usage breakdown
- FR-11: AI model settings from two pages must be consolidated into one
- FR-12: Staff name must be accessible via 3-dot menu instead of header
- FR-13: OCR LLM model setting must be available (default: Gemini 2.5 Flash)

**Testing Infrastructure:**
- FR-14: Check-in Process test suite must have 10+ edge case scenarios
- FR-15: Programmatic test runner API must return structured pass/fail results
- FR-16: Workflow autotests must simulate complete multi-turn conversations
- FR-17: Failed tests must generate user story suggestions

**New Features:**
- FR-18: Rainbow AI must detect capsule occupancy conflicts from guest messages
- FR-19: Rainbow AI must notify operator and suggest LLM-based resolution
- FR-20: Simple capsule swaps must be executable with operator WhatsApp approval

---

## 5. Non-Goals (Out of Scope)

- Capsule hardware/IoT integration for physical detection
- Payment integration for capsule billing
- Multi-device staff tracking per capsule
- Real-time capsule occupancy monitoring dashboard
- Changes to main dashboard (port 5000) — all changes in RainbowAI only

---

## 6. Cross-Cutting Concerns

### Regression Tests (Item 1)
Every user story must include regression tests that verify:
- The fix/feature works correctly
- Existing features are not broken by the change
- TypeScript compiles cleanly

### Agent Browser Verification (Item 16)
All UI-affecting stories must be verified using the agent-browser skill before marking complete.

---

## 7. Success Metrics

| Metric | Target |
| ------ | ------ |
| Bug fix completion | All 8 bug fixes resolved |
| Autotest pass rate | > 90% scenarios pass after Phase C |
| Capsule conflict detection | Correctly identifies intent > 85% |
| Token visibility | All KB tests show token breakdown |
| Zero regressions | No existing features broken |

---

## 8. Implementation Order (Quick Wins First)

| Priority | Stories | Phase |
| -------- | ------- | ----- |
| 1-8 | US-001 to US-008 | A: Bug Fixes |
| 9-12 | US-009 to US-012 | B: UI Improvements |
| 13-16 | US-013 to US-016 | C: Testing Infra |
| 17 | US-017 | D: Capsule Conflict |
| 18 | US-018 | E: Documentation |

**Dependencies:**
- US-016 depends on US-014 + US-015
- US-018 depends on all other stories
