# Beat Analysis API - Backend

This is the FastAPI backend for the Beatify application, providing audio analysis capabilities using librosa.

## 🚀 Quick Start (Local Development)

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

The API will be available at `http://localhost:8000`

## 🐳 Production Deployment with Docker

### Prerequisites
- Docker
- Docker Compose

### Deploy
```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Manual Docker Commands
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop service
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## 🔧 Troubleshooting

### Librosa Not Working in Production

**Common Issues:**
1. **Missing System Dependencies**: Librosa requires audio codecs and FFT libraries
2. **Platform Differences**: Different OS/architecture in production
3. **Memory Limits**: Production environments often have stricter limits

**Solutions:**
1. **Use Docker**: The provided Dockerfile includes all necessary system dependencies
2. **Check Health Endpoint**: Visit `/health` to see if librosa is available
3. **Fallback Mode**: If librosa fails, the API will use fallback analysis

### Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "beat-analysis-api",
  "librosa_available": true
}
```

### Logs
```bash
# Docker logs
docker-compose logs -f

# Local logs
tail -f logs/app.log
```

## 📁 Project Structure

```
backend/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose configuration
├── deploy.sh          # Deployment script
└── README.md          # This file
```

## 🌐 API Endpoints

- `GET /` - API status and librosa availability
- `GET /health` - Health check
- `POST /analyze-audio` - Analyze audio file (BPM, key detection)

## 🔒 CORS Configuration

The API is configured to allow requests from:
- `http://localhost:8080` (local development)
- `http://localhost:3000` (local development)
- `https://thatsbeatify.com` (production)
- `https://www.thatsbeatify.com` (production)

## 📊 Monitoring

- **Health Checks**: Automatic health monitoring with Docker
- **Logging**: Structured logging with different levels
- **Error Handling**: Graceful fallbacks when librosa is unavailable

## 🚨 Production Notes

1. **Always use Docker** for production deployment
2. **Monitor logs** for any librosa import errors
3. **Check health endpoint** regularly
4. **Use HTTPS** in production
5. **Set appropriate memory limits** for audio processing

## 🆘 Support

If you encounter issues:
1. Check the health endpoint
2. Review Docker logs
3. Verify system dependencies
4. Check memory usage
5. Ensure proper CORS configuration
