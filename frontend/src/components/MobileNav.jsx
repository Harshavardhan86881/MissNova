import React from 'react';
import { BarChart3, Mic, MessageSquare, BookOpen, Trophy } from 'lucide-react';

const MobileNav = ({ currentPage, navigateTo }) => {
    const items = [
        { id: 'dashboard', icon: BarChart3, label: 'Home' },
        { id: 'practice', icon: Mic, label: 'Practice' },
        { id: 'scenarios', icon: MessageSquare, label: 'Scenarios' },
        { id: 'vocabulary', icon: BookOpen, label: 'Vocab' },
        { id: 'progress', icon: Trophy, label: 'Progress' },
    ];

    return (
        <nav className="mobile-nav" role="navigation" aria-label="Main navigation" style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(6, 6, 15, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'none',
            justifyContent: 'space-around',
            padding: '6px 4px',
            paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
            zIndex: 100,
        }}>
            {items.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => navigateTo(item.id)}
                        aria-label={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            padding: '8px 14px',
                            background: isActive ? 'rgba(139, 92, 246, 0.1)' : 'none',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            color: isActive ? '#a78bfa' : 'var(--text-muted)',
                            transition: 'all 0.25s ease',
                            position: 'relative',
                        }}
                    >
                        {isActive && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '16px',
                                height: '2px',
                                borderRadius: '2px',
                                background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                            }} />
                        )}
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                        <span style={{
                            fontSize: '10px',
                            fontWeight: isActive ? '700' : '400',
                            letterSpacing: isActive ? '0.02em' : 'normal',
                        }}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};

export default MobileNav;
