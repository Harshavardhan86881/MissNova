import React, { useState, useEffect } from 'react';
import { PenTool, CheckCircle, AlertCircle, ArrowRight, Loader2, RotateCcw, BookOpen, ArrowLeft, Lightbulb, Send } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const GRAMMAR_TOPICS = [
    { id: 'articles', title: 'Articles (a/an/the)', icon: '📝', level: 'Beginner', desc: 'Master when to use a, an, the, or no article' },
    { id: 'tenses_present_perfect', title: 'Present Perfect vs Past Simple', icon: '⏰', level: 'Intermediate', desc: 'Know when to use "I have done" vs "I did"' },
    { id: 'prepositions', title: 'Prepositions', icon: '📍', level: 'Beginner', desc: 'Use in, on, at, to, for, with correctly' },
    { id: 'conditionals', title: 'Conditional Sentences', icon: '🔀', level: 'Intermediate', desc: 'If clauses: zero, first, second, third conditionals' },
    { id: 'subject_verb', title: 'Subject-Verb Agreement', icon: '🤝', level: 'Beginner', desc: 'Match singular/plural subjects with correct verbs' },
    { id: 'reported_speech', title: 'Reported Speech', icon: '💬', level: 'Advanced', desc: 'Convert direct speech to indirect speech accurately' },
    { id: 'passive_voice', title: 'Passive Voice', icon: '🔄', level: 'Intermediate', desc: 'When and how to use passive constructions' },
    { id: 'relative_clauses', title: 'Relative Clauses', icon: '🔗', level: 'Intermediate', desc: 'Use who, which, that, where, when correctly' },
    { id: 'modal_verbs', title: 'Modal Verbs', icon: '💪', level: 'Intermediate', desc: 'Can, could, should, would, might, must' },
    { id: 'countable_uncountable', title: 'Countable vs Uncountable', icon: '🔢', level: 'Beginner', desc: 'Much/many, few/little, some/any' },
];

