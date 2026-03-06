import React, { useState, useEffect } from 'react';
import { Edit3, Send, Loader2, AlertCircle, CheckCircle, RotateCcw, FileText, ArrowRight, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const FORMATS = [
    { id: 'formal_email', label: 'Formal Email', emoji: '📧', desc: 'Business correspondence, requests, follow-ups', level: 'Intermediate' },
    { id: 'linkedin_message', label: 'LinkedIn Message', emoji: '💼', desc: 'Networking, connection requests, outreach', level: 'Intermediate' },
    { id: 'essay_paragraph', label: 'Essay Paragraph', emoji: '📝', desc: 'Academic writing, argumentative or descriptive', level: 'Advanced' },
    { id: 'complaint_letter', label: 'Complaint Letter', emoji: '📮', desc: 'Professional complaints with clear expectations', level: 'Intermediate' },
    { id: 'cover_letter', label: 'Cover Letter', emoji: '🎯', desc: 'Job application introductions', level: 'Advanced' },
    { id: 'text_message', label: 'Text to Friend', emoji: '💬', desc: 'Casual, natural texting in English', level: 'Beginner' },
];

const WritingWorkshop = ({ onStatsUpdate, onBadges }) => {
    const [selectedFormat, setSelectedFormat] = useState(null);
    const [prompt, setPrompt] = useState(null);
    const [userText, setUserText] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingPrompt, setLoadingPrompt] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [showImproved, setShowImproved] = useState(false);

    const wordCount = userText.trim() ? userText.trim().split(/\s+/).length : 0;

    const selectFormat = async (format) => {
        setSelectedFormat(format);
        setLoadingPrompt(true);
        setError(null);
        setResult(null);
        setUserText('');
        try {
            const res = await authFetch(`/api/writing/prompt?format=${format.id}`);
            if (!res.ok) throw new Error('Failed to load prompt');
            const data = await res.json();
            setPrompt(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoadingPrompt(false);
        }
    };

    const submitWriting = async () => {
        if (!userText.trim() || userText.trim().length < 20) {
            setError('Please write at least a few sentences (20+ characters).');
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await authFetch('/api/writing/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    format: selectedFormat.id,
                    prompt: prompt?.prompt || '',
                    text: userText.trim(),
                }),
            });
            if (!res.ok) throw new Error('Evaluation failed');
            const data = await res.json();
            setResult(data);
            onStatsUpdate?.();
            if (data.new_badges?.length) onBadges?.(data.new_badges);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setSelectedFormat(null);
        setPrompt(null);
        setUserText('');
        setResult(null);
        setError(null);
        setShowImproved(false);
    };

    const newPrompt = () => {
        if (selectedFormat) {
            setResult(null);
            setUserText('');
            setShowImproved(false);
            selectFormat(selectedFormat);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#22c55e';
        if (score >= 60) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Edit3 size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Writing Workshop</h1>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Practice real-world writing formats with AI coaching on grammar, style, and register</p>
                    </div>
                </div>
            </div>

            {/* Format Selection */}
            {!selectedFormat && (
                <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Choose a writing format:</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                        {FORMATS.map(format => (
                            <button key={format.id} onClick={() => selectFormat(format)} style={{ padding: 20, borderRadius: 14, border: '1px solid var(--border-color)', background: 'var(--card-bg)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                                <div style={{ fontSize: 28, marginBottom: 10 }}>{format.emoji}</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{format.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{format.desc}</div>
                                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontWeight: 600 }}>{format.level}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Writing Area */}
            {selectedFormat && !result && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 }}>
                        ← Back to formats
                    </button>

                    <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <span style={{ fontSize: 24 }}>{selectedFormat.emoji}</span>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedFormat.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedFormat.desc}</div>
                            </div>
                        </div>

                        {/* Prompt */}
                        {loadingPrompt ? (
                            <div style={{ textAlign: 'center', padding: 20 }}><Loader2 size={24} style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite' }} /></div>
                        ) : prompt && (
                            <div style={{ padding: 16, background: 'rgba(139,92,246,0.08)', borderRadius: 12, border: '1px solid rgba(139,92,246,0.15)', marginBottom: 20 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>📋 Your Prompt:</div>
                                <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6 }}>{prompt.prompt}</div>
                                {prompt.tips && (
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>💡 {prompt.tips}</div>
                                )}
                            </div>
                        )}

                        {/* Text Input */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Your writing:</label>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{wordCount} words</span>
                            </div>
                            <textarea value={userText} onChange={(e) => { setUserText(e.target.value); setError(null); }} placeholder={`Write your ${selectedFormat.label.toLowerCase()} here...`} rows={8} style={{ width: '100%', padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                        </div>

                        {error && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
                                <AlertCircle size={15} /> {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={submitWriting} disabled={loading || !userText.trim()} style={{ flex: 1, padding: '14px 20px', borderRadius: 12, border: 'none', background: loading || !userText.trim() ? 'var(--border-color)' : 'linear-gradient(135deg, #ec4899, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 14, cursor: loading || !userText.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...</> : <><Edit3 size={16} /> Submit for Review</>}
                            </button>
                            <button onClick={newPrompt} style={{ padding: '14px 14px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}><RotateCcw size={16} /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            {result && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 }}>
                        ← Back to formats
                    </button>

                    {/* Score Overview */}
                    <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 48, fontWeight: 900, color: getScoreColor(result.overall_score || 0) }}>{result.overall_score ?? '—'}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Overall Score</div>
                            </div>
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
                                {[
                                    { label: 'Grammar', score: result.grammar_score },
                                    { label: 'Style', score: result.style_score },
                                    { label: 'Register', score: result.register_score },
                                    { label: 'Vocabulary', score: result.vocabulary_score },
                                ].filter(s => s.score != null).map(s => (
                                    <div key={s.label} style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, textAlign: 'center' }}>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: getScoreColor(s.score) }}>{s.score}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Register Feedback */}
                        {result.register_feedback && (
                            <div style={{ padding: 14, background: 'rgba(139,92,246,0.08)', borderRadius: 10, border: '1px solid rgba(139,92,246,0.15)', marginBottom: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>📊 Register Analysis</div>
                                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>{result.register_feedback}</div>
                            </div>
                        )}

                        {/* Grammar Corrections */}
                        {result.corrections && result.corrections.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 10 }}>✏️ Grammar & Style Corrections</h3>
                                {result.corrections.map((c, i) => (
                                    <div key={i} style={{ padding: 12, marginBottom: 8, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                            <span style={{ textDecoration: 'line-through', color: '#ef4444', fontSize: 13 }}>{c.original}</span>
                                            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                                            <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 13 }}>{c.corrected}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.explanation}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Vocabulary Upgrades */}
                        {result.vocabulary_upgrades && result.vocabulary_upgrades.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', marginBottom: 10 }}>
                                    <Sparkles size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Vocabulary Upgrades
                                </h3>
                                {result.vocabulary_upgrades.map((v, i) => (
                                    <div key={i} style={{ padding: 10, marginBottom: 6, borderRadius: 8, background: 'rgba(245,158,11,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>"{v.original}"</span>
                                        <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>"{v.upgrade}"</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Improved Version */}
                    {result.improved_version && (
                        <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
                            <button onClick={() => setShowImproved(!showImproved)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <CheckCircle size={16} color="#22c55e" /> AI-Improved Version
                                </span>
                                {showImproved ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {showImproved && (
                                <div style={{ marginTop: 14, padding: 16, background: 'rgba(34,197,94,0.06)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.15)', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                    {result.improved_version}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={newPrompt} style={{ flex: 1, padding: '14px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Edit3 size={16} /> Write Another
                        </button>
                        <button onClick={reset} style={{ padding: '14px 14px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}><RotateCcw size={16} /></button>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
};

export default WritingWorkshop;
