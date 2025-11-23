# Troubleshooting: "Server Error" on Login Page

## Problem Summary

When attempting to log in, you see a red error alert with:
- **Title**: "Server Error"
- **Message**: "Something went wrong on our end. Please try again later."

## Root Cause

The error appears because **the backend server is not running or not accessible**. The frontend (Vite dev server) is trying to proxy API requests to the backend, but the connection fails.

## Technical Details

### 1. Architecture Overview
- **Frontend**: Vite dev server (runs on port 3000, or 3001/3002 if port is occupied)
- **Backend**: Express server (should run on port 5000)
- **Proxy**: Vite proxies `/api/*` requests to `http://localhost:5000`

### 2. Error Flow

1. **User clicks "Sign in"** → Frontend makes POST request to `/api/auth/login`
2. **Vite proxy** tries to forward request to `http://localhost:5000/api/auth/login`
3. **Connection fails** → Backend server is not running or not accessible
4. **Error handler** in `client/src/lib/queryClient.ts` (line 114-120) catches the error
5. **Generic error toast** is displayed: "Something went wrong on our end. Please try again later."

### 3. Code Locations

**Error Message Source:**
```114:120:client/src/lib/queryClient.ts
    if (error.message.includes('500:')) {
      toast({
        title: "Server Error",
        description: "Something went wrong on our end. Please try again later.",
        variant: "destructive",
      });
      return;
    }
```

**Vite Proxy Configuration:**
```171:180:vite.config.ts
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/objects': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    },
```

**Backend Server Port:**
```234:240:server/index.ts
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: process.env.NODE_ENV === 'production' ? "0.0.0.0" : "127.0.0.1",
  }, () => {
    log(`serving on port ${port}`);
  });
```

## How to Fix

### Solution 1: Start Both Servers (Recommended)

Run the development command that starts both frontend and backend:

```bash
npm run dev
```

This runs:
- Backend server on port 5000 (`npm run dev:server`)
- Frontend Vite server on port 3000 (`npm run dev:frontend`)

**What to look for:**
- ✅ Backend logs showing: `serving on port 5000`
- ✅ Frontend logs showing: `Local: http://localhost:3000/`
- ✅ No proxy errors in the terminal

### Solution 2: Check if Backend is Running

If you ran `npm run dev` but still see errors:

1. **Check terminal output** - You should see `[server]` logs
2. **Verify port 5000** - Make sure nothing else is using it:
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :5000
   
   # If something is using it, kill it:
   npx kill-port 5000
   ```
3. **Restart the dev servers:**
   ```bash
   npm run dev:clean
   ```

### Solution 3: Check Database Connection

If the backend starts but login still fails, the database might not be connected:

1. **Check database configuration** in your `.env` or `local.env` file
2. **Verify database is running** (if using local PostgreSQL)
3. **Check backend logs** for database connection errors

## Common Scenarios

### Scenario 1: Only Frontend Running
- **Symptom**: Frontend loads, but all API calls fail with proxy errors
- **Fix**: Start backend with `npm run dev:server` or use `npm run dev`

### Scenario 2: Port Conflict
- **Symptom**: Backend fails to start, shows "port already in use"
- **Fix**: 
  ```bash
  npx kill-port 5000
  npm run dev
  ```

### Scenario 3: Backend Crashes on Startup
- **Symptom**: Backend starts then immediately exits
- **Fix**: Check backend logs for errors (database connection, missing env vars, etc.)

### Scenario 4: Wrong Port Configuration
- **Symptom**: Backend runs on different port than expected
- **Fix**: Check `PORT` environment variable or update `vite.config.ts` proxy target

## Verification Steps

After starting both servers, verify everything works:

1. **Check backend health:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"healthy",...}`

2. **Check frontend proxy:**
   - Open browser DevTools → Network tab
   - Try logging in
   - Check if `/api/auth/login` request succeeds (status 200 or 401, not connection errors)

3. **Check terminal logs:**
   - Backend should show: `POST /api/auth/login 200 in XXXms`
   - No `AggregateError` or connection refused errors

## Prevention

To avoid this issue in the future:

1. **Always use `npm run dev`** - This starts both servers together
2. **Check terminal output** - Make sure both `[server]` and `[frontend]` are running
3. **Use `npm run dev:clean`** - Cleans ports before starting if you have port conflicts

## Related Files

- `vite.config.ts` - Frontend proxy configuration
- `server/index.ts` - Backend server setup
- `client/src/lib/queryClient.ts` - Error handling for API requests
- `client/src/components/auth-provider.tsx` - Login function
- `server/routes/auth.ts` - Login endpoint handler




