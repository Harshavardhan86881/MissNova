"""
Database Models for Voice Tutor Auth System
SQLAlchemy models with full gamification support
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

Base = declarative_base()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./voice_tutor.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)


class User(Base):
    """
    User model with full gamification support.
    
    Security fields:
    - hashed_password: Argon2id hashed password
    - salt: Per-user unique salt for double protection
    
    Gamification fields:
    - xp_total: Total XP earned
    - current_level: Calculated from XP
    - streak_days: Consecutive days practiced
    - last_login_timestamp: For streak calculation
    - achievements: JSON array of earned badges
    """
    __tablename__ = "users"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    
    # Security (Fort Knox)
    hashed_password = Column(String, nullable=False)
    salt = Column(String, nullable=False)  # Per-user salt
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    
    # Login tracking
    last_login_at = Column(DateTime)
    last_login_ip = Column(String)
    last_login_timestamp = Column(DateTime)  # UTC timestamp for streak calculation
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    
    # Profile
    first_name = Column(String)
    last_name = Column(String)
    avatar_url = Column(String)
    bio = Column(String)
    timezone = Column(String, default="UTC")
    
    # Gamification
    xp_total = Column(Integer, default=0)
    current_level = Column(Integer, default=1)
    xp_in_level = Column(Integer, default=0)
    xp_for_next_level = Column(Integer, default=100)
    
    streak_days = Column(Integer, default=0)
    max_streak = Column(Integer, default=0)
    streak_freeze_available = Column(Integer, default=0)
    streak_freeze_active = Column(Boolean, default=False)
    last_streak_freeze_earned = Column(Integer, default=0)  # Streak day count when earned
    
    achievements = Column(JSON, default=list)  # Array of badge objects
    achievements_count = Column(Integer, default=0)
    
    # Practice stats
    total_practice_minutes = Column(Float, default=0)
    total_sessions = Column(Integer, default=0)
    words_spoken = Column(Integer, default=0)
    
    # Skill scores (1-10)
    skill_grammar = Column(Float, default=5.0)
    skill_vocabulary = Column(Float, default=5.0)
    skill_pronunciation = Column(Float, default=5.0)
    skill_fluency = Column(Float, default=5.0)
    skill_confidence = Column(Float, default=5.0)
    
    # Preferences
    daily_goal_minutes = Column(Integer, default=10)
    preferred_level = Column(String, default="intermediate")  # beginner, intermediate, advanced
    practice_goals = Column(JSON, default=list)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert user to dictionary for API response."""
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "avatar_url": self.avatar_url,
            "is_verified": self.is_verified,
            "is_premium": self.is_premium,
            
            # Gamification
            "xp_total": self.xp_total,
            "current_level": self.current_level,
            "xp_in_level": self.xp_in_level,
            "xp_for_next_level": self.xp_for_next_level,
            "streak_days": self.streak_days,
            "max_streak": self.max_streak,
            "streak_freeze_available": self.streak_freeze_available,
            "streak_multiplier": self.get_streak_multiplier(),
            "achievements": self.achievements or [],
            "achievements_count": self.achievements_count,
            
            # Stats
            "total_sessions": self.total_sessions,
            "words_spoken": self.words_spoken,
            "total_practice_minutes": self.total_practice_minutes,
            
            # Skills
            "skill_scores": {
                "grammar": self.skill_grammar,
                "vocabulary": self.skill_vocabulary,
                "pronunciation": self.skill_pronunciation,
                "fluency": self.skill_fluency,
                "confidence": self.skill_confidence,
            },
            
            # Preferences
            "daily_goal_minutes": self.daily_goal_minutes,
            "preferred_level": self.preferred_level,
            
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
        }
    
    def get_streak_multiplier(self):
        """Get XP multiplier based on streak."""
        days = self.streak_days or 0
        if days >= 30:
            return 2.5
        elif days >= 14:
            return 2.0
        elif days >= 7:
            return 1.5
        elif days >= 3:
            return 1.25
        return 1.0


