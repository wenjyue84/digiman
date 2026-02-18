# AWS Lightsail Node.js Deployment Skill

## When to Use This Skill

Use when deploying Node.js/TypeScript applications to AWS Lightsail, troubleshooting OOM crashes on nano instances, packaging build artifacts for upload, or managing PM2 on a Lightsail server.

## Triggers

- "deploy to lightsail"
- "lightsail OOM" / "out of memory"
- "npm install killed on server"
- "upload build to lightsail"
- "lightsail setup"
- "pm2 on lightsail"
- "ssh into lightsail"
- "lightsail node.js"
- "package for lightsail"

---

## Core Principles — Never Violate These

### 1. NEVER run `npm install` on Lightsail nano (512MB RAM)

Lightsail `nano_3_0` has 512MB RAM — **not** 1GB as AWS advertises in some docs. Node.js heap alone needs ~1.5GB to install a full dependency tree. The process will be OOM-killed before completing.

**Wrong:**
```bash
ssh ubuntu@<IP> 'cd /var/www/pelangi && npm install'   # WILL BE KILLED
```

**Right:** Build locally, upload pre-built artifacts, then `npm install --omit=dev` (skips Playwright/Chromium/TypeScript/Vite/esbuild).

### 2. Build locally, upload artifacts only

Only upload:
- `dist/` — compiled output
- `package.json` + `package-lock.json` — for prod-only install
- `.env` — environment variables
- Static data files (KB files, public assets)

Do NOT upload:
- `node_modules/` (500MB+)
- Source code (`src/`, `client/`, `server/` TypeScript)
- `*.map` source map files

### 3. Add 2GB swap BEFORE any Node.js work on the server

Even `npm install --omit=dev` can OOM without swap. Add swap as the very first step on a fresh instance.

### 4. Use `--omit=dev` to skip heavy devDependencies

Without `--omit=dev`: ~1.5GB install (includes Playwright = 300MB Chromium, TypeScript, Vite, esbuild)
With `--omit=dev`: ~200MB install

### 5. Cap Node.js heap on the server

```bash
NODE_OPTIONS='--max-old-space-size=400' npm install --omit=dev
```

This prevents Node.js from over-allocating and triggering OOM before swap can compensate.

### 6. Use esbuild for TypeScript modules, not `tsc`

`tsc` enforces `rootDir`, `strict`, and other project constraints that can fail for monorepos. `esbuild` bypasses these and produces a single bundle in milliseconds.

---

## Instance Reference

| Spec | Value |
|------|-------|
| Instance name | `pelangi-production-v2` |
| Instance type | `micro_3_0` |
| RAM | **1GB** (914MB usable) |
| Disk | **40GB SSD** |
| Static IP | `18.142.14.142` (`pelangi-static-ip`) |
| OS | Ubuntu 22.04 LTS |
| Default user | `ubuntu` |
| Region | `ap-southeast-1` (Singapore) |
| SSH key | `~/.ssh/LightsailDefaultKeyPair.pem` |
| Monthly cost | **$7/mo** (dual-stack) |

---

## First-Time Server Setup

Run this on a **fresh** Lightsail instance before any deployment.

```bash
# 1. Add 2GB swap FIRST — do this before anything else
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo sysctl -p

# Verify swap active
free -h   # Should show ~2G under Swap

# 2. Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql-client nginx git

# Verify node version
node --version   # Should print v20.x.x

# 3. Install PM2 globally
sudo npm install -g pm2

# 4. Configure PM2 to start on boot
pm2 startup systemd -u ubuntu --hp /home/ubuntu | sudo bash

# 5. Create app directory
sudo mkdir -p /var/www/pelangi
sudo chown ubuntu:ubuntu /var/www/pelangi
```

---

## SSH Access

### Get SSH Key via AWS CLI (one-time setup)

No need to download from the AWS console — get it directly:

