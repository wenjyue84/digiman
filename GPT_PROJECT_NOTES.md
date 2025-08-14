# PelangiManager – GPT Project Notes

Last updated: 2025-08-13

## Project location
- Windows path: `C:\Users\Jyue\Desktop\PelangiManager`
- WSL path: `/mnt/c/Users/Jyue/Desktop/PelangiManager`

## How to run
- Root scripts (from `package.json`):
  - `npm run dev`: Development server (Express + TSX)
  - `npm run build`: Builds client (Vite) and server (esbuild) into `dist`
  - `npm start`: Runs production build
  - Type-check: `npm run check`
  - E2E tests: `npm run test:e2e`

Note: On WSL this environment did not have `npm` installed when checked. Prefer running from Windows terminal/VS Code where Node/NPM is available.

## Routing and Auth
- Router: `wouter`
- Auth context: `client/src/lib/auth.ts` (exports `AuthContext`, `useAuth`, token helpers)
- Provider: `client/src/components/auth-provider.tsx`
- Routes: `client/src/App.tsx`

### Login redirect behavior (implemented)
- Guard component: `client/src/components/protected-route.tsx`
  - If `requireAuth` and user is not authenticated, redirects to `/login?redirect=<encodedPath>` using `wouter`'s `useLocation()`.
- Login page: `client/src/components/login-form.tsx`
  - On successful login (email/password or Google), reads `window.location.search` for `redirect` and navigates there; falls back to `/dashboard`.
  - Success message now says “Redirecting...” (not specifically to dashboard).
- Nav links: 
  - `client/src/components/navigation.tsx`
  - `client/src/components/mobile-bottom-nav.tsx`
  - For items requiring auth, unauthenticated clicks go to `/login?redirect=<targetPath>`.

### Protected routes
- `check-in`, `check-out`, `cleaning`, `settings` are wrapped in `ProtectedRoute` with `requireAuth={true}` in `App.tsx`.

## Recent changes (context)
- Login redirect feature:
  - Edited: `client/src/components/protected-route.tsx`, `client/src/components/login-form.tsx`, `client/src/components/navigation.tsx`, `client/src/components/mobile-bottom-nav.tsx`.
- Checkout page runtime error fix:
  - `client/src/pages/check-out.tsx`: ensure `labels` via `useAccommodationLabels()`.
- Settings > Guest Guide UI updates:
  - Icons added: `client/src/components/settings/GuestGuideTab.tsx` (Lucide icons and colors).
  - Default visibility toggles enabled on first load via `useEffect` across keys:
    - `guideShowAddress`, `guideShowWifi`, `guideShowCheckin`, `guideShowOther`, `guideShowHostelPhotos`, `guideShowGoogleMaps`, `guideShowCheckinVideo`.

## Troubleshooting notes (Claude / MCP)
- Resolved 400/500 API errors in Claude by removing stray `C:\Windows\System32\.mcp.json`.
- A detailed playbook lives at: `C:\Users\Jyue\Desktop\Projects\Agent Memory\Claude MCP troubleshooting.md`

## Tips
- File-size convention: keep any single source file under ~800 lines. If a file exceeds this, alert for refactor (split by feature/component/hook).
- If the app appears stuck at login:
  - Verify the `redirect` query param is present when hitting `/login` from a protected page.
  - Ensure the client reads `window.location.search` (not just router state) for redirect.
  - Check local storage for `auth_token` and the `/api/auth/me` endpoint response.
- For local dev storage mode, the UI shows a Memory/DB indicator in the nav.

Current large files (>800 lines) to consider splitting:
- `server/routes.ts` (~2200 lines): split into route modules (auth, guests, capsules, settings, media).
- `client/src/pages/guest-checkin.tsx` (~865 lines): split by step/section components.
- `client/src/pages/check-in.tsx` (~559 lines) → borderline; watch growth.
- `client/src/components/settings/GuestGuideTab.tsx` (~864 lines): split into smaller subcomponents (Intro, Address, WiFi, Check-in, Other, Links).

