# Get Zeabur Runtime Logs

param([string]$ServiceId = "697adbcaf2339c9e766cdb63")

$ZEABUR_TOKEN = "sk-3rnuwvuwf33q7l44txghfkujzf2yz"
$PROJECT_ID = "6948c99fced85978abb44563"
$API_URL = "https://api.zeabur.com/graphql"

$query = @"
query {
  runtimeLogs(projectID: "$PROJECT_ID", serviceID: "$ServiceId") {
    message
    timestamp
  }
}
"@

$headers = @{
    "Authorization" = "Bearer $ZEABUR_TOKEN"
    "Content-Type" = "application/json"
}

$body = @{ query = $query } | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $body -TimeoutSec 30

    if ($response.errors) {
        Write-Host "GraphQL Errors:" -ForegroundColor Red
        $response.errors | ForEach-Object { Write-Host $_.message -ForegroundColor Red }
        exit 1
    }

    if ($response.data.runtimeLogs) {
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host "RUNTIME LOGS (Last 100 entries)" -ForegroundColor Cyan
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host ""

        foreach ($log in $response.data.runtimeLogs) {
            $msg = $log.message
            if ($msg -match "error|Error|ERROR|fail|Fail|FAIL") {
                Write-Host $msg -ForegroundColor Red
            } elseif ($msg -match "warn|Warn|WARN") {
                Write-Host $msg -ForegroundColor Yellow
            } elseif ($msg -match "start|Start|listen|Listen|running|Running") {
                Write-Host $msg -ForegroundColor Green
            } else {
                Write-Host $msg
            }
        }
    } else {
        Write-Host "No runtime logs available" -ForegroundColor Yellow
    }

} catch {
    Write-Host "API Error: $_" -ForegroundColor Red
    exit 1
}