```bash
aws lightsail download-default-key-pair \
  --region ap-southeast-1 \
  --query "privateKeyBase64" \
  --output text > ~/.ssh/LightsailDefaultKeyPair.pem

chmod 400 ~/.ssh/LightsailDefaultKeyPair.pem
```

### Connect to Instance

```bash
ssh -i ~/.ssh/LightsailDefaultKeyPair.pem ubuntu@<INSTANCE_IP>
```

### Get Instance IP

```bash
aws lightsail get-instances --region ap-southeast-1 \
  --query "instances[*].{Name:name,IP:publicIpAddress,State:state.name}" \
  --output table
```

---

## Standard Deployment Workflow (PelangiManager)

### Step 1 — Build Locally (on dev PC with 16GB RAM)

```bash
# Root module (Express backend)
cd /c/Users/Jyue/Desktop/Projects/PelangiManager-Zeabur
npm run build
# Produces: dist/server/index.js + dist/public/

# RainbowAI module (use esbuild — tsc has rootDir errors in this monorepo)
cd RainbowAI
npx esbuild src/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/index.js

# Copy required static data into RainbowAI dist/
node -e "
  const fs = require('fs');
  fs.cpSync('src/assistant/data', 'dist/assistant/data', { recursive: true });
  fs.cpSync('src/public', 'dist/public', { recursive: true });
"

cd ..
```

### Step 2 — Package Artifacts (5-10MB, not 500MB)

```bash
tar \
  --exclude="dist/public/assets/*.map" \
  --exclude="RainbowAI/dist/*.map" \
  -czf /tmp/pelangi-deploy.tar.gz \
  dist/ \
  RainbowAI/dist/ \
  RainbowAI/package.json \
  RainbowAI/package-lock.json \
  RainbowAI/.rainbow-kb/ \
  shared/ \
  package.json \
  package-lock.json \
  ecosystem.config.cjs

# Verify archive size — should be under 50MB
ls -lh /tmp/pelangi-deploy.tar.gz
```

### Step 3 — Upload (seconds, not minutes)

```bash
scp -i ~/.ssh/LightsailDefaultKeyPair.pem \
  /tmp/pelangi-deploy.tar.gz \
  ubuntu@<INSTANCE_IP>:/tmp/
```

### Step 4 — Upload .env Separately

```bash
scp -i ~/.ssh/LightsailDefaultKeyPair.pem \
  .env \
  ubuntu@<INSTANCE_IP>:/var/www/pelangi/.env
```

### Step 5 — Extract and Install Prod Dependencies on Server

```bash
ssh -i ~/.ssh/LightsailDefaultKeyPair.pem ubuntu@<INSTANCE_IP> 'bash -s' << 'EOF'
set -e   # Stop on first error

cd /var/www/pelangi

# Extract artifacts
tar -xzf /tmp/pelangi-deploy.tar.gz

# Install root module prod deps only (~200MB, skips Playwright/TS/Vite)
NODE_OPTIONS='--max-old-space-size=400' npm install --omit=dev

# Install RainbowAI prod deps only
cd RainbowAI
NODE_OPTIONS='--max-old-space-size=400' npm install --omit=dev
cd ..

echo "Install complete. Starting PM2..."

# Start or reload PM2
pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
pm2 save

echo "Deployment complete."
EOF
```

### Step 6 — Verify

```bash
# Check PM2 processes are running
ssh -i ~/.ssh/LightsailDefaultKeyPair.pem ubuntu@<INSTANCE_IP> 'pm2 list'

# Check API health
curl http://<INSTANCE_IP>:5000/api/health

# Check logs for errors
ssh -i ~/.ssh/LightsailDefaultKeyPair.pem ubuntu@<INSTANCE_IP> 'pm2 logs --lines 50'
```

---

## PelangiManager Configuration

### PM2 Ecosystem File (`ecosystem.config.cjs`)