class UserSession(Base):
    """Track user sessions for security and analytics."""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    
    session_token = Column(String, unique=True, index=True)
    refresh_token = Column(String, unique=True, index=True, nullable=True)
    
    ip_address = Column(String)
    user_agent = Column(String)
    device_type = Column(String)  # desktop, mobile, tablet
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    last_activity = Column(DateTime, default=datetime.utcnow)


class BadgeDefinition(Base):
    """Predefined badge templates."""
    __tablename__ = "badge_definitions"
    
    id = Column(Integer, primary_key=True)
    badge_id = Column(String, unique=True, index=True)  # e.g., "first_login"
    name = Column(String)  # e.g., "First Steps"
    description = Column(String)
    icon = Column(String)  # Emoji or icon class
    category = Column(String)  # engagement, achievement, streak, level, special
    rarity = Column(String, default="common")  # common, rare, epic, legendary
    xp_reward = Column(Integer, default=0)
    
    # Conditions (JSON for flexible criteria)
    condition = Column(JSON)  # {"type": "streak", "value": 7}
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class XPTransaction(Base):
    """Track individual XP transactions."""
    __tablename__ = "xp_transactions"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True)
    
    amount = Column(Integer)  # Can be negative for deductions
    source = Column(String)  # daily_login, practice_session, badge_reward, etc.
    description = Column(String)
    
    # Multipliers applied
    streak_multiplier = Column(Float, default=1.0)
    time_bonus = Column(Float, default=1.0)  # 1.5x for early bird
    
    # Reference
    reference_id = Column(String)  # Session ID or badge ID
    
    created_at = Column(DateTime, default=datetime.utcnow)


class DailyGoal(Base):
    """Track daily practice goals."""
    __tablename__ = "daily_goals"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True)
    
    date = Column(String, index=True)  # YYYY-MM-DD format
    target_minutes = Column(Integer, default=10)
    completed_minutes = Column(Float, default=0)
    sessions_completed = Column(Integer, default=0)
    sessions_target = Column(Integer, default=3)
    
    is_completed = Column(Boolean, default=False)
    xp_earned = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Predefined badges for the system
