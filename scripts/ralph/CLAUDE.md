# Ralph Autonomous Agent - Claude Code Instructions

You are running as part of Ralph, an autonomous agent loop. Your job is to implement **ONE SINGLE USER STORY** from the PRD, then exit.

## Critical Rules

1. **ONE STORY ONLY**: Pick the highest priority story where `passes: false` and implement ONLY that story
2. **Small, focused changes**: Each story should be completable in this context window
3. **Quality checks**: Run typechecking and tests before marking complete
4. **Update prd.json**: Mark story as `passes: true` only if all checks pass
5. **Document learnings**: Append discoveries to `progress.txt` for future iterations
6. **Update CLAUDE.md**: Add patterns, gotchas, and useful context discovered
7. **Commit frequently**: Commit working changes to build git history for future iterations
8. **3-RETRY SKIP RULE**: The outer loop tracks retries. If you cannot complete a story, leave `passes: false` and EXIT cleanly. After 3 failed attempts the story is automatically skipped. Do NOT spend excessive time on a single problem — attempt a reasonable solution and move on.
9. **AGENT-BROWSER FOR ALL STORIES**: After completing ANY story, you MUST use the agent-browser skill (via the Skill tool) to verify changes in a real browser. For schema/storage/backend stories, verify the server can start and the dashboard loads. For UI stories, verify the specific UI changes. Do NOT skip browser verification — it is a required quality gate.

## Your Workflow

### 1. Read Context Files
```bash
# Read Codebase Patterns section FIRST
head -30 progress.txt

# Find next incomplete story
cat prd.json | jq '.userStories[] | select(.passes == false) | {id, title, priority}' | head -20

# Read full progress log for learnings
cat progress.txt
```

### 2. Pick Next Story
- Choose the highest priority incomplete story
- Read its requirements and acceptance criteria carefully
- Check if dependencies are complete

### 3. Implement the Story
- Make focused changes for THIS STORY ONLY
- Follow existing code patterns (check CLAUDE.md, progress.txt Codebase Patterns)
- Write or update tests as needed
- Keep changes minimal and focused

### 4. Run Quality Checks
```bash
# TypeScript compilation (RainbowAI module)
cd RainbowAI && npx tsc --noEmit && cd ..

# Intent accuracy test (OPTIONAL — only run if server is already on port 3002)
# DO NOT start the server just for this check. Skip gracefully if unavailable.
if curl -s http://localhost:3002/health > /dev/null 2>&1; then
  node RainbowAI/scripts/run-intent-test.mjs
else
  echo "Skipping intent test — server not running. TypeScript gate is sufficient."
fi

# Build check (optional)
npm run build
```

**IMPORTANT**: For this session, the PRD file is `tasks/prd-rainbow-ai-test-failures.json` (NOT `prd.json`). When reading stories, always use: `cat tasks/prd-rainbow-ai-test-failures.json | jq '.userStories[] | select(.passes == false) | {id, priority, title}'`

### 5. Verify in Browser (for UI stories)
If the story involves UI changes:
- Use agent-browser to verify: `agent-browser open http://localhost:3002/admin/rainbow`
- Take snapshots: `agent-browser snapshot -i`
- Interact with elements using @refs

## Mandatory Agent-Browser Testing

**CRITICAL**: For ALL UI-related stories, you MUST use agent-browser to verify changes before marking the story complete. Screenshots and manual descriptions are NOT sufficient.

### Agent-Browser Command Reference

```bash
# Navigation
agent-browser open <url>                    # Navigate to page
agent-browser goto <url>                    # Alternative navigation

# Inspection
agent-browser snapshot -i                   # Get interactive elements with @refs
agent-browser screenshot path.png           # Capture screenshot
agent-browser get text @ref                 # Get element text content
agent-browser get value @ref                # Get input field value

# Interaction
agent-browser click @ref                    # Click element by reference
agent-browser fill @ref "text"              # Fill input field
agent-browser select @ref "option"          # Select dropdown option
agent-browser hover @ref                    # Hover over element

# Evaluation
agent-browser eval "JavaScript code"        # Execute JavaScript in browser context
```

### Common Test Patterns

#### 1. Tab Navigation Testing
```bash
# Open dashboard
agent-browser open http://localhost:3002/admin/rainbow

# Take snapshot to find tab references
agent-browser snapshot -i

# Navigate to Understanding tab (Chat Simulator)
agent-browser click @understanding-tab
agent-browser eval "window.location.hash"  # Verify hash is #understanding

# Navigate to Settings tab
agent-browser click @settings-tab
agent-browser eval "window.location.hash"  # Verify hash is #settings
```

