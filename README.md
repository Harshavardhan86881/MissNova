# Miss Nova - AI Voice Tutor

![Miss Nova Badge](https://img.shields.io/badge/Status-Beta-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Python](https://img.shields.io/badge/Python-3.10%2B-yellow)
![React](https://img.shields.io/badge/React-19-cyan)

**Miss Nova** is an interactive, AI-powered English communication learning platform: real-time voice/text practice, scenario roleplay, vocabulary and pronunciation drills, professional communication tools, and gamified progress (XP, levels, streaks, badges).

## Features

- Real-time practice with grammar/fluency feedback (Groq + Web Speech API)
- Scenario roleplay, tongue twisters, daily challenge & daily vocab
- Tools: translate, BLUF, tone calibrator, listening simulator, fillers, grammar, idioms, SRS, writing workshop
- Progress dashboard, badges, streaks

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS 4
- **Backend:** FastAPI (Python), SQLAlchemy (auth DB), per-user JSON progress
- **AI:** Groq (`llama-3.3-70b-versatile`)
- **Speech:** Web Speech API (browser)

## Quick start

**Prerequisites:** Node 18+, Python 3.10+, [Groq API key](https://console.groq.com/)

```bash
# Backend
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Unix: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set GROQ_API_KEY
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:8000  

Full setup, env vars, and “where to change X”: **[docs/06-developer-guide.md](docs/06-developer-guide.md)**

## Documentation

Start at **[docs/README.md](docs/README.md)** (architecture, API, deployment, glossary).

Legacy paths: [DOCUMENTATION.md](DOCUMENTATION.md) and [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) redirect into `docs/`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
