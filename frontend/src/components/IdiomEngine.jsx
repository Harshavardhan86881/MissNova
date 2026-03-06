import React, { useState, useEffect } from 'react';
import { Lightbulb, Send, Loader2, AlertCircle, CheckCircle, RotateCcw, BookOpen, Shuffle, ArrowRight, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const CATEGORIES = ['All', 'Work', 'Relationships', 'Emotions', 'Negotiation', 'Daily Life', 'Academic'];

const IdiomEngine = ({ onStatsUpdate, onBadges }) => {
    const [dailyIdioms, setDailyIdioms] = useState([]);
    const [selectedIdiom, setSelectedIdiom] = useState(null);
    const [practiceMode, setPracticeMode] = useState(null); // 'guess' | 'fill' | 'use'
    const [userAnswer, setUserAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [learnedIdioms, setLearnedIdioms] = useState([]);
    const [showLearned, setShowLearned] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        Promise.all([
            authFetch('/api/idioms/daily').then(r => r.json()),
            authFetch('/api/idioms/bank').then(r => r.json()),
        ]).then(([daily, bank]) => {
            setDailyIdioms(daily.idioms || []);
            setLearnedIdioms(bank.idioms_learned || []);
        }).catch(() => {}).finally(() => setInitialLoading(false));
    }, []);

    const startPractice = (idiom, mode) => {
        setSelectedIdiom(idiom);
        setPracticeMode(mode);
        setUserAnswer('');
        setResult(null);
        setError(null);
    };

    const submitPractice = async () => {
        if (!userAnswer.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await authFetch('/api/idioms/practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idiom_id: selectedIdiom.id,
                    idiom: selectedIdiom.idiom,
                    meaning: selectedIdiom.meaning,
                    mode: practiceMode,
                    answer: userAnswer.trim(),
                }),
            });
            if (!res.ok) throw new Error('Practice failed');
            const data = await res.json();
            setResult(data);
            if (data.correct && !learnedIdioms.find(l => l.idiom === selectedIdiom.idiom)) {
                setLearnedIdioms(prev => [...prev, { ...selectedIdiom, learned_at: new Date().toISOString() }]);
            }
            onStatsUpdate?.();
            if (data.new_badges?.length) onBadges?.(data.new_badges);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const resetPractice = () => {
        setSelectedIdiom(null);
        setPracticeMode(null);
        setUserAnswer('');
        setResult(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitPractice(); }
    };

    const getModeInfo = (mode) => {
        if (mode === 'guess') return { label: 'Guess the Meaning', color: '#8b5cf6', desc: 'What does this idiom mean?' };
        if (mode === 'fill') return { label: 'Fill in the Blank', color: '#f59e0b', desc: 'Complete the sentence with the right idiom' };
        return { label: 'Use in a Sentence', color: '#10b981', desc: 'Write a natural sentence using this idiom' };
    };

    const filteredIdioms = activeCategory === 'All' ? dailyIdioms : dailyIdioms.filter(i => i.category === activeCategory);

    if (initialLoading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} /></div>;

    return (
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lightbulb size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Idioms & Collocations</h1>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Sound natural — master the phrases native speakers actually use</p>
                    </div>
                </div>
            </div>

            {/* Practice Mode Active */}
            {selectedIdiom && practiceMode && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <button onClick={resetPractice} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 }}>
                        ← Back to idioms
                    </button>

                    <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <span style={{ padding: '4px 12px', borderRadius: 20, background: `${getModeInfo(practiceMode).color}20`, color: getModeInfo(practiceMode).color, fontSize: 12, fontWeight: 700 }}>{getModeInfo(practiceMode).label}</span>
                        </div>

                        {/* Show idiom based on mode */}
                        <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                                "{selectedIdiom.idiom}"
                            </div>
                            {practiceMode !== 'guess' && (
                                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                                    <strong>Meaning:</strong> {selectedIdiom.meaning}
                                </div>
                            )}
                            <div style={{ fontSize: 12, marginTop: 8, padding: '4px 10px', borderRadius: 20, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', display: 'inline-block' }}>{selectedIdiom.category}</div>
                        </div>

                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>{getModeInfo(practiceMode).desc}</div>

                        <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} onKeyDown={handleKeyDown} placeholder={practiceMode === 'guess' ? 'What do you think this idiom means?' : practiceMode === 'fill' ? 'Write a sentence using this idiom...' : 'Write a natural sentence with this idiom...'} rows={3} style={{ width: '100%', padding: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />

                        <button onClick={submitPractice} disabled={loading || !userAnswer.trim()} style={{ width: '100%', marginTop: 14, padding: '14px 20px', borderRadius: 12, border: 'none', background: loading || !userAnswer.trim() ? 'var(--border-color)' : `linear-gradient(135deg, ${getModeInfo(practiceMode).color}, ${getModeInfo(practiceMode).color}cc)`, color: 'white', fontWeight: 700, fontSize: 14, cursor: loading || !userAnswer.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Checking...</> : <><Send size={16} /> Submit</>}
                        </button>
                    </div>

                    {/* Result */}
                    {result && (
                        <div className="glass-card" style={{ padding: 24, animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                {result.correct ? <CheckCircle size={22} color="#22c55e" /> : <AlertCircle size={22} color="#f59e0b" />}
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: result.correct ? '#22c55e' : '#f59e0b' }}>
                                    {result.correct ? 'Well done!' : 'Not quite — here\'s the right take:'}
                                </h3>
                            </div>
                            <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 14 }}>{result.feedback}</div>
                            {result.example_usage && (
                                <div style={{ padding: 14, background: 'rgba(16,185,129,0.08)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)', marginBottom: 12 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 4 }}>Native Usage Example:</div>
                                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontStyle: 'italic' }}>"{result.example_usage}"</div>
                                </div>
                            )}
                            {result.usage_tip && (
                                <div style={{ padding: 12, background: 'rgba(245,158,11,0.08)', borderRadius: 10, fontSize: 13, color: 'var(--text-primary)' }}>💡 {result.usage_tip}</div>
                            )}
                            <button onClick={resetPractice} style={{ marginTop: 16, width: '100%', padding: '12px 20px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                                <RotateCcw size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Try Another Idiom
                            </button>
                        </div>
                    )}

                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}
                </div>
            )}

            {/* Idiom Browse (non-practice) */}
            {!selectedIdiom && (
                <>
                    {/* Category Filter */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                        {CATEGORIES.map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '6px 14px', borderRadius: 20, border: activeCategory === cat ? '2px solid #f59e0b' : '1px solid var(--border-color)', background: activeCategory === cat ? 'rgba(245,158,11,0.1)' : 'transparent', color: activeCategory === cat ? '#f59e0b' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Daily Idiom Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {filteredIdioms.map(idiom => {
                            const learned = learnedIdioms.some(l => l.idiom === idiom.idiom);
                            return (
                                <div key={idiom.id} className="glass-card" style={{ padding: 20, borderLeft: learned ? '4px solid #22c55e' : '4px solid #f59e0b' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                        <div>
                                            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>"{idiom.idiom}"</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{idiom.meaning}</div>
                                        </div>
                                        {learned && <Star size={16} style={{ color: '#22c55e', flexShrink: 0 }} fill="#22c55e" />}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 12 }}>"{idiom.example}"</div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button onClick={() => startPractice(idiom, 'guess')} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)', color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🤔 Guess Meaning</button>
                                        <button onClick={() => startPractice(idiom, 'fill')} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✍️ Fill Blank</button>
                                        <button onClick={() => startPractice(idiom, 'use')} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>💬 Use in Sentence</button>
                                    </div>
                                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>{idiom.category}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredIdioms.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No idioms in this category today. Check back tomorrow!</div>
                    )}

                    {/* Learned Idioms Bank */}
                    {learnedIdioms.length > 0 && (
                        <div className="glass-card" style={{ padding: 20, marginTop: 24 }}>
                            <button onClick={() => setShowLearned(!showLearned)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0 }}>
                                <span style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BookOpen size={16} /> Learned Idioms ({learnedIdioms.length})
                                </span>
                                {showLearned ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {showLearned && (
                                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {learnedIdioms.map((idiom, i) => (
                                        <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>"{idiom.idiom}"</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>— {idiom.meaning}</span>
                                            </div>
                                            <Star size={14} fill="#22c55e" color="#22c55e" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
};

export default IdiomEngine;