#### 2. Form Submission Testing
```bash
# Fill form fields
agent-browser fill @message-input "Hello, I need help with booking"
agent-browser click @send-button

# Verify response appears
agent-browser snapshot -i
agent-browser get text @response-area
```

#### 3. Modal/Dialog Testing
```bash
# Open modal
agent-browser click @add-intent-button

# Verify modal visible
agent-browser snapshot -i
agent-browser eval "document.querySelector('.modal').style.display"

# Fill modal form
agent-browser fill @intent-name-input "new_intent"
agent-browser click @save-button

# Verify modal closed
agent-browser eval "document.querySelector('.modal').style.display"
```

#### 4. Data Loading Verification
```bash
# Check if data loaded
agent-browser snapshot -i
agent-browser get text @intent-count
agent-browser eval "document.querySelectorAll('.intent-row').length"
```

### Example Test Sequence: Chat Simulator

**Story**: Verify Chat Simulator shows intent classification

```bash
# 1. Navigate to dashboard
agent-browser open http://localhost:3002/admin/rainbow

# 2. Go to Understanding tab
agent-browser snapshot -i
agent-browser click @understanding-tab

# 3. Send test message
agent-browser fill @chat-input "I want to book a capsule"
agent-browser click @send-chat-button

# 4. Verify response appears
agent-browser snapshot -i
agent-browser get text @chat-response-area

# 5. Verify intent classification displayed
agent-browser eval "document.querySelector('.detected-intent').textContent"
# Expected: Should contain "booking_inquiry" or similar

# 6. Check tier classification
agent-browser eval "document.querySelector('.tier-badge').textContent"
# Expected: Should show T2, T3, or T4
```

### Example Test Sequence: Workflow Editor

**Story**: Verify workflow editor can create new workflow

```bash
# 1. Navigate to Settings tab
agent-browser open http://localhost:3002/admin/rainbow#settings

# 2. Find workflow section
agent-browser snapshot -i

# 3. Click add workflow button
agent-browser click @add-workflow-button

# 4. Fill workflow details
agent-browser fill @workflow-name "test_workflow"
agent-browser fill @workflow-trigger "booking_inquiry"

# 5. Add workflow step
agent-browser click @add-step-button
agent-browser fill @step-action "send_message"
agent-browser fill @step-message "Hello! I can help with bookings."

# 6. Save workflow
agent-browser click @save-workflow-button

# 7. Verify workflow appears in list
agent-browser snapshot -i
agent-browser eval "Array.from(document.querySelectorAll('.workflow-name')).map(el => el.textContent)"
# Expected: Array should include "test_workflow"
```

### Tab Hash Reference

The Rainbow dashboard uses hash-based navigation:

| Tab | Hash | Purpose |
|-----|------|---------|
| Understanding | `#understanding` | Chat Simulator, Intent Testing |
| Settings | `#settings` | Configuration, Workflows, Intents |
| Conversations | `#conversations` | WhatsApp message history |
| Help | `#help` | Documentation, API reference |
| Responses | `#responses` | Response templates, KB entries |

### Agent-Browser Session Best Practices

1. **Use unique session names**: `absession ralph-us-026` before first command
2. **Avoid screenshots for API checks**: Use `eval` or `get text` instead
3. **Wait for DOM updates**: Use `eval` to check element state after interactions
4. **Verify navigation**: Always check `window.location.hash` after tab clicks
5. **Capture snapshots before interactions**: Use `snapshot -i` to find @refs

### When to Use Agent-Browser

**MUST use for**:
- Tab navigation changes
- Form submission flows
- Intent testing interface changes
- Workflow editor modifications
- Response template editor changes
- Any DOM manipulation or UI state changes

**Optional for**:
- Backend-only changes (API routes, data files)
- TypeScript type changes
- Configuration file updates (unless UI displays them)

### 6. Update prd.json
If ALL checks pass:
```bash
# Mark story as complete
jq '(.userStories[] | select(.id == "STORY_ID") | .passes) = true' prd.json > prd.json.tmp
mv prd.json.tmp prd.json
```

If checks fail, leave `passes: false`

### 7. Consolidate Codebase Patterns

If you discover a **reusable pattern**, add it to the `## Codebase Patterns` section at the TOP of `progress.txt`:

