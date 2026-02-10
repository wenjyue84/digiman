# Rainbow Knowledge Base — Progressive Disclosure System

> **Inspired by OpenClaw's tiered memory architecture**

## Overview

This knowledge base uses **progressive disclosure** — the LLM loads only what it needs, when it needs it. This saves tokens and ensures focused, relevant responses.

## Architecture

### Entry Point: AGENTS.md

**Every LLM interaction starts here.**

AGENTS.md provides:
- Critical rules (must follow)
- Knowledge map (what files exist)
- Purpose (why this KB exists)
- Routing table (which files to read for which questions)
- Progressive disclosure rules (when to load what)

### File Structure

```
.rainbow-kb/
├── README.md          # This file (system documentation)
├── AGENTS.md          # ⭐ ENTRY POINT - LLM reads this FIRST
│
├── CORE IDENTITY (Load every time)
│   ├── soul.md        # Who Rainbow is (personality, voice, boundaries)
│   └── users.md       # Who we serve (guest profiles)
│
├── SYSTEM (Internal reference)
│   └── memory.md      # Memory architecture (how to remember)
│
└── TYPED KNOWLEDGE (Load on-demand)
    ├── houserules.md  # House rules and policies
    ├── payment.md     # Pricing, payment, refunds
    ├── checkin.md     # Check-in process details
    ├── facilities.md  # Amenities and services
    └── faq.md         # Common questions and answers
```

## How It Works

### 1. LLM Trigger Flow

```
User asks question
    ↓
LLM reads AGENTS.md (routing table)
    ↓
AGENTS.md says: "For this question type, read [specific files]"
    ↓
LLM reads ONLY those files
    ↓
LLM answers in Rainbow's voice (from soul.md)
```

### 2. Routing Examples

| User Question | AGENTS.md Routes To | Why |
|--------------|-------------------|-----|
| "Who are you?" | soul.md | Identity question |
| "Can I smoke?" | houserules.md | Rule question |
| "How much does it cost?" | payment.md | Pricing question |
| "How do I check in?" | checkin.md, users.md | Process question |
| "Do you have WiFi?" | facilities.md | Amenity question |
| "What time is checkout?" | faq.md | General question |

**Key:** Rainbow doesn't load ALL files. Only what's needed.

### 3. Progressive Disclosure Rules

