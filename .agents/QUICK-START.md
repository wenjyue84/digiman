# Tester Agent Quick Start Guide

## For Users (You)

### Basic Usage

Simply ask Claude to test your code:

```
"Test the check-in flow"
"Run all tests before I commit"
"Validate the new API endpoint"
"Check if my fix broke anything"
```

Claude will automatically launch the tester agent and provide a comprehensive test report.

### What You'll Get

**Test Report Structure:**
1. **Summary**: Pass/fail counts, duration
2. **Test Scope**: What was tested (unit/UI/API/build)
3. **Results**: Detailed breakdown of passing/failing tests
4. **Build Status**: TypeCheck, lint, build validation
5. **Recommendations**: What to do next
6. **Evidence**: Screenshots, logs, stack traces

### Test Modes

**Quick Test** (Default)
```
"Test this feature"
```
- Runs relevant unit tests
- Quick validation
- ~30 seconds

**Full Test** (Pre-commit)
```
"Run full test suite"
```
- All unit tests
- TypeScript validation
- Linting
- Build check
- ~2-3 minutes

**UI Test**
```
"Test the check-in UI flow"
```
- Unit tests for component
- Browser automation testing
- Screenshot validation
- ~1-2 minutes

**API Test**
```
"Test the guest-token endpoint"
```
- Endpoint validation
- Request/response testing
- Error case handling
- ~30-60 seconds

## For Claude (Assistant)

### Invocation Pattern

When user requests testing, use this pattern:

```typescript
Task tool with:
{
  "subagent_type": "general-purpose",
  "description": "Test [feature/scope]",
  "prompt": `You are the tester agent for PelangiManager.

Read and follow the configuration at: .agents/tester-agent.md

**Testing Context:**
- What changed: [describe user's changes]
- Testing scope: [unit/UI/API/build/full]
- Critical paths: [affected user flows]

**Your Mission:**
1. Read .agents/tester-agent.md for procedures
2. Execute appropriate tests based on scope
3. Analyze results thoroughly
4. Generate structured test report using the template
5. Provide actionable recommendations

**Remember:**
- Report Only mode (never auto-fix)
- Use agent-browser skill for UI testing
- Categorize failures by severity
- Be thorough but efficient`
}
```

### Decision Tree

```
User mentions testing?
├─ "test this" → Quick test (affected area)
├─ "run all tests" → Full test suite
├─ "test UI" → Browser testing + unit tests
├─ "test API" → API endpoint validation
├─ "before commit" → Pre-commit validation
└─ Context-based → Infer appropriate scope
```

### Test Scope Detection

| User Says | Test Scope | Commands |
|-----------|------------|----------|
| "Fixed check-in bug" | UI + Unit | `npm test check-in`, agent-browser |
| "Added new endpoint" | API + Unit | `npm test api`, curl/fetch testing |
| "Refactored component" | Unit + Build | `npm test`, `npm run typecheck` |
| "Ready to commit" | Full | All of the above + lint + build |

### Integration Points

**SPARC Workflow:**
```
Spec → Pseudocode → Code → Review → **[INVOKE TESTER]** → Commit
```

**BMAD Workflow:**
```
Blueprint → Model → Assemble → **[INVOKE TESTER]** → Deploy
```

## Examples

### Example 1: Quick Feature Test
```
User: "I added a delete button to capsule settings. Test it."

Claude: [Launches tester agent]
Tester:
  ✓ Reads capsule settings component
  ✓ Runs npm test -- capsule
  ✓ Uses agent-browser to test delete button click
  ✓ Verifies delete confirmation modal
  ✓ Checks API call is made correctly
  ✓ Generates report

Report:
  ✅ Unit tests: 5/5 passed
  ✅ UI test: Delete flow works correctly
  ✅ API test: DELETE /api/capsules/:id succeeds
  🎯 Recommendation: Safe to commit
```

### Example 2: Pre-Commit Full Validation
```
User: "Run full tests before I commit"

Claude: [Launches tester agent with full scope]
Tester:
  ✓ npm test (all tests)
  ✓ npm run typecheck
  ✓ npm run lint
  ✓ npm run build
  ✓ Checks for console errors

Report:
  ✅ 47/47 tests passed
  ✅ TypeScript: No errors
  ⚠️  Lint: 2 warnings (non-blocking)
  ✅ Build: Success (2.3s)
  🎯 Recommendation: Safe to commit
```

### Example 3: Failure Detection
```
User: "Test the guest check-in"

Claude: [Launches tester agent]
Tester:
  ✓ Runs npm test -- check-in
  ✗ Found 2 failing tests
  ✓ Uses agent-browser to test flow
  ✗ Found UI error

Report:
  ❌ 3/5 tests passed, 2 failed

  Failure 1 - CRITICAL:
    File: client/src/pages/check-in.test.tsx:45
    Error: Cannot read property 'capsuleId' of undefined
    Context: Form submission fails when no capsule selected
    Suggested Fix: Add null check before accessing capsuleId

  Failure 2 - HIGH:
    UI Test: Check-in form submission
    Error: Submit button remains disabled after filling form
    Evidence: [screenshot attached]
    Suggested Fix: Review form validation logic

  🚨 Recommendation: Fix critical issues before committing
```

## Tips for Best Results

### For Users
1. **Be specific** about what you want tested
2. **Test after significant changes** to catch regressions early
3. **Always test before committing** to main branch
4. **Review test reports** carefully - they guide your next actions

### For Claude
1. **Always read the config** (.agents/tester-agent.md) before testing
2. **Match scope to changes** - don't over-test or under-test
3. **Use agent-browser for UI** - screenshots are powerful evidence
4. **Provide actionable recommendations** - don't just report failures
5. **Be thorough but efficient** - respect user's time

---

## Troubleshooting

**Q: Tester agent not working?**
A: Ensure `.agents/tester-agent.md` exists and Task tool is available

**Q: Tests taking too long?**
A: Reduce scope - test only affected areas for quick validation

**Q: False positives in reports?**
A: Tester agent documents all failures - use judgment to determine criticality

**Q: Want to add custom tests?**
A: Update `.agents/tester-agent.md` with new test commands or procedures

---

*Ready to test with confidence! 🧪*