const GrammarLessons = ({ onStatsUpdate, onBadges }) => {
    const [phase, setPhase] = useState('topics'); // topics | lesson | practice | result
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userSentence, setUserSentence] = useState('');
    const [practiceResult, setPracticeResult] = useState(null);
    const [completedTopics, setCompletedTopics] = useState([]);
    const [practiceIndex, setPracticeIndex] = useState(0);

    useEffect(() => {
        authFetch('/api/grammar-lessons/progress').then(r => r.json()).then(data => {
            setCompletedTopics(data.completed || []);
        }).catch(() => {});
    }, []);

    const loadLesson = async (topic) => {
        setSelectedTopic(topic);
        setLoading(true);
        setError(null);
        setLesson(null);
        setPracticeResult(null);
        setPracticeIndex(0);
        try {
            const res = await authFetch('/api/grammar-lesson/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic_id: topic.id }),
            });
            if (!res.ok) throw new Error('Failed to load lesson');
            const data = await res.json();
            setLesson(data);
            setPhase('lesson');
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const submitPractice = async () => {
        if (!userSentence.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await authFetch('/api/grammar-lesson/practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic_id: selectedTopic.id,
                    sentence: userSentence.trim(),
                    exercise: lesson.exercises?.[practiceIndex] || '',
                }),
            });
            if (!res.ok) throw new Error('Evaluation failed');
            const data = await res.json();
            setPracticeResult(data);
            setPhase('result');
            if (!completedTopics.includes(selectedTopic.id)) {
                setCompletedTopics(prev => [...prev, selectedTopic.id]);
            }
            onStatsUpdate?.();
            if (data.new_badges?.length) onBadges?.(data.new_badges);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const nextExercise = () => {
        if (lesson?.exercises && practiceIndex < lesson.exercises.length - 1) {
            setPracticeIndex(practiceIndex + 1);
            setUserSentence('');
            setPracticeResult(null);
            setPhase('practice');
        } else {
            backToTopics();
        }
    };

    const backToTopics = () => {
        setPhase('topics');
        setSelectedTopic(null);
        setLesson(null);
        setPracticeResult(null);
        setUserSentence('');
        setPracticeIndex(0);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitPractice(); }
    };

    const getLevelColor = (level) => {
        if (level === 'Beginner') return '#22c55e';
        if (level === 'Intermediate') return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PenTool size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Grammar Lessons</h1>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Fix recurring errors with targeted micro-lessons and practice</p>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Topics Grid */}
            {phase === 'topics' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{completedTopics.length}/{GRAMMAR_TOPICS.length} completed</span>
                        <div style={{ height: 6, flex: 1, maxWidth: 200, marginLeft: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                            <div style={{ width: `${(completedTopics.length / GRAMMAR_TOPICS.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #06b6d4)', borderRadius: 3 }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
                        {GRAMMAR_TOPICS.map(topic => {
                            const done = completedTopics.includes(topic.id);
                            return (
                                <button key={topic.id} onClick={() => loadLesson(topic)} disabled={loading} style={{ padding: 20, borderRadius: 14, border: done ? '2px solid rgba(16,185,129,0.3)' : '1px solid var(--border-color)', background: done ? 'rgba(16,185,129,0.06)' : 'var(--card-bg)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', position: 'relative' }}>
                                    {done && <CheckCircle size={16} style={{ position: 'absolute', top: 12, right: 12, color: '#10b981' }} />}
                                    <div style={{ fontSize: 24, marginBottom: 8 }}>{topic.icon}</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{topic.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{topic.desc}</div>
                                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${getLevelColor(topic.level)}15`, color: getLevelColor(topic.level), fontWeight: 600 }}>{topic.level}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Lesson View */}
            {phase === 'lesson' && lesson && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <button onClick={backToTopics} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 }}>
                        <ArrowLeft size={14} /> Back to topics
                    </button>

                    <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selectedTopic.icon} {selectedTopic.title}</h2>
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20, whiteSpace: 'pre-line' }}>{lesson.explanation}</div>

                        {lesson.examples && lesson.examples.length > 0 && (
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <BookOpen size={14} /> Examples
                                </h3>
                                {lesson.examples.map((ex, i) => (
                                    <div key={i} style={{ padding: '10px 14px', marginBottom: 6, borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)', fontSize: 14, color: 'var(--text-primary)' }}>
                                        {ex}
                                    </div>
                                ))}
                            </div>
                        )}

                        {lesson.common_mistakes && lesson.common_mistakes.length > 0 && (
                            <div style={{ marginBottom: 20 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 10 }}>❌ Common Mistakes</h3>
                                {lesson.common_mistakes.map((m, i) => (
                                    <div key={i} style={{ padding: '10px 14px', marginBottom: 6, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', fontSize: 13, color: 'var(--text-primary)' }}>{m}</div>
                                ))}
                            </div>
                        )}

                        <button onClick={() => setPhase('practice')} style={{ width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <PenTool size={16} /> Practice Now <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Practice Phase */}
            {phase === 'practice' && lesson && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <button onClick={() => setPhase('lesson')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 }}>
                        <ArrowLeft size={14} /> Back to lesson
                    </button>

                    <div className="glass-card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Practice Exercise {practiceIndex + 1}</h2>
                            {lesson.exercises && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{practiceIndex + 1} of {lesson.exercises.length}</span>}
                        </div>

                        <div style={{ padding: 16, background: 'rgba(139,92,246,0.08)', borderRadius: 12, border: '1px solid rgba(139,92,246,0.15)', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <Lightbulb size={16} style={{ color: '#a78bfa', marginTop: 2, flexShrink: 0 }} />
                                <span style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.5 }}>{lesson.exercises?.[practiceIndex] || `Write a sentence using ${selectedTopic.title} correctly.`}</span>
                            </div>
                        </div>

                        <textarea value={userSentence} onChange={(e) => setUserSentence(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your sentence here..." rows={3} style={{ width: '100%', padding: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />

                        <button onClick={submitPractice} disabled={loading || !userSentence.trim()} style={{ width: '100%', marginTop: 14, padding: '14px 20px', borderRadius: 12, border: 'none', background: loading || !userSentence.trim() ? 'var(--border-color)' : 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 14, cursor: loading || !userSentence.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Checking...</> : <><Send size={16} /> Submit</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Result Phase */}
            {phase === 'result' && practiceResult && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            {practiceResult.correct ? <CheckCircle size={24} color="#22c55e" /> : <AlertCircle size={24} color="#f59e0b" />}
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: practiceResult.correct ? '#22c55e' : '#f59e0b', margin: 0 }}>
                                {practiceResult.correct ? 'Correct!' : 'Almost there!'}
                            </h2>
                        </div>

                        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 16 }}>{practiceResult.explanation}</div>

                        {practiceResult.corrected_sentence && (
                            <div style={{ padding: 14, background: 'rgba(16,185,129,0.08)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)', marginBottom: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 4 }}>Corrected:</div>
                                <div style={{ fontSize: 15, color: 'var(--text-primary)' }}>{practiceResult.corrected_sentence}</div>
                            </div>
                        )}

                        {practiceResult.tip && (
                            <div style={{ padding: 14, background: 'rgba(139,92,246,0.08)', borderRadius: 10, border: '1px solid rgba(139,92,246,0.15)' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa', marginBottom: 4 }}>💡 Pro Tip:</div>
                                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{practiceResult.tip}</div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={nextExercise} style={{ flex: 1, padding: '14px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {lesson?.exercises && practiceIndex < lesson.exercises.length - 1 ? <>Next Exercise <ArrowRight size={16} /></> : <>Back to Topics <BookOpen size={16} /></>}
                        </button>
                    </div>
                </div>
            )}

            {/* Loading overlay */}
            {loading && phase === 'topics' && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Loader2 size={32} style={{ color: '#10b981', animation: 'spin 1s linear infinite' }} />
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
};

export default GrammarLessons;
