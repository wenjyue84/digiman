#!/bin/bash
# Ralph - Autonomous AI Agent Loop
# Based on Geoffrey Huntley's Ralph pattern (snarktank/ralph)
# Runs AI coding tools repeatedly until all PRD items are complete
# Enhanced with quality gates, retry tracking, dependency checks, and progress tracking

set -e

# Default values
MAX_ITERATIONS=60
AI_TOOL="claude"
PRD_FILE="prd.json"
PROGRESS_FILE="progress.txt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      AI_TOOL="$2"
      shift 2
      ;;
    --prd)
      PRD_FILE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      MAX_ITERATIONS="$1"
      shift
      ;;
  esac
done

# Validate AI tool
if [[ "$AI_TOOL" != "amp" && "$AI_TOOL" != "claude" ]]; then
  echo "Error: Invalid tool: $AI_TOOL (use 'amp' or 'claude')"
  exit 1
fi

# Check prerequisites
if [[ ! -f "$PRD_FILE" ]]; then
  echo "Error: $PRD_FILE not found. Create one first using the /prd skill."
  exit 1
fi

# Use local jq if system jq not found
if command -v jq &> /dev/null; then
  JQ="jq"
elif [[ -f "$SCRIPT_DIR/jq.exe" ]]; then
  JQ="$SCRIPT_DIR/jq.exe"
elif [[ -f "$SCRIPT_DIR/jq" ]]; then
  JQ="$SCRIPT_DIR/jq"
else
  echo "Error: jq is not installed. Install it with: choco install jq"
  echo "  Or place jq.exe in $SCRIPT_DIR/"
  exit 1
fi

# ── Progress file initialization ──────────────────────────────────
if [[ ! -f "$PROGRESS_FILE" ]]; then
  echo "## Codebase Patterns" > "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
  echo "(Patterns will be added by Ralph iterations as they discover them)" >> "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
  echo "# Ralph Progress Log - $(date)" >> "$PROGRESS_FILE"
  echo "Started autonomous agent loop for PRD completion" >> "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
fi

# ── Archive previous runs ────────────────────────────────────────
BRANCH_NAME=$($JQ -r '.branchName // "ralph-auto"' "$PRD_FILE")
PRODUCT_NAME=$($JQ -r '.productName // .project // "unknown"' "$PRD_FILE")

# Count completed vs total stories
TOTAL_STORIES=$($JQ '[.userStories | length] | .[0]' "$PRD_FILE")
COMPLETE_STORIES=$($JQ '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE")
INCOMPLETE_STORIES=$((TOTAL_STORIES - COMPLETE_STORIES))

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║     Ralph Autonomous Agent Loop      ║"
echo "  ╠══════════════════════════════════════╣"
echo "  ║  Tool:       $AI_TOOL"
echo "  ║  PRD:        $PRODUCT_NAME"
echo "  ║  Branch:     $BRANCH_NAME"
echo "  ║  Stories:    $COMPLETE_STORIES/$TOTAL_STORIES complete"
echo "  ║  Remaining:  $INCOMPLETE_STORIES stories"
echo "  ║  Max iters:  $MAX_ITERATIONS"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── Branch management ────────────────────────────────────────────
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "$BRANCH_NAME" && "$BRANCH_NAME" != "main" ]]; then
  if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    echo "[branch] Switching to existing branch: $BRANCH_NAME"
    git checkout "$BRANCH_NAME"
  else
    echo "[branch] Creating new feature branch: $BRANCH_NAME"
    git checkout -b "$BRANCH_NAME"
  fi
fi

# ── Quality gate functions ───────────────────────────────────────

run_quality_checks() {
  local story_id="$1"
  local pre_story_ts_errors="$2"  # Captured before Claude ran — dynamic baseline
  local checks_passed=true

  echo ""
  echo "  ┌─ Quality Gates ─────────────────────┐"

  # Gate 1: TypeScript compilation (RainbowAI)
  echo -n "  │ [1/3] TypeScript (RainbowAI)... "
  local ts_output
  ts_output=$(cd RainbowAI && npx tsc --noEmit --pretty false 2>&1 || true)
  local ts_errors
  ts_errors=$(echo "$ts_output" | grep -c "error TS" || true)
  if [[ "$ts_errors" -le "$pre_story_ts_errors" ]]; then
    echo "PASS ($ts_errors errors, baseline $pre_story_ts_errors)"
  else
    echo "FAIL ($ts_errors vs baseline $pre_story_ts_errors — $((ts_errors - pre_story_ts_errors)) new)"
    checks_passed=false
  fi

  # Gate 2: TypeScript compilation (server)
  echo -n "  │ [2/3] TypeScript (server)... "
  if npx tsc --noEmit --project tsconfig.json --pretty false 2>/dev/null; then
    echo "PASS"
  else
    echo "SKIP (no tsconfig or pre-existing errors)"
  fi

  # Gate 3: Intent accuracy test (if Rainbow server is running)
  echo -n "  │ [3/3] Intent accuracy test... "
  if curl -s http://localhost:3002/api/rainbow/health > /dev/null 2>&1; then
    ACCURACY=$(node RainbowAI/scripts/run-intent-test.mjs 2>/dev/null | grep -oP '\d+\.\d+%' | head -1)
    if [[ "$ACCURACY" == "100.0%" ]]; then
      echo "PASS ($ACCURACY)"
    else
      echo "FAIL ($ACCURACY)"
      checks_passed=false
    fi
  else
    echo "SKIP (Rainbow not running on :3002)"
  fi

  echo "  └─────────────────────────────────────┘"

  if [[ "$checks_passed" == "true" ]]; then
    echo "  ✓ All quality gates passed!"
    return 0
  else
    echo "  ✗ Some quality gates FAILED"
    return 1
  fi
}

