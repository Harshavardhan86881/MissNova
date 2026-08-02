# 07 — Deployment (Vercel)

Miss Nova deploys as **static frontend + Python serverless API** on Vercel.

---

## How Vercel builds this repo

From `vercel.json`:

| Build | Source | Output / role |
|-------|--------|----------------|
| Static | root `package.json` → `vercel-build` → `frontend` build | `frontend/dist` |
| Python | `api/index.py` | FastAPI `app` imported from `backend/` |

**Routes:**

1. `/api/(.*)` → `api/index.py`
2. filesystem (static assets)
3. `/(.*)` → `index.html` (SPA)

Root `package.json` script:

```json
"vercel-build": "cd frontend && npm install && npm run build"
```

---

## Serverless bootstrap (`api/index.py`)

Before importing backend:

- Default `DATABASE_URL` → `sqlite:////tmp/voice_tutor.db`
- `USERS_DATA_DIR` → `/tmp/users_data`
- `AUTH_DATA_FILE` → `/tmp/auth_data.json`
- Adds `backend/` to `sys.path`, then `from main import app`

Import failures return a JSON 500 with traceback (helpful for deploy debugging).

---

## Environment variables (Vercel Dashboard)

| Variable | Required | Notes |
|----------|----------|-------|
| `GROQ_API_KEY` | Yes | AI features fail without it |
| `SECRET_KEY` | Yes | Auth signing / security |
| `DATABASE_URL` | Recommended for prod | Use Neon/Postgres; otherwise SQLite in `/tmp` is wiped on cold start |

Progress JSON under `/tmp/users_data` is also ephemeral on Vercel. Plan durable storage if accounts must keep XP across cold starts.

---

## Current status (verified against repo)

| Area | Status | Evidence |
|------|--------|----------|
| axios dependency | OK | `frontend/package.json` lists `axios` |
| CORS | OK | Explicit origins in `backend/main.py` (not `*` + credentials) |
| `/tmp` redirects | OK | `api/index.py` sets DB + users dir + auth file |
| `/api/auth/refresh` | OK | `backend/routers/auth.py` |
| `api/requirements.txt` pins | OK | Version ranges pinned |
| `functions.maxDuration` | Missing | `vercel.json` has no `maxDuration`; long Groq calls may hit platform default timeouts |

---

## Historical deploy bugs (summary)

Earlier issues documented in the old deployment guide included: missing axios / invalid JS in `config.js`, read-only filesystem writes, missing refresh route, CORS wildcard + credentials, AI timeouts, unpinned Python deps. Most of those are addressed in the current tree; treat the table above as the live checklist.

---

## Local production-like check

```bash
cd frontend && npm run build
cd ../backend && uvicorn main:app --reload
# Optionally serve frontend preview: cd frontend && npm run preview
```

For Vercel CLI: link the project, set env vars, then `vercel deploy`.

See also: [Architecture](./02-architecture.md) dual-persistence section.
