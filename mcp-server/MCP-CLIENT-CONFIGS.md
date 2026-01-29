# MCP Client Configuration Prompts

## 📋 Quick Reference

**MCP Server Details:**
- **Service Name:** `pelangi-mcp`
- **Transport:** HTTP
- **URL:** `https://mcp-pelangi.zeabur.app/mcp` *(update after Zeabur deployment)*
- **Protocol:** JSON-RPC 2.0
- **Total Tools:** 19 (10 read + 9 write operations)

---

## 1️⃣ Claude Code Configuration

### Prompt for Claude Code

```
I need you to configure an MCP server for PelangiManager (hostel management system).

Configuration details:
- Server name: pelangi-mcp
- Transport: HTTP
- URL: https://mcp-pelangi.zeabur.app/mcp
- No authentication headers needed (token is server-side)

Add this to my ~/.claude/mcp_settings.json file.

The server provides 19 tools for managing:
- Guests (check-in, checkout, search, statistics)
- Capsules (occupancy, availability, cleaning)
- Problems (maintenance tracking)
- Analytics (reports, CSV exports)

Please confirm the configuration is added correctly.
```

### Manual Configuration

**File:** `~/.claude/mcp_settings.json` (Linux/Mac) or `%USERPROFILE%\.claude\mcp_settings.json` (Windows)

```json
{
  "mcpServers": {
    "pelangi-mcp": {
      "transport": "http",
      "url": "https://mcp-pelangi.zeabur.app/mcp",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

### Verification

After configuration, test in Claude Code:
```
Can you list all available tools from the pelangi-mcp server?
```

Expected: Claude should list all 19 tools.

---

## 2️⃣ Cursor Configuration

### Prompt for Cursor

```
I want to add an MCP server to Cursor for hostel management.

Server details:
- Name: pelangi-mcp
- Type: HTTP MCP server
- Endpoint: https://mcp-pelangi.zeabur.app/mcp
- Protocol: JSON-RPC 2.0

This server provides 19 tools for:
1. Guest management (check-in, checkout, search)
2. Capsule operations (occupancy, availability, cleaning)
3. Problem tracking (maintenance issues)
4. Analytics (statistics, reports, CSV exports)

Please add this to my Cursor MCP configuration.

The configuration should use HTTP transport with the endpoint URL above.
No authentication headers are needed as the API token is configured server-side.

Let me know once it's configured so I can test it.
```

### Manual Configuration

**Cursor Settings:**

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Search for "MCP" or "Model Context Protocol"
3. Add new MCP server configuration:

```json
{
  "mcp": {
    "servers": {
      "pelangi-mcp": {
        "transport": "http",
        "url": "https://mcp-pelangi.zeabur.app/mcp"
      }
    }
  }
}
```

### Verification

In Cursor, ask:
```
What tools are available from pelangi-mcp?
```

Expected: List of 19 tools for hostel management.

---

## 3️⃣ Clawdbot Configuration

### Prompt for Clawdbot

```
Configure a new MCP server for PelangiManager hostel system.

**Server Configuration:**
- Server ID: pelangi-mcp
- Transport Protocol: HTTP
- Endpoint URL: https://mcp-pelangi.zeabur.app/mcp
- Content-Type: application/json
- Authentication: None (server-side token)

**Server Capabilities:**
This MCP server provides 19 tools organized in 4 categories:

1. **Guest Management (6 tools):**
   - pelangi_list_guests - List checked-in guests
   - pelangi_get_guest - Get guest by ID number
   - pelangi_search_guests - Search guests by criteria
   - pelangi_checkin_guest - Check in new guest
   - pelangi_checkout_guest - Check out guest
   - pelangi_bulk_checkout - Bulk checkout (overdue/today/all)

2. **Capsule Operations (7 tools):**
   - pelangi_list_capsules - List all capsules with status
   - pelangi_get_occupancy - Get occupancy statistics
   - pelangi_check_availability - Get available capsules
   - pelangi_capsule_utilization - Utilization analytics
   - pelangi_mark_cleaned - Mark capsule as cleaned
   - pelangi_bulk_mark_cleaned - Mark all capsules cleaned
   - pelangi_get_dashboard - Bulk dashboard data

3. **Problem Tracking (3 tools):**
   - pelangi_list_problems - List active problems
   - pelangi_get_problem_summary - Problem summary
   - pelangi_export_whatsapp_issues - WhatsApp-formatted issues

4. **Analytics & Reporting (3 tools):**
   - pelangi_get_overdue_guests - List overdue guests
   - pelangi_guest_statistics - Guest statistics with nationality breakdown
   - pelangi_export_guests_csv - Export guest data as CSV

**Use Cases:**
- Daily guest check-in/checkout operations
- Capsule cleaning management
- Occupancy monitoring and reporting
- Maintenance issue tracking
- Guest analytics and reporting

Please add this MCP server to my configuration and confirm when ready.
```

### Alternative Minimal Prompt

```
Add MCP server:
- Name: pelangi-mcp
- Type: HTTP
- URL: https://mcp-pelangi.zeabur.app/mcp

