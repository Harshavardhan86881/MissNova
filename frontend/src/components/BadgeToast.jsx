import React, { useEffect, useState } from 'react';
import { X, Award } from 'lucide-react';
import ShareButton from './ShareButton';

const BadgeToast = ({ badge, onDismiss, stats }) => {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(onDismiss, 300);
        }, 6000); // Extended from 4s to 6s to give time for sharing
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div
            className={exiting ? 'toast-exit' : 'toast-enter'}
            style={{
                position: 'fixed',
                bottom: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 200,
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.15))',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '16px',
                padding: '16px 24px',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                minWidth: '340px',
                boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)',
            }}
        >
            <div style={{ fontSize: '36px' }}>{badge.icon}</div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <Award size={14} style={{ color: '#fbbf24' }} />
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Badge Earned!
                    </span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{badge.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{badge.description}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Share button for the badge */}
                <ShareButton
                    stats={stats || {}}
                    badge={badge}
                    variant="icon"
                    style={{
                        color: '#a78bfa',
                        background: 'rgba(139, 92, 246, 0.15)',
                        borderRadius: '8px',
                        padding: '6px',
                    }}
                />
                <button
                    onClick={() => { setExiting(true); setTimeout(onDismiss, 300); }}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: '4px',
                    }}
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default BadgeToast;
