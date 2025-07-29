#!/usr/bin/env python3
"""
Beat Classification ML Experiment Runner
Runs the complete ML experiment on your beats dataset
"""

import sys
from pathlib import Path

# Add src/lib to path
current_dir = Path(__file__).parent
src_lib_dir = current_dir / "src" / "lib"
sys.path.insert(0, str(src_lib_dir))

try:
    from ml_experiment import run_ml_experiment
except ImportError as e:
    print("❌ Error importing ML experiment module:")
    print(f"   {e}")
    print("\n💡 Make sure you have installed the required dependencies:")
    print("   pip install -r requirements-audio.txt")
    sys.exit(1)

def main():
    print("🤖 BEAT CLASSIFICATION ML EXPERIMENT")
    print("=" * 50)
    
    # Check if beats folder exists
    beats_folder = Path("beats")
    if not beats_folder.exists():
        print("❌ Beats folder not found!")
        print("\n📁 Please create the following folder structure:")
        print("   beats/")
        print("   ├── train/")
        print("   │   ├── good/     # Put your good training beats here")
        print("   │   └── bad/      # Put your bad training beats here")
        print("   └── test/")
        print("       ├── good/     # Put your good test beats here")
        print("       └── bad/      # Put your bad test beats here")
        print("\n🎵 Supported formats: MP3, WAV, FLAC, M4A, AAC")
        sys.exit(1)
    
    # Check folder structure
    train_folder = beats_folder / "train"
    test_folder = beats_folder / "test"
    
    if not train_folder.exists() or not test_folder.exists():
        print("❌ Missing train/ or test/ folders!")
        print("📁 Please create the folder structure as shown above.")
        sys.exit(1)
    
    train_good = train_folder / "good"
    train_bad = train_folder / "bad"
    test_good = test_folder / "good"
    test_bad = test_folder / "bad"
    
    # Count files
    train_good_count = len(list(train_good.glob("*.mp3")) + list(train_good.glob("*.wav")) + 
                       list(train_good.glob("*.flac")) + list(train_good.glob("*.m4a")))
    train_bad_count = len(list(train_bad.glob("*.mp3")) + list(train_bad.glob("*.wav")) + 
                      list(train_bad.glob("*.flac")) + list(train_bad.glob("*.m4a")))
    test_good_count = len(list(test_good.glob("*.mp3")) + list(test_good.glob("*.wav")) + 
                      list(test_good.glob("*.flac")) + list(test_good.glob("*.m4a")))
    test_bad_count = len(list(test_bad.glob("*.mp3")) + list(test_bad.glob("*.wav")) + 
                     list(test_bad.glob("*.flac")) + list(test_bad.glob("*.m4a")))
    
    print(f"📊 Dataset Summary:")
    print(f"   Training - Good: {train_good_count}, Bad: {train_bad_count}")
    print(f"   Test     - Good: {test_good_count}, Bad: {test_bad_count}")
    print(f"   Total    - {train_good_count + train_bad_count + test_good_count + test_bad_count} beats")
    
    if train_good_count == 0 or train_bad_count == 0:
        print("\n⚠️  Warning: You need both good and bad beats in training!")
        print("   The model needs examples of both classes to learn.")
    
    if test_good_count == 0 or test_bad_count == 0:
        print("\n⚠️  Warning: You need both good and bad beats in test!")
        print("   This will affect evaluation metrics.")
    
    print(f"\n🚀 Starting ML experiment...")
    print(f"📁 Working directory: {beats_folder}")
    
    # Run the experiment
    try:
        results = run_ml_experiment("beats")
        
        if results:
            print("\n🎉 EXPERIMENT COMPLETED SUCCESSFULLY!")
            print("📄 Check the beats/ folder for results JSON files")
        else:
            print("\n❌ Experiment failed! Check the error messages above.")
            
    except Exception as e:
        print(f"\n❌ Error during experiment: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 