# Test MCP Connection to Pelangi Hostel

After restarting Claude Code, paste these queries one by one to test the MCP server connection.

## Test 1: Check MCP Server is Loaded

```
List all MCP servers currently loaded
```

**Expected**: Should see "pelangi-mcp" in the list

---

## Test 2: List Available Tools

```
Show me all tools from the pelangi-mcp server
```

**Expected**: Should see 19 tools listed

---

## Test 3: Get Occupancy

```
What's the current occupancy at Pelangi Hostel using the pelangi-mcp server?
```

**Expected**: Should return occupancy statistics (total, occupied, available, occupancy rate)

---

## Test 4: List Checked-In Guests

```
Show me all currently checked-in guests at Pelangi Hostel
```

**Expected**: Should return a list of guests with their details

---

## Test 5: Check Availability

```
Which capsules are available right now at Pelangi Hostel?
```

**Expected**: Should return a list of available capsules

---

## Test 6: Get Dashboard Data

```
Give me the full dashboard overview for Pelangi Hostel
```

**Expected**: Should return comprehensive dashboard data including occupancy, guests, and notifications

---

## Test 7: Export Data

```
Export all checked-in guests to CSV format
```

**Expected**: Should return CSV formatted data

---

## Troubleshooting

### If tools don't work:

1. **Check Configuration**:
   ```bash
   cat ~/.claude/.mcp.json
   ```
   Verify "pelangi-mcp" is listed with URL: https://mcp-pelangi.zeabur.app/mcp

2. **Verify MCP Server is Running**:
   ```bash
   curl https://mcp-pelangi.zeabur.app/health
   ```
   Should return: `{"status":"ok",...}`

3. **Test MCP Protocol Directly**:
   ```bash
   curl -X POST https://mcp-pelangi.zeabur.app/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq '.result.tools | length'
   ```
   Should return: `19`

4. **Restart Claude Code**:
   Make sure you completely exited Claude Code and restarted it (not just started a new chat)

---

## Example Workflows

### Morning Routine
```
1. What's the occupancy at Pelangi?
2. List guests checking out today
3. Which capsules need cleaning?
```

### Check-In New Guest
```
Check in a new guest:
- Name: John Doe
- ID: A12345678
- Nationality: Malaysia
- Phone: +60123456789
- Checkout Date: 2026-02-05
- Payment: RM150 (cash)
```

### Weekly Report
```
1. Give me guest statistics for this week
2. Export all guests to CSV
3. Show capsule utilization analytics
```

---

## Success!

If all tests pass, your MCP server is working correctly and you can now:
- ✅ Manage guests through Claude Code
- ✅ Monitor occupancy in real-time
- ✅ Track capsule status and cleaning
- ✅ Generate reports and analytics
- ✅ Export data for external use

**Your Pelangi Hostel is now AI-powered!** 🚀
