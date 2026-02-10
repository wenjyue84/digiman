# Testing Checkout Alerts Locally

## Prerequisites
- ✅ Database migration applied (already done)
- ✅ WhatsApp paired and connected (check if needed)
- ✅ All dependencies installed

## Option 1: Quick Start (Automated)

```bash
# Run the startup script
start-local-test.bat
```

This will:
1. Kill any processes on ports 3000, 5000, 3001
2. Start main app (frontend + backend)
3. Start MCP server (WhatsApp + schedulers)

## Option 2: Manual Start

### Terminal 1 - Main App
```bash
npm run dev
```
Wait for: `Server running on http://localhost:5000`

### Terminal 2 - MCP Server
```bash
cd mcp-server
npm run dev
```
Wait for: `Pelangi MCP Server running on http://0.0.0.0:3001`

## Step-by-Step Testing

### 1. Verify Services Are Running

**Check Health Endpoint:**
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "pelangi-mcp-server",
  "whatsapp": "open",  // ← Should be "open"
  "timestamp": "2026-02-08T..."
}
```

**If WhatsApp shows "close":**
```bash
cd mcp-server
node pair-whatsapp.cjs
# Scan QR code with WhatsApp
```

### 2. Open the App

Visit: http://localhost:3000

Login with your admin credentials.

### 3. Create/Use Test Guest

**Option A: Use Existing Guest**
1. Go to **Check-Out** page
2. Find a checked-in guest
3. Skip to Step 4

**Option B: Create New Test Guest**
1. Go to **Check-In** page
2. Fill in guest details:
   - Name: `Test Alert Guest`
   - Capsule: Any available
   - Expected Checkout: **Tomorrow's date** (or today if testing immediately)
   - Payment: Mark as paid or unpaid (to test message formatting)
3. Click **Check In**
4. Go to **Check-Out** page

### 4. Configure Alert Settings

In the **Check-Out** page:

1. Find your test guest
2. **Click on the checkout date** (you'll see a bell icon on hover)
3. Alert dialog opens
4. Configure:
   - ✅ Enable Checkout Reminder: **ON**
   - ✅ Notify 1 day before checkout: **Check this if checkout is tomorrow**
   - ✅ Notify on checkout day (9:00 AM): **Check this if checkout is today**
   - ✅ WhatsApp: **Checked**
   - ✅ Push Notification: **Optional** (not implemented yet)
5. Click **Save Settings**
6. Verify toast: "Alert Settings Saved"

### 5. Test the Scheduler

**Option A: Wait for Scheduled Time (9:00 AM MYT)**
- If it's before 9:00 AM Malaysia time
- Wait for the cron to trigger
- Check your WhatsApp at +60127088789

**Option B: Trigger Manually (Immediate Test)**

Run the test script:
```bash
node test-checkout-alerts.js
```

Expected output:
```
🧪 Testing Checkout Alert System
==================================================
👥 Found X checked-in guests

➜ Guest: Test Alert Guest (C12)
  Checkout Date: 2026-02-09
  Alert Enabled: ✓
  → Match: Checkout TOMORROW (advance notice = 1)

✓ WhatsApp message sent to 60127088789
Message preview: 🔔 *CHECKOUT REMINDER* 🔔...

📊 Results: 1 sent, 0 errors
✅ Test completed successfully!
```

**Option C: Trigger in Production MCP Server**

In the MCP server terminal, run:
```bash
# From the mcp-server directory
node -e "import('./dist/lib/checkout-alerts.js').then(m => m.checkAndSendCheckoutAlerts()).then(r => console.log('Result:', r))"
```

### 6. Verify WhatsApp Message

Check WhatsApp at **+60127088789** for a message like:

```
🔔 CHECKOUT REMINDER 🔔

Guest: Test Alert Guest
Capsule: C12
Expected Checkout: 09/02/2026
Payment Status: ✅ Paid

