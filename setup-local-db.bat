@echo off
echo 🚀 Setting up Local PostgreSQL Database for PelangiManager...
echo.

echo 📦 Checking if Docker is installed...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed!
    echo Please install Docker Desktop from https://docker.com
    echo Then run this script again.
    pause
    exit /b 1
)

echo ✅ Docker is installed!

echo.
echo 🗄️ Starting PostgreSQL database...
docker-compose up -d postgres

echo.
echo ⏳ Waiting for database to start...
timeout /t 10 /nobreak >nul

echo.
echo 🔌 Testing database connection...
docker exec pelangi-postgres pg_isready -U pelangi_user -d pelangi_manager >nul 2>&1
if %errorlevel% neq 0 (
    echo ⏳ Database still starting, waiting a bit more...
    timeout /t 15 /nobreak >nul
)

echo.
echo 📋 Creating database tables...
npm run db:init

echo.
echo 🎉 Setup complete! Your local database is ready.
echo.
echo 📊 Database Info:
echo    Host: localhost
echo    Port: 5432
echo    Database: pelangi_manager
echo    Username: pelangi_user
echo    Password: pelangi_password
echo.
echo 🌐 pgAdmin available at: http://localhost:8080
echo    Email: admin@pelangi.com
echo    Password: admin123
echo.
echo 🚀 Start your app with: npm run dev
echo.
pause

