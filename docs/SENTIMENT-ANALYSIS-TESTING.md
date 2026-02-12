# Sentiment Analysis + Escalation Testing Guide

## Overview

The sentiment analysis system scores each guest message as positive/neutral/negative and automatically escalates to staff when 2+ consecutive negative messages are detected.

## How It Works

1. **Sentiment Scoring**: Each message is analyzed using keyword patterns for:
   - **Positive**: "thank you", "great", "good", "👍", etc.
   - **Neutral**: Questions ("what", "how", "when"), informational requests
   - **Negative**: Complaints ("bad", "terrible", "angry", "👎"), problems ("broken", "not working")

2. **Tracking**: Consecutive negative message counter is maintained per guest
   - Resets to 0 when a non-negative message is sent
   - Resets to 0 when staff replies to the guest
   - Has 30-minute cooldown between escalations

3. **Escalation Trigger**: When guest sends 2+ consecutive negative messages:
   - Alert is sent to staff via WhatsApp
   - Empathetic message is added to response
   - Counter is reset to prevent duplicate alerts

## Testing Steps

### Prerequisites

1. Start the MCP server:
   ```bash
   cd mcp-server
   npm run dev
   ```

2. Ensure WhatsApp is connected (check MCP dashboard at http://localhost:3002/admin/rainbow)

3. Have 2 phone numbers ready:
   - **Guest phone**: Test phone number (not in staff list)
   - **Staff phone**: Your staff phone number (configured in settings)

### Test Case 1: Positive Sentiment (No Escalation)

**Expected**: No escalation, normal conversation flow

1. Send from guest phone:
   ```
   Hello
   ```
   Expected console log: `[Sentiment] +60123456789: neutral (Hello...)`

2. Send from guest phone:
   ```
   Thank you! This is very helpful.
   ```
   Expected console log: `[Sentiment] +60123456789: positive (Thank you! This is very helpful....)`

3. ✅ **Result**: No escalation alert sent to staff

### Test Case 2: Single Negative Message (No Escalation)

**Expected**: No escalation (needs 2 consecutive)

1. Send from guest phone:
   ```
   This is terrible service!
   ```
   Expected console logs:
   ```
   [Sentiment] +60123456789: negative (This is terrible service!...)
   ```

2. ✅ **Result**: No escalation yet (only 1 negative)

3. Send a neutral message:
   ```
   What time is check-in?
   ```
   Expected: Counter resets to 0

### Test Case 3: Two Consecutive Negative Messages (ESCALATION)

**Expected**: Escalation alert sent to staff

1. Send from guest phone:
   ```
   This is the worst hotel ever!
   ```
   Expected console log: `[Sentiment] +60123456789: negative (This is the worst hotel ever!...)`

2. Send from guest phone (2nd consecutive negative):
   ```
   I'm so angry and frustrated!
   ```
   Expected console logs:
   ```
   [Sentiment] +60123456789: negative (I'm so angry and frustrated!...)
   [Sentiment] 🚨 Escalating: 2 consecutive negative messages from +60123456789
   ```

3. ✅ **Result**: Check staff phone for escalation alert:
   ```
   🔥 ESCALATION (sentiment_negative)

   Guest: John Doe (+60123456789)

   Recent conversation:
   user: This is the worst hotel ever!
   assistant: [response]
   user: I'm so angry and frustrated!

   ⚠️ Action required — please respond ASAP
   ```

4. Check guest phone for empathetic message:
   ```
   [AI response]

   I sense you may be frustrated. I've alerted our team, and someone will reach out to you shortly. 🙏
   ```

### Test Case 4: Staff Reply Resets Tracking

**Expected**: Counter resets when staff replies

1. From previous test (2 consecutive negatives sent)

2. Send from **staff phone**:
   ```
   Hi John, I'm sorry to hear about your experience. How can I help?
   ```
   Expected console log: `[Sentiment] Reset tracking for +60123456789 (staff replied)`

3. Send from guest phone:
   ```
   Still having problems with the wifi!
   ```
   Expected: Only 1 negative (counter was reset), so NO escalation

4. ✅ **Result**: No new escalation alert (counter was reset)

### Test Case 5: Escalation Cooldown (30 minutes)

**Expected**: Won't escalate again within 30 minutes

1. Trigger escalation (send 2 consecutive negative messages)

2. Wait for cooldown message in console:
   ```
   [Sentiment] Cooldown active for +60123456789 (Xs since last escalation)
   ```

3. Send 2 more consecutive negative messages

4. ✅ **Result**: No new escalation alert (cooldown period active)

5. To test cooldown expiry, you can either:
   - Wait 30 minutes
   - OR manually edit `sentiment-tracker.ts` line 17 to reduce cooldown:
     ```typescript
     const ESCALATION_COOLDOWN_MS = 60 * 1000; // 1 minute for testing
     ```

### Test Case 6: Multi-Language Support

**Expected**: Works with Malay and Chinese negative words

1. Send from guest phone (Malay):
   ```
   Teruk! Saya sangat kecewa.
   ```
   Expected: `[Sentiment] +60123456789: negative (Teruk! Saya sangat kecewa....)`

2. Send from guest phone (Chinese):
   ```
   太差了！我很失望。
   ```
   Expected: `[Sentiment] +60123456789: negative (太差了！我很失望。...)`

3. After 2 consecutive negative messages in any language mix:

4. ✅ **Result**: Escalation alert sent

### Test Case 7: Emoji-Based Sentiment

**Expected**: Detects sentiment from emojis

1. Send from guest phone:
   ```
   👍
   ```
   Expected: `[Sentiment] +60123456789: positive (👍...)`

2. Send from guest phone:
   ```
   👎
   ```
   Expected: `[Sentiment] +60123456789: negative (👎...)`

3. Send from guest phone:
   ```
   😡😡
   ```
   Expected: `[Sentiment] +60123456789: negative (😡😡...)`

4. After 2 consecutive negative emojis:

5. ✅ **Result**: Escalation triggered

## Monitoring & Debugging

### Check Console Logs

Watch for these key logs:

```bash
# Sentiment analysis for each message
[Sentiment] +60123456789: negative (message text...)

# Escalation triggered
[Sentiment] 🚨 Escalating: 2 consecutive negative messages from +60123456789

# Staff reply reset
[Sentiment] Reset tracking for +60123456789 (staff replied)

# Cooldown active
[Sentiment] Cooldown active for +60123456789 (123s since last escalation)
```

### Check Rainbow Dashboard

1. Go to http://localhost:3002/admin/rainbow
2. Click "Conversation Logs" tab
3. Look for escalation entries with `reason: sentiment_negative`

### Manual Testing via Code

You can test sentiment analysis directly:

```typescript
import { analyzeSentiment } from './mcp-server/src/assistant/sentiment-tracker.js';

console.log(analyzeSentiment("This is great!"));           // positive
console.log(analyzeSentiment("What time is check-in?"));   // neutral
console.log(analyzeSentiment("This is terrible!"));        // negative
```

## Configuration

### Adjusting Threshold

Edit `mcp-server/src/assistant/sentiment-tracker.ts`:

```typescript
// Line 17: Number of consecutive negative messages before escalation
const CONSECUTIVE_THRESHOLD = 2; // Default: 2

// Line 18: Maximum history to keep
const HISTORY_MAX_LENGTH = 10; // Default: 10

// Line 19: Cooldown between escalations (milliseconds)
const ESCALATION_COOLDOWN_MS = 30 * 60 * 1000; // Default: 30 minutes
```

### Adding More Patterns

Edit `mcp-server/src/assistant/sentiment-tracker.ts`:

```typescript
// Line 28-38: Add more positive keywords
const POSITIVE_PATTERNS = [
  'thank', 'thanks', 'great', 'good',
  // Add your patterns here
  'fantastic', 'superb'
];

// Line 40-64: Add more negative keywords
const NEGATIVE_PATTERNS = [
  'bad', 'terrible', 'awful',
  // Add your patterns here
  'horrible', 'disgusting'
];
```

After editing, restart the MCP server:

```bash
cd mcp-server
npm run dev
```

## Troubleshooting

### Issue: Sentiment not detected

**Solution**: Check if message contains patterns from the keyword lists
- View all patterns in `sentiment-tracker.ts` lines 28-64
- Add more patterns if needed

### Issue: False positives (neutral detected as negative)

**Solution**: Message contains more negative keywords than positive
- Adjust keyword patterns
- Or adjust the scoring logic in `analyzeSentiment()` function

### Issue: Escalation not firing after 2 negatives

**Check**:
1. Console shows 2 consecutive negative sentiments?
2. Cooldown period active? (30 min since last escalation)
3. Staff phone configured correctly in settings?

### Issue: Staff reply not resetting counter

**Check**:
1. Staff phone number in settings matches sender
2. Console shows: `[Sentiment] Reset tracking for...`
3. If using LID (e.g., @lid), ensure it's detected

## Success Metrics

After implementation, monitor:

1. **Escalation Rate**: How many sentiment-based escalations per day?
2. **Response Time**: How quickly does staff respond after escalation?
3. **False Positives**: How many escalations were not actually frustrated users?
4. **User Satisfaction**: Did early escalation improve satisfaction scores?

## Next Steps

After testing, consider:

1. **Tune threshold**: If too many escalations → increase to 3 consecutive
2. **Adjust patterns**: Add domain-specific complaint keywords
3. **Analytics**: Track sentiment trends over time
4. **Integration**: Show sentiment score in dashboard
