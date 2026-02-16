#!/bin/bash

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
else
    echo "Virtual environment 'venv' already exists."
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

echo "---------------------------------------------------"
echo "Setup complete!"
echo "To start the server, run:"
echo "source venv/bin/activate"w
echo "uvicorn main:app --reload"
echo "---------------------------------------------------"
