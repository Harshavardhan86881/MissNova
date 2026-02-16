import React, { useState, useRef, useEffect } from 'react';
import { Globe, ArrowRight, Mic, MicOff, Send, Loader2, Volume2, BookOpen, Sparkles, RotateCcw, Languages } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const LANG_CODES = {
    auto: '', english: 'en-US', spanish: 'es-ES', french: 'fr-FR', german: 'de-DE',
    japanese: 'ja-JP', mandarin: 'zh-CN', korean: 'ko-KR', portuguese: 'pt-BR',
    hindi: 'hi-IN', arabic: 'ar-SA',
};

const LANG_OPTIONS = [
    { code: 'auto', label: 'Auto-detect', flag: '🌐' },
    { code: 'english', label: 'English', flag: '🇺🇸' },
    { code: 'spanish', label: 'Spanish', flag: '🇪🇸' },
    { code: 'french', label: 'French', flag: '🇫🇷' },
    { code: 'german', label: 'German', flag: '🇩🇪' },
    { code: 'japanese', label: 'Japanese', flag: '🇯🇵' },
    { code: 'mandarin', label: 'Mandarin', flag: '🇨🇳' },
    { code: 'korean', label: 'Korean', flag: '🇰🇷' },
    { code: 'portuguese', label: 'Portuguese', flag: '🇧🇷' },
    { code: 'hindi', label: 'Hindi', flag: '🇮🇳' },
    { code: 'arabic', label: 'Arabic', flag: '🇸🇦' },
];

