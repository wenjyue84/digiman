# WhatsApp Unlink Detection & Auto-Notification

## Overview

This feature automatically detects when WhatsApp instances are unlinked from the user's WhatsApp app (not from our system) and sends a notification to the user via the mainline instance.

## How It Works

### 1. Detection

When a user unlinks a WhatsApp instance from their WhatsApp app:
- Baileys receives a `DisconnectReason.loggedOut` status
- The system marks the instance as `unlinkedFromWhatsApp = true`
- Timestamp is recorded in `lastUnlinkedAt`

### 2. Notification

When an unlink is detected:
1. **Primary**: System tries to send notification via **Pelangi Capsule Hostel mainline** (`60103084289`)
2. **Fallback**: If mainline is unavailable, uses the next available connected instance
3. **Message**: Sends a notification to the unlinked phone number informing them of the unlink

### 3. Display in Admin Panel

The status page (`http://localhost:3002/admin/rainbow/status`) shows:

**Warning Banner** (if any unlinked instances):
```
⚠️ WhatsApp Instances Unlinked
The following instance(s) were unlinked from WhatsApp (possibly by the user):
• [Label] (Phone) — [Timestamp]

ℹ️ A notification has been sent to the user. If this was intentional, you can remove the instance below.
```

**Instance List**:
- Unlinked instances are highlighted with orange background
- Orange status dot (instead of green/yellow)
- "Unlinked from WhatsApp" badge next to the label

## Implementation Details

### Data Structure

```typescript
interface WhatsAppInstanceStatus {
  id: string;
  label: string;
  state: string;
  user: { name: string; id: string; phone: string } | null;
  authDir: string;
  qr: string | null;
  unlinkedFromWhatsApp: boolean;        // NEW
  lastUnlinkedAt: string | null;        // NEW
}
```

### Notification Message

```
⚠️ *WhatsApp Instance Unlinked*

Your WhatsApp instance *"[Label]"* ([Phone]) has been unlinked from PelangiManager.

This may have been accidental. If you need to reconnect, please visit the admin panel and scan the QR code again.

🔗 Admin Panel: http://localhost:3002/admin/rainbow/status

If this was intentional, you can safely ignore this message.
```

### Auto-Reconnect Behavior

- **Normal disconnect** (network issues, etc.): Auto-reconnects
- **Logged out** (user unlinked): Does NOT auto-reconnect
  - Marks as unlinked
  - Sends notification
  - Requires manual QR scan to reconnect

### Reconnection

When a previously unlinked instance reconnects:
- `unlinkedFromWhatsApp` is reset to `false`
- `lastUnlinkedAt` is cleared
- Status returns to normal

## Testing

### Manual Test

1. Open WhatsApp on your phone
2. Go to **Linked Devices**
3. Find the PelangiManager session
4. **Unlink** the device
5. Check admin panel: Should show unlink warning
6. Check WhatsApp messages: Should receive notification from mainline

### Expected Results

✅ Admin panel shows orange warning banner
✅ Instance highlighted with orange background
✅ "Unlinked from WhatsApp" badge visible
✅ Notification sent to user's phone via mainline
✅ If mainline unavailable, uses fallback instance

## Configuration

### Mainline Instance

Currently hardcoded: `60103084289` (Pelangi Capsule Hostel)

To change, edit in `baileys-client.ts`:
```typescript
const MAINLINE_ID = '60103084289'; // Pelangi Capsule Hostel mainline — change here if needed
```

## Files Modified

1. `mcp-server/src/lib/baileys-client.ts`
   - Added `unlinkedFromWhatsApp` and `lastUnlinkedAt` fields
   - Implemented unlink detection logic
   - Added `notifyUnlinkedInstance()` method
   - Updated status interface

2. `mcp-server/src/public/rainbow-admin.html`
   - Added unlinked instance warning banner
   - Highlighted unlinked instances in list
   - Added "Unlinked from WhatsApp" badge

## Future Enhancements

- [ ] Configurable mainline instance (settings page)
- [ ] Customizable notification message template
- [ ] Email notification (in addition to WhatsApp)
- [ ] Unlink history log
- [ ] Auto-remove after X days of unlink
- [ ] Webhook notification to external systems

## Troubleshooting

### Notification not sent

**Possible reasons:**
1. No connected instances available (including mainline)
2. Phone number extraction failed
3. Instance still initializing

**Check logs:**
```bash
cd mcp-server
npm run dev
# Watch for: "Sent unlink notification for..." or "Failed to send..."
```

### Unlink not detected

**Possible reasons:**
1. Network disconnect (not actual unlink)
2. Server restart before unlink event
3. Instance stopped before logging out

**Verify:**
- Check instance state: Should be "close"
- Check `lastDisconnect.error.output.statusCode`: Should be `401` (logged out)

### False positives

If instances are incorrectly marked as unlinked:
- Check Baileys library version compatibility
- Verify `DisconnectReason.loggedOut` constant value
- Review connection event logs

## Related Documentation

- [Rainbow MCP Server](./.claude/skills/rainbow-mcp-server/SKILL.md)
- [WhatsApp Baileys Integration](./.claude/skills/whatsapp-baileys/SKILL.md)
- [MCP Server Testing](./.claude/skills/mcp-server-testing/SKILL.md)
