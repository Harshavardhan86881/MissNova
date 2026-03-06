from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from pathlib import Path
from datetime import datetime, date
import uvicorn
import json
import re
import random
import hashlib
from groq import Groq
from dotenv import load_dotenv
import os

from models import init_db
from routers import auth as auth_router

load_dotenv()

# Initialize Database Tables
init_db()

app = FastAPI(title="CommMaster - AI Communication Learning Platform")

# Include Auth Router
app.include_router(auth_router.router)

# Allow credentials requires explicit origins (wildcard + credentials is forbidden by browsers)
_ALLOWED_ORIGINS = [
    "https://miss-nova.vercel.app",
    "https://miss-nova-harsha8688s-projects.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Groq Client ---
groq_client = None


def get_groq_client():
    global groq_client
    if groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        groq_client = Groq(api_key=api_key)
    return groq_client


# --- Persistent Data Store (Per-User) ---
# On Vercel, only /tmp is writable. USERS_DATA_DIR env var overrides the default.
_default_users_data = Path(__file__).resolve().parent / "users_data"
USERS_DATA_DIR = Path(os.getenv("USERS_DATA_DIR", str(_default_users_data)))
USERS_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Legacy single-user file (kept for migration)
DATA_FILE = Path(__file__).resolve().parent / "user_data.json"


def get_user_id_from_request(request: Request) -> str:
    """Extract user ID from Authorization header token.
    Token format: '{user_id}:{username}:{random_hex}' or 'guest_{user_id}'
    Falls back to 'default' for unauthenticated requests."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        # Format: user_id:username:hex
        if ":" in token:
            return token.split(":")[0]
        # Guest format: guest_xxxx
        if token.startswith("guest_"):
            return token
    return "default"


def load_user_progress(user_id: str) -> dict:
    """Load progress data for a specific user."""
    user_file = USERS_DATA_DIR / f"{user_id}.json"
    if user_file.exists():
        with open(user_file, "r") as f:
            return json.load(f)
    # Migrate from legacy single-user file if this is the first user
    if user_id == "default" and DATA_FILE.exists():
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
            if "words_spoken" in data:  # It's progress data, not auth data
                return data
        except Exception:
            pass
    return get_default_user_data()


def save_user_progress(user_id: str, data: dict):
    """Save progress data for a specific user."""
    user_file = USERS_DATA_DIR / f"{user_id}.json"
    with open(user_file, "w") as f:
        json.dump(data, f, indent=2, default=str)


# Keep legacy functions for backward compat with auth router etc.
def load_user_data():
    if DATA_FILE.exists():
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return get_default_user_data()


def save_user_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


def get_default_user_data():
    return {
        "words_spoken": 0,
        "accuracy_history": [],
        "session_count": 0,
        "xp": 0,
        "level": 1,
        "streak_days": 0,
        "last_practice_date": None,
        "total_practice_minutes": 0,
        "badges": [],
        "vocabulary_bank": [],
        "completed_scenarios": [],
        "daily_challenge_completed": False,
        "daily_challenge_date": None,
        "weekly_xp_history": [0, 0, 0, 0, 0, 0, 0],
        "skill_scores": {
            "grammar": 5,
            "vocabulary": 5,
            "pronunciation": 5,
            "fluency": 5,
            "confidence": 5,
        },
        "chat_sessions": [],
        "tongue_twisters_completed": 0,
        "scenarios_attempted": 0,
        # Streak freeze & recovery system
        "streak_freeze_available": 1,
        "streak_freeze_used_dates": [],
        "streak_freeze_last_earned": None,
        "streak_at_risk": False,
        "max_streak": 0,
        # New features
        "filler_history": [],
        "cefr_level": None,
        "placement_completed": False,
        "grammar_lessons_completed": [],
        "idioms_learned": [],
        "writing_submissions": [],
        "saved_conversations": [],
    }


# Per-user conversation histories
user_conversations: Dict[str, List[dict]] = {}

# Legacy global (kept for backward compat with guest-signup etc)
user_data = load_user_data()


# --- Models ---
class TextInput(BaseModel):
    text: str


class ScenarioInput(BaseModel):
    text: str
    scenario_id: str
    scenario_context: str


class VocabWord(BaseModel):
    word: str
    definition: str
    example: str
    mastery: int = 0


class TongueTwisterInput(BaseModel):
    text: str
    target: str


class VocabPracticeInput(BaseModel):
    word: str
    sentence: str
    definition: str


class PlacementAnswer(BaseModel):
    question_id: int
    answer: str


class PlacementSubmission(BaseModel):
    answers: List[PlacementAnswer]


class GrammarLessonInput(BaseModel):
    topic_id: str


class GrammarPracticeInput(BaseModel):
    topic_id: str
    sentence: str
    exercise: str = ""


class IdiomPracticeInput(BaseModel):
    idiom_id: int
    idiom: str
    meaning: str
    mode: str
    answer: str


class SRSReviewInput(BaseModel):
    word: str
    rating: str


class WritingSubmissionInput(BaseModel):
    format: str
    prompt: str
    text: str


class ConversationReportInput(BaseModel):
    conversation_id: str = ""
    messages: List[dict]


# --- Scenarios ---
SCENARIOS = {
    "job_interview": {
        "id": "job_interview",
        "title": "Job Interview",
        "description": "Practice answering common interview questions with confidence",
        "icon": "💼",
        "difficulty": "Intermediate",
        "category": "Professional",
        "prompts": [
            "Tell me about yourself and your background.",
            "What are your greatest strengths and weaknesses?",
            "Why do you want to work for our company?",
            "Describe a challenging situation at work and how you handled it.",
            "Where do you see yourself in five years?",
        ],
        "system_context": "You are a professional HR interviewer conducting a job interview. Evaluate the candidate's response for clarity, confidence, grammar, and professionalism. Give constructive feedback.",
    },
    "business_meeting": {
        "id": "business_meeting",
        "title": "Business Meeting",
        "description": "Lead discussions, present ideas, and negotiate effectively",
        "icon": "📊",
        "difficulty": "Advanced",
        "category": "Professional",
        "prompts": [
            "Please present the quarterly results to the team.",
            "I disagree with the proposed budget. Can you defend your numbers?",
            "Let's brainstorm solutions for the declining customer satisfaction scores.",
            "How would you propose we restructure the marketing department?",
        ],
        "system_context": "You are a senior business executive in a meeting. Evaluate the speaker's communication for persuasiveness, professionalism, clarity, and use of business vocabulary.",
    },
    "casual_conversation": {
        "id": "casual_conversation",
        "title": "Casual Chat",
        "description": "Practice everyday English in friendly, relaxed conversations",
        "icon": "☕",
        "difficulty": "Beginner",
        "category": "Social",
        "prompts": [
            "Hey! How was your weekend? Did you do anything fun?",
            "Have you watched any good movies or shows lately?",
            "What kind of food do you enjoy? Any favorite restaurants?",
            "Do you have any hobbies you're passionate about?",
        ],
        "system_context": "You are a friendly, casual English-speaking friend having a relaxed conversation. Help the learner practice natural, everyday English with slang and idioms.",
    },
    "public_speaking": {
        "id": "public_speaking",
        "title": "Public Speaking",
        "description": "Deliver speeches, presentations, and persuasive arguments",
        "icon": "🎤",
        "difficulty": "Advanced",
        "category": "Performance",
        "prompts": [
            "Give a 1-minute speech about the importance of education.",
            "Deliver an elevator pitch for a startup idea of your choice.",
            "Give a motivational speech to a team that just lost a big project.",
            "Present an argument for or against remote work.",
        ],
        "system_context": "You are a speech coach evaluating a public speaking performance. Analyze structure, rhetoric, vocabulary, clarity, pacing cues, and emotional impact. Give detailed feedback.",
    },
    "customer_service": {
        "id": "customer_service",
        "title": "Customer Service",
        "description": "Handle complaints, resolve issues, and provide excellent service",
        "icon": "🎧",
        "difficulty": "Intermediate",
        "category": "Professional",
        "prompts": [
            "I ordered a product two weeks ago and it still hasn't arrived. I'm very frustrated!",
            "The software keeps crashing and I've lost all my work. I need a solution now!",
            "I was charged twice for my subscription. Can you help me?",
            "I'd like to request a refund. The product quality is terrible.",
        ],
        "system_context": "You are an upset customer calling support. Evaluate the agent's response for empathy, problem-solving, professionalism, and communication clarity.",
    },
    "debate": {
        "id": "debate",
        "title": "Debate Club",
        "description": "Argue your position on controversial topics with strong reasoning",
        "icon": "⚖️",
        "difficulty": "Advanced",
        "category": "Academic",
        "prompts": [
            "Social media does more harm than good. Argue for or against.",
            "Artificial intelligence will replace most jobs in the next 20 years. What's your position?",
            "University education should be free for everyone. Defend your stance.",
            "Climate change should be the number one priority for all governments.",
        ],
        "system_context": "You are a debate moderator and opponent. Challenge the speaker's arguments, evaluate logical reasoning, use of evidence, rhetorical skills, and grammar.",
    },
    "storytelling": {
        "id": "storytelling",
        "title": "Storytelling",
        "description": "Craft and narrate engaging stories with vivid language",
        "icon": "📖",
        "difficulty": "Intermediate",
        "category": "Creative",
        "prompts": [
            "Tell me about the most memorable trip you've ever taken.",
            "Describe a person who has greatly influenced your life.",
            "Tell a story about a time you overcame a big fear.",
            "Narrate a funny incident that happened to you recently.",
        ],
        "system_context": "You are a storytelling coach. Evaluate the narrative for structure, descriptive language, emotional engagement, vocabulary richness, and grammar.",
    },
    "doctor_visit": {
        "id": "doctor_visit",
        "title": "Doctor Visit",
        "description": "Practice describing symptoms and understanding medical advice",
        "icon": "🏥",
        "difficulty": "Beginner",
        "category": "Daily Life",
        "prompts": [
            "What brings you in today? Please describe your symptoms.",
            "How long have you been experiencing these issues?",
            "Are you currently taking any medications?",
            "Do you have any allergies I should be aware of?",
        ],
        "system_context": "You are a friendly doctor conducting a patient consultation. Help the learner practice medical vocabulary and clear description of symptoms in English.",
    },
}

# --- Tongue Twisters ---
TONGUE_TWISTERS = [
    {
        "id": 1,
        "text": "She sells seashells by the seashore.",
        "difficulty": "Easy",
        "focus": "S and SH sounds",
    },
    {
        "id": 2,
        "text": "Peter Piper picked a peck of pickled peppers.",
        "difficulty": "Easy",
        "focus": "P sounds",
    },
    {
        "id": 3,
        "text": "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
        "difficulty": "Medium",
        "focus": "W and CH sounds",
    },
    {
        "id": 4,
        "text": "Red lorry, yellow lorry, red lorry, yellow lorry.",
        "difficulty": "Medium",
        "focus": "R and L sounds",
    },
    {
        "id": 5,
        "text": "The sixth sick sheikh's sixth sheep's sick.",
        "difficulty": "Hard",
        "focus": "S, SH, and TH sounds",
    },
    {
        "id": 6,
        "text": "Betty Botter bought some butter, but she said the butter's bitter.",
        "difficulty": "Medium",
        "focus": "B and T sounds",
    },
    {
        "id": 7,
        "text": "I scream, you scream, we all scream for ice cream.",
        "difficulty": "Easy",
        "focus": "SCR and CR sounds",
    },
    {
        "id": 8,
        "text": "Unique New York, unique New York, you know you need unique New York.",
        "difficulty": "Hard",
        "focus": "N, Y, and U sounds",
    },
    {
        "id": 9,
        "text": "The thirty-three thieves thought that they thrilled the throne throughout Thursday.",
        "difficulty": "Hard",
        "focus": "TH sounds",
    },
    {
        "id": 10,
        "text": "A proper copper coffee pot.",
        "difficulty": "Easy",
        "focus": "P and C sounds",
    },
    {
        "id": 11,
        "text": "Six slippery snails slid slowly seaward.",
        "difficulty": "Medium",
        "focus": "S and SL sounds",
    },
    {
        "id": 12,
        "text": "Fresh French fried fish.",
        "difficulty": "Easy",
        "focus": "F and FR sounds",
    },
    {
        "id": 13,
        "text": "Whether the weather is warm, whether the weather is hot, we have to put up with the weather, whether we like it or not.",
        "difficulty": "Hard",
        "focus": "W and TH sounds",
    },
    {
        "id": 14,
        "text": "Can you can a canned can into an un-canned can like a canner can can a canned can into an un-canned can?",
        "difficulty": "Hard",
        "focus": "C and K sounds",
    },
    {
        "id": 15,
        "text": "Fuzzy Wuzzy was a bear. Fuzzy Wuzzy had no hair. Fuzzy Wuzzy wasn't very fuzzy, was he?",
        "difficulty": "Medium",
        "focus": "F, W, and Z sounds",
    },
]

# --- Daily Vocabulary Words (150+ curated words) ---
DAILY_VOCAB_POOL = [
    # Business & Professional
    {
        "word": "Articulate",
        "definition": "To express an idea or feeling fluently and clearly",
        "category": "Business",
        "level": "Intermediate",
        "examples": [
            "She articulated her vision for the company's future.",
            "He's very articulate when presenting to clients.",
        ],
        "usage_tips": "Use in professional settings when someone explains something clearly. Also works as an adjective: 'an articulate speaker'.",
        "synonyms": ["express", "convey", "communicate"],
        "antonyms": ["mumble", "stammer"],
    },
    {
        "word": "Leverage",
        "definition": "To use something to maximum advantage",
        "category": "Business",
        "level": "Advanced",
        "examples": [
            "We can leverage our social media presence to attract customers.",
            "She leveraged her experience to negotiate a higher salary.",
        ],
        "usage_tips": "Very common in business meetings and strategy discussions. Can be a noun or verb.",
        "synonyms": ["utilize", "exploit", "capitalize on"],
        "antonyms": ["waste", "neglect"],
    },
    {
        "word": "Collaborate",
        "definition": "To work jointly with others on a project or task",
        "category": "Business",
        "level": "Beginner",
        "examples": [
            "The two departments collaborated on the marketing campaign.",
            "Let's collaborate to find a better solution.",
        ],
        "usage_tips": "Great word for teamwork situations. Use 'collaborate with' (people) or 'collaborate on' (projects).",
        "synonyms": ["cooperate", "partner", "team up"],
        "antonyms": ["compete", "oppose"],
    },
    {
        "word": "Delegate",
        "definition": "To assign responsibility or authority to another person",
        "category": "Business",
        "level": "Intermediate",
        "examples": [
            "A good manager knows when to delegate tasks.",
            "She delegated the report writing to her assistant.",
        ],
        "usage_tips": "Key leadership word. Shows you understand management. 'Delegate TO someone' or 'delegate a task'.",
        "synonyms": ["assign", "entrust", "allocate"],
        "antonyms": ["retain", "micromanage"],
    },
    {
        "word": "Streamline",
        "definition": "To make a process more efficient by simplifying it",
        "category": "Business",
        "level": "Intermediate",
        "examples": [
            "We need to streamline our onboarding process.",
            "The new software will streamline daily operations.",
        ],
        "usage_tips": "Perfect for discussing improvements at work. Shows you think about efficiency.",
        "synonyms": ["simplify", "optimize", "modernize"],
        "antonyms": ["complicate", "hinder"],
    },
    {
        "word": "Proactive",
        "definition": "Creating or controlling a situation rather than just responding to it",
        "category": "Business",
        "level": "Intermediate",
        "examples": [
            "Be proactive about fixing issues before they escalate.",
            "Her proactive approach saved the project from failure.",
        ],
        "usage_tips": "Opposite of 'reactive'. Great word for interviews — employers love proactive employees.",
        "synonyms": ["anticipatory", "forward-thinking"],
        "antonyms": ["reactive", "passive"],
    },
    {
        "word": "Benchmark",
        "definition": "A standard or point of reference for comparison",
        "category": "Business",
        "level": "Advanced",
        "examples": [
            "This company sets the benchmark for customer service.",
            "We benchmark our performance against industry leaders.",
        ],
        "usage_tips": "Used as both noun and verb. Common in performance reviews and competitive analysis.",
        "synonyms": ["standard", "reference point", "yardstick"],
        "antonyms": [],
    },
    {
        "word": "Synergy",
        "definition": "The combined effect that is greater than individual parts",
        "category": "Business",
        "level": "Advanced",
        "examples": [
            "The merger created incredible synergy between the two brands.",
            "There's great synergy between our marketing and sales teams.",
        ],
        "usage_tips": "Very corporate word. Use sparingly to sound professional, not buzzwordy.",
        "synonyms": ["harmony", "cooperation", "collaboration"],
        "antonyms": ["discord", "conflict"],
    },
    {
        "word": "Feasible",
        "definition": "Possible and practical to do or achieve",
        "category": "Business",
        "level": "Intermediate",
        "examples": [
            "Is it feasible to complete the project by Friday?",
            "We need a feasible plan, not just ideas.",
        ],
        "usage_tips": "Use instead of 'possible' to sound more professional. Common in proposals and planning.",
        "synonyms": ["viable", "practical", "achievable"],
        "antonyms": ["impossible", "impractical"],
    },
    {
        "word": "Paradigm",
        "definition": "A typical example, pattern, or model of something",
        "category": "Business",
        "level": "Advanced",
        "examples": [
            "The internet created a paradigm shift in communication.",
            "We need a new paradigm for remote work.",
        ],
        "usage_tips": "Often used with 'shift' to describe major changes. Pronounced 'PAIR-uh-dime'.",
        "synonyms": ["model", "framework", "template"],
        "antonyms": [],
    },
    # Academic & Intellectual
    {
        "word": "Hypothesis",
        "definition": "A proposed explanation based on limited evidence as a starting point",
        "category": "Academic",
        "level": "Intermediate",
        "examples": [
            "My hypothesis is that exercise improves focus.",
            "The scientist tested her hypothesis through experiments.",
        ],
        "usage_tips": "Use when proposing ideas or explanations. More formal than 'guess'. Plural: 'hypotheses'.",
        "synonyms": ["theory", "assumption", "proposition"],
        "antonyms": ["fact", "proof"],
    },
    {
        "word": "Analyze",
        "definition": "To examine something in detail to understand it better",
        "category": "Academic",
        "level": "Beginner",
        "examples": [
            "Let's analyze the data before making a decision.",
            "She analyzed the poem for hidden meanings.",
        ],
        "usage_tips": "Essential academic word. Use instead of 'look at' for formal contexts.",
        "synonyms": ["examine", "investigate", "evaluate"],
        "antonyms": ["ignore", "overlook"],
    },
    {
        "word": "Comprehensive",
        "definition": "Including all or nearly all elements; thorough",
        "category": "Academic",
        "level": "Intermediate",
        "examples": [
            "We need a comprehensive review of the literature.",
            "The guide provides comprehensive coverage of the topic.",
        ],
        "usage_tips": "Strong adjective for describing thoroughness. Much better than saying 'complete' in formal writing.",
        "synonyms": ["thorough", "exhaustive", "all-inclusive"],
        "antonyms": ["partial", "incomplete"],
    },
    {
        "word": "Empirical",
        "definition": "Based on observation or experience rather than theory",
        "category": "Academic",
        "level": "Advanced",
        "examples": [
            "The study provides empirical evidence for the claim.",
            "We need empirical data, not just opinions.",
        ],
        "usage_tips": "Key academic term. Shows you value evidence-based reasoning. 'Empirical evidence' is a common phrase.",
        "synonyms": ["observational", "experimental", "factual"],
        "antonyms": ["theoretical", "hypothetical"],
    },
    {
        "word": "Elaborate",
        "definition": "To develop or explain in more detail",
        "category": "Academic",
        "level": "Beginner",
        "examples": [
            "Could you elaborate on that point?",
            "She elaborated her argument with examples.",
        ],
        "usage_tips": "Perfect for discussions and presentations. 'Can you elaborate?' is a polite way to ask for more detail.",
        "synonyms": ["expand", "clarify", "detail"],
        "antonyms": ["summarize", "simplify"],
    },
    {
        "word": "Ambiguous",
        "definition": "Open to more than one interpretation; unclear",
        "category": "Academic",
        "level": "Intermediate",
        "examples": [
            "The contract language is ambiguous and could cause problems.",
            "His response was ambiguous — I'm not sure if he agreed.",
        ],
        "usage_tips": "Use when something is unclear or has multiple meanings. Noun form: 'ambiguity'.",
        "synonyms": ["vague", "unclear", "equivocal"],
        "antonyms": ["clear", "explicit", "unambiguous"],
    },
    {
        "word": "Pragmatic",
        "definition": "Dealing with things in a practical rather than idealistic way",
        "category": "Academic",
        "level": "Advanced",
        "examples": [
            "We need a pragmatic approach to solve this.",
            "She's a pragmatic leader who focuses on results.",
        ],
        "usage_tips": "Great word for showing you're practical and solution-oriented. Opposite of 'idealistic'.",
        "synonyms": ["practical", "realistic", "sensible"],
        "antonyms": ["idealistic", "impractical"],
    },
    {
        "word": "Nuance",
        "definition": "A subtle difference in meaning, expression, or sound",
        "category": "Academic",
        "level": "Advanced",
        "examples": [
            "There are important nuances in the legal language.",
            "She understands the nuances of cross-cultural communication.",
        ],
        "usage_tips": "Shows sophistication. Use when discussing subtle but important differences.",
        "synonyms": ["subtlety", "distinction", "shade"],
        "antonyms": ["bluntness", "obviousness"],
    },
    # Social & Conversation
    {
        "word": "Empathize",
        "definition": "To understand and share the feelings of another person",
        "category": "Social",
        "level": "Intermediate",
        "examples": [
            "I can empathize with your frustration.",
            "Good leaders empathize with their team members.",
        ],
        "usage_tips": "Use 'empathize WITH' someone. Different from 'sympathize' — empathy means you truly feel what they feel.",
        "synonyms": ["understand", "relate to", "identify with"],
        "antonyms": ["disregard", "ignore"],
    },
    {
        "word": "Rapport",
        "definition": "A close and harmonious relationship with good communication",
        "category": "Social",
        "level": "Intermediate",
        "examples": [
            "She quickly built rapport with the new client.",
            "Having good rapport makes teamwork much easier.",
        ],
        "usage_tips": "Pronounced 'ra-POR'. 'Build rapport' is the most common phrase. Essential for networking.",
        "synonyms": ["connection", "bond", "understanding"],
        "antonyms": ["hostility", "distance"],
    },
    {
        "word": "Assertive",
        "definition": "Confident and direct in claiming one's rights or expressing opinions",
        "category": "Social",
        "level": "Intermediate",
        "examples": [
            "You need to be more assertive in meetings.",
            "She gave an assertive response without being aggressive.",
        ],
        "usage_tips": "Positive word — different from 'aggressive'. Being assertive means speaking up respectfully.",
        "synonyms": ["confident", "self-assured", "forthright"],
        "antonyms": ["passive", "timid", "submissive"],
    },
    {
        "word": "Eloquent",
        "definition": "Fluent, persuasive, and clearly expressed in speech or writing",
        "category": "Social",
        "level": "Advanced",
        "examples": [
            "She gave an eloquent speech at the ceremony.",
            "His eloquent writing inspired millions.",
        ],
        "usage_tips": "High-level compliment for someone's speaking ability. Noun: 'eloquence'.",
        "synonyms": ["articulate", "expressive", "persuasive"],
        "antonyms": ["inarticulate", "incoherent"],
    },
    {
        "word": "Cordial",
        "definition": "Warm, friendly, and polite",
        "category": "Social",
        "level": "Intermediate",
        "examples": [
            "They had a cordial meeting despite their differences.",
            "She greeted everyone with a cordial smile.",
        ],
        "usage_tips": "Perfect for describing professional but warm interactions. More formal than 'friendly'.",
        "synonyms": ["warm", "gracious", "amiable"],
        "antonyms": ["hostile", "cold", "unfriendly"],
    },
    {
        "word": "Tactful",
        "definition": "Showing skill in dealing with others without causing offense",
        "category": "Social",
        "level": "Intermediate",
        "examples": [
            "She was tactful in delivering the bad news.",
            "Being tactful is essential in customer service.",
        ],
        "usage_tips": "Key social skill word. 'Tact' is the noun form. Opposite: 'tactless' (rude/careless with words).",
        "synonyms": ["diplomatic", "sensitive", "discreet"],
        "antonyms": ["tactless", "blunt", "insensitive"],
    },
    {
        "word": "Charismatic",
        "definition": "Exercising a compelling charm that inspires devotion in others",
        "category": "Social",
        "level": "Intermediate",
        "examples": [
            "The charismatic speaker captivated the audience.",
            "She has a charismatic personality that draws people in.",
        ],
        "usage_tips": "Strong compliment for someone's presence. Noun: 'charisma'. Great for describing leaders.",
        "synonyms": ["charming", "magnetic", "captivating"],
        "antonyms": ["repulsive", "dull", "uninspiring"],
    },
    # Emotional & Descriptive
    {
        "word": "Resilient",
        "definition": "Able to recover quickly from difficulties; tough",
        "category": "Emotional",
        "level": "Intermediate",
        "examples": [
            "She's incredibly resilient after all she's been through.",
            "Build a resilient mindset for challenging times.",
        ],
        "usage_tips": "Very positive word. Noun: 'resilience'. Use in motivational or career contexts.",
        "synonyms": ["tough", "strong", "adaptable"],
        "antonyms": ["fragile", "vulnerable", "weak"],
    },
    {
        "word": "Meticulous",
        "definition": "Showing great attention to detail; very careful and precise",
        "category": "Emotional",
        "level": "Advanced",
        "examples": [
            "She's meticulous about checking her work.",
            "The report was prepared with meticulous care.",
        ],
        "usage_tips": "Great for resumes and describing work quality. Shows thoroughness without being negative.",
        "synonyms": ["precise", "thorough", "painstaking"],
        "antonyms": ["careless", "sloppy", "negligent"],
    },
    {
        "word": "Perseverance",
        "definition": "Continued effort despite difficulties or delay in achieving success",
        "category": "Emotional",
        "level": "Intermediate",
        "examples": [
            "Her perseverance paid off when she finally got the promotion.",
            "Success requires talent and perseverance.",
        ],
        "usage_tips": "Strong character trait. Verb: 'persevere'. Use in motivational contexts or interviews.",
        "synonyms": ["persistence", "determination", "tenacity"],
        "antonyms": ["laziness", "giving up"],
    },
    {
        "word": "Contentious",
        "definition": "Causing or likely to cause disagreement or argument",
        "category": "Emotional",
        "level": "Advanced",
        "examples": [
            "Immigration is a contentious topic in politics.",
            "The board meeting became contentious over the budget.",
        ],
        "usage_tips": "Use when describing controversial topics. More formal than 'controversial'.",
        "synonyms": ["controversial", "debatable", "divisive"],
        "antonyms": ["agreeable", "uncontroversial"],
    },
    {
        "word": "Gratitude",
        "definition": "The quality of being thankful; readiness to show appreciation",
        "category": "Emotional",
        "level": "Beginner",
        "examples": [
            "I want to express my gratitude for your help.",
            "Practicing gratitude daily improves mental health.",
        ],
        "usage_tips": "More formal than 'thanks'. Great for emails and formal speech. Adjective: 'grateful'.",
        "synonyms": ["thankfulness", "appreciation", "recognition"],
        "antonyms": ["ingratitude", "ungratefulness"],
    },
    {
        "word": "Diligent",
        "definition": "Showing careful and persistent work or effort",
        "category": "Emotional",
        "level": "Intermediate",
        "examples": [
            "She's a diligent student who always completes her homework.",
            "Diligent research led to the breakthrough.",
        ],
        "usage_tips": "Great for recommendations and self-descriptions. Noun: 'diligence'. Implies consistent effort.",
        "synonyms": ["hardworking", "industrious", "conscientious"],
        "antonyms": ["lazy", "careless", "negligent"],
    },
    # Daily Life & Situation
    {
        "word": "Accommodate",
        "definition": "To provide what is needed; to make room for",
        "category": "Daily Life",
        "level": "Intermediate",
        "examples": [
            "The hotel can accommodate up to 200 guests.",
            "We'll try to accommodate your special dietary needs.",
        ],
        "usage_tips": "Use in service, hospitality, and flexibility contexts. Shows you're adaptable.",
        "synonyms": ["cater to", "provide for", "adjust to"],
        "antonyms": ["refuse", "reject"],
    },
    {
        "word": "Authentic",
        "definition": "Genuine, real, and true to its origin",
        "category": "Daily Life",
        "level": "Beginner",
        "examples": [
            "This restaurant serves authentic Italian food.",
            "Being authentic is more important than being perfect.",
        ],
        "usage_tips": "Trendy and powerful word. Use for food, people, and experiences. Noun: 'authenticity'.",
        "synonyms": ["genuine", "real", "original"],
        "antonyms": ["fake", "counterfeit", "artificial"],
    },
    {
        "word": "Versatile",
        "definition": "Able to adapt to many different functions or activities",
        "category": "Daily Life",
        "level": "Intermediate",
        "examples": [
            "She's a versatile employee who can handle any department.",
            "This tool is incredibly versatile.",
        ],
        "usage_tips": "Perfect for resumes and product descriptions. Shows adaptability. Noun: 'versatility'.",
        "synonyms": ["adaptable", "flexible", "multi-talented"],
        "antonyms": ["limited", "inflexible"],
    },
    {
        "word": "Inevitable",
        "definition": "Certain to happen; unavoidable",
        "category": "Daily Life",
        "level": "Intermediate",
        "examples": [
            "Change is inevitable in any growing company.",
            "It was inevitable that they would find out.",
        ],
        "usage_tips": "Powerful word for expressing certainty. Adverb: 'inevitably'. Great for discussions about trends.",
        "synonyms": ["unavoidable", "certain", "inescapable"],
        "antonyms": ["avoidable", "uncertain", "preventable"],
    },
    {
        "word": "Substantial",
        "definition": "Of considerable importance, size, or worth",
        "category": "Daily Life",
        "level": "Intermediate",
        "examples": [
            "We saw a substantial improvement in sales.",
            "She received a substantial pay raise.",
        ],
        "usage_tips": "Use instead of 'big' or 'a lot' for professional contexts. Much more impactful.",
        "synonyms": ["significant", "considerable", "sizable"],
        "antonyms": ["insignificant", "minimal", "trivial"],
    },
    {
        "word": "Spontaneous",
        "definition": "Done without planning; natural and impulsive",
        "category": "Daily Life",
        "level": "Intermediate",
        "examples": [
            "The trip was completely spontaneous.",
            "He's known for his spontaneous sense of humor.",
        ],
        "usage_tips": "Positive word for describing unplanned fun. Noun: 'spontaneity'. Great for storytelling.",
        "synonyms": ["impulsive", "unplanned", "natural"],
        "antonyms": ["planned", "deliberate", "calculated"],
    },
    # Descriptive & Advanced
    {
        "word": "Ubiquitous",
        "definition": "Present, appearing, or found everywhere",
        "category": "Descriptive",
        "level": "Advanced",
        "examples": [
            "Smartphones have become ubiquitous in modern life.",
            "Coffee shops are ubiquitous in this city.",
        ],
        "usage_tips": "Impressive vocabulary word. Pronounced 'yoo-BIK-wit-us'. Use to describe things that are everywhere.",
        "synonyms": ["omnipresent", "widespread", "pervasive"],
        "antonyms": ["rare", "scarce"],
    },
    {
        "word": "Profound",
        "definition": "Very great or intense; having deep insight",
        "category": "Descriptive",
        "level": "Intermediate",
        "examples": [
            "The book had a profound impact on my thinking.",
            "She offered a profound observation about human nature.",
        ],
        "usage_tips": "Use for deep, meaningful things. Stronger than 'deep'. Adverb: 'profoundly'.",
        "synonyms": ["deep", "intense", "significant"],
        "antonyms": ["shallow", "superficial", "trivial"],
    },
    {
        "word": "Eloquence",
        "definition": "Fluent or persuasive speaking or writing",
        "category": "Descriptive",
        "level": "Advanced",
        "examples": [
            "Her eloquence moved the entire audience to tears.",
            "He spoke with great eloquence about the need for change.",
        ],
        "usage_tips": "Adjective: 'eloquent'. One of the highest compliments for a communicator.",
        "synonyms": ["articulacy", "expressiveness", "fluency"],
        "antonyms": ["incoherence", "awkwardness"],
    },
    {
        "word": "Impeccable",
        "definition": "Without faults or mistakes; flawless",
        "category": "Descriptive",
        "level": "Advanced",
        "examples": [
            "Her English is impeccable.",
            "The hotel provided impeccable service.",
        ],
        "usage_tips": "Strong compliment. Often used with 'taste', 'manners', 'timing', 'record'. Very impressive word.",
        "synonyms": ["flawless", "perfect", "faultless"],
        "antonyms": ["flawed", "imperfect", "faulty"],
    },
    {
        "word": "Tenacious",
        "definition": "Holding firmly to something; persistent and determined",
        "category": "Descriptive",
        "level": "Advanced",
        "examples": [
            "She's a tenacious negotiator who never gives up.",
            "His tenacious spirit inspired the whole team.",
        ],
        "usage_tips": "Powerfully positive. Noun: 'tenacity'. Great for describing determination in interviews.",
        "synonyms": ["persistent", "determined", "relentless"],
        "antonyms": ["yielding", "weak-willed"],
    },
    {
        "word": "Serendipity",
        "definition": "Finding something good without looking for it; a happy accident",
        "category": "Descriptive",
        "level": "Advanced",
        "examples": [
            "Meeting her was pure serendipity.",
            "Many scientific discoveries were made through serendipity.",
        ],
        "usage_tips": "Beautiful, rare word that impresses. Adjective: 'serendipitous'. Great for storytelling.",
        "synonyms": ["luck", "chance", "fortune"],
        "antonyms": ["misfortune", "bad luck"],
    },
]


def get_daily_vocab_words(target_date=None):
    """Returns 12 vocabulary words for the given date, rotating daily."""
    if target_date is None:
        target_date = date.today()
    # Use date to create a deterministic seed
    seed_str = f"vocab-{target_date.isoformat()}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    rng = random.Random(seed)
    # Pick 12 words, trying to spread across categories
    categories = list(set(w["category"] for w in DAILY_VOCAB_POOL))
    selected = []
    pool = list(DAILY_VOCAB_POOL)
    rng.shuffle(pool)
    # Pick 2 from each category first
    for cat in categories:
        cat_words = [w for w in pool if w["category"] == cat and w not in selected]
        selected.extend(cat_words[:2])
    # Fill remaining to 12
    remaining = [w for w in pool if w not in selected]
    while len(selected) < 12 and remaining:
        selected.append(remaining.pop(0))
    return selected[:12]


# --- Daily Challenges ---
DAILY_CHALLENGES = [
    {
        "id": 1,
        "title": "Describe Your Morning",
        "description": "Describe your morning routine in detail using at least 5 sentences.",
        "xp_reward": 50,
        "type": "speaking",
    },
    {
        "id": 2,
        "title": "Persuade Me",
        "description": "Convince someone to start exercising regularly. Be persuasive!",
        "xp_reward": 75,
        "type": "speaking",
    },
    {
        "id": 3,
        "title": "Explain a Concept",
        "description": "Explain how the internet works to a 10-year-old child.",
        "xp_reward": 60,
        "type": "speaking",
    },
    {
        "id": 4,
        "title": "Tell a Joke",
        "description": "Tell a funny story or joke in English. Make it entertaining!",
        "xp_reward": 40,
        "type": "speaking",
    },
    {
        "id": 5,
        "title": "Formal Email",
        "description": "Compose a formal email requesting a meeting with your manager.",
        "xp_reward": 65,
        "type": "writing",
    },
    {
        "id": 6,
        "title": "News Reporter",
        "description": "Report a breaking news story about a positive event in your city.",
        "xp_reward": 70,
        "type": "speaking",
    },
    {
        "id": 7,
        "title": "Apology Speech",
        "description": "Give a sincere apology for arriving late to an important meeting.",
        "xp_reward": 55,
        "type": "speaking",
    },
    {
        "id": 8,
        "title": "Product Review",
        "description": "Give a detailed review of your favorite gadget or app.",
        "xp_reward": 50,
        "type": "speaking",
    },
    {
        "id": 9,
        "title": "Travel Guide",
        "description": "Describe your favorite vacation destination to attract visitors.",
        "xp_reward": 60,
        "type": "speaking",
    },
    {
        "id": 10,
        "title": "Debate: AI in Education",
        "description": "Argue whether AI should be used to replace teachers.",
        "xp_reward": 80,
        "type": "speaking",
    },
]


# --- System Prompt ---
def load_system_prompt():
    try:
        prompt_path = Path(__file__).resolve().parent.parent / "system_prompt.txt"
        with open(prompt_path, "r") as f:
            return f.read()
    except FileNotFoundError:
        return "You are a helpful English tutor named Miss Nova."


SYSTEM_PROMPT = load_system_prompt()


def get_language_prompt(ud=None):
    """Get the language-specific system prompt suffix based on user's selected language."""
    if ud is None:
        ud = user_data
    lang = ud.get("user_preferences", {}).get("learning_language", "english")
    lang_config = LANGUAGES.get(lang) if "LANGUAGES" in dir() else None
    # LANGUAGES is defined later in the file, use a fallback lookup
    lang_suffixes = {
        "english": "You are an English language tutor. Help the learner practice English conversation.",
        "spanish": "Eres un tutor de español. Help the learner practice Spanish conversation. Respond in a mix of Spanish and English, teaching Spanish words and phrases.",
        "french": "Vous êtes un tuteur de français. Help the learner practice French conversation. Respond in a mix of French and English, teaching French words and phrases.",
        "german": "Du bist ein Deutschlehrer. Help the learner practice German conversation. Respond in a mix of German and English, teaching German words and phrases.",
        "japanese": "あなたは日本語の先生です。Help the learner practice Japanese conversation and learn hiragana/katakana. Respond in a mix of Japanese and English.",
        "mandarin": "你是一位中文老师。Help the learner practice Mandarin Chinese conversation. Respond in a mix of Chinese and English, teaching Chinese characters and pinyin.",
        "korean": "당신은 한국어 선생님입니다. Help the learner practice Korean conversation and learn Hangul. Respond in a mix of Korean and English.",
        "portuguese": "Você é um professor de português. Help the learner practice Portuguese conversation. Respond in a mix of Portuguese and English.",
        "hindi": "आप एक हिंदी शिक्षक हैं। Help the learner practice Hindi conversation and learn Devanagari script. Respond in a mix of Hindi and English.",
        "arabic": "أنت معلم لغة عربية. Help the learner practice Arabic conversation and learn the Arabic script. Respond in a mix of Arabic and English.",
    }
    return lang_suffixes.get(lang, lang_suffixes["english"])


def get_current_language(ud=None):
    """Get the user's current learning language code."""
    if ud is None:
        ud = user_data
    return ud.get("user_preferences", {}).get("learning_language", "english")


def parse_ai_response(raw_text: str) -> dict:
    json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
    if json_match:
        return json.loads(json_match.group(1))
    json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if json_match:
        return json.loads(json_match.group(0))
    raise ValueError(f"Could not parse JSON from AI response: {raw_text[:200]}")


def calculate_level(xp):
    level = 1
    xp_needed = 100
    remaining = xp
    while remaining >= xp_needed:
        remaining -= xp_needed
        level += 1
        xp_needed = int(xp_needed * 1.5)
    return level, remaining, xp_needed


def get_xp_multiplier(data):
    """Calculate XP multiplier based on streak and time of day."""
    multiplier = 1.0
    breakdown = []

    # Streak multiplier
    streak = data.get("streak_days", 0)
    if streak >= 30:
        multiplier += 1.5
        breakdown.append(
            {"type": "streak_30", "label": "30+ Day Streak", "bonus": "2.5x"}
        )
    elif streak >= 14:
        multiplier += 1.0
        breakdown.append(
            {"type": "streak_14", "label": "14+ Day Streak", "bonus": "2.0x"}
        )
    elif streak >= 7:
        multiplier += 0.5
        breakdown.append(
            {"type": "streak_7", "label": "7+ Day Streak", "bonus": "1.5x"}
        )
    elif streak >= 3:
        multiplier += 0.25
        breakdown.append(
            {"type": "streak_3", "label": "3+ Day Streak", "bonus": "1.25x"}
        )

    # Time-of-day bonus
    hour = datetime.now().hour
    if 5 <= hour < 9:
        multiplier += 0.25
        breakdown.append(
            {"type": "early_bird", "label": "Early Bird Bonus", "bonus": "+25%"}
        )
    elif hour >= 21:
        multiplier += 0.1
        breakdown.append(
            {"type": "night_owl", "label": "Night Study Bonus", "bonus": "+10%"}
        )

    # Weekend bonus
    if date.today().weekday() >= 5:
        multiplier += 0.15
        breakdown.append(
            {"type": "weekend", "label": "Weekend Warrior", "bonus": "+15%"}
        )

    return round(multiplier, 2), breakdown


def calculate_xp_with_multiplier(base_xp, data):
    """Apply multipliers to base XP and return detailed breakdown."""
    multiplier, breakdown = get_xp_multiplier(data)
    final_xp = int(base_xp * multiplier)
    bonus_xp = final_xp - base_xp
    return {
        "base_xp": base_xp,
        "multiplier": multiplier,
        "bonus_xp": bonus_xp,
        "final_xp": final_xp,
        "breakdown": breakdown,
    }


def check_and_award_badges(data):
    badges = data.get("badges", [])
    badge_ids = [b["id"] for b in badges]
    streak = data.get("streak_days", 0)
    sessions = data.get("session_count", 0)
    words = data.get("words_spoken", 0)
    vocab_count = len(data.get("vocabulary_bank", []))
    twisters = data.get("tongue_twisters_completed", 0)
    scenarios = data.get("scenarios_attempted", 0)
    xp = data.get("xp", 0)
    level = data.get("level", 1)
    accuracy = data.get("accuracy_history", [])
    daily_challenge_count = data.get("daily_challenges_completed", 0)
    translations = data.get("translations_completed", 0)
    max_streak = data.get("max_streak", 0)

    potential_badges = [
        # --- Session milestones (tiered) ---
        {
            "id": "first_chat",
            "name": "First Words",
            "icon": "🎯",
            "description": "Complete your first conversation",
            "rarity": "common",
            "xp_reward": 10,
            "condition": sessions >= 1,
        },
        {
            "id": "10_sessions",
            "name": "Chatterbox",
            "icon": "💬",
            "description": "Complete 10 conversations",
            "rarity": "common",
            "xp_reward": 25,
            "condition": sessions >= 10,
        },
        {
            "id": "25_sessions",
            "name": "Talkative",
            "icon": "🗣️",
            "description": "Complete 25 conversations",
            "rarity": "uncommon",
            "xp_reward": 50,
            "condition": sessions >= 25,
        },
        {
            "id": "50_sessions",
            "name": "Conversation Master",
            "icon": "👑",
            "description": "Complete 50 conversations",
            "rarity": "rare",
            "xp_reward": 100,
            "condition": sessions >= 50,
        },
        {
            "id": "100_sessions",
            "name": "Centurion Speaker",
            "icon": "🏛️",
            "description": "Complete 100 conversations",
            "rarity": "epic",
            "xp_reward": 200,
            "condition": sessions >= 100,
        },
        {
            "id": "500_sessions",
            "name": "Legendary Orator",
            "icon": "🎭",
            "description": "Complete 500 conversations",
            "rarity": "legendary",
            "xp_reward": 500,
            "condition": sessions >= 500,
        },
        # --- Words spoken milestones ---
        {
            "id": "100_words",
            "name": "Word Explorer",
            "icon": "📝",
            "description": "Speak 100 words",
            "rarity": "common",
            "xp_reward": 15,
            "condition": words >= 100,
        },
        {
            "id": "500_words",
            "name": "Word Collector",
            "icon": "📄",
            "description": "Speak 500 words",
            "rarity": "uncommon",
            "xp_reward": 30,
            "condition": words >= 500,
        },
        {
            "id": "1000_words",
            "name": "Wordsmith",
            "icon": "✍️",
            "description": "Speak 1,000 words",
            "rarity": "rare",
            "xp_reward": 75,
            "condition": words >= 1000,
        },
        {
            "id": "5000_words",
            "name": "Eloquent Speaker",
            "icon": "🎙️",
            "description": "Speak 5,000 words",
            "rarity": "epic",
            "xp_reward": 150,
            "condition": words >= 5000,
        },
        {
            "id": "10000_words",
            "name": "Word Titan",
            "icon": "⚔️",
            "description": "Speak 10,000 words",
            "rarity": "legendary",
            "xp_reward": 300,
            "condition": words >= 10000,
        },
        # --- Streak milestones (tiered) ---
        {
            "id": "streak_3",
            "name": "Consistent",
            "icon": "🔥",
            "description": "3-day practice streak",
            "rarity": "common",
            "xp_reward": 15,
            "condition": streak >= 3,
        },
        {
            "id": "streak_7",
            "name": "Dedicated",
            "icon": "⚡",
            "description": "7-day practice streak",
            "rarity": "uncommon",
            "xp_reward": 35,
            "condition": streak >= 7,
        },
        {
            "id": "streak_14",
            "name": "Fortnight Fighter",
            "icon": "🛡️",
            "description": "14-day practice streak",
            "rarity": "rare",
            "xp_reward": 75,
            "condition": streak >= 14,
        },
        {
            "id": "streak_30",
            "name": "Unstoppable",
            "icon": "🏆",
            "description": "30-day practice streak",
            "rarity": "epic",
            "xp_reward": 150,
            "condition": streak >= 30,
        },
        {
            "id": "streak_60",
            "name": "Iron Will",
            "icon": "💎",
            "description": "60-day practice streak",
            "rarity": "epic",
            "xp_reward": 300,
            "condition": streak >= 60,
        },
        {
            "id": "streak_100",
            "name": "Streak Legend",
            "icon": "👑",
            "description": "100-day practice streak",
            "rarity": "legendary",
            "xp_reward": 500,
            "condition": streak >= 100,
        },
        {
            "id": "streak_365",
            "name": "Year of Mastery",
            "icon": "🌟",
            "description": "365-day practice streak!",
            "rarity": "legendary",
            "xp_reward": 2000,
            "condition": streak >= 365,
        },
        # --- Fluency / accuracy ---
        {
            "id": "high_score",
            "name": "Perfect Score",
            "icon": "💯",
            "description": "Get a 10/10 fluency score",
            "rarity": "uncommon",
            "xp_reward": 30,
            "condition": 10 in accuracy,
        },
        {
            "id": "five_perfect",
            "name": "Perfectionist",
            "icon": "✨",
            "description": "Get five 10/10 fluency scores",
            "rarity": "rare",
            "xp_reward": 75,
            "condition": accuracy.count(10) >= 5,
        },
        {
            "id": "avg_8plus",
            "name": "Consistent Excellence",
            "icon": "📊",
            "description": "Maintain 8+ avg fluency over 20 sessions",
            "rarity": "epic",
            "xp_reward": 100,
            "condition": len(accuracy) >= 20 and sum(accuracy[-20:]) / 20 >= 8,
        },
        # --- Vocabulary ---
        {
            "id": "vocab_10",
            "name": "Vocab Builder",
            "icon": "📚",
            "description": "Learn 10 new words",
            "rarity": "common",
            "xp_reward": 20,
            "condition": vocab_count >= 10,
        },
        {
            "id": "vocab_25",
            "name": "Word Hoarder",
            "icon": "🗃️",
            "description": "Learn 25 new words",
            "rarity": "uncommon",
            "xp_reward": 40,
            "condition": vocab_count >= 25,
        },
        {
            "id": "vocab_50",
            "name": "Dictionary",
            "icon": "📖",
            "description": "Learn 50 new words",
            "rarity": "rare",
            "xp_reward": 80,
            "condition": vocab_count >= 50,
        },
        {
            "id": "vocab_100",
            "name": "Lexicon Master",
            "icon": "🏫",
            "description": "Learn 100 new words",
            "rarity": "epic",
            "xp_reward": 200,
            "condition": vocab_count >= 100,
        },
        # --- Scenarios ---
        {
            "id": "scenario_1",
            "name": "Scene Stealer",
            "icon": "🎬",
            "description": "Complete your first scenario",
            "rarity": "common",
            "xp_reward": 15,
            "condition": scenarios >= 1,
        },
        {
            "id": "scenario_5",
            "name": "Role Player",
            "icon": "🎭",
            "description": "Try 5 different scenarios",
            "rarity": "uncommon",
            "xp_reward": 40,
            "condition": scenarios >= 5,
        },
        {
            "id": "scenario_20",
            "name": "Drama King/Queen",
            "icon": "👸",
            "description": "Complete 20 scenarios",
            "rarity": "rare",
            "xp_reward": 100,
            "condition": scenarios >= 20,
        },
        # --- Tongue twisters ---
        {
            "id": "twister_1",
            "name": "Twisted Tongue",
            "icon": "😜",
            "description": "Complete your first tongue twister",
            "rarity": "common",
            "xp_reward": 10,
            "condition": twisters >= 1,
        },
        {
            "id": "twister_5",
            "name": "Tongue Master",
            "icon": "👅",
            "description": "Complete 5 tongue twisters",
            "rarity": "uncommon",
            "xp_reward": 30,
            "condition": twisters >= 5,
        },
        {
            "id": "twister_20",
            "name": "Articulation Pro",
            "icon": "🎤",
            "description": "Complete 20 tongue twisters",
            "rarity": "rare",
            "xp_reward": 75,
            "condition": twisters >= 20,
        },
        # --- Level milestones ---
        {
            "id": "level_3",
            "name": "Getting Started",
            "icon": "🌱",
            "description": "Reach Level 3",
            "rarity": "common",
            "xp_reward": 20,
            "condition": level >= 3,
        },
        {
            "id": "level_5",
            "name": "Rising Star",
            "icon": "⭐",
            "description": "Reach Level 5",
            "rarity": "uncommon",
            "xp_reward": 40,
            "condition": level >= 5,
        },
        {
            "id": "level_10",
            "name": "Communication Pro",
            "icon": "🌟",
            "description": "Reach Level 10",
            "rarity": "rare",
            "xp_reward": 100,
            "condition": level >= 10,
        },
        {
            "id": "level_20",
            "name": "Language Virtuoso",
            "icon": "💫",
            "description": "Reach Level 20",
            "rarity": "epic",
            "xp_reward": 250,
            "condition": level >= 20,
        },
        {
            "id": "level_50",
            "name": "Grand Master",
            "icon": "👑",
            "description": "Reach Level 50",
            "rarity": "legendary",
            "xp_reward": 1000,
            "condition": level >= 50,
        },
        # --- XP milestones ---
        {
            "id": "xp_500",
            "name": "XP Hunter",
            "icon": "🎯",
            "description": "Earn 500 total XP",
            "rarity": "common",
            "xp_reward": 25,
            "condition": xp >= 500,
        },
        {
            "id": "xp_2000",
            "name": "XP Machine",
            "icon": "⚙️",
            "description": "Earn 2,000 total XP",
            "rarity": "uncommon",
            "xp_reward": 50,
            "condition": xp >= 2000,
        },
        {
            "id": "xp_5000",
            "name": "XP Dominator",
            "icon": "🚀",
            "description": "Earn 5,000 total XP",
            "rarity": "rare",
            "xp_reward": 100,
            "condition": xp >= 5000,
        },
        {
            "id": "xp_20000",
            "name": "XP Overlord",
            "icon": "🌍",
            "description": "Earn 20,000 total XP",
            "rarity": "legendary",
            "xp_reward": 500,
            "condition": xp >= 20000,
        },
        # --- Daily challenge badges ---
        {
            "id": "daily_1",
            "name": "Challenge Accepted",
            "icon": "🎪",
            "description": "Complete your first daily challenge",
            "rarity": "common",
            "xp_reward": 15,
            "condition": daily_challenge_count >= 1,
        },
        {
            "id": "daily_7",
            "name": "Weekly Warrior",
            "icon": "⚔️",
            "description": "Complete 7 daily challenges",
            "rarity": "uncommon",
            "xp_reward": 50,
            "condition": daily_challenge_count >= 7,
        },
        {
            "id": "daily_30",
            "name": "Monthly Champion",
            "icon": "🥇",
            "description": "Complete 30 daily challenges",
            "rarity": "rare",
            "xp_reward": 150,
            "condition": daily_challenge_count >= 30,
        },
        # --- Translation badges ---
        {
            "id": "translator_1",
            "name": "Babel Fish",
            "icon": "🐠",
            "description": "Use the translator for the first time",
            "rarity": "common",
            "xp_reward": 10,
            "condition": translations >= 1,
        },
        {
            "id": "translator_20",
            "name": "Polyglot",
            "icon": "🌐",
            "description": "Complete 20 translations",
            "rarity": "uncommon",
            "xp_reward": 40,
            "condition": translations >= 20,
        },
        {
            "id": "translator_50",
            "name": "UN Interpreter",
            "icon": "🏛️",
            "description": "Complete 50 translations",
            "rarity": "rare",
            "xp_reward": 100,
            "condition": translations >= 50,
        },
        # --- Time-based special badges ---
        {
            "id": "early_bird",
            "name": "Early Bird",
            "icon": "🌅",
            "description": "Practice before 9 AM",
            "rarity": "uncommon",
            "xp_reward": 20,
            "condition": datetime.now().hour < 9 and sessions >= 1,
        },
        {
            "id": "night_owl",
            "name": "Night Owl",
            "icon": "🦉",
            "description": "Practice after 11 PM",
            "rarity": "uncommon",
            "xp_reward": 20,
            "condition": datetime.now().hour >= 23 and sessions >= 1,
        },
        {
            "id": "weekend_warrior",
            "name": "Weekend Warrior",
            "icon": "🏖️",
            "description": "Practice on a weekend",
            "rarity": "common",
            "xp_reward": 15,
            "condition": date.today().weekday() >= 5 and sessions >= 1,
        },
    ]

    new_badges = []
    for badge in potential_badges:
        if badge["id"] not in badge_ids and badge["condition"]:
            badge_data = {k: v for k, v in badge.items() if k != "condition"}
            badge_data["earned_at"] = str(datetime.now())
            badges.append(badge_data)
            new_badges.append(badge_data)
            # Award bonus XP for badge
            if badge.get("xp_reward"):
                data["xp"] = data.get("xp", 0) + badge["xp_reward"]

    data["badges"] = badges
    return new_badges


def update_streak(data):
    today = str(date.today())
    last = data.get("last_practice_date")
    if last == today:
        data["streak_at_risk"] = False
        return
    yesterday = str(date.today().fromordinal(date.today().toordinal() - 1))
    two_days_ago = str(date.today().fromordinal(date.today().toordinal() - 2))

    if last == yesterday:
        # Practiced yesterday — extend streak
        data["streak_days"] = data.get("streak_days", 0) + 1
        data["streak_at_risk"] = False
    elif last == two_days_ago and data.get("streak_days", 0) > 0:
        # Missed yesterday — try to use a streak freeze
        freezes = data.get("streak_freeze_available", 0)
        if freezes > 0:
            data["streak_freeze_available"] = freezes - 1
            used_dates = data.get("streak_freeze_used_dates", [])
            used_dates.append(yesterday)
            data["streak_freeze_used_dates"] = used_dates[-10:]  # Keep last 10
            data["streak_days"] = data.get("streak_days", 0) + 1  # Continue streak
            data["streak_at_risk"] = True  # Mark as recovered
        else:
            # No freezes available — reset streak
            data["streak_days"] = 1
            data["streak_at_risk"] = False
    elif last != today:
        # Missed more than 1 day — reset streak
        data["streak_days"] = 1
        data["streak_at_risk"] = False

    data["last_practice_date"] = today

    # Track max streak
    if data["streak_days"] > data.get("max_streak", 0):
        data["max_streak"] = data["streak_days"]

    # Award a new streak freeze each week (every 7 days of streak)
    streak = data.get("streak_days", 0)
    last_earned = data.get("streak_freeze_last_earned", 0)
    if streak >= 7 and streak // 7 > (last_earned or 0) // 7:
        data["streak_freeze_available"] = min(
            data.get("streak_freeze_available", 0) + 1, 3
        )
        data["streak_freeze_last_earned"] = streak

    # Update weekly XP history
    day_of_week = date.today().weekday()
    weekly = data.get("weekly_xp_history", [0] * 7)
    if len(weekly) < 7:
        weekly = [0] * 7
    weekly[day_of_week] = data.get("xp", 0)
    data["weekly_xp_history"] = weekly


# =========== API ENDPOINTS ===========


@app.post("/api/process-text")
async def process_text(input_data: TextInput, request: Request):
    user_text = input_data.text.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Empty text input")

    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    conversation_history = user_conversations.setdefault(uid, [])

    try:
        client = get_groq_client()
        conversation_history.append({"role": "user", "content": user_text})
        if len(conversation_history) > 20:
            conversation_history[:] = conversation_history[-20:]

        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
                + "\n\n"
                + get_language_prompt(ud)
                + "\n\nIMPORTANT: Always respond ONLY with valid JSON in the exact format specified. No extra text outside the JSON.",
            },
            *conversation_history,
        ]

        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )

        raw_response = chat_completion.choices[0].message.content
        ai_data = parse_ai_response(raw_response)
        conversation_history.append({"role": "assistant", "content": raw_response})

        word_count = len(user_text.split())
        ud["words_spoken"] += word_count
        ud["accuracy_history"].append(ai_data.get("fluency_score", 5))
        if len(ud["accuracy_history"]) > 100:
            ud["accuracy_history"] = ud["accuracy_history"][-100:]
        ud["session_count"] += 1

        base_xp = (word_count * 2) + (ai_data.get("fluency_score", 5) * 3)
        xp_info = calculate_xp_with_multiplier(base_xp, ud)
        ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
        ud["level"], _, _ = calculate_level(ud["xp"])

        # Add new word to vocabulary bank
        new_word = ai_data.get("new_word")
        if new_word and new_word.get("word"):
            existing_words = [w["word"].lower() for w in ud.get("vocabulary_bank", [])]
            if new_word["word"].lower() not in existing_words:
                ud.setdefault("vocabulary_bank", []).append(
                    {
                        "word": new_word["word"],
                        "definition": new_word.get("definition", ""),
                        "example": new_word.get("example", ""),
                        "mastery": 0,
                        "added_at": str(datetime.now()),
                    }
                )

        # Save conversation for Replay feature
        today_str = str(date.today())
        saved_convos = ud.setdefault("saved_conversations", [])
        current_session = None
        for s in saved_convos:
            if s.get("date") == today_str and not s.get("completed"):
                current_session = s
                break
        if not current_session:
            current_session = {
                "id": f"{uid}_{int(datetime.now().timestamp())}",
                "date": today_str,
                "messages": [],
                "completed": False,
            }
            saved_convos.append(current_session)
        current_session["messages"].append({"role": "user", "text": user_text})
        current_session["messages"].append(
            {
                "role": "assistant",
                "text": ai_data.get("reply_text", ""),
                "correction": ai_data.get("correction"),
                "fluency_score": ai_data.get("fluency_score"),
                "new_word": ai_data.get("new_word"),
            }
        )
        fluency_scores = [
            m.get("fluency_score", 0)
            for m in current_session["messages"]
            if m.get("fluency_score")
        ]
        if fluency_scores:
            current_session["avg_fluency"] = sum(fluency_scores) / len(fluency_scores)
        ud["saved_conversations"] = saved_convos[-30:]

        update_streak(ud)
        new_badges = check_and_award_badges(ud)
        save_user_progress(uid, ud)

        ai_data["new_badges"] = new_badges
        ai_data["xp_earned"] = xp_info
        return ai_data

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


