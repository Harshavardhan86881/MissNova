import React, { useState, useEffect } from 'react';
import { History, Loader2, AlertCircle, MessageSquare, ArrowLeft, FileText, Star, ChevronDown, ChevronUp, Eye, BarChart2 } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const ConversationReplay = ({ onStatsUpdate }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedConv, setSelectedConv] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedMsg, setExpandedMsg] = useState(null);

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        setLoading(true);
        try {
            const res = await authFetch('/api/conversations/list');
            if (!res.ok) throw new Error('Failed to load conversations');
            const data = await res.json();
            setConversations(data.conversations || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const viewConversation = (conv) => {
        setSelectedConv(conv);
        setReport(null);
    };

    const generateReport = async () => {
        if (!selectedConv) return;
        setReportLoading(true);
        setError(null);
        try {
            const res = await authFetch('/api/conversations/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: selectedConv.id, messages: selectedConv.messages }),
            });
            if (!res.ok) throw new Error('Report generation failed');
            const data = await res.json();
            setReport(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setReportLoading(false);
        }
    };

    const goBack = () => {
        setSelectedConv(null);
        setReport(null);
        setExpandedMsg(null);
    };

    const getScoreColor = (s) => {
        if (s >= 8) return '#22c55e';
        if (s >= 5) return '#f59e0b';
        return '#ef4444';
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} /><p style={{ marginTop: 12 }}>Loading conversation history...</p></div>;

    return (
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #22c55e, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <History size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Conversation Replay</h1>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Review past sessions, spot patterns, and track your improvement</p>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Conversation List */}
            {!selectedConv && (
                <div>
                    {conversations.length === 0 ? (
                        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>No conversations yet</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Start practicing in Free Practice to build your conversation history!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {conversations.map((conv, i) => (
                                <button key={conv.id || i} onClick={() => viewConversation(conv)} style={{ padding: 20, borderRadius: 14, border: '1px solid var(--border-color)', background: 'var(--card-bg)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <MessageSquare size={20} style={{ color: '#22c55e' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                                Session — {conv.date || 'Unknown date'}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {conv.messages?.length || 0} messages
                                                {conv.avg_fluency != null && <span> • Avg fluency: <strong style={{ color: getScoreColor(conv.avg_fluency) }}>{conv.avg_fluency.toFixed(1)}</strong></span>}
                                            </div>
                                            {conv.summary && (
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.summary}</div>
                                            )}
                                        </div>
                                    </div>
                                    <Eye size={18} style={{ color: 'var(--text-muted)' }} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Conversation Detail View */}
            {selectedConv && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 }}>
                        <ArrowLeft size={14} /> Back to conversations
                    </button>

                    {/* Session info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Session — {selectedConv.date}</h2>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedConv.messages?.length || 0} messages</div>
                        </div>
                        <button onClick={generateReport} disabled={reportLoading} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: reportLoading ? 'var(--border-color)' : 'linear-gradient(135deg, #22c55e, #06b6d4)', color: 'white', fontWeight: 700, fontSize: 13, cursor: reportLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {reportLoading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><FileText size={14} /> Generate Report</>}
                        </button>
                    </div>

                    {/* Messages */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                        {(selectedConv.messages || []).map((msg, i) => {
                            const isUser = msg.role === 'user';
                            const hasCorrection = msg.correction && msg.correction.original;
                            const isExpanded = expandedMsg === i;

                            return (
                                <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                                    <div style={{ maxWidth: '80%', padding: '14px 18px', borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isUser ? 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))' : 'rgba(255,255,255,0.04)', border: `1px solid ${isUser ? 'rgba(139,92,246,0.2)' : 'var(--border-color)'}` }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: isUser ? '#a78bfa' : '#22c55e', marginBottom: 6 }}>
                                            {isUser ? '🧑 You' : '🤖 Miss Nova'}
                                        </div>
                                        <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>{msg.text}</div>

                                        {/* Fluency score */}
                                        {msg.fluency_score != null && (
                                            <div style={{ marginTop: 8, fontSize: 12, color: getScoreColor(msg.fluency_score) }}>
                                                Fluency: {msg.fluency_score}/10
                                            </div>
                                        )}

                                        {/* Correction toggle */}
                                        {hasCorrection && (
                                            <div style={{ marginTop: 8 }}>
                                                <button onClick={() => setExpandedMsg(isExpanded ? null : i)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
                                                    ✏️ Correction {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                                {isExpanded && (
                                                    <div style={{ marginTop: 8, padding: 10, background: 'rgba(245,158,11,0.06)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.12)', fontSize: 12 }}>
                                                        <div style={{ marginBottom: 4 }}><span style={{ color: '#ef4444', textDecoration: 'line-through' }}>{msg.correction.original}</span></div>
                                                        <div style={{ marginBottom: 4 }}><span style={{ color: '#22c55e', fontWeight: 600 }}>{msg.correction.corrected}</span></div>
                                                        {msg.correction.explanation && <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{msg.correction.explanation}</div>}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* New word */}
                                        {msg.new_word && msg.new_word.word && (
                                            <div style={{ marginTop: 8, padding: 8, background: 'rgba(16,185,129,0.06)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.12)', fontSize: 12 }}>
                                                <span style={{ fontWeight: 700, color: '#10b981' }}>📖 {msg.new_word.word}:</span>
                                                <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>{msg.new_word.definition}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Report */}
                    {report && (
                        <div className="glass-card" style={{ padding: 24, animation: 'fadeIn 0.3s ease' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BarChart2 size={18} /> Session Report Card
                            </h3>

                            {/* Scores */}
                            {report.scores && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 20 }}>
                                    {Object.entries(report.scores).map(([key, value]) => (
                                        <div key={key} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, textAlign: 'center' }}>
                                            <div style={{ fontSize: 22, fontWeight: 800, color: getScoreColor(value) }}>{value}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Strengths */}
                            {report.strengths && report.strengths.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>✅ Strengths</h4>
                                    {report.strengths.map((s, i) => (
                                        <div key={i} style={{ padding: '8px 12px', marginBottom: 4, borderRadius: 8, background: 'rgba(34,197,94,0.06)', fontSize: 13, color: 'var(--text-primary)' }}>{s}</div>
                                    ))}
                                </div>
                            )}

                            {/* Areas to Improve */}
                            {report.improvements && report.improvements.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>⚡ Areas to Improve</h4>
                                    {report.improvements.map((s, i) => (
                                        <div key={i} style={{ padding: '8px 12px', marginBottom: 4, borderRadius: 8, background: 'rgba(245,158,11,0.06)', fontSize: 13, color: 'var(--text-primary)' }}>{s}</div>
                                    ))}
                                </div>
                            )}

                            {/* Grammar Patterns */}
                            {report.grammar_patterns && report.grammar_patterns.length > 0 && (
                                <div>
                                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', marginBottom: 8 }}>📝 Recurring Grammar Patterns</h4>
                                    {report.grammar_patterns.map((p, i) => (
                                        <div key={i} style={{ padding: '8px 12px', marginBottom: 4, borderRadius: 8, background: 'rgba(139,92,246,0.06)', fontSize: 13, color: 'var(--text-primary)' }}>{p}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
};

export default ConversationReplay;
