$SSH_KEY = "C:\Users\Jyue\.ssh\LightsailDefaultKeyPair.pem"
$REMOTE = "ubuntu@18.142.14.142"

Write-Host "=== WhatsApp /status API ==="
& ssh -i $SSH_KEY $REMOTE 'curl -s http://localhost:3002/api/rainbow/status' 2>&1 | Out-Host

Write-Host "`n=== Recent out log ==="
& ssh -i $SSH_KEY $REMOTE 'tail -20 /var/www/pelangi/logs/rainbow-ai-out.log' 2>&1 | Out-Host

Write-Host "`n=== Auth dir ==="
& ssh -i $SSH_KEY $REMOTE 'ls /var/www/pelangi/RainbowAI/auth/ 2>/dev/null || echo NO_AUTH_DIR' 2>&1 | Out-Host
