@echo off
echo ================================================
echo  digiman - Start All Servers (Full Fleet)
echo ================================================
echo.

echo [1/9] Killing old processes on ALL ports...
npx kill-port 3000 5000 3002 8000 8001 8002 9999

echo.
echo [2/9] Starting Pelangi Manager (frontend + backend)...
powershell -Command "Start-Process cmd -ArgumentList '/k npm run dev' -WorkingDirectory '%CD%'"

echo.
echo [3/9] Waiting for Pelangi backend to initialize...
timeout /t 8 /nobreak > nul

echo.
echo [4/9] Starting Pelangi Rainbow AI standby (port 3002)...
powershell -Command "Start-Process cmd -ArgumentList '/k npx dotenv-cli -e .env.pelangi.local -- npx tsx watch --ignore src/public src/index.ts' -WorkingDirectory '%CD%\RainbowAI'"

echo.
echo [5/9] Waiting for Pelangi Rainbow AI to initialize...
timeout /t 5 /nobreak > nul

echo.
echo [6/9] Starting Southern Manager backend (port 8001)...
powershell -Command "Start-Process cmd -ArgumentList '/k npx dotenv-cli -e .env.southern.local -- npx cross-env SKIP_VITE_MIDDLEWARE=true tsx watch --clear-screen=false server/index.ts' -WorkingDirectory '%CD%'"

echo.
echo [7/9] Starting Southern Manager frontend (Vite port 8000)...
powershell -Command "Start-Process cmd -ArgumentList '/k npx cross-env VITE_PORT=8000 BACKEND_PORT=8001 MCP_SERVER_PORT=8002 vite' -WorkingDirectory '%CD%'"

echo.
echo [8/9] Starting Southern Rainbow AI standby (port 8002)...
timeout /t 5 /nobreak > nul
powershell -Command "Start-Process cmd -ArgumentList '/k npx dotenv-cli -e .env.southern.local -- npx tsx watch --ignore src/public src/index.ts' -WorkingDirectory '%CD%\RainbowAI'"

echo.
echo [9/9] Starting Fleet Manager (port 9999)...
timeout /t 3 /nobreak > nul
powershell -Command "Start-Process cmd -ArgumentList '/k node server.js' -WorkingDirectory '%CD%\fleet-manager'"

echo.
echo ================================================
echo  Opening dashboards...
echo ================================================
start http://localhost:3002/dashboard
timeout /t 2 /nobreak > nul
start http://localhost:9999

echo.
echo Done! Check the command windows for any errors.
echo.
echo Servers running:
echo  PELANGI (local standby)
echo   - Frontend:      http://localhost:3000
echo   - Backend API:   http://localhost:5000
echo   - Rainbow AI:    http://localhost:3002
echo.
echo  SOUTHERN (local standby)
echo   - Frontend:      http://localhost:8000
echo   - Backend API:   http://localhost:8001
echo   - Rainbow AI:    http://localhost:8002
echo.
echo  FLEET MANAGER
echo   - Dashboard:     http://localhost:9999
echo.
echo  NOTE: Local Rainbow AI servers are STANDBY only.
echo  They activate only when Lightsail is unreachable 60s+.
echo.
pause
