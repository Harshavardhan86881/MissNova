# Miss Nova Developer Documentation Handbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a full `docs/` handbook plus root README/stubs so product understanding and new-developer onboarding both work from current code.

**Architecture:** Handbook lives under `docs/` (numbered chapters + glossary + index). Root `DOCUMENTATION.md` and `DEPLOYMENT_GUIDE.md` become stubs. Content is code-backed from `backend/main.py`, `backend/routers/auth.py`, `frontend/src/App.jsx`, `api/index.py`, and `vercel.json`. Spec: `docs/superpowers/specs/2026-08-02-developer-documentation-design.md`.

**Tech Stack:** Markdown + Mermaid; no application code changes.

## Global Constraints

- Audience: product understanding + new developers (both).
- Accuracy must match current codebase, not old `DOCUMENTATION.md`.
- Prefer tables, short lists, mermaid; no prose walls.
- Mark known debt honestly (monolith `main.py`, Vercel `/tmp`, simple auth tokens).
- Never paste secrets / real `.env` values.
- Do **not** git commit unless the user explicitly asks (spec non-goal).
- Do not fix app bugs in this plan — documentation only.
- Relative links between docs; stubs preserve old top-level URLs.

## File map

| File | Responsibility |
|------|----------------|
| `docs/README.md` | Index + audience routing |
| `docs/01-overview.md` | Product + features + journey |
| `docs/02-architecture.md` | System/data/auth/deploy shape |
| `docs/03-backend.md` | Backend modules + AI + gamification |
| `docs/04-frontend.md` | React pages + speech + auth client |
| `docs/05-api-reference.md` | Endpoint catalog |
| `docs/06-developer-guide.md` | Setup + common tasks + gotchas |
| `docs/07-deployment.md` | Vercel deployment |
| `docs/glossary.md` | Term definitions |
| `README.md` | Short pitch + quick start + link to docs |
| `DOCUMENTATION.md` | Stub → docs |
| `DEPLOYMENT_GUIDE.md` | Stub → docs/07 |
| `CONTRIBUTING.md` | Update doc links only |

---

### Task 1: Docs index

**Files:**
- Create: `docs/README.md`

**Interfaces:**
- Consumes: Spec audience routing table
- Produces: Entry point linking `01`–`07` + `glossary.md`

- [ ] **Step 1: Create `docs/README.md`**

Write exactly this structure (fill descriptions in one line each):

```markdown
# Miss Nova Documentation

Handbook for understanding and developing Miss Nova.

## Who should read what

| Reader | Start here | Then |
|--------|------------|------|
| Product / understanding | [01-overview](./01-overview.md) | [02-architecture](./02-architecture.md) |
| New developer | [06-developer-guide](./06-developer-guide.md) | [03-backend](./03-backend.md), [04-frontend](./04-frontend.md), [05-api-reference](./05-api-reference.md) |
| Deploy / ops | [07-deployment](./07-deployment.md) | [02-architecture](./02-architecture.md) |

## Chapters

1. [Overview](./01-overview.md) — …
2. [Architecture](./02-architecture.md) — …
3. [Backend](./03-backend.md) — …
4. [Frontend](./04-frontend.md) — …
5. [API Reference](./05-api-reference.md) — …
6. [Developer Guide](./06-developer-guide.md) — …
7. [Deployment](./07-deployment.md) — …
8. [Glossary](./glossary.md) — …

## Spec

Design: [`docs/superpowers/specs/2026-08-02-developer-documentation-design.md`](./superpowers/specs/2026-08-02-developer-documentation-design.md)
```

- [ ] **Step 2: Verify**

Confirm file exists and all relative links resolve to intended sibling paths (files may not exist yet until later tasks — links must be correct).

---

### Task 2: Overview

**Files:**
- Create: `docs/01-overview.md`
- Read: `frontend/src/App.jsx` (page switch), `backend/# Feature What It Does.py`

**Interfaces:**
- Consumes: Feature list from App pages + feature checklist file
- Produces: Product narrative for architecture/dev guide to link back to

- [ ] **Step 1: Create `docs/01-overview.md`**

