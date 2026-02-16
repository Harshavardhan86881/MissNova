import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles, Volume2, ChevronRight, ChevronLeft, Send, CheckCircle,
    Loader2, AlertCircle, BookOpen, Star, Lightbulb, ArrowRight
} from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const DailyVocab = ({ onStatsUpdate, onBadges, language = 'english' }) => {
    const [vocabData, setVocabData] = useState(null);
    const [selectedWord, setSelectedWord] = useState(null);
    const [practiceInput, setPracticeInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        fetchVocab();
    }, []);

    const fetchVocab = () => {
        authFetch('/api/daily-vocab')
            .then(r => r.json())
            .then(setVocabData)
            .catch(() => { });
    };

    const speakWord = (text) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.8;
        u.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const pref = voices.find(v => v.name.includes('Google US English') || v.name.includes('Female'));
        if (pref) u.voice = pref;
        window.speechSynthesis.speak(u);
    };

    const handlePractice = async (e) => {
        e.preventDefault();
        if (!practiceInput.trim() || loading || !selectedWord) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await authFetch('/api/vocab-practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word: selectedWord.word,
                    sentence: practiceInput.trim(),
                    definition: selectedWord.definition,
                }),
            });
            if (!res.ok) throw new Error('Failed to evaluate');
            const data = await res.json();
            setResult(data);
            if (data.new_badges) onBadges(data.new_badges);
            onStatsUpdate();
            fetchVocab(); // Refresh practiced status
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!vocabData) {
        return (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p>Loading today's vocabulary...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const categories = ['All', ...new Set(vocabData.words.map(w => w.category))];
    const filteredWords = vocabData.words.filter(w => filter === 'All' || w.category === filter);

    const getLevelColor = (level) => {
        switch (level) {
            case 'Beginner': return { bg: 'rgba(16,185,129,0.1)', color: '#34d399', border: 'rgba(16,185,129,0.2)' };
            case 'Intermediate': return { bg: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: 'rgba(245,158,11,0.2)' };
            case 'Advanced': return { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.2)' };
            default: return { bg: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: 'rgba(139,92,246,0.2)' };
        }
    };

    const getCategoryIcon = (category) => {
        const icons = { Business: '💼', Academic: '📚', Social: '🗣️', Emotional: '❤️', 'Daily Life': '🌟', Descriptive: '🎨' };
        return icons[category] || '📖';
    };

    // Detail view for a selected word
    if (selectedWord) {
        const levelStyle = getLevelColor(selectedWord.level);
        return (
            <div style={{ maxWidth: '650px', margin: '0 auto' }}>
                <button
                    onClick={() => { setSelectedWord(null); setResult(null); setPracticeInput(''); setError(null); }}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                        gap: '6px', fontSize: '13px', marginBottom: '20px',
                    }}
                >
                    <ChevronLeft size={16} /> Back to Today's Words
                </button>

                {/* Word Card */}
                <div className="glass-card" style={{ padding: '28px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <h2 style={{ fontSize: '28px', fontWeight: '900' }} className="gradient-text">
                                    {selectedWord.word}
                                </h2>
                                <button onClick={() => speakWord(selectedWord.word)} style={{
                                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                                    borderRadius: '50%', padding: '6px', cursor: 'pointer', color: '#a78bfa',
                                }}>
                                    <Volume2 size={16} />
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{
                                    fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px',
                                    background: levelStyle.bg, color: levelStyle.color, border: `1px solid ${levelStyle.border}`,
                                }}>
                                    {selectedWord.level}
                                </span>
                                <span style={{
                                    fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px',
                                    background: 'rgba(139,92,246,0.06)', color: 'var(--text-muted)',
                                    border: '1px solid rgba(139,92,246,0.1)',
                                }}>
                                    {getCategoryIcon(selectedWord.category)} {selectedWord.category}
                                </span>
                            </div>
                        </div>
                        {selectedWord.practiced && (
                            <CheckCircle size={24} style={{ color: '#34d399' }} />
                        )}
                    </div>

                    {/* Definition */}
                    <div style={{
                        background: 'rgba(139,92,246,0.04)', borderRadius: '14px', padding: '16px',
                        borderLeft: '3px solid #a78bfa', marginBottom: '20px',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#a78bfa', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Definition
                        </div>
                        <p style={{ fontSize: '16px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                            {selectedWord.definition}
                        </p>
                    </div>

                    {/* Examples */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BookOpen size={14} style={{ color: '#22d3ee' }} />
                            Example Sentences
                        </div>
                        {selectedWord.examples.map((ex, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: '10px',
                                padding: '10px 14px', borderRadius: '10px',
                                background: i % 2 === 0 ? 'rgba(0,0,0,0.15)' : 'transparent',
                                marginBottom: '4px',
                            }}>
                                <button onClick={() => speakWord(ex)} style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#22d3ee', padding: '2px', marginTop: '1px', flexShrink: 0
                                }}>
                                    <Volume2 size={12} />
                                </button>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', fontStyle: 'italic' }}>
                                    "{ex}"
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Usage Tips */}
                    <div style={{
                        background: 'rgba(245,158,11,0.05)', borderRadius: '12px',
                        padding: '14px 16px', border: '1px solid rgba(245,158,11,0.12)', marginBottom: '20px',
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lightbulb size={14} /> Where & When to Use
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            {selectedWord.usage_tips}
                        </p>
                    </div>

                    {/* Synonyms & Antonyms */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ background: 'rgba(16,185,129,0.04)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(16,185,129,0.1)' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#34d399', marginBottom: '8px' }}>✅ Synonyms</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {selectedWord.synonyms.map((s, i) => (
                                    <span key={i} style={{
                                        fontSize: '12px', padding: '4px 10px', borderRadius: '20px',
                                        background: 'rgba(16,185,129,0.08)', color: '#34d399',
                                    }}>
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(239,68,68,0.04)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(239,68,68,0.1)' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#f87171', marginBottom: '8px' }}>❌ Antonyms</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(selectedWord.antonyms || []).length > 0 ? selectedWord.antonyms.map((a, i) => (
                                    <span key={i} style={{
                                        fontSize: '12px', padding: '4px 10px', borderRadius: '20px',
                                        background: 'rgba(239,68,68,0.08)', color: '#f87171',
                                    }}>
                                        {a}
                                    </span>
                                )) : (
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>None listed</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Practice Section */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} style={{ color: '#ec4899' }} />
                        Practice Using "{selectedWord.word}"
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Write a sentence using this word. Miss Nova will evaluate your usage and give feedback!
                    </p>

                    <form onSubmit={handlePractice} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                        <input
                            value={practiceInput}
                            onChange={e => setPracticeInput(e.target.value)}
                            placeholder={`Use "${selectedWord.word}" in a sentence...`}
                            disabled={loading}
                            style={{
                                flex: 1, padding: '14px 18px', background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border-subtle)', borderRadius: '14px',
                                color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!practiceInput.trim() || loading}
                            className="btn-primary"
                            style={{ padding: '14px 18px' }}
                        >
                            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
                        </button>
                    </form>

                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171', padding: '12px 16px', borderRadius: '12px', fontSize: '13px',
                            marginBottom: '16px',
                        }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {/* AI Result */}
                    {result && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Score */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '50px', height: '50px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: '900', fontSize: '20px',
                                    background: result.correct_usage ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: result.correct_usage ? '#34d399' : '#f87171',
                                    border: `2px solid ${result.correct_usage ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                }}>
                                    {result.score}/10
                                </div>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '15px' }}>
                                        {result.correct_usage ? '✅ Correct Usage!' : '❌ Not Quite Right'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '600' }}>
                                        +{result.xp_earned} XP earned
                                    </div>
                                </div>
                            </div>

                            {/* Feedback */}
                            <div style={{
                                background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '14px',
                            }}>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                    {result.feedback}
                                </p>
                            </div>

                            {/* Better sentence */}
                            {result.better_sentence && (
                                <div style={{
                                    background: 'rgba(16,185,129,0.04)', borderRadius: '12px',
                                    padding: '12px 14px', borderLeft: '3px solid #34d399',
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#34d399', marginBottom: '4px' }}>
                                        ✨ A Natural Way to Use It
                                    </div>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.5' }}>
                                        "{result.better_sentence}"
                                    </p>
                                </div>
                            )}

                            {/* Common mistakes */}
                            {result.common_mistakes && (
                                <div style={{
                                    background: 'rgba(245,158,11,0.04)', borderRadius: '12px',
                                    padding: '12px 14px', borderLeft: '3px solid #fbbf24',
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#fbbf24', marginBottom: '4px' }}>
                                        ⚠️ Common Mistakes
                                    </div>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                        {result.common_mistakes}
                                    </p>
                                </div>
                            )}

                            {/* Extra tip */}
                            {result.extra_tip && (
                                <div style={{
                                    background: 'rgba(139,92,246,0.04)', borderRadius: '12px',
                                    padding: '12px 14px', borderLeft: '3px solid #a78bfa',
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#a78bfa', marginBottom: '4px' }}>
                                        💡 Pro Tip
                                    </div>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                        {result.extra_tip}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => { setResult(null); setPracticeInput(''); }}
                                className="btn-secondary"
                                style={{ alignSelf: 'center', marginTop: '6px' }}
                            >
                                Try Another Sentence
                            </button>
                        </div>
                    )}
                </div>

                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // Word list view
    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <Sparkles size={26} style={{ color: '#fbbf24' }} /> Daily Vocabulary
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Learn {vocabData.total} new words today — new words every day!
                </p>
            </div>

            {/* Progress Bar */}
            <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Today's Progress
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fbbf24' }}>
                        {vocabData.practiced_count}/{vocabData.total} words practiced
                    </span>
                </div>
                <div className="xp-bar-bg" style={{ height: '10px' }}>
                    <div className="xp-bar-fill" style={{
                        width: `${(vocabData.practiced_count / vocabData.total) * 100}%`,
                        background: 'linear-gradient(90deg, #f59e0b, #ec4899)',
                    }} />
                </div>
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`tab-btn ${filter === cat ? 'active' : ''}`}
                    >
                        {cat !== 'All' ? getCategoryIcon(cat) + ' ' : ''}{cat}
                    </button>
                ))}
            </div>

            {/* Word Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '14px',
            }}>
                {filteredWords.map((word, i) => {
                    const levelStyle = getLevelColor(word.level);
                    return (
                        <div
                            key={i}
                            className="vocab-daily-card"
                            onClick={() => setSelectedWord(word)}
                            style={{
                                background: 'var(--bg-card)',
                                border: `1px solid ${word.practiced ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
                                borderRadius: '16px',
                                padding: '18px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.borderColor = '#a78bfa';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(139,92,246,0.15)';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.borderColor = word.practiced ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {word.practiced && (
                                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                    <CheckCircle size={18} style={{ color: '#34d399' }} />
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '22px' }}>{getCategoryIcon(word.category)}</span>
                                <span style={{
                                    fontSize: '10px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px',
                                    background: levelStyle.bg, color: levelStyle.color,
                                }}>
                                    {word.level}
                                </span>
                            </div>

                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
                                {word.word}
                            </h3>

                            <p style={{
                                fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5',
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}>
                                {word.definition}
                            </p>

                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px',
                                color: '#a78bfa', fontSize: '11px', fontWeight: '600',
                            }}>
                                Learn & Practice <ArrowRight size={12} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DailyVocab;
