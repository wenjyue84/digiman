# Ralph Quick Start Guide for PelangiManager

Ralph is now installed! Follow these steps to start autonomous development.

## Prerequisites ✅

- ✅ jq installed
- ✅ Claude Code available
- ✅ Git repository initialized
- ✅ Ralph scripts in `scripts/ralph/`

## Three-Step Process

### Step 1: Create a PRD

In Claude Code, run:

```
Load the prd skill and create a PRD for [describe your feature]
```

**Example:**
```
Load the prd skill and create a PRD for guest loyalty points system
```

Claude will:
- Ask clarifying questions
- Generate detailed requirements
- Save to `tasks/prd-[feature-name].md`

### Step 2: Convert to JSON

```
Load the ralph skill and convert tasks/prd-[feature-name].md to prd.json
```

This creates `prd.json` with structured user stories ready for autonomous execution.

### Step 3: Run Ralph

In your terminal (PowerShell or Git Bash):

```bash
./scripts/ralph/ralph.sh
```

Ralph will:
1. Create feature branch
2. Implement stories one by one
3. Run quality checks (typecheck, tests, build)
4. Commit working changes
5. Update prd.json and progress.txt
6. Repeat until all stories complete

## Monitoring Progress

```bash
# Check which stories are done
cat prd.json | jq '.userStories[] | {id, title, passes}'

# View learnings and progress
cat progress.txt

# See recent commits
git log --oneline -10

# Count remaining stories
cat prd.json | jq '[.userStories[] | select(.passes == false)] | length'
```

## Example: First Feature

Let's say you want to add a guest birthday tracking feature:

```bash
# 1. In Claude Code
Load the prd skill and create a PRD for guest birthday tracking and automatic birthday greetings

# Answer the questions Claude asks

# 2. After PRD is created, convert it
Load the ralph skill and convert tasks/prd-guest-birthday.md to prd.json

# 3. Review the generated prd.json
cat prd.json | jq '.userStories[] | {id, title, priority}'

# 4. Run Ralph
./scripts/ralph/ralph.sh 15

# 5. Monitor progress
tail -f progress.txt

# 6. Check results
git log --oneline
npm test
npm run dev
```

## Tips for Success

### Story Sizing
- ✅ **Good**: Add birthday field to guest model (1-2 files, simple change)
- ✅ **Good**: Create birthday notification component (focused on one component)
- ❌ **Too big**: Build entire birthday celebration system (split into multiple stories)

### Acceptance Criteria
- Be specific and testable
- Include "Verify in browser" for UI changes
- Include "Tests pass" for logic changes
- Cover error cases

### Quality Checks
Ralph runs these automatically:
- `npm run typecheck` - Type checking
- `npm test` - Unit/integration tests
- `npm run build` - Production build

Make sure these commands work before running Ralph!

## Project-Specific Context

### Tech Stack
- Frontend: React 18 + TypeScript + Vite
- Backend: Node.js + Express
- Database: PostgreSQL with Drizzle ORM
- Testing: Jest

### Common Patterns
(Will be populated by Ralph as it discovers patterns in the codebase)

### File Structure
```
client/src/
  components/     - Reusable UI components
  pages/          - Route-based pages
  hooks/          - Custom React hooks
  lib/            - Utilities

server/
  routes/         - API endpoints
  storage/        - Data layer
```

## Troubleshooting

### Ralph exits early
**Check**: `cat prd.json | jq '.userStories[] | select(.passes == false)'`
**Reason**: Story might be too complex or checks failing
**Solution**: Review progress.txt for errors, simplify story if needed

### Quality checks fail
**Check**: Run checks manually: `npm run typecheck && npm test && npm run build`
**Solution**: Fix errors manually, commit, then resume Ralph

### No stories to work on
**Check**: `cat prd.json | jq '.userStories[] | {passes}'`
**Reason**: All stories complete!
**Solution**: Create new PRD for next feature

## Advanced Options

```bash
# Custom number of iterations
./scripts/ralph/ralph.sh 20

# Use Amp instead of Claude Code
./scripts/ralph/ralph.sh --tool amp

# Both options
./scripts/ralph/ralph.sh --tool claude 25
```

## Next Steps

1. **Test Ralph**: Start with a small 2-3 story feature to verify setup
2. **Monitor first run**: Watch the first iteration to catch any issues
3. **Review commits**: Check Ralph's work quality
4. **Iterate**: Create more PRDs and let Ralph build your features!

## Getting Help

- **Ralph guide**: See `scripts/ralph/README.md`
- **PRD examples**: See `scripts/ralph/prd.json.example`
- **Project docs**: See `docs/` folder
- **Troubleshooting**: See `docs/MASTER_TROUBLESHOOTING_GUIDE.md`

---

**Ready to start?**

```
Load the prd skill and create a PRD for [your first feature]
```

Happy autonomous coding! 🤖