```javascript
module.exports = {
  apps: [
    {
      name: 'pelangi-api',
      script: 'dist/server/index.js',        // Root Express backend
      cwd: '/var/www/pelangi',
      env: { NODE_ENV: 'production', PORT: 5000 },
      node_args: '--max-old-space-size=400',
      max_memory_restart: '400M',
    },
    {
      name: 'rainbow-ai',
      script: 'dist/index.js',               // RainbowAI MCP server
      cwd: '/var/www/pelangi/RainbowAI',
      env: { NODE_ENV: 'production', PORT: 3002 },
      node_args: '--max-old-space-size=400',
      max_memory_restart: '300M',
    },
  ],
};
```

### Port Map

| Port | Service | Process |
|------|---------|---------|
| 80 | nginx (reverse proxy) | systemd |
| 3000 | Vite static frontend OR nginx-served static | PM2 or nginx |
| 5000 | Express API backend | PM2 `pelangi-api` |
| 3002 | Rainbow AI MCP server | PM2 `rainbow-ai` |

### nginx Config (Lightsail)

```nginx
server {
    listen 80;
    server_name _;

    # Serve static frontend
    location / {
        root /var/www/pelangi/dist/public;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to Express
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy Rainbow AI admin
    location /api/rainbow/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Apply config:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## esbuild Reference

### Why esbuild Over tsc for Monorepos

`tsc` enforces `rootDir` which breaks when `src/` imports from `../shared/` (outside rootDir). `esbuild` bypasses compiler checks entirely.

### RainbowAI Build Command

```bash
cd RainbowAI
npx esbuild src/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/index.js
```

Flag meanings:
- `--platform=node` — Target Node.js (not browser)
- `--packages=external` — Do NOT bundle node_modules (they'll be installed on server)
- `--bundle` — Traverse all local imports into one file
- `--format=esm` — Output ES module format (required for `"type": "module"` packages)
- `--outfile=dist/index.js` — Single output file

### Root Module Build (via package.json script)

```bash
npm run build
# Runs: vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server
```

---

## Recovery Procedures

### OOM Kill During Install

**Symptom:** SSH session hangs, then `npm install` exits with code 137 (killed)

```bash
# Check if OOM happened
dmesg | grep -i "out of memory" | tail -5

# Check current swap
free -h

# Add swap if missing (do this NOW before retrying)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Retry with memory cap
NODE_OPTIONS='--max-old-space-size=400' npm install --omit=dev
```

### PM2 Process Crashed

```bash
# See what crashed and why
pm2 list
pm2 logs pelangi-api --lines 100
pm2 logs rainbow-ai --lines 100

# Restart specific process
pm2 restart pelangi-api
pm2 restart rainbow-ai

