import React, { useState, useEffect, useRef } from 'react';
import {
    Languages, Mic, MicOff, Volume2, Loader2,
    AlertCircle, CheckCircle, ChevronRight, RefreshCw
} from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const LANG_CODES = {
    english: 'en-US', spanish: 'es-ES', french: 'fr-FR', german: 'de-DE',
    japanese: 'ja-JP', mandarin: 'zh-CN', korean: 'ko-KR', portuguese: 'pt-BR',
    hindi: 'hi-IN', arabic: 'ar-SA',
};

const TongueTwisters = ({ onStatsUpdate, onBadges, language = 'english' }) => {
    const [twisters, setTwisters] = useState([]);
    const [selectedTwister, setSelectedTwister] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('All');
    const [supported, setSupported] = useState(true);
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');

    useEffect(() => {
        authFetch('/api/tongue-twisters').then(r => r.json()).then(setTwisters).catch(() => { });
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) setSupported(false);
        if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    }, []);

    const difficulties = ['All', 'Easy', 'Medium', 'Hard'];
    const filtered = twisters.filter(t => filter === 'All' || t.difficulty === filter);

    const speakText = (text) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.8; u.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const pref = voices.find(v => v.name.includes('Google US English') || v.name.includes('Female'));
        if (pref) u.voice = pref;
        window.speechSynthesis.speak(u);
    };

    const startListening = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        window.speechSynthesis?.cancel();
        setResult(null);

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
            if (text) evaluateTwister(text);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        setError(null);
        setTranscript('');
    };

    const stopListening = () => recognitionRef.current?.stop();

    const evaluateTwister = async (text) => {
        setLoading(true);
        try {
            const res = await authFetch('/api/evaluate-tongue-twister', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, target: selectedTwister.text }),
            });
            if (!res.ok) throw new Error('Failed to evaluate');
            const data = await res.json();
            setResult(data);
            if (data.new_badges) onBadges(data.new_badges);
            onStatsUpdate();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getDiffClass = (diff) => `diff-${diff.toLowerCase()}`;

    if (selectedTwister) {
        return (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <button
                    onClick={() => { setSelectedTwister(null); setResult(null); setTranscript(''); }}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                        gap: '6px', fontSize: '13px', marginBottom: '20px',
                    }}
                >
                    ← Back to Tongue Twisters
                </button>

                <div className="glass-card" style={{ padding: '28px', textAlign: 'center', marginBottom: '20px' }}>
                    <span className={getDiffClass(selectedTwister.difficulty)} style={{
                        fontSize: '10px', fontWeight: '600', padding: '4px 12px',
                        borderRadius: '20px', display: 'inline-block', marginBottom: '16px',
                    }}>
                        {selectedTwister.difficulty}
                    </span>

                    <p style={{
                        fontSize: '22px', fontWeight: '700', lineHeight: '1.6',
                        color: 'var(--text-primary)', marginBottom: '8px',
                    }}>
                        "{selectedTwister.text}"
                    </p>

                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                        Focus: {selectedTwister.focus}
                    </p>

                    <button
                        onClick={() => speakText(selectedTwister.text)}
                        className="btn-secondary"
                        style={{ marginBottom: '24px' }}
                    >
                        <Volume2 size={16} /> Listen First
                    </button>

                    {/* Transcript */}
                    {(transcript || interimTranscript) && (
                        <div style={{
                            background: 'rgba(139,92,246,0.05)', borderRadius: '12px',
                            padding: '14px', marginBottom: '20px', textAlign: 'left',
                            border: '1px solid rgba(139,92,246,0.1)',
                        }}>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Your attempt:</p>
                            <p style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                                {transcript}<span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{interimTranscript}</span>
                            </p>
                        </div>
                    )}

                    {/* Mic Button */}
                    <button
                        onClick={isListening ? stopListening : startListening}
                        disabled={!supported || loading}
                        style={{
                            width: '80px', height: '80px', borderRadius: '50%', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto',
                            background: isListening ? '#ef4444' : 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                            boxShadow: isListening ? '0 0 30px rgba(239,68,68,0.4)' : '0 0 20px rgba(6,182,212,0.3)',
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

                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
                        {isListening ? '🔴 Listening...' : loading ? '🧠 Evaluating...' : 'Tap to try saying it!'}
                    </p>
                </div>

                {/* Result */}
                {result && (
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '900', fontSize: '22px',
                                background: result.accuracy_score >= 8 ? 'rgba(16,185,129,0.15)' : result.accuracy_score >= 5 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                color: result.accuracy_score >= 8 ? '#34d399' : result.accuracy_score >= 5 ? '#fbbf24' : '#f87171',
                                border: `2px solid ${result.accuracy_score >= 8 ? 'rgba(16,185,129,0.3)' : result.accuracy_score >= 5 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            }}>
                                {result.accuracy_score}/10
                            </div>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '16px' }}>
                                    {result.perfect_match ? '🎉 Perfect!' : result.accuracy_score >= 7 ? '👏 Great job!' : result.accuracy_score >= 4 ? '💪 Good try!' : '🔄 Keep practicing!'}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pronunciation Accuracy</div>
                            </div>
                        </div>

                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
                            {result.feedback}
                        </p>

                        {result.tips && result.tips.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#22d3ee', marginBottom: '8px' }}>💡 Tips:</div>
                                {result.tips.map((tip, i) => (
                                    <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', paddingLeft: '12px' }}>
                                        • {tip}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => { setResult(null); setTranscript(''); }}
                            className="btn-primary"
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            <RefreshCw size={16} /> Try Again
                        </button>
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
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <Languages size={26} style={{ color: '#06b6d4' }} /> Pronunciation Practice
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Master pronunciation with tongue twisters — listen, repeat, and get scored
                </p>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                {difficulties.map(d => (
                    <button key={d} onClick={() => setFilter(d)} className={`tab-btn ${filter === d ? 'active' : ''}`}>
                        {d}
                    </button>
                ))}
            </div>

            {/* Twister List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filtered.map(tw => (
                    <div
                        key={tw.id}
                        className="twister-card"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedTwister(tw)}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                    <span className={getDiffClass(tw.difficulty)} style={{
                                        fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px',
                                    }}>
                                        {tw.difficulty}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Focus: {tw.focus}
                                    </span>
                                </div>
                                <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                                    "{tw.text}"
                                </p>
                            </div>
                            <ChevronRight size={18} style={{ color: 'var(--text-muted)', marginTop: '4px', flexShrink: 0 }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TongueTwisters;
