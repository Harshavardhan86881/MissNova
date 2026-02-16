import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    ArrowLeft, Mic, MicOff, Volume2, Send, Keyboard,
    Loader2, AlertCircle, RefreshCw, Lightbulb, ChevronRight
} from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const LANG_CODES = {
    english: 'en-US', spanish: 'es-ES', french: 'fr-FR', german: 'de-DE',
    japanese: 'ja-JP', mandarin: 'zh-CN', korean: 'ko-KR', portuguese: 'pt-BR',
    hindi: 'hi-IN', arabic: 'ar-SA',
};

const ScenarioChat = ({ scenario, navigateTo, onStatsUpdate, onBadges, language = 'english' }) => {
    const [chatHistory, setChatHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [inputMode, setInputMode] = useState('voice');
    const [textInput, setTextInput] = useState('');
    const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
    const [supported, setSupported] = useState(true);
    const [silenceProgress, setSilenceProgress] = useState(0);
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');
    const chatEndRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const silenceIntervalRef = useRef(null);
    const SILENCE_THRESHOLD_MS = 2500;

    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { setSupported(false); setInputMode('text'); }
        if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, loading]);

    if (!scenario) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <p>No scenario selected</p>
                <button onClick={() => navigateTo('scenarios')} className="btn-primary" style={{ marginTop: '16px' }}>
                    Browse Scenarios
                </button>
            </div>
        );
    }

    const sendToAI = async (text) => {
        if (!text.trim() || loading) return;
        setLoading(true);
        setError(null);
        setChatHistory(prev => [...prev, { role: 'user', text: text.trim() }]);

        try {
            const response = await authFetch('/api/scenario-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text.trim(),
                    scenario_id: scenario.id,
                    scenario_context: scenario.prompts[currentPromptIndex] || scenario.title,
                }),
            });

            if (!response.ok) throw new Error((await response.json()).detail || 'Server error');
            const data = await response.json();

            setChatHistory(prev => [...prev, {
                role: 'assistant', text: data.reply_text,
                correction: data.correction, fluency_score: data.fluency_score,
                scenario_tips: data.scenario_tips, new_word: data.new_word,
            }]);

            if (data.new_badges) onBadges(data.new_badges);
            onStatsUpdate();
            speakResponse(data.reply_text);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const startListening = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); setIsSpeaking(false); }

        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = LANG_CODES[language] || 'en-US';
        finalTranscriptRef.current = '';

        const resetSilenceTimer = () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
            setSilenceProgress(0);

            if (finalTranscriptRef.current.trim()) {
                let elapsed = 0;
                silenceIntervalRef.current = setInterval(() => {
                    elapsed += 100;
                    setSilenceProgress(Math.min(100, (elapsed / SILENCE_THRESHOLD_MS) * 100));
                }, 100);
                silenceTimerRef.current = setTimeout(() => {
                    if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
                    setSilenceProgress(100);
                    recognition.stop();
                }, SILENCE_THRESHOLD_MS);
            }
        };

        recognition.onresult = (event) => {
            let interim = '', final = '';
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
                else interim += event.results[i][0].transcript;
            }
            if (final) { finalTranscriptRef.current += final; setTranscript(finalTranscriptRef.current); }
            setInterimTranscript(interim);
            resetSilenceTimer();
        };

        recognition.onerror = (event) => {
            if (event.error === 'no-speech') setError('No speech detected.');
            else if (event.error !== 'aborted') setError(`Mic error: ${event.error}`);
            setIsListening(false);
            setSilenceProgress(0);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimTranscript('');
            setSilenceProgress(0);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
            const text = finalTranscriptRef.current.trim();
            if (text) { setTranscript(text); sendToAI(text); }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        setError(null);
        setTranscript('');
        setInterimTranscript('');
        setSilenceProgress(0);
    };

    const stopListening = () => recognitionRef.current?.stop();

    const speakResponse = (text) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.95; u.pitch = 1.1;
        const voices = window.speechSynthesis.getVoices();
        const pref = voices.find(v => v.name.includes('Google US English') || v.name.includes('Female'));
        if (pref) u.voice = pref;
        u.onstart = () => setIsSpeaking(true);
        u.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(u);
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textInput.trim() || loading) return;
        sendToAI(textInput);
        setTextInput('');
    };

    const nextPrompt = () => {
        if (currentPromptIndex < scenario.prompts.length - 1) {
            setCurrentPromptIndex(prev => prev + 1);
        }
    };

    const getDiffClass = (diff) => `diff-${diff.toLowerCase()}`;

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button
                    onClick={() => navigateTo('scenarios')}
                    style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                        borderRadius: '10px', padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)',
                    }}
                >
                    <ArrowLeft size={18} />
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '28px' }}>{scenario.icon}</span>
                        <div>
                            <h1 style={{ fontSize: '22px', fontWeight: '800' }}>{scenario.title}</h1>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                <span className={getDiffClass(scenario.difficulty)} style={{
                                    fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px',
                                }}>
                                    {scenario.difficulty}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{scenario.category}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setInputMode(inputMode === 'voice' ? 'text' : 'voice')}
                    className="btn-secondary"
                    style={{ padding: '8px 12px' }}
                >
                    {inputMode === 'voice' ? <Keyboard size={16} /> : <Mic size={16} />}
                </button>
            </div>

            {/* Current Prompt */}
            <div className="glass-card" style={{
                padding: '16px 20px', marginBottom: '16px',
                borderLeft: '3px solid #ec4899',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#f472b6', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <Lightbulb size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            Scenario Prompt {currentPromptIndex + 1}/{scenario.prompts.length}
                        </div>
                        <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', fontStyle: 'italic' }}>
                            "{scenario.prompts[currentPromptIndex]}"
                        </p>
                    </div>
                    {currentPromptIndex < scenario.prompts.length - 1 && (
                        <button onClick={nextPrompt} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '2px',
                            fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '12px',
                        }}>
                            Next <ChevronRight size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
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

            {/* Chat */}
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                borderRadius: '20px', padding: '20px', minHeight: '350px',
                maxHeight: '450px', overflowY: 'auto', marginBottom: '16px',
                display: 'flex', flexDirection: 'column', gap: '14px',
            }}>
                {chatHistory.length === 0 && !loading && (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)', textAlign: 'center', padding: '30px',
                    }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>{scenario.icon}</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            {scenario.title}
                        </div>
                        <div style={{ fontSize: '13px', maxWidth: '280px', lineHeight: '1.6' }}>
                            Respond to the prompt above. Miss Nova will play the role and give you detailed feedback.
                        </div>
                    </div>
                )}

                {chatHistory.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div className={msg.role === 'user' ? 'chat-user' : 'chat-ai'}
                            style={{ maxWidth: '85%', padding: '14px 18px' }}>
                            {msg.role === 'user' && (
                                <p style={{ fontSize: '14px' }}>{msg.text}</p>
                            )}
                            {msg.role === 'assistant' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <button onClick={() => speakResponse(msg.text)} style={{
                                            background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', padding: '2px',
                                        }}>
                                            <Volume2 size={14} />
                                        </button>
                                        <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{msg.text}</p>
                                    </div>

                                    <span style={{
                                        fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
                                        alignSelf: 'flex-start',
                                        background: msg.fluency_score >= 8 ? 'rgba(16,185,129,0.12)' : msg.fluency_score >= 5 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                                        color: msg.fluency_score >= 8 ? '#34d399' : msg.fluency_score >= 5 ? '#fbbf24' : '#f87171',
                                    }}>
                                        {msg.fluency_score}/10
                                    </span>

                                    {msg.correction && msg.correction.original && (
                                        <div style={{
                                            background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px',
                                            border: '1px solid rgba(255,255,255,0.03)', fontSize: '12px',
                                        }}>
                                            <p style={{ color: '#f87171', textDecoration: 'line-through', marginBottom: '4px' }}>{msg.correction.original}</p>
                                            <p style={{ color: '#34d399', fontWeight: '600', marginBottom: '4px' }}>✓ {msg.correction.corrected}</p>
                                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>💡 {msg.correction.explanation}</p>
                                            {msg.correction.better_alternative && (
                                                <p style={{ color: '#22d3ee', marginTop: '4px' }}>✨ {msg.correction.better_alternative}</p>
                                            )}
                                        </div>
                                    )}

                                    {msg.scenario_tips && msg.scenario_tips.length > 0 && (
                                        <div style={{
                                            background: 'rgba(139,92,246,0.06)', borderRadius: '10px',
                                            padding: '10px 12px', border: '1px solid rgba(139,92,246,0.1)', fontSize: '12px',
                                        }}>
                                            <div style={{ fontWeight: '600', color: '#a78bfa', marginBottom: '6px' }}>💡 Tips:</div>
                                            {msg.scenario_tips.map((tip, j) => (
                                                <div key={j} style={{ color: 'var(--text-secondary)', marginBottom: '3px' }}>• {tip}</div>
                                            ))}
                                        </div>
                                    )}

                                    {msg.new_word && msg.new_word.word && (
                                        <div style={{
                                            background: 'rgba(245,158,11,0.06)', borderRadius: '10px',
                                            padding: '10px 12px', border: '1px solid rgba(245,158,11,0.12)', fontSize: '12px',
                                        }}>
                                            <span style={{ fontWeight: '700', color: '#fbbf24' }}>📖 {msg.new_word.word}</span>
                                            <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>— {msg.new_word.definition}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="chat-ai" style={{ padding: '14px 18px', alignSelf: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            Evaluating your response...
                        </div>
                    </div>
                )}

                {isListening && (transcript || interimTranscript) && (
                    <div style={{
                        background: 'rgba(139,92,246,0.05)', borderRadius: '12px',
                        padding: '12px', border: '1px dashed rgba(139,92,246,0.2)',
                    }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>You're saying:</p>
                        <p style={{ fontSize: '14px' }}>
                            {transcript}<span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{interimTranscript}</span>
                        </p>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            {inputMode === 'voice' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={isListening ? stopListening : startListening}
                        disabled={!supported || loading || isSpeaking}
                        style={{
                            width: '70px', height: '70px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isListening ? '#ef4444' : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                            boxShadow: isListening ? '0 0 30px rgba(239,68,68,0.4)' : '0 0 20px rgba(236,72,153,0.3)',
                            opacity: (loading || isSpeaking) ? 0.4 : 1, transition: 'all 0.3s ease', position: 'relative',
                        }}
                    >
                        {isListening ? <MicOff size={28} style={{ color: 'white' }} /> : <Mic size={28} style={{ color: 'white' }} />}
                        {isListening && <div className="pulse-ring" style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', border: '2px solid rgba(239,68,68,0.4)' }} />}
                    </button>

                    {/* Silence detection progress */}
                    {isListening && silenceProgress > 0 && (
                        <div style={{ width: '120px', textAlign: 'center' }}>
                            <div className="silence-progress">
                                <div className="silence-progress-fill" style={{ width: `${silenceProgress}%` }} />
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {silenceProgress >= 100 ? 'Processing...' : 'Silence detected...'}
                            </div>
                        </div>
                    )}

                    {isListening && silenceProgress === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="listening-wave">
                                <span></span><span></span><span></span><span></span><span></span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Speak naturally</span>
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        value={textInput} onChange={e => setTextInput(e.target.value)}
                        placeholder="Type your response..." disabled={loading}
                        style={{
                            flex: 1, padding: '14px 18px', background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)', borderRadius: '14px',
                            color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                        }}
                    />
                    <button type="submit" disabled={!textInput.trim() || loading} className="btn-primary" style={{ padding: '14px 18px' }}>
                        <Send size={18} />
                    </button>
                </form>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default ScenarioChat;