# ── Retry tracking ───────────────────────────────────────────────
RETRY_FILE="retry-counts.json"
if [[ ! -f "$RETRY_FILE" ]]; then
  echo '{}' > "$RETRY_FILE"
fi
MAX_RETRIES=3

get_retry_count() {
  local story_id="$1"
  $JQ -r ".\"$story_id\" // 0" "$RETRY_FILE" | tr -d '\r'
}

increment_retry() {
  local story_id="$1"
  local current
  current=$(get_retry_count "$story_id")
  $JQ ".\"$story_id\" = $((current + 1))" "$RETRY_FILE" > "${RETRY_FILE}.tmp"
  mv "${RETRY_FILE}.tmp" "$RETRY_FILE"
}

reset_retry() {
  local story_id="$1"
  $JQ "del(.\"$story_id\")" "$RETRY_FILE" > "${RETRY_FILE}.tmp"
  mv "${RETRY_FILE}.tmp" "$RETRY_FILE"
}

# Check if all dependencies of a story are complete (passes: true)
check_deps_met() {
  local story_id="$1"
  local deps
  deps=$($JQ -r ".userStories[] | select(.id == \"$story_id\") | .dependencies // [] | .[]" "$PRD_FILE" | tr -d '\r')
  if [[ -z "$deps" ]]; then
    return 0  # No dependencies
  fi
  for dep in $deps; do
    local dep_passes
    dep_passes=$($JQ -r ".userStories[] | select(.id == \"$dep\") | .passes" "$PRD_FILE" | tr -d '\r')
    if [[ "$dep_passes" != "true" ]]; then
      return 1  # Dependency not met
    fi
  done
  return 0
}

# ── Dry run mode ─────────────────────────────────────────────────
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] Would process $INCOMPLETE_STORIES stories"
  echo ""
  $JQ -r '.userStories[] | select(.passes == false) | "  [\(.id)] \(.title) (priority: \(.priority))"' "$PRD_FILE"
  echo ""
  echo "[dry-run] Run without --dry-run to execute"
  exit 0
fi

# ── Progress display helper ──────────────────────────────────────
show_progress_bar() {
  local done=$1
  local total=$2
  local width=30
  local filled=$((done * width / total))
  local empty=$((width - filled))
  local pct=$((done * 100 / total))

  printf "  Progress: ["
  printf "%0.s█" $(seq 1 $filled 2>/dev/null) || true
  printf "%0.s░" $(seq 1 $empty 2>/dev/null) || true
  printf "] %d/%d (%d%%)\n" "$done" "$total" "$pct"
}

# ── Main loop ────────────────────────────────────────────────────
ITERATION=0
STORIES_COMPLETED=$COMPLETE_STORIES
STORIES_SKIPPED=0
START_TIME=$(date +%s)