Must include:
1. One-paragraph product definition (AI English communication tutor / Miss Nova persona).
2. **Core features** table: Free Practice, Scenarios, Tongue Twisters, Daily Challenge, Daily Vocab, Vocabulary Bank, Progress, Gamification, Onboarding, Notifications.
3. **Advanced tools** table mapped to `App.jsx` pages: translate, bluf-generator, tone-calibrator, listening-simulator, filler-tracker, placement-test, grammar-lessons, idiom-engine, srs-review, writing-workshop, conversation-replay.
4. User journey (short): onboarding/auth → dashboard → practice modes → XP/badges → progress.
5. Links to `02-architecture.md` and `06-developer-guide.md`.
6. No deep code.

- [ ] **Step 2: Verify against App.jsx**

Every `case` in `renderPage()` except `dashboard`/`default` appears in Core or Advanced tables.

---

### Task 3: Architecture

**Files:**
- Create: `docs/02-architecture.md`
- Read: `api/index.py`, `vercel.json`, `backend/main.py` (CORS, USERS_DATA_DIR, get_user_id_from_request), `backend/models.py` (DATABASE_URL)

**Interfaces:**
- Consumes: Dual persistence + Vercel facts from code
- Produces: Mental model referenced by backend/frontend/deployment docs

- [ ] **Step 1: Create `docs/02-architecture.md`**

Must include:
1. Monorepo tree (`frontend/`, `backend/`, `api/`, `vercel.json`, root `system_prompt.txt`).
2. Mermaid system diagram: Browser Speech ↔ React ↔ FastAPI ↔ Groq; SQLite auth; JSON progress.
3. Mermaid sequence for voice practice: mic → STT → POST `/api/process-text` → Groq → XP save → TTS.
4. Dual persistence section:
   - Auth: SQLAlchemy / `DATABASE_URL` / `voice_tutor.db`
   - Progress: `USERS_DATA_DIR` / `{user_id}.json`
5. Auth: Bearer token `user_id:username:hex` in `localStorage` key `voice_tutor_auth`; silent refresh `POST /api/auth/refresh`.
6. Vercel: static build from `frontend/dist` + Python `api/index.py`; env defaults for `/tmp` paths.
7. Known limitations: ephemeral `/tmp` on Vercel; large `main.py`.

- [ ] **Step 2: Verify**

CORS allowlist and `/tmp` env defaults match `backend/main.py` + `api/index.py` (cite in prose).

---

### Task 4: Backend guide

**Files:**
- Create: `docs/03-backend.md`
- Read: `backend/main.py` (structure headers), `backend/gamification.py` (`calculate_level`), `backend/routers/auth.py`, `backend/models.py`, root `system_prompt.txt`

**Interfaces:**
- Consumes: Architecture dual-storage model
- Produces: Module map for developer “where to change X”

- [ ] **Step 1: Create `docs/03-backend.md`**

Must include:
1. Module table:

| File | Role |
|------|------|
| `backend/main.py` | FastAPI app, content catalogs, most `/api/*` routes |
| `backend/routers/auth.py` | `/api/auth/*` router |
| `backend/models.py` | SQLAlchemy User + DB session |
| `backend/gamification.py` | Level/XP/badge helpers (DB-oriented) |
| `backend/auth.py` | Auth helpers used by gamification |
| `system_prompt.txt` | Tutor system prompt (repo root) |

2. Progress load/save: `get_user_id_from_request`, `load_user_progress`, `save_user_progress`.
3. Groq: `get_groq_client()`, model name as in code, JSON response expectation.
4. Gamification: document **current** formula from `gamification.py`: `Level = floor(sqrt(XP / 10))`; mention streak freeze fields in default user data; note XP also updated inline in `main.py` for many routes.
5. Content: scenarios / tongue twisters / vocab defined in `main.py` (point to file, don’t dump all).
6. Explicit debt: monolith `main.py`; simple SHA256 password hashing in auth router (not production-grade).

- [ ] **Step 2: Verify**

Quote the level formula consistent with `calculate_level` in `gamification.py`. Confirm `system_prompt.txt` path is repo root (`parent.parent / "system_prompt.txt"` from `main.py`).

---

### Task 5: Frontend guide

**Files:**
- Create: `docs/04-frontend.md`
- Read: `frontend/src/App.jsx`, `frontend/src/api/config.js`, `frontend/src/utils/authFetch.js`, `frontend/vite.config.js`, `frontend/package.json`

**Interfaces:**
- Consumes: Page IDs from Task 2
- Produces: Page → component map for API/dev guides

- [ ] **Step 1: Create `docs/04-frontend.md`**