@app.post("/api/scenario-chat")
async def scenario_chat(input_data: ScenarioInput, request: Request):
    user_text = input_data.text.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Empty text input")

    scenario = SCENARIOS.get(input_data.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)

    try:
        client = get_groq_client()

        scenario_prompt = f"""
{scenario['system_context']}

The learner is practicing: {scenario['title']}
Context: {input_data.scenario_context}
Language focus: {get_language_prompt(ud)}

Evaluate their response and provide feedback in this JSON format:
{{
    "reply_text": "Your in-character response and feedback",
    "correction": {{
        "original": "Their exact words",
        "corrected": "Grammatically correct version",
        "explanation": "What was wrong",
        "better_alternative": "A more professional/natural way to say it"
    }},
    "fluency_score": 7,
    "scenario_tips": ["Specific tip 1 for this scenario", "Tip 2"],
    "new_word": {{
        "word": "A relevant vocabulary word",
        "definition": "Its meaning",
        "example": "Usage in a sentence"
    }}
}}
IMPORTANT: Respond ONLY with valid JSON.
"""
        messages = [
            {"role": "system", "content": scenario_prompt},
            {"role": "user", "content": user_text},
        ]

        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )

        raw_response = chat_completion.choices[0].message.content
        ai_data = parse_ai_response(raw_response)

        word_count = len(user_text.split())
        ud["words_spoken"] += word_count
        ud["accuracy_history"].append(ai_data.get("fluency_score", 5))
        ud["session_count"] += 1
        ud["scenarios_attempted"] = ud.get("scenarios_attempted", 0) + 1

        base_xp = (word_count * 2) + (ai_data.get("fluency_score", 5) * 4)
        xp_info = calculate_xp_with_multiplier(base_xp, ud)
        ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
        ud["level"], _, _ = calculate_level(ud["xp"])

        if input_data.scenario_id not in ud.get("completed_scenarios", []):
            ud.setdefault("completed_scenarios", []).append(input_data.scenario_id)

        new_word = ai_data.get("new_word")
        if new_word and new_word.get("word"):
            existing_words = [w["word"].lower() for w in ud.get("vocabulary_bank", [])]
            if new_word["word"].lower() not in existing_words:
                ud.setdefault("vocabulary_bank", []).append(
                    {
                        "word": new_word["word"],
                        "definition": new_word.get("definition", ""),
                        "example": new_word.get("example", ""),
                        "mastery": 0,
                        "added_at": str(datetime.now()),
                    }
                )

        update_streak(ud)
        new_badges = check_and_award_badges(ud)
        save_user_progress(uid, ud)
        ai_data["new_badges"] = new_badges
        ai_data["xp_earned"] = xp_info
        return ai_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


