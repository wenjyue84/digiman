# Agents Directory

This directory contains configurations for specialized subagents that can be invoked by Claude Code to perform specific tasks autonomously.

## Available Agents

### 🧪 Tester Agent
**File:** `tester-agent.md`
**Purpose:** Comprehensive testing validation across all layers
**Scope:** Unit tests, integration tests, UI/browser tests, API tests, build validation

**When to Use:**
- After implementing features or fixes
- Before git commits (pre-commit validation)
- On explicit user request
- After refactoring

**Invocation:**
```
Claude: [Uses Task tool with general-purpose agent, loads tester-agent.md config]
```

## Future Agents

Potential agents to add:
- **deployment-agent**: Handle deployment workflows, environment validation
- **security-agent**: Run security scans, vulnerability checks
- **performance-agent**: Benchmark performance, identify bottlenecks
- **documentation-agent**: Generate/update documentation automatically
- **refactor-agent**: Intelligent code refactoring with safety checks

## How Agents Work

1. **Configuration**: Each agent has a `.md` file defining its capabilities, workflows, and tools
2. **Invocation**: Claude Code uses the Task tool to launch agents with specific prompts
3. **Execution**: Agent autonomously uses available tools to complete tasks
4. **Reporting**: Agent returns structured results to Claude/User

## Creating New Agents

When creating a new specialized agent:

1. **Define Clear Scope**: What specific tasks does this agent handle?
2. **List Tools Needed**: Which tools will the agent use?
3. **Document Workflows**: Step-by-step procedures for common scenarios
4. **Provide Examples**: Show invocation examples and expected outputs
5. **Set Boundaries**: What should the agent NOT do?

## Integration with Project

These agents integrate with:
- **SPARC Methodology**: Used in the Review/Test phases
- **BMAD Methodology**: Used in Deploy phase validation
- **Git Workflow**: Pre-commit and pre-push validations
- **CI/CD Pipeline**: Can be adapted for automated testing

---

*Last Updated: 2026-01-28*
