# Ralph - Autonomous AI Agent Loop

Ralph is an autonomous agent system that runs AI coding tools (Claude Code) repeatedly until all PRD items are complete.

## Quick Start

### 1. Create a PRD

```bash
# In Claude Code, run:
Load the prd skill and create a PRD for [your feature]
```

This will:
- Ask clarifying questions
- Generate detailed requirements
- Save to `tasks/prd-[feature-name].md`

### 2. Convert to JSON

```bash
# In Claude Code, run:
Load the ralph skill and convert tasks/prd-[feature-name].md to prd.json
```

This will:
- Parse the markdown PRD
- Generate `prd.json` with proper structure
- Validate story format

### 3. Run Ralph

```bash
# Default: 10 iterations with Claude Code
./scripts/ralph/ralph.sh

# Custom iterations
./scripts/ralph/ralph.sh 20

# Use Amp instead of Claude Code
./scripts/ralph/ralph.sh --tool amp 15
```

## How It Works

1. **Creates feature branch** (from PRD `branchName`)
2. **Picks highest priority story** where `passes: false`
3. **Spawns fresh AI instance** (Claude Code or Amp)
4. **Implements the story** following `CLAUDE.md` instructions
5. **Runs quality checks** (typecheck, tests, build)
6. **Commits if passing** with descriptive message
7. **Updates prd.json** to mark story as `passes: true`
8. **Appends learnings** to `progress.txt`
9. **Repeats** until all stories pass or max iterations reached

## Files

| File | Purpose |
|------|---------|
| `ralph.sh` | Main bash loop that spawns AI instances |
| `CLAUDE.md` | Prompt template for Claude Code |
| `prd.json` | User stories with completion status |
| `prd.json.example` | Example PRD structure |
| `progress.txt` | Append-only learnings log |
| `../tasks/` | Markdown PRDs |
| `../../archive/` | Previous run archives |

## Key Concepts

### Fresh Context Each Iteration

Each iteration spawns a **new AI instance** with clean context. Memory persists via:
- **Git history**: All previous commits
- **progress.txt**: Learnings and context
- **prd.json**: Story completion status
- **AGENTS.md**: Discovered patterns and conventions

### Small Tasks

Each story should be completable in one context window:

✅ **Right-sized**:
- Add database column + migration
- Create UI component with validation
- Add filter to existing list
- Update API endpoint logic

❌ **Too large** (split these):
- Build entire dashboard
- Add authentication system
- Refactor the API

### Feedback Loops

Ralph only works with quality checks:
- **Typecheck**: Catches type errors
- **Tests**: Verifies behavior
- **Build**: Ensures production readiness
- **Browser verification**: For UI stories

### AGENTS.md Updates

After each iteration, Ralph updates AGENTS.md files with:
- Patterns discovered
- Gotchas encountered
- Useful context for future iterations
- Code conventions

## Monitoring Progress

```bash
# Check story completion
cat prd.json | jq '.userStories[] | {id, title, passes}'

# See learnings
cat progress.txt

# Check git history
git log --oneline -10

# Count remaining stories
cat prd.json | jq '[.userStories[] | select(.passes == false)] | length'
```

## Troubleshooting

### Story not completing

**Symptom**: `passes: false` after multiple iterations

**Causes**:
- Story too large (split into smaller stories)
- Quality checks failing (check test output)
- Missing dependencies (check story dependencies)
- Unclear acceptance criteria

**Solution**:
1. Check `progress.txt` for error messages
2. Review story size and complexity
3. Clarify acceptance criteria
4. Split large stories into smaller ones

### Quality checks failing

**Symptom**: Tests or typecheck fail repeatedly

**Causes**:
- Broken test setup
- Type errors from previous iteration
- Missing dependencies

**Solution**:
1. Fix tests/types manually
2. Commit the fix
3. Resume Ralph

### Context window exceeded

**Symptom**: AI stops mid-implementation

**Causes**:
- Story too large for one context window
- Too much context needed

**Solution**:
1. Split story into smaller pieces
2. Add more detail to `progress.txt` about what was attempted
3. Let next iteration continue

## Customization

### Modify CLAUDE.md

Edit `scripts/ralph/CLAUDE.md` to:
- Add project-specific conventions
- Customize quality check commands
- Add common gotchas
- Include domain knowledge

### Adjust Story Priority

Edit `prd.json` and change `priority` values:
- `1` = Highest (implement first)
- `2` = High
- `3` = Medium
- `4+` = Lower priority

### Change Branch Name

Edit `prd.json`:
```json
{
  "branchName": "feature/your-feature-name"
}
```

## Best Practices

1. **Start small**: Test Ralph with 2-3 simple stories first
2. **Monitor early iterations**: Watch the first few to catch issues
3. **Keep CI green**: Broken code compounds across iterations
4. **Review commits**: Check Ralph's work regularly
5. **Update AGENTS.md**: Keep conventions documented
6. **Split large stories**: Better to have many small stories than few large ones

## Example Workflow

```bash
# 1. Generate PRD
# In Claude Code: "Load the prd skill and create a PRD for guest check-in flow"

# 2. Convert to JSON
# In Claude Code: "Load the ralph skill and convert tasks/prd-guest-check-in.md to prd.json"

# 3. Review prd.json
cat prd.json | jq '.userStories[] | {id, title, priority}'

# 4. Run Ralph
./scripts/ralph/ralph.sh 15

# 5. Monitor progress
tail -f progress.txt

# 6. Check completion
cat prd.json | jq '[.userStories[] | select(.passes == true)] | length'

# 7. Review and test
git log --oneline
npm test
npm run dev
```

## Advanced Usage

### Resume from failure

Ralph automatically resumes from where it left off. Just run again:
```bash
./scripts/ralph/ralph.sh
```

### Archive previous run

Archives are automatic when `branchName` changes. Manual archive:
```bash
mkdir -p archive/$(date +%Y-%m-%d)-old-feature
mv progress.txt archive/$(date +%Y-%m-%d)-old-feature/
mv prd.json archive/$(date +%Y-%m-%d)-old-feature/
```

### Use with Claude Desktop

Install skills globally:
```bash
cp -r skills/prd ~/.claude/skills/
cp -r skills/ralph ~/.claude/skills/
```

Then in Claude Desktop:
```
Load the prd skill and create a PRD for [feature]
Load the ralph skill and convert tasks/prd-[feature].md to prd.json
```

## References

- [Geoffrey Huntley's Ralph article](https://ghuntley.com/ralph)
- [Claude Code documentation](https://docs.anthropic.com/claude-code)
- [PelangiManager project docs](../../docs/)
