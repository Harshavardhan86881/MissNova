# Confidence Layer P0 Design

**Date:** 2026-08-02  
**Status:** Draft — awaiting user review  
**Scope:** P0 only (Confidence Mode + Speak→Edit→Send + Warm-up Ritual)  
**Surfaces:** All voice surfaces  
**Approach:** Confidence Layer across existing pages (Approach A)

---

## Goal

Reduce speaking anxiety so learners start and finish voice sessions without freezing, auto-sending raw STT, or quitting after harsh corrections.

Success looks like:

1. Mic output is always reviewable before AI judgment.
2. Learners can practice in a gentler coaching mode without losing XP/progress credit.
3. Every day has a short, always-winnable warm-up before scored practice feels mandatory.

---

## Non-goals

- Rehearsal Booth, confidence check-ins, Win Reel, Phrase Bank (P1+)
- Situation Prep Packs, Shadowing Studio, Meeting Simulator chain (P2–P3)
- New hub page / Confidence dashboard
- Curriculum rewrite or removing existing tools
- Changing core XP formulas beyond warm-up completion credit
- Auto-send toggle / advanced settings (defer)

---

## Product behavior

### 1. Confidence Mode (Gentle Coach)

- Toggle visible on voice pages that receive AI grading feedback.
- Preference stored in `localStorage` key `missnova_confidence_mode` (`"true"` / `"false"`). P0 default is **off** (explicit opt-in) so existing behavior stays unchanged until the learner chooses Gentle Coach.
- When on:
  - Request bodies to grading APIs include `"confidence_mode": true`.
  - Backend appends a **prompt overlay** (does not replace `system_prompt.txt`).
  - Overlay rules: praise first; at most one gentle tip; prefer natural paraphrase for minor errors; keep JSON schema identical.
  - Frontend hides or softens fluency score chips and collapses detailed correction blocks into a single “One tip” line when present.
- XP / streaks / session counts still update normally. Confidence Mode must not feel like “practice that doesn’t count.”

### 2. Speak → Edit → Send

- On recognition stop (`onend` after silence or manual stop): place final transcript into a draft field.
- **Do not** auto-call the AI evaluator.
- User can: edit text → Send; Discard; or Re-record (clears draft and starts mic again).
- Applies to every screen that currently auto-submits STT on `onend`.

### 3. Warm-up Ritual (60–90s)

- Shown before the first scored Free Practice / Scenario / Daily Challenge session of the calendar day.
- 2–3 fixed easy prompts (e.g. “Say your name and where you are,” “Describe something you can see,” “What did you eat today?”).
- Success does **not** require Groq: completing prompts locally is enough. Optional soft TTS echo of the prompt only.
- Completing warm-up:
  - Sets `warmup_completed_date` to today’s ISO date on user progress via `POST /api/warmup/complete` (localStorage fallback `missnova_warmup_date` if API fails / guest edge cases).
  - Awards small fixed XP (e.g. 10) once per day.
- Other voice tools (Filler Tracker, Tongue Twisters, Listening Simulator, Translate) do **not** require warm-up gate.

---

## Surfaces matrix

| Component | Confidence Mode | Speak→Edit→Send | Warm-up gate |
|-----------|-----------------|-----------------|--------------|
| `PracticeChat.jsx` | yes | yes (replace auto-`sendToAI`) | yes |
| `ScenarioChat.jsx` | yes | yes | yes (before first send of day) |
| `DailyChallenge.jsx` | yes | yes | yes |
| `ListeningSimulator.jsx` | soft UI only if feedback shown | yes (already drafts; ensure no auto-grade) | no |
| `FillerTracker.jsx` | n/a | yes (draft before analyze) | no |
| `TongueTwisters.jsx` | soft score UI when mode on | yes (draft before evaluate) | no |
| `TranslateInput.jsx` | n/a | yes if mic auto-fills/submits | no |
| `PlacementTest.jsx` | keep scoring honest for placement | yes if mic auto-submits | no |

---

## Architecture

```
Frontend                         Backend
---------                        -------
WarmupGate ──► /api/warmup/complete ──► users_data JSON
ConfidenceToggle (localStorage)
Voice pages ──► draft box ──► existing APIs + confidence_mode flag
                             ──► SYSTEM_PROMPT + CONFIDENCE_OVERLAY
```

### Backend

| Item | Detail |
|------|--------|
| Prompt overlay | Constant `CONFIDENCE_MODE_OVERLAY` in `backend/main.py` (or small helper module). Appended when `confidence_mode` is true. |
| Endpoints accepting flag | `/api/process-text`, `/api/scenario-chat`, `/api/daily-challenge`, `/api/evaluate-tongue-twister`, and any other STT→grade path touched in P0. |
| Models | Extend existing Pydantic request models with optional `confidence_mode: bool = False`. |
| Warm-up | `POST /api/warmup/complete` → idempotent per user per day; returns `{ completed: true, xp_awarded, warmup_completed_date }`. |
| Progress fields | `warmup_completed_date: str \| null` on user progress dict (default null in user bootstrap). |

