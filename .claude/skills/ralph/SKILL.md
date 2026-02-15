---
name: ralph
description: "Convert PRDs to prd.json format for the Ralph autonomous agent system. Use when you have an existing PRD and need to convert it to Ralph's JSON format. Triggers on: convert this prd, turn this into ralph format, create prd.json from this, ralph json."
user-invocable: true
---

# Ralph PRD Converter

Converts existing PRDs to the `prd.json` format that Ralph uses for autonomous execution.

---

## The Job

Take a PRD (markdown file or text) and convert it to `prd.json` in the project root.

---

## Output Format

```json
{
  "productName": "[Feature Name]",
  "branchName": "ralph/[feature-name-kebab-case]",
  "overview": "[Feature description]",
  "goals": ["Goal 1", "Goal 2"],
  "userStories": [
    {
      "id": "US-001",
      "title": "[Story title]",
      "priority": 1,
      "description": "[Full description]",
      "acceptanceCriteria": [
        "Criterion 1",
        "Criterion 2",
        "TypeScript compiles with zero errors"
      ],
      "technicalNotes": ["Note 1"],
      "dependencies": [],
      "estimatedComplexity": "small",
      "passes": false
    }
  ],
  "technicalContext": {
    "affectedAreas": ["path/to/affected/files"],
    "testingStrategy": "TypeScript compilation + agent-browser dashboard verification",
    "rollbackPlan": "git checkout HEAD -- affected/path/"
  }
}
```

---

## Story Size: The Number One Rule

**Each story must be completable in ONE Ralph iteration (one context window).**

### Right-sized stories:
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic
- Add a new workflow action handler
- Add new intent keywords/patterns

### Too big (split these):
- "Build the entire dashboard" → Split into: schema, queries, UI components, filters
- "Add authentication" → Split into: schema, middleware, login UI, session handling
- "Refactor the API" → Split into one story per endpoint or pattern

**Rule of thumb:** If you cannot describe the change in 2-3 sentences, it is too big.

---

## Story Ordering: Dependencies First

Stories execute in priority order. Earlier stories must not depend on later ones.

**Correct order:**
1. Schema/database changes
2. Server actions / backend logic
3. RainbowAI module changes
4. UI components that use the backend
5. Dashboard/testing views

---

## Acceptance Criteria: Must Be Verifiable

### Good criteria (verifiable):
- "Add `status` column to tasks table with default 'pending'"
- "Workflow checks real capsule availability via GET /api/capsules/available"
- "50-scenario accuracy test maintains 100%"
- "TypeScript compiles with zero errors"

### Bad criteria (vague):
- "Works correctly"
- "Good UX"
- "Handles edge cases"

### Always include:
- "TypeScript compiles with zero errors" (every story)
- "Server starts and dashboard loads without errors" (every story)
- "50-scenario accuracy test maintains 100%" (intent/workflow stories)
- "Verify in browser using agent-browser" (UI stories)

---

## PelangiManager-Specific Fields

This project uses an extended prd.json format with:
- `technicalNotes` array (instead of just notes string)
- `dependencies` array (story IDs that must complete first)
- `estimatedComplexity` ("small" | "medium" | "large")
- `technicalContext` object with affectedAreas, testingStrategy, rollbackPlan

---

## Archiving Previous Runs

Before writing a new prd.json, check if there is an existing one:

1. Read the current `prd.json` if it exists
2. Check if `branchName` differs from the new feature
3. If different, archive:
   - Create `archive/ralph/YYYY-MM-DD-feature-name/`
   - Copy current `prd.json` and `progress.txt` to archive

---

## Checklist Before Saving

- [ ] Each story completable in one iteration
- [ ] Stories ordered by dependency
- [ ] Every story has "TypeScript compiles with zero errors"
- [ ] UI stories have "Verify in browser using agent-browser"
- [ ] Intent/workflow stories have "50-scenario accuracy test maintains 100%"
- [ ] Acceptance criteria are verifiable (not vague)
- [ ] No story depends on a later story

## Running Ralph

After creating prd.json:
```bash
./scripts/ralph/ralph.sh          # Run with Claude Code (default)
./scripts/ralph/ralph.sh 20       # Custom max iterations
./scripts/ralph/ralph.sh --dry-run  # Preview stories without executing
```