@app.post("/api/evaluate-tongue-twister")
async def evaluate_tongue_twister(input_data: TongueTwisterInput, request: Request):
    user_text = input_data.text.strip()
    target = input_data.target.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Empty text input")

    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)

    try:
        client = get_groq_client()
        prompt = f"""
You are a pronunciation coach. {get_language_prompt(ud)}
The learner tried to say this tongue twister:
TARGET: "{target}"
THEY SAID: "{user_text}"

Compare their attempt to the target. Evaluate accuracy, and provide feedback.
Respond in this JSON format:
{{
    "accuracy_score": 8,
    "feedback": "Your detailed feedback here",
    "tips": ["Pronunciation tip 1", "Tip 2"],
    "perfect_match": true/false
}}
IMPORTANT: Respond ONLY with valid JSON.
"""
        chat_completion = client.chat.completions.create(
            messages=[{"role": "system", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=512,
            response_format={"type": "json_object"},
        )

        raw_response = chat_completion.choices[0].message.content
        ai_data = parse_ai_response(raw_response)

        ud["tongue_twisters_completed"] = ud.get("tongue_twisters_completed", 0) + 1
        base_xp = 25
        xp_info = calculate_xp_with_multiplier(base_xp, ud)
        ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
        ud["level"], _, _ = calculate_level(ud["xp"])
        update_streak(ud)
        new_badges = check_and_award_badges(ud)
        save_user_progress(uid, ud)
        ai_data["new_badges"] = new_badges
        ai_data["xp_earned"] = xp_info
        return ai_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@app.post("/api/daily-challenge")
async def complete_daily_challenge(input_data: TextInput, request: Request):
    user_text = input_data.text.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Empty text input")

    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    today = str(date.today())
    challenge_index = date.today().toordinal() % len(DAILY_CHALLENGES)
    challenge = DAILY_CHALLENGES[challenge_index]

    try:
        client = get_groq_client()
        prompt = f"""
You are evaluating a daily communication challenge response.
{get_language_prompt(ud)}
CHALLENGE: {challenge['title']} - {challenge['description']}
USER'S RESPONSE: "{user_text}"

Evaluate their response and provide detailed feedback in this JSON format:
{{
    "reply_text": "Your encouraging feedback and evaluation",
    "score": 8,
    "strengths": ["Strength 1", "Strength 2"],
    "improvements": ["Area to improve 1", "Area 2"],
    "correction": {{
        "original": "Any sentence with an error",
        "corrected": "The corrected version",
        "explanation": "Why it was wrong",
        "better_alternative": "A more natural way to say it"
    }},
    "fluency_score": 8,
    "new_word": {{
        "word": "A relevant word",
        "definition": "Its meaning",
        "example": "Usage"
    }}
}}
IMPORTANT: Respond ONLY with valid JSON.
"""
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_text},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )

        raw_response = chat_completion.choices[0].message.content
        ai_data = parse_ai_response(raw_response)

        word_count = len(user_text.split())
        ud["words_spoken"] += word_count
        ud["accuracy_history"].append(ai_data.get("fluency_score", 5))
        ud["session_count"] += 1
        base_xp = challenge["xp_reward"]
        xp_info = calculate_xp_with_multiplier(base_xp, ud)
        ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
        ud["level"], _, _ = calculate_level(ud["xp"])
        ud["daily_challenge_completed"] = True
        ud["daily_challenge_date"] = today
        ud["daily_challenges_completed"] = ud.get("daily_challenges_completed", 0) + 1

        new_word = ai_data.get("new_word")
        if new_word and new_word.get("word"):
            existing_words = [w["word"].lower() for w in ud.get("vocabulary_bank", [])]
            if new_word["word"].lower() not in existing_words:
                ud.setdefault("vocabulary_bank", []).append(
                    {
                        "word": new_word["word"],
                        "definition": new_word.get("definition", ""),
                        "example": new_word.get("example", ""),
                        "mastery": 0,
                        "added_at": str(datetime.now()),
                    }
                )

        update_streak(ud)
        new_badges = check_and_award_badges(ud)
        save_user_progress(uid, ud)

        ai_data["xp_earned"] = xp_info
        ai_data["new_badges"] = new_badges
        return ai_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@app.get("/api/scenarios")
