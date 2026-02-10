@echo off
echo Checking if MCP server is running on port 3002...

:: Check if port 3002 is in use
netstat -ano | findstr ":3002" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MCP server is already running on port 3002
    echo Opening Rainbow dashboard...
    start http://localhost:3002/admin/rainbow
    exit /b 0
)

echo Port 3002 is free. Starting MCP server...
cd mcp-server
start "MCP Server" cmd /k npm run dev

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo Opening Rainbow dashboard...
start http://localhost:3002/admin/rainbow
