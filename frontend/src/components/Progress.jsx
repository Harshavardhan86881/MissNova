import React, { useState, useEffect } from 'react';
import {
    Trophy, Zap, Flame, MessageSquare, BookOpen,
    TrendingUp, Award, Target, Star, Lock, Languages
} from 'lucide-react';
import ShareButton from './ShareButton';
import { authFetch } from '../utils/authFetch';

const Progress = () => {
    const [progress, setProgress] = useState(null);
    const [allBadges, setAllBadges] = useState([]);

    useEffect(() => {
        authFetch('/api/progress').then(r => r.json()).then(setProgress).catch(() => { });
        authFetch('/api/badges').then(r => r.json()).then(setAllBadges).catch(() => { });
    }, []);

    const ALL_POSSIBLE_BADGES = [
        { id: "first_chat", name: "First Words", icon: "🎯", description: "Complete your first conversation" },
        { id: "10_sessions", name: "Chatterbox", icon: "💬", description: "Complete 10 conversations" },
        { id: "50_sessions", name: "Conversation Master", icon: "👑", description: "Complete 50 conversations" },
        { id: "100_words", name: "Word Explorer", icon: "📝", description: "Speak 100 words" },
        { id: "1000_words", name: "Wordsmith", icon: "✍️", description: "Speak 1000 words" },
        { id: "5000_words", name: "Eloquent Speaker", icon: "🎙️", description: "Speak 5000 words" },
        { id: "streak_3", name: "Consistent", icon: "🔥", description: "3-day practice streak" },
        { id: "streak_7", name: "Dedicated", icon: "⚡", description: "7-day practice streak" },
        { id: "streak_30", name: "Unstoppable", icon: "🏆", description: "30-day practice streak" },
        { id: "high_score", name: "Perfect Score", icon: "💯", description: "Get a 10/10 fluency score" },
        { id: "vocab_10", name: "Vocab Builder", icon: "📚", description: "Learn 10 new words" },
        { id: "vocab_50", name: "Dictionary", icon: "📖", description: "Learn 50 new words" },
        { id: "scenario_5", name: "Role Player", icon: "🎭", description: "Try 5 different scenarios" },
        { id: "twister_5", name: "Tongue Master", icon: "👅", description: "Complete 5 tongue twisters" },
        { id: "level_5", name: "Rising Star", icon: "⭐", description: "Reach Level 5" },
        { id: "level_10", name: "Communication Pro", icon: "🌟", description: "Reach Level 10" },
    ];

    if (!progress) {
        return (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                Loading progress...
            </div>
        );
    }

    const earnedIds = allBadges.map(b => b.id);
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const skillColors = {
        grammar: '#8b5cf6',
        vocabulary: '#ec4899',
        pronunciation: '#06b6d4',
        fluency: '#10b981',
        confidence: '#f59e0b',
    };

    const maxAccuracy = Math.max(...(progress.accuracy_history || [1]), 10);
    const accuracyHistory = progress.accuracy_history || [];

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <Trophy size={26} style={{ color: '#fbbf24' }} /> Your Progress
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        Track your communication learning journey
                    </p>
                </div>
                <ShareButton stats={progress || {}} variant="button" />
            </div>

            {/* Top Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                marginBottom: '28px',
            }}>
                {[
                    { icon: Zap, label: 'Total XP', value: progress.xp?.toLocaleString(), color: '#fbbf24' },
                    { icon: Star, label: 'Level', value: progress.level, color: '#a78bfa' },
                    { icon: Flame, label: 'Streak', value: `${progress.streak_days} days`, color: '#f97316' },
                    { icon: MessageSquare, label: 'Sessions', value: progress.session_count, color: '#22d3ee' },
                    { icon: TrendingUp, label: 'Words', value: progress.words_spoken?.toLocaleString(), color: '#34d399' },
                    { icon: BookOpen, label: 'Vocab', value: progress.vocabulary_count, color: '#f472b6' },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
                            <Icon size={20} style={{ color: s.color, marginBottom: '6px' }} />
                            <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Level Progress */}
            <div className="glass-card" style={{ padding: '22px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '50px', height: '50px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', fontWeight: '900', color: 'white',
                        }}>
                            {progress.level}
                        </div>
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '18px' }}>Level {progress.level}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {progress.xp_for_next_level - progress.xp_in_level} XP to level {progress.level + 1}
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#a78bfa' }}>
                        {progress.xp_in_level}/{progress.xp_for_next_level}
                    </div>
                </div>
                <div className="xp-bar-bg" style={{ height: '12px' }}>
                    <div className="xp-bar-fill progress-fill" style={{
                        width: `${(progress.xp_in_level / progress.xp_for_next_level) * 100}%`
                    }} />
                </div>
            </div>

            {/* Two columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '28px' }}>

                {/* Skills */}
                <div className="glass-card" style={{ padding: '22px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Target size={18} style={{ color: '#22d3ee' }} /> Communication Skills
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {Object.entries(progress.skill_scores || {}).map(([skill, score]) => (
                            <div key={skill}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '500', textTransform: 'capitalize' }}>
                                        {skill}
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: skillColors[skill] }}>
                                        {score}/10
                                    </span>
                                </div>
                                <div className="skill-bar-bg">
                                    <div className="skill-bar-fill" style={{
                                        width: `${score * 10}%`,
                                        background: skillColors[skill],
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fluency Trend */}
                <div className="glass-card" style={{ padding: '22px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={18} style={{ color: '#34d399' }} /> Fluency Trend
                    </h3>
                    {accuracyHistory.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '140px', padding: '0 4px' }}>
                            {accuracyHistory.map((score, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{score}</span>
                                    <div
                                        className="chart-bar"
                                        style={{
                                            width: '100%',
                                            maxWidth: '28px',
                                            height: `${(score / 10) * 100}%`,
                                            minHeight: '4px',
                                            background: score >= 8 ? 'linear-gradient(to top, #059669, #34d399)'
                                                : score >= 5 ? 'linear-gradient(to top, #d97706, #fbbf24)'
                                                    : 'linear-gradient(to top, #dc2626, #f87171)',
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '13px' }}>
                            No data yet. Start practicing!
                        </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                        Last {accuracyHistory.length} sessions
                    </div>
                </div>
            </div>

            {/* Scenario Progress */}
            <div className="glass-card" style={{ padding: '22px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} style={{ color: '#ec4899' }} /> Scenario Progress
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {progress.scenarios_completed} of {progress.total_scenarios} completed
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#ec4899' }}>
                        {Math.round((progress.scenarios_completed / progress.total_scenarios) * 100)}%
                    </span>
                </div>
                <div className="xp-bar-bg" style={{ height: '10px' }}>
                    <div style={{
                        height: '100%', borderRadius: '999px',
                        background: 'linear-gradient(90deg, #ec4899, #f472b6)',
                        width: `${(progress.scenarios_completed / progress.total_scenarios) * 100}%`,
                        transition: 'width 0.8s ease',
                    }} />
                </div>
            </div>

            {/* Badges */}
            <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={20} style={{ color: '#fbbf24' }} /> Achievements
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>
                        ({allBadges.length}/{ALL_POSSIBLE_BADGES.length})
                    </span>
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '12px',
                }}>
                    {ALL_POSSIBLE_BADGES.map(badge => {
                        const isEarned = earnedIds.includes(badge.id);
                        return (
                            <div key={badge.id} className={`badge-card ${isEarned ? 'earned' : 'locked'}`}>
                                <div style={{ fontSize: '32px', marginBottom: '8px', position: 'relative' }}>
                                    {badge.icon}
                                    {!isEarned && (
                                        <Lock size={14} style={{
                                            position: 'absolute', bottom: '-2px', right: 'calc(50% - 18px)',
                                            color: 'var(--text-muted)',
                                        }} />
                                    )}
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                                    {badge.name}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                    {badge.description}
                                </div>
                                {isEarned && (
                                    <div style={{ fontSize: '9px', color: '#34d399', marginTop: '6px', fontWeight: '600' }}>
                                        ✓ Earned
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Progress;
