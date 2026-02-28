import React, { useState } from 'react';
import { Target, Loader2, RotateCcw, AlertCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const AUDIENCES = [
  { id: 'Boss', label: 'Boss', emoji: '👔', desc: 'Needs clarity & brevity' },
  { id: 'Client', label: 'Client', emoji: '🤝', desc: 'Professional & warm' },
  { id: 'Date', label: 'Date', emoji: '❤️', desc: 'Genuine & engaging' },
  { id: 'Colleague', label: 'Colleague', emoji: '💼', desc: 'Collaborative & direct' },
  { id: 'Friend', label: 'Friend', emoji: '😊', desc: 'Casual & real' },
  { id: 'Investor', label: 'Investor', emoji: '📈', desc: 'Data-driven & confident' },
];

const SCORE_COLOR = (score) => {
  if (score >= 75) return { color: '#22c55e', label: 'Excellent', bg: 'rgba(34,197,94,0.12)' };
  if (score >= 50) return { color: '#f59e0b', label: 'Moderate', bg: 'rgba(245,158,11,0.12)' };
  return { color: '#ef4444', label: 'Needs Work', bg: 'rgba(239,68,68,0.12)' };
};

const ToneCalibrator = () => {
  const [text, setText] = useState('');
  const [audience, setAudience] = useState('Boss');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const analyse = async () => {
    if (!text.trim() || text.trim().length < 10) {
      setError('Please enter a message of at least 10 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await authFetch('/api/tone-calibrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, audience }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Server error');
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setText(''); setResult(null); setError(null); };

  const scoreInfo = result ? SCORE_COLOR(result.clarity_score ?? 50) : null;
  const circumference = 2 * Math.PI * 38;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={22} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              Tone & Intent Calibrator
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Know if your message lands — before you send it
            </p>
          </div>
        </div>
      </div>

      {/* Audience selector */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 20, marginBottom: 16,
      }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 12 }}>
          1. Who is your audience?
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              onClick={() => setAudience(a.id)}
              style={{
                padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                border: audience === a.id
                  ? '2px solid #8b5cf6'
                  : '1px solid var(--border-color)',
                background: audience === a.id
                  ? 'rgba(139,92,246,0.15)'
                  : 'transparent',
                color: audience === a.id ? '#a78bfa' : 'var(--text-secondary)',
                fontWeight: audience === a.id ? 700 : 400,
                fontSize: 13, transition: 'all 0.15s',
              }}>
              {a.emoji} {a.label}
              <span style={{ display: 'block', fontSize: 10, opacity: 0.7, fontWeight: 400 }}>{a.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message input */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 20, marginBottom: 16,
      }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 10 }}>
          2. Paste your draft message
        </label>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          placeholder="Type or paste your message…"
          rows={5}
          style={{
            width: '100%', resize: 'vertical', padding: '12px 14px',
            background: 'var(--input-bg, rgba(255,255,255,0.05))',
            border: '1px solid var(--border-color)', borderRadius: 10,
            color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6,
            fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
          }}
        />
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 10, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', fontSize: 13,
          }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={analyse}
            disabled={loading || !text.trim()}
            style={{
              flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none',
              background: loading || !text.trim()
                ? 'var(--border-color)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', fontWeight: 700, fontSize: 14,
              cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analysing tone…</>
              : <><Target size={16} /> Calibrate Tone</>}
          </button>
          {(text || result) && (
            <button onClick={reset} style={{
              padding: '12px 14px', borderRadius: 10,
              border: '1px solid var(--border-color)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}>
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {result && scoreInfo && (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: 16, padding: 20, animation: 'fadeIn 0.3s ease',
        }}>
          {/* Top row – score + verdict */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
            {/* Circular score */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="var(--border-color)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke={scoreInfo.color} strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - (result.clarity_score ?? 50) / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                <text x="50" y="45" textAnchor="middle" fill={scoreInfo.color}
                  fontSize="20" fontWeight="800">{result.clarity_score ?? '—'}</text>
                <text x="50" y="62" textAnchor="middle" fill="var(--text-secondary)"
                  fontSize="9">Clarity Score</text>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: scoreInfo.color }}>{scoreInfo.label}</span>
            </div>

            {/* Verdict + labels */}
            <div style={{ flex: 1, minWidth: 200 }}>
              {result.one_line_verdict && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                  background: scoreInfo.bg, border: `1px solid ${scoreInfo.color}40`,
                }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: scoreInfo.color }}>
                    {result.one_line_verdict}
                  </p>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {result.tone_label && (
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                  }}>Tone: {result.tone_label}</span>
                )}
                {result.audience_fit && (
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: result.audience_fit === 'Good Fit'
                      ? 'rgba(34,197,94,0.12)' : result.audience_fit === 'Acceptable'
                        ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                    color: result.audience_fit === 'Good Fit' ? '#22c55e'
                      : result.audience_fit === 'Acceptable' ? '#f59e0b' : '#ef4444',
                    border: `1px solid ${result.audience_fit === 'Good Fit' ? '#22c55e40'
                      : result.audience_fit === 'Acceptable' ? '#f59e0b40' : '#ef444440'}`,
                  }}>Audience Fit: {result.audience_fit}</span>
                )}
              </div>
            </div>
          </div>

          {/* Issues & strengths */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            {/* Issues */}
            <div style={{
              padding: 14, borderRadius: 12,
              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                <XCircle size={14} /> Issues
              </h4>
              {(result.issues || []).length === 0
                ? <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>None detected 🎉</p>
                : (result.issues || []).map((issue, i) => (
                  <p key={i} style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-primary)' }}>• {issue}</p>
                ))}
            </div>
            {/* Strengths */}
            <div style={{
              padding: 14, borderRadius: 12,
              background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)',
            }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} /> Strengths
              </h4>
              {(result.strengths || []).length === 0
                ? <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>No strengths found yet.</p>
                : (result.strengths || []).map((s, i) => (
                  <p key={i} style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text-primary)' }}>• {s}</p>
                ))}
            </div>
          </div>

          {/* Rewritten suggestion */}
          {result.rewritten_suggestion && (
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
            }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowRight size={14} /> Suggested Rewrite
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {result.rewritten_suggestion}
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 560px) {
          div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default ToneCalibrator;
