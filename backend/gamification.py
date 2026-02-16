"""
Gamification Engine for Voice Tutor App
- Dynamic level calculation: Level = √(XP/10)
- Time-based XP multipliers (1.5x before 9 AM)
- Streak protection system
- Badge earning logic
- Global leaderboard
"""
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple
from models import User, BadgeDefinition, XPTransaction, DailyGoal, SessionLocal
from auth import is_early_bird, is_night_owl
import math
import json

# ============= LEVEL CALCULATION =============
# Formula: Level = floor(sqrt(XP / 10))
# Each level requires progressively more XP

def calculate_level(xp: int) -> Tuple[int, int, int]:
    """
    Calculate level from XP using: Level = floor(sqrt(XP / 10))
    
    Returns: (level, xp_in_current_level, xp_needed_for_next)
    
    Examples:
    - 0 XP → Level 1, 0/100 XP
    - 100 XP → Level 3, 10/23 XP
    - 1000 XP → Level 10, 0/21 XP
    - 10000 XP → Level 31, 90/32 XP
    """
    if xp <= 0:
        return 1, 0, 100
    
    # Dynamic level formula: Level = floor(sqrt(XP / 10))
    level = int(math.sqrt(xp / 10))
    level = max(1, level)
    
    # Calculate XP threshold for current level
    xp_for_current_level = 10 * (level ** 2)
    
    # Calculate XP threshold for next level
    xp_for_next_level = 10 * ((level + 1) ** 2)
    
    # XP in current level (progress toward next)
    xp_in_level = xp - xp_for_current_level
    
    # XP needed to reach next level
    xp_needed = xp_for_next_level - xp_for_current_level
    
    return level, max(0, xp_in_level), max(1, xp_needed)


def get_xp_for_level(level: int) -> int:
    """Get total XP required to reach a given level."""
    return 10 * (level ** 2)


def check_level_up(old_xp: int, new_xp: int) -> Optional[Dict[str, Any]]:
    """
    Check if user leveled up.
    Returns level_up info if they did, None otherwise.
    """
    old_level, _, _ = calculate_level(old_xp)
    new_level, _, _ = calculate_level(new_xp)
    
    if new_level > old_level:
        return {
            "leveled_up": True,
            "old_level": old_level,
            "new_level": new_level,
            "levels_gained": new_level - old_level,
            "xp_reward": (new_level - old_level) * 50  # Bonus XP for leveling up
        }
    return None


# ============= XP MULTIPLIERS =============

def get_time_multiplier() -> Tuple[float, str]:
    """
    Get XP multiplier based on current time.
    Returns: (multiplier, reason)
    
    Rules:
    - Before 9 AM: 1.5x (Early Bird bonus)
    - 11 PM - 2 AM: 1.2x (Night Owl bonus)
    - Otherwise: 1.0x
    """
    hour = datetime.utcnow().hour
    
    if hour < 9:  # 12 AM - 8:59 AM
        return 1.5, "Early Bird Bonus! +50% XP"
    elif hour >= 23 or hour < 2:  # 11 PM - 1:59 AM
        return 1.2, "Night Owl Bonus! +20% XP"
    else:
        return 1.0, ""


def get_streak_multiplier(streak_days: int) -> Tuple[float, str]:
    """
    Get XP multiplier based on streak.
    Returns: (multiplier, description)
    """
    if streak_days >= 30:
        return 2.5, "30+ Day Streak! 2.5x XP"
    elif streak_days >= 14:
        return 2.0, "14+ Day Streak! 2x XP"
    elif streak_days >= 7:
        return 1.5, "7+ Day Streak! 1.5x XP"
    elif streak_days >= 3:
        return 1.25, "3+ Day Streak! 1.25x XP"
    return 1.0, ""


