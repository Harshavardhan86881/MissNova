import React, { useState, useEffect } from 'react';
import { BookOpen, Volume2, Search, Filter, Star, Trash2 } from 'lucide-react';
import { authFetch } from '../utils/authFetch';

const VocabularyBank = () => {
    const [words, setWords] = useState([]);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('newest'); // newest, alphabetical, mastery

    useEffect(() => {
        authFetch('/api/vocabulary').then(r => r.json()).then(setWords).catch(() => { });
    }, []);

    const speakWord = (text) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
    };

    const filtered = words
        .filter(w =>
            w.word?.toLowerCase().includes(search.toLowerCase()) ||
            w.definition?.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            if (sort === 'alphabetical') return (a.word || '').localeCompare(b.word || '');
            if (sort === 'mastery') return (b.mastery || 0) - (a.mastery || 0);
            return 0; // newest = default order
        });

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <BookOpen size={26} style={{ color: '#f472b6' }} /> Vocabulary Bank
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Words you've learned from conversations — {words.length} total
                </p>
            </div>

            {/* Search & Sort */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{
                    flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                    borderRadius: '12px', padding: '0 14px',
                }}>
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search words..."
                        style={{
                            flex: 1, padding: '12px 0', background: 'none', border: 'none',
                            color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                        { id: 'newest', label: 'Newest' },
                        { id: 'alphabetical', label: 'A-Z' },
                    ].map(s => (
                        <button key={s.id} onClick={() => setSort(s.id)} className={`tab-btn ${sort === s.id ? 'active' : ''}`}>
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Words Grid */}
            {filtered.length > 0 ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '12px',
                }}>
                    {filtered.map((word, i) => (
                        <div key={i} className="vocab-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '18px', fontWeight: '800' }} className="gradient-text">
                                        {word.word}
                                    </span>
                                    <button onClick={() => speakWord(word.word)} style={{
                                        background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', padding: '2px',
                                    }}>
                                        <Volume2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.5' }}>
                                {word.definition}
                            </p>

                            {word.example && (
                                <div style={{
                                    fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic',
                                    background: 'rgba(139,92,246,0.04)', borderRadius: '8px', padding: '8px 10px',
                                    borderLeft: '2px solid rgba(139,92,246,0.2)',
                                }}>
                                    "{word.example}"
                                </div>
                            )}

                            {word.added_at && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                    Added {new Date(word.added_at).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{
                    textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                        {search ? 'No words match your search' : 'No words yet'}
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '4px', maxWidth: '300px', margin: '4px auto 0' }}>
                        {search ? 'Try a different search term' : 'Start practicing and Miss Nova will teach you new words along the way!'}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VocabularyBank;
