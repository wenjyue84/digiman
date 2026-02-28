# PRD: Fix 9 Failing Rainbow AI Test Scenarios (v2)

## 1. Introduction/Overview

The Rainbow AI test suite was expanded from 133 to 171 scenarios covering more real-world guest interactions. 9 scenarios fail due to intent misclassification, KB content gaps, narrow validation rules, and workflow context loss. This PRD addresses all 9 failures through a mix of keyword additions, KB updates, validation fixes, and workflow improvements.

## 2. Goals

- Fix all 9 failing test scenarios to achieve 0 failures in the 171-scenario suite
- Improve intent classification for transport, local services, and accessibility queries
- Enrich KB and static reply content for directions and check-in info
- Harden multi-turn workflow context (corrections, emergency continuation)
- Maintain or improve the existing 94.2% pass rate to 100%

## 3. User Stories

### US-001: Fix directions response to include transport info

**Description:** As a guest asking how to get to the hostel from the airport, I want the response to include transport options (Grab, taxi, driving time) so that I know how to physically get there — not just the address.

**Acceptance Criteria:**
- [ ] KB file `.rainbow-kb/location.md` static reply section includes transport options (Grab, taxi, driving time from Senai airport)
- [ ] The `directions` static reply response includes at least one of: Grab, taxi, airport, drive, minute, direction
- [ ] If the response is generated via LLM+KB, the KB content loaded for `directions` includes transport info
- [ ] Test `ml-malay-directions` passes ("Macam mana nak sampai dari airport?")
- [ ] Test `transport-from-airport` passes ("How do I get to the hostel from Senai airport?")
- [ ] Existing directions tests still pass

**Files to modify:**
- `RainbowAI/.rainbow-kb/location.md` — ensure transport section is prominent
- `RainbowAI/src/assistant/data/routing.json` — check if `directions` response template needs transport content
- `RainbowAI/src/assistant/data/intent-keywords.json` — add airport/transport keywords to `directions` intent

### US-002: Fix check-in info to mention passport/IC requirements

**Description:** As a guest asking about document requirements for check-in, I want the response to mention passport or IC so that I know what to bring.

**Acceptance Criteria:**
- [ ] The `checkin_info` static reply response includes mention of passport, IC, or identification documents
- [ ] Update KB file for check-in info to include document requirements
- [ ] Test `ci-suite-passport-request` passes ("Do I need to show my passport or IC to check in?")
- [ ] Existing checkin_info tests still pass

**Files to modify:**
- `RainbowAI/src/assistant/data/routing.json` — update `checkin_info` response template to mention passport/IC
- `RainbowAI/.rainbow-kb/` — update relevant check-in KB file if exists

### US-003: Handle "extend stay" separately from new booking

**Description:** As a current guest wanting to extend my stay, I want the system to recognize this is an extension (not a new booking) so that I get relevant help instead of being asked "how many guests?"

**Acceptance Criteria:**
- [ ] Add keywords for extend/extension/extra nights to intent-keywords.json — either as new intent `extend_stay` or as routing variation of `booking`
- [ ] If using existing `booking` intent: routing or workflow should detect "extend" context and respond differently
- [ ] Response must contain at least one of: extend, availability, staff, night, check, extra
- [ ] Test `booking-extend-stay` passes ("I want to extend my stay for 2 more nights")
- [ ] Existing booking tests still pass

**Files to modify:**
- `RainbowAI/src/assistant/data/intent-keywords.json` — add extend-related keywords
- `RainbowAI/src/assistant/data/routing.json` — add routing for extend intent or modify booking routing
- `RainbowAI/src/assistant/intents.ts` — update `mapLLMIntentToSpecific` if needed

### US-004: Add local services intent for ATM/money changer queries

**Description:** As a guest asking about nearby ATMs or money changers, I want a helpful response about local services — not the hostel address.

**Acceptance Criteria:**
- [ ] Add new intent `local_services` (or similar) to `intent-keywords.json` with keywords: ATM, money changer, bank, convenience store, laundry, pharmacy, nearby
- [ ] Add routing entry in `routing.json` mapping `local_services` to appropriate action
- [ ] Update `mapLLMIntentToSpecific` in `intents.ts` to handle local_services mapping
- [ ] Response must include at least one of: ATM, bank, money, nearby, changer, cash
- [ ] Test `local-atm-money` passes ("Where is the nearest ATM or money changer?")
- [ ] Existing nearby/local tests still pass

**Files to modify:**
- `RainbowAI/src/assistant/data/intent-keywords.json` — add `local_services` intent
- `RainbowAI/src/assistant/data/routing.json` — add routing for `local_services`
- `RainbowAI/src/assistant/intents.ts` — add mapping in `mapLLMIntentToSpecific`
- `RainbowAI/.rainbow-kb/location.md` — add nearby services section if not present

### US-005: Handle accessibility queries specifically

**Description:** As a guest with accessibility needs, I want the system to address my wheelchair/disability question directly — not give a generic facilities list.

**Acceptance Criteria:**
- [ ] Add keywords for wheelchair, accessible, disability, mobility to intent-keywords.json — either new `accessibility` intent or improved `facilities_info` handling
- [ ] Response must include at least one of: wheelchair, access, staff, contact, accommodate, help
- [ ] Update `mapLLMIntentToSpecific` to detect accessibility context in facilities queries
- [ ] Test `access-wheelchair` passes ("Is the hostel wheelchair accessible?")
- [ ] Existing facilities tests still pass

