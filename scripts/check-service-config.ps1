# Check Zeabur Service Configuration

param([string]$ServiceId = "697adbcaf2339c9e766cdb63")

$ZEABUR_TOKEN = "sk-3rnuwvuwf33q7l44txghfkujzf2yz"
$API_URL = "https://api.zeabur.com/graphql"

$query = @"
query {
  service(_id: "$ServiceId") {
    _id
    name
    status
    domains {
      domain
      isGenerated
    }
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

    $service = $response.data.service
    if ($service) {
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host "SERVICE CONFIGURATION" -ForegroundColor Cyan
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host ""

        Write-Host "Service Name: $($service.name)" -ForegroundColor Green
        Write-Host "Status: $($service.status)" -ForegroundColor Yellow
        Write-Host ""

        if ($service.template) {
            Write-Host "Git Configuration:" -ForegroundColor Cyan
            Write-Host "  Repository: $($service.template.repoOwner)/$($service.template.repoName)"
            Write-Host "  Branch: $($service.template.repoBranch)"
            Write-Host "  Root Directory: $($service.template.rootDirectory)"
            Write-Host ""
        }

        if ($service.domains) {
            Write-Host "Domains:" -ForegroundColor Cyan
            foreach ($domain in $service.domains) {
                $type = if ($domain.isGenerated) { "(generated)" } else { "(custom)" }
                Write-Host "  https://$($domain.domain) $type"
            }
            Write-Host ""
        }

        if ($service.env) {
            Write-Host "Environment Variables:" -ForegroundColor Cyan
            foreach ($env in $service.env) {
                $val = if ($env.value.Length -gt 50) { "$($env.value.Substring(0, 50))..." } else { $env.value }
                if ($env.key -match "TOKEN|PASSWORD|SECRET") {
                    $val = "***"
                }
                Write-Host "  $($env.key) = $val"
            }
        } else {
            Write-Host "No environment variables set" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Service not found" -ForegroundColor Red
    }

} catch {
    Write-Host "API Error: $_" -ForegroundColor Red
    exit 1
}
