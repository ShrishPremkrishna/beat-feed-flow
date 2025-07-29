"""
Machine Learning Experiment Pipeline for Beat Classification
Trains multiple models on labeled beat data and evaluates performance
"""

import os
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

# ML Libraries
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_auc_score
)
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
import xgboost as xgb
import lightgbm as lgb

# Import our feature extractor
from audio_features import ComprehensiveAudioFeatureExtractor

class BeatMLExperiment:
    """
    Machine Learning experiment pipeline for beat classification.
    Trains multiple models and evaluates performance on labeled beat data.
    """
    
    def __init__(self, beats_folder: str = "beats"):
        """
        Initialize the ML experiment.
        
        Args:
            beats_folder: Path to folder containing train/ and test/ subfolders
        """
        self.beats_folder = Path(beats_folder)
        self.train_folder = self.beats_folder / "train"
        self.test_folder = self.beats_folder / "test"
        
        # Initialize feature extractor
        self.extractor = ComprehensiveAudioFeatureExtractor(
            sample_rate=22050,
            duration=30.0,
            offset=0.0
        )
        
        # Model configurations
        self.models = {
            'XGBoost': xgb.XGBClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42,
                eval_metric='logloss'
            ),
            'LightGBM': lgb.LGBMClassifier(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42,
                verbose=-1
            ),
            'RandomForest': RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            ),
            'LogisticRegression': LogisticRegression(
                random_state=42,
                max_iter=1000
            ),
            'SVM': SVC(
                kernel='rbf',
                random_state=42,
                probability=True
            )
        }
        
        # Results storage
        self.results = {}
        self.feature_importance = {}
        
    def find_audio_files(self, folder_path: Path) -> Dict[str, List[str]]:
        """
        Find audio files in train/test folders and organize by label.
        
        Args:
            folder_path: Path to train or test folder
            
        Returns:
            Dictionary with 'good' and 'bad' lists of file paths
        """
        audio_files = {'good': [], 'bad': []}
        
        if not folder_path.exists():
            print(f"❌ Folder not found: {folder_path}")
            return audio_files
            
        # Look for good/ and bad/ subfolders
        good_folder = folder_path / "good"
        bad_folder = folder_path / "bad"
        
        # Supported audio formats
        audio_extensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac']
        
        # Find good beats
        if good_folder.exists():
            for ext in audio_extensions:
                files = list(good_folder.glob(f"*{ext}"))
                audio_files['good'].extend([str(f) for f in files])
        
        # Find bad beats
        if bad_folder.exists():
            for ext in audio_extensions:
                files = list(bad_folder.glob(f"*{ext}"))
                audio_files['bad'].extend([str(f) for f in files])
        
        print(f"📁 Found {len(audio_files['good'])} good beats and {len(audio_files['bad'])} bad beats in {folder_path.name}")
        
        return audio_files
    
    def extract_features_from_files(self, files_dict: Dict[str, List[str]]) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Extract features from audio files and create labeled dataset.
        
        Args:
            files_dict: Dictionary with 'good' and 'bad' file lists
            
        Returns:
            Tuple of (features_df, labels_series)
        """
        all_features = []
        all_labels = []
        
        # Process good beats
        print(f"🎵 Extracting features from {len(files_dict['good'])} good beats...")
        for file_path in files_dict['good']:
            try:
                features = self.extractor.extract_all_features(file_path)
                # Remove metadata columns
                feature_data = {k: v for k, v in features.items() 
                              if k not in ['file_path', 'extraction_params', 'total_features_extracted']}
                all_features.append(feature_data)
                all_labels.append('good')
                print(f"✅ Processed: {Path(file_path).name}")
            except Exception as e:
                print(f"❌ Error processing {file_path}: {str(e)}")
        
        # Process bad beats
        print(f"🎵 Extracting features from {len(files_dict['bad'])} bad beats...")
        for file_path in files_dict['bad']:
            try:
                features = self.extractor.extract_all_features(file_path)
                # Remove metadata columns
                feature_data = {k: v for k, v in features.items() 
                              if k not in ['file_path', 'extraction_params', 'total_features_extracted']}
                all_features.append(feature_data)
                all_labels.append('bad')
                print(f"✅ Processed: {Path(file_path).name}")
            except Exception as e:
                print(f"❌ Error processing {file_path}: {str(e)}")
        
        # Create DataFrame
        df = pd.DataFrame(all_features)
        labels = pd.Series(all_labels)
        
        print(f"📊 Dataset created: {df.shape[0]} samples, {df.shape[1]} features")
        
        return df, labels
    
    def prepare_data(self) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
        """
        Prepare training and test datasets.
        
        Returns:
            Tuple of (X_train, y_train, X_test, y_test)
        """
        print("🔍 Preparing datasets...")
        
        # Find files in train and test folders
        train_files = self.find_audio_files(self.train_folder)
        test_files = self.find_audio_files(self.test_folder)
        
        # Extract features
        print("\n📈 Extracting training features...")
        X_train, y_train = self.extract_features_from_files(train_files)
        
        print("\n📈 Extracting test features...")
        X_test, y_test = self.extract_features_from_files(test_files)
        
        # Handle missing values
        X_train = X_train.fillna(0)
        X_test = X_test.fillna(0)
        
        # Encode labels
        label_encoder = LabelEncoder()
        y_train_encoded = label_encoder.fit_transform(y_train)
        y_test_encoded = label_encoder.transform(y_test)
        
        print(f"📊 Training set: {X_train.shape[0]} samples")
        print(f"📊 Test set: {X_test.shape[0]} samples")
        print(f"🎯 Classes: {label_encoder.classes_}")
        
        return X_train, y_train_encoded, X_test, y_test_encoded, label_encoder
    
    def train_and_evaluate_models(self, X_train: pd.DataFrame, y_train: np.ndarray,
                                 X_test: pd.DataFrame, y_test: np.ndarray) -> Dict[str, Any]:
        """
        Train multiple models and evaluate their performance.
        
        Args:
            X_train, y_train: Training data
            X_test, y_test: Test data
            
        Returns:
            Dictionary with model results
        """
        print("\n🤖 Training and evaluating models...")
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        results = {}
        
        for model_name, model in self.models.items():
            print(f"\n🎯 Training {model_name}...")
            
            try:
                # Train model
                model.fit(X_train_scaled, y_train)
                
                # Predictions
                y_pred = model.predict(X_test_scaled)
                y_pred_proba = model.predict_proba(X_test_scaled)[:, 1] if hasattr(model, 'predict_proba') else None
                
                # Calculate metrics
                accuracy = accuracy_score(y_test, y_pred)
                precision = precision_score(y_test, y_pred, average='weighted')
                recall = recall_score(y_test, y_pred, average='weighted')
                f1 = f1_score(y_test, y_pred, average='weighted')
                
                # ROC AUC (if probabilities available)
                roc_auc = roc_auc_score(y_test, y_pred_proba) if y_pred_proba is not None else None
                
                # Cross-validation score
                cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='accuracy')
                
                # Store results
                results[model_name] = {
                    'accuracy': float(accuracy),
                    'precision': float(precision),
                    'recall': float(recall),
                    'f1_score': float(f1),
                    'roc_auc': float(roc_auc) if roc_auc is not None else None,
                    'cv_mean': float(cv_scores.mean()),
                    'cv_std': float(cv_scores.std()),
                    'predictions': y_pred.tolist(),
                    'probabilities': y_pred_proba.tolist() if y_pred_proba is not None else None
                }
                
                # Feature importance (if available)
                if hasattr(model, 'feature_importances_'):
                    importance = model.feature_importances_
                    feature_names = X_train.columns
                    importance_dict = dict(zip(feature_names, importance))
                    # Sort by importance
                    sorted_importance = dict(sorted(importance_dict.items(), 
                                                  key=lambda x: x[1], reverse=True))
                    results[model_name]['feature_importance'] = sorted_importance
                
                print(f"✅ {model_name}: Accuracy={accuracy:.4f}, F1={f1:.4f}")
                
            except Exception as e:
                print(f"❌ Error training {model_name}: {str(e)}")
                results[model_name] = {'error': str(e)}
        
        return results
    
    def run_experiment(self) -> Dict[str, Any]:
        """
        Run the complete ML experiment.
        
        Returns:
            Dictionary with all experiment results
        """
        print("🚀 STARTING BEAT CLASSIFICATION EXPERIMENT")
        print("=" * 50)
        
        # Check folder structure
        if not self.beats_folder.exists():
            print(f"❌ Beats folder not found: {self.beats_folder}")
            print("📁 Expected structure:")
            print("   beats/")
            print("   ├── train/")
            print("   │   ├── good/")
            print("   │   └── bad/")
            print("   └── test/")
            print("       ├── good/")
            print("       └── bad/")
            return {}
        
        # Prepare data
        X_train, y_train, X_test, y_test, label_encoder = self.prepare_data()
        
        if X_train.empty or X_test.empty:
            print("❌ No data found in train/test folders!")
            return {}
        
        # Train and evaluate models
        model_results = self.train_and_evaluate_models(X_train, y_train, X_test, y_test)
        
        # Compile final results
        experiment_results = {
            'experiment_info': {
                'beats_folder': str(self.beats_folder),
                'train_samples': len(X_train),
                'test_samples': len(X_test),
                'total_features': len(X_train.columns),
                'classes': label_encoder.classes_.tolist()
            },
            'model_results': model_results,
            'dataset_info': {
                'feature_names': X_train.columns.tolist(),
                'train_shape': X_train.shape,
                'test_shape': X_test.shape
            }
        }
        
        # Save results
        self.save_results(experiment_results)
        
        # Print summary
        self.print_summary(experiment_results)
        
        return experiment_results
    
    def save_results(self, results: Dict[str, Any]):
        """Save experiment results to JSON files."""
        timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
        
        # Save main results
        results_file = self.beats_folder / f"ml_experiment_results_{timestamp}.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        # Save detailed model results
        for model_name, model_result in results['model_results'].items():
            if 'error' not in model_result:
                model_file = self.beats_folder / f"{model_name.lower()}_results_{timestamp}.json"
                with open(model_file, 'w') as f:
                    json.dump(model_result, f, indent=2, default=str)
        
        print(f"\n💾 Results saved to {self.beats_folder}")
        print(f"📄 Main results: ml_experiment_results_{timestamp}.json")
    
    def print_summary(self, results: Dict[str, Any]):
        """Print experiment summary."""
        print("\n" + "=" * 60)
        print("📊 EXPERIMENT SUMMARY")
        print("=" * 60)
        
        print(f"📁 Dataset: {results['experiment_info']['beats_folder']}")
        print(f"📈 Training samples: {results['experiment_info']['train_samples']}")
        print(f"📉 Test samples: {results['experiment_info']['test_samples']}")
        print(f"🔍 Features: {results['experiment_info']['total_features']}")
        print(f"🎯 Classes: {results['experiment_info']['classes']}")
        
        print("\n🏆 MODEL PERFORMANCE:")
        print("-" * 40)
        
        # Find best model
        best_model = None
        best_f1 = 0
        
        for model_name, model_result in results['model_results'].items():
            if 'error' not in model_result:
                accuracy = model_result['accuracy']
                f1 = model_result['f1_score']
                cv_mean = model_result['cv_mean']
                
                print(f"{model_name:15} | Acc: {accuracy:.4f} | F1: {f1:.4f} | CV: {cv_mean:.4f}")
                
                if f1 > best_f1:
                    best_f1 = f1
                    best_model = model_name
        
        if best_model:
            print(f"\n🥇 Best Model: {best_model} (F1: {best_f1:.4f})")
        
        # Show top features for best model
        if best_model and 'feature_importance' in results['model_results'][best_model]:
            print(f"\n🔍 Top 10 Features for {best_model}:")
            importance = results['model_results'][best_model]['feature_importance']
            for i, (feature, score) in enumerate(list(importance.items())[:10]):
                print(f"   {i+1:2d}. {feature:30} | {score:.4f}")


def run_ml_experiment(beats_folder: str = "beats"):
    """
    Run the complete ML experiment on the beats dataset.
    
    Args:
        beats_folder: Path to the beats folder with train/test subfolders
    """
    experiment = BeatMLExperiment(beats_folder)
    results = experiment.run_experiment()
    return results


if __name__ == "__main__":
    # Run experiment
    results = run_ml_experiment("beats") 