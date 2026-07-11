#!/bin/bash

echo "🎨 Starting Artwork Marketplace API Development Environment"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start database services
echo "🍃 Starting MongoDB and Redis..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are healthy
echo "🔍 Checking service health..."
if docker-compose ps | grep -q "healthy"; then
    echo "✅ Services are healthy!"
else
    echo "⚠️  Services might still be starting up..."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the NestJS application
echo "🚀 Starting NestJS application..."
echo ""
echo "📚 API Documentation will be available at: http://localhost:3000/api/v1/docs"
echo "🌐 API Base URL: http://localhost:3000/api/v1"
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

npm run start:dev