import React, { useState, useRef, useEffect } from 'react';
import { Activity, Mic, MicOff, Loader2, AlertCircle, TrendingDown, RotateCcw, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const FILLER_EXAMPLES = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'sort of', 'kind of', 'I mean', 'right', 'so', 'well', 'honestly'];

const FillerTracker = ({ onStatsUpdate, onBadges }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [inputMode, setInputMode] = useState('voice');
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');

    const supported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    useEffect(() => {
        authFetch('/api/filler-stats').then(r => r.json()).then(data => {
            setHistory(data.history || []);
        }).catch(() => {});
        if (!supported) setInputMode('text');
    }, []);

    const startListening = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        finalTranscriptRef.current = '';
        let silenceTimer = null;

        recognition.onresult = (e) => {
            let interim = '', final = '';
            for (let i = 0; i < e.results.length; i++) {
                if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
                else interim += e.results[i][0].transcript;
            }
            if (final) { finalTranscriptRef.current += final; setTranscript(finalTranscriptRef.current); }
            setInterimTranscript(interim);
            if (silenceTimer) clearTimeout(silenceTimer);
            if (finalTranscriptRef.current.trim()) {
                silenceTimer = setTimeout(() => recognition.stop(), 3000);
            }
        };
        recognition.onerror = (e) => { if (e.error !== 'aborted') setError(e.error); setIsListening(false); };
        recognition.onend = () => {
            setIsListening(false);
            setInterimTranscript('');
            const text = finalTranscriptRef.current.trim();
            if (text) analyzeFillers(text);
        };
        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        setError(null);
        setResult(null);
        setTranscript('');
    };

    const stopListening = () => recognitionRef.current?.stop();

    const analyzeFillers = async (text) => {
        setLoading(true);
        setError(null);
        try {
            const res = await authFetch('/api/analyze-fillers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            if (!res.ok) throw new Error('Analysis failed');
            const data = await res.json();
            setResult(data);
            setHistory(prev => [data, ...prev].slice(0, 20));
            onStatsUpdate?.();
            if (data.new_badges?.length) onBadges?.(data.new_badges);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (textInput.trim()) {
            setTranscript(textInput.trim());
            analyzeFillers(textInput.trim());
            setTextInput('');
        }
    };

    const reset = () => { setTranscript(''); setResult(null); setError(null); setTextInput(''); };

    const getScoreColor = (score) => {
        if (score >= 80) return '#22c55e';
        if (score >= 50) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Filler Word Tracker</h1>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Speak naturally — I'll catch every "um", "like", and "you know"</p>
                    </div>
                </div>
            </div>

            {/* Common fillers info */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 8 }}>Tracked fillers:</span>
                {FILLER_EXAMPLES.map(f => (
                    <span key={f} style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 11, fontWeight: 600 }}>{f}</span>
                ))}
            </div>

            {/* Input Mode Toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {supported && (
                    <button onClick={() => setInputMode('voice')} style={{ padding: '8px 16px', borderRadius: 10, border: inputMode === 'voice' ? '2px solid #06b6d4' : '1px solid var(--border-color)', background: inputMode === 'voice' ? 'rgba(6,182,212,0.1)' : 'transparent', color: inputMode === 'voice' ? '#06b6d4' : 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        <Mic size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Voice
                    </button>
                )}
                <button onClick={() => setInputMode('text')} style={{ padding: '8px 16px', borderRadius: 10, border: inputMode === 'text' ? '2px solid #06b6d4' : '1px solid var(--border-color)', background: inputMode === 'text' ? 'rgba(6,182,212,0.1)' : 'transparent', color: inputMode === 'text' ? '#06b6d4' : 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    ⌨️ Text
                </button>
            </div>

            {/* Recording / Input Area */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
                {inputMode === 'voice' ? (
                    <>
                        <button onClick={isListening ? stopListening : startListening} disabled={loading} style={{ width: 80, height: 80, borderRadius: '50%', border: 'none', background: isListening ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #06b6d4, #8b5cf6)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: isListening ? '0 0 30px rgba(239,68,68,0.4)' : '0 0 20px rgba(6,182,212,0.3)', transition: 'all 0.3s' }}>
                            {loading ? <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /> : isListening ? <MicOff size={28} /> : <Mic size={28} />}
                        </button>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                            {isListening ? 'Listening... speak naturally, I\'ll stop after 3s silence' : loading ? 'Analyzing your speech...' : 'Click to start speaking'}
                        </p>
                        {(transcript || interimTranscript) && (
                            <div style={{ marginTop: 16, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <span style={{ color: 'var(--text-primary)', fontSize: 15 }}>{transcript}</span>
                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{interimTranscript}</span>
                            </div>
                        )}
                    </>
                ) : (
                    <form onSubmit={handleTextSubmit}>
                        <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Type or paste your speech here... include natural fillers like 'um', 'like', 'you know' as you would actually speak." rows={4} style={{ width: '100%', padding: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                            <button type="submit" disabled={loading || !textInput.trim()} style={{ flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none', background: loading || !textInput.trim() ? 'var(--border-color)' : 'linear-gradient(135deg, #06b6d4, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: 14, cursor: loading || !textInput.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</> : <><Activity size={16} /> Analyze Fillers</>}
                            </button>
                            {textInput && <button type="button" onClick={reset} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}><RotateCcw size={16} /></button>}
                        </div>
                    </form>
                )}
            </div>

            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    {/* Score Card */}
                    <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 48, fontWeight: 900, color: getScoreColor(result.filler_free_score || 0) }}>{result.filler_free_score ?? 0}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Filler-Free Score</div>
                            </div>
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{result.total_words || 0}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total Words</div>
                                    </div>
                                    <div style={{ padding: 12, background: 'rgba(239,68,68,0.08)', borderRadius: 10 }}>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{result.filler_count || 0}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Filler Words</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filler Breakdown */}
                        {result.fillers && Object.keys(result.fillers).length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Your Top Verbal Crutches</h3>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {Object.entries(result.fillers).sort((a, b) => b[1] - a[1]).map(([word, count]) => (
                                        <div key={word} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <span style={{ fontWeight: 700, color: '#ef4444', fontSize: 14 }}>"{word}"</span>
                                            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>×{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Highlighted Text */}
                        {result.highlighted_text && (
                            <div style={{ marginBottom: 16 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Your Speech (fillers highlighted)</h3>
                                <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-color)', fontSize: 15, lineHeight: 1.8, color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: result.highlighted_text }} />
                            </div>
                        )}

                        {/* Suggestions */}
                        {result.suggestions && result.suggestions.length > 0 && (
                            <div>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                                    <TrendingDown size={15} style={{ marginRight: 6, verticalAlign: 'middle', color: '#22c55e' }} />
                                    Tips to Reduce Fillers
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {result.suggestions.map((tip, i) => (
                                        <div key={i} style={{ padding: '10px 14px', background: 'rgba(34,197,94,0.08)', borderRadius: 10, border: '1px solid rgba(34,197,94,0.15)', color: 'var(--text-primary)', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                            <span style={{ color: '#22c55e', fontWeight: 700 }}>💡</span> {tip}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={reset} style={{ width: '100%', padding: '14px 20px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <RotateCcw size={16} /> Try Again
                    </button>
                </div>
            )}

            {/* History */}
            {history.length > 0 && (
                <div className="glass-card" style={{ padding: 20, marginTop: 20 }}>
                    <button onClick={() => setShowHistory(!showHistory)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BarChart2 size={16} /> Filler History ({history.length} sessions)
                        </span>
                        {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showHistory && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 100, marginBottom: 12 }}>
                                {history.slice(0, 15).reverse().map((h, i) => {
                                    const score = h.filler_free_score || 0;
                                    return (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                            <div style={{ width: '100%', height: `${score}%`, background: `linear-gradient(to top, ${getScoreColor(score)}, ${getScoreColor(score)}88)`, borderRadius: '4px 4px 0 0', minHeight: 4, transition: 'height 0.5s ease' }} />
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                                <span>Oldest</span><span>Latest</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
};

export default FillerTracker;
