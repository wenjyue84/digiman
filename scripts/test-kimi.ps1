$body = @{
    model = "moonshotai/kimi-k2.5"
    messages = @(
        @{
            role = "user"
            content = "Say hello in one sentence"
        }
    )
    max_tokens = 100
    stream = $false
} | ConvertTo-Json -Depth 3

$headers = @{
    "Authorization" = "Bearer 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"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/chat/completions" -Method POST -Headers $headers -Body $body -TimeoutSec 30
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())"
    }
}
