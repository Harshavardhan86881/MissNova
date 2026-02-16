import React, { useEffect, useState } from 'react';
import {
    Mic, Target, MessageSquare, BookOpen, Zap, Trophy,
    TrendingUp, ArrowRight, Languages, Flame, AlertTriangle, Shield, Sparkles, ChevronRight, Clock, Globe
} from 'lucide-react';
import ShareButton from './ShareButton';
import GoalsWidget from './GoalsWidget';
import { trackEvent, EVENTS, trackFeatureUse } from '../utils/analytics';
import { authFetch } from '../utils/authFetch';

// Circular progress ring component
const LevelProgressRing = ({ level, progress, xpInLevel, xpNeeded, size = 120, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#levelGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                        transition: 'stroke-dashoffset 0.8s ease-in-out',
                    }}
                />
                <defs>
                    <linearGradient id="levelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                </defs>
            </svg>
            {/* Center content */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
            }}>
                <div style={{
                    fontSize: '32px',
                    fontWeight: '900',
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    {level}
                </div>
                <div style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    marginTop: '-2px',
                }}>
                    LEVEL
                </div>
            </div>
        </div>
    );
};

// Daily goal tracker component
const DailyGoalTracker = ({ sessionsCompleted = 0, sessionsTarget = 3, completedMinutes = 0, targetMinutes = 10 }) => {
    const progress = Math.min(100, (sessionsCompleted / sessionsTarget) * 100);
    const isComplete = sessionsCompleted >= sessionsTarget;
    
    return (
        <div className="glass-card" style={{
            padding: '20px',
            marginBottom: '24px',
            background: isComplete
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))'
                : 'rgba(255, 255, 255, 0.03)',
            border: isComplete
                ? '1px solid rgba(34, 197, 94, 0.2)'
                : '1px solid var(--border-subtle)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: isComplete
                            ? 'linear-gradient(135deg, #22c55e, #10b981)'
                            : 'linear-gradient(135deg, #f59e0b, #d97706)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        {isComplete ? <Trophy size={20} color="white" /> : <Target size={20} color="white" />}
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>
                            {isComplete ? 'Daily Goal Complete!' : 'Daily Goal'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {isComplete
                                ? 'Great job! Come back tomorrow for more.'
                                : `${sessionsCompleted}/${sessionsTarget} sessions today`
                            }
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{
                        fontWeight: '800',
                        fontSize: '20px',
                        color: isComplete ? '#22c55e' : '#f59e0b',
                    }}>
                        {Math.round(progress)}%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {completedMinutes}/{targetMinutes} min
                    </div>
                </div>
            </div>
            
            {/* Session dots */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                {Array.from({ length: sessionsTarget }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            height: '8px',
                            borderRadius: '4px',
                            background: i < sessionsCompleted
                                ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                                : 'rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.3s ease',
                        }}
                    />
                ))}
            </div>
            
            {!isComplete && (
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '16px',
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        border: 'none',
                        borderRadius: '12px',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    <Mic size={16} /> Start Practice Session
                </button>
            )}
        </div>
    );
};

// Leaderboard mini preview
const LeaderboardPreview = ({ rank, totalUsers, percentile }) => {
    if (!rank) return null;
    
    return (
        <div className="glass-card" style={{
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
        }}>
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: '900',
                color: 'white',
            }}>
                #{rank}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>
                    Your Global Rank
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Top {100 - percentile}% of {totalUsers?.toLocaleString() || '1K'} learners
                </div>
            </div>
            <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
        </div>
    );
};