async def get_scenarios():
    return list(SCENARIOS.values())


@app.get("/api/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    scenario = SCENARIOS.get(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@app.get("/api/tongue-twisters")
async def get_tongue_twisters():
    return TONGUE_TWISTERS


@app.get("/api/daily-challenge-info")
async def get_daily_challenge(request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    today = str(date.today())
    challenge_index = date.today().toordinal() % len(DAILY_CHALLENGES)
    challenge = DAILY_CHALLENGES[challenge_index]
    completed = ud.get("daily_challenge_date") == today and ud.get(
        "daily_challenge_completed", False
    )
    return {**challenge, "completed": completed, "date": today}


@app.get("/api/daily-vocab")
async def get_daily_vocab(request: Request):
    """Returns today's 12 vocabulary words with full details."""
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    words = get_daily_vocab_words()
    today = str(date.today())
    # Track which words user has practiced today
    practiced_today = ud.get("daily_vocab_practiced", {})
    if ud.get("daily_vocab_date") != today:
        practiced_today = {}
        ud["daily_vocab_date"] = today
        ud["daily_vocab_practiced"] = practiced_today
        save_user_progress(uid, ud)

    for w in words:
        w["practiced"] = w["word"] in practiced_today

    return {
        "date": today,
        "words": words,
        "total": len(words),
        "practiced_count": len(practiced_today),
    }


@app.post("/api/vocab-practice")
async def practice_vocab_word(input_data: VocabPracticeInput, request: Request):
    """AI evaluates the user's sentence using a vocabulary word."""
    if not input_data.sentence.strip():
        raise HTTPException(status_code=400, detail="Empty sentence")

    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)

    try:
        client = get_groq_client()
        prompt = f"""
You are a vocabulary coach. {get_language_prompt(ud)}
The learner is practicing using a new word.

WORD: "{input_data.word}"
DEFINITION: "{input_data.definition}"
LEARNER'S SENTENCE: "{input_data.sentence}"

Evaluate if they used the word correctly and naturally. Provide feedback.

Respond in this JSON format:
{{
    "correct_usage": true/false,
    "score": 8,
    "feedback": "Your detailed feedback on their word usage",
    "better_sentence": "A more natural example sentence using the word",
    "common_mistakes": "Common mistakes people make with this word",
    "extra_tip": "An additional tip for remembering or using this word"
}}
IMPORTANT: Respond ONLY with valid JSON.
"""
        chat_completion = client.chat.completions.create(
            messages=[{"role": "system", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.6,
            max_tokens=512,
            response_format={"type": "json_object"},
        )

        raw_response = chat_completion.choices[0].message.content
        ai_data = parse_ai_response(raw_response)

        # Track practiced word
        today = str(date.today())
        if ud.get("daily_vocab_date") != today:
            ud["daily_vocab_practiced"] = {}
            ud["daily_vocab_date"] = today
        ud.setdefault("daily_vocab_practiced", {})[input_data.word] = True

        # Add word to vocabulary bank if not already there
        existing_words = [w["word"].lower() for w in ud.get("vocabulary_bank", [])]
        if input_data.word.lower() not in existing_words:
            ud.setdefault("vocabulary_bank", []).append(
                {
                    "word": input_data.word,
                    "definition": input_data.definition,
                    "example": input_data.sentence,
                    "mastery": 1 if ai_data.get("correct_usage") else 0,
                    "added_at": str(datetime.now()),
                }
            )

        # XP reward with multiplier
        base_xp = 15 if ai_data.get("correct_usage") else 5
        xp_info = calculate_xp_with_multiplier(base_xp, ud)
        ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
        ud["level"], _, _ = calculate_level(ud["xp"])
        update_streak(ud)
        new_badges = check_and_award_badges(ud)
        save_user_progress(uid, ud)

        ai_data["xp_earned"] = xp_info
        ai_data["new_badges"] = new_badges
        return ai_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@app.get("/api/stats")
async def get_stats(request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    avg_accuracy = 0
    if ud["accuracy_history"]:
        avg_accuracy = sum(ud["accuracy_history"]) / len(ud["accuracy_history"])

    level, xp_in_level, xp_for_next = calculate_level(ud.get("xp", 0))

    # Check if streak is at risk (haven't practiced today and have a streak)
    today = str(date.today())
    streak_at_risk = (
        ud.get("streak_days", 0) > 0 and ud.get("last_practice_date") != today
    )

    return {
        "words_spoken": ud["words_spoken"],
        "average_accuracy": round(avg_accuracy, 1),
        "session_count": ud["session_count"],
        "xp": ud.get("xp", 0),
        "level": level,
        "xp_in_level": xp_in_level,
        "xp_for_next_level": xp_for_next,
        "streak_days": ud.get("streak_days", 0),
        "total_practice_minutes": ud.get("total_practice_minutes", 0),
        "badges_count": len(ud.get("badges", [])),
        "vocabulary_count": len(ud.get("vocabulary_bank", [])),
        "scenarios_completed": len(ud.get("completed_scenarios", [])),
        "tongue_twisters_completed": ud.get("tongue_twisters_completed", 0),
        "skill_scores": ud.get("skill_scores", {}),
        "weekly_xp": ud.get("weekly_xp_history", [0] * 7),
        "streak_freeze_available": ud.get("streak_freeze_available", 0),
        "streak_at_risk": streak_at_risk,
        "max_streak": ud.get("max_streak", 0),
    }


@app.get("/api/vocabulary")
async def get_vocabulary(request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    return ud.get("vocabulary_bank", [])


@app.get("/api/badges")
async def get_badges(request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    return ud.get("badges", [])


@app.get("/api/progress")
async def get_progress(request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    level, xp_in_level, xp_for_next = calculate_level(ud.get("xp", 0))
    return {
        "xp": ud.get("xp", 0),
        "level": level,
        "xp_in_level": xp_in_level,
        "xp_for_next_level": xp_for_next,
        "streak_days": ud.get("streak_days", 0),
        "last_practice_date": ud.get("last_practice_date"),
        "badges": ud.get("badges", []),
        "accuracy_history": ud.get("accuracy_history", [])[-20:],
        "skill_scores": ud.get("skill_scores", {}),
        "weekly_xp": ud.get("weekly_xp_history", [0] * 7),
        "words_spoken": ud["words_spoken"],
        "session_count": ud["session_count"],
        "vocabulary_count": len(ud.get("vocabulary_bank", [])),
        "scenarios_completed": len(ud.get("completed_scenarios", [])),
        "total_scenarios": len(SCENARIOS),
    }


@app.post("/api/reset")
async def reset_session(request: Request):
    uid = get_user_id_from_request(request)
    user_conversations.pop(uid, None)
    return {"message": "Session reset successfully"}


@app.post("/api/reset-all")
async def reset_all_data(request: Request):
    uid = get_user_id_from_request(request)
    ud = get_default_user_data()
    save_user_progress(uid, ud)
    user_conversations.pop(uid, None)
    return {"message": "All data reset successfully"}


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "groq_configured": True}


# --- Streak Freeze Management ---
@app.get("/api/streak-info")
async def get_streak_info(request: Request):
    """Returns detailed streak info including freeze availability."""
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    today = str(date.today())
    streak_at_risk = (
        ud.get("streak_days", 0) > 0 and ud.get("last_practice_date") != today
    )
    return {
        "streak_days": ud.get("streak_days", 0),
        "max_streak": ud.get("max_streak", 0),
        "streak_freeze_available": ud.get("streak_freeze_available", 0),
        "streak_at_risk": streak_at_risk,
        "streak_freeze_used_dates": ud.get("streak_freeze_used_dates", []),
        "last_practice_date": ud.get("last_practice_date"),
    }


# --- Analytics Event Tracking Endpoint ---
class AnalyticsEvent(BaseModel):
    event: str
    properties: dict = {}
    timestamp: str = None


@app.post("/api/track-event")
async def track_event(event: AnalyticsEvent):
    """Receives analytics events from the frontend.
    In production, this would forward to an analytics service.
    For now, we just acknowledge receipt."""
    return {"status": "ok", "event": event.event}


# ============= AUTH ENDPOINTS (Simplified for Guest Mode) =============


class GuestSignup(BaseModel):
    username: str
    goals: List[str] = []
    preferred_level: str = "intermediate"
    daily_goal_minutes: int = 10
    learning_language: str = "english"


@app.post("/api/auth/guest-signup")
async def guest_signup(data: GuestSignup):
    """Create a guest user account (no email/password required)"""
    user_id = f"guest_{hashlib.md5(data.username.encode()).hexdigest()[:8]}"

    # Load or create per-user progress
    ud = load_user_progress(user_id)

    # Store user preferences
    user_prefs = {
        "user_id": user_id,
        "username": data.username,
        "goals": data.goals,
        "preferred_level": data.preferred_level,
        "daily_goal_minutes": data.daily_goal_minutes,
        "learning_language": data.learning_language,
        "created_at": datetime.utcnow().isoformat(),
        "is_guest": True,
    }

    # Save to per-user data
    ud["user_preferences"] = user_prefs
    save_user_progress(user_id, ud)

    return {
        "message": "Guest account created",
        "user": {
            "id": user_id,
            "username": data.username,
            "is_guest": True,
        },
        "access_token": f"guest_{user_id}",
        "token_type": "bearer",
    }


@app.post("/api/auth/logout")
async def logout():
    """Logout user - clear session data"""
    return {"message": "Logged out successfully"}


# ============= LEADERBOARD ENDPOINTS =============


@app.get("/api/leaderboard")
async def get_leaderboard(request: Request, limit: int = 10):
    """Get global leaderboard (simulated for demo)"""
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    current_user_stats = {
        "rank": 1,
        "username": ud.get("user_preferences", {}).get("username", "You"),
        "xp_total": ud.get("xp", 0),
        "level": calculate_level(ud.get("xp", 0))[0],
        "streak_days": ud.get("streak_days", 0),
    }

    # Mock other users for demo
    mock_users = [
        {
            "rank": 1,
            "username": "LanguageMaster",
            "xp_total": 15000,
            "level": 38,
            "streak_days": 45,
        },
        {
            "rank": 2,
            "username": "FluentSpeaker",
            "xp_total": 12500,
            "level": 35,
            "streak_days": 30,
        },
        {
            "rank": 3,
            "username": "WordNinja",
            "xp_total": 10000,
            "level": 31,
            "streak_days": 22,
        },
        {
            "rank": 4,
            "username": "VocabKing",
            "xp_total": 8500,
            "level": 29,
            "streak_days": 18,
        },
        {
            "rank": 5,
            "username": "ChatChampion",
            "xp_total": 7000,
            "level": 26,
            "streak_days": 15,
        },
        {
            "rank": 6,
            "username": "VoicePro",
            "xp_total": 5500,
            "level": 23,
            "streak_days": 12,
        },
        {
            "rank": 7,
            "username": "TalkMaster",
            "xp_total": 4000,
            "level": 20,
            "streak_days": 10,
        },
        {
            "rank": 8,
            "username": "PronouncePro",
            "xp_total": 3000,
            "level": 17,
            "streak_days": 8,
        },
        {
            "rank": 9,
            "username": "FluentLearner",
            "xp_total": 2000,
            "level": 14,
            "streak_days": 5,
        },
        {
            "rank": 10,
            "username": "NewSpeaker",
            "xp_total": 1000,
            "level": 10,
            "streak_days": 3,
        },
    ]

    # Calculate current user's actual rank
    user_xp = ud.get("xp", 0)
    actual_rank = 1
    for u in mock_users:
        if u["xp_total"] > user_xp:
            actual_rank += 1

    # Insert current user in correct position
    current_user_entry = {
        "rank": actual_rank,
        "username": ud.get("user_preferences", {}).get("username", "You"),
        "xp_total": user_xp,
        "level": calculate_level(user_xp)[0],
        "streak_days": ud.get("streak_days", 0),
        "is_current_user": True,
    }

    total_users = 1000 + actual_rank  # Mock total users

    return {
        "leaderboard": mock_users[:limit],
        "current_user": current_user_entry,
        "rank": {
            "rank": actual_rank,
            "total_users": total_users,
            "percentile": max(0, 100 - (actual_rank / total_users * 100)),
        },
    }


# ============= MULTI-LANGUAGE SUPPORT =============

# Available languages
LANGUAGES = {
    "english": {
        "code": "en",
        "name": "English",
        "flag": "🇺🇸",
        "native": "English",
        "system_prompt_suffix": "You are an English language tutor.",
    },
    "spanish": {
        "code": "es",
        "name": "Spanish",
        "flag": "🇪🇸",
        "native": "Español",
        "system_prompt_suffix": "Eres un tutor de español. Help the learner practice Spanish conversation.",
    },
    "french": {
        "code": "fr",
        "name": "French",
        "flag": "🇫🇷",
        "native": "Français",
        "system_prompt_suffix": "Vous êtes un tuteur de français. Help the learner practice French conversation.",
    },
    "german": {
        "code": "de",
        "name": "German",
        "flag": "🇩🇪",
        "native": "Deutsch",
        "system_prompt_suffix": "Du bist ein Deutschlehrer. Help the learner practice German conversation.",
    },
    "japanese": {
        "code": "ja",
        "name": "Japanese",
        "flag": "🇯🇵",
        "native": "日本語",
        "system_prompt_suffix": "あなたは日本語の先生です。Help the learner practice Japanese conversation and learn hiragana/katakana.",
    },
    "mandarin": {
        "code": "zh",
        "name": "Mandarin Chinese",
        "flag": "🇨🇳",
        "native": "中文",
        "system_prompt_suffix": "你是一位中文老师。Help the learner practice Mandarin Chinese conversation.",
    },
    "korean": {
        "code": "ko",
        "name": "Korean",
        "flag": "🇰🇷",
        "native": "한국어",
        "system_prompt_suffix": "당신은 한국어 선생님입니다. Help the learner practice Korean conversation and learn Hangul.",
    },
    "portuguese": {
        "code": "pt",
        "name": "Portuguese",
        "flag": "🇧🇷",
        "native": "Português",
        "system_prompt_suffix": "Você é um professor de português. Help the learner practice Portuguese conversation.",
    },
    "hindi": {
        "code": "hi",
        "name": "Hindi",
        "flag": "🇮🇳",
        "native": "हिंदी",
        "system_prompt_suffix": "आप एक हिंदी शिक्षक हैं। Help the learner practice Hindi conversation and learn Devanagari script.",
    },
    "arabic": {
        "code": "ar",
        "name": "Arabic",
        "flag": "🇸🇦",
        "native": "العربية",
        "system_prompt_suffix": "أنت معلم لغة عربية. Help the learner practice Arabic conversation and learn the Arabic script.",
    },
}


@app.get("/api/languages")
async def get_available_languages(request: Request):
    """Get list of available languages for learning"""
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    return {
        "languages": [
            {
                "code": code,
                "name": lang["name"],
                "flag": lang["flag"],
                "native": lang["native"],
            }
            for code, lang in LANGUAGES.items()
        ],
        "current_language": ud.get("user_preferences", {}).get(
            "learning_language", "english"
        ),
    }


@app.post("/api/set-language")
async def set_learning_language(request: Request, language: str):
    """Set the user's current learning language"""
    if language not in LANGUAGES:
        raise HTTPException(
            status_code=400, detail=f"Language '{language}' not supported"
        )

    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    if "user_preferences" not in ud:
        ud["user_preferences"] = {}
    ud["user_preferences"]["learning_language"] = language
    save_user_progress(uid, ud)

    return {
        "message": f"Language set to {LANGUAGES[language]['name']}",
        "language": LANGUAGES[language],
    }


@app.get("/api/daily-goal")
async def get_daily_goal(request: Request):
    """Get today's daily goal progress"""
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    today = str(date.today())
    daily_goal = ud.get("user_preferences", {}).get("daily_goal_minutes", 10)

    # Calculate sessions today (simplified)
    sessions_today = 1 if ud.get("last_practice_date") == today else 0

    return {
        "date": today,
        "target_minutes": daily_goal,
        "completed_minutes": sessions_today * 5,  # Approx 5 min per session
        "sessions_completed": sessions_today,
        "sessions_target": max(1, daily_goal // 5),
        "is_completed": sessions_today >= max(1, daily_goal // 5),
    }


# ============= MULTI-LANGUAGE TRANSLATION ENDPOINT =============


class TranslateInput(BaseModel):
    text: str
    source_language: str = "auto"


@app.post("/api/translate-input")
async def translate_input(input_data: TranslateInput, request: Request):
    """Detect language, translate to English, provide grammar/pronunciation tips."""
    user_text = input_data.text.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Empty text input")

    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)

    try:
        client = get_groq_client()
        prompt = f"""You are a multilingual language expert and translation assistant.
The user has provided text that may be in any language.

USER'S TEXT: "{user_text}"
HINT (user-selected source language): "{input_data.source_language}" (may be "auto" for auto-detect)

Analyze this text and provide:
1. Detect the language it's written in
2. Translate it to English (if already English, just provide the corrected version)
3. Provide grammar corrections for the original text
4. Give pronunciation guidance for the English translation
5. Suggest related vocabulary words

Respond in this JSON format:
{{
    "detected_language": "spanish",
    "detected_language_name": "Spanish",
    "confidence": 0.95,
    "original_text": "The exact original text",
    "english_translation": "The English translation",
    "corrected_original": "Grammar-corrected version in original language",
    "corrections": [
        {{
            "original": "incorrect phrase",
            "corrected": "correct phrase",
            "explanation": "Why this correction was made"
        }}
    ],
    "pronunciation_guide": {{
        "ipa": "IPA transcription of the English translation",
        "tips": ["Pronunciation tip 1", "Pronunciation tip 2"],
        "difficult_sounds": ["th", "r"]
    }},
    "vocabulary_suggestions": [
        {{
            "word": "relevant English word",
            "definition": "its meaning",
            "example": "example usage in a sentence",
            "in_source_language": "translation back to source language"
        }}
    ],
    "cultural_note": "Any relevant cultural context about the phrase or language"
}}
IMPORTANT: Respond ONLY with valid JSON.
"""
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_text},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )

        raw_response = chat_completion.choices[0].message.content
        ai_data = parse_ai_response(raw_response)

        # Track translation usage
        ud["translations_completed"] = ud.get("translations_completed", 0) + 1

        # Add vocabulary suggestions to bank
        vocab_suggestions = ai_data.get("vocabulary_suggestions", [])
        existing_words = [w["word"].lower() for w in ud.get("vocabulary_bank", [])]
        for v in vocab_suggestions[:3]:  # Max 3 new words per translation
            if v.get("word") and v["word"].lower() not in existing_words:
                ud.setdefault("vocabulary_bank", []).append(
                    {
                        "word": v["word"],
                        "definition": v.get("definition", ""),
                        "example": v.get("example", ""),
                        "mastery": 0,
                        "added_at": str(datetime.now()),
                    }
                )
                existing_words.append(v["word"].lower())

        # XP for using translator
        base_xp = 10
        xp_info = calculate_xp_with_multiplier(base_xp, ud)
        ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
        ud["level"], _, _ = calculate_level(ud["xp"])

        update_streak(ud)
        new_badges = check_and_award_badges(ud)
        save_user_progress(uid, ud)

        ai_data["xp_earned"] = xp_info
        ai_data["new_badges"] = new_badges
        return ai_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 1 – Bottom Line Up Front (BLUF) Generator
# ─────────────────────────────────────────────────────────────────────────────
class BLUFInput(BaseModel):
    text: str


@app.post("/api/bluf-generator")
async def bluf_generator(payload: BLUFInput, request: Request):
    """Rewrites a long paragraph into 2-3 concise bullet points."""
    if not payload.text or len(payload.text.strip()) < 20:
        raise HTTPException(
            status_code=400,
            detail="Please provide a paragraph of at least 20 characters.",
        )
    try:
        client = get_groq_client()
        system_prompt = (
            "You are a military-style communication expert who specialises in 'Bottom Line Up Front' (BLUF) writing. "
            "Your job is to strip every rambling paragraph down to its absolute core message. "
            "Return EXACTLY 2-3 bullet points (no more, no less). "
            "Each bullet must be under 20 words, start with a strong verb or key noun, and contain zero filler words. "
            "Format your response as a JSON object: "
            '{"bullets": ["bullet 1", "bullet 2", "bullet 3"], "word_reduction": "<original_word_count> → <bluf_word_count>", '
            '"key_action": "<the single most important action or takeaway>"}'
        )
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Convert this to BLUF format:\n\n{payload.text}",
                },
            ],
            temperature=0.3,
            max_tokens=400,
        )
        raw = resp.choices[0].message.content.strip()
        # Try to parse JSON; if it fails, return raw
        try:
            import json as _json

            data = _json.loads(raw)
        except Exception:
            # Fallback – extract bullets manually
            lines = [
                l.strip().lstrip("•-*").strip()
                for l in raw.split("\n")
                if l.strip() and l.strip()[0] in "•-*1234567890"
            ]
            data = {"bullets": lines[:3], "word_reduction": "", "key_action": ""}
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BLUF generation error: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 2 – Tone & Intent Calibrator
# ─────────────────────────────────────────────────────────────────────────────
class ToneCalibratorInput(BaseModel):
    text: str
    audience: str  # "Boss" | "Client" | "Date" | "Colleague" | "Friend" | "Investor"


@app.post("/api/tone-calibrator")
async def tone_calibrator(payload: ToneCalibratorInput, request: Request):
    """Analyses a draft message for tone/clarity and returns a Clarity Score 0-100."""
    if not payload.text or len(payload.text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Please provide a message of at least 10 characters.",
        )
    try:
        client = get_groq_client()
        system_prompt = (
            "You are an expert communication coach specialising in tone analysis. "
            f"The user is writing a message for audience: '{payload.audience}'. "
            "Analyse the draft for: tone appropriateness, clarity, directness, emotional charge, and intent alignment. "
            "Return ONLY a valid JSON object with this exact schema (no markdown, no extra text):\n"
            '{"clarity_score": <integer 0-100>, '
            '"tone_label": "<single adjective e.g. Aggressive / Passive / Professional / Casual / Vague / Warm>", '
            '"audience_fit": "<Good Fit | Acceptable | Poor Fit>", '
            '"issues": ["<issue 1>", "<issue 2>"], '
            '"strengths": ["<strength 1>", "<strength 2>"], '
            '"rewritten_suggestion": "<improved version of the message in under 60 words>", '
            '"one_line_verdict": "<one sentence verdict e.g. This sounds too aggressive for a client>"}'
        )
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": payload.text},
            ],
            temperature=0.4,
            max_tokens=600,
        )
        raw = resp.choices[0].message.content.strip()
        try:
            import json as _json

            data = _json.loads(raw)
        except Exception:
            data = {
                "clarity_score": 50,
                "tone_label": "Unknown",
                "audience_fit": "Unknown",
                "issues": [],
                "strengths": [],
                "rewritten_suggestion": raw,
                "one_line_verdict": raw,
            }
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tone calibration error: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# FEATURE 3 – Active Listening Simulator
# ─────────────────────────────────────────────────────────────────────────────
# Per-session conversation history for the simulator (in-memory, keyed by user+role)
_listening_sessions: Dict[str, List[dict]] = {}


