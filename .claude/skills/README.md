# PelangiManager Skills Directory

This directory contains project-specific skills for Claude Code to use when working on PelangiManager.

## Available Skills

### database-troubleshooting
Diagnose and fix database connection issues, schema mismatches, and Drizzle ORM sync problems.

**Use when:**
- "Cannot connect to database" errors
- Drizzle Kit shows data-loss warnings
- Schema sync failures
- PostgreSQL/Neon connection issues

**Key insight:** Most "connection failures" are actually schema mismatches!

## Skill Structure

Each skill follows this structure:
```
skill-name/
├── SKILL.md           # Main skill documentation
└── [optional files]   # Supporting scripts, examples, etc.
```

## How Claude Uses Skills

1. User mentions database issues → Claude checks database-troubleshooting skill
2. Skill provides diagnostic workflow and test scripts
3. Claude follows the workflow to identify root cause
4. Claude applies the appropriate fix from the skill

## Adding New Skills

Create a new directory with a `SKILL.md` file containing:
- When to use this skill (triggers)
- Core principles/insights
- Step-by-step workflow
- Code examples
- Troubleshooting checklist
- Real case studies

See `database-troubleshooting/SKILL.md` as a reference template.
