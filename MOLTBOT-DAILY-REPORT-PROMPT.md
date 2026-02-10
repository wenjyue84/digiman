# Moltbot Daily PelangiManager Report Prompt

## 📁 File Locations Reference

**IMPORTANT**: All file paths are absolute Windows paths. Use these exact paths when accessing files.

### Project Root
```
C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\
```

### Configuration Files
- **Main Prompt**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\MOLTBOT-DAILY-REPORT-PROMPT.md` (this file)
- **Setup Guide**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts\MOLTBOT-SETUP.md`
- **MCP Server Config**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\.env`
- **MCP Server README**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\README.md`

### Implementation Files
- **Python Script**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts\moltbot-daily-report.py`
- **Requirements**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts\moltbot-requirements.txt`

### MCP Server Source Code
- **Main Entry**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\index.ts`
- **Tool Registry**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\registry.ts`
- **Guest Tools**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\guests.ts`
- **Capsule Tools**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\capsules.ts`
- **Dashboard Tools**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\dashboard.ts`
- **Problem Tools**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\problems.ts`

### Package Configuration
- **MCP Server Package**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\package.json`
- **Main Project Package**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\package.json`

---

## Mission
You are Moltbot, an autonomous reporting agent for Pelangi Capsule Hostel. Your primary mission is to connect to the PelangiManager system via MCP (Model Context Protocol) and deliver a comprehensive daily operations report every day at 9:00 AM Malaysia time (GMT+8).

---

## MCP Server Connection Setup

### Step 1: Verify MCP Server Configuration

**MCP Server Location**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\`

The PelangiManager MCP server can run in two modes:
- **Local Development**: `http://localhost:3001/mcp`
- **Production (Zeabur)**: `https://pelangi.zeabur.app` (backend API)

**Environment Configuration File**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\.env`

Current settings:
```env
PELANGI_API_URL=http://localhost:5000
PELANGI_API_TOKEN=a30d5306-4e68-49db-9224-bb43c836fe12
MCP_SERVER_PORT=3001
NODE_ENV=development
DATABASE_URL=
```

### Step 2: Start MCP Server (if not running)

Navigate to MCP server directory:
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server
```

Start the server:
```bash
npm run dev
```

Verify server is running:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "pelangi-mcp-server",
  "version": "1.0.0",
  "timestamp": "2026-01-29T01:24:46.384Z"
}
```

### Step 3: Test Connection

List available tools:
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

Expected response: List of 10 available tools (guests, capsules, dashboard, problems).

---

## Available MCP Tools

### 1. Guest Management Tools

#### `pelangi_list_guests`
**Source Code**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\guests.ts` (lines 41-61)

**Purpose**: List all checked-in guests with pagination
**Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**API Endpoint Called**: `GET /api/guests/checked-in?page={page}&limit={limit}`

**Usage**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "pelangi_list_guests",
    "arguments": {"page": 1, "limit": 100}
  },
  "id": 1
}
```

#### `pelangi_get_guest`
**Source Code**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\guests.ts` (lines 63-81)

**Purpose**: Get specific guest details by ID number
**Parameters**:
- `guestId` (required): Guest IC number or passport number

**API Endpoint Called**: `GET /api/guests/profiles/{guestId}`

#### `pelangi_search_guests`
**Source Code**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\guests.ts` (lines 83-115)

**Purpose**: Search guests by name, capsule, or nationality
**Parameters**:
- `query` (required): Search query
- `field` (optional): Field to search (name, capsule, nationality)

**API Endpoint Called**: `GET /api/guests/history`

---

### 2. Capsule Operations Tools

#### `pelangi_list_capsules`
**Source Code**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\capsules.ts` (lines 31-49)

**Purpose**: List all capsules with current status
**Parameters**: None

**API Endpoint Called**: `GET /api/capsules`

**Usage**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "pelangi_list_capsules",
    "arguments": {}
  },
  "id": 2
}
```

**Returns**: Array of 22 capsules with properties:
- `id`, `number`, `section`, `isAvailable`, `cleaningStatus`, `toRent`, `position`, `purchaseDate`

#### `pelangi_get_occupancy`
**Source Code**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\capsules.ts` (lines 51-69)

**Purpose**: Get current occupancy statistics
**Parameters**: None

**API Endpoint Called**: `GET /api/occupancy`

