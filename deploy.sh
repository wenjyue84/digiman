#!/bin/bash
# digiman Lightsail Deployment Script
# Usage: ./deploy.sh [target] [--skip-build] [--skip-rainbow]
# Targets: pelangi (default), southern
#
# Builds locally, packages artifacts, uploads to Lightsail, installs deps, restarts PM2.
# .env files are NOT transferred — create them manually on the instance.

set -euo pipefail

# --- Target Selection ---
TARGET=${1:-pelangi}
# If first arg is a flag, default target to pelangi
if [[ "$TARGET" == --* ]]; then
  TARGET="pelangi"
else
  # Consume the first argument
  shift || true
fi

TARGET_ENV="deploy/targets/${TARGET}.env"

if [ ! -f "$TARGET_ENV" ]; then
  echo "ERROR: Target configuration not found: $TARGET_ENV"
  echo "Available targets: $(ls deploy/targets/*.env | xargs -n 1 basename | sed 's/\.env//g' | xargs)"
  exit 1
fi

# Source target config
source "$TARGET_ENV"

# --- Config ---
SSH_CMD="ssh -i $SSH_KEY $SSH_USER@$INSTANCE_IP"
SCP_CMD="scp -i $SSH_KEY"

SKIP_BUILD=false
SKIP_RAINBOW=false

for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --skip-rainbow) SKIP_RAINBOW=true ;;
  esac
done

echo "=== digiman Deployment [$TARGET] ==="
echo "Target: $SSH_USER@$INSTANCE_IP:$REMOTE_DIR"
echo ""

# --- Phase 1: Local Build ---
if [ "$SKIP_BUILD" = false ]; then
  echo "[1/5] Building main app..."
  rm -rf dist/
  npm run build
  echo "  Main app build complete."

  if [ "$SKIP_RAINBOW" = false ]; then
    echo "[1/5] Building Rainbow AI (esbuild)..."
    rm -rf RainbowAI/dist/
    cd RainbowAI
    npx esbuild src/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js
    node -e "require('fs').cpSync('src/assistant/data','dist/assistant/data',{recursive:true});require('fs').cpSync('src/public','dist/public',{recursive:true})"
    cd ..
    echo "  Rainbow AI build complete."
  fi
else
  echo "[1/5] Skipping build (--skip-build)"
fi

# --- Phase 2: Verify build outputs ---
echo "[2/5] Verifying build outputs..."
for f in dist/server/index.js dist/public/index.html; do
  [ -f "$f" ] || { echo "ERROR: Missing $f"; exit 1; }
done
if [ "$SKIP_RAINBOW" = false ]; then
  [ -f "RainbowAI/dist/index.js" ] || { echo "ERROR: Missing RainbowAI/dist/index.js"; exit 1; }
fi
echo "  All build outputs verified."

# --- Phase 3: Package tarball ---
echo "[3/5] Preparing ecosystem config and creating deployment tarball..."
# Copy the right ecosystem file to root for the tarball
cp "deploy/targets/${TARGET}.ecosystem.cjs" ecosystem.config.cjs

TAR_ARGS="dist/ package.json package-lock.json ecosystem.config.cjs"
if [ "$SKIP_RAINBOW" = false ]; then
  TAR_ARGS="$TAR_ARGS RainbowAI/dist/ RainbowAI/package.json RainbowAI/package-lock.json"
  [ -d "RainbowAI/.rainbow-kb" ] && TAR_ARGS="$TAR_ARGS RainbowAI/.rainbow-kb/"
fi

tar czf pelangi-deploy.tar.gz --exclude="*.map" $TAR_ARGS
TARBALL_SIZE=$(du -h pelangi-deploy.tar.gz | cut -f1)
echo "  Tarball created: pelangi-deploy.tar.gz ($TARBALL_SIZE)"

# --- Phase 4: Upload + extract ---
echo "[4/5] Uploading to Lightsail..."
$SCP_CMD pelangi-deploy.tar.gz $SSH_USER@$INSTANCE_IP:/tmp/
$SSH_CMD "mkdir -p $REMOTE_DIR && cd $REMOTE_DIR && tar xzf /tmp/pelangi-deploy.tar.gz && rm /tmp/pelangi-deploy.tar.gz"
echo "  Upload and extraction complete."

# --- Phase 5: Install deps + restart ---
echo "[5/5] Installing dependencies and restarting..."
$SSH_CMD << REMOTE_EOF
set -e
cd $REMOTE_DIR

echo "  Installing root dependencies..."
NODE_OPTIONS="--max-old-space-size=256" npm install --omit=dev --ignore-scripts 2>&1 | tail -3
npm rebuild 2>/dev/null || true

if [ -d "RainbowAI/dist" ]; then
  echo "  Installing Rainbow AI dependencies..."
  cd RainbowAI
  NODE_OPTIONS="--max-old-space-size=256" npm install --omit=dev --ignore-scripts 2>&1 | tail -3
  npm rebuild 2>/dev/null || true
  cd ..
fi

echo "  Restarting PM2 processes..."
pm2 reload ecosystem.config.cjs --update-env
pm2 save

echo ""
echo "=== Deployment Complete ==="
pm2 status
echo ""
free -h | head -3
REMOTE_EOF

# Cleanup local tarball
rm -f pelangi-deploy.tar.gz
echo ""
echo "=== Done! Verify at http://$INSTANCE_IP/ ==="
