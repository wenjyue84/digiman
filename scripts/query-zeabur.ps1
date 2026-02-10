$token = 'sk-3rnuwvuwf33q7l44txghfkujzf2yz'
$projectId = '6948c99fced85978abb44563'
$serviceIdSG = '6948cacdaf84400647912aab'
$serviceIdFrankfurt = '6988bab6ea91e8e06ef14232'
$deploymentId = '697a1c5c560650e56aac8886'

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. PROJECT INFO & SERVICES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$body = @{
    query = "query { project(_id: `"$projectId`") { name region services { _id name status deployments(limit: 5) { _id status createdAt finishedAt errorMessage } } } }"
} | ConvertTo-Json

try {
    $resp = Invoke-RestMethod -Uri 'https://gateway.zeabur.com/graphql' -Method POST -Headers $headers -Body $body
    if ($resp.errors) {
        Write-Host "GraphQL Errors:" -ForegroundColor Red
        $resp.errors | ConvertTo-Json -Depth 5
    }
    if ($resp.data.project) {
        $p = $resp.data.project
        Write-Host "Project: $($p.name)"
        Write-Host "Region: $($p.region)"
        foreach ($svc in $p.services) {
            Write-Host ""
            Write-Host "  Service: $($svc.name)" -ForegroundColor Yellow
            Write-Host "  ID: $($svc._id)"
            Write-Host "  Status: $($svc.status)"
            foreach ($dep in $svc.deployments) {
                Write-Host "    Deployment: $($dep._id) | $($dep.status) | $($dep.createdAt)"
                if ($dep.errorMessage) {
                    Write-Host "    ERROR: $($dep.errorMessage)" -ForegroundColor Red
                }
            }
        }
    }
} catch {
    Write-Host "Error querying project: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "2. DEPLOYMENT DETAILS (last known)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$body2 = @{
    query = "query { deployment(_id: `"$deploymentId`") { _id status createdAt finishedAt errorMessage buildLogs runtimeLogs service { name } } }"
} | ConvertTo-Json

try {
    $resp2 = Invoke-RestMethod -Uri 'https://gateway.zeabur.com/graphql' -Method POST -Headers $headers -Body $body2
    if ($resp2.errors) {
        Write-Host "GraphQL Errors:" -ForegroundColor Red
        $resp2.errors | ConvertTo-Json -Depth 5
    }
    if ($resp2.data.deployment) {
        $d = $resp2.data.deployment
        Write-Host "Service: $($d.service.name)"
        Write-Host "Status: $($d.status)"
        Write-Host "Created: $($d.createdAt)"
        Write-Host "Finished: $($d.finishedAt)"
        if ($d.errorMessage) {
            Write-Host ""
            Write-Host "ERROR MESSAGE:" -ForegroundColor Red
            Write-Host $d.errorMessage -ForegroundColor Red
        }
        if ($d.buildLogs) {
            Write-Host ""
            Write-Host "BUILD LOGS:" -ForegroundColor Yellow
            Write-Host $d.buildLogs
        }
        if ($d.runtimeLogs) {
            Write-Host ""
            Write-Host "RUNTIME LOGS:" -ForegroundColor Yellow
            Write-Host $d.runtimeLogs
        }
    }
} catch {
    Write-Host "Error querying deployment: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "3. FRANKFURT SERVICE CHECK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$body3 = @{
    query = "query { service(_id: `"$serviceIdFrankfurt`") { _id name status deployments(limit: 3) { _id status createdAt finishedAt errorMessage } } }"
} | ConvertTo-Json

try {
    $resp3 = Invoke-RestMethod -Uri 'https://gateway.zeabur.com/graphql' -Method POST -Headers $headers -Body $body3
    if ($resp3.errors) {
        Write-Host "GraphQL Errors:" -ForegroundColor Red
        $resp3.errors | ConvertTo-Json -Depth 5
    }
    if ($resp3.data.service) {
        $s = $resp3.data.service
        Write-Host "Service: $($s.name)"
        Write-Host "ID: $($s._id)"
        Write-Host "Status: $($s.status)"
        foreach ($dep in $s.deployments) {
            Write-Host "  Deployment: $($dep._id) | $($dep.status) | $($dep.createdAt)"
            if ($dep.errorMessage) {
                Write-Host "  ERROR: $($dep.errorMessage)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "Error querying Frankfurt service: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "4. SG SERVICE STATUS CHECK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$body4 = @{
    query = "query { service(_id: `"$serviceIdSG`") { _id name status deployments(limit: 3) { _id status createdAt finishedAt errorMessage } } }"
} | ConvertTo-Json

try {
    $resp4 = Invoke-RestMethod -Uri 'https://gateway.zeabur.com/graphql' -Method POST -Headers $headers -Body $body4
    if ($resp4.errors) {
        Write-Host "GraphQL Errors:" -ForegroundColor Red
        $resp4.errors | ConvertTo-Json -Depth 5
    }
    if ($resp4.data.service) {
        $s = $resp4.data.service
        Write-Host "Service: $($s.name)"
        Write-Host "ID: $($s._id)"
        Write-Host "Status: $($s.status)"
        foreach ($dep in $s.deployments) {
            Write-Host "  Deployment: $($dep._id) | $($dep.status) | $($dep.createdAt)"
            if ($dep.errorMessage) {
                Write-Host "  ERROR: $($dep.errorMessage)" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "Error querying SG service: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "DONE" -ForegroundColor Green