class ListeningSimulatorStartInput(BaseModel):
    role: str  # e.g. "Angry Customer", "Upset Partner", "Difficult Employee"


class ListeningSimulatorReplyInput(BaseModel):
    role: str
    user_reply: str
    session_id: str


@app.post("/api/listening-simulator/start")
async def listening_simulator_start(
    payload: ListeningSimulatorStartInput, request: Request
):
    """Starts a new Active Listening Simulator session. AI opens as the chosen role."""
    uid = get_user_id_from_request(request)
    session_id = (
        f"{uid}_{payload.role.replace(' ', '_')}_{int(datetime.now().timestamp())}"
    )
    system_prompt = (
        f"You are roleplaying as: {payload.role}. "
        "Begin with an emotionally charged opening statement that presents a real problem or grievance. "
        "Keep it to 2-3 sentences. Stay fully in character. Do NOT break character."
    )
    try:
        client = get_groq_client()
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Begin the scenario."},
            ],
            temperature=0.8,
            max_tokens=200,
        )
        opening = resp.choices[0].message.content.strip()
        _listening_sessions[session_id] = [
            {
                "role": "system",
                "content": (
                    f"You are roleplaying as: {payload.role}. Stay in character throughout. "
                    "Respond naturally — escalate if the user is dismissive, de-escalate if they show genuine empathy and a solution. "
                    "After the user's THIRD response, break character ONLY to give feedback on whether they conveyed empathy and a clear solution. "
                    "Feedback format: FEEDBACK: <your critique>. Ignore grammar — focus only on empathy and solution quality."
                ),
            },
            {"role": "assistant", "content": opening},
        ]
        return {
            "session_id": session_id,
            "opening_message": opening,
            "role": payload.role,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulator start error: {str(e)}")


@app.post("/api/listening-simulator/reply")
async def listening_simulator_reply(
    payload: ListeningSimulatorReplyInput, request: Request
):
    """Send a user response in the Active Listening Simulator. AI continues the roleplay or gives feedback."""
    if payload.session_id not in _listening_sessions:
        raise HTTPException(
            status_code=404, detail="Session not found. Please start a new session."
        )
    history = _listening_sessions[payload.session_id]
    history.append({"role": "user", "content": payload.user_reply})
    try:
        client = get_groq_client()
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=history,
            temperature=0.7,
            max_tokens=400,
        )
        ai_reply = resp.choices[0].message.content.strip()
        history.append({"role": "assistant", "content": ai_reply})
        _listening_sessions[payload.session_id] = history

        # Detect if this is a feedback message
        is_feedback = ai_reply.upper().startswith("FEEDBACK:")
        user_turn = sum(1 for m in history if m["role"] == "user")

        return {
            "ai_reply": ai_reply,
            "is_feedback": is_feedback,
            "turn_number": user_turn,
            "session_complete": is_feedback,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulator reply error: {str(e)}")


@app.delete("/api/listening-simulator/session/{session_id}")
async def listening_simulator_clear(session_id: str):
    """Clear a simulator session."""
    _listening_sessions.pop(session_id, None)
    return {"status": "cleared"}


# ─── FILLER WORD TRACKER ─────────────────────────────────────────────────────

FILLER_WORDS_LIST = [
    "um",
    "uh",
    "like",
    "you know",
    "basically",
    "actually",
    "literally",
    "sort of",
    "kind of",
    "i mean",
    "right",
    "honestly",
    "obviously",
    "totally",
    "anyway",
]


@app.post("/api/analyze-fillers")
async def analyze_fillers(input_data: TextInput, request: Request):
    text = input_data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)

    text_lower = text.lower()
    words = text.split()
    total_words = len(words)

    fillers = {}
    for filler in FILLER_WORDS_LIST:
        if " " in filler:
            count = text_lower.count(filler)
        else:
            count = len(re.findall(r"\b" + re.escape(filler) + r"\b", text_lower))
        if count > 0:
            fillers[filler] = count

    filler_count = sum(fillers.values())
    score = max(0, 100 - int((filler_count / max(total_words, 1)) * 200))

    highlighted = text
    for filler in sorted(fillers.keys(), key=len, reverse=True):
        pattern = re.compile(r"(?<!\w)" + re.escape(filler) + r"(?!\w)", re.IGNORECASE)
        highlighted = pattern.sub(
            lambda m: f'<span style="background:rgba(239,68,68,0.25);border-radius:4px;padding:1px 4px;color:#ef4444;font-weight:700">{m.group()}</span>',
            highlighted,
        )

    suggestions = []
    if filler_count > 0:
        try:
            client = get_groq_client()
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": f'The user spoke {total_words} words with these filler words: {json.dumps(fillers)}. Give 3 specific, actionable tips to reduce fillers. Be encouraging. Respond ONLY with JSON: {{"suggestions": ["tip1", "tip2", "tip3"]}}',
                    },
                    {"role": "user", "content": text},
                ],
                temperature=0.7,
                max_tokens=300,
                response_format={"type": "json_object"},
            )
            suggestions = parse_ai_response(resp.choices[0].message.content).get(
                "suggestions", []
            )
        except Exception:
            suggestions = [
                "Pause and breathe instead of filling silence with 'um'",
                "Practice speaking at a slower pace",
                "Record yourself to identify your most common fillers",
            ]

    result = {
        "date": str(datetime.now()),
        "total_words": total_words,
        "filler_count": filler_count,
        "fillers": fillers,
        "filler_free_score": score,
        "highlighted_text": highlighted,
        "suggestions": suggestions,
    }

    ud.setdefault("filler_history", []).append(
        {
            "date": str(date.today()),
            "total_words": total_words,
            "filler_count": filler_count,
            "filler_free_score": score,
        }
    )
    ud["filler_history"] = ud["filler_history"][-50:]

    base_xp = max(10, total_words)
    xp_info = calculate_xp_with_multiplier(base_xp, ud)
    ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
    ud["level"], _, _ = calculate_level(ud["xp"])
    update_streak(ud)
    new_badges = check_and_award_badges(ud)
    save_user_progress(uid, ud)
    result["new_badges"] = new_badges
    result["xp_earned"] = xp_info
    return result


