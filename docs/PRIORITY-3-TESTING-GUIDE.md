# Priority 3: Hallucination Prevention - Testing Guide

**Date:** 2026-02-12
**Implementation:** Complete ✅
**Manual Testing:** Required for full verification

## Quick Verification Checklist

### 1. System Prompt Check (30 seconds)

**Goal:** Verify knowledge constraints are in the system prompt

**Steps:**
1. Open `http://localhost:3002/admin/rainbow` in browser
2. Go to "Settings" tab
3. Scroll down to "System Prompt" textarea
4. **Verify these sections exist:**
   - ✅ "KNOWLEDGE CONSTRAINTS (CRITICAL):"
   - ✅ "You are STRICTLY LIMITED to information in the Knowledge Base"
   - ✅ "DO NOT guess or make up information"
   - ✅ "CONFIDENCE SCORING:"
   - ✅ "Set confidence < 0.5 if: answer is partial..."

**Expected:** All 5 constraints should be visible in the system prompt.

### 2. LLM Settings Check (15 seconds)

**Goal:** Verify confidence thresholds are configured

**Steps:**
1. Open browser console (F12)
2. Run:
   ```javascript
   fetch('/api/rainbow/intent-manager/llm-settings')
     .then(r => r.json())
     .then(d => console.log(d.thresholds))
   ```

**Expected Output:**
```json
{
  "fuzzy": 0.80,
  "semantic": 0.70,
  "layer2": 0.80,
  "llm": 0.60,
  "lowConfidence": 0.5,
  "mediumConfidence": 0.7
}
```

**Verify:**
- ✅ `lowConfidence: 0.5` exists
- ✅ `mediumConfidence: 0.7` exists

### 3. Live WhatsApp Test - In-KB Question (2 minutes)

**Goal:** Verify AI answers confidently for known information

**Test Message:**
```
What is the check-in time?
```

**Expected Response:**
```
Check-in time is 3:00 PM. — Rainbow 🌈
```

**Verify:**
- ✅ No disclaimer added
- ✅ Confident answer from knowledge base
- ✅ Check conversation logs show confidence ≥ 0.7

**Check Logs:**
1. Go to `http://localhost:3002/admin/rainbow` → Conversations tab
2. Click on your test conversation
3. Look at the assistant message metadata
4. **Expected:** `"confidence": 0.7-0.9` (or higher)

### 4. Live WhatsApp Test - Out-of-KB Question (2 minutes)

**Goal:** Verify AI says "I don't know" instead of hallucinating

**Test Message:**
```
Do you have a swimming pool?
```

**Expected Response:**
```
I don't have that information. Let me connect you with our team.

ℹ️ I'm not entirely sure about this information. Our team will follow up with you shortly to confirm.
```

**Verify:**
- ✅ Response says "I don't have that information"
- ✅ Disclaimer added (emoji + warning text)
- ✅ Staff notification sent (check staff WhatsApp)
- ✅ Check conversation logs show confidence < 0.5

**Check Logs:**
1. Go to Conversations tab
2. Look at the assistant message
3. **Expected:** `"confidence": 0.0-0.4`
4. **Expected:** Message includes disclaimer text

### 5. Live WhatsApp Test - Ambiguous Question (2 minutes)

**Goal:** Verify medium-confidence disclaimer works

**Test Message:**
```
Can I check in earlier than 3 PM?
```

**Expected Response:**
```
[Answer about early check-in policy]

ℹ️ Please note: I may not have complete information. Feel free to ask for clarification or request to speak with our team.
```

**Verify:**
- ✅ Partial answer provided
- ✅ Medium-confidence disclaimer added (no staff escalation)
- ✅ Check conversation logs show confidence 0.5-0.7

**Check Logs:**
1. Go to Conversations tab
2. Look at the assistant message
3. **Expected:** `"confidence": 0.5-0.7`
4. **Expected:** Disclaimer text included

### 6. Feedback Integration Test (2 minutes)

**Goal:** Verify confidence scores are logged with feedback

**Steps:**
1. Send a test message (e.g., "What is WiFi password?")
2. Wait for response + feedback prompt ("Was this helpful?")
3. Reply "👍" or "👎"
4. Go to `http://localhost:3002/admin/rainbow` → Feedback tab
5. **Check Recent Feedback table**

**Expected:**
- ✅ Feedback entry shows up
- ✅ "Confidence" column shows score (e.g., 0.85)
- ✅ "Model" column shows AI model used
- ✅ "Response Time" column shows duration

### 7. Analytics Integration Test (1 minute)

**Goal:** Verify low-confidence tracking in Intent Analytics

**Steps:**
1. Go to `http://localhost:3002/admin/rainbow` → Intent Analytics tab
2. Look at "Low Confidence Predictions" section

**Expected:**
- ✅ Table shows predictions with confidence < threshold
- ✅ Shows predicted intent + confidence score
- ✅ Shows user message + AI response
- ✅ Recent out-of-KB tests appear here

## Pass/Fail Criteria

### ✅ ALL TESTS PASS IF:

1. **System prompt** includes knowledge constraints (Test 1)
2. **Thresholds** are configured in llm-settings.json (Test 2)
3. **In-KB questions** get confident answers, no disclaimer (Test 3)
4. **Out-of-KB questions** get "I don't know" + disclaimer + escalation (Test 4)
5. **Ambiguous questions** get partial answer + disclaimer (Test 5)
6. **Confidence scores** appear in feedback logs (Test 6)
7. **Low-confidence tracking** appears in analytics (Test 7)

### ❌ FAIL IF:

- AI invents information for out-of-KB questions (hallucination)
- No disclaimers appear for low-confidence responses
- Confidence scores missing from logs
- Staff escalation doesn't trigger for very low confidence (<0.5)

## Troubleshooting

### Issue: No disclaimers appearing

**Check:**
1. Verify thresholds in llm-settings.json exist
2. Check message-router.ts was updated (search for "Priority 3")
3. Restart MCP server: `cd mcp-server && npm run dev`

### Issue: Confidence always shows as undefined

**Check:**
1. Verify ai-client.ts `generateReplyOnly()` returns confidence
2. Check system prompt includes confidence scoring instructions
3. Test with a fresh conversation (clear browser cache)

### Issue: Staff escalation not triggering

**Check:**
1. Verify `lowConfidence: 0.5` in llm-settings.json
2. Check staff phone numbers configured in settings
3. Verify WhatsApp instance is connected

## Documentation References

- **Implementation:** `docs/PRIORITY-3-HALLUCINATION-PREVENTION.md`
- **Code changes:** See git diff for detailed changes
- **Next priority:** Priority 4 - Response Evaluation (coming soon)

## Quick Code Verification

If you want to verify the code changes without running tests:

**1. Check system prompt constraints:**
```bash
grep -A 10 "KNOWLEDGE CONSTRAINTS" mcp-server/src/assistant/knowledge-base.ts
```

**2. Check confidence thresholds:**
```bash
cat mcp-server/src/assistant/data/llm-settings.json | grep -A 5 "thresholds"
```

**3. Check low-confidence handling:**
```bash
grep -A 20 "Priority 3: Low-Confidence" mcp-server/src/assistant/message-router.ts
```

All three should show the new code!
