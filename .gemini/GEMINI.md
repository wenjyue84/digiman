If I cannot solve a problem, I can recommend the user to use Claude Code. If the user agrees, I can call Claude Code to help.

# Gemini-Claude-Gemini Workflow

## Gemini's Role:
- Understand the user's request.
- Perform initial investigation and analysis of the codebase.
- Formulate a detailed plan for problem-solving or feature implementation.
- Present the plan to the user for approval.
- If the plan involves coding, prepare a clear and concise prompt/task for Claude Code.
- Review Claude Code's generated code for correctness, adherence to project conventions, and functionality.
- Provide feedback to Claude Code if necessary.
- Verify the solution (e.g., run tests, check functionality).
- Communicate progress and results to the user.

## Claude Code's Role:
- Receive a specific coding task/prompt from Gemini.
- Generate code based on the provided plan and context.
- Adhere to project conventions and best practices as much as possible.
- Provide the generated code back to Gemini for review.

---

# PelangiManager System Overview

## Project Name:
PelangiManager - Capsule Hostel Management System

## Core Technologies:
- **Frontend:** React 18, TypeScript, shadcn/ui (Radix UI), TailwindCSS, TanStack Query, React Hook Form (Zod validation), Vite, PWA support.
- **Backend:** Node.js (Express.js), TypeScript, Drizzle ORM (in-memory/PostgreSQL), JWT-based authentication (Passport.js, Google OAuth), flexible file storage (local/cloud).
- **Database:** PostgreSQL (production), In-memory (development) with Drizzle ORM for migrations.

## Key Features:
- Guest check-in/check-out management.
- Real-time capsule occupancy and maintenance tracking.
- User authentication (Staff, Admin, Guest roles) with token-based self check-in.
- Administrative dashboard and notification system.
- Dynamic configuration management.
- File upload and management system.
- Mobile-responsive design.

## Deployment:
- Recommended for quick start: Replit.
- Local PostgreSQL setup via Docker.

## Development Guidelines:
- Adherence to an "800-Line Rule" for file size, prompting refactoring for larger files.
- Emphasis on conservative, step-by-step refactoring with testing after each change.

## Recent Major Refactoring Achievements:
- **Client-side `guest-checkin.tsx`:** Reduced from 1344 lines to approximately 864 lines.
- **Admin `check-in.tsx`:** Reduced from 911 lines to 558 lines.
- **Server-side Storage System:** Modularized from 1557 lines to a concise 46 lines, maintaining backward compatibility.

## Relevant API Endpoint (Login):
- `POST /api/auth/login`: Used for user authentication with email/password or username/password.

## Troubleshooting Reference:
- The `MASTER_TROUBLESHOOTING_GUIDE.md` is the primary resource for resolving system issues.

## Operational Guidelines Updates

- **Command Prompt Title:** Remember to use the `title` command to set a meaningful title for the command prompt window, reflecting the current task, to avoid confusion when multiple windows are open.