DEFAULT_BADGES = [
    # Engagement badges
    {"badge_id": "first_login", "name": "First Steps", "description": "Complete your first login", "icon": "👋", "category": "engagement", "rarity": "common", "xp_reward": 25, "condition": {"type": "first_login"}},
    {"badge_id": "first_session", "name": "Voice Activated", "description": "Complete your first practice session", "icon": "🎤", "category": "engagement", "rarity": "common", "xp_reward": 50, "condition": {"type": "sessions", "value": 1}},
    {"badge_id": "10_sessions", "name": "Chatterbox", "description": "Complete 10 practice sessions", "icon": "💬", "category": "engagement", "rarity": "common", "xp_reward": 75, "condition": {"type": "sessions", "value": 10}},
    {"badge_id": "50_sessions", "name": "Communication Pro", "description": "Complete 50 practice sessions", "icon": "🎙️", "category": "engagement", "rarity": "rare", "xp_reward": 200, "condition": {"type": "sessions", "value": 50}},
    
    # Streak badges
    {"badge_id": "streak_3", "name": "Getting Started", "description": "Maintain a 3-day streak", "icon": "🔥", "category": "streak", "rarity": "common", "xp_reward": 25, "condition": {"type": "streak", "value": 3}},
    {"badge_id": "streak_7", "name": "Week Warrior", "description": "Maintain a 7-day streak", "icon": "⚡", "category": "streak", "rarity": "common", "xp_reward": 50, "condition": {"type": "streak", "value": 7}},
    {"badge_id": "streak_14", "name": "Fortnight Fighter", "description": "Maintain a 14-day streak", "icon": "💪", "category": "streak", "rarity": "rare", "xp_reward": 100, "condition": {"type": "streak", "value": 14}},
    {"badge_id": "streak_30", "name": "Monthly Master", "description": "Maintain a 30-day streak", "icon": "🏆", "category": "streak", "rarity": "epic", "xp_reward": 250, "condition": {"type": "streak", "value": 30}},
    {"badge_id": "streak_100", "name": "Century Club", "description": "Maintain a 100-day streak", "icon": "👑", "category": "streak", "rarity": "legendary", "xp_reward": 1000, "condition": {"type": "streak", "value": 100}},
    
    # Time-based badges
    {"badge_id": "early_bird", "name": "The Early Bird", "description": "Complete a session before 9 AM", "icon": "🌅", "category": "special", "rarity": "rare", "xp_reward": 50, "condition": {"type": "time", "value": "early_bird"}},
    {"badge_id": "night_owl", "name": "Night Owl", "description": "Complete a session between 11 PM and 2 AM", "icon": "🦉", "category": "special", "rarity": "rare", "xp_reward": 50, "condition": {"type": "time", "value": "night_owl"}},
    {"badge_id": "weekend_warrior", "name": "Weekend Warrior", "description": "Practice on both Saturday and Sunday", "icon": "📅", "category": "special", "rarity": "common", "xp_reward": 30, "condition": {"type": "weekend"}},
    
    # Level badges
    {"badge_id": "level_5", "name": "Rising Star", "description": "Reach Level 5", "icon": "⭐", "category": "level", "rarity": "common", "xp_reward": 100, "condition": {"type": "level", "value": 5}},
    {"badge_id": "level_10", "name": "Skilled Speaker", "description": "Reach Level 10", "icon": "🌟", "category": "level", "rarity": "rare", "xp_reward": 250, "condition": {"type": "level", "value": 10}},
    {"badge_id": "level_25", "name": "Communication Master", "description": "Reach Level 25", "icon": "💫", "category": "level", "rarity": "epic", "xp_reward": 500, "condition": {"type": "level", "value": 25}},
    {"badge_id": "level_50", "name": "Legend", "description": "Reach Level 50", "icon": "🏅", "category": "level", "rarity": "legendary", "xp_reward": 2000, "condition": {"type": "level", "value": 50}},
    
    # Words spoken
    {"badge_id": "words_100", "name": "Word Explorer", "description": "Speak 100 words", "icon": "📝", "category": "achievement", "rarity": "common", "xp_reward": 25, "condition": {"type": "words", "value": 100}},
    {"badge_id": "words_1000", "name": "Wordsmith", "description": "Speak 1,000 words", "icon": "✍️", "category": "achievement", "rarity": "common", "xp_reward": 75, "condition": {"type": "words", "value": 1000}},
    {"badge_id": "words_5000", "name": "Eloquent Speaker", "description": "Speak 5,000 words", "icon": "🗣️", "category": "achievement", "rarity": "rare", "xp_reward": 200, "condition": {"type": "words", "value": 5000}},
    
    # Vocabulary
    {"badge_id": "vocab_10", "name": "Vocab Builder", "description": "Learn 10 new words", "icon": "📚", "category": "achievement", "rarity": "common", "xp_reward": 30, "condition": {"type": "vocab", "value": 10}},
    {"badge_id": "vocab_50", "name": "Dictionary", "description": "Learn 50 new words", "icon": "📖", "category": "achievement", "rarity": "rare", "xp_reward": 100, "condition": {"type": "vocab", "value": 50}},
]


def initialize_badges(db):
    """Initialize default badges in database."""
    for badge_data in DEFAULT_BADGES:
        existing = db.query(BadgeDefinition).filter(
            BadgeDefinition.badge_id == badge_data["badge_id"]
        ).first()
        if not existing:
            badge = BadgeDefinition(**badge_data)
            db.add(badge)
    db.commit()