# Claude PC Management & Git Workflow Configuration

## Core Capabilities
I help with **file/folder operations** and **git operations with remote repositories**.

## File & Folder Operations

### Project Structure
```
C:\Users\Jyue\Desktop\PelangiManager\
  ├── client/           # React frontend application
  ├── server/           # Node.js backend API
  ├── shared/           # Shared TypeScript schemas
  ├── docs/             # Project documentation
  ├── archive/          # Backup files from refactoring
  └── tests/            # Test files
```

### File Management Rules
- **Deletions:** Always ask for confirmation before deleting any files
- **Bulk Operations:** Auto-backup when moving/renaming >10 files
- **Project Detection:** Auto-detect project type and organize accordingly
- **800-Line Rule:** Keep files under 800 lines - proactively suggest refactoring if exceeded

### Safety Protocols
- Backup before major file operations
- Never touch system directories without explicit permission
- Always confirm before permanent deletions
- Create archive backups before major refactoring

## Git Operations & Workflow

### Repository Management
- Work primarily on **main** branch
- Support all git operations: clone, commit, push, pull, branch, merge
- **Always run tests before commits/pushes** when available
- Help with merge conflict resolution

### GitHub Integration
- **Setup GitHub CLI (`gh`)** on first use with token authentication
- Help with PR workflow and code review
- Assist with issue tracking and GitHub Actions
- **No auto-repository creation** - only work with existing repos

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
- Run appropriate tests based on project type (npm test, pytest, cargo test, etc.)

### Safety & Confirmations
- **Ask before force pushes** or destructive git operations
- **Ask before all file operations** (moves, renames, deletions)
- Confirm merge conflict resolutions
- Keep user informed of all key decisions
- **Always kill port processes before starting servers** (prevention-first approach)

## Test Commands (Auto-Detection)
- **Node.js:** `npm test` or `npm run test`
- **Build:** `npm run build`
- **Development:** `npm run dev`
- **Linting:** `npm run lint` (run before commits)
- **Type Check:** `npm run typecheck` (run before commits)

## Workflow Integration
1. **File Operations:** Organize → Backup → Execute → Confirm
2. **Git Operations:** Review Code → Run Tests → Commit → Push → PR Support
3. **Issue Management:** Create issues for bugs, track progress
4. **PR Workflow:** Help create, review, and manage pull requests

## User Communication
- Always inform about key decisions being made
- Provide clear status updates during operations  
- Ask for confirmation on destructive actions
- Keep detailed logs of all operations performed

## React Development Experience

### Component Size Management (800-Line Rule)
**USER GUIDELINE:** "Keep files less than 800 lines, if it is more than that then you should check if it is suitable for refactoring and ask me."

**Implementation:**
- Monitor file sizes during development
- Proactively identify files approaching 800 lines
- Ask user before files exceed 800 lines if refactoring would be beneficial
- Apply conservative component extraction approach
- Focus on logical separation of concerns
- Maintain existing functionality during refactoring

### Refactoring Best Practices
1. **Conservative Approach:** One component at a time, test between changes
2. **Backup Strategy:** Always create backup before starting refactoring
3. **Logical Extraction:** Extract complete logical sections, not arbitrary code blocks
4. **Form Integration:** Maintain react-hook-form integration seamlessly
5. **Type Safety:** Ensure all extracted components are properly typed
6. **Testing:** Verify HMR works and functionality is preserved after each extraction

### React Hooks Violations (Success Case)
**Problem:** "Rendered fewer hooks than expected" error during logout
**Root Cause:** Components with early return statements AFTER calling hooks
**Solution Strategy:**
1. Search for early returns using: `if.*return null;|if.*return \(`
2. Use Task agent for comprehensive codebase analysis
3. Fix by moving conditional logic to JSX return or restructuring component flow

**Key Components Fixed:**
- `global-top-progress.tsx`: Replaced early return with conditional CSS
- `protected-route.tsx`: Moved logic to JSX return
- `daily-notifications.tsx`: Repositioned authentication checks
- `admin-notifications.tsx`: Combined multiple conditions

**Prevention:** Always call hooks at top level before any conditional returns