const Dashboard = ({ stats, navigateTo }) => {
    const [dailyGoal, setDailyGoal] = useState(null);
    const [leaderboard, setLeaderboard] = useState(null);
    
    const quickActions = [
        { id: 'practice', label: 'Free Practice', desc: 'Talk to Miss Nova about anything', icon: Mic, gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', shadowColor: 'rgba(139,92,246,0.3)' },
        { id: 'scenarios', label: 'Scenarios', desc: 'Practice real-life situations', icon: MessageSquare, gradient: 'linear-gradient(135deg, #ec4899, #db2777)', shadowColor: 'rgba(236,72,153,0.3)' },
        { id: 'tongue-twisters', label: 'Pronunciation', desc: 'Tongue twisters & drills', icon: Languages, gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', shadowColor: 'rgba(6,182,212,0.3)' },
        { id: 'daily-challenge', label: 'Daily Challenge', desc: 'Today\'s speaking mission', icon: Target, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', shadowColor: 'rgba(245,158,11,0.3)' },
        { id: 'translate', label: 'Translator', desc: 'Translate any language to English', icon: Globe, gradient: 'linear-gradient(135deg, #10b981, #059669)', shadowColor: 'rgba(16,185,129,0.3)' },
    ];

    const tips = [
        "🎯 Practice for at least 10 minutes daily to see rapid improvement",
        "📖 Review your vocabulary bank weekly to reinforce new words",
        "🎤 Try different scenarios to build versatile communication skills",
        "🔥 Keep your streak alive — consistency beats intensity!",
        "💬 Don't be afraid to make mistakes — that's how you learn!",
        "🧠 Listen carefully to Miss Nova's corrections and try to apply them",
        "🌅 Practice before 9 AM for a 1.5x XP bonus!",
    ];

    const randomTip = tips[Math.floor(Date.now() / 86400000) % tips.length];

    // Track dashboard view
    useEffect(() => {
        trackFeatureUse('dashboard');
        
        // Fetch daily goal
        authFetch('/api/daily-goal', { credentials: 'include' })
            .then(res => res.json())
            .then(data => setDailyGoal(data))
            .catch(() => {});
        
        // Fetch leaderboard
        authFetch('/api/leaderboard?limit=10', { credentials: 'include' })
            .then(res => res.json())
            .then(data => setLeaderboard(data))
            .catch(() => {});
    }, []);

    // Generate personalized recommendations based on user behavior
    const getRecommendations = () => {
        if (!stats) return [];
        const recs = [];

        if (stats.scenarios_completed === 0) {
            recs.push({
                text: "🎭 You haven't tried any scenarios yet! Practice real-life situations like job interviews.",
                action: 'scenarios',
                label: 'Try Scenarios',
                color: '#ec4899',
            });
        }

        if (stats.tongue_twisters_completed === 0) {
            recs.push({
                text: "👅 Improve your pronunciation with fun tongue twisters — try your first one!",
                action: 'tongue-twisters',
                label: 'Try Tongue Twisters',
                color: '#06b6d4',
            });
        }

        if (stats.vocabulary_count < 5) {
            recs.push({
                text: "📚 Build your word bank! Practice with today's daily vocabulary words.",
                action: 'daily-vocab',
                label: 'Daily Vocab',
                color: '#a78bfa',
            });
        }

        const skills = stats.skill_scores || {};
        const weakSkill = Object.entries(skills).sort((a, b) => a[1] - b[1])[0];
        if (weakSkill && weakSkill[1] < 5) {
            const skillMap = {
                grammar: { action: 'practice', label: 'Practice Grammar' },
                vocabulary: { action: 'daily-vocab', label: 'Learn Words' },
                pronunciation: { action: 'tongue-twisters', label: 'Pronunciation Drills' },
                fluency: { action: 'practice', label: 'Free Practice' },
                confidence: { action: 'scenarios', label: 'Try Scenarios' },
            };
            const mapped = skillMap[weakSkill[0]] || { action: 'practice', label: 'Practice' };
            recs.push({
                text: `📈 Your ${weakSkill[0]} score is ${weakSkill[1]}/10 — try some focused practice!`,
                action: mapped.action,
                label: mapped.label,
                color: '#f59e0b',
            });
        }

        return recs.slice(0, 2);
    };

    const recommendations = getRecommendations();
    const streakAtRisk = stats?.streak_at_risk && stats?.streak_days > 0;
    
    // Calculate level progress
    const levelProgress = stats ? (stats.xp_in_level / stats.xp_for_next_level) * 100 : 0;

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Header with Share Button */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '6px' }}>
                        Welcome back! <span style={{ fontSize: '28px' }}>👋</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                        Ready to improve your communication skills today?
                    </p>
                </div>
                {stats && (
                    <ShareButton stats={stats} variant="button" />
                )}
            </div>

            {/* Streak At Risk Warning Banner */}
            {streakAtRisk && (
                <div style={{
                    padding: '16px 20px',
                    marginBottom: '20px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(245, 158, 11, 0.08))',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    animation: 'pulse-subtle 2s ease-in-out infinite',
                }}>
                    <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#ef4444', marginBottom: '2px' }}>
                            🔥 Your {stats.streak_days}-day streak is at risk!
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Practice now to keep it going.
                            {stats.streak_freeze_available > 0 && (
                                <span style={{ color: '#22d3ee' }}>
                                    {' '}You have {stats.streak_freeze_available} streak {stats.streak_freeze_available === 1 ? 'freeze' : 'freezes'} available.
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => navigateTo('practice')}
                        className="btn-primary"
                        style={{
                            padding: '10px 20px', fontSize: '13px',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            flexShrink: 0,
                        }}
                    >
                        <Mic size={14} /> Practice Now
                    </button>
                </div>
            )}

            {/* Level Progress Ring + Daily Goal + Leaderboard */}
            {stats && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '24px',
                    marginBottom: '28px',
                    alignItems: 'start',
                }}>
                    {/* Level Progress Ring */}
                    <div className="glass-card" style={{
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                    }}>
                        <LevelProgressRing
                            level={stats.level}
                            progress={levelProgress}
                            xpInLevel={stats.xp_in_level}
                            xpNeeded={stats.xp_for_next_level}
                        />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                {stats.xp_in_level?.toLocaleString()} / {stats.xp_for_next_level?.toLocaleString()} XP
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Level {stats.level + 1} in {stats.xp_for_next_level - stats.xp_in_level} XP
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Daily Goal */}
                        <DailyGoalTracker
                            sessionsCompleted={dailyGoal?.sessions_completed || stats?.daily_sessions || 0}
                            sessionsTarget={dailyGoal?.sessions_target || 3}
                            completedMinutes={dailyGoal?.completed_minutes || stats?.daily_minutes || 0}
                            targetMinutes={dailyGoal?.target_minutes || 10}
                        />
                        
                        {/* Leaderboard Preview */}
                        {leaderboard?.rank && (
                            <LeaderboardPreview
                                rank={leaderboard.rank.rank}
                                totalUsers={leaderboard.rank.total_users}
                                percentile={leaderboard.rank.percentile}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            {stats && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '12px',
                    marginBottom: '28px',
                }}>
                    {[
                        { label: 'Total XP', value: stats.xp?.toLocaleString() || '0', icon: Zap, color: '#fbbf24' },
                        { label: 'Level', value: stats.level || 1, icon: Trophy, color: '#a78bfa' },
                        { label: 'Streak', value: `${stats.streak_days || 0}🔥`, icon: Flame, color: '#f97316' },
                        { label: 'Words', value: stats.words_spoken?.toLocaleString() || '0', icon: TrendingUp, color: '#34d399' },
                        { label: 'Fluency', value: `${stats.average_accuracy || 0}/10`, icon: Target, color: '#22d3ee' },
                        { label: 'Vocab', value: stats.vocabulary_count || 0, icon: BookOpen, color: '#f472b6' },
                    ].map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <div key={i} className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
                                <Icon size={20} style={{ color: stat.color, marginBottom: '8px' }} />
                                <div style={{ fontSize: '22px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Time Bonus Banner (before 9 AM) */}
            {new Date().getHours() < 9 && (
                <div className="glass-card hover-lift" style={{
                    padding: '16px 20px',
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.05))',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <span style={{ fontSize: '22px' }}>🌅</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#fbbf24' }}>
                            Early Bird Bonus Active!
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Practice before 9 AM for a <strong>+25% XP bonus</strong>
                        </div>
                    </div>
                    <Clock size={20} style={{ color: '#fbbf24' }} />
                </div>
            )}

            {/* Night Owl Banner (after 9 PM) */}
            {new Date().getHours() >= 21 && (
                <div className="glass-card hover-lift" style={{
                    padding: '16px 20px',
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05))',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <span style={{ fontSize: '22px' }}>🦉</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#a78bfa' }}>
                            Night Owl Bonus Active!
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Late night studying earns you a <strong>+10% XP bonus</strong>
                        </div>
                    </div>
                    <span style={{ fontSize: '20px' }}>🌙</span>
                </div>
            )}

            {/* Streak Multiplier Banner */}
            {stats?.streak_days >= 3 && (
                <div className="glass-card hover-lift" style={{
                    padding: '16px 20px',
                    marginBottom: '24px',
                    background: stats.streak_days >= 30
                        ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.12), rgba(139, 92, 246, 0.08))'
                        : stats.streak_days >= 14
                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05))'
                        : 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(245, 158, 11, 0.05))',
                    border: `1px solid ${stats.streak_days >= 30 ? 'rgba(236, 72, 153, 0.2)' : stats.streak_days >= 14 ? 'rgba(139, 92, 246, 0.2)' : 'rgba(249, 115, 22, 0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                }}>
                    <div style={{ fontSize: '28px' }}>
                        {stats.streak_days >= 30 ? '🔥' : stats.streak_days >= 14 ? '⚡' : '✨'}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: stats.streak_days >= 30 ? '#ec4899' : stats.streak_days >= 14 ? '#a78bfa' : '#f97316' }}>
                            {stats.streak_days >= 30 ? '2.5x' : stats.streak_days >= 14 ? '2.0x' : stats.streak_days >= 7 ? '1.5x' : '1.25x'} Streak Multiplier!
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {stats.streak_days}-day streak — keep it going for even bigger bonuses!
                        </div>
                    </div>
                    <div style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        background: 'rgba(255,255,255,0.05)',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                    }}>
                        🔥 {stats.streak_days} days
                    </div>
                </div>
            )}

            {/* Goals Widget */}
            <GoalsWidget stats={stats} />

            {/* Personalized Recommendations */}
            {recommendations.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} style={{ color: '#a78bfa' }} /> Suggested for You
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {recommendations.map((rec, i) => (
                            <div key={i} style={{
                                padding: '14px 18px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border-subtle)',
                                display: 'flex', alignItems: 'center', gap: '14px',
                            }}>
                                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    {rec.text}
                                </div>
                                <button
                                    onClick={() => {
                                        trackEvent(EVENTS.PAGE_VIEW, { page: rec.action, source: 'recommendation' });
                                        navigateTo(rec.action);
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: `${rec.color}20`,
                                        color: rec.color,
                                        fontSize: '12px', fontWeight: '600',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {rec.label} →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: '#fbbf24' }} /> Quick Start
            </h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
                marginBottom: '28px',
            }}>
                {quickActions.map(action => {
                    const Icon = action.icon;
                    return (
                        <button
                            key={action.id}
                            onClick={() => navigateTo(action.id)}
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '16px',
                                padding: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                textAlign: 'left',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)';
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = `0 8px 30px ${action.shadowColor}`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '12px',
                                background: action.gradient,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Icon size={22} style={{ color: 'white' }} />
                            </div>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                    {action.label}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                    {action.desc}
                                </div>
                            </div>
                            <ArrowRight size={16} style={{ color: 'var(--text-muted)', marginTop: 'auto' }} />
                        </button>
                    );
                })}
            </div>

            {/* Daily Tip */}
            <div className="glass-card" style={{
                padding: '18px 20px',
                marginBottom: '28px',
                borderLeft: '3px solid #8b5cf6',
            }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#a78bfa', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    💡 Tip of the Day
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {randomTip}
                </div>
            </div>

            {/* Skills Overview */}
            {stats?.skill_scores && (
                <div className="glass-card" style={{ padding: '20px', marginBottom: '28px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={18} style={{ color: '#22d3ee' }} /> Skills Overview
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(stats.skill_scores).map(([skill, score]) => {
                            const colors = {
                                grammar: '#8b5cf6',
                                vocabulary: '#ec4899',
                                pronunciation: '#06b6d4',
                                fluency: '#10b981',
                                confidence: '#f59e0b',
                            };
                            return (
                                <div key={skill}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '500', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                                            {skill}
                                        </span>
                                        <span style={{ fontSize: '12px', fontWeight: '600', color: colors[skill] }}>{score}/10</span>
                                    </div>
                                    <div className="skill-bar-bg">
                                        <div className="skill-bar-fill" style={{
                                            width: `${score * 10}%`,
                                            background: colors[skill],
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => navigateTo('progress')}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#a78bfa', fontSize: '13px', fontWeight: '600',
                            marginTop: '14px', display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                    >
                        View Full Progress <ArrowRight size={14} />
                    </button>
                </div>
            )}

            {/* Pulse animation for streak warning */}
            <style>{`
                @keyframes pulse-subtle {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                    50% { box-shadow: 0 0 12px 2px rgba(239, 68, 68, 0.15); }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;