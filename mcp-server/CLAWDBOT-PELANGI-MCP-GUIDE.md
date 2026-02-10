# Comprehensive Guide: How the "Current Guests" Report Was Obtained — For Clawdbot (Skill / MCP Client)

This document explains **exactly** how the "Who's staying in my capsule hostel now?" report was produced, so another agent (e.g. clawdbot) can replicate it by building a **skill** or **MCP client** for Pelangi Manager.

---

## 1. Executive Summary: How We Got the Report

1. **Client** (Cursor / clawdbot) sends a **single HTTP POST** to the Pelangi MCP server.
2. **MCP server** receives a JSON-RPC 2.0 request: `method: "tools/call"`, tool name `pelangi_list_guests`, arguments `{ page: 1, limit: 50 }`.
3. **MCP server** calls the **Pelangi Manager API** (backend): `GET https://pelangi-manager.zeabur.app/api/guests/checked-in?page=1&limit=50` with a Bearer token.
4. **Pelangi Manager API** returns JSON: `{ data: [ {...guest...}, ... ], pagination: { page, limit, total, totalPages, hasMore } }`.
5. **MCP server** returns that JSON inside a JSON-RPC result: `result.content[0].text` = stringified guest list.
6. **Client** parses the JSON and formats it (e.g. as a table) for the user.

**No browser, no UI.** Everything is HTTP + JSON. A skill or MCP client only needs to POST to the MCP endpoint with the right JSON body.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLIENT (Cursor, clawdbot, any MCP client)                                   │
│  - Sends: POST https://mcp-pelangi.zeabur.app/mcp                            │
│  - Body: JSON-RPC 2.0 { method, params, id }                                 │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PELANGI MCP SERVER (zeabur-pelangi-mcp)                                     │
│  - URL: https://mcp-pelangi.zeabur.app                                       │
│  - Endpoint: POST /mcp                                                       │
│  - Protocol: MCP over HTTP, JSON-RPC 2.0                                    │
│  - On tools/call: forwards to Pelangi Manager API with PELANGI_API_TOKEN     │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PELANGI MANAGER API (main app backend)                                      │
│  - URL: https://pelangi-manager.zeabur.app                                  │
│  - Auth: Bearer token (PELANGI_API_TOKEN)                                   │
│  - Endpoints: /api/guests/checked-in, /api/occupancy, /api/capsules, etc.    │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **MCP server** is a thin HTTP layer: it exposes **tools** (e.g. `pelangi_list_guests`) and, when a tool is called, performs the corresponding HTTP request to the Pelangi Manager API and returns the result.
- **Pelangi Manager** is the source of truth (database); the MCP server does **not** store data—it only proxies to the API.

---

## 3. MCP Server Details

| Item | Value |
|------|--------|
| **Base URL** | `https://mcp-pelangi.zeabur.app` |
| **MCP endpoint** | `POST https://mcp-pelangi.zeabur.app/mcp` |
| **Health check** | `GET https://mcp-pelangi.zeabur.app/health` |
| **Transport** | HTTP (no SSE/WebSocket for this server) |
| **Protocol** | MCP (Model Context Protocol), JSON-RPC 2.0 |
| **Protocol version** | 2024-11-05 |
| **Content-Type** | `application/json` |
| **Authentication** | None for the MCP endpoint (token is used server-side to call Pelangi API) |

**Health response example:**
```json
{
  "status": "ok",
  "service": "pelangi-mcp-server",
  "version": "1.0.0",
  "timestamp": "2026-01-29T06:17:12.875Z"
}
```

---

## 4. JSON-RPC 2.0: Methods and Request/Response Format

All requests are **POST** to `/mcp` with body:

```json
{
  "jsonrpc": "2.0",
  "method": "<method>",
  "params": { ... },
  "id": 1
}
```

Responses:

```json
{
  "jsonrpc": "2.0",
  "result": { ... },
  "id": 1
}
```

Or on error:

```json
{
  "jsonrpc": "2.0",
  "error": { "code": -32601, "message": "Method not found: ..." },
  "id": 1
}
```

### 4.1 Initialize (optional, for capability handshake)

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 0,
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": { "name": "clawdbot", "version": "1.0.0" }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "pelangi-manager", "version": "1.0.0" }
  },
  "id": 0
}
```

### 4.2 List tools

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

**Response:**  
`result.tools` is an array of `{ name, description, inputSchema }` for all 19 tools (see Section 6).

### 4.3 Call a tool (how we got the guest list)

**Request (current guests):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "pelangi_list_guests",
    "arguments": { "page": 1, "limit": 50 }
  },
  "id": 1
}
```

