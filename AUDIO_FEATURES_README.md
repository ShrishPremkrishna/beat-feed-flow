# 🎵 Beatify Audio Feature Extraction Pipeline

A comprehensive audio feature extraction system using [librosa](https://librosa.org/doc/latest/index.html) that extracts **200+ audio features** for machine learning and music analysis.

## 🚀 Quick Start

### 1. **Automated Setup** (Recommended)

```bash
# Run the automated setup script
./setup_audio_features.sh
```

This script will:
- ✅ Install all Python dependencies
- ✅ Install FFmpeg (audio codec support)
- ✅ Test the installation
- ✅ Provide next steps

### 2. **Manual Setup**

If you prefer manual installation:

```bash
# Install Python dependencies
pip install -r requirements-audio.txt

# Install FFmpeg
# macOS:
brew install ffmpeg 

# Ubuntu/Debian:
sudo apt install ffmpeg

# Windows:
# Download from https://ffmpeg.org/download.html
```

### 3. **Test the Pipeline**

```bash
# Test with your own audio file
python test_audio_features.py path/to/your/audio.mp3

# Or let it find audio files automatically
python test_audio_features.py
```

## 📊 What Features Are Extracted?

The pipeline extracts **200+ features** across 9 major categories:

| Category | Features | Description |
|----------|----------|-------------|
| **Basic Properties** | 11 | Duration, sample rate, RMS energy, zero-crossing rate |
| **Spectral Features** | 30+ | Centroid, bandwidth, rolloff, contrast, flatness, polynomials |
| **MFCC Features** | 100 | Mel-frequency cepstral coefficients + deltas |
| **Chroma Features** | 72 | Pitch class profiles (STFT, CQT, CENS) |
| **Tonnetz Features** | 24 | Harmonic network analysis |
| **Rhythm Features** | 9 | Tempo, beats, onsets, regularity |
| **Harmonic/Percussive** | 6 | Component separation and ratios |
| **Mel Features** | 24+ | Mel-scale spectrogram analysis |
| **Tempogram Features** | 6 | Tempo and rhythm patterns |

**Total: ~280 features** that capture the complete "vibe" and characteristics of audio!

## 🎯 Key Features

### 🔍 **Comprehensive Analysis**
- **Spectral**: Brightness, timbre, frequency distribution
- **Harmonic**: Pitch, key, harmonic relationships  
- **Rhythmic**: Tempo, beat patterns, groove
- **Timbral**: MFCCs capture the "texture" and "color" of sound
- **Energy**: Dynamics, loudness, percussive elements

### 🚀 **Production Ready**
- **Robust error handling** - Works with corrupted/difficult files
- **Multiple format support** - MP3, WAV, FLAC, M4A, AAC
- **Configurable parameters** - Duration, sample rate, offset
- **Export options** - JSON and CSV output formats

### 🎛️ **Flexible Configuration**
```python
# Customize extraction parameters
extractor = ComprehensiveAudioFeatureExtractor(
    sample_rate=22050,    # Audio sample rate
    duration=30.0,        # Seconds to analyze (None = full file)
    offset=0.0            # Start time offset
)
```

## 💻 Usage Examples

### Basic Usage
```python
from src.lib.audio_features import ComprehensiveAudioFeatureExtractor

# Initialize extractor
extractor = ComprehensiveAudioFeatureExtractor()

# Extract features from audio file
features = extractor.extract_all_features("beat.mp3")

# Convert to DataFrame for ML
df = extractor.features_to_dataframe(features)

# Save results
extractor.save_features(features, "output.json")
extractor.save_features(features, "output.csv", format='csv')
```

### Batch Processing
```python
import glob
import pandas as pd

# Process multiple files
all_features = []

for audio_file in glob.glob("beats/*.mp3"):
    features = extractor.extract_all_features(audio_file)
    all_features.append(features)

# Combine into single DataFrame
df = pd.concat([extractor.features_to_dataframe(f) for f in all_features])
df.to_csv("all_beat_features.csv", index=False)
```

### Machine Learning Ready
```python
import xgboost as xgb
from sklearn.preprocessing import StandardScaler

# Load feature data
df = pd.read_csv("extracted_features.csv")

# Prepare for ML
feature_cols = [col for col in df.columns if col not in ['file_path']]
X = df[feature_cols].values

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Ready for XGBoost, LightGBM, etc.
model = xgb.XGBClassifier()
```

## 📁 Output Files

After running the extraction, you'll get:

```
extracted_features_yourfile.json    # Complete feature data with metadata
extracted_features_yourfile.csv     # Features in tabular format for ML
```

### JSON Output Structure
```json
{
  "file_path": "beat.mp3",
  "extraction_params": {
    "sample_rate": 22050,
    "duration": 30.0
  },
  "total_features_extracted": 283,
  "tempo": 128.5,
  "rms_mean": 0.15,
  "spectral_centroid_mean": 2841.2,
  "mfcc_1_mean": -315.4,
  "chroma_stft_1_mean": 0.35,
  "tonnetz_1_mean": 0.12,
  "harmonic_ratio": 0.67,
  "... 270+ more features"
}
```

## 🔧 System Requirements

- **Python**: 3.8 or higher
- **FFmpeg**: For audio codec support
- **Memory**: ~1-2 GB RAM for feature extraction
- **Storage**: ~1-10 MB per audio file for features

### Supported Audio Formats
✅ MP3, WAV, FLAC, M4A, AAC, OGG, WMA

## 🚨 Troubleshooting

### Common Issues

**1. "ModuleNotFoundError: No module named 'librosa'"**
```bash
pip install librosa soundfile
```

**2. "RuntimeError: FFmpeg not found"**
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

**3. "Error loading audio file"**
- Check file path is correct
- Ensure file is not corrupted
- Try a different audio format

**4. "Memory Error during extraction"**
```python
# Use shorter duration
extractor = ComprehensiveAudioFeatureExtractor(duration=15.0)
```

### Performance Tips

- **Large files**: Use `duration=30.0` to process only first 30 seconds
- **Batch processing**: Process files one at a time to avoid memory issues
- **Speed up**: Reduce sample rate for faster extraction: `sample_rate=16000`

## 🔮 Integration with Beatify

This pipeline is designed to integrate seamlessly with your Beatify platform:

### 1. **When beats are uploaded**:
```javascript
// Extract features during upload
const features = await extractAudioFeatures(beatFile);
await storeBeatFeatures(beatId, features);
```

### 2. **When artists provide feedback**:
```javascript
// Train personalized model
const preferences = await getArtistPreferences(artistId);
const model = await trainPreferenceModel(preferences);
```

### 3. **When ranking beats**:
```javascript
// Sort beats by predicted preference
const rankings = await predictBeatPreferences(artistId, beatIds);
const sortedBeats = beats.sort((a, b) => rankings[b.id] - rankings[a.id]);
```

## 📚 References

- **Librosa Documentation**: https://librosa.org/doc/latest/index.html
- **Audio Feature Extraction**: Based on music information retrieval (MIR) best practices
- **Research Papers**: XGBoost music classification achieving 97%+ accuracy
- **MFCC Features**: Industry standard for audio "fingerprinting"

## 🤝 Contributing

Found an issue or want to add features?
1. Check the troubleshooting section above
2. Open an issue with details about your audio file and error
3. Include the output of `python test_audio_features.py`

---

**🎉 You're now ready to extract comprehensive audio features and build intelligent music recommendation systems!** 