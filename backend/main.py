from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import librosa
import numpy as np
import tempfile
import os
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Beat Analysis API", version="1.0.0")

# Add CORS middleware to allow requests from your React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Beat Analysis API is running!"}

@app.post("/analyze-audio")
async def analyze_audio(file: UploadFile = File(...)):
    """
    Analyze audio file to detect BPM and musical key using Librosa
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Check file size (limit to 50MB)
        file_size = 0
        content = b""
        while chunk := await file.read(8192):
            content += chunk
            file_size += len(chunk)
            if file_size > 50 * 1024 * 1024:  # 50MB limit
                raise HTTPException(status_code=400, detail="File too large (max 50MB)")
        
        logger.info(f"Processing audio file: {file.filename}, size: {file_size} bytes")
        
        # Save to temporary file for librosa processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Load audio with librosa
            logger.info("Loading audio with librosa...")
            audio, sr = librosa.load(temp_file_path, sr=None)
            
            # Detect BPM using librosa's beat tracking
            logger.info("Detecting BPM...")
            tempo, beats = librosa.beat.beat_track(y=audio, sr=sr)
            # Ensure tempo is a scalar value
            tempo = float(tempo)
            
            # Detect key using chroma features
            logger.info("Detecting musical key...")
            chroma = librosa.feature.chroma_cqt(y=audio, sr=sr)
            
            # Map chroma features to musical keys
            key_mapping = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            
            # Calculate average chroma values
            chroma_avg = np.mean(chroma, axis=1)
            key_index = np.argmax(chroma_avg)
            detected_note = key_mapping[key_index]
            
            # Determine if it's major or minor
            # This is a simplified approach - in production you'd use more sophisticated key detection
            major_scale = [0, 2, 4, 5, 7, 9, 11]  # C major scale intervals
            minor_scale = [0, 2, 3, 5, 7, 8, 10]  # C minor scale intervals
            
            # Calculate correlation with major and minor scales
            major_correlation = np.corrcoef(chroma_avg, np.roll(chroma_avg, -key_index))[0, 1]
            minor_correlation = np.corrcoef(chroma_avg, np.roll(chroma_avg, -key_index))[0, 1]
            
            # Simple heuristic: compare the strength of the third note (major vs minor)
            third_major = (key_index + 4) % 12
            third_minor = (key_index + 3) % 12
            
            major_strength = chroma_avg[third_major]
            minor_strength = chroma_avg[third_minor]
            
            # Determine scale type
            if major_strength > minor_strength:
                scale_type = "Major"
            else:
                scale_type = "Minor"
            
            detected_key = f"{detected_note} {scale_type}"
            
            # Calculate confidence based on signal clarity
            # Higher confidence for clearer, more structured audio
            spectral_centroid = librosa.feature.spectral_centroid(y=audio, sr=sr)
            spectral_rolloff = librosa.feature.spectral_rolloff(y=audio, sr=sr)
            
            # Normalize confidence based on audio quality
            confidence = min(0.95, 0.7 + (float(np.std(spectral_centroid)) / 1000) * 0.25)
            
            logger.info(f"Analysis complete: {tempo:.1f} BPM, {detected_key}")
            
            return {
                "bpm": round(tempo),
                "key": detected_key,
                "confidence": round(confidence, 2),
                "sample_rate": sr,
                "duration": len(audio) / sr,
                "analysis_method": "librosa"
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"Error analyzing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "beat-analysis-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
