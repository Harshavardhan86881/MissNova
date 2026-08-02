# 06 — Developer Guide

## Prerequisites

- Node.js 18+
- Python 3.10+
- A [Groq API key](https://console.groq.com/)

---

## Backend setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env — set GROQ_API_KEY and SECRET_KEY

uvicorn main:app --reload
```

API: `http://localhost:8000`  
Interactive docs (if enabled): `http://localhost:8000/docs`

---

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`  
`/api` is proxied to `http://localhost:8000` (`vite.config.js`).

---

## Environment variables

From `backend/.env.example`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `GROQ_API_KEY` | Yes | All AI features |
| `SECRET_KEY` | Yes (prod) | Auth / signing related config |
| `COOKIE_SECURE` | No | Cookie secure flag (`false` locally) |
| `COOKIE_SAME_SITE` | No | Cookie SameSite (`lax` locally) |
| `DATABASE_URL` | No | Default SQLite `sqlite:///./voice_tutor.db` |
| `USERS_DATA_DIR` | No | Override progress JSON directory |
| `AUTH_DATA_FILE` | No | Override auth JSON path (Vercel uses `/tmp`) |

Never commit `.env` with real secrets.

---

## Common tasks

### Add a scenario

1. Add/edit the scenario object in the `SCENARIOS` (or equivalent) structure in `backend/main.py`.
2. Ensure `GET /api/scenarios` returns it.
3. Update UI copy/cards in `frontend/src/components/Scenarios.jsx` if the UI hardcodes anything.

### Add an API route

1. Prefer a dedicated router module under `backend/routers/` for large features; small endpoints often land in `main.py` today.
2. Call from the frontend with relative `/api/...` via `authFetch` or axios so the Bearer token is attached.
3. Document the route in [05-api-reference](./05-api-reference.md).

### Add a frontend page

1. Create `frontend/src/components/MyFeature.jsx`.
2. Import it in `App.jsx` and add a `case` in `renderPage()`.
3. Add nav entries in `Sidebar.jsx` and `MobileNav.jsx`.
4. Wire `navigateTo('my-page-id')` from Dashboard if needed.

### Wire auth

- Read token from `localStorage.voice_tutor_auth`.
- Prefer existing `authFetch` / axios helpers rather than raw `fetch` without headers.

---

## Gotchas

| Issue | Detail |
|-------|--------|
| CORS | Origins are allowlisted in `main.py` — add your origin if the browser blocks credentials |
| Vite proxy | Frontend must call `/api`, not hardcode `localhost:8000` in production builds |
| Windows venv | Use `venv\Scripts\activate` |
| Vercel `/tmp` | DB and progress wipe on cold start unless you use external Postgres / durable storage |
| Two level formulas | Live API uses `calculate_level` in `main.py`; `gamification.py` is unused by routes |
| Dual auth logout | Both router and `main.py` define logout-related paths — check which the client calls |

---

## Useful links

- [Architecture](./02-architecture.md)
- [Backend](./03-backend.md)
- [Frontend](./04-frontend.md)
- [API Reference](./05-api-reference.md)
- [Deployment](./07-deployment.md)