const TranslateInput = ({ onStatsUpdate, onBadges }) => {
    const [inputText, setInputText] = useState('');
    const [sourceLang, setSourceLang] = useState('auto');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [history, setHistory] = useState([]);
    const recognitionRef = useRef(null);
    const inputRef = useRef(null);

    const supported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    const startListening = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = LANG_CODES[sourceLang] || '';

        let silenceTimer = null;

        recognition.onresult = (e) => {
            let interim = '';
            let final = '';
            for (let i = 0; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    final += e.results[i][0].transcript;
                } else {
                    interim += e.results[i][0].transcript;
                }
            }
            setInputText(final + interim);
            // Reset silence timer on new result
            if (silenceTimer) clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                recognition.stop();
            }, 2500);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    };

    const stopListening = () => {
        recognitionRef.current?.stop();
        setIsListening(false);
    };

    const translate = async () => {
        if (!inputText.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await authFetch('/api/translate-input', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: inputText.trim(), source_language: sourceLang }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Translation failed');
            }

            const data = await res.json();
            setResult(data);
            setHistory(prev => [{ input: inputText, result: data, timestamp: new Date() }, ...prev].slice(0, 10));
            if (data.new_badges?.length) onBadges?.(data.new_badges);
            onStatsUpdate?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const speakText = (text, lang = 'en-US') => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            translate();
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Globe size={28} style={{ color: '#10b981' }} />
                    Multi-Language Translator
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Type or speak in any language — get English translation, grammar corrections, and pronunciation tips
                </p>
            </div>

            {/* Input Card */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
                {/* Language Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Source:</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {LANG_OPTIONS.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => setSourceLang(lang.code)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    border: sourceLang === lang.code ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                                    background: sourceLang === lang.code ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                                    color: sourceLang === lang.code ? '#10b981' : 'var(--text-secondary)',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {lang.flag} {lang.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Text Input Area */}
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <textarea
                        ref={inputRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type or speak in any language..."
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '16px',
                            paddingRight: '100px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '14px',
                            color: 'var(--text-primary)',
                            fontSize: '16px',
                            lineHeight: '1.6',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#10b981'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                    />
                    {/* Mic button overlay */}
                    {supported && (
                        <button
                            onClick={isListening ? stopListening : startListening}
                            style={{
                                position: 'absolute',
                                right: '56px',
                                bottom: '12px',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                border: 'none',
                                background: isListening ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                            title={isListening ? 'Stop recording' : 'Start voice input'}
                        >
                            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                    )}
                    {/* Clear button */}
                    {inputText && (
                        <button
                            onClick={() => { setInputText(''); setResult(null); }}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                bottom: '12px',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="Clear"
                        >
                            <RotateCcw size={14} />
                        </button>
                    )}
                </div>

                {/* Listening indicator */}
                {isListening && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 16px',
                        marginBottom: '12px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}>
                        <div className="listening-wave">
                            <span></span><span></span><span></span><span></span><span></span>
                        </div>
                        <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
                            Listening... speak in any language
                        </span>
                    </div>
                )}

                {/* Translate Button */}
                <button
                    onClick={translate}
                    disabled={!inputText.trim() || loading}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '15px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        opacity: (!inputText.trim() || loading) ? 0.5 : 1,
                    }}
                >
                    {loading ? (
                        <><Loader2 size={18} className="spin" /> Translating...</>
                    ) : (
                        <><Languages size={18} /> Translate to English</>
                    )}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '14px 18px',
                    marginBottom: '20px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    fontSize: '14px',
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Result Card */}
            {result && (
                <div className="glass-card animate-slide-up" style={{ padding: '0', marginBottom: '24px', overflow: 'hidden' }}>
                    {/* Detection header */}
                    <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.05))',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '18px' }}>🔍</span>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>
                                    Detected: {result.detected_language_name || result.detected_language}
                                </div>
                                {result.confidence && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Confidence: {Math.round(result.confidence * 100)}%
                                    </div>
                                )}
                            </div>
                        </div>
                        {result.xp_earned && (
                            <div className="xp-float" style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#000',
                            }}>
                                +{result.xp_earned.final_xp} XP
                            </div>
                        )}
                    </div>

                    {/* Translation panel */}
                    <div className="translate-panel" style={{ padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'start' }}>
                            {/* Original */}
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                    Original
                                </div>
                                <div style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                                    {result.original_text}
                                </div>
                                {result.corrected_original && result.corrected_original !== result.original_text && (
                                    <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#f59e0b', marginBottom: '4px' }}>CORRECTED</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{result.corrected_original}</div>
                                    </div>
                                )}
                            </div>

                            {/* Arrow */}
                            <div className="translate-arrow" style={{ paddingTop: '24px' }}>
                                <ArrowRight size={24} style={{ color: '#10b981' }} />
                            </div>

                            {/* English Translation */}
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                    English
                                </div>
                                <div style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--text-primary)', fontWeight: '500' }}>
                                    {result.english_translation}
                                </div>
                                <button
                                    onClick={() => speakText(result.english_translation, 'en-US')}
                                    style={{
                                        marginTop: '8px',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'rgba(139, 92, 246, 0.1)',
                                        color: '#a78bfa',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <Volume2 size={14} /> Listen
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Grammar Corrections */}
                    {result.corrections?.length > 0 && (
                        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={16} style={{ color: '#f59e0b' }} /> Grammar Corrections
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {result.corrections.map((c, i) => (
                                    <div key={i} style={{
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border-subtle)',
                                    }}>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '6px', fontSize: '12px',
                                                background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                                textDecoration: 'line-through',
                                            }}>{c.original}</span>
                                            <ArrowRight size={14} style={{ color: 'var(--text-muted)', alignSelf: 'center' }} />
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '6px', fontSize: '12px',
                                                background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
                                            }}>{c.corrected}</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{c.explanation}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pronunciation Guide */}
                    {result.pronunciation_guide && (
                        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Volume2 size={16} style={{ color: '#06b6d4' }} /> Pronunciation Guide
                            </h3>
                            {result.pronunciation_guide.ipa && (
                                <div style={{
                                    padding: '10px 14px', borderRadius: '8px', marginBottom: '10px',
                                    background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.1)',
                                    fontFamily: 'monospace', fontSize: '15px', color: '#06b6d4',
                                }}>
                                    /{result.pronunciation_guide.ipa}/
                                </div>
                            )}
                            {result.pronunciation_guide.tips?.map((tip, i) => (
                                <div key={i} style={{
                                    padding: '8px 12px', fontSize: '13px', color: 'var(--text-secondary)',
                                    lineHeight: '1.5', display: 'flex', alignItems: 'flex-start', gap: '8px',
                                }}>
                                    <span style={{ color: '#06b6d4' }}>•</span> {tip}
                                </div>
                            ))}
                            {result.pronunciation_guide.difficult_sounds?.length > 0 && (
                                <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>Tricky sounds:</span>
                                    {result.pronunciation_guide.difficult_sounds.map((s, i) => (
                                        <span key={i} style={{
                                            padding: '3px 8px', borderRadius: '6px', fontSize: '12px',
                                            background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', fontWeight: '600',
                                        }}>"{s}"</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Vocabulary Suggestions */}
                    {result.vocabulary_suggestions?.length > 0 && (
                        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BookOpen size={16} style={{ color: '#a78bfa' }} /> Vocabulary
                            </h3>
                            <div style={{ display: 'grid', gap: '10px' }}>
                                {result.vocabulary_suggestions.map((v, i) => (
                                    <div key={i} style={{
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border-subtle)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: '700', fontSize: '14px', color: '#a78bfa' }}>{v.word}</span>
                                            <button
                                                onClick={() => speakText(v.word)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                                            >
                                                <Volume2 size={12} />
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{v.definition}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{v.example}"</div>
                                        {v.in_source_language && (
                                            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                                                = {v.in_source_language}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cultural Note */}
                    {result.cultural_note && (
                        <div style={{
                            padding: '16px 20px',
                            borderTop: '1px solid var(--border-subtle)',
                            background: 'rgba(139, 92, 246, 0.03)',
                        }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                📝 <strong style={{ color: '#a78bfa' }}>Cultural note:</strong> {result.cultural_note}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* History */}
            {history.length > 1 && (
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        Recent Translations
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {history.slice(1).map((h, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setInputText(h.input);
                                    setResult(h.result);
                                }}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--border-subtle)',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                        {h.input.substring(0, 40)}{h.input.length > 40 ? '...' : ''}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {h.result.detected_language_name} → English
                                    </div>
                                </div>
                                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-slide-up { animation: slideUp 0.3s ease-out; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default TranslateInput;
