# Step-by-Step: What to Do on the Zeabur Website

Follow these steps on [Zeabur](https://dash.zeabur.com) so the Pelangi MCP server works with Pelangi Manager.

---

## 1. Open your project

1. Go to **https://dash.zeabur.com**
2. Log in if needed
3. Open the project that has **Pelangi Manager** (e.g. pelangi-hostel)
4. You should see at least two services: **Pelangi Manager** (main app) and **zeabur-pelangi-mcp** (MCP server)

---

## 2. Set variables on the MCP service

1. Click the **zeabur-pelangi-mcp** (or pelangi-mcp) service
2. Open the **Variable** tab (or **Environment** / **Env**)
3. Check or add these variables. **Edit** any that are wrong:

| Variable | Value | Notes |
|----------|--------|--------|
| `PELANGI_API_URL` | `https://pelangi-manager.zeabur.app` | No trailing slash. This is your Pelangi Manager app URL. |
| `PELANGI_MANAGER_HOST` | *(already set)* | e.g. `service-6948cacdaf84400647912aab`. Leave as-is if Zeabur set it. |
| `PELANGI_API_TOKEN` | *(your token)* | Admin token from Pelangi Manager (Settings or login API). |
| `MCP_SERVER_PORT` | `3001` | Leave as-is. |
| `NODE_ENV` | `production` | Leave as-is. |

4. If **PELANGI_API_URL** is still `https://pelangi.zeabur.app`, change it to **`https://pelangi-manager.zeabur.app`**
5. Click **Save** or **Confirm** if the page asks

---

## 3. Get the API token (if you don’t have it)

1. In another tab, open **https://pelangi-manager.zeabur.app**
2. Log in (e.g. admin / your password)
3. Go to **Settings** (gear icon)
4. Find **Security** or **API** / **Tokens**
5. Create or copy an **API token** (or use the token you already have in Zeabur)
6. Back in Zeabur → MCP service → **Variable** tab, set **PELANGI_API_TOKEN** to that value and save

---

## 4. Redeploy the MCP service

1. Stay on the **zeabur-pelangi-mcp** service page
2. Open the **Overview** or **Deployments** tab
3. Click **Redeploy** (or **Deploy** / **Restart**)
4. Wait until status is **Running** (green) and the build has finished

---

## 5. Check the MCP URL and test

1. In the MCP service, open the **Domains** or **Networking** tab
2. Note the public URL (e.g. **https://mcp-pelangi.zeabur.app**)
3. In a browser or terminal, open:  
   `https://YOUR-MCP-URL/health`  
   You should see something like: `{"status":"ok","service":"pelangi-mcp-server",...}`

---

## 6. Add MCP to Cursor (if you haven’t)

1. On your PC, open Cursor **Settings**
2. Go to **MCP** (or **Features** → **MCP**)
3. Ensure **pelangi-mcp** is listed with URL:  
   `https://YOUR-MCP-URL/mcp`  
   (e.g. `https://mcp-pelangi.zeabur.app/mcp`)
4. If you changed the MCP domain in Zeabur, update this URL in Cursor and restart Cursor

---

## Quick checklist

- [ ] Zeabur project open, MCP service selected
- [ ] **Variable** tab: `PELANGI_API_URL` = `https://pelangi-manager.zeabur.app`
- [ ] **Variable** tab: `PELANGI_API_TOKEN` = your token
- [ ] **Variable** tab: `PELANGI_MANAGER_HOST` present (if Zeabur added it)
- [ ] Saved variables, then **Redeploy**
- [ ] Status **Running**, then test `/health`
- [ ] Cursor MCP config uses `https://YOUR-MCP-URL/mcp`

After this, queries like “Who’s staying in my capsule hostel now?” in Cursor should use Pelangi Manager data.
