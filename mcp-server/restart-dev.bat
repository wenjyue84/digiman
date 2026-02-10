@echo off
echo Stopping MCP server on port 3002...
npx kill-port 3002 >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting MCP server in dev mode...
start /b npm run dev

echo.
echo MCP server restarting... Wait 5 seconds then visit:
echo http://localhost:3002/admin/rainbow/status
timeout /t 5 /nobreak >nul
