import sys
import os

# Add the backend directory to Python path so main.py imports resolve correctly
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_dir)

from main import app  # noqa: F401 — Vercel expects `app` exported from this module
