@echo off
REM Quick start for Rainbow AI MCP Server only
echo ================================================
echo  Rainbow AI MCP Server - Quick Start
echo ================================================
echo.

echo [1/2] Killing old process on port 3002...
npx kill-port 3002

echo.
echo [2/2] Starting Rainbow AI MCP Server...
cd RainbowAI
start "Rainbow AI MCP Server" cmd /k "npx dotenv-cli -e .env.pelangi.local -- npx tsx watch --ignore src/public src/index.ts"

echo.
echo ================================================
echo  Opening Rainbow Dashboard...
echo ================================================
timeout /t 3 /nobreak > nul
start http://localhost:3002/#dashboard

echo.
echo Rainbow AI MCP Server starting...
echo Dashboard: http://localhost:3002
echo.
echo Check the "Rainbow AI MCP Server" window for startup logs.
echo.
pause
