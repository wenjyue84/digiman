# Zeabur Deployment Logs Fetcher
# Run: .\scripts\get-zeabur-logs.ps1

$ZEABUR_TOKEN = "sk-3rnuwvuwf33q7l44txghfkujzf2yz"
$PROJECT_ID = "6948c99fced85978abb44563"
$SERVICE_ID = "6948cacdaf84400647912aab"
$DEPLOYMENT_ID = "697a1c5c560650e56aac8886"

Write-Host "=" * 60
Write-Host "FETCHING ZEABUR DEPLOYMENT LOGS"
Write-Host "=" * 60

# Query for deployment details
$query = @"
query GetDeployment {
  deployment(_id: "$DEPLOYMENT_ID") {
    _id
    status
    createdAt
    finishedAt
    errorMessage
    service {
      name
    }
    project {
      name
    }
  }
}
"@

$headers = @{
    "Authorization" = "Bearer $ZEABUR_TOKEN"
    "Content-Type" = "application/json"
}

$body = @{
    query = $query
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://gateway.zeabur.com/graphql" -Method POST -Headers $headers -Body $body

    if ($response.errors) {
        Write-Host "`nGraphQL Errors:" -ForegroundColor Red
        $response.errors | ConvertTo-Json -Depth 5
    }

    if ($response.data.deployment) {
        $dep = $response.data.deployment
        Write-Host "`nDeployment Details:" -ForegroundColor Green
        Write-Host "  Status: $($dep.status)"
        Write-Host "  Created: $($dep.createdAt)"
        Write-Host "  Finished: $($dep.finishedAt)"
        Write-Host "  Project: $($dep.project.name)"
        Write-Host "  Service: $($dep.service.name)"

        if ($dep.errorMessage) {
            Write-Host "`n" + "=" * 60 -ForegroundColor Red
            Write-Host "ERROR MESSAGE:" -ForegroundColor Red
            Write-Host "=" * 60 -ForegroundColor Red
            Write-Host $dep.errorMessage -ForegroundColor Red
        }
    }
} catch {
    Write-Host "Error fetching deployment: $_" -ForegroundColor Red
}

# Also try to get recent deployments
Write-Host "`n" + "=" * 60
Write-Host "RECENT DEPLOYMENTS"
Write-Host "=" * 60

$projectQuery = @"
query GetProject {
  project(_id: "$PROJECT_ID") {
    name
    services {
      name
      deployments(limit: 10) {
        _id
        status
        createdAt
        finishedAt
        errorMessage
      }
    }
  }
}
"@

$projectBody = @{
    query = $projectQuery
} | ConvertTo-Json

try {
    $projResponse = Invoke-RestMethod -Uri "https://gateway.zeabur.com/graphql" -Method POST -Headers $headers -Body $projectBody

    if ($projResponse.data.project) {
        $proj = $projResponse.data.project
        Write-Host "Project: $($proj.name)" -ForegroundColor Cyan

        foreach ($svc in $proj.services) {
            Write-Host "`nService: $($svc.name)" -ForegroundColor Yellow
            foreach ($dep in $svc.deployments) {
                $statusColor = if ($dep.status -eq "RUNNING") { "Green" } elseif ($dep.status -eq "FAILED") { "Red" } else { "White" }
                Write-Host "  - $($dep.status) at $($dep.createdAt)" -ForegroundColor $statusColor
                if ($dep.errorMessage) {
                    Write-Host "    Error: $($dep.errorMessage.Substring(0, [Math]::Min(100, $dep.errorMessage.Length)))..." -ForegroundColor Red
                }
            }
        }
    }
} catch {
    Write-Host "Error fetching project: $_" -ForegroundColor Red
}

Write-Host "`n" + "=" * 60
Write-Host "Done! Copy the output above and share it with Claude."
Write-Host "=" * 60
