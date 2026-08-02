# 03 — Backend

FastAPI application that serves AI coaching APIs, auth, and static production assets when configured.

Entry: `backend/main.py` → `app = FastAPI(...)`. Auth router mounted at `/api/auth`.

---

## Modules

| File | Role |
|------|------|
| `backend/main.py` | FastAPI app, CORS, content catalogs, most `/api/*` routes, live XP/level/streak helpers |
| `backend/routers/auth.py` | `/api/auth/*` (signup, login, guest, refresh, password reset, …) |
| `backend/models.py` | SQLAlchemy `User` model, `DATABASE_URL`, `init_db()`, `get_db()` |
| `backend/gamification.py` | Alternate XP/level/badge helpers oriented at DB models — **not imported** by live routes |
| `backend/auth.py` | Helpers referenced by gamification module |
| `system_prompt.txt` | Tutor system prompt at **repo root** (loaded from `main.py` via `parent.parent / "system_prompt.txt"`) |

**Debt:** Prefer adding new routers over growing `main.py` further.

---

## Per-user progress

```text
Authorization: Bearer <user_id>:...
        ↓
get_user_id_from_request(request)
        ↓
load_user_progress(user_id)  →  USERS_DATA_DIR / "{user_id}.json"
        ↓
… mutate xp, badges, vocab …
        ↓
save_user_progress(user_id, data)
```

Defaults live in `get_default_user_data()` (XP, streak, badges, skill_scores, streak freeze fields, etc.).

---

## Groq / AI

- Client: `get_groq_client()` using `GROQ_API_KEY`.
- Model: `llama-3.3-70b-versatile` (used across practice and tool endpoints).
- Typical pattern: system prompt (+ language suffix) + user content, `response_format={"type": "json_object"}`, then `parse_ai_response`.
- Free practice uses root `system_prompt.txt` via `SYSTEM_PROMPT`.

---

## Gamification (live path in `main.py`)

**Level curve used by API stats** (`calculate_level` in `main.py`):

- Start at level 1 with 100 XP to next level.
- Each level: `xp_needed = int(xp_needed * 1.5)`.
- Returns `(level, xp_in_current_level, xp_for_next)`.

This is **not** the unused `gamification.py` formula (`floor(sqrt(XP / 10))`).

**XP example (free practice):**  
`base_xp = words * 2 + fluency_score * 3`, then multipliers via `calculate_xp_with_multiplier` (streak / time-of-day bonuses), then badges via `check_and_award_badges`, streak via `update_streak`.

Streak freeze fields exist on the JSON user object (`streak_freeze_available`, etc.).

---

## Content catalogs

Scenarios, tongue twisters, daily challenges, vocab pools, languages, etc. are **Python constants / lists inside `main.py`**. Search that file for `SCENARIOS`, tongue twister lists, vocab pools — do not expect separate content JSON files.

---

## Auth notes

- Router prefix: `/api/auth`.
- Passwords: simplified hash in `routers/auth.py` (demo-grade).
- Tokens: `create_token` → `{id}:{username}:{hex}`.
- `main.py` also defines `POST /api/auth/guest-signup` and `POST /api/auth/logout` alongside the router — both paths exist; prefer the router for account flows.

See [05-api-reference](./05-api-reference.md) for the full route list.
