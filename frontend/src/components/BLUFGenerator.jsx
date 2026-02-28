import React, { useState } from 'react';
import { Zap, ArrowRight, RotateCcw, Copy, CheckCircle2, Loader2, FileText, AlertCircle } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const EXAMPLE_TEXT =
  "So, I was thinking that maybe we could potentially consider looking into the possibility of perhaps scheduling a meeting sometime next week, if that works for everyone, since we've been meaning to discuss the quarterly results which have kind of been a bit lower than expected, and we should probably figure out what to do about that at some point soon.";

const BLUFGenerator = () => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  const generate = async () => {
    if (!inputText.trim() || inputText.trim().length < 20) {
      setError('Please type at least a sentence (20+ characters).');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await authFetch('/api/bluf-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
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

  const copyBullets = () => {
    if (!result?.bullets) return;
    const text = result.bullets.map((b) => `• ${b}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const reset = () => {
    setInputText('');
    setResult(null);
    setError(null);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 8px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={22} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              BLUF Generator
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Bottom Line Up Front — strip the fluff, keep the impact
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 20,
        display: 'flex', gap: 24, flexWrap: 'wrap',
      }}>
        {[
          { step: '1', label: 'Paste your rambling text' },
          { step: '2', label: 'AI extracts the core message' },
          { step: '3', label: 'Get 2-3 crisp BLUF bullets' },
        ].map(({ step, label }) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
            }}>{step}</div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Input Card */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 20, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={15} /> Your text
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{wordCount} words</span>
            <button
              onClick={() => setInputText(EXAMPLE_TEXT)}
              style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 6,
                border: '1px solid var(--border-color)', background: 'transparent',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}>
              Try example
            </button>
          </div>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => { setInputText(e.target.value); setError(null); }}
          placeholder="Paste your long paragraph here…"
          rows={6}
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
            onClick={generate}
            disabled={loading || !inputText.trim()}
            style={{
              flex: 1, padding: '12px 20px', borderRadius: 10, border: 'none',
              background: loading || !inputText.trim()
                ? 'var(--border-color)'
                : 'linear-gradient(135deg, #f59e0b, #ef4444)',
              color: 'white', fontWeight: 700, fontSize: 14, cursor: loading || !inputText.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating BLUF…</> : <><Zap size={16} /> Generate BLUF</>}
          </button>
          {(inputText || result) && (
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

      {/* Result */}
      {result && (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: 16, padding: 20, animation: 'fadeIn 0.3s ease',
        }}>
          {/* Stats bar */}
          {result.word_reduction && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              padding: '8px 14px', borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))',
              border: '1px solid rgba(245,158,11,0.3)',
            }}>
              <Zap size={14} color="#f59e0b" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>
                Word reduction: {result.word_reduction}
              </span>
            </div>
          )}

          {/* Bullets */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                ⚡ BLUF Bullets
              </h3>
              <button
                onClick={copyBullets}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 7,
                  border: '1px solid var(--border-color)', background: 'transparent',
                  color: copied ? '#22c55e' : 'var(--text-secondary)',
                  fontSize: 12, cursor: 'pointer',
                }}>
                {copied ? <><CheckCircle2 size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(result.bullets || []).map((bullet, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: 'white',
                  }}>{i + 1}</div>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {bullet}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Key action */}
          {result.key_action && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
            }}>
              <p style={{ margin: 0, fontSize: 13, color: '#a78bfa' }}>
                <strong>Key Action / Takeaway:</strong> {result.key_action}
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default BLUFGenerator;
