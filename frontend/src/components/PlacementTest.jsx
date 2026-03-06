import React, { useState, useRef } from 'react';
import { GraduationCap, ArrowRight, Loader2, AlertCircle, CheckCircle, RotateCcw, Mic, MicOff, Award, ChevronRight } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const CEFR_INFO = {
    A1: { label: 'Beginner', color: '#ef4444', desc: 'You can understand and use basic phrases. Ideal starting point!' },
    A2: { label: 'Elementary', color: '#f97316', desc: 'You can communicate in simple, routine tasks and describe your background.' },
    B1: { label: 'Intermediate', color: '#f59e0b', desc: 'You can deal with most travel situations and describe experiences.' },
    B2: { label: 'Upper Intermediate', color: '#22c55e', desc: 'You can interact fluently with native speakers and produce clear text.' },
    C1: { label: 'Advanced', color: '#06b6d4', desc: 'You can express yourself fluently and use language flexibly for professional purposes.' },
    C2: { label: 'Proficient', color: '#8b5cf6', desc: 'You can understand virtually everything and express yourself spontaneously with precision.' },
};

const PlacementTest = ({ onStatsUpdate, onBadges }) => {
    const [phase, setPhase] = useState('intro'); // intro | test | loading | result
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [existingResult, setExistingResult] = useState(null);

    // Check for existing placement on mount
    React.useEffect(() => {
        authFetch('/api/placement-test/result').then(r => r.json()).then(data => {
            if (data.cefr_level) setExistingResult(data);
        }).catch(() => {});
    }, []);

    const startTest = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authFetch('/api/placement-test/start');
            if (!res.ok) throw new Error('Failed to load test');
            const data = await res.json();
            setQuestions(data.questions);
            setAnswers([]);
            setCurrentQ(0);
            setCurrentAnswer('');
            setPhase('test');
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const submitAnswer = () => {
        if (!currentAnswer.trim()) return;
        const newAnswers = [...answers, { question_id: questions[currentQ].id, answer: currentAnswer.trim() }];
        setAnswers(newAnswers);
        setCurrentAnswer('');

        if (currentQ < questions.length - 1) {
            setCurrentQ(currentQ + 1);
        } else {
            submitTest(newAnswers);
        }
    };

    const submitTest = async (allAnswers) => {
        setPhase('loading');
        setError(null);
        try {
            const res = await authFetch('/api/placement-test/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: allAnswers }),
            });
            if (!res.ok) throw new Error('Evaluation failed');
            const data = await res.json();
            setResult(data);
            setExistingResult(data);
            setPhase('result');
            onStatsUpdate?.();
            if (data.new_badges?.length) onBadges?.(data.new_badges);
        } catch (e) {
            setError(e.message);
            setPhase('test');
        }
    };

    const retake = () => {
        setPhase('intro');
        setResult(null);
        setQuestions([]);
        setAnswers([]);
        setCurrentQ(0);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(); }
    };

    const cefrInfo = result ? CEFR_INFO[result.cefr_level] || CEFR_INFO['B1'] : null;

    return (
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <GraduationCap size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Placement Assessment</h1>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Discover your CEFR level — AI adapts to match your proficiency</p>
                    </div>
                </div>
            </div>

            {/* Intro Phase */}
            {phase === 'intro' && (
                <div>
                    {existingResult && (
                        <div className="glass-card" style={{ padding: 20, marginBottom: 20, borderLeft: `4px solid ${CEFR_INFO[existingResult.cefr_level]?.color || '#8b5cf6'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Award size={24} style={{ color: CEFR_INFO[existingResult.cefr_level]?.color }} />
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Current Level: {existingResult.cefr_level} — {CEFR_INFO[existingResult.cefr_level]?.label}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Assessed on {existingResult.date || 'previously'}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="glass-card" style={{ padding: 28 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>How It Works</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                            {[
                                { step: '1', text: 'Answer 5 questions of increasing difficulty' },
                                { step: '2', text: 'AI evaluates grammar, vocabulary range, and fluency' },
                                { step: '3', text: 'Get your CEFR level (A1 → C2) with personalized recommendations' },
                                { step: '4', text: 'Miss Nova adapts conversation complexity to your level' },
                            ].map(({ step, text }) => (
                                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>{step}</div>
                                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{text}</span>
                                </div>
                            ))}
                        </div>

                        {/* CEFR Level Overview */}
                        <div style={{ marginBottom: 24 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>CEFR Levels</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                                {Object.entries(CEFR_INFO).map(([level, info]) => (
                                    <div key={level} style={{ padding: '10px 14px', borderRadius: 10, background: `${info.color}11`, border: `1px solid ${info.color}33` }}>
                                        <div style={{ fontWeight: 800, color: info.color, fontSize: 16 }}>{level}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{info.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={startTest} disabled={loading} style={{ width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</> : <><GraduationCap size={18} /> {existingResult ? 'Retake Assessment' : 'Start Assessment'}</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Test Phase */}
            {phase === 'test' && questions.length > 0 && (
                <div className="glass-card" style={{ padding: 28 }}>
                    {/* Progress Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Question {currentQ + 1}/{questions.length}</span>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                            <div style={{ width: `${((currentQ + 1) / questions.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #ef4444)', borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600 }}>{questions[currentQ].difficulty}</span>
                    </div>

                    {/* Question */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 6 }}>{questions[currentQ].type}</div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>{questions[currentQ].prompt}</h2>
                    </div>

                    {/* Answer Input */}
                    <textarea value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your answer here..." rows={4} style={{ width: '100%', padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Press Enter to submit</span>
                        <button onClick={submitAnswer} disabled={!currentAnswer.trim()} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: !currentAnswer.trim() ? 'var(--border-color)' : 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white', fontWeight: 700, fontSize: 14, cursor: !currentAnswer.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {currentQ < questions.length - 1 ? <>Next <ArrowRight size={16} /></> : <>Submit <CheckCircle size={16} /></>}
                        </button>
                    </div>
                </div>
            )}

            {/* Loading Phase */}
            {phase === 'loading' && (
                <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
                    <Loader2 size={48} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Evaluating Your English...</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Our AI is analyzing grammar, vocabulary, fluency, and complexity</p>
                </div>
            )}

            {/* Result Phase */}
            {phase === 'result' && result && cefrInfo && (
                <div style={{ animation: 'fadeIn 0.4s ease' }}>
                    {/* Level Badge */}
                    <div className="glass-card" style={{ padding: 32, textAlign: 'center', marginBottom: 20, background: `linear-gradient(135deg, ${cefrInfo.color}15, ${cefrInfo.color}08)`, borderColor: `${cefrInfo.color}44` }}>
                        <div style={{ width: 100, height: 100, borderRadius: '50%', background: `linear-gradient(135deg, ${cefrInfo.color}, ${cefrInfo.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: `0 0 40px ${cefrInfo.color}44` }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>{result.cefr_level}</span>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: cefrInfo.color, marginBottom: 4 }}>{cefrInfo.label}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 500, margin: '0 auto' }}>{cefrInfo.desc}</p>
                        {result.overall_score != null && (
                            <div style={{ marginTop: 16, fontSize: 14, color: 'var(--text-muted)' }}>Overall Score: <strong style={{ color: cefrInfo.color }}>{result.overall_score}/100</strong></div>
                        )}
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div className="glass-card" style={{ padding: 20 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle size={15} /> Strengths
                            </h3>
                            {(result.strengths || []).map((s, i) => (
                                <div key={i} style={{ padding: '8px 12px', marginBottom: 6, borderRadius: 8, background: 'rgba(34,197,94,0.08)', color: 'var(--text-primary)', fontSize: 13 }}>✅ {s}</div>
                            ))}
                        </div>
                        <div className="glass-card" style={{ padding: 20 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertCircle size={15} /> Areas to Improve
                            </h3>
                            {(result.weaknesses || []).map((w, i) => (
                                <div key={i} style={{ padding: '8px 12px', marginBottom: 6, borderRadius: 8, background: 'rgba(245,158,11,0.08)', color: 'var(--text-primary)', fontSize: 13 }}>⚡ {w}</div>
                            ))}
                        </div>
                    </div>

                    {/* Recommendations */}
                    {result.recommendations && result.recommendations.length > 0 && (
                        <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>📋 Personalized Recommendations</h3>
                            {result.recommendations.map((r, i) => (
                                <div key={i} style={{ padding: '10px 14px', marginBottom: 8, borderRadius: 10, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', color: 'var(--text-primary)', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                    <ChevronRight size={14} style={{ color: '#8b5cf6', marginTop: 2, flexShrink: 0 }} /> {r}
                                </div>
                            ))}
                        </div>
                    )}

                    <button onClick={retake} style={{ width: '100%', padding: '14px 20px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <RotateCcw size={16} /> Retake Assessment
                    </button>
                </div>
            )}

            {error && phase !== 'intro' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
};

export default PlacementTest;
