# Get Zeabur service domains

$ZEABUR_TOKEN = "sk-3rnuwvuwf33q7l44txghfkujzf2yz"
$PROJECT_ID = "6948c99fced85978abb44563"
$API_URL = "https://api.zeabur.com/graphql"

$query = @"
query {
  project(_id: "$PROJECT_ID") {
    name
    services {
      _id
      name
      status
      domains {
        domain
        isGenerated
      }
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

    $project = $response.data.project
    Write-Host "Project: $($project.name)" -ForegroundColor Cyan
    Write-Host ""

    foreach ($service in $project.services) {
        Write-Host "Service: $($service.name) [$($service.status)]" -ForegroundColor Yellow

        if ($service.domains -and $service.domains.Count -gt 0) {
            foreach ($domain in $service.domains) {
                $type = if ($domain.isGenerated) { "(generated)" } else { "(custom)" }
                $url = "https://$($domain.domain)"
                Write-Host "  $url $type" -ForegroundColor Green
            }
        } else {
            Write-Host "  No domains configured" -ForegroundColor Gray
        }
        Write-Host ""
    }

} catch {
    Write-Host "API Error: $_" -ForegroundColor Red
    exit 1
}
