import React, { useState, useEffect } from 'react';
import { Target, CheckCircle, Circle, Flame, Clock, Edit3, X, Save, TrendingUp } from 'lucide-react';
import { trackEvent, EVENTS } from '../utils/analytics';

/**
 * Goals System Component
 * Addresses: "No Goal Setting" gap (High Priority)
 * Impact: Session Frequency ↑, DAU/MAU ↑
 */

const GOAL_TYPES = {
    daily_practice: {
        id: 'daily_practice',
        label: 'Daily Practice',
        icon: '🎯',
        unit: 'minutes',
        targets: [5, 10, 15, 20, 30],
        description: 'Practice for at least X minutes each day',
    },
    weekly_sessions: {
        id: 'weekly_sessions',
        label: 'Weekly Sessions',
        icon: '📊',
        unit: 'sessions',
        targets: [3, 5, 7, 10, 14],
        description: 'Complete X practice sessions this week',
    },
    weekly_words: {
        id: 'weekly_words',
        label: 'Words Learned',
        icon: '📚',
        unit: 'words',
        targets: [5, 10, 15, 20, 30],
        description: 'Learn X new vocabulary words this week',
    },
    streak_target: {
        id: 'streak_target',
        label: 'Streak Goal',
        icon: '🔥',
        unit: 'days',
        targets: [7, 14, 30, 60, 100],
        description: 'Maintain a X-day practice streak',
    },
};

const GoalsWidget = ({ stats, onUpdate }) => {
    const [goals, setGoals] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editGoal, setEditGoal] = useState(null);

    useEffect(() => {
        // Load goals from localStorage
        const saved = localStorage.getItem('voice_tutor_goals');
        if (saved) {
            setGoals(JSON.parse(saved));
        }
    }, []);

    const saveGoals = (newGoals) => {
        localStorage.setItem('voice_tutor_goals', JSON.stringify(newGoals));
        setGoals(newGoals);
        trackEvent(EVENTS.GOAL_SET, { goals: newGoals.length });
    };

    const addGoal = (type, target) => {
        const newGoal = {
            id: `${type}_${Date.now()}`,
            type,
            target,
            createdAt: new Date().toISOString(),
            weekStart: getWeekStart(),
        };
        const newGoals = [...goals, newGoal];
        saveGoals(newGoals);
        setEditGoal(null);
        setIsEditing(false);
    };

    const removeGoal = (goalId) => {
        const newGoals = goals.filter(g => g.id !== goalId);
        saveGoals(newGoals);
    };

    const getWeekStart = () => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(now.setDate(diff)).toISOString().split('T')[0];
    };

    const getGoalProgress = (goal) => {
        if (!stats) return { current: 0, target: goal.target, percent: 0 };

        const weekStart = getWeekStart();
        const isNewWeek = goal.weekStart !== weekStart;

        // Reset weekly goals on new week
        if (isNewWeek && ['weekly_sessions', 'weekly_words'].includes(goal.type)) {
            return { current: 0, target: goal.target, percent: 0, reset: true };
        }

        switch (goal.type) {
            case 'daily_practice':
                // Assume ~2 min per session, multiply by today's sessions
                const todayMinutes = stats.session_count * 2; // Rough estimate
                return { current: Math.min(todayMinutes, goal.target), target: goal.target, percent: Math.min((todayMinutes / goal.target) * 100, 100) };

            case 'weekly_sessions':
                return { current: stats.session_count || 0, target: goal.target, percent: Math.min(((stats.session_count || 0) / goal.target) * 100, 100) };

            case 'weekly_words':
                return { current: stats.vocabulary_count || 0, target: goal.target, percent: Math.min(((stats.vocabulary_count || 0) / goal.target) * 100, 100) };

            case 'streak_target':
                return { current: stats.streak_days || 0, target: goal.target, percent: Math.min(((stats.streak_days || 0) / goal.target) * 100, 100) };

            default:
                return { current: 0, target: goal.target, percent: 0 };
        }
    };

    const isGoalComplete = (goal) => {
        const progress = getGoalProgress(goal);
        return progress.current >= goal.target;
    };

    if (!isEditing && goals.length === 0) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(236, 72, 153, 0.05))',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                marginBottom: '24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Target size={24} style={{ color: '#8b5cf6' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Set Your Goals</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>
                    Setting goals helps you stay motivated and track your progress. What do you want to achieve?
                </p>
                <button
                    onClick={() => setIsEditing(true)}
                    className="btn-primary"
                    style={{ padding: '12px 24px' }}
                >
                    <Target size={16} /> Create Your First Goal
                </button>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={20} style={{ color: '#8b5cf6' }} />
                    My Goals
                </h3>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    {isEditing ? <X size={14} /> : <Edit3 size={14} />}
                    {isEditing ? 'Cancel' : 'Edit'}
                </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
                {goals.map(goal => {
                    const progress = getGoalProgress(goal);
                    const complete = isGoalComplete(goal);
                    const config = GOAL_TYPES[goal.type];

                    return (
                        <div key={goal.id} style={{
                            background: complete
                                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05))'
                                : 'var(--bg-card)',
                            borderRadius: '12px',
                            padding: '16px',
                            border: complete ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '20px' }}>{config?.icon || '🎯'}</span>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{config?.label || 'Goal'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{config?.description}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {complete && <CheckCircle size={18} style={{ color: '#22c55e' }} />}
                                    {isEditing && (
                                        <button
                                            onClick={() => removeGoal(goal.id)}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '4px 8px',
                                                fontSize: '11px',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
                                    <span style={{ fontWeight: '600' }}>
                                        {progress.current} / {progress.target} {config?.unit || ''}
                                    </span>
                                </div>
                                <div style={{
                                    height: '6px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${progress.percent}%`,
                                        background: complete
                                            ? 'linear-gradient(90deg, #22c55e, #10b981)'
                                            : 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                                        borderRadius: '3px',
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {isEditing && goals.length < 3 && (
                    <div style={{
                        background: 'rgba(139, 92, 246, 0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px dashed rgba(139, 92, 246, 0.3)',
                    }}>
                        <div style={{ marginBottom: '12px', fontWeight: '600', fontSize: '14px' }}>Add a New Goal</div>
                        <div style={{ display: 'grid', gap: '8px' }}>
                            {Object.entries(GOAL_TYPES).map(([key, config]) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '16px' }}>{config.icon}</span>
                                    <span style={{ fontSize: '13px', flex: '1' }}>{config.label}</span>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {config.targets.slice(0, 3).map(target => (
                                            <button
                                                key={target}
                                                onClick={() => addGoal(key, target)}
                                                style={{
                                                    background: 'rgba(139, 92, 246, 0.15)',
                                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                                    borderRadius: '6px',
                                                    padding: '4px 10px',
                                                    fontSize: '11px',
                                                    color: '#c4b5fd',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {target} {config.unit}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoalsWidget;