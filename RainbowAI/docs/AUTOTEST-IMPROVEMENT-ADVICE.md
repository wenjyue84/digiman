# Rainbow Autotest Improvement Advice (2026-02-13)

**Report baseline:** 70.4% pass (50/71), 20 failed, 1 warning, ~12s avg time.

This document gives **professional, actionable advice** to raise pass rate and stability.

---

## 1. Summary of Failures by Root Cause

| Category | Failed tests | Root cause |
|----------|--------------|------------|
| **Missing KB/static content** | Rules - Pets, Extra Amenity (Towel/Pillow) | No policy or reply for pets; no reply for extra towels/pillows → bot says "I don't have that information" |
| **Wrong intent chosen** | Facility Orientation ("Where is the bathroom?") | Classified as `directions` → address/maps reply; test expects bathroom/toilet/location in reply |
| **Complaint workflow wording** | Noise - Baby Crying, Facility - AC Broken | First step is generic; validation expects "relocate"/"maintenance"/"understand"/"room" in turn 0 |
| **Content vs validation mismatch** | Checkout Procedure, Luggage, Billing, Forgot Item, Disputes, Review - Negative | Reply content doesn’t include the exact `contains_any` keywords the tests expect, or intent is wrong |
| **Multi-turn workflows** | 5 workflow tests + Sentiment - Angry | Fail on a later turn (validation, timing, or state) |

---

## 2. High-Impact Fixes (Do First)

### 2.1 Add pets policy and use it in replies

- **Issue:** "Are pets allowed?" → intent sometimes `general` → LLM reply with no pets in KB → "I don't have that information". Test expects "pet", "animal", or "allow".
- **Actions:**
  1. In **knowledge.json** (static replies for `rules` and/or `rules_policy`), add one line, e.g.  
     `"Pets are not allowed. We're an adults-only capsule hostel."`
  2. In **`.rainbow-kb/houserules.md`** (or a small `rules-pets.md`), add a short pets policy so LLM fallback can answer too.
  3. In **intent-keywords.json** / **intent-examples.json**, ensure "pets allowed", "are pets allowed", "pet policy" map to `rules` or `rules_policy` (already partially there; verify T2/T3 win over LLM classifying as `general`).

### 2.2 Fix “Where is the bathroom?” → facility orientation

- **Issue:** Query classified as `directions` → static address/maps; test expects "bathroom", "shower", "toilet", or "location".
- **Actions:**
  1. **Intent order / priority:** Ensure `facility_orientation` is evaluated before or with higher specificity than `directions` for phrases like "where is the bathroom/toilet/shower". Adjust regex or tier order so "where is the bathroom" matches facility_orientation.
  2. **Reply content:** Add a **static reply** for `facility_orientation` in **knowledge.json** that explicitly states where bathroom/shower/toilet are (e.g. "Bathroom and showers are in the shared area next to the kitchen...") so the response contains the required keywords. Optionally add a small KB topic (e.g. `facility-orientation.md`) and keep `facility_orientation` → `llm_reply` if you prefer LLM to expand.

### 2.3 Complaint workflow – first message covers all subtypes

- **Issue:** Complaint workflow first step is generic; tests expect subtype-specific words in **turn 0** (e.g. "understand", "relocate", "room" for baby crying; "maintenance", "technician", "relocate" for AC broken).
- **Action:** In **workflows.json** → `complaint_handling` → step 1 message (en/ms/zh), add a short line that covers noise, facility, and relocation, e.g.  
  `"We understand. We can look into maintenance, relocation to another capsule, or staff support. Could you describe the issue in detail (e.g. noise, cleanliness, facility)?"`  
  so that turn 0 contains at least one of: understand, relocate, room, maintenance, technician. Then re-run autotest for Noise - Baby Crying and Facility - AC Broken.

### 2.4 Extra amenities (towel, pillow)

- **Issue:** "Can I get more towels?" / "I need an extra pillow" → `unknown` or `extra_amenity_request` → `llm_reply` with no KB → "I don't have that information". Test expects "deliver", "housekeeping" (towel) or "deliver", "pillow" (pillow).
- **Actions:**
  1. Add a **static reply** in **knowledge.json** for intent `extra_amenity_request`:  
     e.g. "We can arrange extra towels or pillows. I'll let housekeeping know — they can deliver to your capsule. Anything else?"
  2. Ensure **intent-keywords.json** / **intent-examples.json** map "towel", "pillow", "extra towel", "extra pillow" to `extra_amenity_request` so classification is stable.