### Build & Development Server Issues (Success Case)
**Problem:** `ENOENT: no such file or directory, stat 'dist/public/index.html'` when accessing localhost
**Root Cause:** Missing build output directory - application not built for production
**Solution Strategy:**
1. Check project structure and package.json scripts
2. Run `npm run build` to generate dist directory with Vite + esbuild
3. Handle port conflicts with `npx kill-port 5000` 
4. Start development server with `npm run dev`

**Key Steps:**
- Build creates `dist/public/index.html` and assets
- Development server serves from memory, but some paths expect built files
- Always run build command when switching between dev/prod or when encountering missing file errors
- Use background process for dev server to monitor startup

**Prevention:** Always run build command when switching between dev/prod or when encountering missing file errors

## Troubleshooting & Cache Issues

### React Component Caching
**Problem:** Component changes not appearing despite file modifications
**Solution:**
```bash
rm -rf node_modules/.vite && npm run build && npm run dev
```
**Then hard refresh browser:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

### Replit Deployment Cache
**Problem:** Localhost updated but Replit hosting shows old version
**Solution in Replit Shell:**
```bash
rm -rf node_modules/.vite && rm -rf dist && npm run build
```
**Then restart Replit application**

### Port Conflicts (Critical Prevention Pattern)
**Problem:** `EADDRINUSE: address already in use 0.0.0.0:5000` - Application hangs at startup
**Root Cause:** Multiple development server instances or zombie processes occupying port 5000

**Prevention-First Approach (Use This Pattern):**
```bash
# Step 1: Always kill existing processes first
pkill -f "tsx watch" || true
npx kill-port 5000

# Step 2: Then start development server
npm run dev
```

**Proactive Detection:**
- **Warning Signs:** Application shows "Your app is starting" indefinitely
- **Log Pattern:** `Error: listen EADDRINUSE: address already in use 0.0.0.0:5000`
- **Environment:** Most common in Replit, but affects localhost too

**Advanced Recovery (If Basic Kill Fails):**
```bash
# Find and kill all Node.js processes on port 5000
lsof -ti:5000 | xargs kill -9
# Or for Windows:
netstat -ano | findstr :5000
taskkill /PID [PID_NUMBER] /F
```

**Success Verification:**
- ✅ Look for "serving on port 5000" in logs
- ✅ Application loads dashboard successfully  
- ✅ API endpoints respond normally
- ✅ No "EADDRINUSE" errors in console

**When to Use This Pattern:**
- **Before every `npm run dev`** (prevention is better than cure)
- **After git pulls** that might have changed server code
- **When switching between projects** that use the same port
- **In Replit workflows** as standard startup procedure

### Push Notification Dependencies
**Problem:** Missing `express-validator` after git updates
**Solution:**
```bash
npm install express-validator
```

## Documentation References

### When Problems Occur
- **MASTER_TROUBLESHOOTING_GUIDE.MD** - Comprehensive troubleshooting patterns and solutions
- **docs/CLAUDE_PROJECT_NOTES.md** - Development history and refactoring records
- **docs/Storage_System_Guide.md** - Storage architecture documentation
- **docs/System_Architecture_Document.md** - Overall system architecture

### Development Guidelines
- **docs/Development_Guide.md** - Project structure and development practices
- **docs/REFACTORING_TROUBLESHOOTING.md** - Import/export error solutions

## Important Instructions

### Always Follow These Rules
1. **Do what has been asked; nothing more, nothing less**
2. **NEVER create files unless they're absolutely necessary for achieving the goal**
3. **ALWAYS prefer editing an existing file to creating a new one**
4. **NEVER proactively create documentation files (*.md) or README files** unless explicitly requested
5. **Run linting and type-checking** before commits when commands are available
6. **Ask for confirmation** on destructive operations (deletions, force pushes)
7. **Use TodoWrite tool** to track complex multi-step tasks
8. **Refer to documentation files** in docs/ folder when encountering problems

### Code Standards
- Follow existing code patterns and conventions
- Maintain TypeScript type safety
- Use existing libraries (check package.json first)
- Follow security best practices
- Never expose secrets or keys
- Keep components focused and under 800 lines

---
*This configuration prioritizes efficiency while maintaining safety through confirmations on critical operations.*