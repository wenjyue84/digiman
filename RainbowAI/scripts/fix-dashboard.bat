@echo off
echo ================================
echo Dashboard Fix Script
echo ================================
echo.
echo [1/3] Killing port 3002...
npx kill-port 3002
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Starting Rainbow server...
start "Rainbow MCP Server" cmd /c "npm run dev > .rainbow-output.txt 2>&1"
echo Waiting for server to fully initialize...
timeout /t 8 /nobreak >nul

echo.
echo [3/3] Opening dashboard with cache-busting...
start http://localhost:3002/#dashboard?refresh=%RANDOM%

echo.
echo ================================
echo IMPORTANT: Hard refresh browser!
echo Press Ctrl+Shift+R (Windows)
echo or Cmd+Shift+R (Mac)
echo ================================
pause
