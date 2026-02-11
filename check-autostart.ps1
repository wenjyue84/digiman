# Check Task Scheduler for PelangiManager
Write-Host "`n=== Checking Task Scheduler ===" -ForegroundColor Cyan
$tasks = Get-ScheduledTask | Where-Object {$_.TaskName -match 'pelangi' -or $_.TaskPath -match 'pelangi'}
if ($tasks) {
    $tasks | Format-Table TaskName, State, TaskPath -AutoSize
} else {
    Write-Host "No PelangiManager tasks found in Task Scheduler" -ForegroundColor Yellow
}

# Check Registry Run keys
Write-Host "`n=== Checking Registry Run Keys ===" -ForegroundColor Cyan
$runKeys = @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"
)

foreach ($key in $runKeys) {
    Write-Host "`nChecking: $key" -ForegroundColor Gray
    $values = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
    if ($values) {
        $values.PSObject.Properties | Where-Object {$_.Value -match 'pelangi'} | ForEach-Object {
            Write-Host "  Found: $($_.Name) = $($_.Value)" -ForegroundColor Green
        }
    }
}

# Check if start-dev.bat is in Startup folder
Write-Host "`n=== Checking Startup Folder ===" -ForegroundColor Cyan
$startupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
Get-ChildItem $startupPath -Filter "*.lnk" | ForEach-Object {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($_.FullName)
    if ($shortcut.TargetPath -match 'pelangi' -or $shortcut.Arguments -match 'pelangi') {
        Write-Host "  Found: $($_.Name)" -ForegroundColor Green
        Write-Host "    Target: $($shortcut.TargetPath)" -ForegroundColor Gray
        Write-Host "    Args: $($shortcut.Arguments)" -ForegroundColor Gray
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
