@echo off
echo ================================================
echo  Southern Homestay - Start Local Standby Servers
echo ================================================
echo.

echo [1/6] Killing old processes on ports 8000, 8001, 8002...
npx kill-port 8000 8001 8002

echo.
echo [2/6] Starting Southern Manager backend (port 8001)...
echo        Loads credentials from .env.southern.local
start "Southern - Backend (port 8001)" cmd /k "npx dotenv-cli -e .env.southern.local -- npx cross-env SKIP_VITE_MIDDLEWARE=true tsx watch --clear-screen=false server/index.ts"

echo.
echo [3/6] Waiting for backend to initialize...
timeout /t 8 /nobreak > nul

echo.
echo [4/6] Starting Southern Manager frontend (Vite port 8000)...
start "Southern - Frontend (port 8000)" cmd /k "npx cross-env VITE_PORT=8000 BACKEND_PORT=8001 MCP_SERVER_PORT=8002 vite"

echo.
echo [5/6] Waiting for frontend to initialize...
timeout /t 4 /nobreak > nul

echo.
echo [6/6] Starting Southern Rainbow AI standby (port 8002)...
echo        Loads credentials from RainbowAI/.env.southern.local
start "Southern - Rainbow AI (port 8002)" cmd /k "cd RainbowAI && npx dotenv-cli -e .env.southern.local -- npx tsx watch --ignore src/public src/index.ts"

echo.
echo ================================================
echo  Southern local standby servers started!
echo.
echo  IMPORTANT: These are STANDBY servers.
echo  They will NOT reply to WhatsApp guests until
echo  rainbow.southern-homestay.com is unreachable
echo  for 60+ seconds (RAINBOW_ROLE=standby in env).
echo.
echo  Manager UI:   http://localhost:8000
echo  Backend API:  http://localhost:8001/api/health
echo  Rainbow AI:   http://localhost:8002/dashboard
echo ================================================
echo.
pause
