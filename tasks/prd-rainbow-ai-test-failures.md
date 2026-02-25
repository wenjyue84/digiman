# PRD: Rainbow AI — Test Failure Fixes

**Feature:** Fix all 15 failures discovered in the full 133-scenario autotest suite
**Date:** 2026-02-26
**Test runs:** 56-scenario (92.9% pass, 3 fail) + 133-scenario (88.0% pass, 15 fail, 1 warn)
**Test runner:** `node RainbowAI/scripts/test-all-133.js --concurrency=2`
**Full JSON report:** `RainbowAI/reports/autotest/full-133-2026-02-25-23-11-56.json`

---

## 1. Introduction / Overview

Rainbow AI's full 133-scenario test suite (restored from `autotest-scenarios-single.js` + `autotest-scenarios-workflow.js`) revealed 15 failed tests across 5 categories:

| Category | Failures | Root Cause |
|----------|----------|------------|
| Intent / KB misclassification | 5 | Wrong intent matched; KB entry missing or not loaded |
| Response keyword fragility | 3 | Test keywords too narrow; LLM fallback gives different phrasing |
| Multi-turn workflow context loss | 4 | Conversation history not preserved across turns |
| Long conversation memory | 1 | Summarization drops named entities (user's name) |
| Sentiment escalation | 2 | 3× negative messages do not trigger staff escalation |

This PRD covers every failure as a standalone user story, plus one story to restore the full 133-scenario suite as the canonical test file.

---

## 2. Goals

- Reduce failed tests from **15 → 0** on the full 133-scenario run
- Bring pass rate from **88.0% → ≥ 95%**
- Fix root causes (not just widen test keywords) where an actual AI behaviour is broken
- Restore and maintain the complete 133-scenario suite as the default autotest file

---

## 3. User Stories

---

### US-001: Fix Noise Complaint Intent — "Baby Crying"

**Description:** As a guest reporting noise (crying baby), I want Rainbow AI to respond with empathy and offer help (relocate / send staff), so that I feel heard and get practical assistance.

**Current failure:**
Message: `"A baby has been crying all night"`
Actual intent: `contact_staff` → routed to `workflow:escalate`
Actual response: Generic escalation boilerplate mentioning "billing disputes"
Expected keywords: `understand`, `relocate`, `room`

**Acceptance Criteria:**
- [ ] Message `"A baby has been crying all night"` classifies to a noise/complaint intent (not `contact_staff`)
- [ ] Response contains at least one of: `understand`, `sorry`, `relocate`, `room`, `quiet`, `staff`
- [ ] Response does NOT mention "billing disputes" for a noise complaint
- [ ] Test `duringstay-noise-baby` passes in `test-all-133.js`
- [ ] Multi-language: response in en/ms/zh contains equivalent empathy keywords
- [ ] Full 133-scenario run maintains ≥ 95% pass rate after change
- [ ] Verify in Chat Simulator: send "A baby has been crying all night" and confirm empathy response

**Files likely to change:**
- `RainbowAI/src/assistant/data/intent-keywords.json` — add noise-complaint keywords
- `RainbowAI/src/assistant/data/routing.json` — verify noise/complaint intent routes correctly
- `RainbowAI/src/assistant/data/autotest-scenarios.js` — optionally widen test keywords as safety net

---

### US-002: Fix Tourist Guide Response — Missing Attraction Names

**Description:** As a guest asking about tourist attractions, I want Rainbow AI to recommend specific local attractions (LEGOLAND, Desaru, etc.), so that I get useful local travel guidance.

**Current failure:**
Message: `"Can you recommend some tourist spots nearby?"`
Expected keywords: `LEGOLAND`, `Desaru`, `attract`, `website`
Actual response: Missing all expected attraction references

**Acceptance Criteria:**
- [ ] Message `"Can you recommend some tourist spots nearby?"` returns a response containing at least one of: `LEGOLAND`, `Desaru`, `Sultan`, `attractions`, `tourist`
- [ ] Knowledge base file for tourist attractions is loaded and returns content for this intent
- [ ] Test `duringstay-tourist` passes in `test-all-133.js`
- [ ] `guessTopicFiles()` in `knowledge-base.ts` correctly matches tourist-related messages
- [ ] Full 133-scenario run maintains ≥ 95% pass rate after change

**Files likely to change:**
- `RainbowAI/.rainbow-kb/` — verify tourist attractions KB file exists and has LEGOLAND/Desaru content
- `RainbowAI/src/assistant/knowledge-base.ts` — verify `guessTopicFiles()` maps tourist intent to correct KB file
- `RainbowAI/src/assistant/data/intent-keywords.json` — ensure `tourist_guide` intent keywords cover "tourist spots"

---

### US-003: Fix Malay Slang Pricing — "nk tny harga"

**Description:** As a Malay-speaking guest using WhatsApp slang, I want Rainbow AI to understand `"nk tny harga capsule"` (want to ask price), so that I receive a pricing response without needing to use formal language.

**Current failure:**
Message: `"nk tny harga capsule"` (Malay slang: "want to ask the price of capsule")
Expected keywords: `RM`, `price`, `night`, `harga`, `rate`
Actual response: None of these keywords present

**Acceptance Criteria:**
- [ ] Message `"nk tny harga capsule"` returns a response containing at least one of: `RM`, `harga`, `malam`, `price`, `night`, `rate`
- [ ] T2 fuzzy matcher OR intent keywords cover `nk tny` / `tny` / `harga` as pricing signals
- [ ] Test `slang-nk-tny-harga` passes in `test-all-133.js`
- [ ] Related slang test `slang-brp-harga` (`"brp harga satu mlm"`) still passes
- [ ] Full 133-scenario run maintains ≥ 95% pass rate after change

**Files likely to change:**
- `RainbowAI/src/assistant/data/intent-keywords.json` — add Malay slang variants (`nk tny`, `brp`, `harga`)
- `RainbowAI/src/assistant/fuzzy-matcher.ts` — verify Malay abbreviation normalisation

---

### US-004: Fix Capsule Layout Responses — Lower Deck Queries

**Description:** As a guest asking which capsules are lower deck, I want Rainbow AI to state the specific capsule numbers (e.g. even-numbered C2, C4, C6), so that I can choose my preferred bunk.

**Current failures (2 tests):**
- `"Which capsule numbers are the lower deck?"` → missing `even`, `lower`, `C2`, `C4`, `C6`
- `"I have a bad back, I need a lower deck capsule"` → missing `lower`, `deck`, `even`, `C2`, `C4`, `staff`, `arrange`

**Acceptance Criteria:**
- [ ] `"Which capsule numbers are the lower deck?"` returns a response containing `even` OR `lower` OR `C2` OR `C4` OR `C6`
- [ ] `"I have a bad back, I need a lower deck capsule"` returns a response containing `lower` OR `deck` OR `arrange` OR `staff`
- [ ] Tests `capsule-which-lower` and `ci-suite-special-needs` both pass in `test-all-133.js`
- [ ] KB content explicitly states even-numbered capsules (C2, C4, C6) are lower deck
- [ ] KB content explicitly states odd-numbered capsules (C1, C3, C5) are upper deck
- [ ] Full 133-scenario run maintains ≥ 95% pass rate after change

**Files likely to change:**
- `RainbowAI/.rainbow-kb/` — capsule layout KB file; ensure lower/upper deck assignment is explicit
- `RainbowAI/src/assistant/knowledge-base.ts` — verify capsule-specific queries load the layout KB file

---

### US-005: Fix Extra Amenity Response — Towel/Blanket Keyword Resilience

**Description:** As a guest requesting extra towels, I want Rainbow AI to always respond with delivery confirmation language, so that the autotest does not flake due to LLM response variation.

**Current failure (transient):**
Message: `"Can I get more towels?"`
Expected keywords: `deliver`, `housekeeping`
Response sometimes varies when LLM fallback is used (10.3s response time indicates primary provider timeout)

**Acceptance Criteria:**
- [ ] Message `"Can I get more towels?"` returns a response containing at least one of: `deliver`, `housekeeping`, `arrange`, `bring`, `send`, `towel`
- [ ] Static reply for `extra_amenity_request` is updated to always include `housekeeping` or `deliver`
- [ ] Test `duringstay-extra-towel` validation keywords widened to: `['deliver', 'housekeeping', 'arrange', 'bring', 'send', 'towel']`
- [ ] Test passes consistently across 3 consecutive manual runs in Chat Simulator
- [ ] Related test `typo-towl` (`"can i have extra towl"`) also passes
- [ ] Full 133-scenario run maintains ≥ 95% pass rate after change

**Files likely to change:**
- `RainbowAI/src/assistant/data/autotest-scenarios.js` — widen `duringstay-extra-towel` keywords
- `RainbowAI/src/public/js/modules/autotest-scenarios-single.js` — same fix in module file
- `RainbowAI/src/assistant/data/` — static reply KB entry for `extra_amenity_request` (ensure consistent phrasing)

---

### US-006: Fix Billing Dispute Validation — "investigation" vs "investigate"

**Description:** As a developer maintaining the test suite, I want the billing dispute overcharge test keywords to match the actual response vocabulary, so that the test does not falsely fail due to noun/verb mismatch.

**Current failure (keyword bug):**
Test expects `investigation` (noun); response uses `investigate` (verb).
`"investigation".includes("investigate")` → false (substring check fails)
Test also intermittently fails when LLM fallback varies phrasing.

**Acceptance Criteria:**
- [ ] Test `postcheckout-billing-dispute` validation keywords updated to: `['investigate', 'investigation', 'refund', 'review', 'billing', 'overcharge']`
- [ ] Test passes 3 consecutive times in `test-all-133.js`
- [ ] The same fix is applied in `autotest-scenarios-single.js` module file
- [ ] Full 133-scenario run maintains ≥ 95% pass rate after change

**Files likely to change:**
- `RainbowAI/src/assistant/data/autotest-scenarios.js` — fix `postcheckout-billing-dispute` keywords
- `RainbowAI/src/public/js/modules/autotest-scenarios-single.js` — same fix

---

### US-007: Fix Post-Checkout Complaint Service Response

**Description:** As a guest who had a poor service experience, I want Rainbow AI to respond with a sincere apology and mention compensatory action (e.g. voucher or follow-up), so that I feel the complaint is taken seriously.

**Current failure:**
Message: `"After checking out, I want to complain about poor service"`
Expected keywords: `sorry`, `apology`, `voucher`
Actual response: None of these keywords present

**Acceptance Criteria:**
- [ ] Message `"After checking out, I want to complain about poor service"` returns a response containing at least one of: `sorry`, `apology`, `apologies`, `voucher`, `compensate`, `management`, `feedback`
- [ ] Test `postcheckout-service-complaint` passes in `test-all-133.js`
- [ ] Multi-language: ms/zh variants include equivalent apology/compensation language
- [ ] Full 133-scenario run maintains ≥ 95% pass rate after change

**Files likely to change:**
- `RainbowAI/src/assistant/data/routing.json` — check post-checkout complaint routing
- `RainbowAI/.rainbow-kb/` — post-checkout complaint KB response content

---

### US-008: Fix Multi-Turn Booking Workflow — Context Loss After Turn 0

**Description:** As a guest making a booking across multiple messages, I want Rainbow AI to maintain conversation context (number of guests → dates → payment), so that I don't have to repeat myself at each step.

**Current failure:**
Workflow: `I want to make a booking` → `2 guests` → `Check-in 15 Feb, check-out 17 Feb` → ...
Turn 1 (`2 guests`): response missing `date`, `check-in`, `check-out`
Turn 2 (`Check-in 15 Feb...`): response missing `payment`, `receipt`, `paid`
Root cause: multi-turn `history` parameter not updating the booking workflow state

**Acceptance Criteria:**
- [ ] After `"I want to make a booking"`, Rainbow AI asks about guest count or dates
- [ ] After `"2 guests"`, response asks for check-in/check-out dates (contains `date`, `check-in`, or `check-out`)
- [ ] After `"Check-in 15 Feb, check-out 17 Feb"`, response references payment (contains `payment`, `receipt`, or `paid`)
- [ ] Test `workflow-booking-payment-full` passes all validated turns in `test-all-133.js`
- [ ] Verify full booking workflow end-to-end in Chat Simulator (Live Simulation tab)
- [ ] Full 133-scenario run maintains ≥ 95% pass rate after change

**Files likely to change:**
- `RainbowAI/src/assistant/workflow-executor.ts` — verify history is passed correctly into workflow step evaluation
- `RainbowAI/src/routes/admin/testing-preview.ts` — verify `history` array in `/preview/chat` is forwarded to workflow engine
- `RainbowAI/src/assistant/conversation.ts` — check conversation context preservation across turns

---

### US-009: Fix Multi-Turn Check-in Workflow — Context Loss Mid-Workflow

**Description:** As a guest going through the check-in process across multiple messages, I want Rainbow AI to guide me step-by-step (name → passport → dates → capsule assignment), so that check-in completes without losing track of previous steps.

**Current failure:**
Turns failing: 1 (name/passport prompt), 2 (photo/upload prompt), 3 (check-in date), 5 (capsule/admin)
The workflow loses step context after turn 0

**Acceptance Criteria:**
- [ ] After `"I want to check in"`, response asks for name or documents (contains `name`, `passport`, or `IC`)
- [ ] After `"My name is John Smith"`, response asks to upload photo/passport (contains `photo`, `upload`, or `passport`)
- [ ] After `"[Passport photo uploaded]"`, response asks for check-in date (contains `check-in` or `date`)
- [ ] After all required info is provided, response confirms capsule or forwards to admin (contains `available`, `capsule`, `admin`, or `forward`)
- [ ] Test `workflow-checkin-full` passes all validated turns in `test-all-133.js`
- [ ] Verify full check-in workflow end-to-end in Chat Simulator (Live Simulation tab)
- [ ] Full 133-scenario run maintains ≥ 95% pass rate after change

**Files likely to change:**
- `RainbowAI/src/assistant/workflow-executor.ts` — check-in workflow step definitions and state persistence
- `RainbowAI/src/assistant/conversation.ts` — conversation history management between workflow steps

---

### US-010: Fix Multi-Turn Complaint Escalation Follow-up

**Description:** As a guest whose initial complaint was not resolved, I want Rainbow AI to escalate with increasing urgency on follow-up messages, so that repeated complaints receive stronger staff intervention.

**Current failure:**
Turn 1 message: `"Nobody came to fix it after I reported it"`
Expected: contains `sorry`, `apologize`, or `staff`
Actual: response does not acknowledge the unresolved previous complaint

**Acceptance Criteria:**
- [ ] After `"My room is not clean"` followed by `"Nobody came to fix it after I reported it"`, second response contains `sorry`, `apologize`, `staff`, or `escalat`
- [ ] After a third escalating message `"I want to speak to a manager!"`, response mentions `manager`, `staff`, `contact`, or `escalat`
- [ ] Test `mt-complaint-escalation` passes all validated turns in `test-all-133.js`
- [ ] Sentiment tracker registers increasing negativity across turns and routes appropriately
- [ ] Verify in Chat Simulator: 3-message complaint sequence escalates to staff contact

**Files likely to change:**
- `RainbowAI/src/assistant/conversation.ts` — conversation sentiment/intent history tracking
- `RainbowAI/src/assistant/message-router.ts` — repeat-complaint escalation trigger logic

---

### US-011: Fix Multi-Turn Billing Dispute — Resolution Path Context

**Description:** As a guest disputing a billing charge across multiple messages, I want Rainbow AI to maintain the dispute context and confirm refund investigation at each step, so that I receive a coherent resolution path.

**Current failure:**
Turn 2 message: `"I was overcharged and I want a refund"`
Expected: `refund`, `investigation`, `review`, or `management`
Actual: response does not contain any resolution keywords

**Acceptance Criteria:**
- [ ] Turn 2 response (after `"I want to check my bill"` → `"RM50 extra charge"` → `"I want a refund"`) contains at least one of: `refund`, `investigate`, `review`, `management`, `staff`
- [ ] Test `mt-billing-dispute` passes all validated turns in `test-all-133.js`
- [ ] The billing dispute intent is maintained across turns (not reset to a different intent on turn 2)
- [ ] Verify in Chat Simulator using the 3-message sequence

**Files likely to change:**
- `RainbowAI/src/assistant/conversation.ts` — intent persistence across turns in billing dispute context
- `RainbowAI/src/assistant/data/routing.json` — billing dispute multi-turn routing

---

### US-012: Fix Multi-Turn Check-in Info Flow — Topic Switching in Context

**Description:** As a guest asking multiple check-in-related questions in sequence, I want Rainbow AI to correctly answer each question (check-in time → lower deck preference → WiFi password) within the same conversation, so that I can get all arrival information without starting fresh.

**Current failure:**
Turn 2 (`"Can I get a lower deck capsule?"` in context of check-in conversation): missing `lower`, `deck`, `even`, `C2`, `C4`
Turn 3 (`"What is the WiFi password?"` in same conversation): missing `WiFi`, `wifi`, `password`, `network`

**Acceptance Criteria:**
- [ ] In a multi-turn conversation starting with check-in time, turn 2 (`"Can I get a lower deck capsule?"`) returns a response with `lower`, `deck`, `even`, `C2`, or `C4`
- [ ] Turn 3 (`"What is the WiFi password?"`) returns a response with `WiFi`, `password`, or `network` regardless of prior conversation topic
- [ ] Test `mt-checkin-flow` passes all validated turns in `test-all-133.js`
- [ ] KB loading for capsule layout and WiFi is not blocked by prior conversation context

**Files likely to change:**
- `RainbowAI/src/assistant/message-router.ts` — per-turn intent classification should not be over-anchored to session intent
- `RainbowAI/src/assistant/knowledge-base.ts` — KB topic loading per individual message, not per session

---

### US-013: Fix Long Conversation Memory — Remember Named Entity After 11+ Turns

**Description:** As a guest who provided my name early in a long conversation, I want Rainbow AI to remember my name even after 11+ messages (triggering conversation summarisation), so that I feel acknowledged throughout the stay.

**Current failure:**
Context: Guest says `"My name is John"` at turn 1, then 9 more messages on various topics.
Turn 10 (`"Do you remember my name?"`): response does NOT contain `John`
Root cause: Conversation summarisation discards named entities

**Acceptance Criteria:**
- [ ] Named entities (guest's name) are preserved through conversation summarisation
- [ ] Turn 10 response to `"Do you remember my name?"` contains `John` (or the name stated at turn 1)
- [ ] Test `conv-context-preservation` passes in `test-all-133.js`
- [ ] Summarisation prompt explicitly instructs the model to retain: guest name, booking dates, capsule number, complaint status
- [ ] At least 3 other long-conversation tests (`conv-long-conversation`, `conv-coherent-responses`, `conv-performance-check`) still pass after the change

**Files likely to change:**
- `RainbowAI/src/assistant/conversation.ts` — conversation summarisation prompt; add "preserve named entities" instruction
- `RainbowAI/src/assistant/ai-client.ts` — verify summarisation is triggered at correct turn threshold and passes entity hints

---

### US-014: Fix Sentiment Escalation — 3× Consecutive Negative Messages

**Description:** As a guest who has sent 3 consecutive negative/frustrated messages, I want Rainbow AI to escalate to staff contact automatically, so that my distress is handled by a human, not the bot.

**Current failures (2 tests):**
- `"This is ridiculous!"` → `"Nobody is helping me!"` → `"I am extremely disappointed!"` → turn 2 response missing `staff`, `contact`, `manager`, `apologize`, `sorry`
- `"The room is dirty!"` → `"I want my money back!"` → `"I will leave a bad review!"` → turn 2 missing `staff`, `manager`, `contact`, `escalate`

**Acceptance Criteria:**
- [ ] After 3 consecutive messages with negative sentiment, turn 2 response contains at least one of: `staff`, `manager`, `contact`, `sorry`, `apologize`, `escalat`
- [ ] Tests `sentiment-frustrated-guest` AND `sentiment-angry-complaint` both pass in `test-all-133.js`
- [ ] Sentiment tracker counts consecutive negative turns and triggers escalation at ≥ 3
- [ ] Escalation does NOT trigger on a single negative message (no false positives)
- [ ] `sentiment-consecutive-negative` (4-message frustration arc) also passes
- [ ] Verify in Chat Simulator: send 3 frustrated messages and confirm staff escalation response

**Files likely to change:**
- `RainbowAI/src/assistant/conversation.ts` — consecutive negative sentiment counter and escalation threshold
- `RainbowAI/src/assistant/message-router.ts` — sentiment-triggered escalation routing
- `RainbowAI/src/assistant/data/routing.json` — `sentiment_escalation` intent or trigger routing

---

### US-015: Restore Full 133-Scenario Suite as Default Autotest File

**Description:** As a developer running autotests, I want the canonical `autotest-scenarios.js` file to contain all 133 scenarios (not just 56), so that the default "Run All" button in the Chat Simulator covers the complete test suite.

**Current state:**
- `autotest-scenarios.js` (browser default): 56 scenarios
- `autotest-scenarios-single.js`: 112 scenarios
- `autotest-scenarios-workflow.js`: 21 scenarios
- Total available: 133; total tested by default: 56

**Acceptance Criteria:**
- [ ] `RainbowAI/src/public/js/data/autotest-scenarios.js` contains all 133 scenarios as `const AUTOTEST_SCENARIOS = [...]`
- [ ] The file is structured in the same format as the existing file (browser-compatible IIFE-style, no ES module exports)
- [ ] Categories are clearly commented: GENERAL_SUPPORT, PRE_ARRIVAL, ARRIVAL_CHECKIN, DURING_STAY, CHECKOUT, POST_CHECKOUT, MULTILINGUAL, EDGE_CASES, PARAPHRASE_RESILIENCE, TYPO_TOLERANCE, ABBREVIATION_SLANG, MULTILINGUAL_EXPANDED, CAPSULE_SPECIFIC, CONTEXT_SWITCHING, EDGE_CASES_EXPANDED, ARRIVAL_CHECKIN (check-in suite), WORKFLOW_COMPLETE, MULTI_TURN_INTENT, CONVERSATION_SUMMARIZATION, SENTIMENT_ANALYSIS
- [ ] `node RainbowAI/scripts/test-autotest-optimized.js` picks up and runs all 133 scenarios
- [ ] "Run All" in the Chat Simulator at `http://localhost:3002/#chat-simulator` runs all 133 scenarios
- [ ] `test-all-133.js` runner is kept as the canonical multi-turn-aware test runner
- [ ] `run-all-tests` skill updated to reference `test-all-133.js` as the primary runner

**Files likely to change:**
- `RainbowAI/src/public/js/data/autotest-scenarios.js` — rebuild as merged 133-scenario file
- `.claude/skills/run-all-tests/SKILL.md` — update default runner to `test-all-133.js`

---

## 4. Functional Requirements

- **FR-1:** The system MUST classify `"A baby has been crying all night"` to a noise or complaint intent (not `contact_staff`)
- **FR-2:** The system MUST return tourist attraction names (LEGOLAND, Desaru) for attraction queries
- **FR-3:** The system MUST understand Malay slang pricing abbreviations (`nk tny`, `brp harga`)
- **FR-4:** The system MUST return capsule deck assignment (even = lower, odd = upper) when queried
- **FR-5:** The system MUST preserve static reply content for amenity requests across LLM provider fallbacks
- **FR-6:** The system MUST maintain conversation state across all turns in a multi-turn workflow
- **FR-7:** The system MUST remember guest-provided named entities (name, booking ref) through conversation summarisation
- **FR-8:** The system MUST escalate to staff contact after 3 consecutive negative-sentiment messages
- **FR-9:** The default autotest file MUST contain all 133 scenarios

---

## 5. Non-Goals (Out of Scope)

- Building new multi-turn workflows (existing ones just need context-state fixes)
- Redesigning the sentiment scoring algorithm (threshold adjustment only)
- Adding new languages beyond en/ms/zh
- Changing the conversation summarisation model or provider
- Fixing tests that PASS (do not change passing test validation rules)
- UI changes to the Chat Simulator dashboard

---

## 6. Technical Considerations

### Multi-turn context loss (US-008 to US-013)
The `preview/chat` endpoint accepts a `history` array. The test runner (`test-all-133.js`) correctly passes accumulated history per turn. If context is lost, the root is either:
- `workflow-executor.ts` not reading `history` when evaluating the current step
- `conversation.ts` not passing `history` into the summarisation/context-building pipeline

### Conversation summarisation (US-013)
When `history.length > threshold`, the system summarises. The summarisation prompt must include an explicit directive: **"Preserve all named entities: guest name, booking dates, capsule number, complaint type."**

### Sentiment escalation (US-014)
The `message-router.ts` should track `consecutiveNegativeCount` per `sessionId`. At count ≥ 3, override the routing action to `escalate` regardless of intent classification.

### Test suite restoration (US-015)
The merged file must use the browser-compatible format:
```js
const AUTOTEST_SCENARIOS = [ ...singleTurnScenarios, ...workflowScenarios ];
```
Not ES module `export const` syntax.

---

## 7. Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| 133-scenario pass rate | 88.0% | ≥ 95% |
| 56-scenario pass rate | 92.9% | 100% |
| Failed tests | 15 | 0 |
| Warned tests | 1 | 0 |
| Multi-turn workflow tests passing | 0 / 7 | 7 / 7 |
| Sentiment escalation tests passing | 0 / 4 | 4 / 4 |

---

## 8. Open Questions

1. **Capsule layout KB:** Does the existing KB file state even/odd deck assignment explicitly, or is it implied? (US-004)
2. **Workflow context:** Is `history` currently forwarded from `/preview/chat` into `workflow-executor.ts`? If not, this is a plumbing fix, not a logic fix. (US-008, US-009)
3. **Summarisation threshold:** At what turn count does summarisation trigger? Is it configurable? (US-013)
4. **Sentiment window:** Is the consecutive-negative counter reset after escalation, or does it persist? Should it have a cooldown? (US-014)
5. **Test runner canonical source:** Should `test-all-133.js` replace `test-autotest-optimized.js` entirely, or both be kept? (US-015)
