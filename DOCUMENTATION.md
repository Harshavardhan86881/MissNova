# Miss Nova - Communication Learning Platform
## Complete Technical Documentation

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Data Flow & Interaction Patterns](#data-flow--interaction-patterns)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Component Documentation](#component-documentation)
8. [Gamification System](#gamification-system)
9. [AI Integration](#ai-integration)
10. [File Structure](#file-structure)

---

## 🎯 Project Overview

**Miss Nova** is a full-stack AI-powered English communication learning platform that provides:
- Real-time voice practice with speech recognition
- Scenario-based roleplay for professional & social situations
- Pronunciation training with tongue twisters
- Daily vocabulary lessons with AI evaluation
- Gamified progress tracking with XP, levels, streaks, and badges

### Tech Stack
```mermaid
graph LR
    A[Frontend] --> B[React 18]
    A --> C[Vite]
    A --> D[Tailwind CSS]
    
    E[Backend] --> F[FastAPI]
    E --> G[Python 3.x]
    E --> H[Uvicorn]
    
    I[AI] --> J[Groq API]
    I --> K[Llama 3.3 70B]
    
    L[Browser APIs] --> M[Web Speech API]
    L --> N[Speech Recognition]
    L --> O[Speech Synthesis]
```

---

## 🏗️ System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph Browser["Browser Environment"]
        UI[React UI Components]
        Speech[Speech Recognition API]
        TTS[Text-to-Speech API]
    end
    
    subgraph Frontend["Frontend Layer (Port 5173)"]
        App[App.jsx - Router]
        Components[Feature Components]
        State[React State Management]
    end
    
    subgraph Backend["Backend Layer (Port 8000)"]
        FastAPI[FastAPI Server]
        Endpoints[REST API Endpoints]
        GameLogic[Gamification Engine]
        DataStore[user_data.json]
    end
    
    subgraph AI["AI Layer"]
        Groq[Groq API]
        Llama[Llama 3.3 70B Model]
    end
    
    Speech --> UI
    UI --> Components
    Components --> State
    State --> Endpoints
    Endpoints --> GameLogic
    Endpoints --> Groq
    Groq --> Llama
    Llama --> Groq
    Groq --> Endpoints
    GameLogic --> DataStore
    DataStore --> GameLogic
    Endpoints --> Components
    TTS --> UI
```

### Request-Response Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant React
    participant FastAPI
    participant Groq
    participant Storage

    User->>Browser: Speaks into microphone
    Browser->>Browser: Speech Recognition
    Browser->>React: Transcribed text
    React->>FastAPI: POST /api/process-text
    FastAPI->>Storage: Load user history
    Storage-->>FastAPI: User data
    FastAPI->>Groq: Send prompt + context
    Groq->>Groq: LLM processing
    Groq-->>FastAPI: JSON response
    FastAPI->>FastAPI: Calculate XP/badges
    FastAPI->>Storage: Save updated data
    FastAPI-->>React: Response + stats
    React->>React: Update UI state
    React->>Browser: Text-to-Speech
    Browser->>User: AI speaks reply
```

---

## 🔧 Backend Architecture

### Main Components (`backend/main.py`)

```mermaid
graph TB
    subgraph Core["Core Setup"]
        A[FastAPI App]
        B[CORS Middleware]
        C[Groq Client]
        D[System Prompt Loader]
    end
    
    subgraph Data["Data Layer"]
        E[user_data.json]
        F[User State Manager]
        G[Persistence Layer]
    end
    
    subgraph Content["Content Database"]
        H[Scenarios 8 items]
        I[Tongue Twisters 15 items]
        J[Daily Challenges 10 items]
        K[Vocab Pool 40+ words]
    end
    
    subgraph Logic["Game Logic"]
        L[XP Calculator]
        M[Level System]
        N[Badge Checker]
        O[Streak Tracker]
        P[Daily Vocab Rotator]
    end
    
    subgraph API["API Endpoints"]
        Q["POST /api/process-text"]
        R["POST /api/scenario-chat"]
        S["POST /api/evaluate-tongue-twister"]
        T["GET /api/daily-vocab"]
        U["POST /api/vocab-practice"]
        V["GET /api/stats"]
    end
    
    A --> B
    A --> C
    A --> D
    F --> E
    F --> G
    L --> M
    M --> N
    N --> O
    Q --> C
    R --> C
    S --> C
    U --> C
    Q --> L
    R --> L
    S --> L
    T --> P
    P --> K
```

### Data Persistence Model

```mermaid
erDiagram
    USER_DATA {
        int xp
        int level
        int words_spoken
        int session_count
        int streak_days
        date last_practice_date
        array accuracy_history
        array vocabulary_bank
        array completed_scenarios
        array earned_badges
        int tongue_twisters_completed
        bool daily_challenge_completed
        date daily_challenge_date
        object daily_vocab_practiced
    }
    
    VOCABULARY_WORD {
        string word
        string definition
        string example
        int mastery
        datetime added_at
    }
    
    BADGE {
        string id
        string name
        string icon
        datetime earned_at
    }
    
    USER_DATA ||--o{ VOCABULARY_WORD : "has"
    USER_DATA ||--o{ BADGE : "earned"
```

### Gamification Engine Logic

```mermaid
flowchart TD
    Start[User Action] --> WordCount{Count Words Spoken}
    WordCount --> CalcXP[XP = words * 2 + fluency * 3-4]
    CalcXP --> AddXP[Add to total XP]
    AddXP --> CheckLevel{Level Up?}
    
    CheckLevel -->|No| CheckBadges
    CheckLevel -->|Yes| LevelUp[Increment Level]
    LevelUp --> CheckBadges{Check All Badge Criteria}
    
    CheckBadges --> Badge1{Session count >= 10?}
    Badge1 -->|Yes| Award1[Award Chatterbox]
    Badge1 -->|No| Badge2
    Award1 --> Badge2
    
    Badge2{Words >= 1000?}
    Badge2 -->|Yes| Award2[Award Wordsmith]
    Badge2 -->|No| Badge3
    Award2 --> Badge3
    
    Badge3{Streak >= 7?}
    Badge3 -->|Yes| Award3[Award Dedicated]
    Badge3 -->|No| UpdateStreak
    Award3 --> UpdateStreak
    
    UpdateStreak[Update Streak Counter] --> Save[Save to JSON]
    Save --> Return[Return Response]
```

---

## 🎨 Frontend Architecture

### Component Hierarchy

```mermaid
graph TB
    App[App.jsx - Root Component]
    
    App --> Sidebar[Sidebar.jsx]
    App --> MobileNav[MobileNav.jsx]
    App --> BadgeToast[BadgeToast.jsx]
    App --> Router{Page Router}
    
    Router --> Dashboard[Dashboard.jsx]
    Router --> PracticeChat[PracticeChat.jsx]
    Router --> Scenarios[Scenarios.jsx]
    Router --> ScenarioChat[ScenarioChat.jsx]
    Router --> TongueTwisters[TongueTwisters.jsx]
    Router --> DailyChallenge[DailyChallenge.jsx]
    Router --> DailyVocab[DailyVocab.jsx]
    Router --> VocabularyBank[VocabularyBank.jsx]
    Router --> Progress[Progress.jsx]
    
    style App fill:#8b5cf6
    style Router fill:#ec4899
```

### State Management Flow

```mermaid
stateDiagram-v2
    [*] --> AppInit: Load App
    AppInit --> FetchStats: useEffect
    FetchStats --> DisplayDashboard: Initial render
    
    DisplayDashboard --> UserAction: Navigate/Interact
    
    UserAction --> VoiceInput: Speak
    UserAction --> TextInput: Type
    UserAction --> NavigatePage: Click nav
    
    VoiceInput --> SpeechRecognition: Browser API
    SpeechRecognition --> Transcription: onresult
    Transcription --> APICall: POST request
    
    TextInput --> APICall
    
    APICall --> Loading: setLoading(true)
    Loading --> AIResponse: Await response
    AIResponse --> UpdateUI: setState
    UpdateUI --> CheckBadges: new_badges?
    
    CheckBadges --> ShowToast: Yes
    CheckBadges --> RefreshStats: No
    ShowToast --> RefreshStats
    
    RefreshStats --> DisplayDashboard
    
    NavigatePage --> DisplayDashboard
```

### CSS Design System

```mermaid
graph LR
    subgraph Colors["CSS Variables"]
        A[--bg-primary: #0a0a1a]
        B[--bg-secondary: #111127]
        C[--bg-card: rgba 255,255,255,0.02]
        D[--text-primary: #ffffff]
        E[--text-secondary: #cbd5e1]
    end
    
    subgraph Effects["Visual Effects"]
        F[Glassmorphism]
        G[Backdrop Blur]
        H[Box Shadows]
        I[Gradients]
    end
    
    subgraph Animations["Keyframe Animations"]
        J[pulse-ring]
        K[shimmer]
        L[toast-slide-in]
        M[page-enter]
    end
    
    Colors --> Effects
    Effects --> Animations
```

---

## 🔄 Data Flow & Interaction Patterns

### Voice Practice Flow

```mermaid
sequenceDiagram
    participant U as User
    participant PC as PracticeChat.jsx
    participant API as Speech API
    participant BE as Backend /api/process-text
    participant AI as Groq LLM
    participant TTS as Text-to-Speech

    U->>PC: Click Mic Button
    PC->>API: recognition.start()
    API->>API: Continuous listening
    API-->>PC: onresult (interim)
    PC->>PC: Update interim transcript
    API-->>PC: onresult (final)
    PC->>PC: Set final transcript
    PC->>BE: POST {text, context}
    BE->>BE: Load user history
    BE->>AI: Send system prompt + user text
    AI-->>BE: {reply, correction, fluency, vocab}
    BE->>BE: Update XP, badges, streak
    BE-->>PC: JSON response
    PC->>PC: Update chat history
    PC->>PC: Display corrections
    PC->>TTS: speechSynthesis.speak(reply)
    TTS-->>U: AI voice output
```

### Scenario Practice Flow

```mermaid
flowchart TD
    Start[User clicks Scenario] --> Select[ScenarioChat loads]
    Select --> ShowPrompt[Display scenario prompt]
    ShowPrompt --> UserInput{Input mode?}
    
    UserInput -->|Voice| Voice[Speech recognition]
    UserInput -->|Text| Text[Text input]
    
    Voice --> Submit
    Text --> Submit["Submit to /api/scenario-chat"]
    
    Submit --> Backend[Backend receives]
    Backend --> LoadContext[Load scenario context]
    LoadContext --> AIPrompt[Build AI prompt with role]
    AIPrompt --> Groq[Groq processes]
    Groq --> Response[Generate roleplay response + tips]
    Response --> Evaluate[Evaluate user performance]
    Evaluate --> SaveProgress[Update completed scenarios]
    SaveProgress --> Return[Return to frontend]
    Return --> Display[Display AI response + tips]
    Display --> NextPrompt{More prompts?}
    
    NextPrompt -->|Yes| ShowPrompt
    NextPrompt -->|No| Complete[Scenario complete]
```

### Daily Vocabulary Rotation

```mermaid
flowchart LR
    A["User visits /daily-vocab"] --> B["GET /api/daily-vocab"]
    B --> C{Check date}
    C -->|Same day| D[Return cached selection]
    C -->|New day| E[Generate new selection]
    
    E --> F[Create MD5 hash from date]
    F --> G[Use as random seed]
    G --> H[Shuffle word pool]
    H --> I[Pick 2 from each category]
    I --> J[Fill to 12 words total]
    J --> K[Mark practiced words]
    K --> L[Return to frontend]
    
    L --> M[Display word cards]
    M --> N{User clicks word}
    N --> O[Show detail view]
    O --> P[User writes sentence]
    P --> Q["POST /api/vocab-practice"]
    Q --> R[AI evaluates usage]
    R --> S[Return feedback + score]
    S --> T[Add to vocabulary bank]
    T --> U[Award XP]
```

---

## 📡 API Endpoints Reference

### Complete Endpoint List

```mermaid
graph TB
    subgraph Practice["Practice Endpoints"]
        A["POST /api/process-text"]
        B["POST /api/scenario-chat"]
        C["POST /api/evaluate-tongue-twister"]
        D["POST /api/daily-challenge"]
        E["POST /api/vocab-practice"]
    end
    
    subgraph Data["Data Retrieval"]
        F["GET /api/scenarios"]
        G["GET /api/scenarios/:id"]
        H["GET /api/tongue-twisters"]
        I["GET /api/daily-challenge-info"]
        J["GET /api/daily-vocab"]
    end
    
    subgraph Stats["User Stats"]
        K["GET /api/stats"]
        L["GET /api/vocabulary"]
        M["GET /api/badges"]
        N["GET /api/progress"]
    end
    
    subgraph Admin["Admin/Utility"]
        O["POST /api/reset"]
        P["POST /api/reset-all"]
        Q["GET /api/health"]
    end
```

### Endpoint Details

#### 1. `/api/process-text` (POST)
**Purpose:** Free practice conversation with AI

**Request:**
```json
{
  "text": "User's spoken/typed message",
  "context": "Optional conversation context"
}
```

**Response:**
```json
{
  "reply_text": "AI's response",
  "correction": {
    "original": "Incorrect sentence",
    "corrected": "Fixed version",
    "explanation": "Why it was wrong",
    "better_alternative": "More natural way"
  },
  "fluency_score": 8,
  "new_word": {
    "word": "Articulate",
    "definition": "Express clearly",
    "example": "She articulated her vision"
  },
  "new_badges": ["badge_id_1", "badge_id_2"]
}
```

**Backend Flow:**
```mermaid
flowchart LR
    A[Receive text] --> B[Load user history]
    B --> C[Load system prompt]
    C --> D[Build message array]
    D --> E[Call Groq API]
    E --> F[Parse JSON response]
    F --> G[Update word count]
    G --> H[Calculate XP]
    H --> I[Check level up]
    I --> J[Add new vocabulary]
    J --> K[Update streak]
    K --> L[Check badges]
    L --> M[Save user_data.json]
    M --> N[Return response]
```

#### 2. `/api/scenario-chat` (POST)
**Purpose:** Roleplay in specific scenarios

**Request:**
```json
{
  "text": "User response",
  "scenario_id": "job_interview",
  "scenario_context": "Current prompt being attempted"
}
```

**Response:** Same as `/api/process-text` + `scenario_tips`

#### 3. `/api/vocab-practice` (POST)
**Purpose:** Evaluate sentence using a vocabulary word

**Request:**
```json
{
  "word": "Pragmatic",
  "sentence": "We need a pragmatic solution to this problem",
  "definition": "Dealing with things in a practical way"
}
```

**Response:**
```json
{
  "correct_usage": true,
  "score": 9,
  "feedback": "Excellent usage! Very natural.",
  "better_sentence": "Alternative example",
  "common_mistakes": "People often confuse pragmatic with practical...",
  "extra_tip": "Use in business contexts",
  "xp_earned": 15,
  "new_badges": []
}
```

#### 4. `/api/daily-vocab` (GET)
**Purpose:** Get today's 12 vocabulary words

**Response:**
```json
{
  "date": "2026-02-14",
  "total": 12,
  "practiced_count": 5,
  "words": [
    {
      "word": "Articulate",
      "definition": "...",
      "category": "Business",
      "level": "Intermediate",
      "examples": ["...", "..."],
      "usage_tips": "...",
      "synonyms": ["express", "convey"],
      "antonyms": ["mumble"],
      "practiced": true
    }
  ]
}
```

#### 5. `/api/stats` (GET)
**Purpose:** Get comprehensive user statistics

**Response:**
```json
{
  "xp": 2450,
  "level": 8,
  "xp_in_level": 150,
  "xp_for_next_level": 500,
  "words_spoken": 3420,
  "session_count": 45,
  "streak_days": 7,
  "average_accuracy": 7.8,
  "vocabulary_count": 28,
  "badges_count": 6,
  "accuracy_history": [7, 8, 9, 7, 8],
  "skill_scores": {
    "grammar": 8,
    "vocabulary": 7,
    "pronunciation": 6,
    "fluency": 8,
    "confidence": 7
  }
}
```

---

## 🧩 Component Documentation

### Core Components

#### **App.jsx** - Main Application Container
```javascript
// State Management
const [currentPage, setCurrentPage] = useState('dashboard');
const [stats, setStats] = useState(null);
const [selectedScenario, setSelectedScenario] = useState(null);
const [newBadges, setNewBadges] = useState([]);

// Key Functions
- fetchStats(): Loads user statistics from API
- handleBadges(badges): Queues new badge notifications
- navigateTo(page, data): Changes current page
- renderPage(): Routes to appropriate component
```

**Navigation Flow:**
```mermaid
graph LR
    A[User Clicks Nav] --> B[navigateTo called]
    B --> C{Special handling?}
    C -->|scenario-chat| D[Save scenario data]
    C -->|No| E[Update currentPage]
    D --> E
    E --> F[renderPage re-evaluates]
    F --> G[Component unmounts]
    G --> H[New component mounts]
    H --> I[Scroll to top]
```

#### **PracticeChat.jsx** - Voice/Text Practice
**Key Features:**
- Dual input mode (voice + text)
- Real-time speech recognition with interim results
- Chat history with corrections display
- Vocabulary word cards
- Text-to-speech for AI responses

**Voice Recognition Pattern:**
```javascript
recognition.onresult = (event) => {
  let interim = '', final = '';
  for (let i = 0; i < event.results.length; i++) {
    if (event.results[i].isFinal) {
      final += event.results[i][0].transcript + ' ';
    } else {
      interim += event.results[i][0].transcript;
    }
  }
  // Update UI with both final and interim
};

recognition.onend = () => {
  const text = finalTranscriptRef.current.trim();
  if (text) sendToAI(text);
};
```

#### **DailyVocab.jsx** - Vocabulary Learning
**Two-View Pattern:**

```mermaid
stateDiagram-v2
    [*] --> WordList: Initial load
    WordList --> WordDetail: Click word
    WordDetail --> Practice: User writes sentence
    Practice --> Evaluation: AI evaluates
    Evaluation --> NextWord: Try another
    NextWord --> WordDetail
    WordDetail --> WordList: Back button
```

**State Structure:**
```javascript
{
  vocabData: {
    date: "2026-02-14",
    words: [...],
    total: 12,
    practiced_count: 5
  },
  selectedWord: {...} | null,
  practiceInput: "",
  result: {...} | null
}
```

#### **Progress.jsx** - Analytics Dashboard
**Data Visualization:**
```mermaid
graph TB
    A["Load /api/progress"] --> B[Top Stats Cards]
    A --> C[Level Progress Bar]
    A --> D[Skills Radar]
    A --> E[Fluency Trend Chart]
    A --> F[Scenario Progress]
    A --> G[Badge Collection]
    
    E --> E1[Bar chart: last N sessions]
    G --> G1[Grid: earned vs locked badges]
```

---

## 🎮 Gamification System

### XP Calculation Formula

```mermaid
flowchart TD
    A[User Action] --> B{Action Type}
    
    B -->|Practice Chat| C[words * 2 + fluency * 3]
    B -->|Scenario| D[words * 2 + fluency * 4]
    B -->|Tongue Twister| E[Fixed +25 XP]
    B -->|Daily Challenge| F[Fixed +50 XP]
    B -->|Vocab Practice| G[Correct: +15, Wrong: +5]
    
    C --> H[Add to total XP]
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I{Calculate Level}
    I --> J[Level = floor XP/500 + 1]
```

### Level Progression

```python
def calculate_level(xp):
    level = 1
    xp_for_next = 100
    xp_in_level = xp
    
    while xp_in_level >= xp_for_next:
        xp_in_level -= xp_for_next
        level += 1
        xp_for_next = int(100 * (1.5 ** (level - 1)))
    
    return level, xp_in_level, xp_for_next
```

**Level Curve:**
- Level 1→2: 100 XP
- Level 2→3: 150 XP
- Level 3→4: 225 XP
- Level N→N+1: `100 * 1.5^(N-1)` XP

### Badge System

```mermaid
graph TB
    subgraph Session["Session Badges"]
        A[first_chat: First Words]
        B[10_sessions: Chatterbox]
        C[50_sessions: Conversation Master]
    end
    
    subgraph Words["Word Count Badges"]
        D[100_words: Word Explorer]
        E[1000_words: Wordsmith]
        F[5000_words: Eloquent Speaker]
    end
    
    subgraph Streak["Streak Badges"]
        G[streak_3: Consistent]
        H[streak_7: Dedicated]
        I[streak_30: Unstoppable]
    end
    
    subgraph Achievement["Achievement Badges"]
        J[high_score: Perfect Score 10/10]
        K[vocab_10: Vocab Builder]
        L[vocab_50: Dictionary]
        M[scenario_5: Role Player]
        N[twister_5: Tongue Master]
    end
    
    subgraph Level["Level Badges"]
        O[level_5: Rising Star]
        P[level_10: Communication Pro]
    end
```

**Badge Award Logic:**
```python
def check_and_award_badges(user_data):
    new_badges = []
    earned_ids = [b["id"] for b in user_data.get("badges", [])]
    
    # Session-based
    if user_data["session_count"] >= 10 and "10_sessions" not in earned_ids:
        new_badges.append({"id": "10_sessions", "name": "Chatterbox", ...})
    
    # Streak-based
    if user_data["streak_days"] >= 7 and "streak_7" not in earned_ids:
        new_badges.append({"id": "streak_7", "name": "Dedicated", ...})
    
    # ... more checks
    
    return new_badges
```

### Streak Tracking

```mermaid
flowchart TD
    A[User completes activity] --> B{Check last_practice_date}
    B -->|Today| C[Already counted, no change]
    B -->|Yesterday| D[Increment streak]
    B -->|Older| E[Reset streak to 1]
    
    D --> F[Set last_practice_date = today]
    E --> F
    F --> G[Save user_data]
    
    C --> H[Return]
    G --> H
```

---

## 🤖 AI Integration

### Groq API Configuration

```python
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

chat_completion = client.chat.completions.create(
    messages=[...],
    model="llama-3.3-70b-versatile",
    temperature=0.7,
    max_tokens=1024,
    response_format={"type": "json_object"}  # Forces JSON output
)
```

### System Prompt Architecture

**Loaded from `system_prompt.txt`:**
```
You are Miss Nova, an expert AI English communication tutor...

ALWAYS respond in this exact JSON format:
{
  "reply_text": "Your conversational response",
  "correction": {...},
  "fluency_score": 1-10,
  "new_word": {...}
}
```

### Prompt Engineering Patterns

#### Pattern 1: Free Practice
```mermaid
graph LR
    A[System Prompt] --> B[Conversation History]
    B --> C[User Message]
    C --> D[Groq LLM]
    D --> E[JSON Response]
    E --> F[Parse & Validate]
```

#### Pattern 2: Scenario Roleplay
```python
# Modified system prompt for scenarios
f"""
You are Miss Nova in a roleplay scenario.
SCENARIO: {scenario['title']}
YOUR ROLE: {scenario['ai_role']}
CONTEXT: {scenario_context}

The user is practicing: {scenario['description']}
Respond in character while providing feedback.
"""
```

#### Pattern 3: Vocabulary Evaluation
```python
f"""
You are a vocabulary coach evaluating word usage.
WORD: "{word}"
DEFINITION: "{definition}"
LEARNER'S SENTENCE: "{sentence}"

Evaluate correctness and naturalness.
Provide specific feedback on usage.
"""
```

### Error Handling & Fallbacks

```mermaid
flowchart TD
    A[API Call] --> B{Success?}
    B -->|Yes| C[Parse JSON]
    C --> D{Valid JSON?}
    D -->|Yes| E[Extract fields]
    D -->|No| F[Try regex extraction]
    
    B -->|No| G{Error Type}
    G -->|Rate limit| H[Return cached response]
    G -->|Network| I[Retry with backoff]
    G -->|Auth| J[Return error to user]
    
    F --> K{Found JSON?}
    K -->|Yes| E
    K -->|No| L[Log error + default response]
    
    E --> M[Validate fields]
    M --> N[Return to frontend]
```

---

## 📁 File Structure

```
voice_tutor_app/
│
├── backend/
│   ├── main.py                 # FastAPI application (1053 lines)
│   ├── user_data.json         # User state persistence
│   ├── system_prompt.txt      # AI system instructions
│   ├── requirements.txt       # Python dependencies
│   ├── venv/                  # Virtual environment
│   └── dist/                  # Built frontend (served by FastAPI)
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx           # React entry point
│   │   ├── App.jsx            # Root component & routing
│   │   ├── index.css          # Global styles + design system
│   │   │
│   │   └── components/
│   │       ├── Sidebar.jsx            # Desktop navigation
│   │       ├── MobileNav.jsx          # Mobile navigation
│   │       ├── BadgeToast.jsx         # Badge notifications
│   │       ├── Dashboard.jsx          # Landing page
│   │       ├── PracticeChat.jsx       # Free practice mode
│   │       ├── Scenarios.jsx          # Scenario browser
│   │       ├── ScenarioChat.jsx       # Scenario practice
│   │       ├── TongueTwisters.jsx     # Pronunciation practice
│   │       ├── DailyChallenge.jsx     # Daily challenges
│   │       ├── DailyVocab.jsx         # Vocabulary learning
│   │       ├── VocabularyBank.jsx     # Word collection
│   │       └── Progress.jsx           # Analytics dashboard
│   │
│   ├── index.html             # HTML entry point
│   ├── package.json           # npm dependencies
│   ├── vite.config.js         # Vite configuration
│   ├── tailwind.config.js     # Tailwind configuration
│   └── dist/                  # Built production files
│
├── DOCUMENTATION.md           # This file
└── .env                       # Environment variables (GROQ_API_KEY)
```

### Component Size & Complexity

```mermaid
graph LR
    subgraph Small["Small < 300 lines"]
        A[Sidebar.jsx - 152]
        B[MobileNav.jsx - 64]
        C[BadgeToast.jsx - 70]
    end
    
    subgraph Medium["Medium 300-500 lines"]
        D[Dashboard.jsx - 215]
        E[Progress.jsx - 14824]
        F[DailyChallenge.jsx - 18000]
    end
    
    subgraph Large["Large > 500 lines"]
        G[PracticeChat.jsx - 381]
        H[DailyVocab.jsx - 20000]
    end
    
    subgraph Backend["Backend"]
        I[main.py - 1053]
    end
```

---

## 🚀 Deployment & Usage

### Starting the Application

#### Backend
```bash
cd backend
source venv/bin/activate
python main.py
# Runs on http://localhost:8000
```

#### Frontend (Development)
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
# Proxies API calls to :8000
```

#### Frontend (Production)
```bash
cd frontend
npm run build
# Outputs to dist/
# Backend serves from dist/ at root path
```

### Environment Setup

**Required `.env` file:**
```bash
GROQ_API_KEY=gsk_...your_api_key_here
```

### Port Configuration

```mermaid
graph LR
    A[User Browser] -->|Visit| B[localhost:5173]
    B -->|API calls /api/*| C[Vite Proxy]
    C -->|Forward to| D[localhost:8000]
    D -->|FastAPI| E[Backend]
    E -->|Groq API| F[External AI]
    
    style B fill:#ec4899
    style D fill:#8b5cf6
    style F fill:#f59e0b
```

---

## 🔐 Security Considerations

1. **API Key Protection:** `.env` file excluded from git
2. **CORS:** Configured for `localhost:5173` in development
3. **Input Validation:** Pydantic models validate all API inputs
4. **Rate Limiting:** Handled by Groq API (external)
5. **XSS Prevention:** React automatically escapes content

---

## 🎯 Key Features Summary

### Feature Completion Matrix

| Feature | Backend | Frontend | AI Integration | Gamification |
|---------|---------|----------|----------------|--------------|
| Free Practice | ✅ | ✅ | ✅ | ✅ |
| Scenarios (8) | ✅ | ✅ | ✅ | ✅ |
| Tongue Twisters (15) | ✅ | ✅ | ✅ | ✅ |
| Daily Challenge | ✅ | ✅ | ✅ | ✅ |
| Daily Vocab (40+) | ✅ | ✅ | ✅ | ✅ |
| Vocabulary Bank | ✅ | ✅ | - | ✅ |
| Progress Tracking | ✅ | ✅ | - | ✅ |
| XP & Levels | ✅ | ✅ | - | ✅ |
| Badges (16) | ✅ | ✅ | - | ✅ |
| Streaks | ✅ | ✅ | - | ✅ |

### User Journey Map

```mermaid
journey
    title Communication Learning Journey
    section Day 1
      Create account: 5: User
      Try free practice: 4: User
      Earn first badge: 5: User
      Learn 3 new words: 4: User
    section Day 2-7
      Daily challenge: 4: User
      Practice scenario: 5: User
      Learn vocabulary: 4: User
      Build 7-day streak: 5: User
    section Week 2+
      Advanced scenarios: 5: User
      Pronunciation mastery: 4: User
      Level up to 5: 5: User
      Review progress: 5: User
```

---

## 📊 Performance Characteristics

### API Response Times
- `/api/stats`: ~10ms (local JSON read)
- `/api/daily-vocab`: ~5ms (deterministic selection)
- `/api/process-text`: ~800-2000ms (Groq API latency)
- `/api/vocab-practice`: ~500-1500ms (Groq API)

### Bundle Sizes
- Frontend JS: ~291 KB (gzipped: 80 KB)
- Frontend CSS: ~15 KB (gzipped: 4 KB)
- Total initial load: ~296 KB compressed

---

## 🛠️ Future Enhancement Ideas

1. **Persistent Database:** Replace JSON with PostgreSQL/MongoDB
2. **Multi-user Support:** Add authentication & user accounts
3. **Advanced Analytics:** Track improvement over time
4. **Mobile App:** React Native version
5. **Offline Mode:** Service worker + local storage
6. **Community Features:** Leaderboards, shared scenarios
7. **Video Practice:** Webcam-based presentation training
8. **Accent Training:** Regional accent practice
9. **AI Voice Cloning:** Consistent AI voice persona
10. **Lesson Plans:** Structured curriculum paths

---

## 📖 Glossary

- **XP:** Experience Points earned through activities
- **Fluency Score:** 1-10 rating of language proficiency
- **Streak:** Consecutive days of practice
- **Badge:** Achievement unlocked by meeting criteria
- **Scenario:** Roleplay situation with AI character
- **Tongue Twister:** Pronunciation practice phrase
- **Vocab Bank:** Collection of learned words
- **Miss Nova:** AI tutor persona

---

**Last Updated:** 2026-02-14  
**Version:** 1.0.0  
**Maintainer:** Communication Learning Platform Team
