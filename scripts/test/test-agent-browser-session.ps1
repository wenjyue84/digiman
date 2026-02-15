# Test Agent-Browser Multi-Window Session Isolation
# Run this script in TWO separate PowerShell windows to verify isolation

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Agent-Browser Session Test" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Load profile functions
. $PROFILE

# Prompt for session name
$sessionName = Read-Host "Enter session name (e.g., window1, window2)"

if ([string]::IsNullOrEmpty($sessionName)) {
    $sessionName = "test-" + (Get-Date -Format "HHmmss")
    Write-Host "Using auto-generated session: $sessionName" -ForegroundColor Yellow
}

# Set session
absession $sessionName

Write-Host ""
Write-Host "Current session:" -ForegroundColor Cyan
abinfo

Write-Host ""
Write-Host "Session files will be created at:" -ForegroundColor Cyan
Write-Host "  /tmp/agent-browser-$sessionName.pid" -ForegroundColor Gray
Write-Host "  /tmp/agent-browser-$sessionName.port" -ForegroundColor Gray
Write-Host ""

# Test opening a page
Write-Host "Opening test page..." -ForegroundColor Yellow
$testUrl = "https://example.com"

try {
    agent-browser open $testUrl --headless
    Write-Host "Successfully opened: $testUrl" -ForegroundColor Green

    Write-Host ""
    Write-Host "Getting page title..." -ForegroundColor Yellow
    $title = agent-browser eval "document.title"
    Write-Host "Page title: $title" -ForegroundColor Green

    Write-Host ""
    Write-Host "Testing complete! Session '$sessionName' is isolated." -ForegroundColor Green

} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "To test isolation:" -ForegroundColor Cyan
Write-Host "1. Open another PowerShell window" -ForegroundColor Gray
Write-Host "2. Run this script again with a DIFFERENT session name" -ForegroundColor Gray
Write-Host "3. Open a different URL (e.g., https://google.com)" -ForegroundColor Gray
Write-Host "4. Verify both windows show different pages" -ForegroundColor Gray
Write-Host ""

Write-Host "Press any key to clean up and exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Optional: Kill the daemon for this session
Write-Host "Cleaning up session..." -ForegroundColor Yellow
agent-browser kill

Write-Host "Done!" -ForegroundColor Green
