@echo off
echo Starting PelangiManager Local Test Environment
echo.

echo [1/3] Cleaning ports...
npx kill-port 3000 5000 3001

echo.
echo [2/3] Starting main app (frontend + backend)...
start "PelangiManager App" cmd /k "npm run dev"

timeout /t 5 /nobreak

echo.
echo [3/3] Starting MCP server (WhatsApp + Scheduler)...
cd mcp-server
start "MCP Server" cmd /k "npm run dev"

echo.
echo ========================================
echo All services starting!
echo ========================================
echo Frontend: http://localhost:3000
echo Backend:   http://localhost:5000
echo MCP:       http://localhost:3001
echo Health:    http://localhost:3001/health
echo ========================================
