import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight, Filter, Search, Star, Sparkles } from 'lucide-react';
import { trackFeatureUse } from '../utils/analytics';
import { authFetch } from '../utils/authFetch';

const DIFFICULTY_MAP = {
    'Beginner': 1,
    'Intermediate': 2,
    'Advanced': 3,
};

const LEVEL_RECOMMENDATIONS = {
    1: { min: 1, max: 2, label: 'Perfect for beginners', color: '#22c55e' },
    2: { min: 1, max: 2, label: 'Great for your level', color: '#22c55e' },
    3: { min: 1, max: 3, label: 'Good match', color: '#22c55e' },
    4: { min: 2, max: 3, label: 'Slightly challenging', color: '#fbbf24' },
    5: { min: 2, max: 3, label: 'Perfect for intermediates', color: '#22c55e' },
};

const getLevelRecommendation = (scenarioDiff, userLevel) => {
    const diffLevel = DIFFICULTY_MAP[scenarioDiff] || 2;
    const rec = LEVEL_RECOMMENDATIONS[userLevel] || LEVEL_RECOMMENDATIONS[3];
    
    if (diffLevel >= rec.min && diffLevel <= rec.max) {
        return { show: true, label: rec.label, color: rec.color };
    }
    if (diffLevel < rec.min) {
        return { show: false, label: 'Too easy for you', color: '#94a3b8' };
    }
    return { show: false, label: 'May be challenging', color: '#f59e0b' };
};

const Scenarios = ({ navigateTo, userLevel = 1 }) => {
    const [scenarios, setScenarios] = useState([]);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        trackFeatureUse('scenarios');
        authFetch('/api/scenarios')
            .then(r => r.json())
            .then(setScenarios)
            .catch(() => { });
        
        // Fetch user stats for adaptive recommendations
        authFetch('/api/stats')
            .then(r => r.json())
            .then(data => setStats(data))
            .catch(() => { });
    }, []);

    const userLvl = stats?.level || 1;
    const categories = ['All', ...new Set(scenarios.map(s => s.category))];

    const filtered = scenarios.filter(s => {
        const matchesFilter = filter === 'All' || s.category === filter;
        const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.description.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getDiffClass = (diff) => `diff-${diff.toLowerCase()}`;

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <MessageSquare size={26} style={{ color: '#ec4899' }} /> Practice Scenarios
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Practice real-life communication situations with AI roleplay
                </p>
            </div>

            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{
                    flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                    borderRadius: '12px', padding: '0 14px',
                }}>
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search scenarios..."
                        style={{
                            flex: 1, padding: '12px 0', background: 'none', border: 'none',
                            color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`tab-btn ${filter === cat ? 'active' : ''}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scenario Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
            }}>
                {filtered.map(scenario => {
                    const recommendation = getLevelRecommendation(scenario.difficulty, userLvl);
                    return (
                    <div
                        key={scenario.id}
                        className="scenario-card"
                        onClick={() => navigateTo('scenario-chat', scenario)}
                        style={{ position: 'relative' }}
                    >
                        {recommendation.show && (
                            <div style={{
                                position: 'absolute', top: -6, right: -6,
                                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                                borderRadius: '8px', padding: '4px 8px',
                                fontSize: '9px', fontWeight: '700', color: 'white',
                                display: 'flex', alignItems: 'center', gap: '4px',
                                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
                                zIndex: 1,
                            }}>
                                <Sparkles size={10} /> RECOMMENDED
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <span style={{ fontSize: '36px' }}>{scenario.icon}</span>
                            <span className={getDiffClass(scenario.difficulty)} style={{
                                fontSize: '10px', fontWeight: '600', padding: '4px 10px',
                                borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                                {scenario.difficulty}
                            </span>
                        </div>
                        <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
                            {scenario.title}
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '14px' }}>
                            {scenario.description}
                        </p>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            borderTop: '1px solid var(--border-subtle)', paddingTop: '12px',
                        }}>
                            <span style={{ fontSize: '11px', color: recommendation.color || 'var(--text-muted)' }}>
                                {recommendation.label}
                            </span>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                color: '#a78bfa', fontSize: '12px', fontWeight: '600',
                            }}>
                                Start <ArrowRight size={14} />
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div style={{
                    textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>No scenarios found</div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your search or filter</div>
                </div>
            )}
        </div>
    );
};

export default Scenarios;
