# 🤖 Beat Classification ML Experiment

A comprehensive machine learning pipeline for training and evaluating models on labeled beat data. This system extracts **280+ audio features** and trains multiple ML models to classify beats as "good" or "bad".

## 📁 Folder Structure

Create this folder structure with your labeled beats:

```
beats/
├── train/
│   ├── good/     # Put your good training beats here
│   └── bad/      # Put your bad training beats here
└── test/
    ├── good/     # Put your good test beats here
    └── bad/      # Put your bad test beats here
```

## 🚀 Quick Start

### 1. **Setup Dependencies**
```bash
# Install audio processing dependencies
pip install -r requirements-audio.txt

# Install FFmpeg (if not already installed)
brew install ffmpeg  # macOS
# sudo apt install ffmpeg  # Ubuntu
```

### 2. **Prepare Your Dataset**
```bash
# Create the folder structure
mkdir -p beats/train/good beats/train/bad beats/test/good beats/test/bad

# Copy your labeled beats into the appropriate folders
# Example:
cp my_good_beats/*.mp3 beats/train/good/
cp my_bad_beats/*.mp3 beats/train/bad/
cp my_test_good_beats/*.mp3 beats/test/good/
cp my_test_bad_beats/*.mp3 beats/test/bad/
```

### 3. **Run the Experiment**
```bash
python3 run_ml_experiment.py
```

## 📊 What the Experiment Does

### 🔍 **Feature Extraction**
- Extracts **280+ audio features** using librosa
- Features include: spectral, MFCC, chroma, rhythm, harmonic analysis
- Handles multiple audio formats (MP3, WAV, FLAC, M4A, AAC)

### 🤖 **Models Trained**
1. **XGBoost** - Gradient boosting, excellent for structured data
2. **LightGBM** - Fast gradient boosting with categorical support
3. **Random Forest** - Ensemble method, good for feature importance
4. **Logistic Regression** - Linear model, interpretable
5. **SVM** - Support Vector Machine, good for small datasets

### 📈 **Evaluation Metrics**
- **Accuracy** - Overall correct predictions
- **Precision** - True positives / (True positives + False positives)
- **Recall** - True positives / (True positives + False negatives)
- **F1 Score** - Harmonic mean of precision and recall
- **ROC AUC** - Area under ROC curve
- **Cross-validation** - 5-fold CV for robust evaluation

## 📄 Output Files

After running the experiment, you'll get these JSON files in your `beats/` folder:

```
beats/
├── ml_experiment_results_20241201_143022.json    # Main results
├── xgboost_results_20241201_143022.json         # XGBoost details
├── lightgbm_results_20241201_143022.json        # LightGBM details
├── randomforest_results_20241201_143022.json     # Random Forest details
└── ... (other model results)
```

### 📊 **Main Results Structure**
```json
{
  "experiment_info": {
    "beats_folder": "beats",
    "train_samples": 50,
    "test_samples": 20,
    "total_features": 283,
    "classes": ["bad", "good"]
  },
  "model_results": {
    "XGBoost": {
      "accuracy": 0.85,
      "precision": 0.87,
      "recall": 0.85,
      "f1_score": 0.86,
      "roc_auc": 0.92,
      "cv_mean": 0.83,
      "cv_std": 0.05,
      "feature_importance": {
        "tempo": 0.15,
        "mfcc_1_mean": 0.12,
        "spectral_centroid_mean": 0.10,
        "...": "..."
      }
    },
    "LightGBM": { "...": "..." },
    "RandomForest": { "...": "..." }
  }
}
```

## 🎯 Example Results

