# Register Fleet Manager in Windows Task Scheduler
$batPath = "C:\Users\Jyue\Documents\1-projects\Projects\digiman\fleet-manager-startup.bat"

$action   = New-ScheduledTaskAction -Execute $batPath
$trigger  = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 0)

Register-ScheduledTask `
  -TaskName    "FleetManager-digiman" `
  -Action      $action `
  -Trigger     $trigger `
  -Settings    $settings `
  -Description "Starts Fleet Manager dashboard on localhost:9999 at login" `
  -Force

Write-Host "Fleet Manager registered in Task Scheduler." -ForegroundColor Green
Write-Host "It will start automatically at next login." -ForegroundColor Green
