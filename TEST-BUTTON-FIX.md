# Test Button Fix — "UNDEFINED test error"

## Problem
When clicking "Test" button on AI providers, got error:
```
✗ UNDEFINED test error: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## Root Cause
The MCP server was running **stale code**. The backend changes adding `id` fields to AI providers weren't loaded.

**Evidence:**
```bash
$ curl http://localhost:3002/api/rainbow/status

# Response (BEFORE restart):
{
  "ai": {
    "providers": [
      {
        "name": "NVIDIA NIM (Kimi 2.5)",  // ❌ Missing "id" field!
        "type": "primary",
        ...
      }
    ]
  }
}
```

The frontend tries to access `provider.id` → `undefined` → API call becomes `/api/rainbow/test-ai/undefined` → 404 HTML page → JSON parse error.

## Solution

### Quick Fix: Restart the Server

**Option 1: Use the restart script**
```bash
cd mcp-server
.\restart-dev.bat
```

**Option 2: Manual restart**
```bash
cd mcp-server
npx kill-port 3002
npm run dev
```

### Why This Happened

The MCP server runs in one of two modes:

1. **Development mode** (`npm run dev`)
   - Uses `tsx` for hot reload
   - *Should* pick up TypeScript changes automatically
   - BUT sometimes needs a manual restart for route changes

2. **Production mode** (`npm start`)
   - Uses compiled JavaScript from `dist/`
   - Requires `npm run build` before starting
   - Doesn't auto-reload

If the server was started with `npm start` (production mode), it's running the **old compiled code** from `dist/` directory, which doesn't have our new changes.

## Verification Steps

After restarting:

**1. Check the status API returns `id` fields:**
```bash
curl http://localhost:3002/api/rainbow/status | grep -o '"id":"[^"]*"'
```

Expected output:
```
"id":"nvidia"
"id":"groq"
"id":"ollama"
```

**2. Visit the status page:**
```
http://localhost:3002/admin/rainbow/status
```

**3. Click a "Test" button**

Expected success message:
```
✓ NVIDIA: moonshotai/kimi-k2.5 responded in 1234ms
Reply: OK
```

Or expected failure (if API key missing):
```
✗ NVIDIA test failed: NVIDIA_API_KEY not set
```

## Additional Notes

**Why `providerId` was `undefined`:**

Frontend code:
```javascript
async function testAIProvider(providerId) {
  // providerId was undefined because onclick passed provider.id
  // but provider object from API didn't have .id property
  const result = await api(`/test-ai/${providerId}`, { method: 'POST' });
  //                                    ↑ undefined
}
```

HTML:
```html
<button onclick="testAIProvider('${provider.id}')">Test</button>
                                   ↑ provider.id was undefined
```

**Why the HTML error:**

When you visit `/api/rainbow/test-ai/undefined`, the server's router doesn't match it (since it expects a valid provider name), so Express falls through to the default handler, which likely serves an HTML 404 page. The frontend tries to `JSON.parse()` that HTML → error.

## Prevention

For future backend changes to the MCP server:

1. Always restart after editing route handlers
2. Use `npm run dev` for automatic TypeScript reloading
3. If using `npm start`, remember to `npm run build` first

---

**Status:** ✅ Fixed — just needs server restart
**Files:** No code changes needed, backend code was correct all along