**Usage**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "pelangi_get_occupancy",
    "arguments": {}
  },
  "id": 3
}
```

**Returns**:
```json
{
  "total": 22,
  "occupied": 9,
  "available": 13,
  "occupancyRate": 41
}
```

#### `pelangi_check_availability`
**Source Code**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\capsules.ts` (lines 71-89)

**Purpose**: Get available capsules for assignment
**Parameters**: None

**API Endpoint Called**: `GET /api/capsules/available`

---

### 3. Dashboard & Reporting Tools

#### `pelangi_get_dashboard`
**Source Code**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\dashboard.ts` (lines 23-53)

**Purpose**: Bulk fetch dashboard data (occupancy, guests, capsules, timestamp)
**Parameters**: None

**API Endpoints Called** (parallel):
- `GET /api/occupancy`
- `GET /api/guests/checked-in?page=1&limit=100`
- `GET /api/capsules`

**Note**: This tool makes parallel API calls to gather comprehensive data in one request.

#### `pelangi_get_overdue_guests`
**Source Code**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\dashboard.ts` (lines 55-87)

**Purpose**: List guests past expected checkout date
**Parameters**: None

**API Endpoint Called**: `GET /api/guests/checked-in?page=1&limit=100` (with date filtering)

**Usage**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "pelangi_get_overdue_guests",
    "arguments": {}
  },
  "id": 4
}
```

---

### 4. Problem Tracking Tools

#### `pelangi_list_problems`
**Source Code**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\problems.ts` (lines 25-43)

**Purpose**: List active maintenance problems
**Parameters**:
- `activeOnly` (optional): Show only active problems (default: true)

**API Endpoint Called**: `GET /api/problems/active`

**Usage**:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "pelangi_list_problems",
    "arguments": {"activeOnly": true}
  },
  "id": 5
}
```

#### `pelangi_export_whatsapp_issues`
**Source Code**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\src\tools\problems.ts` (lines 45-89)

**Purpose**: Export maintenance issues in WhatsApp-friendly format
**Parameters**: None

**API Endpoint Called**: `GET /api/problems/active`

**Output Format**:
```
🔧 *Pelangi Maintenance Report*
📅 2026-01-29
⚠️ 2 Active Issue(s)

1. *Capsule C5*
   Problem: AC not cooling
   Reported: 2026-01-28

2. *Capsule C12*
   Problem: Light bulb broken
   Reported: 2026-01-29

---
Reply with capsule number when resolved
```

---

## Implementation: Python Script

**File Location**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts\moltbot-daily-report.py`

This is a production-ready Python script that:
1. Connects to MCP server at `http://localhost:3001/mcp`
2. Calls all relevant MCP tools
3. Formats the report according to specifications
4. Delivers via Telegram/WhatsApp/Email
5. Runs automatically at 9:00 AM Malaysia time
6. Includes error handling and retry logic

### Installation

Navigate to scripts directory:
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts
```

Install dependencies:
```bash
pip install -r moltbot-requirements.txt
```

**Requirements File**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts\moltbot-requirements.txt`

Contents:
```
requests>=2.31.0
schedule>=1.2.0
pytz>=2023.3
```

### Configuration

Edit the Python script (`C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts\moltbot-daily-report.py`) and set your credentials:

**For Telegram**:
```python
TELEGRAM_BOT_TOKEN = "your-bot-token-here"
TELEGRAM_CHAT_ID = "your-chat-id-here"
```

**For WhatsApp**:
```python
WHATSAPP_API_URL = "your-whatsapp-api-endpoint"
```

**For Email**:
```python
EMAIL_CONFIG = {
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "sender": "your-email@gmail.com",
    "password": "your-app-password",
    "recipient": "recipient@example.com"
}
```

### Running the Script

**Test run (manual)**:
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts
python moltbot-daily-report.py
```

**Run with scheduler (automatic)**:
The script includes a built-in scheduler that runs the report at 9:00 AM daily. Just start the script and leave it running:
```bash
python moltbot-daily-report.py
```

---

## Daily Report Generation Protocol

### Report Schedule
- **Time**: Every day at 09:00 AM Malaysia Time (GMT+8)
- **Frequency**: Daily (7 days a week)
- **Delivery Method**: Send to designated channel (Telegram/WhatsApp/Email)
- **Backup**: Save copy to text file in scripts directory

### Report Structure

#### Section 1: Occupancy Overview
Call `pelangi_get_occupancy` via MCP and format as:
```
📊 OCCUPANCY STATISTICS
═══════════════════════
Total Capsules: {total}
Occupied: {occupied} capsules
Available: {available} capsules
Occupancy Rate: {occupancyRate}%
```

#### Section 2: Capsule Status Breakdown
Call `pelangi_list_capsules` via MCP and organize by section:
```
🛏️ CAPSULE STATUS BY SECTION
═══════════════════════════

