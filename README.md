# Miss Nova - AI Voice Tutor

![Miss Nova Badge](https://img.shields.io/badge/Status-Beta-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Python](https://img.shields.io/badge/Python-3.10%2B-yellow)
![React](https://img.shields.io/badge/React-18-cyan)

**Miss Nova** is an interactive, AI-powered English communication learning platform designed to help users improve their speaking confidence through real-time voice practice, scenario-based roleplay, and gamified learning.

## 🚀 Features

- **Real-time Voice Practice**: Speak naturally with an AI tutor that offers instant corrections on grammar, pronunciation, and fluency.
- **Scenario Roleplay**: Practice real-world situations like job interviews, ordering coffee, or social networking.
- **Gamification**: Earn XP, level up, maintain streaks, and collect badges as you learn.
- **Daily Vocabulary**: Learn new words every day with context-aware practice and evaluation.
- **Tongue Twisters**: Challenge your pronunciation with fun, graded tongue twisters.
- **Progress Tracking**: Visualize your improvements with detailed stats and charts.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React
- **Backend**: FastAPI (Python), SQLAlchemy (SQLite)
- **AI**: Groq API (Llama 3.3 70B)
- **Speech**: Web Speech API (Recognition & Synthesis)

## 📦 Installation

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- [Groq API Key](https://console.groq.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/harsha8688/MissNova.git
cd MissNova
```

### 2. Backend Setup
Navigate to the backend directory and set up the Python environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

Run the backend server:
```bash
uvicorn main:app --reload
```
The API will run at `http://localhost:8000`.

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```
The application will open at `http://localhost:5173`.

## 📖 Documentation

For detailed technical documentation, including architecture diagrams, API reference, and component breakdown, please refer to [DOCUMENTATION.md](DOCUMENTATION.md).

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