───────────────
📋 Action required: Check out guest today
```

### 7. Test Duplicate Prevention

1. Run the trigger again (Option B or C)
2. Verify the guest is **skipped** with message:
   ```
   → Skipped (already notified today)
   ```
3. Check `lastNotified` timestamp was updated in database

### 8. Test Different Scenarios

**Scenario 1: Checkout Today**
- Set guest's checkout date to today
- Enable alert with "Notify on checkout day"
- Trigger scheduler
- ✓ Should receive message

**Scenario 2: Checkout Tomorrow**
- Set guest's checkout date to tomorrow
- Enable alert with "Notify 1 day before"
- Trigger scheduler
- ✓ Should receive message

**Scenario 3: Alerts Disabled**
- Disable alerts for a guest
- Trigger scheduler
- ✓ Should NOT receive message

**Scenario 4: Unpaid Guest**
- Create guest with unpaid status and amount
- Set checkout date to today
- Enable alerts
- Trigger scheduler
- ✓ Message should show "❌ Outstanding RM[amount]"

**Scenario 5: No Checkout Date**
- Guest without expectedCheckoutDate
- Enable alerts
- Trigger scheduler
- ✓ Should be skipped

## Debugging

### Check MCP Server Logs

In the MCP server terminal, you should see:
```
Checkout alert scheduler started (9:00 AM MYT daily)
Running scheduled checkout alerts...  // ← At 9:00 AM
Checkout alerts completed: X sent, Y errors
```

### Check Database

Verify alert settings are saved:
```sql
-- Check guest's alert settings
SELECT name, capsule_number, expected_checkout_date, alert_settings
FROM guests
WHERE name = 'Test Alert Guest';
```

### Check API Logs

In the main app terminal, you should see:
```
PATCH /api/guests/:id
  Body: { alertSettings: "..." }
```

### Common Issues

**Issue: WhatsApp not connected**
```
Solution: Run pair-whatsapp.cjs and scan QR code
cd mcp-server
node pair-whatsapp.cjs
```

**Issue: Scheduler not running**
```
Solution: Check if MCP server started successfully
Look for: "Checkout alert scheduler started (9:00 AM MYT daily)"
```

**Issue: Guest not found**
```
Solution: Ensure guest is checked-in (isCheckedIn = true)
Go to Check-Out page to verify guest appears in list
```

**Issue: No message received**
```
Solution: Check these in order:
1. WhatsApp status: curl http://localhost:3001/health
2. Alert enabled: Open dialog and verify toggle is ON
3. Date matches: Checkout date = today/tomorrow
4. Advance notice: Correct option checked
5. Not already notified: Check lastNotified timestamp
```

## Test Checklist

Before merging to production, verify:

- [ ] Services start without errors
- [ ] Health endpoint shows WhatsApp "open"
- [ ] Alert dialog opens on clicking checkout date
- [ ] Settings save successfully
- [ ] Toast notification appears after save
- [ ] WhatsApp message received (manual trigger)
- [ ] Message format is correct (emojis, formatting)
- [ ] Duplicate prevention works (no 2nd message)
- [ ] Scheduler logs appear at 9:00 AM (or manual trigger)
- [ ] Multiple guests processed correctly
- [ ] Disabled alerts are skipped
- [ ] lastNotified timestamp updates
- [ ] Works in all 3 view modes (table, list, card)
- [ ] Bell icons appear in UI
- [ ] Payment status displays correctly (paid/unpaid)

## Cleanup After Testing

```bash
# Optional: Remove test guest
# Go to Check-Out page → Check out test guest

# Stop services
# Close all terminal windows (Ctrl+C)
```

## Next Steps

Once local testing is complete:
1. ✅ All tests passing
2. Create pull request
3. Code review
4. Merge to main
5. Zeabur auto-deploys
6. Verify in production

---

**Need Help?**
- Check logs in terminal windows
- Run `test-checkout-alerts.js` for automated testing
- Check MCP server health: `curl http://localhost:3001/health`
- Verify database: Check `alert_settings` field in guests table