@app.get("/api/filler-stats")
async def get_filler_stats(request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    return {"history": ud.get("filler_history", [])}


# ─── PLACEMENT TEST ─────────────────────────────────────────────────────────

PLACEMENT_QUESTIONS = [
    {
        "id": 1,
        "type": "Grammar",
        "difficulty": "A1-A2",
        "prompt": "Introduce yourself in 2-3 sentences. Include your name, where you're from, and what you do.",
    },
    {
        "id": 2,
        "type": "Vocabulary",
        "difficulty": "A2-B1",
        "prompt": "Describe your daily routine from morning to evening. Use at least 5 different verbs.",
    },
    {
        "id": 3,
        "type": "Grammar & Style",
        "difficulty": "B1-B2",
        "prompt": "Write a short paragraph about a memorable experience you had. Use past tenses and descriptive language.",
    },
    {
        "id": 4,
        "type": "Argumentation",
        "difficulty": "B2-C1",
        "prompt": "Do you think technology has made our lives better or worse? Write a balanced argument with at least two points for each side.",
    },
    {
        "id": 5,
        "type": "Advanced Expression",
        "difficulty": "C1-C2",
        "prompt": "Explain a complex concept from your field of study or work to someone who knows nothing about it. Use analogies and precise vocabulary.",
    },
]


@app.get("/api/placement-test/start")
async def placement_test_start(request: Request):
    return {"questions": PLACEMENT_QUESTIONS}


@app.post("/api/placement-test/submit")
async def placement_test_submit(input_data: PlacementSubmission, request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    answers_text = "\n\n".join(
        [
            f"Question {a.question_id} ({PLACEMENT_QUESTIONS[a.question_id - 1]['type']}, {PLACEMENT_QUESTIONS[a.question_id - 1]['difficulty']}):\n{a.answer}"
            for a in input_data.answers
            if 1 <= a.question_id <= len(PLACEMENT_QUESTIONS)
        ]
    )
    try:
        client = get_groq_client()
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """You are a CEFR language assessment expert. Evaluate the student's answers to determine their English proficiency level.
Analyze: grammar accuracy, vocabulary range, sentence complexity, coherence, and task completion.
Respond ONLY with JSON:
{
    "cefr_level": "B1",
    "overall_score": 62,
    "strengths": ["Good basic grammar", "Clear communication"],
    "weaknesses": ["Limited vocabulary range", "Simple sentence structures"],
    "recommendations": ["Practice using complex sentences", "Read more academic texts"]
}
CEFR levels: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper Intermediate), C1 (Advanced), C2 (Proficient)""",
                },
                {"role": "user", "content": answers_text},
            ],
            temperature=0.3,
            max_tokens=500,
            response_format={"type": "json_object"},
        )
        result = parse_ai_response(resp.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assessment error: {str(e)}")

    result["date"] = str(date.today())
    ud["cefr_level"] = result.get("cefr_level", "B1")
    ud["placement_completed"] = True

    base_xp = 100
    xp_info = calculate_xp_with_multiplier(base_xp, ud)
    ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
    ud["level"], _, _ = calculate_level(ud["xp"])
    update_streak(ud)
    new_badges = check_and_award_badges(ud)
    save_user_progress(uid, ud)
    result["new_badges"] = new_badges
    result["xp_earned"] = xp_info
    return result


@app.get("/api/placement-test/result")
async def placement_test_result(request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    return {
        "cefr_level": ud.get("cefr_level"),
        "placement_completed": ud.get("placement_completed", False),
        "date": ud.get("placement_date"),
    }


# ─── GRAMMAR LESSONS ────────────────────────────────────────────────────────


@app.post("/api/grammar-lesson/content")
async def grammar_lesson_content(input_data: GrammarLessonInput, request: Request):
    try:
        client = get_groq_client()
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"""Create a concise grammar micro-lesson for the topic: "{input_data.topic_id}".
Respond ONLY with JSON:
{{
    "explanation": "Clear 3-4 sentence explanation of the rule",
    "examples": ["Example 1 with the rule applied correctly", "Example 2", "Example 3"],
    "common_mistakes": ["Wrong → Right (explanation)", "Another common mistake"],
    "exercises": ["Write a sentence using...", "Correct this sentence: ...", "Fill in the blank: ..."]
}}""",
                }
            ],
            temperature=0.7,
            max_tokens=600,
            response_format={"type": "json_object"},
        )
        return parse_ai_response(resp.choices[0].message.content)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Lesson generation error: {str(e)}"
        )


