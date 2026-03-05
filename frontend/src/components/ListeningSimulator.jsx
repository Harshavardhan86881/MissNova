import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, RotateCcw, Loader2, AlertCircle, Star, UserCircle2, Bot, PlayCircle, Mic, MicOff, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const ROLES = [
  { id: 'Angry Customer', emoji: '😡', desc: 'Furious about a product or service failure' },
  { id: 'Upset Partner', emoji: '😤', desc: 'Feels ignored or misunderstood' },
  { id: 'Difficult Employee', emoji: '😒', desc: 'Resistant to feedback and defensive' },
  { id: 'Frustrated Colleague', emoji: '😠', desc: 'Overwhelmed and blaming others' },
  { id: 'Irate Manager', emoji: '🤬', desc: 'Deadline missed, wants answers now' },
];

// Pre-scripted high-quality example demonstrating active listening
const EXAMPLE_CONVERSATION = [
  {
    from: 'ai',
    emoji: '😡',
    text: "I've been waiting THREE days for my order! Your tracking said it would arrive yesterday — this is completely unacceptable!",
  },
  {
    from: 'user',
    text: "I completely understand how frustrating that must be, especially when you were counting on it. Let me check your order right now — could you share the order number so I can find out exactly what happened?",
    tip: '✅ Validates emotion first, then offers a concrete next step — no defensiveness.',
  },
  {
    from: 'ai',
    emoji: '😡',
    text: "Order #5892. I need this fixed TODAY — I have a presentation!",
  },
  {
    from: 'user',
    text: "Absolutely — I hear the urgency. I've located your order and can see it's delayed at the last distribution centre. I'm escalating it to express delivery right now, and you'll receive a confirmation email within 10 minutes.",
    tip: '✅ Acknowledges urgency with a specific, time-bound action — avoids vague promises.',
  },
  {
    from: 'ai',
    emoji: '😡',
    text: "Fine. But I also want a refund for the shipping. This isn't the service I paid for.",
  },
  {
    from: 'user',
    text: "That's completely fair, and I've already applied a full shipping refund to your account — it'll appear within 2 business days. I'm truly sorry for this experience. Is there anything else I can do for you?",
    tip: '✅ Takes ownership, gives a specific resolution, closes with genuine empathy.',
  },
];

// Actionable persuasion & communication upgrades shown after a session
const BETTER_WAY_TIPS = [
  {
    bad: '"You need to calm down."',
    good: '"I can hear this matters deeply to you — let\'s work through it together."',
    label: 'Validate, don\'t dismiss',
  },
  {
    bad: '"Um… I think… you know… maybe…"',
    good: '"Here is exactly what I can do for you right now."',
    label: 'Replace filler words with confident action',
  },
  {
    bad: '"That\'s not my fault" / "That\'s our policy."',
    good: '"Here\'s what I can personally arrange for you: …"',
    label: 'Shift from blame to solution',
  },
  {
    bad: '"I\'m sorry you feel that way."',
    good: '"I\'m genuinely sorry this happened — you deserved better."',
    label: 'Own the apology fully',
  },
  {
    bad: '"You should have read the terms."',
    good: '"I understand the confusion — let me make this right."',
    label: 'Use softened, responsible language',
  },
];

