# WhatsApp Unlink Detection - Testing Guide

## Quick Test

### Prerequisites
- MCP server running (`cd mcp-server && npm run dev`)
- At least 2 WhatsApp instances connected (mainline + test instance)
- Access to admin panel: `http://localhost:3002/admin/rainbow/status`

### Test Procedure

#### 1. Check Current Status
```bash
curl -s "http://localhost:3002/api/rainbow/status" | jq '.whatsappInstances[] | {id, label, state, unlinkedFromWhatsApp}'
```

Expected output:
```json
{
  "id": "60103084289",
  "label": "Pelangi Capsule Hostel (60103084289) - Mainline",
  "state": "open",
  "unlinkedFromWhatsApp": false
}
{
  "id": "60167052004",
  "label": "Alston's Assistant (60167052004)",
  "state": "open",
  "unlinkedFromWhatsApp": false
}
```

#### 2. Unlink a Test Instance

**On your phone:**
1. Open WhatsApp
2. Go to **Settings** → **Linked Devices**
3. Find the test instance (e.g., "Alston's Assistant")
4. Tap on it and select **Log out**

#### 3. Verify Detection (Server Logs)

Watch the server logs:
```bash
cd mcp-server && npm run dev
```

Expected log messages:
```
[Baileys:60167052004] Logged out from WhatsApp (user unlinked). Remove auth dir and re-pair.
[WhatsAppManager] Sent unlink notification for "60167052004" via "60103084289"
[Baileys:60103084289] Sent to 60167052004@s.whatsapp.net: ⚠️ *WhatsApp Instance Unlinked*...
```

#### 4. Check Status After Unlink

```bash
curl -s "http://localhost:3002/api/rainbow/status" | jq '.whatsappInstances[] | select(.id == "60167052004")'
```

Expected output:
```json
{
  "id": "60167052004",
  "label": "Alston's Assistant (60167052004)",
  "state": "close",
  "unlinkedFromWhatsApp": true,
  "lastUnlinkedAt": "2026-02-11T08:30:15.123Z"
}
```

#### 5. Check Admin Panel

Visit: `http://localhost:3002/admin/rainbow/status`

**Expected display:**
- ⚠️ **Orange warning banner** at the top:
  ```
  ⚠️ WhatsApp Instances Unlinked
  The following instance(s) were unlinked from WhatsApp:
  • Alston's Assistant (60167052004) (60167052004) — 2/11/2026, 8:30:15 AM

  ℹ️ A notification has been sent to the user.
  ```

- **Instance list** shows:
  - Orange background highlight for unlinked instance
  - Orange status dot (instead of green/yellow)
  - "Unlinked from WhatsApp" badge

#### 6. Check Notification Received

**On the phone that was unlinked:**
- Should receive a WhatsApp message from mainline (60103084289)
- Message content:
  ```
  ⚠️ *WhatsApp Instance Unlinked*

  Your WhatsApp instance *"Alston's Assistant (60167052004)"* (60167052004) has been unlinked from PelangiManager.

  This may have been accidental. If you need to reconnect, please visit the admin panel and scan the QR code again.

  🔗 Admin Panel: http://localhost:3002/admin/rainbow/status

  If this was intentional, you can safely ignore this message.
  ```

## Fallback Test (Mainline Unavailable)

### Test when mainline is not connected:

#### 1. Unlink the mainline instance
```bash
curl -X POST "http://localhost:3002/api/rainbow/whatsapp/instances/60103084289/logout"
```

#### 2. Unlink another test instance from WhatsApp

#### 3. Check logs for fallback behavior
```
[WhatsAppManager] Mainline "60103084289" not available, finding fallback...
[WhatsAppManager] Using fallback instance: [next-available-id]
```

#### 4. Verify notification sent via fallback instance

## Expected Results Checklist

- [ ] ✅ Unlink detected within 2-5 seconds
- [ ] ✅ `unlinkedFromWhatsApp` set to `true`
- [ ] ✅ `lastUnlinkedAt` timestamp recorded
- [ ] ✅ Warning banner displayed in admin panel
- [ ] ✅ Instance highlighted with orange background
- [ ] ✅ "Unlinked from WhatsApp" badge visible
- [ ] ✅ Notification sent to user's phone
- [ ] ✅ Notification sent via mainline (or fallback if mainline unavailable)
- [ ] ✅ Server logs show successful notification delivery

## Troubleshooting

### Unlink not detected
**Check:**
- Server logs for disconnect reason
- Instance state (should be "close")
- Baileys version compatibility

**Fix:**
- Restart MCP server
- Verify WhatsApp actually logged out (not just network disconnect)

### Notification not sent
**Check:**
- Mainline instance connection status
- Fallback instances available
- Phone number extraction from unlinked instance

**Fix:**
- Manually trigger notification:
  ```typescript
  // In admin panel console:
  fetch('/api/rainbow/test-unlink-notification', {
    method: 'POST',
    body: JSON.stringify({ instanceId: '60167052004' })
  })
  ```

### Warning not displayed
**Check:**
- Browser cache (hard refresh: Ctrl+Shift+R)
- API response includes new fields
- JavaScript console for errors

**Fix:**
- Clear browser cache
- Restart MCP server
- Check HTML file updated correctly

## Cleanup After Testing

### Re-link the test instance:
1. Open admin panel: `http://localhost:3002/admin/rainbow/status`
2. Find the unlinked instance
3. Click **QR** button
4. Scan QR code with WhatsApp

### Verify reconnection:
```bash
curl -s "http://localhost:3002/api/rainbow/status" | jq '.whatsappInstances[] | select(.id == "60167052004")'
```

Expected:
```json
{
  "id": "60167052004",
  "state": "open",
  "unlinkedFromWhatsApp": false,
  "lastUnlinkedAt": null
}
```

## Automated Testing (Future)

To add automated tests:

```typescript
// test/whatsapp-unlink-detection.test.ts
describe('WhatsApp Unlink Detection', () => {
  it('should detect when instance is unlinked', async () => {
    // Mock DisconnectReason.loggedOut
    // Verify unlinkedFromWhatsApp is set to true
    // Verify lastUnlinkedAt is set
  });

  it('should send notification via mainline', async () => {
    // Mock unlink event
    // Verify sendMessage called with mainline instance
  });

  it('should fallback when mainline unavailable', async () => {
    // Mock mainline unavailable
    // Verify sendMessage called with fallback instance
  });

  it('should clear unlink status on reconnect', async () => {
    // Mock unlink then reconnect
    // Verify unlinkedFromWhatsApp reset to false
  });
});
```

## Related Documentation

- [WhatsApp Unlink Detection](./whatsapp-unlink-detection.md)
- [Rainbow MCP Server](./.claude/skills/rainbow-mcp-server/SKILL.md)
- [WhatsApp Baileys Integration](./.claude/skills/whatsapp-baileys/SKILL.md)