# Restart all
pm2 restart all
```

### Server Disk Full

Likely cause: old tar uploads or PM2 log rotation.

```bash
# Check disk usage
df -h
du -sh /tmp/* /var/log/pm2/* /var/www/pelangi/node_modules/

# Clean up
rm -f /tmp/pelangi-deploy*.tar.gz
pm2 flush   # Clear PM2 logs
```

### Corrupt node_modules After Failed Install

```bash
# On server — wipe and reinstall
cd /var/www/pelangi
rm -rf node_modules
NODE_OPTIONS='--max-old-space-size=400' npm install --omit=dev

cd RainbowAI
rm -rf node_modules
NODE_OPTIONS='--max-old-space-size=400' npm install --omit=dev
```

### nginx 502 (App Not Running)

```bash
# Check if Express is listening on 5000
ss -tlnp | grep 5000

# Check PM2 status
pm2 list

# If pelangi-api is stopped/errored:
pm2 start ecosystem.config.cjs

# Check nginx logs
sudo tail -50 /var/log/nginx/error.log
```

### PM2 Not Starting on Reboot

```bash
# Re-run startup hook
pm2 startup systemd -u ubuntu --hp /home/ubuntu | sudo bash

# Save current process list
pm2 save

# Verify saved list
cat ~/.pm2/dump.pm2 | python3 -m json.tool | grep name
```

---

## Gotchas and Lessons Learned

| Gotcha | Detail |
|--------|--------|
| `nano_3_0` RAM | AWS advertises 1GB in some docs — actual is **512MB**. |
| `npm install` on server | Will OOM-kill on nano. Use `--omit=dev --ignore-scripts` on micro. |
| Playwright in devDeps | Pulls 300MB Chromium. `--omit=dev` skips it entirely. |
| `tsc` in monorepos | Fails with rootDir errors. Use esbuild instead. |
| Swap persistence | `swapon` alone doesn't survive reboot. Add to `/etc/fstab`. |
| `vm.swappiness` | Default 60 is aggressive. Set to 10 to prefer RAM. |
| `.env` not in archive | Upload `.env` separately with `scp`. Never commit it to git. |
| `*.map` files | Exclude from tar — they're large and unused on server. |
| `pm2 save` after changes | Without this, PM2 won't restore processes after reboot. |
| Node version | Install Node 20 via NodeSource. Ubuntu 22.04 apt ships v12. |
| **ESM + PM2 cluster** | PM2 cluster mode breaks ESM imports. **Always use `exec_mode: 'fork'`**. |
| **husky prepare script** | `npm install --omit=dev` fails because husky (devDep) runs in `prepare`. Use `--ignore-scripts`. |
| **Static path in esbuild** | `serveStatic` resolves `dist/dist/public` — create symlink `dist/server/public -> ../public`. |
| **SESSION_SECRET** | Must be in `.env` for production. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| **whatsapp-data dir** | Baileys needs `/var/www/whatsapp-data` owned by ubuntu. Create with `sudo mkdir -p && sudo chown ubuntu:ubuntu`. |
| **.rainbow-kb path** | KnowledgeBase looks in project root, but KB is in `RainbowAI/`. Symlink: `ln -sf RainbowAI/.rainbow-kb .rainbow-kb`. |
| **IPv6-only bundles** | $2/mo cheaper but breaks npm, SSH, and some APIs. Use dual-stack for production. |

---

## Quick Reference Commands

```bash
# ---- SSH ----
ssh -i ~/.ssh/LightsailDefaultKeyPair.pem ubuntu@<IP>

# ---- Get IP from AWS CLI ----
aws lightsail get-instances --region ap-southeast-1 \
  --query "instances[*].{Name:name,IP:publicIpAddress}" --output table

# ---- Check swap on server ----
free -h

# ---- Add swap (one-liner) ----
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile

# ---- Build RainbowAI locally ----
cd RainbowAI && npx esbuild src/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

# ---- Package artifacts ----
tar --exclude="dist/public/assets/*.map" --exclude="RainbowAI/dist/*.map" \
  -czf /tmp/pelangi-deploy.tar.gz \
  dist/ RainbowAI/dist/ RainbowAI/package.json RainbowAI/package-lock.json \
  RainbowAI/.rainbow-kb/ shared/ package.json package-lock.json ecosystem.config.cjs

# ---- Upload ----
scp -i ~/.ssh/LightsailDefaultKeyPair.pem /tmp/pelangi-deploy.tar.gz ubuntu@<IP>:/tmp/

# ---- Prod install on server ----
NODE_OPTIONS='--max-old-space-size=400' npm install --omit=dev

# ---- PM2 ----
pm2 list
pm2 logs --lines 100
pm2 restart all
pm2 save
```

---

## Related Skills

- `zeabur-deployment` — Cloud-native deployment via Zeabur platform (no SSH)
- `database-troubleshooting` — Neon PostgreSQL connection issues
- `rainbow-mcp-troubleshooting` — Rainbow AI MCP server debugging

---

**Last Updated:** 2026-02-17
**Tested With:** Node.js 20, Ubuntu 22.04, Lightsail micro_3_0 (1GB), PM2 6.x, esbuild 0.25
**Real Project:** PelangiManager-Zeabur (Express + RainbowAI MCP on Lightsail)
**Production IP:** 18.142.14.142 (static: `pelangi-static-ip`)
