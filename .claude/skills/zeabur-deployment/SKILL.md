# Zeabur Deployment Skill

## When to Use This Skill
Use when deploying Node.js/TypeScript applications to Zeabur, troubleshooting deployment failures, managing environment variables, or investigating service status issues.

## Triggers
- "zeabur deployment failed"
- "service suspended"
- "502 bad gateway"
- "build failed on zeabur"
- "cannot find module" (runtime)
- "service in queue"
- "deploy to zeabur"
- "zeabur environment variables"

## Core Principles

### 1. **Check Forum When Platform Issues Suspected** 🚨
⚠️ **Check https://zeabur.com/forum only when you suspect Zeabur platform issues, not code issues**

**Check forum when:**
- ✅ Service shows RUNNING but returns 502 errors
- ✅ Intermittent failures (works sometimes, fails sometimes)
- ✅ Service suspended without clear build/code errors
- ✅ Multiple deployments failing with same mysterious error
- ✅ Sudden crashes after previously working fine

**DON'T check forum when:**
- ❌ Build error clearly shows missing dependency in YOUR code
- ❌ Syntax errors or TypeScript errors in YOUR code
- ❌ Runtime error with clear stack trace pointing to YOUR code
- ❌ Missing environment variables YOU need to set
- ❌ Database connection issues with wrong credentials

**Real Case (2026-02-09):** Service RUNNING + 502 errors → Forum revealed platform-wide outage affecting dozens of users

### 2. **Zeabur Overrides Your Config**
- `zbpack.json` `install_command` is IGNORED - Zeabur always uses `npm ci`
- This means your lockfile MUST have all platform-specific binaries
- Setting `{"build_type": "docker"}` doesn't prevent zbpack pre-processing

### 3. **Verify Before Assuming**
- Service status "RUNNING" ≠ actually working (can still 502)
- Environment variables may already be set - check endpoints before re-setting
- Build success ≠ runtime success (devDeps get pruned)

## Pre-Deployment Checklist

Before deploying or debugging:

- [ ] **Check forum:** https://zeabur.com/forum for platform issues
- [ ] **Verify lockfile:** `package-lock.json` has all platform binaries
- [ ] **Check optionalDependencies:** Platform-specific binaries added
- [ ] **Review build command:** Uses `--packages=external` correctly
- [ ] **Test locally:** `npm run build && npm start` works
- [ ] **Environment vars:** Know which ones are required

## Common Issues & Fixes

### Issue 1: `Cannot find module '@rollup/rollup-linux-x64-musl'` (Build)

**Symptom:** Build fails with missing platform-specific rollup binary

**Root Cause:**
- Zeabur uses Alpine Linux (node:22-alpine) Docker containers
- Your Windows lockfile doesn't include Linux musl binaries
- Zeabur runs `npm ci` which strictly follows lockfile
- `zbpack.json` `install_command` is IGNORED

**Fix:**
```json
// package.json
{
  "optionalDependencies": {
    "@rollup/rollup-linux-x64-musl": "^4.24.4"
  }
}
```

Then regenerate lockfile:
```bash
npm install
git add package.json package-lock.json
git commit -m "fix: add Linux musl rollup binary for Alpine"
git push
```

**Verification:** Check lockfile contains:
```json
"node_modules/@rollup/rollup-linux-x64-musl": {
  "version": "4.24.4",
  "resolved": "...",
  "optional": true,
  "os": ["linux"],
  "cpu": ["x64"]
}
```

### Issue 2: `Cannot find package '@vitejs/plugin-react'` (Runtime)

**Symptom:** Build succeeds, but service crashes at runtime with ERR_MODULE_NOT_FOUND

**Root Cause:**
- Your code imports `vite.config.ts` at top level
- esbuild with `--packages=external` bundles it as static ESM import
- `@vitejs/plugin-react` gets included in dist bundle
- Zeabur runs `npm prune --production` which removes devDeps
- Runtime fails because `@vitejs/plugin-react` is now missing

**Fix:** Use dynamic imports and `configFile` path:

```typescript
// server/vite.ts - BEFORE (Bad)
import { createServer as createViteServer } from "vite";
import viteConfig from "../vite.config";

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    // ...
  });
}

// server/vite.ts - AFTER (Good)
export async function setupVite(app: Express, server: Server) {
  // Dynamic imports - not bundled by esbuild
  const { createServer: createViteServer, createLogger } = await import("vite");
  const { nanoid } = await import("nanoid");

  const vite = await createViteServer({
    // Let Vite load config from disk at runtime
    configFile: path.resolve(__dirname, "..", "vite.config.ts"),
    customLogger: { /* ... */ },
    server: { middlewareMode: true, /* ... */ },
    appType: "custom",
  });
}
```