BACK SECTION ({count} capsules):
  Occupied: {list of occupied capsules}
  Available: {list of available capsules}

MIDDLE SECTION ({count} capsules):
  Occupied: {list of occupied capsules}
  Available: {list of available capsules}

FRONT SECTION ({count} capsules):
  Occupied: {list of occupied capsules}
  Available: {list of available capsules}
```

#### Section 3: Guest Information
Call `pelangi_list_guests` via MCP to get current guest count:
```
👥 GUEST INFORMATION
═══════════════════
Checked-in Guests: {count}
```

#### Section 4: Overdue Guests Alert
Call `pelangi_get_overdue_guests` via MCP:
```
⚠️ OVERDUE GUESTS
═══════════════════
{if count > 0}
  {count} guest(s) past expected checkout:
  - {Guest Name} (Capsule {number}) - Expected: {date}
  - ...

{if count == 0}
  ✅ No overdue guests
```

#### Section 5: Maintenance Issues
Call `pelangi_export_whatsapp_issues` via MCP:
```
🔧 MAINTENANCE STATUS
═══════════════════════
{if count > 0}
  ⚠️ {count} Active Issue(s):
  {paste WhatsApp formatted output}

{if count == 0}
  ✅ No active maintenance issues
```

#### Section 6: Report Footer
```
═══════════════════════════════════
📅 Report Generated: {timestamp}
🤖 Automated by Moltbot v1.0
```

---

## Complete Daily Report Example

```
🏨 PELANGI CAPSULE HOSTEL - DAILY OPERATIONS REPORT
═══════════════════════════════════════════════════

📊 OCCUPANCY STATISTICS
═══════════════════════
Total Capsules: 22
Occupied: 9 capsules
Available: 13 capsules
Occupancy Rate: 41%

🛏️ CAPSULE STATUS BY SECTION
═══════════════════════════

BACK SECTION (6 capsules):
  Occupied: C1, C4, C5, C6
  Available: C2, C3

MIDDLE SECTION (2 capsules):
  Occupied: C25, C26
  Available: None

FRONT SECTION (14 capsules):
  Occupied: C11, C12, C13
  Available: C14-C24 (11 capsules)

👥 GUEST INFORMATION
═══════════════════
Checked-in Guests: 9

⚠️ OVERDUE GUESTS
═══════════════════
✅ No overdue guests

🔧 MAINTENANCE STATUS
═══════════════════════
⚠️ 1 Active Issue(s):

*Capsule C15*
Problem: WiFi not working
Reported: 2026-01-28

═══════════════════════════════════
📅 Report Generated: 2026-01-29 09:00:00 GMT+8
🤖 Automated by Moltbot v1.0
```

---

## Error Handling Protocol

### Connection Errors
If MCP server connection fails:
1. Retry up to 3 times with 5-second intervals
2. If still failing, send alert via notification channel:
   ```
   🚨 MOLTBOT ALERT
   Failed to connect to PelangiManager MCP server.
   Please check if the server is running at http://localhost:3001
   Next retry: {next_scheduled_time}
   ```

### MCP Server Not Running
To start the MCP server:
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server
npm run dev
```

### API Endpoint Errors
If specific tools return "API endpoint not found":
1. Log the error with timestamp to console
2. Continue with other working tools
3. Include disclaimer in report:
   ```
   ⚠️ Note: Some data unavailable due to API issues
   Missing: {list of failed endpoints}
   ```

### Data Validation
Before sending report:
- Verify all numeric values are valid (not null/undefined)
- Check that dates are properly formatted
- Ensure section totals match overall totals
- Validate that capsule numbers are present

---

## Deployment Options

### Option 1: Windows Task Scheduler

**Recommended for Windows servers**

1. Open Task Scheduler
2. Create new task: "Moltbot Daily Report"
3. Trigger: Daily at 09:00 AM
4. Action: Start a program
   - Program: `C:\Python39\python.exe` (adjust to your Python path)
   - Arguments: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts\moltbot-daily-report.py`
   - Start in: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts`
