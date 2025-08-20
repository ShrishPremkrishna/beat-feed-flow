#!/bin/bash

echo "🚀 Deploying Beat Analysis API..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Build the Docker image
echo "🔨 Building Docker image..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "✅ Docker image built successfully"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start the service
echo "🚀 Starting Beat Analysis API..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start service"
    exit 1
fi

echo "✅ Service started successfully"

# Wait for service to be healthy
echo "⏳ Waiting for service to be healthy..."
sleep 10

# Check health
HEALTH_CHECK=$(curl -s http://localhost:8000/health)
if [[ $HEALTH_CHECK == *"healthy"* ]]; then
    echo "✅ Service is healthy"
    echo "📊 Service info:"
    echo "$HEALTH_CHECK"
else
    echo "⚠️ Service health check failed"
    echo "Response: $HEALTH_CHECK"
fi

echo "🎉 Deployment complete!"
echo "🌐 API is running on http://localhost:8000"
echo "📋 Use 'docker-compose logs -f' to view logs"
echo "🛑 Use 'docker-compose down' to stop the service"
