# Create startup shortcut for PelangiManager

$startupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$shortcutPath = Join-Path $startupFolder "digiman-Startup.lnk"
$targetPath = "C:\Users\Jyue\Documents-projects\Projects\digiman\startup-prompt-launcher.vbs"

# Create WScript.Shell object
$shell = New-Object -ComObject WScript.Shell

# Create the shortcut
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = "C:\Users\Jyue\Documents-projects\Projects\digiman"
$shortcut.Description = "digiman Startup Prompt"
$shortcut.Save()

Write-Host ""
Write-Host "Startup shortcut created successfully!" -ForegroundColor Green
Write-Host "  Location: $shortcutPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "The prompt will appear on next login/restart." -ForegroundColor Yellow
Write-Host ""
Write-Host "To test it now, run:" -ForegroundColor White
Write-Host "  wscript startup-prompt-launcher.vbs" -ForegroundColor Gray
