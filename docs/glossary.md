# Glossary

| Term | Meaning |
|------|---------|
| **Miss Nova** | AI tutor persona for this app |
| **XP** | Experience points earned from practice and tools |
| **Level** | Derived from XP via `calculate_level` in `backend/main.py` (100 XP base, ×1.5 per level) |
| **Fluency score** | Usually 1–10 rating from the AI on an utterance |
| **Streak** | Consecutive days with qualifying practice |
| **Streak freeze** | Consumable protection so a missed day does not reset the streak |
| **Badge** | Achievement unlocked by meeting criteria (sessions, words, streak, …) |
| **Scenario** | Guided roleplay situation with an AI character/context |
| **Tongue twister** | Pronunciation drill phrase graded by AI |
| **Vocab bank** | Stored list of words the learner has collected |
| **SRS** | Spaced repetition system for reviewing items over time |
| **BLUF** | Bottom Line Up Front — concise executive-style bullets |
| **Filler words** | Hesitation words (um, like, …) tracked for speaking clarity |
| **Placement test** | Assessment that suggests a starting proficiency level |
| **Groq** | LLM API provider used by the backend |
| **Web Speech API** | Browser APIs for speech recognition and synthesis |
| **Bearer token / `voice_tutor_auth`** | Client-stored auth session used as `Authorization: Bearer …` |
| **`USERS_DATA_DIR`** | Directory of per-user progress JSON files |
| **`DATABASE_URL`** | SQLAlchemy connection string for auth users |
