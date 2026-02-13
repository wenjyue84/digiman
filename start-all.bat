@echo off
echo ================================================
echo  PelangiManager - Start All Servers
echo ================================================
echo.

echo [1/5] Killing old processes...
npx kill-port 3000 5000 3002

echo.
echo [2/5] Starting backend and frontend...
start "PelangiManager - Frontend & Backend" cmd /k "npm run dev"

echo.
echo [3/5] Waiting for backend to initialize...
timeout /t 8 /nobreak > nul

echo.
echo [4/5] Starting MCP server...
start "PelangiManager - Rainbow AI" cmd /k "cd RainbowAI && npm run dev"

echo.
echo [5/5] Waiting for MCP server to initialize...
timeout /t 5 /nobreak > nul

echo.
echo ================================================
echo  Opening Rainbow Dashboard...
echo ================================================
start http://localhost:3002/dashboard

echo.
echo Done! Check the command windows for any errors.
echo.
echo Servers running:
echo  - Frontend:    http://localhost:3000
echo  - Backend API: http://localhost:5000
echo  - Rainbow AI:  http://localhost:3002
echo.
pause
