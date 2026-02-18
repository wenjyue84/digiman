---
name: prd
description: "Generate a Product Requirements Document (PRD) for a new feature. Use when planning a feature, starting a new project, or when asked to create a PRD. Triggers on: create a prd, write prd for, plan this feature, requirements for, spec out."
user-invocable: true
---

# PRD Generator

Create detailed Product Requirements Documents that are clear, actionable, and suitable for autonomous implementation by Ralph.

---

## The Job

1. Receive a feature description from the user
2. Ask 3-5 essential clarifying questions (with lettered options)
3. Generate a structured PRD based on answers
4. Save to `tasks/prd-[feature-name].md`

**Important:** Do NOT start implementing. Just create the PRD.

---

## Step 1: Clarifying Questions

Ask only critical questions where the initial prompt is ambiguous. Focus on:

- **Problem/Goal:** What problem does this solve?
- **Core Functionality:** What are the key actions?
- **Scope/Boundaries:** What should it NOT do?
- **Success Criteria:** How do we know it's done?

### Format Questions Like This:

```
1. What is the primary goal of this feature?
   A. Improve user onboarding experience
   B. Increase user retention
   C. Reduce support burden
   D. Other: [please specify]

2. Who is the target user?
   A. New users only
   B. Existing users only
   C. All users
   D. Admin users only

3. What is the scope?
   A. Minimal viable version
   B. Full-featured implementation
   C. Just the backend/API
   D. Just the UI
```

This lets users respond with "1A, 2C, 3B" for quick iteration.

---

## Step 2: PRD Structure

Generate the PRD with these sections:

### 1. Introduction/Overview
Brief description of the feature and the problem it solves.

### 2. Goals
Specific, measurable objectives (bullet list).

### 3. User Stories
Each story needs:
- **Title:** Short descriptive name
- **Description:** "As a [user], I want [feature] so that [benefit]"
- **Acceptance Criteria:** Verifiable checklist of what "done" means

Each story should be small enough to implement in one focused session (one Ralph iteration).

**Format:**
```markdown
### US-001: [Title]
**Description:** As a [user], I want [feature] so that [benefit].

**Acceptance Criteria:**
- [ ] Specific verifiable criterion
- [ ] Another criterion
- [ ] TypeScript compiles with zero errors
- [ ] **[UI stories only]** Verify in browser using agent-browser
```

**Important:**
- Acceptance criteria must be verifiable, not vague. "Works correctly" is bad. "Button shows confirmation dialog before deleting" is good.
- **For any story with UI changes:** Always include "Verify in browser using agent-browser" as acceptance criteria.

### 4. Functional Requirements
Numbered list: "FR-1: The system must allow users to..."

### 5. Non-Goals (Out of Scope)
What this feature will NOT include.

### 6. Technical Considerations (Optional)
Known constraints, integration points, performance requirements.

### 7. Success Metrics
How will success be measured?

### 8. Open Questions
Remaining questions or areas needing clarification.

---

## PelangiManager-Specific Guidelines

When creating PRDs for this project:

- **Rainbow AI changes** → acceptance criteria should include "50-scenario accuracy test maintains 100%"
- **Workflow changes** → include "Verify workflow in Chat Simulator"
- **Multi-language** → any new template/response needs en, ms, zh variants
- **Import boundaries** → RainbowAI/ must have ZERO imports from server/, client/, shared/
- **Config changes** → use atomic writes (config-store.ts pattern)

---

## Output

- **Format:** Markdown (`.md`)
- **Location:** `tasks/`
- **Filename:** `prd-[feature-name].md` (kebab-case)

**If also writing directly to prd.json** (skipping the Ralph converter):
- Every story MUST have `"passes": false` — Ralph skips stories without this field
- Use the Ralph skill's JSON schema as reference for required fields
