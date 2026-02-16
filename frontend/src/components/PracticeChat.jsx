import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, RotateCcw, Loader2, AlertCircle, Send, Keyboard, Sparkles } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const LANG_CODES = {
    english: 'en-US', spanish: 'es-ES', french: 'fr-FR', german: 'de-DE',
    japanese: 'ja-JP', mandarin: 'zh-CN', korean: 'ko-KR', portuguese: 'pt-BR',
    hindi: 'hi-IN', arabic: 'ar-SA',
};

const PracticeChat = ({ onStatsUpdate, onBadges, language = 'english' }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [status, setStatus] = useState('idle');
    const [chatHistory, setChatHistory] = useState([]);
    const [textInput, setTextInput] = useState('');
    const [inputMode, setInputMode] = useState('voice'); // voice or text
    const [supported, setSupported] = useState(true);
    const [silenceProgress, setSilenceProgress] = useState(0);
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');
    const chatEndRef = useRef(null);
    const textInputRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const silenceIntervalRef = useRef(null);
    const SILENCE_THRESHOLD_MS = 2500; // 2.5 seconds of silence before stopping

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSupported(false);
            setInputMode('text');
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
        }
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, loading]);

    const sendToAI = useCallback(async (text) => {
        if (!text.trim()) return;
        setLoading(true);
        setStatus('processing');
        setError(null);
        setChatHistory(prev => [...prev, { role: 'user', text: text.trim() }]);

        try {
            const response = await authFetch('/api/process-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim() }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Server error');
            }

            const data = await response.json();
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                text: data.reply_text,
                correction: data.correction,
                fluency_score: data.fluency_score,
                new_word: data.new_word,
            }]);

            if (data.new_badges) onBadges(data.new_badges);
            onStatsUpdate();
            speakResponse(data.reply_text);
        } catch (err) {
            setError(err.message);
            setStatus('idle');
        } finally {
            setLoading(false);
        }
    }, [onStatsUpdate, onBadges]);

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = LANG_CODES[language] || 'en-US';
        finalTranscriptRef.current = '';

        // Silence detection helpers
        const resetSilenceTimer = () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
            setSilenceProgress(0);

            // Only start silence countdown if we have some speech already
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
            let interim = '';
            let final = '';
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript + ' ';
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            if (final) {
                finalTranscriptRef.current += final;
                setTranscript(finalTranscriptRef.current);
            }
            setInterimTranscript(interim);
            // Reset silence timer on every new speech result
            resetSilenceTimer();
        };

        recognition.onerror = (event) => {
            if (event.error === 'no-speech') setError('No speech detected. Try again!');
            else if (event.error !== 'aborted') setError(`Microphone error: ${event.error}`);
            setIsListening(false);
            setStatus('idle');
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
            const spokenText = finalTranscriptRef.current.trim();
            if (spokenText) {
                setTranscript(spokenText);
                sendToAI(spokenText);
            } else {
                setStatus('idle');
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        setStatus('listening');
        setError(null);
        setTranscript('');
        setInterimTranscript('');
        setSilenceProgress(0);
    };

    const stopListening = () => {
        recognitionRef.current?.stop();
    };

    const speakResponse = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.95;
            utterance.pitch = 1.1;
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v =>
                v.name.includes('Google US English') || v.name.includes('Female') || v.name.includes('Samantha')
            );
            if (preferredVoice) utterance.voice = preferredVoice;
            utterance.onstart = () => { setIsSpeaking(true); setStatus('speaking'); };
            utterance.onend = () => { setIsSpeaking(false); setStatus('idle'); };
            window.speechSynthesis.speak(utterance);
        } else {
            setStatus('idle');
        }
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textInput.trim() || loading) return;
        sendToAI(textInput);
        setTextInput('');
    };

    const resetSession = async () => {
        try {
            await authFetch('/api/reset', { method: 'POST' });
            setChatHistory([]);
            setTranscript('');
            setInterimTranscript('');
            setError(null);
            setStatus('idle');
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            setIsSpeaking(false);
            onStatsUpdate();
        } catch (e) { /* ignore */ }
    };

    const getStatusMessage = () => {
        switch (status) {
            case 'listening': return '🔴 Listening... Speak naturally';
            case 'processing': return '🧠 Miss Nova is thinking...';
            case 'speaking': return '🗣️ Miss Nova is speaking...';
            default: return inputMode === 'voice' ? 'Tap the mic to start speaking' : 'Type your message below';
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'listening': return '#f87171';
            case 'processing': return '#fbbf24';
            case 'speaking': return '#a78bfa';
            default: return 'var(--text-muted)';
        }
    };

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={22} style={{ color: '#a78bfa' }} /> Free Practice
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                        Talk to Miss Nova about anything
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setInputMode(inputMode === 'voice' ? 'text' : 'voice')}
                        className="btn-secondary"
                        style={{ padding: '8px 14px' }}
                    >
                        {inputMode === 'voice' ? <Keyboard size={16} /> : <Mic size={16} />}
                        <span style={{ fontSize: '12px' }}>{inputMode === 'voice' ? 'Text' : 'Voice'}</span>
                    </button>
                    {chatHistory.length > 0 && (
                        <button onClick={resetSession} className="btn-secondary" style={{ padding: '8px 14px' }}>
                            <RotateCcw size={14} /> <span style={{ fontSize: '12px' }}>Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171', padding: '12px 16px', borderRadius: '12px', fontSize: '13px',
                    marginBottom: '16px',
                }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Chat Area */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '20px',
                padding: '20px',
                minHeight: '400px',
                maxHeight: '500px',
                overflowY: 'auto',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
            }}>
                {chatHistory.length === 0 && !loading && (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '12px',
                        color: 'var(--text-muted)', textAlign: 'center', padding: '40px 20px',
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🗣️</div>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                            Start a Conversation
                        </div>
                        <div style={{ fontSize: '13px', lineHeight: '1.6', maxWidth: '300px' }}>
                            {inputMode === 'voice'
                                ? 'Press the mic button and start speaking. Miss Nova will listen, respond, and help you improve.'
                                : 'Type your message below and Miss Nova will help you improve your English.'}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {['How are you?', 'Tell me about yourself', 'What should I practice?'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => sendToAI(s)}
                                    style={{
                                        background: 'rgba(139, 92, 246, 0.08)',
                                        border: '1px solid rgba(139, 92, 246, 0.15)',
                                        borderRadius: '20px', padding: '8px 14px',
                                        color: '#a78bfa', fontSize: '12px', cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {chatHistory.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div className={msg.role === 'user' ? 'chat-user' : 'chat-ai'}
                            style={{ maxWidth: '85%', padding: '14px 18px' }}>
                            {msg.role === 'user' && (
                                <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{msg.text}</p>
                            )}
                            {msg.role === 'assistant' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Reply */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <button
                                            onClick={() => speakResponse(msg.text)}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: '#a78bfa', padding: '2px', marginTop: '2px', flexShrink: 0,
                                            }}
                                        >
                                            <Volume2 size={14} />
                                        </button>
                                        <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{msg.text}</p>
                                    </div>

                                    {/* Score */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: '11px', fontWeight: '700',
                                            padding: '3px 10px', borderRadius: '20px',
                                            background: msg.fluency_score >= 8 ? 'rgba(16,185,129,0.12)' : msg.fluency_score >= 5 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                                            color: msg.fluency_score >= 8 ? '#34d399' : msg.fluency_score >= 5 ? '#fbbf24' : '#f87171',
                                        }}>
                                            {msg.fluency_score}/10 Fluency
                                        </span>
                                    </div>

                                    {/* Correction */}
                                    {msg.correction && msg.correction.original && (
                                        <div style={{
                                            background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px',
                                            border: '1px solid rgba(255,255,255,0.03)', fontSize: '12px',
                                        }}>
                                            <p style={{ color: '#f87171', textDecoration: 'line-through', marginBottom: '4px' }}>
                                                {msg.correction.original}
                                            </p>
                                            <p style={{ color: '#34d399', fontWeight: '600', marginBottom: '4px' }}>
                                                ✓ {msg.correction.corrected}
                                            </p>
                                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                💡 {msg.correction.explanation}
                                            </p>
                                            {msg.correction.better_alternative && (
                                                <p style={{ color: '#22d3ee', marginTop: '4px' }}>
                                                    ✨ {msg.correction.better_alternative}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* New Word */}
                                    {msg.new_word && msg.new_word.word && (
                                        <div style={{
                                            background: 'rgba(245,158,11,0.06)', borderRadius: '10px',
                                            padding: '10px 12px', border: '1px solid rgba(245,158,11,0.12)',
                                            fontSize: '12px',
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

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div className="chat-ai" style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                Miss Nova is thinking...
                            </div>
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </div>
                    </div>
                )}

                {/* Live transcript */}
                {(isListening) && (transcript || interimTranscript) && (
                    <div style={{
                        background: 'rgba(139.92,246,0.05)', borderRadius: '12px',
                        padding: '12px', border: '1px dashed rgba(139,92,246,0.2)',
                    }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            You're saying:
                        </p>
                        <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                            {transcript}
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{interimTranscript}</span>
                        </p>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            {inputMode === 'voice' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <p style={{ fontSize: '13px', color: getStatusColor(), transition: 'color 0.3s ease' }}>
                        {getStatusMessage()}
                    </p>
                    <button
                        onClick={isListening ? stopListening : startListening}
                        disabled={!supported || loading || isSpeaking}
                        style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.3s ease', position: 'relative',
                            background: isListening ? '#ef4444'
                                : status === 'processing' ? 'rgba(245,158,11,0.5)'
                                    : status === 'speaking' ? 'rgba(139,92,246,0.5)'
                                        : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                            boxShadow: isListening ? '0 0 30px rgba(239,68,68,0.4)'
                                : '0 0 20px rgba(139,92,246,0.3)',
                            opacity: (loading || isSpeaking) ? 0.4 : 1,
                        }}
                    >
                        {isListening ? (
                            <>
                                <MicOff size={32} style={{ color: 'white' }} />
                                <div className="pulse-ring" style={{
                                    position: 'absolute', inset: '-8px', borderRadius: '50%',
                                    border: '2px solid rgba(239,68,68,0.4)',
                                }} />
                                <div className="pulse-ring-delayed" style={{
                                    position: 'absolute', inset: '-16px', borderRadius: '50%',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                }} />
                            </>
                        ) : loading ? (
                            <Loader2 size={32} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                        ) : isSpeaking ? (
                            <Volume2 size={32} style={{ color: 'white', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        ) : (
                            <Mic size={32} style={{ color: 'white' }} />
                        )}
                    </button>

                    {/* Silence detection progress bar */}
                    {isListening && silenceProgress > 0 && (
                        <div style={{ width: '120px', textAlign: 'center' }}>
                            <div className="silence-progress" title="Recording will stop when silence is detected">
                                <div className="silence-progress-fill" style={{ width: `${silenceProgress}%` }} />
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {silenceProgress >= 100 ? 'Processing...' : 'Silence detected...'}
                            </div>
                        </div>
                    )}

                    {/* Listening wave indicator */}
                    {isListening && silenceProgress === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="listening-wave">
                                <span></span><span></span><span></span><span></span><span></span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Speak naturally — pauses are OK!
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleTextSubmit} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        ref={textInputRef}
                        value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        placeholder="Type your message to Miss Nova..."
                        disabled={loading}
                        style={{
                            flex: 1, padding: '14px 18px',
                            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                            borderRadius: '14px', color: 'var(--text-primary)',
                            fontSize: '14px', outline: 'none',
                            transition: 'border-color 0.3s ease',
                        }}
                        onFocus={e => e.target.style.borderColor = 'rgba(139,92,246,0.3)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                    />
                    <button
                        type="submit"
                        disabled={!textInput.trim() || loading}
                        className="btn-primary"
                        style={{ padding: '14px 18px', opacity: (!textInput.trim() || loading) ? 0.4 : 1 }}
                    >
                        {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
                    </button>
                </form>
            )}
        </div>
    );
};

export default PracticeChat;