```
## Codebase Patterns
- Example: Use IPipelineContext for DI in pipeline stages
- Example: Localhost-only endpoints use IP check instead of auth
- Example: Always test intents in Chat Simulator before committing
```

Only add patterns that are **general and reusable**, not story-specific details.

### 8. Document Learnings
Append to `progress.txt`:
```markdown
## Iteration [N] - Story: [STORY_TITLE]

### What was implemented
- [Specific changes made]

### Patterns discovered
- [Any patterns found in the codebase]

### Gotchas
- [Things to watch out for]

### Useful context for future iterations
- [File locations, component structure, etc.]
```

### 9. Update CLAUDE.md Files
Update relevant CLAUDE.md files with:
- Patterns: "This codebase uses X pattern for Y feature"
- Gotchas: "When changing X, must also update Y"
- Context: "The settings panel is located in components/settings/"
- Conventions: "All API routes follow RESTful pattern"

### 10. Commit Changes
```bash
git add -A
git commit -m "feat: [story title]

[Brief description of changes]

Story ID: [STORY_ID]
Acceptance criteria met:
- [x] Criterion 1
- [x] Criterion 2

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

## Context Between Iterations

Each Ralph iteration is a **fresh Claude instance**. The only memory is:
- **Git history**: All previous commits
- **progress.txt**: Learnings from previous iterations (read Codebase Patterns section FIRST)
- **prd.json**: Which stories are complete
- **CLAUDE.md files**: Discovered patterns and conventions

Read these files FIRST to understand what previous iterations learned.

## Project-Specific Context

### PelangiManager Architecture
- **3 modules**: client/ (React SPA, port 3000), server/ (Express API, port 5000), RainbowAI/ (MCP server, port 3002)
- **Import boundaries**: RainbowAI/ has ZERO imports from server/, client/, or shared/. They communicate via HTTP only.
- **Database**: PostgreSQL (Neon) + Drizzle ORM. Falls back to in-memory storage.
- **AI**: NVIDIA Kimi K2.5 + Ollama + OpenRouter for LLM calls
- **WhatsApp**: Baileys (direct connection, no Evolution API)

### Rainbow AI Classification Pipeline
- **4 tiers**: T1 (Emergency regex) → T2 (Fuzzy keywords) → T3 (Semantic similarity) → T4 (LLM fallback)
- **Pipeline stages**: summarization → kb-loading → tier-classification → layer2-fallback → routing → action-dispatch
- **DI interface**: IPipelineContext in pipeline-context.ts — all stages receive this instead of importing directly
- **Routing**: intents.ts classifies; routing.json decides the action type

### Quality Check Commands
```bash
cd RainbowAI && npx tsc --noEmit       # TypeScript (RainbowAI)
node RainbowAI/scripts/run-intent-test.mjs  # 50-scenario accuracy test (needs port 3002)
npm run build                            # Production build
```

### Key Data Files
| File | Purpose |
|------|---------|
| `RainbowAI/src/assistant/data/routing.json` | Intent → action mapping |
| `RainbowAI/src/assistant/data/workflows.json` | Workflow step definitions |
| `RainbowAI/src/assistant/data/knowledge.json` | Static reply templates |
| `RainbowAI/src/assistant/data/intent-keywords.json` | T2 fuzzy match keywords |
| `RainbowAI/src/assistant/data/intent-examples.json` | T3 semantic match examples |
| `RainbowAI/src/assistant/data/regex-patterns.json` | T1 emergency regex patterns |
| `RainbowAI/src/assistant/data/intent-tiers.json` | Tier enable/disable config |

### Dashboard URL
- Main: `http://localhost:3002/admin/rainbow`
- Tabs: #understanding (Test Console), #settings, #conversations, #help

## Stop Conditions

**Exit this iteration when:**
1. Story implemented and all checks pass → Mark `passes: true`, commit, document, EXIT
2. Checks fail after multiple attempts → Leave `passes: false`, document failure, EXIT
3. Story is too large for one iteration → Document in progress.txt, suggest splitting, EXIT

**DO NOT:**
- Implement multiple stories in one iteration
- Continue working if quality checks fail
- Make changes outside the scope of the current story
- Skip documentation or quality checks

## Remember

- You are ONE iteration in an autonomous loop
- Focus on ONE story at a time
- Quality > Speed (broken code compounds across iterations)
- Document everything (future iterations depend on it)
- Read Codebase Patterns in progress.txt BEFORE starting
- Exit cleanly so Ralph can spawn the next iteration

Now, read `prd.json` and `progress.txt`, pick the next story, and implement it!
