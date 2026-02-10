@echo off
echo === Rainbow MCP Server Health Check ===
echo.

echo [1/4] Checking if port 3002 is listening...
netstat -ano | findstr ":3002" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Port 3002 is in use
) else (
    echo ✗ Port 3002 is FREE - server not running!
    echo.
    echo Run: cd mcp-server ^&^& npm run dev
    exit /b 1
)

echo [2/4] Testing health endpoint...
curl -s http://localhost:3002/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Health endpoint responding
) else (
    echo ✗ Health endpoint not responding
    exit /b 1
)

echo [3/4] Testing dashboard HTML...
curl -s http://localhost:3002/admin/rainbow | findstr "Rainbow Admin Dashboard" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Dashboard HTML served correctly
) else (
    echo ✗ Dashboard HTML not found
    exit /b 1
)

echo [4/4] Testing React redirect route...
curl -s http://localhost:3000/admin/rainbow 2>&1 | findstr "Redirecting" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ React redirect route working
) else (
    echo ⚠ React app might not be running on port 3000
)

echo.
echo === All checks passed! ===
echo Rainbow dashboard: http://localhost:3002/admin/rainbow
