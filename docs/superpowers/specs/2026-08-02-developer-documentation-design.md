# Miss Nova Developer Documentation Design

**Date:** 2026-08-02  
**Status:** Draft — awaiting user review  
**Audience:** Product understanding + new developers (both)  
**Approach:** Full `docs/` handbook (Approach 2)

---

## Goal

Replace outdated, fragmented documentation with a coherent handbook under `docs/` so that:

1. A reader can understand **what Miss Nova is** and how the pieces fit together.
2. A developer can **set up, navigate, extend, and deploy** the app without reverse-engineering the repo.

Accuracy must reflect the **current codebase**, not the older `DOCUMENTATION.md` snapshot.

---

## Non-goals

- Auto-generated OpenAPI/Swagger site
- Repo-wide docstring cleanup in `backend/main.py`
- Fixing deployment or application bugs (documentation only)
- Git commits unless the user explicitly requests them

---

## Target structure

```
docs/
├── README.md                 # Docs index (entry point)
├── 01-overview.md            # Product + feature map + user journey
├── 02-architecture.md        # System design, deploy shape, data/auth model
├── 03-backend.md             # FastAPI modules, persistence, AI, gamification
├── 04-frontend.md            # React structure, pages, speech, auth client
├── 05-api-reference.md       # Endpoint catalog grouped by feature
├── 06-developer-guide.md     # Local setup, env, “where to change X”, gotchas
├── 07-deployment.md          # Vercel deployment (updated from DEPLOYMENT_GUIDE)
└── glossary.md               # Short term definitions
```

### Root file migration

| Current file | Action |
|--------------|--------|
| `README.md` | Rewrite: short pitch, quick start, link to `docs/` |
| `DOCUMENTATION.md` | Replace with stub pointing to `docs/README.md` and key chapters |
| `DEPLOYMENT_GUIDE.md` | Replace with stub pointing to `docs/07-deployment.md` |
| `CONTRIBUTING.md` | Update documentation links to `docs/README.md` |
| `backend/# Feature What It Does.py` | Leave unchanged; feature content lives in `01-overview.md` |

---

## Audience routing

| Reader | Start here | Then |
|--------|------------|------|
| Product / personal understanding | `01-overview.md` | `02-architecture.md` |
| New developer | `06-developer-guide.md` | `03-backend.md`, `04-frontend.md`, `05-api-reference.md` |
| Deploy / ops | `07-deployment.md` | `02-architecture.md` (Vercel section) |

---

## Content scope per file

### `docs/README.md`
Index of all chapters with one-line descriptions and the audience routing table above.

### `01-overview.md`
- What Miss Nova is (AI English communication tutor)
- Core features vs advanced tools (from current UI/API, aligned with feature checklist)
- High-level user journey: onboarding → practice → gamification → progress
- No deep code; link out to architecture and developer guide

### `02-architecture.md`
- Monorepo layout (`frontend/`, `backend/`, `api/`, `vercel.json`)
- Request flow: Browser (speech) → React → FastAPI → Groq → JSON progress/auth DB
- Dual persistence model:
  - Auth/users: SQLAlchemy + SQLite (`voice_tutor.db` / `DATABASE_URL`)
  - Progress: per-user JSON under `USERS_DATA_DIR` (`users_data/{id}.json`)
- Auth mental model: Bearer token in `localStorage`, silent `/api/auth/refresh`
- Vercel: static frontend + Python serverless via `api/index.py`; `/tmp` writable only
- Mermaid diagrams for system and sequence flows

### `03-backend.md`
- Modules: `main.py` (large route/content surface), `routers/auth.py`, `models.py`, `gamification.py`, `auth.py`
- How `get_user_id_from_request` / load-save progress works
- Groq client + JSON response pattern + repo-root `system_prompt.txt` (loaded via `backend/main.py`)
- Gamification matching **current** code: level ≈ √(XP/10), streak freeze, badges
- Content catalogs (scenarios, tongue twisters, vocab, etc.) at a summary level
- Explicit note: `main.py` is a monolith / known debt

### `04-frontend.md`
- Stack: React 19, Vite 6, Tailwind 4, Lucide
- `App.jsx` page switcher (not React Router) + page → component map
- Auth: `voice_tutor_auth`, `authFetch`, axios `api/config.js`
- Web Speech API usage pattern (recognition + TTS)
- Onboarding gate and language preference
- Styling: Tailwind + `index.css` design tokens (describe, don’t redesign)

### `05-api-reference.md`
- Source of truth: current `@app.*` / auth router routes in code
- Groups: Auth, Practice, Content, Stats/Progress, Learning tools (translate, BLUF, tone, listening, fillers, placement, grammar, idioms, SRS, writing), Utility
- Full request/response sketches for primary practice endpoints; table-style briefs for the rest
- Do not copy obsolete endpoint lists from old `DOCUMENTATION.md`

### `06-developer-guide.md`
- Prerequisites (Node 18+, Python 3.10+, Groq key)
- Backend venv + `uvicorn`, frontend `npm run dev`, Vite proxy to `:8000`
- Required env vars from `.env.example`
- Common tasks: add scenario, add API route, add frontend page, wire auth header
- Gotchas: CORS allowlist, Vercel `/tmp` wipe, cold-start DB, Windows venv activate

### `07-deployment.md`
- How `vercel.json` builds/routes today
- Env vars: `GROQ_API_KEY`, `SECRET_KEY`, optional `DATABASE_URL`
- Ephemeral storage limits and Neon/Postgres recommendation
- Distill useful historical bug fixes from `DEPLOYMENT_GUIDE.md`
- Refresh status table against **current** code (CORS allowlist, axios present, etc.)

### `glossary.md`
Short definitions: XP, fluency score, streak, streak freeze, badge, scenario, SRS, BLUF, Miss Nova persona, etc.

---

## Writing standards

1. **Code-backed:** Verify against live files while writing; never invent features.
2. **Prefer scannable format:** tables, short lists, mermaid; avoid prose walls.
3. **Honest debt:** Mark fragile areas (monolith `main.py`, ephemeral Vercel data, simple token/hash auth, mock leaderboard if still mock).
4. **Stable links:** Use relative links between docs; stubs preserve old top-level URLs.
5. **No secrets:** Never paste real API keys or `.env` contents.

---

## Delivery order

1. This design spec (review gate)
2. Implementation plan (`docs/superpowers/plans/…`) after spec approval
3. Write handbook files in order:
   - `docs/README.md`
   - `01` → `02` → `03` → `04` → `05` → `06` → `07` → `glossary.md`
4. Update root `README.md`, stubs, and `CONTRIBUTING.md` links
5. User review of finished handbook

---

## Success criteria

- A new developer can run the app locally using only `06-developer-guide.md` + root README.
- Architecture doc correctly describes dual storage and Vercel constraints.
- API reference lists endpoints that exist in code today (including learning-tool routes).
- Old top-level doc paths still resolve via stubs.
- Product overview matches the real feature set in `App.jsx` / backend routes.

---

## Open risks

| Risk | Mitigation |
|------|------------|
| Docs drift again as `main.py` grows | Prefer “where to look in code” over duplicating every constant |
| Deployment status table goes stale | Tie claims to files (`vercel.json`, `api/index.py`, CORS in `main.py`) |
| Auth model has multiple paths (guest vs DB) | Document both clearly in architecture + developer guide |
