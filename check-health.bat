@echo off
echo ================================================
echo  PelangiManager - Health Check
echo ================================================
echo.

echo [1/3] Frontend (port 3000)...
netstat -ano | findstr ":3000" | findstr LISTENING
if errorlevel 1 (
    echo   ❌ Frontend NOT running on port 3000
) else (
    echo   ✅ Frontend running on port 3000
)

echo.
echo [2/3] Backend API (port 5000)...
curl -s http://localhost:5000/api/health
if errorlevel 1 (
    echo   ❌ Backend API NOT responding
) else (
    echo   ✅ Backend API healthy
)

echo.
echo [3/3] MCP Server (port 3002)...
curl -s http://localhost:3002/health
if errorlevel 1 (
    echo   ❌ MCP Server NOT responding
) else (
    echo   ✅ MCP Server healthy
)

echo.
echo ================================================
echo  Health check complete!
echo ================================================
echo.
echo If any service is down, run: start-all.bat
echo.
pause