This provides 19 tools for hostel management (guests, capsules, problems, analytics).
```

### Configuration Format (if manual needed)

```json
{
  "pelangi-mcp": {
    "transport": "http",
    "url": "https://mcp-pelangi.zeabur.app/mcp",
    "headers": {
      "Content-Type": "application/json"
    },
    "description": "PelangiManager MCP server - 19 tools for hostel management"
  }
}
```

### Verification

Ask clawdbot:
```
List all tools from pelangi-mcp server
```

Or:
```
What's the current occupancy at Pelangi Hostel?
```

Expected: Clawdbot should query the MCP server and return occupancy data.

---

## 4️⃣ Antigravity Configuration

### Prompt for Antigravity

```
Add MCP server connection:

Server: pelangi-mcp
Protocol: HTTP (JSON-RPC 2.0)
Endpoint: https://mcp-pelangi.zeabur.app/mcp
Description: PelangiManager hostel management system

Available capabilities:
- Guest operations (CRUD)
- Capsule management
- Occupancy analytics
- Problem tracking
- Data exports (CSV, WhatsApp)

Configure this server for remote access.
```

---

## 🧪 Testing Your Configuration

### Quick Test Commands

Once configured in any client, try these test queries:

**1. List Available Tools:**
```
Show me all tools from pelangi-mcp server
```

**2. Get Occupancy:**
```
What's the current occupancy at Pelangi Hostel?
```

**3. List Checked-In Guests:**
```
Show me all currently checked-in guests
```

**4. Get Statistics:**
```
Give me guest statistics including nationality breakdown
```

**5. Export Data:**
```
Export checked-in guests to CSV format
```

---

## 🔧 Troubleshooting

### Client Can't Find Server

**Symptoms:**
- "Server not found" error
- "Connection refused"
- Empty tool list

**Solutions:**
1. Verify Zeabur deployment is running: `curl https://mcp-pelangi.zeabur.app/health`
2. Check URL is correct (no typos)
3. Restart MCP client application
4. Check client configuration file syntax (valid JSON)

### Tools Return Errors

**Symptoms:**
- "No token provided"
- "401 Unauthorized"
- "API Error"

**Solutions:**
1. Check `PELANGI_API_TOKEN` is set in Zeabur environment variables
2. Verify token is still valid (may need to regenerate)
3. Check PelangiManager is accessible: `curl https://pelangi.zeabur.app/api/occupancy`

### Slow Responses

**Symptoms:**
- Tools take >5 seconds to respond
- Timeout errors

**Solutions:**
1. Check Zeabur service status (may be sleeping on free tier)
2. Verify PelangiManager API is responsive
3. Consider upgrading Zeabur plan for always-on service

---

## 📊 Tool Categories Reference

### Read-Only Tools (10)
Safe to use anytime, no data modification:
- pelangi_list_guests
- pelangi_get_guest
- pelangi_search_guests
- pelangi_list_capsules
- pelangi_get_occupancy
- pelangi_check_availability
- pelangi_get_dashboard
- pelangi_get_overdue_guests
- pelangi_list_problems
- pelangi_export_whatsapp_issues

### Write Operations (6)
Modify data - use with caution:
- pelangi_checkin_guest
- pelangi_checkout_guest
- pelangi_bulk_checkout
- pelangi_mark_cleaned
- pelangi_bulk_mark_cleaned

### Analytics (3)
Generate reports and exports:
- pelangi_capsule_utilization
- pelangi_guest_statistics
- pelangi_export_guests_csv

---

## 🎯 Example Workflows

### Morning Routine
```
1. "Show current occupancy at Pelangi"
2. "List guests checking out today"
3. "Which capsules need cleaning?"
```

### Check-In Guest
```
"Check in a new guest:
Name: John Doe
ID: A12345678
Nationality: Malaysia
Phone: +60123456789
Checkout: 2026-02-01
Payment: 150 (cash)"
```

### Weekly Report
```
1. "Get guest statistics for this week"
2. "Export all guests to CSV"
3. "Show capsule utilization analytics"
```

---

## 📝 Configuration Summary

| Client | Config File | Format | Status |
|--------|-------------|--------|--------|
| **Claude Code** | `~/.claude/mcp_settings.json` | JSON | ✅ Ready |
| **Cursor** | Settings → MCP | JSON | ✅ Ready |
| **Clawdbot** | Bot configuration | JSON | ✅ Ready |
| **Antigravity** | MCP settings | JSON | ✅ Ready |

---

## 🚀 Next Steps After Configuration

1. ✅ Configure all MCP clients
2. Test basic queries in each client
3. Create saved workflows/commands for common operations
4. Set up n8n automation using MCP tools
5. Integrate with WhatsApp via Periskope

---

**Need Help?**
- See `README.md` for tool documentation
- See `DEPLOYMENT.md` for deployment details
- See `QUICK-START.md` for testing guide