### Frontend

| Item | Detail |
|------|--------|
| `ConfidenceModeToggle` | Small shared control; reads/writes localStorage; optional `onChange`. |
| `SpeechDraftBar` | Shared draft textarea + Send / Discard / Re-record actions used by voice pages. |
| `WarmupRitual` | Modal or inline panel; on complete calls API + sets local fallback. |
| Mic handlers | Stop calling evaluate/send inside `recognition.onend`; call `setDraft(text)` instead. |

Prefer a thin shared helper under `frontend/src/utils/` or `frontend/src/components/` rather than a large new framework. Match existing inline-style patterns in these pages; do not introduce a new design system in P0.

---

## Data flow

### Speak → Edit → Send

1. User starts mic → interim + final transcript accumulate (unchanged silence detection where it exists).
2. `onend` → `draft = finalTranscript` → UI focuses draft.
3. User edits → Send → existing `authFetch` to grading endpoint (plus `confidence_mode` if enabled).
4. Discard clears draft; Re-record clears draft and restarts recognition.

### Confidence Mode

1. Toggle on → localStorage true.
2. Send includes `confidence_mode: true`.
3. Backend builds messages with `SYSTEM_PROMPT + language prompt + CONFIDENCE_MODE_OVERLAY + JSON-only reminder`.
4. Response JSON shape unchanged; UI chooses how much correction/score chrome to show.

### Warm-up

1. User opens Practice / Scenario / Daily Challenge.
2. Client checks API stats or local `warmup_completed_date` vs today.
3. If missing → show `WarmupRitual`; block scored chat until complete (user may dismiss only by completing or explicitly “Skip for now” — **Skip is allowed** so anxious users are never trapped; skip does not award XP and does not set completed date).
4. On complete → persist + small XP → proceed to page.

---

## Error handling

| Case | Behavior |
|------|----------|
| Empty draft on Send | No-op / inline “Say or type something first” |
| Mic permission denied | Existing error path; fall back to text input |
| `no-speech` | Existing message; leave draft empty |
| Warm-up API failure | Keep localStorage date; still unlock the page; retry XP once quietly or skip XP with toast |
| Groq / grading failure | Existing error banner; draft text preserved so user can retry Send |
| Confidence Mode + empty correction | Hide tip section entirely (praise-only reply is valid) |
| Placement test | Speak→Edit still applies; Confidence Mode overlay **not** applied (placement must stay diagnostic) |

---

## Testing

Manual / smoke (no new test framework required in P0 unless repo already has one):

1. **PracticeChat:** mic → draft appears → edit → send; without Confidence Mode, scores/corrections still show.
2. **Confidence Mode on:** reply feels gentler; score chip hidden/soft; still earns XP.
3. **ScenarioChat + DailyChallenge:** same draft behavior; warm-up gates once per day.
4. **TongueTwisters / FillerTracker / ListeningSimulator / Translate:** draft-before-submit; no warm-up forced.
5. **Warm-up:** complete → XP once; second open same day skips gate; Skip leaves gate for next visit.
6. **Persistence:** refresh keeps Confidence Mode toggle; warm-up date survives refresh via API or localStorage.
7. **Unsupported Speech API:** text path unchanged; warm-up still completable via typing.

---

## Implementation order (for the plan)

1. Shared `SpeechDraftBar` + wire PracticeChat (highest traffic).
2. Backend `confidence_mode` flag + overlay on `process-text` / `scenario-chat` / `daily-challenge` / tongue-twister evaluate.
3. Frontend Confidence Mode toggle + soft UI on those pages.
4. Warm-up API + `WarmupRitual` + gates on Practice / Scenario / Daily.
5. Roll Speak→Edit→Send to remaining voice surfaces.
6. Docs touch: note P0 in `docs/01-overview.md` / `docs/04-frontend.md` briefly.

---

## Open decisions (resolved in this spec)

| Topic | Decision |
|-------|----------|
| Plan scope | P0 only |
| Surfaces | All voice surfaces |
| Preference storage | localStorage for mode; server date for warm-up with local fallback |
| Warm-up AI | Not required for success |
| Skip warm-up | Allowed; no XP; gate can show again |
| PlacementTest + Confidence Mode | Speak→Edit yes; gentle overlay no |

---

## Out of scope reminders

P1+: Rehearsal Booth, confidence check-ins, Win Reel.  
P2+: Phrase Bank, Situation Prep Packs, Shadowing.  
P3+: Before/After stories, Meeting Simulator chain.
