#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="southern"
WITH_REMOTE=false
WITH_TESTS=false
SKIP_TYPES=false
SSH_TIMEOUT=10

if [[ -t 1 ]]; then
  RED=$'\033[31m'
  YELLOW=$'\033[33m'
  GREEN=$'\033[32m'
  BLUE=$'\033[34m'
  RESET=$'\033[0m'
else
  RED=""
  YELLOW=""
  GREEN=""
  BLUE=""
  RESET=""
fi

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

usage() {
  cat <<'USAGE'
Usage: scripts/preflight-southern.sh [options]

Options:
  --target <name>     Deploy target name (default: southern)
  --remote            Also run remote server checks over SSH
  --with-tests        Run jest smoke tests locally
  --skip-types        Skip `npm run check --silent`
  --ssh-timeout <n>   SSH connect timeout in seconds (default: 10)
  -h, --help          Show this help message

Examples:
  scripts/preflight-southern.sh
  scripts/preflight-southern.sh --remote
  scripts/preflight-southern.sh --remote --with-tests
USAGE
}

ok() {
  echo "${GREEN}[OK]${RESET} $*"
  PASS_COUNT=$((PASS_COUNT + 1))
}

warn() {
  echo "${YELLOW}[WARN]${RESET} $*"
  WARN_COUNT=$((WARN_COUNT + 1))
}

fail() {
  echo "${RED}[FAIL]${RESET} $*"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

require_value() {
  local var_name="$1"
  local val="${!var_name:-}"
  if [[ -z "$val" ]]; then
    fail "Missing required value: $var_name"
  else
    ok "$var_name is set"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="$2"
      shift 2
      ;;
    --remote)
      WITH_REMOTE=true
      shift
      ;;
    --with-tests)
      WITH_TESTS=true
      shift
      ;;
    --skip-types)
      SKIP_TYPES=true
      shift
      ;;
    --ssh-timeout)
      SSH_TIMEOUT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "${RED}Unknown option:${RESET} $1"
      usage
      exit 2
      ;;
  esac
done

TARGET_ENV="$ROOT_DIR/deploy/targets/${TARGET}.env"

echo "${BLUE}== Southern Preflight (${TARGET}) ==${RESET}"
echo "Repository: $ROOT_DIR"

if [[ ! -f "$TARGET_ENV" ]]; then
  fail "Target config not found: $TARGET_ENV"
  exit 1
fi
ok "Found target config: $TARGET_ENV"

SANITIZED_ENV="$(mktemp)"
tr -d '\r' < "$TARGET_ENV" > "$SANITIZED_ENV"
# shellcheck source=/dev/null
source "$SANITIZED_ENV"
rm -f "$SANITIZED_ENV"

require_value "INSTANCE_IP"
require_value "SSH_KEY"
require_value "SSH_USER"
require_value "REMOTE_DIR"
require_value "PUBLIC_URL"

if [[ -n "${SSH_KEY:-}" && ! -f "$SSH_KEY" ]]; then
  warn "SSH key file does not exist locally: $SSH_KEY"
else
  ok "SSH key file exists locally"
fi

