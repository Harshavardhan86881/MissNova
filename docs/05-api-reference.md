# 05 — API Reference

Base URL (local): `http://localhost:8000`  
Dev frontend uses relative `/api` (Vite proxy).

Most progress endpoints read the user id from `Authorization: Bearer …`.

Source of truth: `backend/main.py` and `backend/routers/auth.py`.

---

## Auth (`backend/routers/auth.py`, prefix `/api/auth`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/guest-login` | Guest session |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/refresh` | Issue fresh token from existing Bearer |
| GET | `/api/auth/me` | Current user |
| GET | `/api/auth/check-email` | Email availability |
| GET | `/api/auth/check-username` | Username availability |
| POST | `/api/auth/forgot-password` | Password reset request |
| POST | `/api/auth/reset-password` | Password reset complete |

Also on `main.py` (legacy / alternate):

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/guest-signup` | Guest onboarding signup path |
| POST | `/api/auth/logout` | Alternate logout handler on main app |

---

## Practice

### `POST /api/process-text`

Free practice with Miss Nova.

**Request body:**

```json
{ "text": "User message" }
```

**Response (shape):** JSON from the model plus server fields, typically including:

```json
{
  "reply_text": "...",
  "correction": { "original": "...", "corrected": "...", "explanation": "...", "better_alternative": "..." },
  "fluency_score": 8,
  "new_word": { "word": "...", "definition": "...", "example": "..." },
  "new_badges": [],
  "xp_earned": {}
}
```

(Exact correction keys depend on the system prompt / model output; server adds `new_badges` and `xp_earned`.)

### `POST /api/scenario-chat`

**Request:**

```json
{
  "text": "User line",
  "scenario_id": "job_interview",
  "scenario_context": "Current prompt / stage"
}
```

Roleplay reply + tips; updates progress similarly to free practice.

### `POST /api/vocab-practice`

**Request:**

```json
{
  "word": "Pragmatic",
  "definition": "...",
  "sentence": "We need a pragmatic solution."
}
```

**Response (shape):** `correct_usage`, `score`, `feedback`, `better_sentence`, `common_mistakes`, `extra_tip`, plus XP/badge fields when awarded.

### Other practice

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/evaluate-tongue-twister` | Score pronunciation attempt vs target |
| POST | `/api/daily-challenge` | Submit daily challenge attempt |

---

## Content

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/scenarios` | List scenarios |
| GET | `/api/scenarios/{scenario_id}` | One scenario |
| GET | `/api/tongue-twisters` | Twister list |
| GET | `/api/daily-challenge-info` | Today's challenge metadata |
| GET | `/api/daily-vocab` | Today's vocab set |

---

## Stats & progress

### `GET /api/stats`

Returns XP, level, `xp_in_level`, `xp_for_next_level`, words, sessions, streak, skills, weekly XP, streak freeze / at-risk flags, counts for badges/vocab/scenarios/twisters.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/vocabulary` | Vocab bank array |
| GET | `/api/badges` | Earned badges |
| GET | `/api/progress` | Progress dashboard payload |
| GET | `/api/streak-info` | Streak details |
| GET | `/api/leaderboard` | Rankings (may be mock/partial) |
| GET | `/api/daily-goal` | Daily goal status |
| GET | `/api/languages` | Supported learning languages |
| POST | `/api/set-language` | Persist learning language |

---

## Learning tools

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/translate-input` | Translate / coach non-English input |
| POST | `/api/bluf-generator` | Bottom-line-up-front rewrite |
| POST | `/api/tone-calibrator` | Tone analysis |
| POST | `/api/listening-simulator/start` | Start listening roleplay |
| POST | `/api/listening-simulator/reply` | Continue session |
| DELETE | `/api/listening-simulator/session/{session_id}` | End session |
| POST | `/api/analyze-fillers` | Filler-word analysis |
| GET | `/api/filler-stats` | Filler stats |
| GET | `/api/placement-test/start` | Start placement |
| POST | `/api/placement-test/submit` | Submit answers |
| GET | `/api/placement-test/result` | Placement result |
| POST | `/api/grammar-lesson/content` | Lesson content |
| POST | `/api/grammar-lesson/practice` | Lesson practice |
| GET | `/api/grammar-lessons/progress` | Grammar progress |
| GET | `/api/idioms/daily` | Daily idioms |
| POST | `/api/idioms/practice` | Idiom practice |
| GET | `/api/idioms/bank` | Idiom bank |
| GET | `/api/srs/review-queue` | SRS queue |
| POST | `/api/srs/review` | Submit SRS review |
| GET | `/api/writing/prompt` | Writing prompt |
| POST | `/api/writing/submit` | Writing submission |
| GET | `/api/conversations/list` | Saved conversations |
| POST | `/api/conversations/report` | Conversation report |

---

## Utility

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/track-event` | Analytics event |
| POST | `/api/reset` | Clear in-memory conversation for user |
| POST | `/api/reset-all` | Reset user progress (destructive) |

In some deployments, FastAPI may also serve the SPA catch-all for non-API paths when static files are mounted.