Must include:
1. Stack from `package.json`: React 19, Vite 6, Tailwind 4, axios, lucide-react.
2. Entry: `main.jsx` → `App.jsx`.
3. Routing: state `currentPage` + `navigateTo` + `renderPage` switch (not React Router).
4. Full page → component table (every App.jsx case).
5. Auth client: `voice_tutor_auth`, `authFetch`, axios interceptors in `api/config.js`.
6. Speech: Web Speech Recognition + `speechSynthesis` used in practice components (point to `PracticeChat.jsx` / `VoiceInterface.jsx`).
7. Onboarding gate + language in `localStorage` (`voice_tutor_language`).
8. Dev proxy: `vite.config.js` proxies `/api` → `http://localhost:8000`.

- [ ] **Step 2: Verify**

Page table matches App.jsx 1:1.

---

### Task 6: API reference

**Files:**
- Create: `docs/05-api-reference.md`
- Read: route list from `backend/main.py` + `backend/routers/auth.py` (source of truth below)

**Interfaces:**
- Consumes: Auth prefix `/api/auth` from router
- Produces: Endpoint catalog for developers

**Canonical route list to document:**

Auth (`backend/routers/auth.py`, prefix `/api/auth`):
- POST `/api/auth/signup`, `/login`, `/guest-login`, `/logout`, `/refresh`, `/forgot-password`, `/reset-password`
- GET `/api/auth/me`, `/check-email`, `/check-username`

Also on `main.py`:
- POST `/api/auth/guest-signup`, `/api/auth/logout` (legacy/alternate — note both exist)

Practice: POST `/api/process-text`, `/api/scenario-chat`, `/api/evaluate-tongue-twister`, `/api/daily-challenge`, `/api/vocab-practice`

Content: GET `/api/scenarios`, `/api/scenarios/{id}`, `/api/tongue-twisters`, `/api/daily-challenge-info`, `/api/daily-vocab`

Stats: GET `/api/stats`, `/api/vocabulary`, `/api/badges`, `/api/progress`, `/api/streak-info`, `/api/leaderboard`, `/api/daily-goal`, `/api/languages`

