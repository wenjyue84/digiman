$dataDir = "C:\Users\Jyue\Documents-projects\Projects\digiman\RainbowAI\src\assistant\data"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Copy-Item "$dataDir\intent-examples.json" "$dataDir\intent-examples.json.backup.$timestamp"
Copy-Item "$dataDir\knowledge.json" "$dataDir\knowledge.json.backup.$timestamp"
Copy-Item "$dataDir\workflows.json" "$dataDir\workflows.json.backup.$timestamp"

Write-Host "✅ Backups created with timestamp: $timestamp"
Write-Host "  - intent-examples.json.backup.$timestamp"
Write-Host "  - knowledge.json.backup.$timestamp"
Write-Host "  - workflows.json.backup.$timestamp"
