#!/usr/bin/env python3
"""
Test script for the Comprehensive Audio Feature Extraction Pipeline

Usage:
    python test_audio_features.py path/to/your/audio/file.mp3

Example audio files you can use for testing:
- Any MP3, WAV, FLAC file you have locally
- Download from: https://freesound.org/ (Creative Commons)
- Or use any beat file from your Beatify platform
"""

import sys
import os
from pathlib import Path

# Add src directory to path so we can import our module
current_dir = Path(__file__).parent
src_dir = current_dir / "src" / "lib"
sys.path.insert(0, str(src_dir))

try:
    from audio_features import ComprehensiveAudioFeatureExtractor, test_feature_extraction
except ImportError as e:
    print("❌ Error importing audio_features module:")
    print(f"   {e}")
    print("\n💡 Make sure you have installed the required dependencies:")
    print("   pip install -r requirements-audio.txt")
    print("\n💡 Also ensure ffmpeg is installed on your system:")
    print("   macOS: brew install ffmpeg")
    print("   Ubuntu: sudo apt install ffmpeg")
    print("   Windows: Download from https://ffmpeg.org/download.html")
    sys.exit(1)


def find_sample_audio_files():
    """Find any audio files in common locations for testing."""
    audio_extensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac']
    
    # Common locations to look for audio files
    search_paths = [
        Path.home() / "Music",
        Path.home() / "Downloads", 
        current_dir / "src" / "assets",  # In case there are sample files in assets
        current_dir / "public",          # Check public directory
        current_dir,                     # Current directory
    ]
    
    found_files = []
    
    for search_path in search_paths:
        if search_path.exists():
            for ext in audio_extensions:
                files = list(search_path.glob(f"*{ext}"))
                found_files.extend(files)
                
                # Also check subdirectories
                files = list(search_path.glob(f"**/*{ext}"))
                found_files.extend(files)
    
    # Remove duplicates and limit to first 5
    unique_files = list(set(found_files))[:5]
    return unique_files


def main():
    print("🎵 BEATIFY AUDIO FEATURE EXTRACTION TEST")
    print("=" * 50)
    
    # Check if audio file path was provided
    if len(sys.argv) > 1:
        audio_file_path = sys.argv[1]
        
        if not os.path.exists(audio_file_path):
            print(f"❌ File not found: {audio_file_path}")
            sys.exit(1)
            
    else:
        print("🔍 No audio file provided. Searching for sample files...")
        
        # Try to find sample audio files
        sample_files = find_sample_audio_files()
        
        if sample_files:
            print(f"\n📁 Found {len(sample_files)} audio file(s):")
            for i, file_path in enumerate(sample_files, 1):
                print(f"   {i}. {file_path}")
            
            # Use the first file found
            audio_file_path = str(sample_files[0])
            print(f"\n🎯 Using: {Path(audio_file_path).name}")
            
        else:
            print("\n❌ No audio files found!")
            print("\n💡 To test the feature extraction pipeline:")
            print("   1. Download a sample audio file")
            print("   2. Run: python test_audio_features.py path/to/your/file.mp3")
            print("\n📋 Supported formats: MP3, WAV, FLAC, M4A, AAC")
            print("📋 Free audio samples: https://freesound.org/")
            sys.exit(1)
    
    # Test the feature extraction
    print(f"\n🚀 Starting feature extraction test...")
    print(f"📁 Processing: {audio_file_path}")
    
    try:
        # Run the comprehensive feature extraction
        features, df = test_feature_extraction(audio_file_path)
        
        if features and df is not None:
            print(f"\n🎉 SUCCESS! Extracted {features['total_features_extracted']} features")
            
            # Show DataFrame info
            print(f"\n📊 DataFrame Shape: {df.shape}")
            print(f"📋 Columns: {len(df.columns)}")
            
            # Show first few feature names
            print(f"\n🔍 Sample feature names:")
            feature_names = [col for col in df.columns if col not in ['file_path', 'extraction_params']]
            for i, name in enumerate(feature_names[:10]):
                print(f"   {i+1:2d}. {name}")
            
            if len(feature_names) > 10:
                print(f"   ... and {len(feature_names) - 10} more features")
            
            print(f"\n✅ Feature extraction pipeline is working perfectly!")
            print(f"💾 Results saved as JSON and CSV files")
            
        else:
            print("❌ Feature extraction failed!")
            
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        print("\n🔧 Troubleshooting tips:")
        print("   1. Ensure all dependencies are installed: pip install -r requirements-audio.txt")
        print("   2. Install ffmpeg: brew install ffmpeg (macOS) or sudo apt install ffmpeg (Ubuntu)")
        print("   3. Try a different audio file format (MP3, WAV)")
        print("   4. Check that the audio file is not corrupted")
        sys.exit(1)


if __name__ == "__main__":
    main() 