def calculate_final_xp(
    base_xp: int,
    streak_days: int = 0,
    apply_time_bonus: bool = True
) -> Dict[str, Any]:
    """
    Calculate final XP with all multipliers applied.
    
    Returns dict with breakdown of bonuses.
    """
    time_multiplier = 1.0
    time_reason = ""
    
    if apply_time_bonus:
        time_multiplier, time_reason = get_time_multiplier()
    
    streak_multiplier, streak_reason = get_streak_multiplier(streak_days)
    
    # Multipliers stack: base * time * streak
    total_multiplier = time_multiplier * streak_multiplier
    final_xp = int(base_xp * total_multiplier)
    
    return {
        "base_xp": base_xp,
        "time_multiplier": time_multiplier,
        "time_reason": time_reason,
        "streak_multiplier": streak_multiplier,
        "streak_reason": streak_reason,
        "total_multiplier": total_multiplier,
        "final_xp": final_xp,
        "bonus_xp": final_xp - base_xp
    }


# ============= STREAK SYSTEM =============

def update_streak(user: User, db) -> Dict[str, Any]:
    """
    Update user's streak based on last login timestamp.
    
    Returns streak info with any changes.
    """
    today = datetime.utcnow().date()
    last_login = user.last_login_timestamp
    
    if last_login:
        last_login_date = last_login.date()
        days_diff = (today - last_login_date).days
        
        if days_diff == 0:
            # Already logged in today
            return {"streak_continued": False, "message": "Already practiced today"}
        
        elif days_diff == 1:
            # Consecutive day - extend streak
            user.streak_days += 1
            
        elif days_diff > 1:
            # Missed days - check for streak freeze
            if user.streak_freeze_available > 0 and days_diff == 2:
                # Can use streak freeze for 1 missed day
                user.streak_freeze_available -= 1
                user.streak_days += 1
                user.streak_freeze_active = True
                return {
                    "streak_continued": True,
                    "streak_saved": True,
                    "freezes_remaining": user.streak_freeze_available,
                    "message": f"Streak saved with freeze! {user.streak_freeze_available} freezes remaining."
                }
            else:
                # Streak broken
                user.streak_days = 1
                return {
                    "streak_continued": False,
                    "streak_broken": True,
                    "previous_streak": user.max_streak,
                    "message": "Streak reset. Start fresh today!"
                }
    else:
        # First login ever
        user.streak_days = 1
    
    user.last_login_timestamp = datetime.utcnow()
    
    # Update max streak
    if user.streak_days > user.max_streak:
        user.max_streak = user.streak_days
    
    # Award streak freeze every 7 days
    streak_milestones = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98]
    if user.streak_days in streak_milestones:
        user.streak_freeze_available = min(user.streak_freeze_available + 1, 3)
        user.last_streak_freeze_earned = user.streak_days
    
    return {
        "streak_continued": True,
        "current_streak": user.streak_days,
        "max_streak": user.max_streak,
        "streak_freeze_available": user.streak_freeze_available,
        "message": f"{user.streak_days}-day streak! Keep it going!"
    }


def trigger_streak_freeze(user: User, db) -> Dict[str, Any]:
    """
    Manually activate streak freeze protection.
    """
    if user.streak_freeze_available <= 0:
        return {"success": False, "message": "No streak freezes available"}
    
    if user.streak_freeze_active:
        return {"success": False, "message": "Streak freeze already active"}
    
    user.streak_freeze_available -= 1
    user.streak_freeze_active = True
    db.commit()
    
    return {
        "success": True,
        "freezes_remaining": user.streak_freeze_available,
        "message": "Streak freeze activated! Your streak is protected for 1 day."
    }


# ============= BADGE CHECKING =============

