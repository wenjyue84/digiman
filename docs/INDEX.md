# Documentation Index — Progressive Disclosure for AI Agents

**Purpose:** Single entry point for `docs/`. Read this first; then load only the documents relevant to your current task. Do not load all docs at once.

**Convention:** Paths are relative to `docs/`. Example: `fix.md` = `docs/fix.md`.

---

## Layer 0 — Read First (Always)

| Doc | When to read |
|-----|----------------|
| [README.md](README.md) | Quick nav and module pointers. |
| [DEVELOPMENT_REFERENCE.md](DEVELOPMENT_REFERENCE.md) | Architecture, setup, env, and dev workflow. |

**If something is broken:** go to [Layer 1 → Troubleshooting](#layer-1--by-task).

---

## Layer 1 — By Task

Choose one branch; load only the files listed under that branch.

### 1. Something is broken / errors

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [fix.md](fix.md) | Dashboard "Loading...", Rainbow UI not updating, cache/port issues. |
| 2 | [dashboard-loading-fix.md](dashboard-loading-fix.md) | Dashboard loading details (also covered in fix.md). |
| 3 | [MASTER_TROUBLESHOOTING_GUIDE.md](MASTER_TROUBLESHOOTING_GUIDE.md) | Broad issue database and recovery procedures. |
| 4 | [troubleshooting-login-server-error.md](troubleshooting-login-server-error.md) | Login / backend connection errors. |
| 5 | [AUTO-START-BACKEND-FEATURE.md](AUTO-START-BACKEND-FEATURE.md) | Auto-start backend from login page. |
| 6 | [T4-PROVIDER-PERSISTENCE-FIX.md](T4-PROVIDER-PERSISTENCE-FIX.md) | T4 AI provider not persisting in Rainbow. |

### 2. APIs and module boundaries

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [API-CONTRACT.md](API-CONTRACT.md) | Inter-module HTTP APIs (client ↔ server ↔ MCP/Rainbow). |

### 3. Deployment and operations

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [DEPLOYMENT_OPERATIONS.md](DEPLOYMENT_OPERATIONS.md) | General deployment and ops. |
| 2 | [REPLIT_DEPLOYMENT_FALLBACK_SYSTEM.md](REPLIT_DEPLOYMENT_FALLBACK_SYSTEM.md) | Replit-specific deployment. |

### 4. Rainbow AI: intents and classification

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [INTENT-DETECTION-DECISION-TREE.md](INTENT-DETECTION-DECISION-TREE.md) | How intent detection is structured. |
| 2 | [INTENT-DETECTION-EXAMPLES.md](INTENT-DETECTION-EXAMPLES.md) | Example intents and behavior. |
| 3 | [INTENT-DETECTION-NPM-PACKAGES.md](INTENT-DETECTION-NPM-PACKAGES.md) | NPM packages used for intent. |
| 4 | [MULTILINGUAL-INTENT-DETECTION-GUIDE.md](MULTILINGUAL-INTENT-DETECTION-GUIDE.md) | Multilingual intent behavior. |
| 5 | [README-MULTILINGUAL-INTENT.md](README-MULTILINGUAL-INTENT.md) | Multilingual intent overview. |
| 6 | [INTENT-HYBRID-IMPLEMENTATION-PLAN.md](INTENT-HYBRID-IMPLEMENTATION-PLAN.md) | Hybrid intent implementation plan. |
| 7 | [IMPROVEMENT-1-INTENT-ACCURACY.md](IMPROVEMENT-1-INTENT-ACCURACY.md) | Intent accuracy improvement 1. |
| 8 | [IMPROVEMENT-2-INTENT-ACCURACY.md](IMPROVEMENT-2-INTENT-ACCURACY.md) | Intent accuracy improvement 2. |
| 9 | [IMPROVEMENT-3-INTENT-ACCURACY.md](IMPROVEMENT-3-INTENT-ACCURACY.md) | Intent accuracy improvement 3. |

### 5. Rainbow AI: intent manager and templates

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [INTENT-MANAGER-TEMPLATES.md](INTENT-MANAGER-TEMPLATES.md) | Intent manager UI and templates. |
| 2 | [INTENT-MANAGER-TEMPLATES-IMPLEMENTATION.md](INTENT-MANAGER-TEMPLATES-IMPLEMENTATION.md) | Implementation details. |

### 6. Rainbow AI: configuration and settings

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [CONFIGURATION-QUICK-REFERENCE.md](CONFIGURATION-QUICK-REFERENCE.md) | Quick config lookup. |
| 2 | [SETTINGS-CONFIGURATION-REFERENCE.md](SETTINGS-CONFIGURATION-REFERENCE.md) | Settings and JSON templates. |
| 3 | [CONFIGURATION-IMPLEMENTATION-GUIDE.md](CONFIGURATION-IMPLEMENTATION-GUIDE.md) | Implementation and examples. |
| 4 | [OPTIMAL-CONFIGURATION-STRATEGY.md](OPTIMAL-CONFIGURATION-STRATEGY.md) | Strategy and tradeoffs. |
| 5 | [CONFIGURATION-RESEARCH-SUMMARY.md](CONFIGURATION-RESEARCH-SUMMARY.md) | Research summary. |
| 6 | [README-CONFIGURATION-RESEARCH.md](README-CONFIGURATION-RESEARCH.md) | Configuration research overview. |
| 7 | [LLM-SETTINGS-CONSOLIDATION-OPTIONS.md](LLM-SETTINGS-CONSOLIDATION-OPTIONS.md) | LLM settings consolidation. |

### 7. Rainbow AI: settings UI and templates (implementation)

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [SETTINGS-TEMPLATES-IMPLEMENTATION.md](SETTINGS-TEMPLATES-IMPLEMENTATION.md) | How settings templates were implemented. |
| 2 | [SETTINGS-TEMPLATES-VERIFICATION.md](SETTINGS-TEMPLATES-VERIFICATION.md) | Verification of templates. |

### 8. Sentiment and hallucination

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [SENTIMENT-SETTINGS-UI-GUIDE.md](SENTIMENT-SETTINGS-UI-GUIDE.md) | Sentiment settings in UI. |
| 2 | [SENTIMENT-ANALYSIS-TESTING.md](SENTIMENT-ANALYSIS-TESTING.md) | Testing sentiment. |
| 3 | [SENTIMENT-ANALYSIS-IMPLEMENTATION-SUMMARY.md](SENTIMENT-ANALYSIS-IMPLEMENTATION-SUMMARY.md) | Implementation summary. |
| 4 | [PRIORITY-3-HALLUCINATION-PREVENTION.md](PRIORITY-3-HALLUCINATION-PREVENTION.md) | Hallucination prevention. |
| 5 | [PRIORITY-3-HALLUCINATION-RESULTS.md](PRIORITY-3-HALLUCINATION-RESULTS.md) | Results. |
| 6 | [PRIORITY-3-TESTING-GUIDE.md](PRIORITY-3-TESTING-GUIDE.md) | Testing guide. |
| 7 | [PRIORITY-3-IMPLEMENTATION-SUMMARY.md](PRIORITY-3-IMPLEMENTATION-SUMMARY.md) | Implementation summary. |
| 8 | [HALLUCINATION-TEST-RESULTS.md](HALLUCINATION-TEST-RESULTS.md) | Test results. |
| 9 | [IMPROVEMENT-1-SETTINGS-ADDED.md](IMPROVEMENT-1-SETTINGS-ADDED.md) | Settings improvement 1. |
| 10 | [IMPROVEMENT-1-FEEDBACK-SYSTEM.md](IMPROVEMENT-1-FEEDBACK-SYSTEM.md) | Feedback system. |
| 11 | [OPTION-B-IMPLEMENTATION-SUMMARY.md](OPTION-B-IMPLEMENTATION-SUMMARY.md) | Option B implementation. |
| 12 | [OPTION-B-TEST-RESULTS.md](OPTION-B-TEST-RESULTS.md) | Option B test results. |

### 9. WhatsApp

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [whatsapp-unlink-detection.md](whatsapp-unlink-detection.md) | Unlink detection behavior. |
| 2 | [whatsapp-unlink-testing-guide.md](whatsapp-unlink-testing-guide.md) | How to test unlink. |

### 10. Frontend and environment

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [PWA_IMPLEMENTATION_GUIDE.md](PWA_IMPLEMENTATION_GUIDE.md) | PWA features and implementation. |
| 2 | [Permanent_Success_Page_Implementation.md](Permanent_Success_Page_Implementation.md) | Success page implementation. |
| 3 | [ENVIRONMENT_DETECTION_GUIDE.md](ENVIRONMENT_DETECTION_GUIDE.md) | Environment detection usage. |
| 4 | [ENVIRONMENT_DETECTION_SUMMARY.md](ENVIRONMENT_DETECTION_SUMMARY.md) | Summary. |

### 11. Testing and tooling

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [TEST-SUITE-ORGANIZATION.md](TEST-SUITE-ORGANIZATION.md) | How tests are organized. |
| 2 | [AGENT-BROWSER-MULTI-WINDOW-SETUP.md](AGENT-BROWSER-MULTI-WINDOW-SETUP.md) | Multi-window browser setup for agents. |

### 12. Requirements and project notes

| Order | Doc | Use when |
|-------|-----|----------|
| 1 | [System_Requirements_Specification.md](System_Requirements_Specification.md) | System requirements. |
| 2 | [CLAUDE_PROJECT_NOTES.md](CLAUDE_PROJECT_NOTES.md) | Project notes for Claude. |

---

## Layer 2 — Full Hierarchy (Reference)

Use for lookup only; do not load entire tree.

```
docs/
├── INDEX.md                          ← You are here (entry point)
├── README.md                          Layer 0: quick nav
├── DEVELOPMENT_REFERENCE.md           Layer 0: architecture & setup
├── API-CONTRACT.md                    APIs
├── DEPLOYMENT_OPERATIONS.md           Deployment
├── REPLIT_DEPLOYMENT_FALLBACK_SYSTEM.md
├── fix.md                             Troubleshooting
├── dashboard-loading-fix.md
├── MASTER_TROUBLESHOOTING_GUIDE.md
├── troubleshooting-login-server-error.md
├── AUTO-START-BACKEND-FEATURE.md
├── T4-PROVIDER-PERSISTENCE-FIX.md
├── INTENT-DETECTION-DECISION-TREE.md  Intent & multilingual
├── INTENT-DETECTION-EXAMPLES.md
├── INTENT-DETECTION-NPM-PACKAGES.md
├── INTENT-HYBRID-IMPLEMENTATION-PLAN.md
├── MULTILINGUAL-INTENT-DETECTION-GUIDE.md
├── README-MULTILINGUAL-INTENT.md
├── IMPROVEMENT-1-INTENT-ACCURACY.md
├── IMPROVEMENT-2-INTENT-ACCURACY.md
├── IMPROVEMENT-3-INTENT-ACCURACY.md
├── INTENT-MANAGER-TEMPLATES.md        Intent manager UI
├── INTENT-MANAGER-TEMPLATES-IMPLEMENTATION.md
├── CONFIGURATION-QUICK-REFERENCE.md   Configuration
├── CONFIGURATION-IMPLEMENTATION-GUIDE.md
├── CONFIGURATION-RESEARCH-SUMMARY.md
├── README-CONFIGURATION-RESEARCH.md
├── SETTINGS-CONFIGURATION-REFERENCE.md
├── SETTINGS-TEMPLATES-IMPLEMENTATION.md
├── SETTINGS-TEMPLATES-VERIFICATION.md
├── OPTIMAL-CONFIGURATION-STRATEGY.md
├── LLM-SETTINGS-CONSOLIDATION-OPTIONS.md
├── SENTIMENT-SETTINGS-UI-GUIDE.md    Sentiment & hallucination
├── SENTIMENT-ANALYSIS-TESTING.md
├── SENTIMENT-ANALYSIS-IMPLEMENTATION-SUMMARY.md
├── PRIORITY-3-HALLUCINATION-PREVENTION.md
├── PRIORITY-3-HALLUCINATION-RESULTS.md
├── PRIORITY-3-TESTING-GUIDE.md
├── PRIORITY-3-IMPLEMENTATION-SUMMARY.md
├── HALLUCINATION-TEST-RESULTS.md
├── IMPROVEMENT-1-SETTINGS-ADDED.md
├── IMPROVEMENT-1-FEEDBACK-SYSTEM.md
├── OPTION-B-IMPLEMENTATION-SUMMARY.md
├── OPTION-B-TEST-RESULTS.md
├── whatsapp-unlink-detection.md       WhatsApp
├── whatsapp-unlink-testing-guide.md
├── PWA_IMPLEMENTATION_GUIDE.md        Frontend & environment
├── Permanent_Success_Page_Implementation.md
├── ENVIRONMENT_DETECTION_GUIDE.md
├── ENVIRONMENT_DETECTION_SUMMARY.md
├── TEST-SUITE-ORGANIZATION.md         Testing
├── AGENT-BROWSER-MULTI-WINDOW-SETUP.md
├── System_Requirements_Specification.md  Specs & notes
└── CLAUDE_PROJECT_NOTES.md
```

---

## Progressive disclosure rules (for agents)

1. **Start:** Read `INDEX.md` (this file), then at most `README.md` and `DEVELOPMENT_REFERENCE.md` unless the task is narrow.
2. **Task match:** From "Layer 1 — By Task", open only the branch that matches the user request (e.g. troubleshooting → 1; API → 2; deployment → 3).
3. **Order within branch:** Load docs in the order given in the table (1, 2, 3…); stop when the question is answered.
4. **Do not:** Load all of `docs/` or entire Layer 2 in one go. Use Layer 2 only to find a specific filename.