**Response (success):**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"data\": [\n    { \"id\": \"...\", \"name\": \"Khoo\", \"capsuleNumber\": \"C14\", ... },\n    ...\n  ],\n  \"pagination\": { \"page\": 1, \"limit\": 50, \"total\": 14, \"totalPages\": 1, \"hasMore\": false }\n}"
      }
    ]
  },
  "id": 1
}
```

- The **actual guest list** is in `result.content[0].text` as a **string**. Parse it as JSON to get `{ data, pagination }`.
- Each element in `data` is a guest object (see Section 5).

**Response (tool error, e.g. API down):**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{ "type": "text", "text": "Error listing guests: API Error: Not Found" }],
    "isError": true
  },
  "id": 1
}
```

---

## 5. Guest List Data Shape (from `pelangi_list_guests`)

After parsing `result.content[0].text` you get:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Guest Name",
      "capsuleNumber": "C14",
      "checkinTime": "2025-08-17T00:00:00.000Z",
      "checkoutTime": null,
      "expectedCheckoutDate": "2026-02-21",
      "isCheckedIn": true,
      "paymentAmount": "400.00",
      "paymentMethod": "cash",
      "paymentCollector": "admin",
      "isPaid": false,
      "notes": "Outstanding balance: RM300.00",
      "gender": "male",
      "nationality": "",
      "phoneNumber": "",
      "email": "",
      "idNumber": "",
      "status": "vip"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 14,
    "totalPages": 1,
    "hasMore": false
  }
}
```

Use `data` for the list of current guests; use `pagination` for paging (e.g. `page`, `limit`, `total`).

---

## 6. All 19 MCP Tools (for skill / client mapping)

Clawdbot can map natural language to these tool names and arguments.

### Guest management (6)

| Tool name | Description | Arguments |
|-----------|-------------|-----------|
| `pelangi_list_guests` | List all checked-in guests with pagination | `page` (number, default 1), `limit` (number, default 50) |
| `pelangi_get_guest` | Get guest details by ID number (IC/Passport) | `guestId` (string, required) |
| `pelangi_search_guests` | Search by name, capsule, or nationality | `query` (string, required), `field` (optional: name, capsule, nationality) |
| `pelangi_checkin_guest` | Check in a new guest (full workflow) | name, idNumber, nationality, phoneNumber, expectedCheckoutDate, paymentAmount, paymentMethod (required); email, capsuleNumber (optional) |
| `pelangi_checkout_guest` | Check out guest by ID number | `idNumber` (string, required) |
| `pelangi_bulk_checkout` | Bulk checkout (overdue / today / all) | `type` (string, required: "overdue" \| "today" \| "all") |

### Capsule operations (7)

| Tool name | Description | Arguments |
|-----------|-------------|-----------|
| `pelangi_list_capsules` | List all capsules with status | (none) |
| `pelangi_get_occupancy` | Current occupancy statistics | (none) |
| `pelangi_check_availability` | Available capsules for assignment | (none) |
| `pelangi_capsule_utilization` | Utilization analytics and reports | (none) |
| `pelangi_mark_cleaned` | Mark one capsule as cleaned | `capsuleNumber` (number, required) |
| `pelangi_bulk_mark_cleaned` | Mark all capsules as cleaned | (none) |
| `pelangi_get_dashboard` | Dashboard data (occupancy, guests, tokens, notifications) | (none) |

### Problem tracking (3)

| Tool name | Description | Arguments |
|-----------|-------------|-----------|
| `pelangi_list_problems` | List active maintenance problems | `activeOnly` (boolean, optional, default true) |
| `pelangi_get_problem_summary` | Problem summary and statistics | (none) |
| `pelangi_export_whatsapp_issues` | Export issues in WhatsApp-friendly format | (none) |

### Analytics & reporting (3)

| Tool name | Description | Arguments |
|-----------|-------------|-----------|
| `pelangi_get_overdue_guests` | Guests past expected checkout date | (none) |
| `pelangi_guest_statistics` | Guest statistics, nationality breakdown | (none) |
| `pelangi_export_guests_csv` | Export guest data as CSV | `checkedIn` (boolean, optional, default false) |

---

## 7. Pelangi Manager API (backend the MCP server calls)

If clawdbot builds a **direct API client** instead of (or in addition to) an MCP client, these are the endpoints the MCP server uses. All require **Bearer token** in `Authorization` header unless noted.

| MCP tool | Pelangi Manager API call |
|----------|---------------------------|
| `pelangi_list_guests` | `GET /api/guests/checked-in?page=1&limit=50` |
| `pelangi_get_guest` | `GET /api/guests/profiles/:guestId` |
| `pelangi_search_guests` | Uses `GET /api/guests/history` then client-side filter |
| `pelangi_get_occupancy` | `GET /api/occupancy` |
| `pelangi_list_capsules` | `GET /api/capsules` |
| `pelangi_check_availability` | `GET /api/capsules/available` |
| `pelangi_get_dashboard` | `GET /api/dashboard` (or multiple endpoints) |
| `pelangi_get_overdue_guests` | Uses checked-in + filter by expected checkout |
| `pelangi_list_problems` | `GET /api/problems/active` |
| Check-in / checkout / mark cleaned | Corresponding `POST` endpoints under `/api/guests`, `/api/capsules` |

- **Base URL:** `https://pelangi-manager.zeabur.app`
- **Auth:** `Authorization: Bearer <PELANGI_API_TOKEN>`
- Token is obtained from Pelangi Manager (Settings or `POST /api/auth/login`); the MCP server stores it as `PELANGI_API_TOKEN` and sends it on every API request.

