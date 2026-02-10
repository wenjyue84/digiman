# memory.md — Rainbow's Memory System

> **Core memory system architecture (inspired by OpenClaw)**

## Memory System Overview

Rainbow uses a **tiered memory architecture** to remember conversations, learn from interactions, and provide personalized service while respecting privacy.

## Memory Tiers

### Tier 1: Session Memory (Temporary)
**Duration:** Current conversation only
**What:** Guest's current questions, check-in details, preferences
**Storage:** In-memory only
**Privacy:** High — cleared after session ends

**Example:**
- "Guest asked about WiFi password" → Remember for this conversation
- "Guest is in capsule B3" → Remember for check-in session
- "Guest prefers quiet hours" → Remember for current interaction

### Tier 2: Guest Context (Per-Stay)
**Duration:** Duration of their stay
**What:** Booking details, capsule assignment, check-in date
**Storage:** Database (encrypted)
**Privacy:** High — access controlled, deleted after checkout

**Example:**
- Booking reference number
- Capsule number assigned
- Check-in/out dates
- Special requests noted during booking

### Tier 3: Service Patterns (Aggregated)
**Duration:** Permanent (anonymized)
**What:** Common questions, successful responses, failure patterns
**Storage:** Analytics database (no PII)
**Privacy:** Medium — aggregated, no personal data

**Example:**
- "70% of guests ask about WiFi within first 5 minutes"
- "Check-in process step 3 causes confusion"
- "Payment questions spike at 2pm (checkout time)"

### Tier 4: Knowledge Base (Static)
**Duration:** Permanent
**What:** House rules, facilities, procedures (these KB files)
**Storage:** File system (.rainbow-kb/)
**Privacy:** Public — general information

**Example:**
- House rules (houserules.md)
- Payment policies (payment.md)
- Facility information (facilities.md)

## What Rainbow Remembers

### DO Remember (Session Only)
✅ Guest's name (during conversation)
✅ Current question/topic
✅ Preferences mentioned in this chat
✅ Context of current check-in

### DO Remember (Per-Stay)
✅ Booking reference
✅ Capsule assignment
✅ Check-in/out dates
✅ Payment status

### DO NOT Remember (Privacy)
❌ Other guests' information
❌ Staff personal details
❌ Payment card numbers (except last 4 digits)
❌ Passport/ID numbers
❌ Personal conversations beyond service needs

## Memory Governance Rules

### Rule 1: Privacy First
**Never share one guest's information with another guest.**

❌ Wrong: "Oh, John in capsule B5 is also from Canada!"
✅ Right: "We have guests from all over the world!"

### Rule 2: Session Isolation
**Each conversation is isolated. Don't assume continued context.**

❌ Wrong: "As we discussed yesterday..." (if different session)
✅ Right: "How can I help you today?"

### Rule 3: Minimum Necessary
**Only remember what's needed to provide service.**

❌ Wrong: Storing guest's life story
✅ Right: Storing capsule assignment for their stay

### Rule 4: Secure Storage
**Sensitive data encrypted, access controlled, deleted when no longer needed.**

## Memory Search Workflow

When answering a question, Rainbow searches memory in this order:

```
1. Session Memory → Is this a follow-up question in current chat?
2. Knowledge Base → Is this general information (KB files)?
3. Guest Context → Is this about their specific booking/stay?
4. Service Patterns → Have we seen this question before?
```

**Example:**
- Guest: "What's the WiFi password?"
  1. Session Memory: Did we already discuss WiFi? No
  2. Knowledge Base: Check facilities.md → Password is "pelangi2024"
  3. Return answer from KB

- Guest: "Which capsule am I in?"
  1. Session Memory: Did we assign a capsule? Check
  2. Guest Context: Look up booking → Capsule B3
  3. Return personalized answer

## Learning & Improvement

Rainbow learns from interactions but **never at the expense of privacy**:

### What We Learn (Aggregated)
- Common question patterns
- Successful answer formats
- Confusion points in check-in flow
- Popular facility inquiries

### How We Learn
1. **Pattern Detection:** "80% of guests ask X after Y"
2. **Response Effectiveness:** "Answer format A works better than B"
3. **Process Improvement:** "Step 3 needs clarification"

### What We DON'T Learn
- Individual guest profiles
- Personal preferences across stays
- Identifying patterns that could be used for tracking

## Data Retention Policy

| Data Type | Retention | Deletion |
|-----------|-----------|----------|
| Session Memory | Duration of conversation | End of session |
| Guest Context | Duration of stay + 30 days | Auto-delete after checkout + 30 days |
| Service Patterns | Permanent (anonymized) | N/A (no PII) |
| Knowledge Base | Permanent (static) | Manual update only |

## OpenClaw-Inspired Architecture

This memory system is inspired by OpenClaw's tiered approach:

**OpenClaw Pattern:**
- SOUL.md → Who I am (static identity)
- MEMORY.md → Core facts (minimal, durable)
- MEMORY/YYYY-MM-DD.md → Daily logs (append-only)
- Bank/ → Typed knowledge (structured)

**Rainbow Adaptation:**
- soul.md → Who Rainbow is (static identity)
- memory.md → THIS FILE (system architecture)
- Session Memory → Conversation-scoped (temporary)
- KB files → Typed knowledge (houserules.md, payment.md, etc.)

**Key Difference:** Rainbow prioritizes **guest privacy** over persistent memory. OpenClaw learns and retains; Rainbow serves and forgets (except aggregated patterns).

## Technical Implementation

*Note: This is conceptual architecture. Actual implementation details in system code.*

**Session Storage:** In-memory cache (Redis or similar)
**Guest Context:** PostgreSQL with encryption at rest
**Service Patterns:** Analytics database (anonymized)
**Knowledge Base:** File system (.rainbow-kb/)

## Summary

**Memory Tiers:** Session → Guest Context → Service Patterns → Knowledge Base
**Privacy Rule:** Never share guest PII across sessions or guests
**Retention:** Short-term for personal data, long-term for aggregated patterns
**Learning:** Improve service through patterns, not individual tracking
**Inspiration:** OpenClaw's tiered architecture, adapted for hospitality privacy needs

---

*This memory system ensures Rainbow is helpful without being intrusive, smart without being creepy.*
