# Sentiment Analysis Settings UI Guide

## Quick Access

**URL:** http://localhost:3002/admin/rainbow → **Settings** tab

## Settings Available

### 1. Enable/Disable Toggle

**Location:** Top right of "Sentiment Analysis & Escalation" section

**Options:**
- ✅ **Enabled** (default) - Sentiment analysis active
- ❌ **Disabled** - Sentiment analysis completely off

**When disabled:**
- No sentiment scoring
- No escalation alerts
- Zero performance impact

---

### 2. Consecutive Threshold

**Location:** Left dropdown under "Sentiment Analysis & Escalation"

**Options:**
- **1 (Very Sensitive)** - Escalate after first negative message
- **2 (Recommended)** ✅ - Escalate after second consecutive negative **(default)**
- **3 (Less Sensitive)** - Escalate after third consecutive negative

**When to change:**
- **Set to 1** - If you want immediate alerts (high alert volume expected)
- **Set to 2** - Balanced detection (recommended for most cases)
- **Set to 3** - If getting too many false positives (reduce alert noise)

---

### 3. Cooldown Period

**Location:** Right dropdown under "Sentiment Analysis & Escalation"

**Options:**
- **5 minutes (Testing)** - For testing/debugging only
- **15 minutes** - Short cooldown
- **30 minutes (Recommended)** ✅ - Balanced (default)
- **60 minutes** - Long cooldown (reduce duplicate alerts)

**When to change:**
- **Set to 5 min** - Only for testing sentiment escalation
- **Set to 15 min** - If you want faster re-escalation after cooldown
- **Set to 30 min** - Recommended for production (prevents duplicate alerts)
- **Set to 60 min** - If same users repeatedly trigger alerts

---

## How to Configure

### Step 1: Open Settings

1. Go to http://localhost:3002/admin/rainbow
2. Click **Settings** tab in left sidebar
3. Scroll down to **"Sentiment Analysis & Escalation"** section

---

### Step 2: Configure Options

**Enable/Disable:**
- Toggle switch at top right of section
- Green = Enabled, Gray = Disabled

**Consecutive Threshold:**
- Select from dropdown: 1, 2, or 3
- Shows description of sensitivity level

**Cooldown Period:**
- Select from dropdown: 5, 15, 30, or 60 minutes
- Shows use case hint (testing/recommended)

---

### Step 3: Save Settings

1. Click blue **"Save Settings"** button at bottom
2. Wait for confirmation toast: "Settings saved (including conversation management & sentiment analysis)"
3. Settings take effect immediately (no restart needed)

---

## Visual Reference

```
┌─────────────────────────────────────────────────────────┐
│ Sentiment Analysis & Escalation           [Toggle: ON] │
│                                                         │
│ Automatically detect frustrated users...               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Consecutive Threshold      Cooldown Period             │
│ ┌──────────────────────┐  ┌──────────────────────┐   │
│ │ 2 (Recommended)    ▾ │  │ 30 minutes (Rec...)▾ │   │
│ └──────────────────────┘  └──────────────────────┘   │
│                                                         │
│ ⚠️ How it works: Each message is scored as...         │
│                                                         │
│ 💡 Examples of negative patterns:                      │
│ English: terrible, worst, angry, frustrated...         │
│ Multi-language: Malay (teruk), Chinese (差), ...       │
└─────────────────────────────────────────────────────────┘

              [Save Settings]
```

---

## Configuration Examples

### Scenario 1: Testing Phase

**Goal:** Test sentiment detection frequently

**Settings:**
- ✅ Enabled
- Threshold: **2 (Recommended)**
- Cooldown: **5 minutes (Testing)**

**Result:** Can test escalations every 5 minutes without waiting 30 min

---

### Scenario 2: Production (Balanced)

**Goal:** Catch frustrated users early, minimize false positives

**Settings:**
- ✅ Enabled
- Threshold: **2 (Recommended)** ✅
- Cooldown: **30 minutes (Recommended)** ✅

**Result:** Balanced detection with reasonable alert frequency

---

### Scenario 3: High Volume Property

**Goal:** Reduce alert noise, only escalate very frustrated users

**Settings:**
- ✅ Enabled
- Threshold: **3 (Less Sensitive)**
- Cooldown: **60 minutes**

**Result:** Fewer alerts, only persistent negative sentiment triggers

---

### Scenario 4: Maintenance/Debugging

**Goal:** Temporarily disable sentiment while debugging other issues

**Settings:**
- ❌ **Disabled**
- (Other settings don't matter when disabled)

**Result:** Zero sentiment analysis, zero performance impact

---

## Real-time Changes

**Important:** Settings apply immediately after saving!

1. **No restart required** - Changes take effect on next message
2. **Existing counters preserved** - Disabling doesn't reset user history
3. **Re-enabling continues tracking** - User state persists

---

## Verification

### Check if Settings Applied

**Method 1: Console Logs**
```bash
# After saving settings, console should show:
[Sentiment] Config reloaded: threshold=2, cooldown=30min
```

**Method 2: Send Test Message**
```
# Send negative message from test phone:
"This is terrible!"

# Console should show (if enabled):
[Sentiment] +60123456789: negative (This is terrible!...)

# OR if disabled:
(no sentiment log)
```

---

## Troubleshooting

### Settings Not Saving

**Symptoms:**
- Click "Save Settings" but nothing happens
- No toast notification

**Solutions:**
1. Check browser console for errors (F12)
2. Refresh page and try again
3. Check MCP server is running: `netstat -ano | findstr ":3002"`

---

### Settings Not Taking Effect

**Symptoms:**
- Saved settings but still using old threshold/cooldown

**Solutions:**
1. Check console for reload message: `[Sentiment] Config reloaded...`
2. Restart MCP server: `cd mcp-server && npm run dev`
3. Clear browser cache and refresh

---

### Toggle Stuck/Not Responding

**Symptoms:**
- Can't toggle enabled/disabled switch

**Solutions:**
1. Refresh page
2. Clear browser cache (Ctrl+Shift+Del)
3. Try different browser

---

## API Integration (Advanced)

If you want to programmatically change settings:

**Endpoint:** `PATCH /api/rainbow/settings`

**Body:**
```json
{
  "sentiment_analysis": {
    "enabled": true,
    "consecutive_threshold": 2,
    "cooldown_minutes": 30
  }
}
```

**Example using curl:**
```bash
curl -X PATCH http://localhost:3002/api/rainbow/settings \
  -H "Content-Type: application/json" \
  -d '{"sentiment_analysis":{"enabled":true,"consecutive_threshold":2,"cooldown_minutes":30}}'
```

---

## Related Documentation

- **Testing Guide:** `docs/SENTIMENT-ANALYSIS-TESTING.md`
- **Implementation Details:** `docs/SENTIMENT-ANALYSIS-IMPLEMENTATION-SUMMARY.md`
- **Source Code:** `mcp-server/src/assistant/sentiment-tracker.ts`

---

## Quick Summary

✅ **Settings URL:** http://localhost:3002/admin/rainbow → Settings tab
✅ **Default:** Enabled, threshold=2, cooldown=30min
✅ **Changes:** Take effect immediately (no restart)
✅ **Testing:** Use 5min cooldown for testing, 30min for production
✅ **Disable:** Toggle off to completely disable sentiment analysis
