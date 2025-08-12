#!/bin/bash

# Install dependencies if not already installed
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Start the FastAPI server
echo "Starting Beat Analysis API..."
python main.py
