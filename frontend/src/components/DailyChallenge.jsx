import React, { useState, useEffect, useRef } from 'react';
import {
    Target, Mic, MicOff, Send, Keyboard, Volume2,
    Loader2, AlertCircle, CheckCircle, Zap, Clock
} from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const LANG_CODES = {
    english: 'en-US', spanish: 'es-ES', french: 'fr-FR', german: 'de-DE',
    japanese: 'ja-JP', mandarin: 'zh-CN', korean: 'ko-KR', portuguese: 'pt-BR',
    hindi: 'hi-IN', arabic: 'ar-SA',
};

const DailyChallenge = ({ onStatsUpdate, onBadges, language = 'english' }) => {
    const [challenge, setChallenge] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [inputMode, setInputMode] = useState('voice');
    const [textInput, setTextInput] = useState('');
    const [supported, setSupported] = useState(true);
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');

    useEffect(() => {
        authFetch('/api/daily-challenge-info').then(r => r.json()).then(setChallenge).catch(() => { });
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { setSupported(false); setInputMode('text'); }
    }, []);

    const submitChallenge = async (text) => {
        if (!text.trim() || loading) return;
        setLoading(true);
        setError(null);
        try {
            const res = await authFetch('/api/daily-challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim() }),
            });
            if (!res.ok) throw new Error('Failed to submit');
            const data = await res.json();
            setResult(data);
            if (data.new_badges) onBadges(data.new_badges);
            onStatsUpdate();
            // Refresh challenge status
            authFetch('/api/daily-challenge-info').then(r => r.json()).then(setChallenge).catch(() => { });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const startListening = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        window.speechSynthesis?.cancel();

        const recognition = new SR();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = LANG_CODES[language] || 'en-US';
        finalTranscriptRef.current = '';

        recognition.onresult = (event) => {
            let interim = '', final = '';
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
                else interim += event.results[i][0].transcript;
            }
            if (final) { finalTranscriptRef.current += final; setTranscript(finalTranscriptRef.current); }
            setInterimTranscript(interim);
        };

        recognition.onerror = (event) => {
            if (event.error !== 'aborted') setError(`Error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimTranscript('');
            const text = finalTranscriptRef.current.trim();
            if (text) submitChallenge(text);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        setError(null);
        setTranscript('');
    };

    const stopListening = () => recognitionRef.current?.stop();

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textInput.trim() || loading) return;
        submitChallenge(textInput);
        setTextInput('');
    };

    const speakText = (text) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
    };

    if (!challenge) {
        return (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p>Loading today's challenge...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '650px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <Target size={26} style={{ color: '#f59e0b' }} /> Daily Challenge
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Complete today's challenge to earn bonus XP
                </p>
            </div>

            {/* Challenge Card */}
            <div className="glass-card" style={{
                padding: '28px', textAlign: 'center', marginBottom: '20px',
                borderTop: '3px solid #f59e0b',
            }}>
                {challenge.completed ? (
                    <div style={{ padding: '20px' }}>
                        <CheckCircle size={56} style={{ color: '#34d399', marginBottom: '16px' }} />
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#34d399', marginBottom: '8px' }}>
                            Challenge Completed! 🎉
                        </h2>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            Great job! Come back tomorrow for a new challenge.
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={{
                            background: 'rgba(245,158,11,0.08)', borderRadius: '12px',
                            padding: '8px 16px', display: 'inline-flex', alignItems: 'center',
                            gap: '6px', marginBottom: '16px',
                        }}>
                            <Zap size={14} style={{ color: '#fbbf24' }} />
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#fbbf24' }}>
                                +{challenge.xp_reward} XP
                            </span>
                        </div>

                        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>
                            {challenge.title}
                        </h2>

                        <p style={{
                            fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6',
                            maxWidth: '400px', margin: '0 auto 20px',
                        }}>
                            {challenge.description}
                        </p>

                        <div style={{
                            fontSize: '11px', color: 'var(--text-muted)', display: 'flex',
                            alignItems: 'center', gap: '4px', justifyContent: 'center', marginBottom: '24px',
                        }}>
                            <Clock size={12} /> Resets daily at midnight
                        </div>

                        {/* Transcript */}
                        {(transcript || interimTranscript) && (
                            <div style={{
                                background: 'rgba(139,92,246,0.05)', borderRadius: '12px',
                                padding: '14px', marginBottom: '20px', textAlign: 'left',
                                border: '1px solid rgba(139,92,246,0.1)',
                            }}>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Your response:</p>
                                <p style={{ fontSize: '14px' }}>
                                    {transcript}<span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{interimTranscript}</span>
                                </p>
                            </div>
                        )}

                        {/* Input */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                            <button
                                onClick={() => setInputMode(inputMode === 'voice' ? 'text' : 'voice')}
                                className="btn-secondary"
                                style={{ padding: '8px 14px', fontSize: '12px' }}
                            >
                                {inputMode === 'voice' ? <Keyboard size={14} /> : <Mic size={14} />}
                                {inputMode === 'voice' ? 'Type' : 'Voice'}
                            </button>
                        </div>

                        {inputMode === 'voice' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <button
                                    onClick={isListening ? stopListening : startListening}
                                    disabled={!supported || loading}
                                    style={{
                                        width: '80px', height: '80px', borderRadius: '50%', border: 'none',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isListening ? '#ef4444' : 'linear-gradient(135deg, #f59e0b, #ec4899)',
                                        boxShadow: isListening ? '0 0 30px rgba(239,68,68,0.4)' : '0 0 20px rgba(245,158,11,0.3)',
                                        opacity: loading ? 0.4 : 1, transition: 'all 0.3s ease', position: 'relative',
                                    }}
                                >
                                    {loading ? (
                                        <Loader2 size={32} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                                    ) : isListening ? (
                                        <>
                                            <MicOff size={32} style={{ color: 'white' }} />
                                            <div className="pulse-ring" style={{
                                                position: 'absolute', inset: '-8px', borderRadius: '50%',
                                                border: '2px solid rgba(239,68,68,0.4)',
                                            }} />
                                        </>
                                    ) : (
                                        <Mic size={32} style={{ color: 'white' }} />
                                    )}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    value={textInput} onChange={e => setTextInput(e.target.value)}
                                    placeholder="Type your response..." disabled={loading}
                                    style={{
                                        flex: 1, padding: '14px 18px', background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--border-subtle)', borderRadius: '14px',
                                        color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                                    }}
                                />
                                <button type="submit" disabled={!textInput.trim() || loading} className="btn-primary" style={{ padding: '14px 18px' }}>
                                    <Send size={18} />
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>

            {/* Result */}
            {result && (
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '900', fontSize: '22px',
                            background: result.fluency_score >= 8 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            color: result.fluency_score >= 8 ? '#34d399' : '#fbbf24',
                            border: `2px solid ${result.fluency_score >= 8 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                        }}>
                            {result.fluency_score}/10
                        </div>
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '16px' }}>
                                {result.fluency_score >= 8 ? '🎉 Excellent!' : result.fluency_score >= 5 ? '👏 Good effort!' : '💪 Keep going!'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '600' }}>
                                +{result.xp_earned || challenge.xp_reward} XP earned!
                            </div>
                        </div>
                    </div>

                    {/* AI Feedback */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
                        <button onClick={() => speakText(result.reply_text)} style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', padding: '2px', marginTop: '2px',
                        }}>
                            <Volume2 size={14} />
                        </button>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            {result.reply_text}
                        </p>
                    </div>

                    {/* Strengths */}
                    {result.strengths && result.strengths.length > 0 && (
                        <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#34d399', marginBottom: '6px' }}>✅ Strengths:</div>
                            {result.strengths.map((s, i) => (
                                <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '3px', paddingLeft: '12px' }}>
                                    • {s}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Improvements */}
                    {result.improvements && result.improvements.length > 0 && (
                        <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#fbbf24', marginBottom: '6px' }}>📈 To Improve:</div>
                            {result.improvements.map((s, i) => (
                                <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '3px', paddingLeft: '12px' }}>
                                    • {s}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Correction */}
                    {result.correction && result.correction.original && (
                        <div style={{
                            background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px',
                            fontSize: '12px', marginBottom: '14px',
                        }}>
                            <p style={{ color: '#f87171', textDecoration: 'line-through', marginBottom: '4px' }}>{result.correction.original}</p>
                            <p style={{ color: '#34d399', fontWeight: '600', marginBottom: '4px' }}>✓ {result.correction.corrected}</p>
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>💡 {result.correction.explanation}</p>
                        </div>
                    )}

                    {/* New Word */}
                    {result.new_word && result.new_word.word && (
                        <div style={{
                            background: 'rgba(245,158,11,0.06)', borderRadius: '10px',
                            padding: '10px 12px', border: '1px solid rgba(245,158,11,0.12)', fontSize: '12px',
                        }}>
                            <span style={{ fontWeight: '700', color: '#fbbf24' }}>📖 {result.new_word.word}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>— {result.new_word.definition}</span>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    color: '#f87171', padding: '12px 16px', borderRadius: '12px', fontSize: '13px',
                    marginTop: '16px',
                }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default DailyChallenge;
