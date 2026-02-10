# Restart MCP Server Script
Write-Host "Stopping processes on port 3002..." -ForegroundColor Yellow

# Get all processes using port 3002
$connections = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        $pid = $conn.OwningProcess
        Write-Host "  Killing PID $pid..." -ForegroundColor Cyan
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "  No process found on port 3002" -ForegroundColor Green
}

# Wait for port to be released
Start-Sleep -Seconds 2

# Verify port is free
$stillAlive = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue
if ($stillAlive) {
    Write-Host "`nWARNING: Port 3002 is still in use!" -ForegroundColor Red
    Write-Host "You may need to restart this script with Administrator privileges." -ForegroundColor Red
    Write-Host "`nTo run as admin:" -ForegroundColor Yellow
    Write-Host "  Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    Write-Host "  Then run: .\restart-mcp.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nPort 3002 is now free!" -ForegroundColor Green
Write-Host "Starting MCP server..." -ForegroundColor Yellow

# Start the server
Set-Location $PSScriptRoot
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "npm run dev"

Write-Host "`nMCP server starting in new window..." -ForegroundColor Green
Write-Host "Wait 5 seconds then visit: http://localhost:3002/admin/rainbow" -ForegroundColor Cyan