if [[ "${PUBLIC_URL:-}" =~ ^https:// ]]; then
  ok "PUBLIC_URL uses HTTPS"
else
  fail "PUBLIC_URL must start with https://"
fi

PUBLIC_HOST="$(echo "${PUBLIC_URL:-}" | sed -E 's#https?://([^/]+).*#\1#')"
if [[ -n "$PUBLIC_HOST" ]]; then
  ok "Canonical public host: $PUBLIC_HOST"
fi

NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
fi
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  warn "Detected Node.js < 20 (current: $(node -v 2>/dev/null || echo unknown)); attempting nvm use 20"
  if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    source "${HOME}/.nvm/nvm.sh"
    nvm use 20 >/dev/null 2>&1 || true
    NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  fi
fi
if [[ "$NODE_MAJOR" -ge 20 ]]; then
  ok "Node.js version is compatible: $(node -v)"
else
  fail "Node.js 20+ is required for local checks. Install/use Node 20 and rerun."
  SKIP_TYPES=true
  WITH_TESTS=false
fi

mapfile -t ADMIN_HOSTS < <(
  grep -RhoE 'admin\.[a-zA-Z0-9.-]+' "$ROOT_DIR/deploy/targets" 2>/dev/null | sort -u
)
if [[ ${#ADMIN_HOSTS[@]} -gt 1 ]]; then
  warn "Multiple admin host variants found in deploy/targets: ${ADMIN_HOSTS[*]}"
else
  ok "Deploy target files use a single admin host variant"
fi

if grep -Rqs "admin\\.southernhomestay\\.com" "$ROOT_DIR/deploy/targets" \
  && grep -Rqs "admin\\.southern-homestay\\.com" "$ROOT_DIR/deploy/targets"; then
  warn "Found both hyphenated and non-hyphenated Southern admin domains. Standardize to one."
fi

if [[ "$SKIP_TYPES" == false ]]; then
  echo "${BLUE}Running TypeScript check...${RESET}"
  if (cd "$ROOT_DIR" && npm run check --silent >/tmp/preflight-types.log 2>&1); then
    ok "TypeScript check passed"
  else
    fail "TypeScript check failed (see /tmp/preflight-types.log)"
    tail -n 60 /tmp/preflight-types.log || true
  fi
else
  warn "Skipping TypeScript check (--skip-types)"
fi

if [[ "$WITH_TESTS" == true ]]; then
  echo "${BLUE}Running jest smoke tests...${RESET}"
  if (cd "$ROOT_DIR" && npm test -- --runInBand --passWithNoTests >/tmp/preflight-tests.log 2>&1); then
    ok "Jest smoke tests passed"
  else
    fail "Jest smoke tests failed (see /tmp/preflight-tests.log)"
    tail -n 80 /tmp/preflight-tests.log || true
  fi
fi

if [[ "$WITH_REMOTE" == true ]]; then
  echo "${BLUE}Running remote checks over SSH...${RESET}"
  if [[ ! -f "$SSH_KEY" ]]; then
    fail "Cannot run remote checks: SSH key not found at $SSH_KEY"
  else
    REMOTE_SCRIPT="$(cat <<'REMOTE'
set -euo pipefail

REMOTE_FAIL=0

r_ok() {
  echo "[REMOTE OK] $*"
}

r_fail() {
  echo "[REMOTE FAIL] $*"
  REMOTE_FAIL=1
}

check_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    r_ok "Found file: $path"
  else
    r_fail "Missing file: $path"
  fi
}

check_dir() {
  local path="$1"
  if [[ -d "$path" ]]; then
    r_ok "Found directory: $path"
  else
    r_fail "Missing directory: $path"
  fi
}

check_env_key() {
  local env_file="$1"
  local key="$2"
  local line value
  line="$(grep -E "^${key}=" "$env_file" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    r_fail "Missing key $key in $env_file"
    return
  fi
  value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  if [[ -z "$value" || "$value" == REPLACE_WITH* || "$value" == your-* || "$value" == generate-* ]]; then
    r_fail "Invalid value for $key in $env_file"
  else
    r_ok "$key is set in $(basename "$env_file")"
  fi
}

check_env_key_alias() {
  local env_file="$1"
  local primary="$2"
  local legacy="$3"
  local line

  line="$(grep -E "^${primary}=" "$env_file" | tail -n 1 || true)"
  if [[ -n "$line" ]]; then
    check_env_key "$env_file" "$primary"
    return
  fi

  line="$(grep -E "^${legacy}=" "$env_file" | tail -n 1 || true)"
  if [[ -n "$line" ]]; then
    check_env_key "$env_file" "$legacy"
    r_ok "Using legacy key $legacy (recommended: migrate to $primary)"
    return
  fi

  r_fail "Missing both $primary and legacy $legacy in $env_file"
}

check_dir "$REMOTE_DIR"
check_dir "$REMOTE_DIR/RainbowAI"

APP_ENV="$REMOTE_DIR/.env"
RAINBOW_ENV="$REMOTE_DIR/RainbowAI/.env"

check_file "$APP_ENV"
check_file "$RAINBOW_ENV"

if [[ -f "$APP_ENV" ]]; then
  check_env_key "$APP_ENV" "NODE_ENV"
  check_env_key "$APP_ENV" "PORT"
  check_env_key "$APP_ENV" "SESSION_SECRET"
  check_env_key "$APP_ENV" "DATABASE_URL"
  check_env_key "$APP_ENV" "PUBLIC_URL"
  check_env_key "$APP_ENV" "CORS_ORIGIN"
  check_env_key "$APP_ENV" "BUSINESS_NAME"
  check_env_key "$APP_ENV" "ACCOMMODATION_TYPE"
  check_env_key "$APP_ENV" "SEED_UNITS"
fi

if [[ -f "$RAINBOW_ENV" ]]; then
  check_env_key_alias "$RAINBOW_ENV" "DIGIMAN_API_URL" "PELANGI_API_URL"
  check_env_key_alias "$RAINBOW_ENV" "DIGIMAN_API_TOKEN" "PELANGI_API_TOKEN"
  check_env_key "$RAINBOW_ENV" "MCP_SERVER_PORT"
  check_env_key "$RAINBOW_ENV" "BUSINESS_NAME"
  check_env_key "$RAINBOW_ENV" "BOT_NAME"
  check_env_key "$RAINBOW_ENV" "STAFF_PRIMARY_PHONE"
  check_env_key "$RAINBOW_ENV" "ADMIN_SITE_URL"
  check_env_key "$RAINBOW_ENV" "PUBLIC_SITE_URL"
  check_env_key "$RAINBOW_ENV" "WHATSAPP_AUTH_DIR"

  WA_DIR="$(grep -E '^WHATSAPP_AUTH_DIR=' "$RAINBOW_ENV" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
  if [[ -n "$WA_DIR" ]]; then
    check_dir "$WA_DIR"
  fi
fi

if command -v pm2 >/dev/null 2>&1; then
  if pm2 status | grep -q "southern-api"; then
    r_ok "PM2 process southern-api exists"
  else
    r_fail "PM2 process southern-api not found"
  fi
  if pm2 status | grep -q "southern-rainbow"; then
    r_ok "PM2 process southern-rainbow exists"
  else
    r_fail "PM2 process southern-rainbow not found"
  fi
else
  r_fail "pm2 not installed on remote server"
fi

if curl -fsS http://localhost:5000/api/health >/dev/null 2>&1; then
  r_ok "Backend health endpoint OK (localhost:5000)"
else
  r_fail "Backend health endpoint failed (localhost:5000)"
fi

if curl -fsS http://localhost:3002/api/health >/dev/null 2>&1; then
  r_ok "Rainbow health endpoint OK (localhost:3002)"
else
  r_fail "Rainbow health endpoint failed (localhost:3002)"
fi

if curl -fsS "$PUBLIC_URL/api/health" >/dev/null 2>&1; then
  r_ok "Public health endpoint OK ($PUBLIC_URL/api/health)"
else
  r_fail "Public health endpoint failed ($PUBLIC_URL/api/health)"
fi

if [[ "$REMOTE_FAIL" -ne 0 ]]; then
  exit 1
fi
REMOTE
)"

    if ssh -o BatchMode=yes -o ConnectTimeout="$SSH_TIMEOUT" -i "$SSH_KEY" "$SSH_USER@$INSTANCE_IP" \
      "REMOTE_DIR='$REMOTE_DIR' PUBLIC_URL='$PUBLIC_URL' bash -s" <<<"$REMOTE_SCRIPT" \
      >/tmp/preflight-remote.log 2>&1; then
      ok "Remote checks passed"
      tail -n 80 /tmp/preflight-remote.log || true
    else
      fail "Remote checks failed (see /tmp/preflight-remote.log)"
      tail -n 120 /tmp/preflight-remote.log || true
    fi
  fi
fi

echo
echo "${BLUE}== Preflight Summary ==${RESET}"
echo "Passed:  $PASS_COUNT"
echo "Warnings:$WARN_COUNT"
echo "Failed:  $FAIL_COUNT"

if [[ "$FAIL_COUNT" -ne 0 ]]; then
  exit 1
fi
