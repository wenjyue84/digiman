# Fix MCP Server Environment Variable in Zeabur

$ZEABUR_TOKEN = "sk-3rnuwvuwf33q7l44txghfkujzf2yz"
$PROJECT_ID = "6948c99fced85978abb44563"
$API_URL = "https://api.zeabur.com/graphql"

$headers = @{
    "Authorization" = "Bearer $ZEABUR_TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "=== STEP 1: Getting MCP Service ID ===" -ForegroundColor Cyan

# Get service ID for zeabur-pelangi-mcp
$query = @"
query {
  project(_id: "$PROJECT_ID") {
    services {
      _id
      name
    }
  }
}
"@

$body = @{ query = $query } | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $body -TimeoutSec 30

    if ($response.errors) {
        Write-Host "Error getting services:" -ForegroundColor Red
        $response.errors | ForEach-Object { Write-Host $_.message -ForegroundColor Red }
        exit 1
    }

    $services = $response.data.project.services
    $mcpService = $services | Where-Object { $_.name -eq "zeabur-pelangi-mcp" }

    if (-not $mcpService) {
        Write-Host "MCP service not found. Available services:" -ForegroundColor Red
        $services | ForEach-Object { Write-Host "  - $($_.name)" }
        exit 1
    }

    $SERVICE_ID = $mcpService._id
    Write-Host "Found MCP service: $($mcpService.name)" -ForegroundColor Green
    Write-Host "Service ID: $SERVICE_ID" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host "API Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "=== STEP 2: Setting PELANGI_API_URL Environment Variable ===" -ForegroundColor Cyan

# Set environment variable - try different mutation names
$mutations = @(
    'saveServiceVariables(serviceID: \"' + $SERVICE_ID + '\", variables: [{key: \"PELANGI_API_URL\", value: \"https://pelangi-manager.zeabur.app\"}])',
    'updateServiceVariable(serviceID: \"' + $SERVICE_ID + '\", key: \"PELANGI_API_URL\", value: \"https://pelangi-manager.zeabur.app\")',
    'setEnvironmentVariable(serviceID: \"' + $SERVICE_ID + '\", key: \"PELANGI_API_URL\", value: \"https://pelangi-manager.zeabur.app\")'
)

$success = $false
foreach ($mutationField in $mutations) {
    $mutation = @"
mutation {
  $mutationField
}
"@

$body = @{ query = $mutation } | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $body -TimeoutSec 30

    if ($response.errors) {
        Write-Host "Error setting environment variable:" -ForegroundColor Red
        $response.errors | ForEach-Object { Write-Host $_.message -ForegroundColor Red }
        exit 1
    }

    Write-Host "Environment variable set successfully!" -ForegroundColor Green
    Write-Host "  PELANGI_API_URL = https://pelangi-manager.zeabur.app" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host "API Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "=== STEP 3: Redeploying MCP Service ===" -ForegroundColor Cyan

# Redeploy service
$mutation = @"
mutation {
  redeployService(serviceID: "$SERVICE_ID")
}
"@

$body = @{ query = $mutation } | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $body -TimeoutSec 30

    if ($response.errors) {
        Write-Host "Error redeploying service:" -ForegroundColor Red
        $response.errors | ForEach-Object { Write-Host $_.message -ForegroundColor Red }
        Write-Host ""
        Write-Host "Manual redeploy required. Go to:" -ForegroundColor Yellow
        Write-Host "  https://dash.zeabur.com/projects/$PROJECT_ID" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Service redeploying..." -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host "API Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual redeploy required. Go to:" -ForegroundColor Yellow
    Write-Host "  https://dash.zeabur.com/projects/$PROJECT_ID" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Wait 1-2 minutes for redeployment to complete"
Write-Host "2. Test health endpoint:"
Write-Host "   curl https://mcp-pelangi.zeabur.app/health"
Write-Host ""
Write-Host "3. Test MCP tool call:"
Write-Host '   curl -X POST https://mcp-pelangi.zeabur.app/mcp \'
Write-Host '     -H "Content-Type: application/json" \'
Write-Host '     -d ''{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":2}'''
Write-Host ""
