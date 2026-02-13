# Tailscale Setup - Rainbow Dashboard

## Public URL

**Your Rainbow Dashboard:**
https://desktop-i3d1826.tail06f282.ts.net/

---

## What's Running

- ✅ **Tailscale Funnel** - Public HTTPS access to localhost:3002
- ✅ **Running in background** - Automatically starts with Tailscale
- ✅ **HTTPS enabled** - Secure connection via Tailscale certificate

---

## Quick Commands

### Check Status
```bash
tailscale serve status
```

**Expected output:**
```
https://desktop-i3d1826.tail06f282.ts.net (Funnel on)
|-- / proxy http://127.0.0.1:3002
```

### Stop Public Access
```bash
tailscale funnel --https=443 off
```

### Restart Public Access
```bash
tailscale funnel --bg 3002
```

### Switch to Private Access (Tailscale Network Only)
```bash
# Stop public funnel
tailscale funnel --https=443 off

# Enable private serve
tailscale serve --bg 3002
```

**Result:** Dashboard only accessible to devices on your Tailscale network.

---

## Security Warning ⚠️

**Your dashboard is publicly accessible!**

Anyone with the URL can:
- ✅ View your Rainbow AI settings
- ✅ See WhatsApp instances
- ✅ View AI provider configurations
- ✅ Access training data
- ⚠️ **Potentially modify settings** (if admin endpoints are exposed)

### Recommended: Add Authentication

The Rainbow dashboard doesn't have built-in authentication. Consider:

1. **Use Tailscale Serve instead** (private access only)
   ```bash
   tailscale funnel --https=443 off
   tailscale serve --bg 3002
   ```

2. **Add Nginx reverse proxy** with basic auth

3. **Use Tailscale ACLs** to restrict access by user/group

4. **Add firewall rules** to restrict by IP

---

## Accessing from Different Devices

### Desktop/Laptop
Open browser: https://desktop-i3d1826.tail06f282.ts.net

### Mobile Phone
Same URL works on mobile browsers

### Team Members
Share the URL with team members (⚠️ make sure you trust them!)

---

## Troubleshooting

### Dashboard shows "Loading..."
The Funnel is just a proxy. If dashboard doesn't load:

1. **Check local server is running:**
   ```bash
   check-health.bat
   ```

2. **If MCP server is down:**
   ```bash
   cd RainbowAI && npm run dev
   ```

3. **Test locally first:**
   - Open http://localhost:3002 in browser
   - If it works locally but not via Funnel → check Tailscale status

### Funnel not working
```bash
# Check Tailscale status
tailscale status

# If offline, reconnect
tailscale up

# Restart funnel
tailscale funnel --bg 3002
```

### Certificate errors
Tailscale auto-provisions HTTPS certificates. If you see certificate warnings:
- Wait 1-2 minutes for cert to provision
- Check Tailscale admin panel for cert status

---

## Performance Considerations

### Latency
- Funnel adds ~50-100ms latency (Tailscale relay)
- Use Tailscale Serve if your devices are on the same network
- Consider direct VPN for low-latency access

### Bandwidth
- Funnel is free with unlimited bandwidth
- Suitable for low-medium traffic
- For high traffic, consider direct hosting

---

## Alternative: Direct Hosting Options

If you need better performance or custom domain:

1. **Zeabur/Vercel** - Deploy to cloud (already set up?)
2. **Cloudflare Tunnel** - Similar to Funnel but with custom domains
3. **ngrok** - Alternative tunneling service
4. **Self-hosted VPS** - Full control, custom domain

---

## Funnel Auto-Start

Tailscale Funnel persists across restarts. It will automatically start when:
- ✅ Windows starts
- ✅ Tailscale service starts
- ✅ No additional setup needed

To disable auto-start:
```bash
tailscale funnel --https=443 off
```

---

## Monitor Access

### Check Logs
```bash
# Run funnel in foreground to see access logs
tailscale funnel 3002
```

### Tailscale Admin Panel
Visit: https://login.tailscale.com/admin/machines

Check traffic statistics and connected devices.

---

## Quick Reference Card

```
┌─────────────────────────────────────────────┐
│  TAILSCALE FUNNEL - RAINBOW DASHBOARD      │
├─────────────────────────────────────────────┤
│  Public URL:                               │
│  https://desktop-i3d1826.tail06f282.ts.net │
│                                            │
│  Status:                                   │
│  tailscale serve status                    │
│                                            │
│  Stop Public Access:                       │
│  tailscale funnel --https=443 off          │
│                                            │
│  Restart:                                  │
│  tailscale funnel --bg 3002                │
│                                            │
│  ⚠️  Publicly accessible - add auth!       │
└─────────────────────────────────────────────┘
```

---

## Summary

- ✅ Rainbow dashboard is now online at https://desktop-i3d1826.tail06f282.ts.net
- ✅ Public HTTPS access enabled
- ✅ Running in background
- ⚠️ No authentication - publicly accessible!
- 💡 Consider switching to Tailscale Serve for private access
