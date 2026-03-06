import React, { useState, useEffect } from 'react';
import { RotateCcw, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, ArrowRight, Trophy, BarChart2, Clock } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const RATING_BUTTONS = [
    { id: 'again', label: 'Again', color: '#ef4444', desc: 'Didn\'t know', shortcut: '1' },
    { id: 'hard', label: 'Hard', color: '#f59e0b', desc: 'Barely recalled', shortcut: '2' },
    { id: 'good', label: 'Good', color: '#22c55e', desc: 'Remembered', shortcut: '3' },
    { id: 'easy', label: 'Easy', color: '#06b6d4', desc: 'Instant recall', shortcut: '4' },
];

const SRSReview = ({ onStatsUpdate, onBadges }) => {
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ total: 0, due: 0, mastered: 0 });
    const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
    const [done, setDone] = useState(false);

    useEffect(() => {
        loadQueue();
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e) => {
            if (!showAnswer || done || submitting) return;
            const rating = RATING_BUTTONS.find(b => b.shortcut === e.key);
            if (rating) submitReview(rating.id);
            if (e.key === ' ') { e.preventDefault(); setShowAnswer(true); }
        };
        const handleFlip = (e) => {
            if (e.key === ' ' && !showAnswer && !done) { e.preventDefault(); setShowAnswer(true); }
        };
        window.addEventListener('keydown', showAnswer ? handleKey : handleFlip);
        return () => {
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('keydown', handleFlip);
        };
    }, [showAnswer, done, submitting, currentIndex]);

    const loadQueue = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authFetch('/api/srs/review-queue');
            if (!res.ok) throw new Error('Failed to load reviews');
            const data = await res.json();
            setQueue(data.words || []);
            setStats(data.stats || { total: 0, due: 0, mastered: 0 });
            setCurrentIndex(0);
            setShowAnswer(false);
            setDone(data.words?.length === 0);
            setSessionStats({ reviewed: 0, correct: 0 });
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const submitReview = async (rating) => {
        const word = queue[currentIndex];
        if (!word || submitting) return;
        setSubmitting(true);
        try {
            const res = await authFetch('/api/srs/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: word.word, rating }),
            });
            if (!res.ok) throw new Error('Review failed');
            const data = await res.json();
            setSessionStats(prev => ({
                reviewed: prev.reviewed + 1,
                correct: prev.correct + (rating === 'good' || rating === 'easy' ? 1 : 0),
            }));
            onStatsUpdate?.();
            if (data.new_badges?.length) onBadges?.(data.new_badges);

            // Next card
            if (currentIndex < queue.length - 1) {
                setCurrentIndex(currentIndex + 1);
                setShowAnswer(false);
            } else {
                setDone(true);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const currentWord = queue[currentIndex];

    if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} /><p style={{ marginTop: 12 }}>Loading review queue...</p></div>;

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RotateCcw size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Spaced Repetition Review</h1>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Review words at optimal intervals for long-term retention</p>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Due Today', value: stats.due, color: '#f59e0b', icon: Clock },
                    { label: 'Total Words', value: stats.total, color: '#8b5cf6', icon: BarChart2 },
                    { label: 'Mastered', value: stats.mastered, color: '#22c55e', icon: Trophy },
                ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <Icon size={18} style={{ color, marginBottom: 6 }} />
                        <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                    </div>
                ))}
            </div>

            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Session Complete */}
            {done && (
                <div className="glass-card" style={{ padding: 40, textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
                    {sessionStats.reviewed === 0 ? (
                        <>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>All caught up!</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>No words due for review right now. Keep practicing to add more words to your deck!</p>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#22c55e', marginBottom: 8 }}>Session Complete!</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                                Reviewed <strong>{sessionStats.reviewed}</strong> words • <strong>{sessionStats.correct}</strong> correct ({sessionStats.reviewed > 0 ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) : 0}%)
                            </p>
                        </>
                    )}
                    <button onClick={loadQueue} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        <RotateCcw size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Refresh Queue
                    </button>
                </div>
            )}

            {/* Flashcard */}
            {!done && currentWord && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    {/* Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{currentIndex + 1} / {queue.length}</span>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                            <div style={{ width: `${((currentIndex + 1) / queue.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                    </div>

                    {/* Card */}
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', cursor: !showAnswer ? 'pointer' : 'default', minHeight: 280, display: 'flex', flexDirection: 'column' }} onClick={() => !showAnswer && setShowAnswer(true)}>
                        {/* Front */}
                        <div style={{ padding: 40, textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>{currentWord.word}</div>
                            {currentWord.srs_interval && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
                                    Interval: {currentWord.srs_interval} day{currentWord.srs_interval !== 1 ? 's' : ''}
                                </div>
                            )}
                            {!showAnswer && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 14, marginTop: 12 }}>
                                    <Eye size={16} /> Click or press Space to reveal
                                </div>
                            )}
                        </div>

                        {/* Back (Answer) */}
                        {showAnswer && (
                            <div style={{ padding: '24px 40px', background: 'rgba(139,92,246,0.05)', borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.3s ease' }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#8b5cf6', marginBottom: 8 }}>Definition</div>
                                <div style={{ fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 12 }}>{currentWord.definition}</div>
                                {currentWord.example && (
                                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                                        "{currentWord.example}"
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Rating Buttons */}
                    {showAnswer && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16, animation: 'fadeIn 0.2s ease' }}>
                            {RATING_BUTTONS.map(btn => (
                                <button key={btn.id} onClick={() => submitReview(btn.id)} disabled={submitting} style={{ padding: '14px 8px', borderRadius: 12, border: `2px solid ${btn.color}44`, background: `${btn.color}10`, color: btn.color, fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                                    <div>{btn.label}</div>
                                    <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>{btn.desc}</div>
                                    <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>({btn.shortcut})</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
};

export default SRSReview;