**Why this works:**
- Dynamic `await import()` is NOT bundled - stays as external call
- `configFile: path.resolve(...)` loads config from disk
- No devDeps needed in dist bundle
- Vite handles its own dependencies at runtime

### Issue 3: Service SUSPENDED

**Symptom:** Service shows "SUSPENDED" status or "paused to avoid charges"

**Possible Causes:**
1. **Billing issue** - Free tier limits exceeded
2. **Platform outage** - Check forum first!
3. **Previous build failures** - Service crashed and suspended

**Fix:**
```javascript
// Use Zeabur GraphQL API to redeploy
const mutation = `
mutation {
  redeployService(
    serviceID: "YOUR_SERVICE_ID",
    environmentID: "YOUR_ENV_ID"
  )
}
`;
```

### Issue 4: 502 Bad Gateway Despite RUNNING Status

**Symptom:** Service status shows "RUNNING" but returns 502 errors

**Possible Causes:**
1. **Platform infrastructure issue** - Check forum!
2. **Port mismatch** - App not listening on PORT env variable
3. **Startup crash** - App crashes before accepting requests
4. **Database connection failure** - App fails to connect to DB

**Diagnostic Steps:**
```bash
# 1. Check runtime logs
node scripts/get-runtime-logs.js

# 2. Verify health endpoint
curl https://your-service.zeabur.app/api/health

# 3. Check database connection
curl https://your-service.zeabur.app/api/capsules

# 4. If platform issue: intermittent success indicates infrastructure problem
# Try multiple times: 2/5 success = platform instability
```

### Issue 5: "Service in Queue"

**Symptom:** "Your service is in queue. This region is available for all users."

**Cause:** Free-tier Singapore region is shared - high demand causes queues

**Solutions:**
1. **Wait it out** - Free tier eventually processes
2. **Deploy to paid region** - Frankfurt is developer-tier only (no queue)
3. **Upgrade account** - Skip queue with paid plan

**Region Info:**
- Singapore (SG): Free tier available, can queue
- Frankfurt (EU): Developer tier only, no queue

## Zeabur API Reference

### Endpoint
```
https://api.zeabur.com/graphql
```

**NOT** `gateway.zeabur.com` (connection refused)

### Authentication
```javascript
headers: {
  'Authorization': 'Bearer ' + process.env.ZEABUR_TOKEN
}
```

Get token: Zeabur Dashboard → Settings → Tokens

### Common Queries

#### List Projects
```graphql
query {
  projects {
    edges {
      node {
        _id
        name
        region
      }
    }
  }
}
```

#### Service Status
```graphql
query {
  project(_id: "PROJECT_ID") {
    services {
      _id
      name
      status
      template
    }
  }
}
```

#### Redeploy Service
```graphql
mutation {
  redeployService(
    serviceID: "SERVICE_ID",
    environmentID: "ENV_ID"
  )
}
```

#### Build Logs
```graphql
query {
  buildLogs(deploymentID: "DEPLOYMENT_ID") {
    message
    timestamp
  }
}
```

#### Runtime Logs
```graphql
query {
  runtimeLogs(
    serviceID: "SERVICE_ID",
    deploymentID: "DEPLOYMENT_ID"
  ) {
    message
    timestamp
  }
}
```

#### Get Domains
```graphql
query {
  service(_id: "SERVICE_ID") {
    domains {
      domain
      isGenerated
    }
  }
}
```

#### Set Environment Variables
```graphql
mutation($data: Map!) {
  updateEnvironmentVariable(
    serviceID: "SERVICE_ID",
    environmentID: "ENV_ID",
    data: $data
  )
}
```

**Variables:**
```json
{
  "data": {
    "DATABASE_URL": "postgresql://...",
    "NODE_ENV": "production",
    "JWT_SECRET": "your-secret"
  }
}
```

## Diagnostic Workflow

### Step 1: Check Service Status
```bash
# Get service status via API
node -e "
const https = require('https');
const query = \`query {
  project(_id: \"PROJECT_ID\") {
    services { _id name status }
  }
}\`;

const options = {
  hostname: 'api.zeabur.com',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.env.ZEABUR_TOKEN
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(JSON.parse(body)));
});

req.write(JSON.stringify({ query }));
req.end();
"
```

### Step 3: Check Build Logs
If status is FAILED or SUSPENDED:
```bash
# Get latest deployment ID from dashboard
# Then fetch build logs
node scripts/fetch-zeabur-logs.js
```

Look for:
- Missing module errors → Add to dependencies or optionalDependencies
- Build command failures → Check build script
- Timeout errors → Increase build timeout or optimize build

