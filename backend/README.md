# Beat Analysis Backend with Librosa

This backend provides professional audio analysis using Librosa to detect BPM and musical key from audio files.

## Features

- **BPM Detection**: Accurate tempo detection using Librosa's beat tracking
- **Key Detection**: Musical key detection using chroma features
- **High Accuracy**: Industry-standard audio analysis algorithms
- **Fast Processing**: Optimized for beat analysis (typically 10-30 seconds)
- **File Validation**: Supports various audio formats with size limits

## Setup

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the server:**
   ```bash
   python main.py
   ```

   Or use the startup script:
   ```bash
   ./start.sh
   ```

The API will be available at `http://localhost:8000`

## API Endpoints

### POST /analyze-audio

Analyzes an audio file to detect BPM and musical key.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Audio file in the `file` field

**Response:**
```json
{
  "bpm": 120,
  "key": "C Major",
  "confidence": 0.85,
  "sample_rate": 44100,
  "duration": 180.5,
  "analysis_method": "librosa"
}
```

**Supported Audio Formats:**
- MP3, WAV, FLAC, M4A, AAC, OGG, and more
- Maximum file size: 50MB

## Usage from Frontend

The React frontend automatically calls this API when the "Analyze with Librosa" button is clicked.

## Performance

- **Typical Analysis Time**: 10-30 seconds depending on file size and complexity
- **Memory Usage**: Efficient processing with temporary file cleanup
- **Accuracy**: High confidence scores for well-mixed audio files

## Troubleshooting

### Common Issues

1. **Port Already in Use**: Change the port in `main.py` if 8000 is occupied
2. **Large Files**: Ensure audio files are under 50MB
3. **Audio Quality**: Best results with clear, well-mixed audio files

### Logs

The API provides detailed logging for debugging:
- File processing status
- Analysis progress
- Error details

## Development

### Adding New Features

- **Additional Audio Features**: Extend the analysis in `main.py`
- **New Algorithms**: Integrate additional Librosa functions
- **Performance Optimization**: Add caching or parallel processing

### Testing

Test the API with:
```bash
curl -X POST -F "file=@your-audio-file.mp3" http://localhost:8000/analyze-audio
```

## Security Notes

- CORS is enabled for local development
- File size limits prevent abuse
- Input validation ensures only audio files are processed
