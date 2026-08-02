# 04 — Frontend

## Stack

From `frontend/package.json`:

| Piece | Version / lib |
|-------|----------------|
| UI | React 19 + React DOM |
| Bundler | Vite 6 |
| CSS | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Icons | lucide-react |
| HTTP | axios (+ custom `authFetch`) |

---

## Entry & “routing”

- `frontend/src/main.jsx` mounts `<App />`.
- **No React Router.** `App.jsx` keeps `currentPage` state and switches in `renderPage()`.
- Navigation: `navigateTo(page, data?)` (used by `Sidebar`, `MobileNav`, Dashboard cards).

---

## Page → component map

| `currentPage` | Component |
|---------------|-----------|
| `dashboard` | `Dashboard` |
| `practice` | `PracticeChat` |
| `scenarios` | `Scenarios` |
| `scenario-chat` | `ScenarioChat` (needs `selectedScenario`) |
| `tongue-twisters` | `TongueTwisters` |
| `vocabulary` | `VocabularyBank` |
| `progress` | `Progress` |
| `daily-challenge` | `DailyChallenge` |
| `daily-vocab` | `DailyVocab` |
| `translate` | `TranslateInput` |
| `bluf-generator` | `BLUFGenerator` |
| `tone-calibrator` | `ToneCalibrator` |
| `listening-simulator` | `ListeningSimulator` |
| `filler-tracker` | `FillerTracker` |
| `placement-test` | `PlacementTest` |
| `grammar-lessons` | `GrammarLessons` |
| `idiom-engine` | `IdiomEngine` |
| `srs-review` | `SRSReview` |
| `writing-workshop` | `WritingWorkshop` |
| `conversation-replay` | `ConversationReplay` |

Shell UI: `Sidebar`, `MobileNav`, `BadgeToast`, `Onboarding`, `NotificationManager`.

---

## Auth client

| Piece | Path / key |
|-------|------------|
| Stored session | `localStorage.voice_tutor_auth` (`accessToken`, `expiresAt`, …) |
| Fetch helper | `frontend/src/utils/authFetch.js` |
| Axios instance | `frontend/src/api/config.js` (`baseURL: '/api'`, Bearer interceptor, refresh on 401) |
| Language | `localStorage.voice_tutor_language` |

On mount, `App.jsx` may silently `POST /api/auth/refresh` to extend tokens after cold starts.

---

## Speech

- **Recognition:** Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) in practice UIs (e.g. `PracticeChat.jsx`, `VoiceInterface.jsx`).
- **TTS:** `window.speechSynthesis` for AI replies.
- No server-side audio pipeline — audio stays in the browser.

---

## Onboarding & analytics

- Incomplete onboarding → `Onboarding` gate (`utils/analytics.js` helpers).
- Page/event tracking helpers in `utils/analytics.js`; backend also has `POST /api/track-event`.

---

## Dev proxy

`frontend/vite.config.js`:

```js
server: {
  port: 5173,
  proxy: { '/api': 'http://localhost:8000' }
}
```

Browser calls `/api/...`; Vite forwards to the FastAPI process.

---

## Styling

- Tailwind 4 via Vite plugin.
- Global tokens / animations in `frontend/src/index.css` (dark glassmorphism aesthetic). Preserve existing patterns when editing UI.
