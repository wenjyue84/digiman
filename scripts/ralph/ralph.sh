#!/bin/bash
# Ralph - Autonomous AI Agent Loop
# Based on Geoffrey Huntley's Ralph pattern
# Runs AI coding tools repeatedly until all PRD items are complete

set -e

# Default values
MAX_ITERATIONS=10
AI_TOOL="claude"
PRD_FILE="prd.json"
PROGRESS_FILE="progress.txt"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      AI_TOOL="$2"
      shift 2
      ;;
    *)
      MAX_ITERATIONS="$1"
      shift
      ;;
  esac
done

# Validate AI tool
if [[ "$AI_TOOL" != "amp" && "$AI_TOOL" != "claude" ]]; then
  echo "❌ Invalid tool: $AI_TOOL (use 'amp' or 'claude')"
  exit 1
fi

# Check prerequisites
if [[ ! -f "$PRD_FILE" ]]; then
  echo "❌ prd.json not found. Create one first using the PRD skill."
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "❌ jq is not installed. Install it with: npm install -g node-jq or brew install jq"
  exit 1
fi

# Initialize progress file if it doesn't exist
if [[ ! -f "$PROGRESS_FILE" ]]; then
  echo "# Ralph Progress Log - $(date)" > "$PROGRESS_FILE"
  echo "Started autonomous agent loop for PRD completion" >> "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
fi

# Get branch name from PRD
BRANCH_NAME=$(jq -r '.branchName // "ralph-auto"' "$PRD_FILE")

# Create feature branch if it doesn't exist
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]]; then
  if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    echo "📌 Switching to existing branch: $BRANCH_NAME"
    git checkout "$BRANCH_NAME"
  else
    echo "🌿 Creating new feature branch: $BRANCH_NAME"
    git checkout -b "$BRANCH_NAME"
  fi
fi

# Archive previous runs if branchName changed
ARCHIVE_DIR="archive/$(date +%Y-%m-%d)-$BRANCH_NAME"
if [[ -d "$ARCHIVE_DIR" ]]; then
  echo "📦 Previous run detected, continuing..."
else
  if [[ -f "progress.txt.old" ]]; then
    mkdir -p "$ARCHIVE_DIR"
    mv progress.txt.old "$ARCHIVE_DIR/" 2>/dev/null || true
    mv prd.json.old "$ARCHIVE_DIR/" 2>/dev/null || true
  fi
fi

echo "🤖 Starting Ralph autonomous agent loop"
echo "   Tool: $AI_TOOL"
echo "   Max iterations: $MAX_ITERATIONS"
echo "   Branch: $BRANCH_NAME"
echo ""

ITERATION=0
while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
  ITERATION=$((ITERATION + 1))
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 Iteration $ITERATION/$MAX_ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Find next incomplete story
  NEXT_STORY=$(jq -r '.userStories[] | select(.passes == false) | .id' "$PRD_FILE" | head -n 1)

  if [[ -z "$NEXT_STORY" ]]; then
    echo "✅ All stories complete!"
    echo "<promise>COMPLETE</promise>"
    exit 0
  fi

  STORY_TITLE=$(jq -r ".userStories[] | select(.id == \"$NEXT_STORY\") | .title" "$PRD_FILE")
  echo "📋 Working on: $STORY_TITLE (ID: $NEXT_STORY)"
  echo ""

  # Create prompt for AI tool
  PROMPT_FILE="scripts/ralph/CLAUDE.md"
  if [[ "$AI_TOOL" == "amp" ]]; then
    PROMPT_FILE="scripts/ralph/prompt.md"
  fi

  if [[ ! -f "$PROMPT_FILE" ]]; then
    echo "❌ Prompt file not found: $PROMPT_FILE"
    exit 1
  fi

  # Run AI tool
  echo "🧠 Spawning fresh $AI_TOOL instance..."
  if [[ "$AI_TOOL" == "claude" ]]; then
    # Use Claude Code
    cat "$PROMPT_FILE" | claude-code --non-interactive --context-file "$PRD_FILE" --context-file "$PROGRESS_FILE"
  else
    # Use Amp
    amp --prompt-file "$PROMPT_FILE"
  fi

  # Check if story was completed
  PASSES=$(jq -r ".userStories[] | select(.id == \"$NEXT_STORY\") | .passes" "$PRD_FILE")

  if [[ "$PASSES" == "true" ]]; then
    echo "✅ Story completed: $STORY_TITLE"

    # Commit changes
    git add -A
    git commit -m "feat: complete story $NEXT_STORY - $STORY_TITLE

Completed by Ralph iteration $ITERATION

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>" || echo "⚠️  No changes to commit"

    # Append to progress
    echo "## Iteration $ITERATION - $(date)" >> "$PROGRESS_FILE"
    echo "✅ Completed: $STORY_TITLE (ID: $NEXT_STORY)" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
  else
    echo "⚠️  Story not completed or checks failed"
    echo "## Iteration $ITERATION - $(date)" >> "$PROGRESS_FILE"
    echo "⚠️  Failed/Incomplete: $STORY_TITLE (ID: $NEXT_STORY)" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
  fi

  echo ""
done

echo "⏱️  Reached max iterations ($MAX_ITERATIONS)"
echo "📊 Check prd.json for remaining stories"
REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
echo "   $REMAINING stories remaining"