**Files to modify:**
- `RainbowAI/src/assistant/data/intent-keywords.json` — add accessibility keywords
- `RainbowAI/src/assistant/data/routing.json` — add routing or modify facilities routing
- `RainbowAI/src/assistant/intents.ts` — update mapping
- `RainbowAI/.rainbow-kb/facilities.md` — add accessibility info section

### US-006: Fix noise complaint follow-up validation and response

**Description:** The noise complaint follow-up (turn 2) correctly escalates to management, but the response text doesn't match the validation keywords. Fix both the validation AND the response wording.

**Acceptance Criteria:**
- [ ] Widen test validation for `mt-noise-followup` turn 2 to accept: staff, send, address, quiet, sorry, management, escalat, priority, team
- [ ] Ensure the escalation response template includes "staff" or "sorry" in addition to "management"
- [ ] Test `mt-noise-followup` passes (3-turn noise complaint)
- [ ] Existing noise complaint and escalation tests still pass

**Files to modify:**
- `RainbowAI/src/public/js/modules/autotest-scenarios-workflow.js` — widen validation keywords for mt-noise-followup turn 2
- `RainbowAI/src/assistant/data/templates.json` — update escalation template to include "staff" wording

### US-007: Fix booking workflow to handle mid-flow corrections

**Description:** When a guest corrects information mid-workflow (e.g., "Actually 3 guests not 2"), the workflow should acknowledge the correction instead of jumping to the next step.

**Acceptance Criteria:**
- [ ] In `message-router.ts`: detect correction language ("actually", "sorry I meant", "not X but Y") during active workflow
- [ ] In `workflow-executor.ts`: when correction detected, update collected data and acknowledge ("Updated to 3 guests")
- [ ] Response must include at least one of: 3, guest, update, note, correct
- [ ] Test `mt-correction-mid-flow` passes (3-turn booking with correction)
- [ ] Existing booking workflow tests still pass

**Files to modify:**
- `RainbowAI/src/assistant/message-router.ts` — add correction detection logic
- `RainbowAI/src/assistant/workflow-executor.ts` — handle data correction during active workflow

### US-008: Fix emergency workflow continuation across turns

**Description:** When a medical emergency is reported across multiple turns, the system should maintain emergency context instead of reclassifying turn 2 as a general complaint.

**Acceptance Criteria:**
- [ ] In `message-router.ts`: when active workflow is emergency-type (theft, medical), prevent re-classification — continue the emergency workflow
- [ ] In `workflow-executor.ts`: handle emergency continuation, keep escalation context
- [ ] Emergency keyword patterns in `intents.ts` `getEmergencyIntent()` should include medical terms (collapsed, unconscious, breathing, ambulance, dizzy, fainted)
- [ ] Response at turn 2 must include at least one of: ambulance, staff, help, medical, coming, way
- [ ] Test `workflow-medical-emergency` passes (3-turn medical emergency)
- [ ] Existing emergency tests (theft, card locked) still pass

**Files to modify:**
- `RainbowAI/src/assistant/message-router.ts` — preserve emergency workflow context
- `RainbowAI/src/assistant/workflow-executor.ts` — emergency continuation handling
- `RainbowAI/src/assistant/intents.ts` — expand emergency regex patterns

### US-009: Run full regression test suite and verify zero failures

**Description:** After all fixes are applied, run the full 171-scenario test suite and confirm zero failures.

**Acceptance Criteria:**
- [ ] Rainbow AI server is running on port 3002
- [ ] Run: `node RainbowAI/scripts/run-tests-desktop-report.js --concurrency=1`
- [ ] All 171 scenarios pass (0 failures, 0 critical warnings)
- [ ] Desktop error report at `~/Desktop/rainbow-test-errors.txt` shows "ALL TESTS PASSED"
- [ ] If any tests still fail, loop back and fix remaining issues until 0 failures

## 4. Functional Requirements

- FR-1: The system must classify transport-from-airport queries with transport info in the response
- FR-2: The system must include document requirements (passport/IC) in check-in info responses
- FR-3: The system must distinguish "extend stay" from "new booking" requests
- FR-4: The system must classify ATM/money changer queries as local services, not directions
- FR-5: The system must address accessibility queries specifically, not with generic facilities info
- FR-6: Escalation responses must include "staff" or "sorry" in the wording
- FR-7: Active booking workflows must handle mid-flow data corrections
- FR-8: Emergency workflows must maintain context across multiple turns
- FR-9: All 171 test scenarios must pass after fixes

## 5. Non-Goals (Out of Scope)

- No UI/dashboard changes
- No new API endpoints
- No database schema changes
- No deployment to production (local fixes only)
- No changes to client/ or server/ modules (RainbowAI only)
- No new workflow types — only fix existing workflow context handling

## 6. Technical Considerations

- **Import boundaries:** RainbowAI/ must have ZERO imports from server/, client/, shared/
- **Three-tier independence:** T2 keywords, T4 LLM mapping, and T4 post-correction each independently classify. Changes to one tier may not fix the others.
- **Fuse.js limitation:** Substring matching requires 4+ words AND 18+ characters. Add long-form keyword variants for short queries.
- **Config dual-write:** Any changes to routing.json or templates.json are auto-persisted via config-store.ts
- **Multi-language:** Any new response templates must include en, ms, zh variants where applicable
- **Test concurrency:** Always use --concurrency=1 for reliable test results

## 7. Success Metrics

- 171/171 test scenarios pass (100% pass rate)
- 0 failures in desktop error report
- All existing 162 passing tests continue to pass (no regressions)

## 8. Open Questions

- None — all approaches confirmed by user (1C, 2D, 3C, 4C)
