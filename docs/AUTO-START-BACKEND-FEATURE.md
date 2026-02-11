# Auto-Start Backend Feature

## Overview

The login page now includes an intelligent **"Start Backend Server"** button that appears automatically when the backend server is not running. This provides a seamless development experience without requiring manual terminal commands.

## How It Works

### 1. Detection
When you visit `http://localhost:3000/login`, the page attempts to fetch `/api/storage/info` from the backend server on port 5000.

### 2. Error Handling
If the backend is not running, instead of showing a generic error, the login page displays:
- ❌ A clear error message: "Backend Server Not Running"
- 🎯 An explanation: "The backend server on port 5000 is not responding"
- ▶️ A prominent **"Start Backend Server"** button

### 3. One-Click Start
When you click the button:
1. A Vite dev plugin endpoint (`/__dev/start-backend`) is called
2. The plugin kills any existing process on port 5000
3. Starts the backend server using `npm run dev:server`
4. Polls until the backend responds (up to 30 seconds)
5. Shows a success toast notification
6. Automatically refreshes the storage info

### 4. Visual Feedback
- **While starting**: Shows animated spinner with "Starting Backend Server..." (up to 30s)
- **On success**: Green toast notification, error banner disappears
- **On failure**: Shows specific error message

## Technical Implementation

### Files Modified

1. **`vite-plugin-dev-control.ts`** (NEW)
   - Custom Vite plugin that adds `/__dev/start-backend` endpoint
   - Handles process management (kill existing, spawn new)
   - Polls backend health until ready

2. **`vite.config.ts`** (MODIFIED)
   - Imported and registered the `devControlPlugin()`

3. **`client/src/components/login-form.tsx`** (MODIFIED)
   - Added `isStartingBackend` and `backendStartError` state
   - Added `handleStartBackend()` function
   - Added error detection UI with button
   - Added loading spinner UI

### Security Considerations

⚠️ **Development Only**: This feature is only active in development mode via the Vite dev server. The `/__dev/*` endpoints are not available in production builds.

## User Experience Flow

```
┌─────────────────────────────────────┐
│  User opens http://localhost:3000   │
│            /login                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Frontend tries to fetch            │
│  /api/storage/info                  │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌──────────┐   ┌──────────────┐
│ SUCCESS  │   │   FAILURE    │
│          │   │  (Backend    │
│  Normal  │   │  not running)│
│  Login   │   └──────┬───────┘
│  Page    │          │
└──────────┘          ▼
         ┌────────────────────────┐
         │  Show Error Banner:    │
         │  "Backend Not Running" │
         │  [Start Backend] btn   │
         └────────┬───────────────┘
                  │ User clicks
                  ▼
         ┌────────────────────────┐
         │  Call /__dev/          │
         │  start-backend         │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │  Show "Starting..."    │
         │  (animated spinner)    │
         └────────┬───────────────┘
                  │ Wait up to 30s
                  ▼
         ┌────────────────────────┐
         │  Backend Ready!        │
         │  ✅ Success Toast      │
         │  Banner disappears     │
         └────────────────────────┘
```

## Benefits

✅ **No manual commands** - No need to open terminal and run `npm run dev:clean`
✅ **Self-service** - User can fix the issue themselves with one click
✅ **Clear feedback** - Always know what's happening (starting, success, error)
✅ **Seamless UX** - Automatic retry after starting, no page refresh needed
✅ **Error recovery** - If backend crashes, just click to restart

## Fallback Options

If the auto-start button doesn't work, you can still start the backend manually:

### Option 1: Desktop Shortcut
Double-click **`Start-Pelangi.bat`** on your Desktop

### Option 2: Project Script
Run `start-dev.bat` in the project folder

### Option 3: npm Command
```bash
npm run dev:clean
```

## Future Enhancements

Potential improvements:
- [ ] Add "Stop Backend" button when backend is running
- [ ] Show backend server logs in a collapsible panel
- [ ] Add restart backend button (kill + start)
- [ ] Extend to other pages (not just login)
- [ ] Add status indicator in navbar (backend up/down)