Tools: translate, bluf, tone, listening-simulator/*, analyze-fillers, filler-stats, placement-test/*, grammar-lesson/*, idioms/*, srs/*, writing/*, conversations/*

Utility: POST `/api/reset`, `/api/reset-all`, `/api/track-event`, `/api/set-language`; GET `/api/health`

- [ ] **Step 1: Create `docs/05-api-reference.md`**

For **primary** practice endpoints (`process-text`, `scenario-chat`, `vocab-practice`, `stats`): include brief request/response JSON sketches by reading the handlers.
For all others: method + path + one-line purpose table, grouped as above.
Note auth: most progress endpoints use `Authorization: Bearer` to select user JSON file.

- [ ] **Step 2: Verify**

Run a route grep mentally against the canonical list; every listed route appears once; no routes invented from old DOCUMENTATION.md that don’t exist.

---

### Task 7: Developer guide

**Files:**
- Create: `docs/06-developer-guide.md`
- Read: `README.md`, `backend/.env.example`, `backend/requirements.txt`, `frontend/package.json`

**Interfaces:**
- Consumes: Architecture + backend/frontend module maps
- Produces: Runnable local setup instructions

- [ ] **Step 1: Create `docs/06-developer-guide.md`**

Must include:
1. Prerequisites: Node 18+, Python 3.10+, Groq API key.
2. Backend setup (Windows + Unix activate commands):

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Unix: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set GROQ_API_KEY, SECRET_KEY
uvicorn main:app --reload
```

3. Frontend:

```bash
cd frontend
npm install
npm run dev
```

4. Env table from `.env.example`: `GROQ_API_KEY`, `SECRET_KEY`, `COOKIE_*`, `DATABASE_URL`.
5. Common tasks (concrete file pointers):
   - Add scenario → content list in `backend/main.py` + UI in `Scenarios.jsx`
   - Add API route → `backend/main.py` (or new router) + call from component via `/api/...`
   - Add page → component under `frontend/src/components/` + case in `App.jsx` + nav in `Sidebar.jsx`/`MobileNav.jsx`
6. Gotchas: CORS allowlist; Vite proxy; Vercel `/tmp` wipe; Windows paths; don’t commit `.env`.

- [ ] **Step 2: Verify**

Commands match README intent; env keys match `backend/.env.example`.

---

### Task 8: Deployment guide

**Files:**
- Create: `docs/07-deployment.md`
- Read: `vercel.json`, `api/index.py`, `api/requirements.txt`, `DEPLOYMENT_GUIDE.md` (historical), CORS in `main.py`, `frontend/package.json` (axios)

**Interfaces:**
- Consumes: Architecture Vercel section
- Produces: Deploy handbook; root stub will point here

- [ ] **Step 1: Create `docs/07-deployment.md`**

Must include:
1. How Vercel builds: `@vercel/static-build` → `frontend/dist`; `@vercel/python` → `api/index.py`.
2. Routes: `/api/(.*)` → Python; SPA fallback to `index.html`.
3. Env vars table: `GROQ_API_KEY` (required), `SECRET_KEY` (required), `DATABASE_URL` (optional Postgres).
4. Ephemeral storage warning + Neon recommendation.
5. Status table **re-verified against current code** (examples of expected current state):
   - axios in `frontend/package.json` → present
   - CORS explicit origins (not `*`) → present in `main.py`
   - `/tmp` redirects in `api/index.py` → present
   - `/api/auth/refresh` → present in auth router
   - Note any remaining risks (e.g. unpinned deps in `api/requirements.txt` if still unpinned; missing `maxDuration` in `vercel.json` if still missing)
6. Short “historical bugs” summary distilled from old DEPLOYMENT_GUIDE (B1–B8), without claiming unfixed items are fixed.

- [ ] **Step 2: Verify**

Open `vercel.json` and confirm documented routes/builds match. Check whether `maxDuration` exists; document truthfully.

---

### Task 9: Glossary

**Files:**
- Create: `docs/glossary.md`

- [ ] **Step 1: Create `docs/glossary.md`**

Define briefly: Miss Nova, XP, Level, Fluency score, Streak, Streak freeze, Badge, Scenario, Tongue twister, Vocab bank, SRS, BLUF, Filler words, Placement test, Groq, Web Speech API, Bearer token / `voice_tutor_auth`.

- [ ] **Step 2: Verify**

Terms used in overview/architecture appear here or are plain English.

---

### Task 10: Root README + stubs + CONTRIBUTING links

**Files:**
- Modify: `README.md`
- Modify: `DOCUMENTATION.md` (replace with stub)
- Modify: `DEPLOYMENT_GUIDE.md` (replace with stub)
- Modify: `CONTRIBUTING.md` (doc links only)

**Interfaces:**
- Consumes: All handbook files from Tasks 1–9
- Produces: Stable entry from repo root

- [ ] **Step 1: Rewrite root `README.md`**

Keep badges/pitch short. Include:
- One-paragraph product description
- Feature bullets (condensed)
- Tech stack one-liner
- Quick start (backend + frontend) pointing to `docs/06-developer-guide.md` for detail
- Documentation section linking `docs/README.md`
- Contributing + License links

- [ ] **Step 2: Replace `DOCUMENTATION.md` with stub**

```markdown
# Documentation moved

The full handbook now lives in [`docs/`](./docs/README.md).

- [Overview](./docs/01-overview.md)
- [Architecture](./docs/02-architecture.md)
- [Developer Guide](./docs/06-developer-guide.md)
- [API Reference](./docs/05-api-reference.md)
- [Deployment](./docs/07-deployment.md)
```

- [ ] **Step 3: Replace `DEPLOYMENT_GUIDE.md` with stub**

```markdown
# Deployment guide moved

See [`docs/07-deployment.md`](./docs/07-deployment.md).
```

- [ ] **Step 4: Update `CONTRIBUTING.md`**

Change documentation links from `DOCUMENTATION.md` to `docs/README.md` (and optionally mention developer guide).

- [ ] **Step 5: Final verification**

- [ ] Every chapter file exists under `docs/`
- [ ] Root stubs link correctly
- [ ] No invented endpoints vs Task 6 list
- [ ] No secrets in any doc
- [ ] Overview page list matches `App.jsx`

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `docs/` handbook structure | Tasks 1–9 |
| Root README rewrite | Task 10 |
| DOCUMENTATION / DEPLOYMENT stubs | Task 10 |
| CONTRIBUTING link update | Task 10 |
| Code-backed accuracy | Steps “Verify” in each task |
| Mermaid in architecture | Task 3 |
| API from live routes | Task 6 canonical list |
| Dual storage + Vercel `/tmp` | Tasks 3, 8 |
| No commits unless asked | Global Constraints |
| No bugfix / OpenAPI | Global Constraints / Non-goals |

No TBD placeholders. Commit steps omitted per Global Constraints.
