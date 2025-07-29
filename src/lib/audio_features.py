"""
Comprehensive Audio Feature Extraction Pipeline using Librosa
Extracts 100+ audio features for music analysis and ML training

Based on librosa documentation: https://librosa.org/doc/latest/index.html
"""

import librosa
import numpy as np
import pandas as pd
import warnings
from typing import Dict, Any, Tuple, Optional
import json
from pathlib import Path

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')

class ComprehensiveAudioFeatureExtractor:
    """
    Extract comprehensive audio features using librosa library.
    Implements feature extraction across all major categories available in librosa.
    """
    
    def __init__(self, 
                 sample_rate: int = 22050,
                 duration: Optional[float] = 30.0,
                 offset: float = 0.0):
        """
        Initialize the feature extractor.
        
        Args:
            sample_rate: Target sample rate for audio loading
            duration: Duration in seconds to load (None = full file)
            offset: Start time offset in seconds
        """
        self.sr = sample_rate
        self.duration = duration
        self.offset = offset
        
    def load_audio(self, audio_path: str) -> Tuple[np.ndarray, int]:
        """Load audio file using librosa."""
        try:
            y, sr = librosa.load(
                audio_path, 
                sr=self.sr, 
                duration=self.duration,
                offset=self.offset
            )
            return y, sr
        except Exception as e:
            raise Exception(f"Error loading audio file {audio_path}: {str(e)}")
    
    def extract_basic_properties(self, y: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract basic audio properties."""
        features = {}
        
        # Basic properties
        features['duration'] = float(len(y) / sr)  # Convert to float
        features['sample_rate'] = int(sr)  # Convert to int
        features['total_samples'] = int(len(y))  # Convert to int
        
        # RMS Energy
        rms = librosa.feature.rms(y=y)[0]
        features['rms_mean'] = float(np.mean(rms))
        features['rms_std'] = float(np.std(rms))
        features['rms_max'] = float(np.max(rms))
        features['rms_min'] = float(np.min(rms))
        
        # Zero Crossing Rate
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        features['zcr_mean'] = float(np.mean(zcr))
        features['zcr_std'] = float(np.std(zcr))
        features['zcr_max'] = float(np.max(zcr))
        features['zcr_min'] = float(np.min(zcr))
        
        return features
    
    def extract_spectral_features(self, y: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract spectral domain features."""
        features = {}
        
        # Spectral Centroid
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        features['spectral_centroid_mean'] = float(np.mean(spectral_centroids))
        features['spectral_centroid_std'] = float(np.std(spectral_centroids))
        features['spectral_centroid_max'] = float(np.max(spectral_centroids))
        features['spectral_centroid_min'] = float(np.min(spectral_centroids))
        
        # Spectral Bandwidth
        spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
        features['spectral_bandwidth_mean'] = float(np.mean(spectral_bandwidth))
        features['spectral_bandwidth_std'] = float(np.std(spectral_bandwidth))
        features['spectral_bandwidth_max'] = float(np.max(spectral_bandwidth))
        features['spectral_bandwidth_min'] = float(np.min(spectral_bandwidth))
        
        # Spectral Rolloff
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        features['spectral_rolloff_mean'] = float(np.mean(spectral_rolloff))
        features['spectral_rolloff_std'] = float(np.std(spectral_rolloff))
        features['spectral_rolloff_max'] = float(np.max(spectral_rolloff))
        features['spectral_rolloff_min'] = float(np.min(spectral_rolloff))
        
        # Spectral Contrast
        spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        for i in range(spectral_contrast.shape[0]):
            features[f'spectral_contrast_{i+1}_mean'] = float(np.mean(spectral_contrast[i]))
            features[f'spectral_contrast_{i+1}_std'] = float(np.std(spectral_contrast[i]))
        
        # Spectral Flatness
        spectral_flatness = librosa.feature.spectral_flatness(y=y)[0]
        features['spectral_flatness_mean'] = float(np.mean(spectral_flatness))
        features['spectral_flatness_std'] = float(np.std(spectral_flatness))
        features['spectral_flatness_max'] = float(np.max(spectral_flatness))
        features['spectral_flatness_min'] = float(np.min(spectral_flatness))
        
        # Polynomial features
        poly_features = librosa.feature.poly_features(y=y, sr=sr)
        for i in range(poly_features.shape[0]):
            features[f'poly_feature_{i}_mean'] = float(np.mean(poly_features[i]))
            features[f'poly_feature_{i}_std'] = float(np.std(poly_features[i]))
        
        return features
    
    def extract_mfcc_features(self, y: np.ndarray, sr: int, n_mfcc: int = 20) -> Dict[str, float]:
        """Extract MFCC (Mel-frequency cepstral coefficients) features."""
        features = {}
        
        # Standard MFCCs
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
        
        for i in range(n_mfcc):
            features[f'mfcc_{i+1}_mean'] = float(np.mean(mfccs[i]))
            features[f'mfcc_{i+1}_std'] = float(np.std(mfccs[i]))
            features[f'mfcc_{i+1}_max'] = float(np.max(mfccs[i]))
            features[f'mfcc_{i+1}_min'] = float(np.min(mfccs[i]))
            features[f'mfcc_{i+1}_range'] = float(np.max(mfccs[i]) - np.min(mfccs[i]))
        
        # Delta MFCCs (first derivative)
        mfcc_delta = librosa.feature.delta(mfccs)
        for i in range(n_mfcc):
            features[f'mfcc_delta_{i+1}_mean'] = float(np.mean(mfcc_delta[i]))
            features[f'mfcc_delta_{i+1}_std'] = float(np.std(mfcc_delta[i]))
        
        # Delta-Delta MFCCs (second derivative)
        mfcc_delta2 = librosa.feature.delta(mfccs, order=2)
        for i in range(n_mfcc):
            features[f'mfcc_delta2_{i+1}_mean'] = float(np.mean(mfcc_delta2[i]))
            features[f'mfcc_delta2_{i+1}_std'] = float(np.std(mfcc_delta2[i]))
        
        return features
    
    def extract_chroma_features(self, y: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract chroma and harmonic features."""
        features = {}
        
        # Chroma STFT
        chroma_stft = librosa.feature.chroma_stft(y=y, sr=sr)
        for i in range(12):  # 12 pitch classes
            features[f'chroma_stft_{i+1}_mean'] = float(np.mean(chroma_stft[i]))
            features[f'chroma_stft_{i+1}_std'] = float(np.std(chroma_stft[i]))
        
        # Chroma CQT
        chroma_cqt = librosa.feature.chroma_cqt(y=y, sr=sr)
        for i in range(12):
            features[f'chroma_cqt_{i+1}_mean'] = float(np.mean(chroma_cqt[i]))
            features[f'chroma_cqt_{i+1}_std'] = float(np.std(chroma_cqt[i]))
        
        # Chroma CENS
        chroma_cens = librosa.feature.chroma_cens(y=y, sr=sr)
        for i in range(12):
            features[f'chroma_cens_{i+1}_mean'] = float(np.mean(chroma_cens[i]))
            features[f'chroma_cens_{i+1}_std'] = float(np.std(chroma_cens[i]))
        
        return features
    
    def extract_tonnetz_features(self, y: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract tonnetz (harmonic network) features."""
        features = {}
        
        # Tonnetz
        tonnetz = librosa.feature.tonnetz(y=y, sr=sr)
        
        for i in range(tonnetz.shape[0]):  # 6 tonnetz dimensions
            features[f'tonnetz_{i+1}_mean'] = float(np.mean(tonnetz[i]))
            features[f'tonnetz_{i+1}_std'] = float(np.std(tonnetz[i]))
            features[f'tonnetz_{i+1}_max'] = float(np.max(tonnetz[i]))
            features[f'tonnetz_{i+1}_min'] = float(np.min(tonnetz[i]))
        
        return features
    
    def extract_rhythm_features(self, y: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract rhythm and tempo features."""
        features = {}
        
        # Tempo and beat tracking
        try:
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            features['tempo'] = float(tempo)
            features['beat_count'] = int(len(beats))
            
            if len(beats) > 1:
                beat_times = librosa.times_like(beats, sr=sr)
                beat_intervals = np.diff(beat_times)
                features['beat_intervals_mean'] = float(np.mean(beat_intervals))
                features['beat_intervals_std'] = float(np.std(beat_intervals))
                features['beat_regularity'] = float(1.0 / (1.0 + np.std(beat_intervals)))
            else:
                features['beat_intervals_mean'] = 0.0
                features['beat_intervals_std'] = 0.0
                features['beat_regularity'] = 0.0
        except:
            features['tempo'] = 0.0
            features['beat_count'] = 0
            features['beat_intervals_mean'] = 0.0
            features['beat_intervals_std'] = 0.0
            features['beat_regularity'] = 0.0
        
        # Onset detection
        try:
            onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
            onset_times = librosa.frames_to_time(onset_frames, sr=sr)
            features['onset_count'] = int(len(onset_times))
            features['onset_rate'] = float(len(onset_times) / (len(y) / sr))
            
            if len(onset_times) > 1:
                onset_intervals = np.diff(onset_times)
                features['onset_intervals_mean'] = float(np.mean(onset_intervals))
                features['onset_intervals_std'] = float(np.std(onset_intervals))
            else:
                features['onset_intervals_mean'] = 0.0
                features['onset_intervals_std'] = 0.0
        except:
            features['onset_count'] = 0
            features['onset_rate'] = 0.0
            features['onset_intervals_mean'] = 0.0
            features['onset_intervals_std'] = 0.0
        
        return features
    
    def extract_harmonic_percussive_features(self, y: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract harmonic and percussive separation features."""
        features = {}
        
        try:
            # Harmonic-percussive separation
            y_harmonic, y_percussive = librosa.effects.hpss(y)
            
            # Harmonic component features
            features['harmonic_energy'] = float(np.sum(y_harmonic ** 2))
            features['harmonic_rms'] = float(np.sqrt(np.mean(y_harmonic ** 2)))
            
            # Percussive component features
            features['percussive_energy'] = float(np.sum(y_percussive ** 2))
            features['percussive_rms'] = float(np.sqrt(np.mean(y_percussive ** 2)))
            
            # Ratio features
            total_energy = features['harmonic_energy'] + features['percussive_energy']
            if total_energy > 0:
                features['harmonic_ratio'] = float(features['harmonic_energy'] / total_energy)
                features['percussive_ratio'] = float(features['percussive_energy'] / total_energy)
            else:
                features['harmonic_ratio'] = 0.0
                features['percussive_ratio'] = 0.0
        except:
            features['harmonic_energy'] = 0.0
            features['harmonic_rms'] = 0.0
            features['percussive_energy'] = 0.0
            features['percussive_rms'] = 0.0
            features['harmonic_ratio'] = 0.0
            features['percussive_ratio'] = 0.0
        
        return features
    
    def extract_mel_features(self, y: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract mel-scale features."""
        features = {}
        
        # Mel-scaled spectrogram
        mel_spectrogram = librosa.feature.melspectrogram(y=y, sr=sr)
        
        # Statistical features of mel spectrogram
        features['mel_spectrogram_mean'] = float(np.mean(mel_spectrogram))
        features['mel_spectrogram_std'] = float(np.std(mel_spectrogram))
        features['mel_spectrogram_max'] = float(np.max(mel_spectrogram))
        features['mel_spectrogram_min'] = float(np.min(mel_spectrogram))
        
        # Mel frequency bands analysis
        mel_bands = np.mean(mel_spectrogram, axis=1)
        for i in range(min(20, len(mel_bands))):  # First 20 mel bands
            features[f'mel_band_{i+1}'] = float(mel_bands[i])
        
        return features
    
    def extract_tempogram_features(self, y: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract tempogram features."""
        features = {}
        
        try:
            # Tempogram
            onset_envelope = librosa.onset.onset_strength(y=y, sr=sr)
            tempogram = librosa.feature.tempogram(onset_envelope=onset_envelope, sr=sr)
            
            features['tempogram_mean'] = float(np.mean(tempogram))
            features['tempogram_std'] = float(np.std(tempogram))
            features['tempogram_max'] = float(np.max(tempogram))
            features['tempogram_min'] = float(np.min(tempogram))
            
            # Fourier tempogram
            fourier_tempogram = librosa.feature.fourier_tempogram(onset_envelope=onset_envelope, sr=sr)
            features['fourier_tempogram_mean'] = float(np.mean(fourier_tempogram))
            features['fourier_tempogram_std'] = float(np.std(fourier_tempogram))
        except:
            features['tempogram_mean'] = 0.0
            features['tempogram_std'] = 0.0
            features['tempogram_max'] = 0.0
            features['tempogram_min'] = 0.0
            features['fourier_tempogram_mean'] = 0.0
            features['fourier_tempogram_std'] = 0.0
        
        return features
    
    def extract_all_features(self, audio_path: str) -> Dict[str, Any]:
        """
        Extract all available features from an audio file.
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            Dictionary containing all extracted features
        """
        # Load audio
        y, sr = self.load_audio(audio_path)
        
        # Initialize feature dictionary
        features = {
            'file_path': audio_path,
            'extraction_params': {
                'sample_rate': sr,
                'duration': self.duration,
                'offset': self.offset
            }
        }
        
        print(f"🎵 Extracting features from: {Path(audio_path).name}")
        print(f"📊 Audio loaded: {len(y)} samples at {sr} Hz")
        
        # Extract all feature categories
        print("📈 Extracting basic properties...")
        features.update(self.extract_basic_properties(y, sr))
        
        print("🌈 Extracting spectral features...")
        features.update(self.extract_spectral_features(y, sr))
        
        print("🎼 Extracting MFCC features...")
        features.update(self.extract_mfcc_features(y, sr))
        
        print("🎵 Extracting chroma features...")
        features.update(self.extract_chroma_features(y, sr))
        
        print("🔗 Extracting tonnetz features...")
        features.update(self.extract_tonnetz_features(y, sr))
        
        print("🥁 Extracting rhythm features...")
        features.update(self.extract_rhythm_features(y, sr))
        
        print("🎭 Extracting harmonic/percussive features...")
        features.update(self.extract_harmonic_percussive_features(y, sr))
        
        print("🌡️ Extracting mel-scale features...")
        features.update(self.extract_mel_features(y, sr))
        
        print("⏱️ Extracting tempogram features...")
        features.update(self.extract_tempogram_features(y, sr))
        
        # Count total features
        feature_count = len([k for k in features.keys() if k not in ['file_path', 'extraction_params']])
        features['total_features_extracted'] = feature_count
        
        print(f"✅ Extraction complete! {feature_count} features extracted.")
        
        return features
    
    def features_to_dataframe(self, features: Dict[str, Any]) -> pd.DataFrame:
        """Convert features dictionary to pandas DataFrame."""
        # Remove metadata for DataFrame
        feature_data = {k: v for k, v in features.items() 
                       if k not in ['file_path', 'extraction_params', 'total_features_extracted']}
        
        # Create DataFrame
        df = pd.DataFrame([feature_data])
        return df
    
    def save_features(self, features: Dict[str, Any], output_path: str, format: str = 'json'):
        """Save features to file."""
        if format.lower() == 'json':
            with open(output_path, 'w') as f:
                json.dump(features, f, indent=2, default=str)
        elif format.lower() == 'csv':
            df = self.features_to_dataframe(features)
            df.to_csv(output_path, index=False)
        else:
            raise ValueError("Format must be 'json' or 'csv'")


def test_feature_extraction(audio_file_path: str):
    """
    Test the feature extraction pipeline with a local audio file.
    
    Args:
        audio_file_path: Path to your audio file (mp3, wav, etc.)
    """
    print("🎼 COMPREHENSIVE AUDIO FEATURE EXTRACTION TEST")
    print("=" * 60)
    
    # Initialize extractor
    extractor = ComprehensiveAudioFeatureExtractor(
        sample_rate=22050,  # Standard sample rate
        duration=30.0,      # 30 seconds
        offset=0.0          # Start from beginning
    )
    
    try:
        # Extract all features
        features = extractor.extract_all_features(audio_file_path)
        
        print("\n🔍 FEATURE EXTRACTION SUMMARY")
        print("=" * 60)
        print(f"📂 File: {features['file_path']}")
        print(f"📊 Total Features: {features['total_features_extracted']}")
        print(f"⏱️ Duration: {float(features['duration']):.2f} seconds")  # Convert to float
        print(f"🎵 Sample Rate: {int(features['sample_rate'])} Hz")  # Convert to int
        
        # Display feature categories
        print("\n📋 FEATURE CATEGORIES:")
        print("-" * 30)
        
        # Group features by category
        categories = {
            'Basic Properties': [k for k in features.keys() if any(x in k for x in ['duration', 'sample_rate', 'rms', 'zcr'])],
            'Spectral Features': [k for k in features.keys() if 'spectral' in k or 'poly' in k],
            'MFCC Features': [k for k in features.keys() if 'mfcc' in k],
            'Chroma Features': [k for k in features.keys() if 'chroma' in k],
            'Tonnetz Features': [k for k in features.keys() if 'tonnetz' in k],
            'Rhythm Features': [k for k in features.keys() if any(x in k for x in ['tempo', 'beat', 'onset'])],
            'Harmonic/Percussive': [k for k in features.keys() if any(x in k for x in ['harmonic', 'percussive'])],
            'Mel Features': [k for k in features.keys() if 'mel' in k],
            'Tempogram Features': [k for k in features.keys() if 'tempogram' in k]
        }
        
        for category, feature_list in categories.items():
            if feature_list:
                print(f"{category}: {len(feature_list)} features")
        
        # Display sample features from each category
        print("\n🔬 SAMPLE FEATURE VALUES:")
        print("-" * 40)
        
        sample_features = [
            'tempo', 'rms_mean', 'spectral_centroid_mean', 'mfcc_1_mean',
            'chroma_stft_1_mean', 'tonnetz_1_mean', 'harmonic_ratio',
            'mel_spectrogram_mean', 'onset_rate'
        ]
        
        for feature in sample_features:
            if feature in features:
                # Convert numpy values to Python native types before formatting
                value = features[feature]
                if hasattr(value, 'item'):  # Check if it's a numpy type
                    value = value.item()  # Convert to native Python type
                print(f"{feature:25}: {float(value):.4f}")  # Convert to float for consistent formatting
        
        # Save features
        output_file = f"extracted_features_{Path(audio_file_path).stem}"
        
        # Convert numpy values to Python native types before saving
        features_for_save = {}
        for key, value in features.items():
            if hasattr(value, 'item'):  # Check if it's a numpy type
                features_for_save[key] = value.item()  # Convert to native Python type
            else:
                features_for_save[key] = value
        
        extractor.save_features(features_for_save, f"{output_file}.json", format='json')
        
        # Create DataFrame and save as CSV
        df = extractor.features_to_dataframe(features)
        df.to_csv(f"{output_file}.csv", index=False)
        
        print(f"\n💾 Features saved to:")
        print(f"   - {output_file}.json")
        print(f"   - {output_file}.csv")
        
        print("\n✅ Feature extraction test completed successfully!")
        
        return features, df
        
    except Exception as e:
        print(f"❌ Error during feature extraction: {str(e)}")
        import traceback
        print("Stack trace:")
        traceback.print_exc()
        return None, None


# Example usage
if __name__ == "__main__":
    # Test with a sample audio file
    # Replace with your actual audio file path
    test_audio_path = "path/to/your/audio/file.mp3"
    
    print("🎵 Testing Comprehensive Audio Feature Extraction")
    print("📁 Please update 'test_audio_path' with your audio file path")
    
    # Uncomment the line below and update the path to test
    # features, df = test_feature_extraction(test_audio_path) 