**Always Load:**
- AGENTS.md (entry point)
- soul.md (Rainbow's voice/personality)

**Load On-Demand:**
- users.md (when understanding user context needed)
- houserules.md (for rule questions)
- payment.md (for pricing questions)
- checkin.md (for check-in process)
- facilities.md (for amenity questions)
- faq.md (for general questions)

**Never Load:**
- Entire KB at once (defeats progressive disclosure purpose)

## Design Principles

### 1. One File, One Purpose

Each file has a **single, clear purpose**:
- soul.md → Identity
- payment.md → Payment info
- houserules.md → Rules

**No overlap.** No duplication.

### 2. Pointers, Not Pastes

Files **reference** each other, don't duplicate content:

```markdown
# soul.md says:
"See houserules.md for official policies"

# NOT:
[Copies entire house rules into soul.md]
```

### 3. Human-Readable First

Files are **markdown, narrative style**:
- Not JSON blobs
- Not database dumps
- Not code

**Why:** Easy to read, edit, and maintain by humans.

### 4. Searchable & Discoverable

Clear:
- Filenames (`payment.md` not `doc-123.md`)
- Section headers
- Table of contents
- Structure

**Why:** LLM and humans can find information quickly.

## File Descriptions

### AGENTS.md (Entry Point)
**Purpose:** Route the LLM to the right files
**When to Read:** EVERY interaction (mandatory)
**Size:** Compact (aim for <100 lines)
**Structure:** Critical context → Map → Purpose → Routing table → Summary

### soul.md (Identity)
**Purpose:** Who Rainbow is (personality, voice, boundaries)
**When to Read:** Every answer (for voice consistency)
**Size:** Medium (~150-300 lines)
**Contains:** Name, gender, role, values, tone examples, boundaries

### users.md (User Context)
**Purpose:** Who our guests are (profiles, needs, pain points)
**When to Read:** When understanding user context needed
**Size:** Medium (~200-400 lines)
**Contains:** User profiles, needs, journey map, communication preferences

### memory.md (System Architecture)
**Purpose:** How Rainbow's memory system works
**When to Read:** Internal reference (rarely by Rainbow herself)
**Size:** Long (~300-500 lines)
**Contains:** Memory tiers, privacy rules, learning patterns, technical architecture

### houserules.md (Rules & Policies)
**Purpose:** Official hostel house rules
**When to Read:** Rule-related questions
**Size:** Long (~400-600 lines)
**Contains:** Quiet hours, smoking, cleanliness, security, conduct, penalties

### payment.md (Financial)
**Purpose:** Pricing, payment methods, refunds
**When to Read:** Payment/pricing questions
**Size:** Long (~400-600 lines)
**Contains:** Rates, deposit, payment methods, cancellation, refunds, FAQs

### checkin.md (Process)
**Purpose:** Check-in procedures and details
**When to Read:** Check-in related questions
**Size:** Long (~400-600 lines)
**Contains:** Check-in flow, requirements, digital vs desk, special situations

### facilities.md (Amenities)
**Purpose:** What the hostel offers
**When to Read:** Facility/amenity questions
**Size:** Long (~400-600 lines)
**Contains:** Capsules, bathrooms, kitchen, common areas, WiFi, laundry, security

### faq.md (General Q&A)
**Purpose:** Quick answers to common questions
**When to Read:** General or unclear questions
**Size:** Very long (~600-800 lines)
**Contains:** Categorized FAQs covering all topics

## Usage Guidelines

### For LLMs (Rainbow)

**On Every Trigger:**
1. ✅ Read AGENTS.md first (mandatory)
2. ✅ Check routing table for question type
3. ✅ Read soul.md (for voice)
4. ✅ Read specific files based on question
5. ✅ Answer in Rainbow's voice

**Never:**
- ❌ Skip AGENTS.md
- ❌ Load entire KB at once
- ❌ Make up information not in KB
- ❌ Answer out of character

### For Humans (Maintainers)

**Updating KB:**
1. ✅ Edit specific file (e.g., payment.md for pricing changes)
2. ✅ Keep AGENTS.md routing table updated
3. ✅ Maintain "one file, one purpose" principle
4. ✅ Use clear headers and structure

**Adding New Knowledge:**
1. ✅ Create new `.md` file if needed (e.g., `events.md`)
2. ✅ Add to AGENTS.md routing table
3. ✅ Reference from relevant files (pointers, not pastes)

**Keeping Compact:**
1. ✅ Remove outdated information
2. ✅ Consolidate duplicate content
3. ✅ Split files if they exceed ~600 lines

## Comparison with OpenClaw

| Aspect | OpenClaw | Rainbow KB |
|--------|----------|-----------|
| Entry Point | AGENTS.md | AGENTS.md ✓ |
| Identity | SOUL.md | soul.md ✓ |
| Memory | MEMORY.md + MEMORY/ logs | memory.md (architecture only) |
| Typed Knowledge | Bank/ (experience, opinions, entities) | Typed .md files (rules, payment, etc.) |
| Privacy | Agent learning allowed | Guest privacy first (no persistent PII) |
| Purpose | Agent's own memory | Service knowledge base |

**Key Difference:** OpenClaw is for agent self-memory (learning, growing). Rainbow KB is for service knowledge (static, privacy-focused).

## Token Efficiency

**Without Progressive Disclosure:**
- Load all 9 files = ~10,000+ tokens per query
- Slow, expensive, unfocused

**With Progressive Disclosure:**
- Load AGENTS.md + soul.md + 1-2 specific files = ~2,000-4,000 tokens
- Fast, cheap, focused

**Savings:** ~60-70% reduction in tokens per query

## Maintenance Schedule

**Daily:** No action needed (automated)
**Weekly:** Review for outdated info (if hostel updates)
**Monthly:** Check file sizes, consolidate if needed
**Quarterly:** Full audit (accuracy, completeness, structure)

## Questions?

**For System Architecture:** See memory.md (this KB's memory system)
**For OpenClaw Inspiration:** See `.claude/agents/identity/` in Jay's workspace
**For Rainbow's Voice:** See soul.md
**For Usage:** See AGENTS.md routing table

---

*This README is for maintainers. Rainbow (the LLM) starts with AGENTS.md, not this file.*