---

## 3. Content vs Validation Alignment

Several tests fail because the **reply is reasonable but doesn’t contain the exact words** in `contains_any`. Two strategies:

- **Option A – Relax validation:** In **autotest-scenarios.js**, add alternative keywords that match current replies (e.g. add "apologize" or "help" where the reply already uses them).
- **Option B – Harden content:** In **knowledge.json** (and KB topics used by llm_reply), add the missing keywords where it’s natural (e.g. checkout reply: "Please settle your **bill** at the **front desk**"; billing: "we’ll **review** the **charge**"; forgot item: "**Lost & Found**" or "**pickup**"/"**shipping**").

Recommended: **Option B** for critical paths (checkout, billing, lost item); **Option A** only for non-critical or overly strict rules.

Concrete checks:

- **Checkout Procedure:** Test expects "bill", "front desk", "payment". Current reply has "key cards", "noon". Add "Please settle any bill at the front desk" (or similar) to the `checkout_procedure` static reply.
- **Luggage Storage:** Reply already has "luggage", "storage", "bag". If it still fails, the issue is likely **intent** (e.g. classified as something else). Fix classification so `luggage_storage` is chosen for "leave my bags after checkout".
- **Billing Inquiry / Billing Dispute / Forgot Item / Review - Negative:** Ensure routing and KB/static replies include at least one of the test keywords (review, bill, charge, refund, verify, adjustment; Lost, Found, shipping, pickup; sorry, regret, apology).

---

## 4. Multi-Turn Workflow and Sentiment Tests

The 5 workflow tests and Sentiment - Angry fail on **multi-turn** behavior (turn N or escalation).

- **Actions:**
  1. **Inspect report:** For each failed workflow test, note the **turn index** and **rule** that failed (e.g. "turn 2: contains_any [...] None found").
  2. **Align workflow copy:** In **workflows.json**, ensure the message for that step (en/ms/zh) contains at least one of the keywords the test expects for that turn.
  3. **Timing/state:** If failure is `response_time` or missing reply, check for flakiness (e.g. slow LLM, async state). Consider increasing timeout or making the test accept a range of valid replies.
  4. **Sentiment - Angry:** Confirm escalation actually happens (e.g. staff message or escalate step) and that the test asserts the right turn and keywords (e.g. "escalat", "staff", "sorry").

---

## 5. Warning: Greeting - Malay

- **Issue:** User: "Selamat pagi" → Reply: "Hello, welcome to Pelangi Capsule Hostel" (English). Validation expects at least one of "Selamat", "Halo", "pagi" in the reply.
- **Options:**  
  (1) Add a Malay greeting variant for `greeting` in **knowledge.json** (e.g. "Selamat pagi! Welcome to Pelangi Capsule Hostel") and ensure greeting intent returns it when input is Malay; or  
  (2) Mark the rule as non-critical (already optional in some setups) or relax to accept "Hello", "welcome" as acceptable for Malay input.

---

## 6. Process and Maintenance

1. **Run autotest after every intent/KB/routing change** so regressions show up immediately.
2. **Triage by failure type:** "No information" → add KB/static reply; "wrong reply" → fix intent or routing; "right reply, test failed" → align content or validation.
3. **Keep validation realistic:** Prefer a few strong `contains_any` rules over long lists; add `critical: false` for nice-to-have wording so pass rate reflects real quality.
4. **Document expected behavior:** For workflow tests, document the expected message per step (or at least required keywords) in a short AUTOTEST-WORKFLOWS.md so future edits don’t break tests by accident.

---

## 7. Priority Order (Suggested)

1. **Pets** (KB + static reply).  
2. **Facility orientation** (intent priority + static reply with bathroom/toilet).  
3. **Complaint workflow** first message (add relocate/maintenance/understand).  
4. **Extra amenity** (static reply + intent keywords).  
5. **Checkout / Luggage / Billing / Forgot / Dispute / Review** (content or validation alignment).  
6. **Workflow multi-turn** (per-test fix by turn).  
7. **Greeting - Malay** (reply variant or relax validation).

After 1–4, re-run autotest and aim for **~85%+ pass**; then iterate on 5–7 for the remainder.
