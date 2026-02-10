@echo off
echo Killing port 3002...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') DO (
    echo Killing PID: %%P
    taskkill /F /PID %%P /T 2>nul
)

timeout /t 2 /nobreak >nul

echo Starting MCP server...
cd /d "%~dp0"
start "MCP Server" cmd /k "npm run dev"

echo.
echo MCP server should be starting in a new window...
echo Wait 5 seconds then test: http://localhost:3002/admin/rainbow
pause