def check_badges(user: User, db) -> List[Dict[str, Any]]:
    """
    Check and award badges based on user progress.
    Returns list of newly earned badges.
    """
    earned_badge_ids = [b.get("badge_id") for b in (user.achievements or [])]
    new_badges = []
    
    # Get all active badge definitions
    all_badges = db.query(BadgeDefinition).filter(BadgeDefinition.is_active == True).all()
    
    for badge in all_badges:
        if badge.badge_id in earned_badge_ids:
            continue
        
        earned = False
        condition = badge.condition or {}
        cond_type = condition.get("type")
        cond_value = condition.get("value")
        
        if cond_type == "first_login":
            earned = user.total_sessions >= 1
        elif cond_type == "sessions":
            earned = user.total_sessions >= cond_value
        elif cond_type == "streak":
            earned = user.streak_days >= cond_value
        elif cond_type == "level":
            earned = user.current_level >= cond_value
        elif cond_type == "words":
            earned = user.words_spoken >= cond_value
        elif cond_type == "vocab":
            # Assuming vocab count is stored somewhere
            vocab_count = len(user.achievements) if user.achievements else 0
            earned = vocab_count >= cond_value
        elif cond_type == "time":
            if cond_value == "early_bird":
                # Check if they have early bird session today
                earned = is_early_bird()
            elif cond_value == "night_owl":
                earned = is_night_owl()
        
        if earned:
            badge_data = {
                "badge_id": badge.badge_id,
                "name": badge.name,
                "description": badge.description,
                "icon": badge.icon,
                "category": badge.category,
                "rarity": badge.rarity,
                "xp_reward": badge.xp_reward,
                "earned_at": datetime.utcnow().isoformat()
            }
            
            new_badges.append(badge_data)
            earned_badge_ids.append(badge.badge_id)
            
            # Award XP for badge
            if badge.xp_reward:
                user.xp_total += badge.xp_reward
    
    # Update user achievements
    if new_badges:
        user.achievements = (user.achievements or []) + new_badges
        user.achievements_count = len(user.achievements)
    
    return new_badges


# ============= XP AWARDING =============

def award_xp(
    user: User,
    base_xp: int,
    source: str,
    description: str = "",
    db = None,
    reference_id: str = None
) -> Dict[str, Any]:
    """
    Award XP to user with all multipliers applied.
    Creates XP transaction record if db provided.
    """
    old_xp = user.xp_total
    old_level = user.current_level
    
    # Calculate with multipliers
    xp_info = calculate_final_xp(base_xp, user.streak_days)
    final_xp = xp_info["final_xp"]
    
    # Update user
    user.xp_total += final_xp
    
    # Recalculate level
    new_level, xp_in_level, xp_needed = calculate_level(user.xp_total)
    user.current_level = new_level
    user.xp_in_level = xp_in_level
    user.xp_for_next_level = xp_needed
    
    # Check for level up
    level_up_info = None
    if new_level > old_level:
        level_up_info = {
            "leveled_up": True,
            "old_level": old_level,
            "new_level": new_level,
            "levels_gained": new_level - old_level
        }
        # Bonus XP for leveling up
        level_bonus = (new_level - old_level) * 50
        user.xp_total += level_bonus
        xp_info["level_up_bonus"] = level_bonus
    
    # Create transaction record
    if db:
        transaction = XPTransaction(
            user_id=user.id,
            amount=final_xp,
            source=source,
            description=description,
            streak_multiplier=xp_info["streak_multiplier"],
            time_bonus=xp_info["time_multiplier"],
            reference_id=reference_id
        )
        db.add(transaction)
        db.commit()
    
    xp_info["level_up"] = level_up_info
    xp_info["new_total_xp"] = user.xp_total
    xp_info["new_level"] = new_level
    xp_info["xp_in_level"] = xp_in_level
    xp_info["xp_needed"] = xp_needed
    
    return xp_info


# ============= DAILY GOALS =============

def get_or_create_daily_goal(user: User, db) -> DailyGoal:
    """Get or create today's daily goal for user."""
    today = datetime.utcnow().date().isoformat()
    
    goal = db.query(DailyGoal).filter(
        DailyGoal.user_id == user.id,
        DailyGoal.date == today
    ).first()
    
    if not goal:
        goal = DailyGoal(
            user_id=user.id,
            date=today,
            target_minutes=user.daily_goal_minutes or 10,
            sessions_target=3
        )
        db.add(goal)
        db.commit()
    
    return goal


