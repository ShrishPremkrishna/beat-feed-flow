#!/bin/bash

# Beatify Audio Feature Extraction Setup Script
# This script installs all required dependencies for the librosa-based feature extraction pipeline

echo "🎵 BEATIFY AUDIO FEATURE EXTRACTION SETUP"
echo "========================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo "🖥️  Detected OS: $OS"

# Check Python version
echo ""
echo "🐍 Checking Python installation..."
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version 2>&1 | grep -o '[0-9]\+\.[0-9]\+')
    echo "✅ Python 3 found: $(python3 --version)"
    PYTHON_CMD="python3"
elif command_exists python; then
    PYTHON_VERSION=$(python --version 2>&1 | grep -o '[0-9]\+\.[0-9]\+')
    echo "✅ Python found: $(python --version)"
    PYTHON_CMD="python"
else
    echo "❌ Python not found! Please install Python 3.8 or higher."
    exit 1
fi

# Check if pip is available
echo ""
echo "📦 Checking pip installation..."
if command_exists pip3; then
    PIP_CMD="pip3"
    echo "✅ pip3 found"
elif command_exists pip; then
    PIP_CMD="pip"
    echo "✅ pip found"
else
    echo "❌ pip not found! Please install pip."
    exit 1
fi

# Install/Check ffmpeg
echo ""
echo "🎬 Checking ffmpeg installation..."
if command_exists ffmpeg; then
    echo "✅ ffmpeg is already installed: $(ffmpeg -version | head -n1)"
else
    echo "❌ ffmpeg not found. Installing..."
    
    case $OS in
        "macos")
            if command_exists brew; then
                echo "📦 Installing ffmpeg via Homebrew..."
                brew install ffmpeg
            else
                echo "❌ Homebrew not found. Please install Homebrew first:"
                echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                exit 1
            fi
            ;;
        "linux")
            if command_exists apt-get; then
                echo "📦 Installing ffmpeg via apt..."
                sudo apt-get update
                sudo apt-get install -y ffmpeg
            elif command_exists yum; then
                echo "📦 Installing ffmpeg via yum..."
                sudo yum install -y ffmpeg
            else
                echo "❌ Package manager not found. Please install ffmpeg manually:"
                echo "   Ubuntu/Debian: sudo apt install ffmpeg"
                echo "   CentOS/RHEL: sudo yum install ffmpeg"
                exit 1
            fi
            ;;
        "windows")
            echo "❌ Windows detected. Please install ffmpeg manually:"
            echo "   1. Download from: https://ffmpeg.org/download.html"
            echo "   2. Extract and add to PATH"
            echo "   3. Restart terminal and run this script again"
            exit 1
            ;;
        *)
            echo "❌ Unknown OS. Please install ffmpeg manually."
            exit 1
            ;;
    esac
fi

# Install Python dependencies
echo ""
echo "📚 Installing Python dependencies..."
if [[ -f "requirements-audio.txt" ]]; then
    echo "📋 Installing from requirements-audio.txt..."
    $PIP_CMD install -r requirements-audio.txt
    
    if [[ $? -eq 0 ]]; then
        echo "✅ All Python dependencies installed successfully!"
    else
        echo "❌ Failed to install some dependencies. Trying individual packages..."
        
        # Core packages
        packages=(
            "librosa>=0.10.0"
            "soundfile>=0.12.1"
            "audioread>=3.0.0"
            "numpy>=1.21.0"
            "scipy>=1.7.0"
            "pandas>=1.3.0"
            "scikit-learn>=1.0.0"
            "xgboost>=1.6.0"
            "lightgbm>=3.3.0"
        )
        
        for package in "${packages[@]}"; do
            echo "📦 Installing $package..."
            $PIP_CMD install "$package"
        done
    fi
else
    echo "❌ requirements-audio.txt not found. Installing core packages..."
    
    # Install core packages directly
    core_packages="librosa soundfile audioread numpy scipy pandas scikit-learn xgboost lightgbm matplotlib"
    $PIP_CMD install $core_packages
fi

# Test the installation
echo ""
echo "🧪 Testing installation..."
$PYTHON_CMD -c "
import librosa
import numpy as np
import pandas as pd
import sklearn
import xgboost
import lightgbm
print('✅ All core libraries imported successfully!')
print(f'📚 Librosa version: {librosa.__version__}')
print(f'📊 NumPy version: {np.__version__}')
print(f'🐼 Pandas version: {pd.__version__}')
print(f'🤖 Scikit-learn version: {sklearn.__version__}')
print(f'🚀 XGBoost version: {xgboost.__version__}')
print(f'💡 LightGBM version: {lightgbm.__version__}')
"

if [[ $? -eq 0 ]]; then
    echo ""
    echo "🎉 SETUP COMPLETE!"
    echo "=================="
    echo ""
    echo "✅ All dependencies installed successfully!"
    echo "✅ Audio feature extraction pipeline is ready!"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Test the pipeline:"
    echo "      python test_audio_features.py path/to/your/audio.mp3"
    echo ""
    echo "   2. Or run automatic test:"
    echo "      python test_audio_features.py"
    echo ""
    echo "   3. Check the generated files:"
    echo "      - extracted_features_*.json"
    echo "      - extracted_features_*.csv"
    echo ""
    echo "📚 Documentation: https://librosa.org/doc/latest/index.html"
    echo "🐛 Issues? Check the troubleshooting section in test_audio_features.py"
    
else
    echo ""
    echo "❌ SETUP FAILED!"
    echo "==============="
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Check Python version (requires 3.8+)"
    echo "   2. Update pip: pip install --upgrade pip"
    echo "   3. Install manually: pip install librosa numpy pandas"
    echo "   4. Check ffmpeg: ffmpeg -version"
    exit 1
fi 