@app.post("/api/grammar-lesson/practice")
async def grammar_lesson_practice(input_data: GrammarPracticeInput, request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    try:
        client = get_groq_client()
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"""Evaluate this grammar exercise response.
Topic: {input_data.topic_id}
Exercise: {input_data.exercise}
Respond ONLY with JSON:
{{
    "correct": true,
    "explanation": "Why the answer is correct/incorrect",
    "corrected_sentence": "The corrected version if wrong, or the original if correct",
    "tip": "A helpful grammar tip related to this topic"
}}""",
                },
                {"role": "user", "content": input_data.sentence},
            ],
            temperature=0.3,
            max_tokens=300,
            response_format={"type": "json_object"},
        )
        result = parse_ai_response(resp.choices[0].message.content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Practice evaluation error: {str(e)}",
        )

    completed = ud.setdefault("grammar_lessons_completed", [])
    if input_data.topic_id not in completed:
        completed.append(input_data.topic_id)

    base_xp = 25
    xp_info = calculate_xp_with_multiplier(base_xp, ud)
    ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
    ud["level"], _, _ = calculate_level(ud["xp"])
    update_streak(ud)
    new_badges = check_and_award_badges(ud)
    save_user_progress(uid, ud)
    result["new_badges"] = new_badges
    result["xp_earned"] = xp_info
    return result