5. Settings:
   - ✅ Run whether user is logged on or not
   - ✅ Run with highest privileges

### Option 2: Keep Script Running

Simply start the script and leave it running in the background:
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts
python moltbot-daily-report.py
```

The script includes a built-in scheduler that will keep running and execute the report at 9:00 AM daily.

### Option 3: n8n Workflow

If you have n8n installed:
1. Create new workflow: "Moltbot Daily Report"
2. Add Schedule Trigger: Cron `0 9 * * *` (9 AM daily)
3. Add HTTP Request nodes for each MCP tool:
   - URL: `http://localhost:3001/mcp`
   - Method: POST
   - Body: MCP JSON-RPC payload
4. Add Code node to format report
5. Add notification node (Telegram/WhatsApp/Email)

---

## Monitoring & Maintenance

### Daily Checklist
- ✅ Report delivered on time (09:00 AM)
- ✅ All data sections populated correctly
- ✅ No connection errors
- ✅ Numerical accuracy verified
- ✅ Backup file created in scripts directory

### Report Backup Files
Location: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts\`

Format: `pelangi_report_YYYYMMDD_HHMMSS.txt`

Example:
- `pelangi_report_20260129_090000.txt`
- `pelangi_report_20260130_090000.txt`

### Log Monitoring
The Python script outputs logs to console. Monitor for:
- ✅ MCP server health check success
- ✅ Report generation completed
- ✅ Delivery success messages
- ⚠️ Connection errors
- ⚠️ API endpoint errors
- ❌ Fatal errors

---

## Troubleshooting Guide

### Issue: MCP Server Not Responding

**Check if server is running:**
```bash
curl http://localhost:3001/health
```

**If not running, start it:**
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server
npm run dev
```

**Check server logs in terminal for errors**

### Issue: Report Not Generating

**Check Python script is running:**
```bash
# Windows Task Manager or PowerShell
Get-Process python
```

**Check script logs for errors**

**Test manual run:**
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts
python moltbot-daily-report.py
```

### Issue: Incomplete Data in Report

**Test each MCP tool individually:**
```bash
# Test occupancy
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":1}'

# Test capsules
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_list_capsules","arguments":{}},"id":2}'
```

**Verify API endpoints are responding**

### Issue: Wrong Timezone

**Verify timezone in Python script:**
```python
MALAYSIA_TZ = pytz.timezone('Asia/Kuala_Lumpur')
```

**Check current time:**
```bash
python -c "import pytz; from datetime import datetime; print(datetime.now(pytz.timezone('Asia/Kuala_Lumpur')))"
```

### Issue: Notification Not Received

**For Telegram:**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Verify `TELEGRAM_CHAT_ID` is correct
- Test bot manually at https://t.me/your_bot_name

**For WhatsApp:**
- Verify `WHATSAPP_API_URL` is accessible
- Check API credentials and authentication

**For Email:**
- Verify SMTP settings
- Check for 2FA/App Password requirements (Gmail)

---

## Success Metrics

Track these KPIs for Moltbot performance:
- **Delivery Success Rate**: Target 99%+
- **Report Latency**: Report sent within 5 minutes of 09:00 AM
- **Data Accuracy**: 100% match with live system
- **Error Rate**: Less than 1% monthly
- **MCP Server Uptime**: 99%+

---

## Quick Reference Commands

### Start MCP Server
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server
npm run dev
```

### Run Moltbot Script
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts
python moltbot-daily-report.py
```

### Install Python Dependencies
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts
pip install -r moltbot-requirements.txt
```

### Test MCP Server Health
```bash
curl http://localhost:3001/health
```

### Test Specific MCP Tool
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":1}'
```

### View Backup Reports
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts
dir pelangi_report_*.txt
```

---

## Additional Documentation

For more detailed setup instructions, see:
**File**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\scripts\MOLTBOT-SETUP.md`

For MCP server documentation, see:
**File**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\mcp-server\README.md`

For general PelangiManager documentation, see:
**File**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\CLAUDE.md`

---

## Contact & Support

- **Developer**: Jay (Pelangi Owner)
- **Project Root**: `C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur\`
- **System**: PelangiManager on Zeabur
- **MCP Server**: Local development at http://localhost:3001

---

**Version**: 1.1.0 (Updated with full file paths)
**Last Updated**: 2026-01-29
**Author**: Claude Code (AI Assistant)
