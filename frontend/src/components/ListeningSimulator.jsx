import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, RotateCcw, Loader2, AlertCircle, Star, UserCircle2, Bot, PlayCircle } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const ROLES = [
  { id: 'Angry Customer', emoji: '😡', desc: 'Furious about a product or service failure' },
  { id: 'Upset Partner', emoji: '😤', desc: 'Feels ignored or misunderstood' },
  { id: 'Difficult Employee', emoji: '😒', desc: 'Resistant to feedback and defensive' },
  { id: 'Frustrated Colleague', emoji: '😠', desc: 'Overwhelmed and blaming others' },
  { id: 'Irate Manager', emoji: '🤬', desc: 'Deadline missed, wants answers now' },
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    setPhase('select');
    setSelectedRole(null);
    setSessionId(null);
    setMessages([]);
    setUserInput('');
    setSessionComplete(false);
    setTurnCount(0);
    setError(null);
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
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex', gap: 10,
          }}>
            <textarea
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your response to de-escalate… (Enter to send)"
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
        )}
      </div>

      {/* Session done — try again */}
      {sessionComplete && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={reset} style={{
            padding: '12px 28px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <RotateCcw size={15} /> Try another scenario
          </button>
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
      `}</style>
    </div>
  );
};

export default ListeningSimulator;
