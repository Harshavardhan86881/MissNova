import sys
import os

# ── Vercel serverless: only /tmp is writable ──────────────────────────────────
# Must be set BEFORE importing backend so SQLAlchemy engine and Path() calls
# resolve to a writable location instead of the read-only /var/task filesystem.
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:////tmp/voice_tutor.db"
os.environ.setdefault("USERS_DATA_DIR", "/tmp/users_data")
os.environ.setdefault("AUTH_DATA_FILE", "/tmp/auth_data.json")
os.makedirs("/tmp/users_data", exist_ok=True)

# Add the backend directory to Python path so main.py imports resolve correctly
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

# Import the FastAPI app instance at the top-level
from main import app
