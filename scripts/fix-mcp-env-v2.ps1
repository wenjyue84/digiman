# Fix MCP Server Environment Variable - Manual Guide with Service Info

$ZEABUR_TOKEN = "sk-3rnuwvuwf33q7l44txghfkujzf2yz"
$PROJECT_ID = "6948c99fced85978abb44563"
$API_URL = "https://api.zeabur.com/graphql"

$headers = @{
    "Authorization" = "Bearer $ZEABUR_TOKEN"
    "Content-Type" = "application/json"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MCP Environment Variable Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get service info
$query = @"
query {
  project(_id: "$PROJECT_ID") {
    name
    services {
      _id
      name
      status
      template
    }
  }
}
"@

$body = @{ query = $query } | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $body -TimeoutSec 30

    if ($response.errors) {
        Write-Host "Error:" -ForegroundColor Red
        $response.errors | ForEach-Object { Write-Host $_.message -ForegroundColor Red }
        exit 1
    }

    $services = $response.data.project.services
    $mcpService = $services | Where-Object { $_.name -eq "zeabur-pelangi-mcp" }

    if ($mcpService) {
        Write-Host "Found MCP Service:" -ForegroundColor Green
        Write-Host "  Name: $($mcpService.name)" -ForegroundColor Gray
        Write-Host "  Status: $($mcpService.status)" -ForegroundColor Gray
        Write-Host "  Service ID: $($mcpService._id)" -ForegroundColor Gray
        Write-Host ""
    }

} catch {
    Write-Host "API Error: $_" -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  MANUAL FIX REQUIRED" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "The Zeabur GraphQL API requires manual environment variable setup." -ForegroundColor White
Write-Host ""
Write-Host "Please follow these steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open Zeabur Dashboard:" -ForegroundColor White
Write-Host "   https://dash.zeabur.com/projects/$PROJECT_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Click on the 'zeabur-pelangi-mcp' service" -ForegroundColor White
Write-Host ""
Write-Host "3. Go to the 'Variables' tab" -ForegroundColor White
Write-Host ""
Write-Host "4. Add or update these environment variables:" -ForegroundColor White
Write-Host "   Key:   DIGIMAN_API_URL" -ForegroundColor Yellow
Write-Host "   Value: https://admin.southern-homestay.com" -ForegroundColor Yellow
Write-Host "   Key:   DIGIMAN_API_TOKEN" -ForegroundColor Yellow
Write-Host "   Value: <admin API token from /settings/security>" -ForegroundColor Yellow
Write-Host "   (Optional legacy fallback: PELANGI_API_URL / PELANGI_API_TOKEN)" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Click 'Save' or 'Redeploy'" -ForegroundColor White
Write-Host ""
Write-Host "6. Wait 1-2 minutes for the service to redeploy" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  VERIFICATION TESTS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "After redeployment, test with:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test 1 - Health Check:" -ForegroundColor White
Write-Host '  curl https://mcp-pelangi.zeabur.app/health' -ForegroundColor Gray
Write-Host ""
Write-Host "Test 2 - Get Occupancy:" -ForegroundColor White
Write-Host '  curl -X POST https://mcp-pelangi.zeabur.app/mcp \' -ForegroundColor Gray
Write-Host '    -H "Content-Type: application/json" \' -ForegroundColor Gray
Write-Host '    -d ''{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":2}''' -ForegroundColor Gray
Write-Host ""
Write-Host "Expected: Should return real occupancy data (not ECONNREFUSED error)" -ForegroundColor Green
Write-Host ""