### Step 4: Check Runtime Logs
If status is RUNNING but 502:
```bash
# Get runtime logs
node scripts/get-runtime-logs.js
```

Look for:
- Database connection errors → Check DATABASE_URL
- Port binding errors → Ensure app uses process.env.PORT
- Module not found → Check dynamic imports vs static imports
- Crash loops → Fix startup errors

### Step 5: Verify Endpoints
```bash
# Health check
curl https://your-service.zeabur.app/api/health

# Data endpoint
curl https://your-service.zeabur.app/api/capsules

# Try multiple times to detect intermittent issues
for i in {1..5}; do
  echo "Request $i:"
  curl -w "\nStatus: %{http_code}\n" https://your-service.zeabur.app/api/health
  sleep 2
done
```

**Interpretation:**
- 5/5 success → Working fine
- 0/5 success → App or database issue
- 2/5 success → Platform infrastructure issue (check forum!)

## Environment Variable Management

### Setting Variables via API

```javascript
// set-env-vars.js
const https = require('https');

const mutation = `
mutation($data: Map!) {
  updateEnvironmentVariable(
    serviceID: "SERVICE_ID",
    environmentID: "ENV_ID",
    data: $data
  )
}
`;

const variables = {
  data: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: 'production',
    JWT_SECRET: 'your-secret'
  }
};

const data = JSON.stringify({ query: mutation, variables });

const options = {
  hostname: 'api.zeabur.com',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.env.ZEABUR_TOKEN
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Result:', body);
    console.log('\n✅ Environment variables updated');
    console.log('⚠️  Redeploy service to apply changes');
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(data);
req.end();
```

### After Setting Variables: Redeploy!
```bash
# Environment changes require redeployment
node -e "/* redeploy mutation */"
```

### Verify Variables Are Working
```bash
# Don't assume - verify the app actually works
curl https://your-service.zeabur.app/api/health

# Check database connection specifically
curl https://your-service.zeabur.app/api/capsules | jq
```

## Build Configuration

### zbpack.json
```json
{
  "build_command": "npm run build",
  "start_command": "npm start",
  "install_command": "npm install"
}
```

**Note:** `install_command` is IGNORED - Zeabur always uses `npm ci`

### package.json Scripts
```json
{
  "scripts": {
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "node dist/index.js"
  }
}
```

**Critical flags:**
- `--packages=external` - Don't bundle node_modules
- `--platform=node` - Target Node.js environment
- `--format=esm` - Use ES modules
- `--bundle` - Create single file output

### Dockerfile (Optional)
Zeabur pre-processes Dockerfile even with `build_type: "docker"`:
```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
```

## Project IDs Reference (PelangiManager)

### Singapore Project
- Project ID: `6948c99fced85978abb44563`
- Environment ID: `6948c99f4947dd57c4fd2583`
- Service ID: `6948cacdaf84400647912aab`
- Domain: `pelangi-manager.zeabur.app`
- Region: Singapore (ap-east-1)
- Tier: Free (can queue)

### Frankfurt Project
- Project ID: `6988ba46ea91e8e06ef1420c`
- Environment ID: `6988ba462579f38ed02c6579`
- Service ID: `6988bab6ea91e8e06ef14232`
- Domain: `pelangi-manager-2.zeabur.app`
- Region: Frankfurt (eu-central-1)
- Tier: Developer (no queue)

## Verification Steps

### After Deployment
1. **Check service status**
   ```bash
   # Via API
   node scripts/check-service-status.js
   ```

2. **Verify health endpoint**
   ```bash
   curl https://your-service.zeabur.app/api/health
   ```

3. **Test database connection**
   ```bash
   curl https://your-service.zeabur.app/api/capsules
   ```

4. **Compare with working service** (if multi-region)
   ```bash
   # SG service
   curl https://pelangi-manager.zeabur.app/api/capsules | jq '.[0]'

   # Frankfurt service
   curl https://pelangi-manager-2.zeabur.app/api/capsules | jq '.[0]'

   # Should return identical data if sharing same DB
   ```

5. **Check for intermittent issues**
   ```bash
   # Run multiple requests
   for i in {1..10}; do
     curl -s -w "Status: %{http_code}\n" https://your-service.zeabur.app/api/health
   done
   ```

### Red Flags
- Status: RUNNING but 502 → Check platform or logs
- 2/5 requests succeed → Platform infrastructure issue
- Health 200 but data endpoints 500 → Database connection issue
- Different data between regions → Wrong DATABASE_URL

## Real Case Studies

### Case 1: Service Suspended (2026-02-09)
**Symptom:** Service suspended since Feb 9, all deployments FAILED