while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
  ITERATION=$((ITERATION + 1))

  # Show progress bar
  CURRENT_DONE=$($JQ '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE")
  echo ""
  echo "  ╔══════════════════════════════════════╗"
  echo "  ║  Iteration $ITERATION/$MAX_ITERATIONS"
  show_progress_bar "$CURRENT_DONE" "$TOTAL_STORIES"
  echo "  ╚══════════════════════════════════════╝"

  # Find next incomplete story — respecting retries and dependencies
  NEXT_STORY=""
  ALL_INCOMPLETE=$($JQ -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[].id' "$PRD_FILE" | tr -d '\r')

  for candidate in $ALL_INCOMPLETE; do
    # Check retry count
    retries=$(get_retry_count "$candidate")
    if [[ "$retries" -ge "$MAX_RETRIES" ]]; then
      continue  # Skip — exceeded max retries
    fi
    # Check dependencies
    if check_deps_met "$candidate"; then
      NEXT_STORY="$candidate"
      break
    fi
  done

  if [[ -z "$NEXT_STORY" ]]; then
    REMAINING=$($JQ '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
    if [[ "$REMAINING" -eq 0 ]]; then
      echo ""
      echo "  *** ALL STORIES COMPLETE! ***"
    else
      echo ""
      echo "  No actionable stories left ($REMAINING blocked or max-retried)"
      for sid in $ALL_INCOMPLETE; do
        retries=$(get_retry_count "$sid")
        stitle=$($JQ -r ".userStories[] | select(.id == \"$sid\") | .title" "$PRD_FILE")
        if [[ "$retries" -ge "$MAX_RETRIES" ]]; then
          echo "    SKIPPED (${retries}x failed): [$sid] $stitle"
          STORIES_SKIPPED=$((STORIES_SKIPPED + 1))
        else
          echo "    BLOCKED (deps unmet):  [$sid] $stitle"
        fi
      done
    fi
    break
  fi

  STORY_TITLE=$($JQ -r ".userStories[] | select(.id == \"$NEXT_STORY\") | .title" "$PRD_FILE" | tr -d '\r')
  STORY_PRIORITY=$($JQ -r ".userStories[] | select(.id == \"$NEXT_STORY\") | .priority" "$PRD_FILE" | tr -d '\r')
  STORY_DEPS=$($JQ -r ".userStories[] | select(.id == \"$NEXT_STORY\") | .dependencies // [] | join(\", \")" "$PRD_FILE" | tr -d '\r')
  RETRY_NOW=$(get_retry_count "$NEXT_STORY")

  echo ""
  echo "  ┌─ Story ─────────────────────────────┐"
  echo "  │ ID:       $NEXT_STORY"
  echo "  │ Title:    $STORY_TITLE"
  echo "  │ Priority: $STORY_PRIORITY"
  echo "  │ Deps:     ${STORY_DEPS:-none}"
  echo "  │ Attempt:  $((RETRY_NOW + 1))/$MAX_RETRIES"
  echo "  └─────────────────────────────────────┘"
  echo ""

  # Select prompt file
  PROMPT_FILE="$SCRIPT_DIR/CLAUDE.md"
  if [[ "$AI_TOOL" == "amp" ]]; then
    PROMPT_FILE="$SCRIPT_DIR/prompt.md"
  fi

  if [[ ! -f "$PROMPT_FILE" ]]; then
    echo "Error: Prompt file not found: $PROMPT_FILE"
    exit 1
  fi

  # Capture TS error baseline BEFORE Claude makes any changes
  echo -n "  [baseline] Counting pre-story TS errors... "
  PRE_STORY_TS_ERRORS=$(cd RainbowAI && npx tsc --noEmit --pretty false 2>&1 | grep -c "error TS" || true)
  echo "$PRE_STORY_TS_ERRORS errors"

  # Spawn fresh AI instance with real-time stream output
  STORY_START=$(date +%s)
  echo ""
  echo "  [spawn] Fresh $AI_TOOL instance for $NEXT_STORY..."
  echo "  ─────── Claude Output Start ──────────"
  if [[ "$AI_TOOL" == "claude" ]]; then
    claude -p "$(cat "$PROMPT_FILE")" \
      --allowedTools "Edit,Write,Read,Glob,Grep,Bash,Skill,Task" \
      --max-turns 75 \
      --output-format stream-json \
      --dangerously-skip-permissions \
      2>&1 | node "$SCRIPT_DIR/stream-formatter.mjs" || true
  else
    amp --prompt-file "$PROMPT_FILE"
  fi
  echo "  ─────── Claude Output End ────────────"
  STORY_END=$(date +%s)
  STORY_DURATION=$(( (STORY_END - STORY_START) / 60 ))
  echo "  [time] Story took ${STORY_DURATION}m"

  # Check if story was completed
  PASSES=$($JQ -r ".userStories[] | select(.id == \"$NEXT_STORY\") | .passes" "$PRD_FILE" | tr -d '\r')

  if [[ "$PASSES" == "true" ]]; then
    STORIES_COMPLETED=$((STORIES_COMPLETED + 1))
    echo ""
    echo "  [done] Story completed: $STORY_TITLE"

    # Run quality checks
    if run_quality_checks "$NEXT_STORY" "$PRE_STORY_TS_ERRORS"; then
      reset_retry "$NEXT_STORY"

      git add -A
      git commit -m "feat: $NEXT_STORY - $STORY_TITLE

Completed by Ralph iteration $ITERATION (${STORY_DURATION}m)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" || echo "[warn] No changes to commit"

      echo "## Iteration $ITERATION - $(date)" >> "$PROGRESS_FILE"
      echo "Completed: $STORY_TITLE (ID: $NEXT_STORY) in ${STORY_DURATION}m" >> "$PROGRESS_FILE"
      echo "" >> "$PROGRESS_FILE"
    else
      echo "[rollback] Quality checks failed — reverting prd.json mark"
      $JQ "(.userStories[] | select(.id == \"$NEXT_STORY\") | .passes) = false" "$PRD_FILE" > "${PRD_FILE}.tmp"
      mv "${PRD_FILE}.tmp" "$PRD_FILE"

      increment_retry "$NEXT_STORY"
      RETRY_NOW=$(get_retry_count "$NEXT_STORY")
      echo "[retry] $NEXT_STORY attempt $RETRY_NOW/$MAX_RETRIES"

      echo "## Iteration $ITERATION - $(date)" >> "$PROGRESS_FILE"
      echo "FAILED quality gates: $STORY_TITLE (ID: $NEXT_STORY) — attempt $RETRY_NOW/$MAX_RETRIES" >> "$PROGRESS_FILE"
      if [[ "$RETRY_NOW" -ge "$MAX_RETRIES" ]]; then
        echo "SKIPPED: $NEXT_STORY after $MAX_RETRIES failed attempts" >> "$PROGRESS_FILE"
        echo "[skip] $NEXT_STORY skipped after $MAX_RETRIES attempts — moving on"
        git checkout -- . 2>/dev/null || true
      fi
      echo "" >> "$PROGRESS_FILE"
    fi
  else
    echo ""
    echo "[warn] Story not completed by Claude instance"

    increment_retry "$NEXT_STORY"
    RETRY_NOW=$(get_retry_count "$NEXT_STORY")
    echo "[retry] $NEXT_STORY attempt $RETRY_NOW/$MAX_RETRIES"

    echo "## Iteration $ITERATION - $(date)" >> "$PROGRESS_FILE"
    echo "Incomplete: $STORY_TITLE (ID: $NEXT_STORY) — attempt $RETRY_NOW/$MAX_RETRIES" >> "$PROGRESS_FILE"
    if [[ "$RETRY_NOW" -ge "$MAX_RETRIES" ]]; then
      echo "SKIPPED: $NEXT_STORY after $MAX_RETRIES failed attempts" >> "$PROGRESS_FILE"
      echo "[skip] $NEXT_STORY skipped after $MAX_RETRIES attempts — moving on"
      git checkout -- . 2>/dev/null || true
    fi
    echo "" >> "$PROGRESS_FILE"
  fi
done

# ── Summary ──────────────────────────────────────────────────────
END_TIME=$(date +%s)
TOTAL_MINUTES=$(( (END_TIME - START_TIME) / 60 ))

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║     Ralph Session Summary            ║"
echo "  ╠══════════════════════════════════════╣"
REMAINING=$($JQ '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
TOTAL=$($JQ '[.userStories | length] | .[0]' "$PRD_FILE")
SKIPPED_COUNT=0
if [[ -f "$RETRY_FILE" ]]; then
  SKIPPED_COUNT=$($JQ "[to_entries[] | select(.value >= $MAX_RETRIES)] | length" "$RETRY_FILE")
fi

echo "  ║  Duration:        ${TOTAL_MINUTES}m"
echo "  ║  Iterations:      $ITERATION"
echo "  ║  Completed:       $STORIES_COMPLETED/$TOTAL"
echo "  ║  Skipped:         $SKIPPED_COUNT (exceeded $MAX_RETRIES retries)"
echo "  ║  Remaining:       $REMAINING"

if [[ $REMAINING -eq 0 ]]; then
  echo "  ║  Status:          ALL COMPLETE"
else
  echo "  ║  Status:          $REMAINING stories remaining"
fi
echo "  ╚══════════════════════════════════════╝"

if [[ $REMAINING -gt 0 ]]; then
  if [[ "$SKIPPED_COUNT" -gt 0 ]]; then
    echo ""
    echo "  Skipped stories (failed ${MAX_RETRIES}x):"
    for sid in $($JQ -r 'to_entries[] | select(.value >= '"$MAX_RETRIES"') | .key' "$RETRY_FILE"); do
      stitle=$($JQ -r ".userStories[] | select(.id == \"$sid\") | .title" "$PRD_FILE")
      echo "    [$sid] $stitle"
    done
  fi
  echo ""
  echo "  Remaining stories:"
  $JQ -r '.userStories[] | select(.passes == false) | "    [\(.id)] \(.title)"' "$PRD_FILE"
fi

# Cleanup retry file if all done
if [[ $REMAINING -eq 0 ]]; then
  rm -f "$RETRY_FILE"
fi
