Write-Host "🚀 Setting up Local PostgreSQL Database for PelangiManager..." -ForegroundColor Green
Write-Host ""

Write-Host "📦 Checking if Docker is installed..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://docker.com" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "🗄️ Starting PostgreSQL database..." -ForegroundColor Yellow
docker-compose up -d postgres

Write-Host ""
Write-Host "⏳ Waiting for database to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "🔌 Testing database connection..." -ForegroundColor Yellow
$maxAttempts = 5
$attempt = 0

do {
    $attempt++
    try {
        $result = docker exec pelangi-postgres pg_isready -U pelangi_user -d pelangi_manager 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database is ready!" -ForegroundColor Green
            break
        }
    } catch {
        # Ignore errors
    }
    
    if ($attempt -lt $maxAttempts) {
        Write-Host "⏳ Database still starting, waiting... (attempt $attempt/$maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
} while ($attempt -lt $maxAttempts)

if ($attempt -eq $maxAttempts) {
    Write-Host "⚠️ Database might still be starting, continuing anyway..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Creating database tables..." -ForegroundColor Yellow
npm run db:init

Write-Host ""
Write-Host "🎉 Setup complete! Your local database is ready." -ForegroundColor Green
Write-Host ""
Write-Host "📊 Database Info:" -ForegroundColor Cyan
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Port: 5432" -ForegroundColor White
Write-Host "   Database: pelangi_manager" -ForegroundColor White
Write-Host "   Username: pelangi_user" -ForegroundColor White
Write-Host "   Password: pelangi_password" -ForegroundColor White
Write-Host ""
Write-Host "🌐 pgAdmin available at: http://localhost:8080" -ForegroundColor Cyan
Write-Host "   Email: admin@pelangi.com" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Start your app with: npm run dev" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