**Investigation:**
1. Checked build logs → Found `@rollup/rollup-linux-x64-musl` missing
2. Root cause: Zeabur ignores `install_command`, uses `npm ci` strictly
3. Windows lockfile didn't have Alpine Linux rollup binary

**Fix:**
```json
// package.json
"optionalDependencies": {
  "@rollup/rollup-linux-x64-musl": "^4.24.4"
}
```

**Result:** Build succeeded, service deployed

### Case 2: Runtime ERR_MODULE_NOT_FOUND (2026-02-09)
**Symptom:** Build succeeded but service crashed at runtime

**Investigation:**
1. Checked runtime logs → `Cannot find package '@vitejs/plugin-react'`
2. Root cause: `server/vite.ts` imported `vite.config.ts` at top level
3. esbuild bundled devDeps into dist, then `npm prune --production` removed them

**Fix:** Changed to dynamic imports and `configFile: path.resolve(...)`

**Result:** Bundle size reduced, no devDeps needed, service stable

### Case 3: Platform-Wide Outage (2026-02-09)
**Symptom:** Multiple services showing 502 despite RUNNING status

**Investigation:**
1. Checked https://zeabur.com/forum
2. Found dozens of similar reports across FREE and DEVELOPER tiers
3. Zeabur acknowledged infrastructure issues

**Fix:** None - waited for platform resolution

**Lesson:** ALWAYS check forum first before deep debugging!

### Case 4: DATABASE_URL Confusion (2026-02-09)
**Symptom:** Frankfurt service returning 500 "password authentication failed"

**Investigation:**
1. Tried DATABASE_URL from `.env` → Failed
2. Tried DATABASE_URL from `.env.zeabur` → Failed
3. SG service working fine with database

**Resolution:**
1. User confirmed correct DATABASE_URL (same as used locally)
2. Set via API, redeployed
3. Verified: both services now returning identical data

**Lesson:** Don't assume env files have current credentials - verify endpoints work after setting!

## Quick Commands Reference

```bash
# Check forum (ALWAYS FIRST)
# Browser: https://zeabur.com/forum

# Check service status
node scripts/check-service-config.ps1

# Get build logs
node scripts/fetch-zeabur-logs.js

# Get runtime logs
node scripts/get-runtime-logs.js

# Set environment variables
node scripts/setup-mcp-zeabur.js

# Redeploy service
# (via GraphQL mutation)

# Test deployment
curl https://your-service.zeabur.app/api/health
curl https://your-service.zeabur.app/api/capsules

# Kill local dev servers
npx kill-port 5000 && npx kill-port 3000

# Build and test locally
npm run build && npm start
```

## Prevention Tips

1. **Always include platform binaries**
   - Add to `optionalDependencies` for cross-platform builds
   - Regenerate lockfile after adding

2. **Use dynamic imports in server code**
   - Avoid top-level imports of dev-only dependencies
   - Use `await import()` for runtime-only imports
   - Use `configFile: path.resolve()` instead of importing configs

3. **Test builds locally**
   ```bash
   npm run build
   npm start
   # Verify it works before deploying
   ```

4. **Monitor platform status**
   - Bookmark https://zeabur.com/forum
   - Check before assuming your code is broken

5. **Verify after changes**
   - Don't assume env vars worked - test endpoints
   - Check multiple times for intermittent issues
   - Compare behavior across regions

6. **Keep multiple regions**
   - Deploy to both SG (free) and Frankfurt (paid)
   - Frankfurt has no queue, better for critical deployments
   - Use SG as backup/testing

## Related Skills
- `database-troubleshooting`: Database connection and schema issues
- `neon-database`: Neon-specific database management

## Troubleshooting Decision Tree

```
Issue Reported
    ↓
1. Check service status (API)
    ↓
FAILED/SUSPENDED → Check build logs
    ↓
    ├─ Clear code error (missing dep, syntax) → Fix code → Redeploy
    └─ Mysterious/no clear error → Check forum for platform issues
    ↓
RUNNING + 502 → Check runtime logs
    ↓
    ├─ Module not found → Check dynamic imports → Fix → Redeploy
    ├─ Database error → Check DATABASE_URL → Fix → Redeploy
    ├─ Port error → Verify PORT env usage → Fix → Redeploy
    ├─ Clear stack trace error → Fix code → Redeploy
    └─ No errors OR Intermittent (2/5 success) → Check forum (platform issue)
    ↓
RUNNING + 200 → Verify endpoints work
    ↓
    ├─ All working → Success! 🎉
    └─ Intermittent failures → Check forum (platform issue)
```

---

**Last Updated:** 2026-02-09
**Tested With:** Node.js 22, Alpine Linux, Vite 5, esbuild 0.25, Zeabur platform
**Real Project:** PelangiManager-Zeabur (dual-region deployment)