---

## 8. Step-by-Step: Reproducing the "Current Guests" Report

Use this flow to implement a skill or MCP client that answers "Who's staying in my capsule hostel now?".

### Step 1: Ensure MCP server is reachable

```http
GET https://mcp-pelangi.zeabur.app/health
```

Expect: `200` and body `{"status":"ok","service":"pelangi-mcp-server",...}`.

### Step 2: Call the tool via JSON-RPC

```http
POST https://mcp-pelangi.zeabur.app/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "pelangi_list_guests",
    "arguments": { "page": 1, "limit": 50 }
  },
  "id": 1
}
```

### Step 3: Parse the response

- Read `result.content[0].text` (string).
- If `result.isError === true`, treat as error message.
- Otherwise parse `result.content[0].text` as JSON → `{ data, pagination }`.

### Step 4: Format for the user

- Use `data` array: e.g. table with columns Capsule, Guest, Nationality, Expected checkout, Payment/notes.
- Use `pagination.total` for "14 guests" or "14/30 capsules occupied" style summary.

**Example (pseudocode for clawdbot):**

```text
1. POST to https://mcp-pelangi.zeabur.app/mcp with body:
   { "jsonrpc":"2.0", "method":"tools/call", "params":{ "name":"pelangi_list_guests", "arguments":{ "page":1, "limit":50 } }, "id":1 }
2. Parse response.result.content[0].text as JSON → data, pagination
3. If response.result.isError, show error; else build table from data and show summary from pagination.total
```

---

## 9. Configuration (for reference)

- **MCP server (Zeabur):**  
  `PELANGI_API_URL=https://pelangi-manager.zeabur.app`, `PELANGI_API_TOKEN=<token>`, `MCP_SERVER_PORT=3001`, `NODE_ENV=production`. Optional: `PELANGI_MANAGER_HOST` for internal service-to-service URL.
- **Cursor MCP client:**  
  In Settings → MCP, add server `pelangi-mcp` with URL `https://mcp-pelangi.zeabur.app/mcp` (transport: HTTP).
- **Clawdbot:**  
  Store MCP base URL `https://mcp-pelangi.zeabur.app` and endpoint `/mcp`; no auth needed for MCP. Pelangi API token is only used by the MCP server.

---

## 10. Summary for Clawdbot: Creating a Skill or MCP Client

1. **Skill/MCP client** should send **POST** to `https://mcp-pelangi.zeabur.app/mcp` with JSON-RPC body.
2. For "current guests" (or similar list): use `method: "tools/call"`, `params.name: "pelangi_list_guests"`, `params.arguments: { page, limit }`.
3. Parse `result.content[0].text` as JSON; use `data` and `pagination` to build the report.
4. For other questions (occupancy, overdue, check-in, etc.), use the appropriate tool name and arguments from Section 6; same POST endpoint, only `params` change.
5. Optional: call `tools/list` once to get all 19 tools and their schemas for dynamic mapping.
6. No authentication is required on the MCP endpoint; the MCP server uses the Pelangi API token server-side.

This document is the single source of truth for how the "current guests" report was obtained and how to replicate it in a clawdbot skill or MCP client.
