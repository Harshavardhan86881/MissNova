import sys
import os
import traceback

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

try:
    from main import app  # noqa: F401 — Vercel expects `app` exported from this module
except Exception as _import_error:
    # Fallback app to surface the import error as a JSON response
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    _error_detail = traceback.format_exc()
    app = FastAPI(title="Backend Error - Import Failed")

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def _import_error_handler(path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend failed to import",
                "exception": type(_import_error).__name__,
                "message": str(_import_error),
                "traceback": _error_detail,
                "backend_dir": backend_dir,
                "backend_exists": os.path.exists(backend_dir),
                "DATABASE_URL": os.getenv("DATABASE_URL", "NOT SET"),
            },
        )