```
🚀 STARTING BEAT CLASSIFICATION EXPERIMENT
==================================================

📁 Found 25 good beats and 25 bad beats in train
📁 Found 10 good beats and 10 bad beats in test

🎵 Extracting features from 25 good beats...
✅ Processed: beat1.mp3
✅ Processed: beat2.mp3
...

🤖 Training and evaluating models...

🎯 Training XGBoost...
✅ XGBoost: Accuracy=0.8500, F1=0.8600

🎯 Training LightGBM...
✅ LightGBM: Accuracy=0.8000, F1=0.8200

🎯 Training RandomForest...
✅ RandomForest: Accuracy=0.7500, F1=0.7800

============================================================
📊 EXPERIMENT SUMMARY
============================================================
📁 Dataset: beats
📈 Training samples: 50
📉 Test samples: 20
🔍 Features: 283
🎯 Classes: ['bad', 'good']

🏆 MODEL PERFORMANCE:
----------------------------------------
XGBoost        | Acc: 0.8500 | F1: 0.8600 | CV: 0.8300
LightGBM       | Acc: 0.8000 | F1: 0.8200 | CV: 0.7800
RandomForest    | Acc: 0.7500 | F1: 0.7800 | CV: 0.7200

🥇 Best Model: XGBoost (F1: 0.8600)

🔍 Top 10 Features for XGBoost:
    1. tempo                           | 0.1500
    2. mfcc_1_mean                     | 0.1200
    3. spectral_centroid_mean          | 0.1000
    4. harmonic_ratio                  | 0.0850
    5. rms_mean                        | 0.0750
    ...
```

## 🔧 Customization

### **Model Parameters**
Edit `src/lib/ml_experiment.py` to customize model hyperparameters:

```python
self.models = {
    'XGBoost': xgb.XGBClassifier(
        n_estimators=200,      # More trees
        max_depth=8,           # Deeper trees
        learning_rate=0.05,    # Slower learning
        random_state=42
    ),
    # ... other models
}
```

### **Feature Extraction**
Modify extraction parameters in the experiment:

```python
self.extractor = ComprehensiveAudioFeatureExtractor(
    sample_rate=44100,    # Higher quality
    duration=60.0,        # Longer analysis
    offset=0.0
)
```

### **Evaluation Metrics**
Add custom metrics in `train_and_evaluate_models()`:

```python
# Add custom metrics
from sklearn.metrics import balanced_accuracy_score
balanced_acc = balanced_accuracy_score(y_test, y_pred)
results[model_name]['balanced_accuracy'] = float(balanced_acc)
```

## 📈 Best Practices

### **Dataset Size**
- **Minimum**: 20 samples per class (40 total)
- **Recommended**: 50+ samples per class (100+ total)
- **Optimal**: 100+ samples per class (200+ total)

### **Data Quality**
- **Balanced classes**: Equal number of good/bad beats
- **Diverse samples**: Different genres, tempos, styles
- **Consistent labeling**: Same criteria for good/bad classification

### **Model Selection**
- **Small dataset** (< 50 samples): SVM, Logistic Regression
- **Medium dataset** (50-200 samples): Random Forest, XGBoost
- **Large dataset** (> 200 samples): LightGBM, XGBoost

## 🚨 Troubleshooting

### **Common Issues**

**1. "No module named 'librosa'"**
```bash
pip install librosa soundfile audioread
```

**2. "FFmpeg not found"**
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

**3. "No data found in train/test folders"**
- Check folder structure matches the expected layout
- Ensure audio files are in supported formats
- Verify good/ and bad/ subfolders exist

**4. "Poor model performance"**
- Increase dataset size
- Ensure balanced classes
- Check feature quality
- Try different model parameters

### **Performance Tips**

- **Large datasets**: Use `duration=15.0` for faster processing
- **Memory issues**: Process files in batches
- **Slow training**: Reduce `n_estimators` in model parameters

## 🔮 Next Steps

After running the experiment:

1. **Analyze Results**: Check which features are most important
2. **Model Selection**: Choose the best performing model
3. **Hyperparameter Tuning**: Optimize model parameters
4. **Integration**: Use the trained model in your Beatify platform
5. **Active Learning**: Continuously improve with new labeled data

## 📚 References

- **Librosa Documentation**: https://librosa.org/doc/latest/index.html
- **XGBoost Guide**: https://xgboost.readthedocs.io/
- **LightGBM Guide**: https://lightgbm.readthedocs.io/
- **Scikit-learn**: https://scikit-learn.org/

---

**🎉 Ready to train your beat classification models!** 