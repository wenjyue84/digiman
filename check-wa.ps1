$SSH_KEY = "C:\Users\Jyue\.ssh\LightsailDefaultKeyPair.pem"
$REMOTE = "ubuntu@18.142.14.142"

Write-Host "=== WhatsApp Status ==="
$wa = & ssh -i $SSH_KEY $REMOTE 'curl -s http://localhost:3002/api/rainbow/status | python3 -m json.tool 2>&1 | head -60' 2>&1
Write-Host ($wa -join "`n")

Write-Host "`n=== Recent error logs ==="
$logs = & ssh -i $SSH_KEY $REMOTE 'tail -30 /var/www/pelangi/logs/rainbow-ai-error.log' 2>&1
Write-Host ($logs -join "`n")

Write-Host "`n=== Auth session files ==="
$auth = & ssh -i $SSH_KEY $REMOTE 'ls -la /var/www/pelangi/RainbowAI/auth/ 2>&1 || echo NO_AUTH_DIR' 2>&1
Write-Host ($auth -join "`n")