def update_daily_goal(user: User, minutes: float, db) -> Dict[str, Any]:
    """Update daily goal progress."""
    goal = get_or_create_daily_goal(user, db)
    
    goal.completed_minutes += minutes
    goal.sessions_completed += 1
    
    was_completed = goal.is_completed
    goal.is_completed = goal.completed_minutes >= goal.target_minutes
    
    if goal.is_completed and not was_completed:
        # Goal just completed - award bonus XP
        bonus_xp = 25
        user.xp_total += bonus_xp
        goal.xp_earned += bonus_xp
    
    db.commit()
    
    return {
        "completed_minutes": goal.completed_minutes,
        "target_minutes": goal.target_minutes,
        "sessions_completed": goal.sessions_completed,
        "sessions_target": goal.sessions_target,
        "is_completed": goal.is_completed,
        "progress_percent": min(100, int((goal.completed_minutes / goal.target_minutes) * 100))
    }


# ============= LEADERBOARD =============

def get_global_leaderboard(limit: int = 10, db = None) -> List[Dict[str, Any]]:
    """
    Get global leaderboard ranked by total XP.
    Returns top users with their stats.
    """
    if not db:
        db = next(SessionLocal())
    
    top_users = db.query(User).filter(
        User.is_active == True
    ).order_by(User.xp_total.desc()).limit(limit).all()
    
    leaderboard = []
    for rank, user in enumerate(top_users, 1):
        leaderboard.append({
            "rank": rank,
            "user_id": user.id,
            "username": user.username,
            "level": user.current_level,
            "xp_total": user.xp_total,
            "streak_days": user.streak_days,
            "achievements_count": user.achievements_count,
            "avatar_url": user.avatar_url
        })
    
    return leaderboard


def get_user_rank(user_id: int, db = None) -> Dict[str, Any]:
    """Get user's rank on the global leaderboard."""
    if not db:
        db = next(SessionLocal())
    
    # Count users with more XP
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"rank": None}
    
    users_above = db.query(User).filter(
        User.is_active == True,
        User.xp_total > user.xp_total
    ).count()
    
    rank = users_above + 1
    
    total_users = db.query(User).filter(User.is_active == True).count()
    percentile = int(((total_users - rank) / total_users) * 100) if total_users > 0 else 0
    
    return {
        "rank": rank,
        "total_users": total_users,
        "percentile": percentile,
        "xp": user.xp_total
    }


# ============= SESSION REWARDS =============

def process_session_rewards(
    user: User,
    session_type: str,  # "practice", "scenario", "tongue_twister", "daily_challenge"
    duration_minutes: float,
    fluency_score: int,
    words_spoken: int,
    db
) -> Dict[str, Any]:
    """
    Process all rewards for a completed session.
    Returns comprehensive reward breakdown.
    """
    rewards = {
        "xp": {},
        "badges": [],
        "streak": {},
        "daily_goal": {},
        "level_up": None
    }
    
    # Calculate base XP
    base_xp = {
        "practice": 10 + (fluency_score * 2) + (words_spoken // 5),
        "scenario": 15 + (fluency_score * 3) + (words_spoken // 3),
        "tongue_twister": 20 + (fluency_score * 2),
        "daily_challenge": 50 + (fluency_score * 5),
    }.get(session_type, 10)
    
    # Award XP with multipliers
    rewards["xp"] = award_xp(
        user, base_xp,
        source=session_type,
        description=f"Completed {session_type} session",
        db=db
    )
    
    # Update streak
    rewards["streak"] = update_streak(user, db)
    
    # Update daily goal
    rewards["daily_goal"] = update_daily_goal(user, duration_minutes, db)
    
    # Update user stats
    user.total_sessions += 1
    user.words_spoken += words_spoken
    user.total_practice_minutes += duration_minutes
    
    # Update skill scores (moving average)
    if fluency_score > 0:
        weight = 0.1  # 10% weight to new score
        user.skill_fluency = round(user.skill_fluency * (1 - weight) + fluency_score * weight, 1)
    
    # Check for badges
    rewards["badges"] = check_badges(user, db)
    
    # Check for level up
    level_up = check_level_up(user.xp_total - rewards["xp"]["final_xp"], user.xp_total)
    if level_up:
        rewards["level_up"] = level_up
        # Check for level-based badges
        new_badges = check_badges(user, db)
        rewards["badges"].extend(new_badges)
    
    db.commit()
    
    return rewards