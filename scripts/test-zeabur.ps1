$TOKEN = "sk-3rnuwvuwf33q7l44txghfkujzf2yz"
$PROJECT_ID = "6948c99fced85978abb44563"
$DEPLOYMENT_ID = "697a279e560650e56aac8c95"

$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

$query = @"
{
    "query": "query { buildLogs(projectID: \"$PROJECT_ID\", deploymentID: \"$DEPLOYMENT_ID\") { message timestamp } }"
}
"@

Write-Host "Fetching build logs for deployment $DEPLOYMENT_ID..."
Write-Host ""

$result = Invoke-RestMethod -Uri "https://api.zeabur.com/graphql" -Method POST -Headers $headers -Body $query -TimeoutSec 60

if ($result.errors) {
    Write-Host "Errors:" -ForegroundColor Red
    $result.errors | ForEach-Object { Write-Host $_.message -ForegroundColor Red }
} else {
    $logs = $result.data.buildLogs
    Write-Host "Total log entries: $($logs.Count)"
    Write-Host ""
    Write-Host "=== LAST 50 LOG ENTRIES ===" -ForegroundColor Yellow

    # Get first 50 entries (logs are in reverse order, so first = end of build where errors are)
    $lastLogs = $logs | Select-Object -First 50
    foreach ($log in $lastLogs) {
        $msg = $log.message
        if ($msg -match "error|Error|ERROR|failed|Failed|FAILED") {
            Write-Host $msg -ForegroundColor Red
        } elseif ($msg -match "warning|Warning|WARNING") {
            Write-Host $msg -ForegroundColor Yellow
        } else {
            Write-Host $msg
        }
    }
}
