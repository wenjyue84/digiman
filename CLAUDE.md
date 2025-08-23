# PelangiManager Project Rules

## 🧱 Project Standards
- **Package Manager**: Always use `npm` (not pnpm)
- **Build Command**: `npm run build` for production builds
- **Development**: `npm run dev` for development server
- **Testing**: `npm test` for running tests
- **Linting**: `npm run lint` before commits when available
- **Type Checking**: `npm run typecheck` before commits when available

## 🚀 Development Workflow
- **Always kill port processes before starting servers** (prevention-first approach)
- **CRITICAL: ALWAYS REBUILD AFTER FRONTEND CHANGES** - Frontend changes don't reflect without rebuild!
- **800-Line Rule**: Keep files under 800 lines - proactively suggest refactoring if exceeded
- **File Operations**: Always ask for confirmation before deleting any files
- **Git Operations**: Work primarily on **main** branch, use Conventional Commits format

## 🔧 Tech Stack
- **Frontend**: React with TypeScript, Vite build system
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Testing**: Jest for unit tests
- **Styling**: Tailwind CSS

---

## 📚 Imports

### Core Documentation
- `docs/MASTER_TROUBLESHOOTING_GUIDE.md` - Comprehensive troubleshooting patterns
- `docs/CLAUDE_PROJECT_NOTES.md` - Development history and refactoring records
- `docs/DEVELOPMENT_REFERENCE.md` - Project structure and development practices

### On-Demand References
- `docs/Storage_System_Guide.md` - Storage architecture documentation
- `docs/System_Architecture_Document.md` - Overall system architecture
- `docs/REFACTORING_TROUBLESHOOTING.md` - Import/export error solutions

---

## 🎯 Core Capabilities
I help with **file/folder operations** and **git operations with remote repositories**.

## 📁 Project Structure
```
C:\Users\Jyue\Desktop\PelangiManager\
  ├── client/           # React frontend application
  ├── server/           # Node.js backend API
  ├── shared/           # Shared TypeScript schemas
  ├── docs/             # Project documentation
  ├── archive/          # Backup files from refactoring
  └── tests/            # Test files
```

## 🔒 Safety Protocols
- Backup before major file operations
- Never touch system directories without explicit permission
- Always confirm before permanent deletions
- Create archive backups before major refactoring

## 🧪 Test Commands (Auto-Detection)
- **Node.js:** `npm test` or `npm run test`
- **Build:** `npm run build`
- **Development:** `npm run dev`
- **Linting:** `npm run lint` (run before commits)
- **Type Check:** `npm run typecheck` (run before commits)

## 🔄 Enhanced 5-Phase Development Workflow

### Phase 1: Do What's Requested
- Complete the user's specific request
- Implement core functionality with clear, maintainable code
- Focus on correctness and meeting specified requirements
- Always create TodoWrite lists for multi-step tasks

### Phase 2: Automated Testing
- **Primary**: Use `Gemini -p "Test this [feature/component] with valid/invalid inputs, edge cases, and integration scenarios"`
- **Fallback**: Use `@agent-test-runner` if Gemini fails
- Test all functionality, edge cases, and integration points
- Verify code works as expected before proceeding

### Phase 3: Code Review & Quality Assurance
- **Primary**: Use `Gemini -p "Review this code for security vulnerabilities, performance issues, and best practices"`
- **Fallback**: Use `@agent-code-reviewer` if Gemini fails
- Target specific review aspects: Architecture, Performance, Security, Best Practices

### Phase 4: Enhancement & Refinement
- Implement improvements based on Phase 2 and Phase 3 feedback
- Address any issues found during testing
- Optimize code based on review recommendations
- Ensure all changes maintain existing functionality

### Phase 5: Final Iteration & User Testing
- Iterate through Phases 2-4 until all criteria are met
- Present final solution to user for testing
- Explain implementation in simple terms
- Provide clear testing instructions

## 🚨 Critical Troubleshooting Patterns

### Frontend Changes Not Reflecting - Build Artifacts Issue
**CRITICAL REMINDER:** When frontend changes don't appear in the UI, this is almost always a build artifacts issue.

**Solution (Always Remember):**
1. **Stop server** (Ctrl+C or `taskkill /F /IM node.exe`)
2. **Clean build artifacts** (`Remove-Item -Recurse -Force dist`)
3. **Rebuild application** (`npm run build`)
4. **Start fresh server** (`npm run dev`)

### Port Conflicts (Critical Prevention Pattern)
**Prevention-First Approach:**
```bash
# Step 1: Always kill existing processes first
pkill -f "tsx watch" || true
npx kill-port 5000

# Step 2: Then start development server
npm run dev
```

### React Component Caching
**Problem:** Component changes not appearing despite file modifications
**Solution:**
```bash
rm -rf node_modules/.vite && npm run build && npm run dev
```

## 📝 Git Standards

### Commit Standards
- Use **Conventional Commits** format:
  - `feat:` for new features
  - `fix:` for bug fixes  
  - `docs:` for documentation
  - `refactor:` for code refactoring
  - `test:` for tests
  - `chore:` for maintenance

### Code Quality
- **Always perform code review** before commits
- **Auto-create GitHub issues** for bugs found during review
- Run appropriate tests based on project type

## 🎨 React Development Experience

### Component Size Management (800-Line Rule)
**USER GUIDELINE:** "Keep files less than 800 lines, if it is more than that then you should check if it is suitable for refactoring and ask me."

### Refactoring Best Practices
1. **Conservative Approach:** One component at a time, test between changes
2. **Backup Strategy:** Always create backup before starting refactoring
3. **Logical Extraction:** Extract complete logical sections, not arbitrary code blocks
4. **Form Integration:** Maintain react-hook-form integration seamlessly
5. **Type Safety:** Ensure all extracted components are properly typed
6. **Testing:** Verify HMR works and functionality is preserved after each extraction

## ⚠️ Important Instructions

### Always Follow These Rules
1. **Do what has been asked; nothing more, nothing less**
2. **NEVER create files unless they're absolutely necessary for achieving the goal**
3. **ALWAYS prefer editing an existing file to creating a new one**
4. **NEVER proactively create documentation files (*.md) or README files** unless explicitly requested
5. **Run linting and type-checking** before commits when commands are available
6. **Ask for confirmation** on destructive operations (deletions, force pushes)
7. **Use TodoWrite tool** to track complex multi-step tasks
8. **Refer to documentation files** in docs/ folder when encountering problems
9. **ALWAYS kill port processes before starting servers** (prevention-first approach)
10. **CRITICAL: ALWAYS REBUILD AFTER FRONTEND CHANGES**

### Code Standards
- Follow existing code patterns and conventions
- Maintain TypeScript type safety
- Use existing libraries (check package.json first)
- Follow security best practices
- Never expose secrets or keys
- Keep components focused and under 800 lines

---

*This configuration prioritizes efficiency while maintaining safety through confirmations on critical operations.*