@app.get("/api/grammar-lessons/progress")
async def grammar_lessons_progress(request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    return {"completed": ud.get("grammar_lessons_completed", [])}


# ─── IDIOM & COLLOCATION ENGINE ─────────────────────────────────────────────

IDIOMS_POOL = [
    {
        "id": 1,
        "idiom": "Break the ice",
        "meaning": "Start a conversation in a social setting",
        "example": "He told a joke to break the ice at the meeting.",
        "category": "Relationships",
    },
    {
        "id": 2,
        "idiom": "Hit the nail on the head",
        "meaning": "Describe exactly what is right",
        "example": "You hit the nail on the head with that analysis.",
        "category": "Work",
    },
    {
        "id": 3,
        "idiom": "Bite the bullet",
        "meaning": "Face a difficult situation bravely",
        "example": "I bit the bullet and asked for a raise.",
        "category": "Emotions",
    },
    {
        "id": 4,
        "idiom": "Cost an arm and a leg",
        "meaning": "Be very expensive",
        "example": "That new laptop cost an arm and a leg.",
        "category": "Daily Life",
    },
    {
        "id": 5,
        "idiom": "The ball is in your court",
        "meaning": "It's your turn to make a decision",
        "example": "I've made my offer — the ball is in your court.",
        "category": "Negotiation",
    },
    {
        "id": 6,
        "idiom": "Burning the midnight oil",
        "meaning": "Working late into the night",
        "example": "She's been burning the midnight oil to finish her thesis.",
        "category": "Academic",
    },
    {
        "id": 7,
        "idiom": "Get the ball rolling",
        "meaning": "Start something",
        "example": "Let's get the ball rolling on this project.",
        "category": "Work",
    },
    {
        "id": 8,
        "idiom": "See eye to eye",
        "meaning": "Agree with someone",
        "example": "We don't always see eye to eye, but we respect each other.",
        "category": "Relationships",
    },
    {
        "id": 9,
        "idiom": "A piece of cake",
        "meaning": "Very easy",
        "example": "The exam was a piece of cake.",
        "category": "Academic",
    },
    {
        "id": 10,
        "idiom": "On the same page",
        "meaning": "In agreement or having the same understanding",
        "example": "Let's make sure we're on the same page before the meeting.",
        "category": "Work",
    },
    {
        "id": 11,
        "idiom": "Under the weather",
        "meaning": "Feeling ill or unwell",
        "example": "I'm a bit under the weather today.",
        "category": "Daily Life",
    },
    {
        "id": 12,
        "idiom": "Beat around the bush",
        "meaning": "Avoid talking about something directly",
        "example": "Stop beating around the bush and tell me what happened.",
        "category": "Relationships",
    },
    {
        "id": 13,
        "idiom": "Think outside the box",
        "meaning": "Think creatively or unconventionally",
        "example": "We need to think outside the box for this campaign.",
        "category": "Work",
    },
    {
        "id": 14,
        "idiom": "Let the cat out of the bag",
        "meaning": "Reveal a secret accidentally",
        "example": "She let the cat out of the bag about the surprise party.",
        "category": "Daily Life",
    },
    {
        "id": 15,
        "idiom": "A blessing in disguise",
        "meaning": "Something bad that turns out good",
        "example": "Losing that job was a blessing in disguise.",
        "category": "Emotions",
    },
    {
        "id": 16,
        "idiom": "Cut to the chase",
        "meaning": "Get to the point",
        "example": "Let me cut to the chase — we need more funding.",
        "category": "Negotiation",
    },
    {
        "id": 17,
        "idiom": "Go the extra mile",
        "meaning": "Do more than expected",
        "example": "She always goes the extra mile for her students.",
        "category": "Work",
    },
    {
        "id": 18,
        "idiom": "Hit the books",
        "meaning": "Study intensively",
        "example": "I need to hit the books for tomorrow's exam.",
        "category": "Academic",
    },
    {
        "id": 19,
        "idiom": "Once in a blue moon",
        "meaning": "Very rarely",
        "example": "He only calls once in a blue moon.",
        "category": "Daily Life",
    },
    {
        "id": 20,
        "idiom": "Spill the beans",
        "meaning": "Reveal secret information",
        "example": "Who spilled the beans about the merger?",
        "category": "Negotiation",
    },
    {
        "id": 21,
        "idiom": "Back to the drawing board",
        "meaning": "Start over with a new plan",
        "example": "The prototype failed, so it's back to the drawing board.",
        "category": "Work",
    },
    {
        "id": 22,
        "idiom": "Heart of gold",
        "meaning": "Very kind and generous person",
        "example": "My grandmother has a heart of gold.",
        "category": "Relationships",
    },
    {
        "id": 23,
        "idiom": "Pulling someone's leg",
        "meaning": "Joking with someone",
        "example": "I was just pulling your leg — don't take it seriously!",
        "category": "Emotions",
    },
    {
        "id": 24,
        "idiom": "The best of both worlds",
        "meaning": "Enjoying the advantages of two different things",
        "example": "Working from home gives me the best of both worlds.",
        "category": "Daily Life",
    },
]


def get_daily_idioms():
    """Select 6 idioms for today using date-based seeding."""
    seed = int(date.today().strftime("%Y%m%d"))
    rng = random.Random(seed)
    return rng.sample(IDIOMS_POOL, min(6, len(IDIOMS_POOL)))


@app.get("/api/idioms/daily")
async def get_daily_idioms_endpoint(request: Request):
    return {"idioms": get_daily_idioms()}


@app.post("/api/idioms/practice")
async def idiom_practice(input_data: IdiomPracticeInput, request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    try:
        client = get_groq_client()
        mode_prompt = {
            "guess": f'The idiom is "{input_data.idiom}". The true meaning is: "{input_data.meaning}". The student guessed the meaning. Evaluate if their guess captures the correct meaning.',
            "fill": f'The idiom is "{input_data.idiom}" (meaning: {input_data.meaning}). The student tried to use it in a sentence. Evaluate if it\'s used correctly.',
            "use": f'The idiom is "{input_data.idiom}" (meaning: {input_data.meaning}). The student wrote a sentence using this idiom. Evaluate naturalness and correctness.',
        }.get(
            input_data.mode,
            "Evaluate the student's understanding of the idiom.",
        )
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"""{mode_prompt}
Respond ONLY with JSON:
{{
    "correct": true,
    "feedback": "Detailed feedback on their answer",
    "example_usage": "A natural example sentence using the idiom",
    "usage_tip": "When to use this idiom in real conversations"
}}""",
                },
                {"role": "user", "content": input_data.answer},
            ],
            temperature=0.5,
            max_tokens=300,
            response_format={"type": "json_object"},
        )
        result = parse_ai_response(resp.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Idiom practice error: {str(e)}")

    learned = ud.setdefault("idioms_learned", [])
    if result.get("correct") and not any(
        l.get("idiom") == input_data.idiom for l in learned
    ):
        learned.append(
            {
                "idiom": input_data.idiom,
                "meaning": input_data.meaning,
                "category": "",
                "learned_at": str(datetime.now()),
            }
        )

    base_xp = 20
    xp_info = calculate_xp_with_multiplier(base_xp, ud)
    ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
    ud["level"], _, _ = calculate_level(ud["xp"])
    update_streak(ud)
    new_badges = check_and_award_badges(ud)
    save_user_progress(uid, ud)
    result["new_badges"] = new_badges
    return result


@app.get("/api/idioms/bank")
async def idioms_bank(request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    return {"idioms_learned": ud.get("idioms_learned", [])}


# ─── SRS VOCABULARY REVIEW ──────────────────────────────────────────────────


@app.get("/api/srs/review-queue")
async def srs_review_queue(request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    vocab = ud.get("vocabulary_bank", [])
    today = str(date.today())
    due = []
    mastered = 0
    for w in vocab:
        if "srs_interval" not in w:
            w["srs_interval"] = 1
            w["srs_ease"] = 2.5
            w["srs_next_review"] = today
            w["srs_reviews"] = 0
        if w.get("srs_next_review", today) <= today:
            due.append(w)
        if w.get("srs_interval", 1) >= 21:
            mastered += 1
    due.sort(key=lambda w: w.get("srs_next_review", today))
    return {
        "words": due[:20],
        "stats": {"total": len(vocab), "due": len(due), "mastered": mastered},
    }


@app.post("/api/srs/review")
async def srs_review(input_data: SRSReviewInput, request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    vocab = ud.get("vocabulary_bank", [])
    word_entry = None
    for w in vocab:
        if w["word"].lower() == input_data.word.lower():
            word_entry = w
            break
    if not word_entry:
        raise HTTPException(status_code=404, detail="Word not found in vocabulary bank")

    from datetime import timedelta

    interval = word_entry.get("srs_interval", 1)
    ease = word_entry.get("srs_ease", 2.5)
    reviews = word_entry.get("srs_reviews", 0)

    if input_data.rating == "again":
        interval = 1
        ease = max(1.3, ease - 0.2)
    elif input_data.rating == "hard":
        interval = max(1, int(interval * 1.2))
        ease = max(1.3, ease - 0.15)
    elif input_data.rating == "good":
        interval = max(1, int(interval * ease))
    elif input_data.rating == "easy":
        interval = max(1, int(interval * ease * 1.3))
        ease = ease + 0.15

    next_review = date.today() + timedelta(days=interval)
    word_entry["srs_interval"] = interval
    word_entry["srs_ease"] = round(ease, 2)
    word_entry["srs_next_review"] = str(next_review)
    word_entry["srs_reviews"] = reviews + 1
    if interval >= 21:
        word_entry["mastery"] = min(5, word_entry.get("mastery", 0) + 1)

    base_xp = 5
    xp_info = calculate_xp_with_multiplier(base_xp, ud)
    ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
    ud["level"], _, _ = calculate_level(ud["xp"])
    new_badges = check_and_award_badges(ud)
    save_user_progress(uid, ud)
    return {
        "next_review": str(next_review),
        "new_interval": interval,
        "message": f"Next review in {interval} day{'s' if interval != 1 else ''}",
        "new_badges": new_badges,
    }


# ─── WRITING WORKSHOP ───────────────────────────────────────────────────────

WRITING_PROMPT_TEMPLATES = {
    "formal_email": [
        "Write a formal email to your professor requesting an extension on your assignment deadline.",
        "Write a professional email declining a job offer while maintaining a positive relationship.",
        "Write a formal email to a company's customer service about a billing error.",
        "Write an email to your team announcing a change in project timeline.",
    ],
    "linkedin_message": [
        "Write a LinkedIn message to someone you admire in your industry, introducing yourself.",
        "Write a connection request to a recruiter at a company you'd like to work at.",
        "Write a LinkedIn post celebrating a professional achievement.",
    ],
    "essay_paragraph": [
        "Write a paragraph arguing why remote work is beneficial for productivity.",
        "Write a descriptive paragraph about your hometown and what makes it special.",
        "Write an analytical paragraph about the impact of social media on communication skills.",
    ],
    "complaint_letter": [
        "Write a complaint letter about a product that arrived damaged.",
        "Write a professional complaint about poor service at a restaurant.",
        "Write a complaint to your landlord about a maintenance issue.",
    ],
    "cover_letter": [
        "Write the opening paragraph of a cover letter for a marketing position.",
        "Write a cover letter paragraph explaining a career gap positively.",
        "Write the closing paragraph of a cover letter that ends with a strong call to action.",
    ],
    "text_message": [
        "Text a friend to cancel plans without making them feel bad.",
        "Text your coworker to ask if they can cover your shift.",
        "Text a friend recommending a movie you just watched.",
    ],
}


@app.get("/api/writing/prompt")
async def writing_prompt(format: str = "formal_email", request: Request = None):
    prompts = WRITING_PROMPT_TEMPLATES.get(
        format, WRITING_PROMPT_TEMPLATES["formal_email"]
    )
    seed = int(datetime.now().strftime("%Y%m%d%H"))
    rng = random.Random(seed + hash(format))
    prompt = rng.choice(prompts)
    tips = {
        "formal_email": "Use a professional greeting, clear subject, and polite closing",
        "linkedin_message": "Be concise, mention shared interests, and add value",
        "essay_paragraph": "Start with a topic sentence, provide evidence, and conclude",
        "complaint_letter": "Be factual, state the issue clearly, and specify what you want",
        "cover_letter": "Match your skills to their needs and show enthusiasm",
        "text_message": "Keep it casual and natural — contractions and slang are fine",
    }
    return {"prompt": prompt, "tips": tips.get(format, ""), "format": format}


@app.post("/api/writing/submit")
async def writing_submit(input_data: WritingSubmissionInput, request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    try:
        client = get_groq_client()
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f"""You are an expert English writing coach. Evaluate this {input_data.format.replace('_', ' ')} writing.
Prompt given: "{input_data.prompt}"
Evaluate grammar, style, vocabulary, and register appropriateness (0-100 each).
Respond ONLY with JSON:
{{
    "overall_score": 72,
    "grammar_score": 75,
    "style_score": 70,
    "register_score": 80,
    "vocabulary_score": 65,
    "register_feedback": "Overall register analysis",
    "corrections": [
        {{"original": "wrong phrase", "corrected": "right phrase", "explanation": "why"}}
    ],
    "vocabulary_upgrades": [
        {{"original": "simple word", "upgrade": "better word"}}
    ],
    "improved_version": "The full improved text"
}}""",
                },
                {"role": "user", "content": input_data.text},
            ],
            temperature=0.4,
            max_tokens=800,
            response_format={"type": "json_object"},
        )
        result = parse_ai_response(resp.choices[0].message.content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Writing evaluation error: {str(e)}",
        )

    word_count = len(input_data.text.split())
    base_xp = max(20, word_count * 2)
    xp_info = calculate_xp_with_multiplier(base_xp, ud)
    ud["xp"] = ud.get("xp", 0) + xp_info["final_xp"]
    ud["level"], _, _ = calculate_level(ud["xp"])
    ud.setdefault("writing_submissions", []).append(
        {
            "date": str(date.today()),
            "format": input_data.format,
            "score": result.get("overall_score", 0),
            "word_count": word_count,
        }
    )
    ud["writing_submissions"] = ud["writing_submissions"][-30:]
    update_streak(ud)
    new_badges = check_and_award_badges(ud)
    save_user_progress(uid, ud)
    result["new_badges"] = new_badges
    result["xp_earned"] = xp_info
    return result


# ─── CONVERSATION REPLAY ────────────────────────────────────────────────────


@app.get("/api/conversations/list")
async def conversations_list(request: Request):
    uid = get_user_id_from_request(request)
    ud = load_user_progress(uid)
    convos = ud.get("saved_conversations", [])
    return {"conversations": list(reversed(convos[-30:]))}


@app.post("/api/conversations/report")
async def conversation_report(input_data: ConversationReportInput, request: Request):
    messages = input_data.messages
    if not messages:
        raise HTTPException(status_code=400, detail="No messages to analyze")
    transcript = "\n".join(
        [
            f"{'User' if m.get('role') == 'user' else 'AI'}: {m.get('text', '')}"
            for m in messages
        ]
    )
    try:
        client = get_groq_client()
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """Analyze this English conversation and generate a detailed report card.
Respond ONLY with JSON:
{
    "scores": {"grammar": 7, "vocabulary": 6, "fluency": 8, "coherence": 7, "confidence": 6},
    "strengths": ["Strength 1", "Strength 2"],
    "improvements": ["Area to improve 1", "Area to improve 2"],
    "grammar_patterns": ["Recurring pattern 1", "Pattern 2"]
}
Scores should be 1-10. Be specific and actionable.""",
                },
                {"role": "user", "content": transcript},
            ],
            temperature=0.4,
            max_tokens=500,
            response_format={"type": "json_object"},
        )
        return parse_ai_response(resp.choices[0].message.content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Report generation error: {str(e)}",
        )


# ─────────────────────────────────────────────────────────────────────────────

# --- Serve Frontend Static Files ---
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIR.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(FRONTEND_DIR / "assets")),
        name="static-assets",
    )

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = FRONTEND_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