const ListeningSimulator = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('select'); // 'select' | 'chat' | 'done'
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Voice-to-text state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [showExample, setShowExample] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect Web Speech API support and clean up on unmount
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SR);
    return () => { recognitionRef.current?.abort(); };
  }, []);

  const startSession = async (role) => {
    setLoading(true);
    setError(null);
    setMessages([]);
    setSessionComplete(false);
    setTurnCount(0);
    setSelectedRole(role);
    try {
      const res = await authFetch('/api/listening-simulator/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role.id }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to start session');
      }
      const data = await res.json();
      setSessionId(data.session_id);
      setMessages([{ from: 'ai', text: data.opening_message, isFeedback: false }]);
      setPhase('chat');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!userInput.trim() || loading || sessionComplete) return;
    const userMsg = userInput.trim();
    setUserInput('');
    setMessages((prev) => [...prev, { from: 'user', text: userMsg }]);
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/listening-simulator/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole.id, user_reply: userMsg, session_id: sessionId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Reply failed');
      }
      const data = await res.json();
      setTurnCount(data.turn_number);
      setMessages((prev) => [...prev, {
        from: 'ai',
        text: data.ai_reply,
        isFeedback: data.is_feedback,
      }]);
      if (data.session_complete) {
        setSessionComplete(true);
        setPhase('done');
      }
    } catch (e) {
      setError(e.message);
      // Remove the user message we added on failure
      setMessages((prev) => prev.slice(0, -1));
      setUserInput(userMsg);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  const reset = async () => {
    if (sessionId) {
      try {
        await authFetch(`/api/listening-simulator/session/${sessionId}`, { method: 'DELETE' });
      } catch (_) {}
    }
    recognitionRef.current?.abort();
    setIsRecording(false);
    setInterimText('');
    setPhase('select');
    setSelectedRole(null);
    setSessionId(null);
    setMessages([]);
    setUserInput('');
    setSessionComplete(false);
    setTurnCount(0);
    setError(null);
  };

  const toggleRecording = () => {
    if (!voiceSupported) return;
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      setInterimText('');
      return;
    }
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (e) => {
        let interim = '';
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t;
          else interim += t;
        }
        if (final) setUserInput((prev) => (prev + ' ' + final).trim());
        setInterimText(interim);
      };
      recognition.onend = () => { setIsRecording(false); setInterimText(''); };
      recognition.onerror = () => { setIsRecording(false); setInterimText(''); };
      recognition.start();
      setIsRecording(true);
    } catch (_) {
      setIsRecording(false);
    }
  };

  // --- Phase: Role Selection ---
  if (phase === 'select') {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 8px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageCircle size={22} color="white" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                Active Listening Simulator
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                De-escalate a real conversation — AI critiques only empathy and solutions
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 24,
          display: 'flex', gap: 20, flexWrap: 'wrap',
        }}>
          {[
            { step: '1', text: 'Choose a difficult character' },
            { step: '2', text: 'Type 3 responses to de-escalate' },
            { step: '3', text: 'Get feedback on empathy + solution' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'white',
              }}>{step}</div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* "Try Example" collapsible demo */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setShowExample((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10,
              border: '1px solid rgba(139,92,246,0.4)',
              background: 'rgba(139,92,246,0.08)',
              color: '#a78bfa', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <PlayCircle size={15} />
            See Example Conversation
            {showExample ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showExample && (
            <div style={{
              marginTop: 12, borderRadius: 14,
              border: '1px solid rgba(139,92,246,0.25)',
              background: 'rgba(139,92,246,0.04)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.08))',
                fontSize: 12, fontWeight: 700, color: '#a78bfa',
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                📖 Example: De-escalating an Angry Customer
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {EXAMPLE_CONVERSATION.map((msg, i) => (
                  <div key={i}>
                    <div style={{
                      display: 'flex', gap: 10,
                      flexDirection: msg.from === 'user' ? 'row-reverse' : 'row',
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: msg.from === 'user'
                          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                          : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                        fontSize: 14,
                      }}>
                        {msg.from === 'user' ? <UserCircle2 size={16} color="white" /> : <span>{msg.emoji}</span>}
                      </div>
                      <div style={{
                        maxWidth: '78%', padding: '8px 12px',
                        borderRadius: msg.from === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                        background: msg.from === 'user'
                          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                          : 'var(--input-bg, rgba(255,255,255,0.06))',
                        border: '1px solid var(--border-color)',
                        color: msg.from === 'user' ? 'white' : 'var(--text-primary)',
                        fontSize: 13, lineHeight: 1.55,
                      }}>
                        {msg.text}
                      </div>
                    </div>
                    {msg.tip && (
                      <div style={{
                        marginTop: 6, marginLeft: 40,
                        fontSize: 11, color: '#34d399', fontStyle: 'italic',
                      }}>
                        {msg.tip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => startSession(role)}
              disabled={loading}
              style={{
                padding: '18px 16px', borderRadius: 14, border: '1px solid var(--border-color)',
                background: 'var(--card-bg)', cursor: loading ? 'not-allowed' : 'pointer',
                textAlign: 'left', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.border = '1px solid #8b5cf6';
                e.currentTarget.style.background = 'rgba(139,92,246,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.border = '1px solid var(--border-color)';
                e.currentTarget.style.background = 'var(--card-bg)';
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 8 }}>{role.emoji}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{role.id}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{role.desc}</div>
              <div style={{
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, color: '#a78bfa', fontWeight: 600,
              }}>
                <PlayCircle size={13} /> Start simulation
              </div>
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 14 }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', marginRight: 6, verticalAlign: 'middle' }} />
            Starting scenario…
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 10,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // --- Phase: Chat ---
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageCircle size={20} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              {selectedRole?.emoji} Scenario: {selectedRole?.id}
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
              {sessionComplete
                ? 'Simulation complete — see feedback below.'
                : `Turn ${turnCount}/3 — show empathy and provide a clear solution`}
            </p>
          </div>
        </div>
        <button onClick={reset} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 8,
          border: '1px solid var(--border-color)', background: 'transparent',
          color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
        }}>
          <RotateCcw size={13} /> New scene
        </button>
      </div>

      {/* Turn indicator */}
      {!sessionComplete && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 14,
        }}>
          {[1, 2, 3].map((t) => (
            <div key={t} style={{
              flex: 1, height: 4, borderRadius: 4,
              background: t <= turnCount ? '#8b5cf6' : 'var(--border-color)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      )}

      {/* Chat window */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: 16, overflow: 'hidden', marginBottom: 14,
      }}>
        <div style={{ padding: '16px 16px 0', maxHeight: 480, overflowY: 'auto' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, marginBottom: 16,
              flexDirection: msg.from === 'user' ? 'row-reverse' : 'row',
              animation: 'fadeIn 0.2s ease',
            }}>
              {/* Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: msg.from === 'user'
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : msg.isFeedback
                    ? 'linear-gradient(135deg, #f59e0b, #22c55e)'
                    : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                fontSize: msg.from === 'ai' ? 16 : 'inherit',
              }}>
                {msg.from === 'user'
                  ? <UserCircle2 size={18} color="white" />
                  : msg.isFeedback
                    ? <Star size={17} color="white" />
                    : <span>{selectedRole?.emoji}</span>
                }
              </div>
              {/* Bubble */}
              <div style={{
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: msg.from === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                background: msg.from === 'user'
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : msg.isFeedback
                    ? 'rgba(245,158,11,0.12)'
                    : 'var(--input-bg, rgba(255,255,255,0.06))',
                border: msg.isFeedback ? '1px solid rgba(245,158,11,0.35)' : '1px solid var(--border-color)',
                color: msg.from === 'user' ? 'white' : 'var(--text-primary)',
              }}>
                {msg.isFeedback && (
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 6,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    ⭐ Coach Feedback
                  </div>
                )}
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {msg.text.replace(/^FEEDBACK:\s*/i, '')}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', fontSize: 16,
              }}>{selectedRole?.emoji}</div>
              <div style={{
                padding: '12px 16px', borderRadius: '4px 14px 14px 14px',
                background: 'var(--input-bg, rgba(255,255,255,0.06))',
                border: '1px solid var(--border-color)',
                display: 'flex', gap: 5, alignItems: 'center',
              }}>
                {[0, 0.2, 0.4].map((d, j) => (
                  <div key={j} style={{
                    width: 7, height: 7, borderRadius: '50%', background: '#8b5cf6',
                    animation: 'bounce 0.8s ease infinite',
                    animationDelay: `${d}s`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        {!sessionComplete && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
            {/* Interim speech shown as ghost text above the textarea */}
            {interimText && (
              <div style={{
                fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic',
                padding: '0 2px', marginBottom: 4,
              }}>
                🎙️ {interimText}…
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <textarea
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={voiceSupported ? 'Type or tap 🎙️ to speak… (Enter to send)' : 'Type your response to de-escalate… (Enter to send)'}
                rows={2}
                disabled={loading || sessionComplete}
                style={{
                  flex: 1, resize: 'none', padding: '10px 12px',
                  background: 'var(--input-bg, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-color)', borderRadius: 10,
                  color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.5,
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
              {/* Mic button — hidden when Web Speech API is unavailable */}
              {voiceSupported && (
                <button
                  onClick={toggleRecording}
                  disabled={loading || sessionComplete}
                  title={isRecording ? 'Stop recording' : 'Speak your reply'}
                  style={{
                    width: 42, height: 42,
                    borderRadius: 10, border: 'none',
                    background: isRecording
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'rgba(139,92,246,0.15)',
                    color: isRecording ? 'white' : '#a78bfa',
                    cursor: 'pointer',
                    alignSelf: 'flex-end',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: isRecording ? 'micPulse 1s ease-in-out infinite' : 'none',
                    flexShrink: 0,
                  }}
                >
                  {isRecording ? <MicOff size={17} /> : <Mic size={17} />}
                </button>
              )}
              <button
                onClick={sendReply}
                disabled={!userInput.trim() || loading || sessionComplete}
                style={{
                  padding: '10px 14px', borderRadius: 10, border: 'none',
                  background: userInput.trim() && !loading
                    ? 'linear-gradient(135deg, #ec4899, #8b5cf6)'
                    : 'var(--border-color)',
                  color: 'white', cursor: userInput.trim() && !loading ? 'pointer' : 'not-allowed',
                  alignSelf: 'flex-end',
                }}>
                <Send size={16} />
              </button>
            </div>
            {/* Manual text fallback notice */}
            {!voiceSupported && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                ℹ️ Microphone not available in this browser — type your response above.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Session done — try again + coaching tips */}
      {sessionComplete && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <button onClick={reset} style={{
              padding: '12px 28px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              <RotateCcw size={15} /> Try another scenario
            </button>
          </div>

          {/* ── A Better Way to Convince ─────────────────────────────── */}
          <div style={{
            borderRadius: 16,
            border: '1px solid rgba(139,92,246,0.25)',
            background: 'rgba(139,92,246,0.04)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(236,72,153,0.1))',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Lightbulb size={18} color="#a78bfa" />
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                  A Better Way to Convince
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Advanced phrasing upgrades to make your English more persuasive
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {BETTER_WAY_TIPS.map((tip, i) => (
                <div key={i} style={{
                  borderRadius: 12,
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  padding: '12px 16px',
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#a78bfa',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    marginBottom: 8,
                  }}>
                    💡 {tip.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{
                      padding: '6px 10px', borderRadius: 8,
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      fontSize: 13, color: '#f87171',
                    }}>
                      ✗ {tip.bad}
                    </div>
                    <div style={{
                      padding: '6px 10px', borderRadius: 8,
                      background: 'rgba(34,197,94,0.08)',
                      border: '1px solid rgba(34,197,94,0.2)',
                      fontSize: 13, color: '#4ade80',
                    }}>
                      ✓ {tip.good}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444', fontSize: 13, display: 'flex', gap: 8,
        }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
};

export default ListeningSimulator;
