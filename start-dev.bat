@echo off
echo 🎨 Starting Artwork Marketplace API Development Environment
echo ==================================================

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

REM Start database services
echo 🐘 Starting PostgreSQL and Redis...
docker-compose up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start the NestJS application
echo 🚀 Starting NestJS application...
echo.
echo 📚 API Documentation will be available at: http://localhost:3000/api/v1/docs
echo 🌐 API Base URL: http://localhost:3000/api/v1
echo.
echo Press Ctrl+C to stop the application
echo.

npm run start:dev