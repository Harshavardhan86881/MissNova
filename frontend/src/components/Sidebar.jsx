import React, { useState, useRef, useEffect } from 'react';
import {
    MessageSquare, Mic, BookOpen, BarChart3, Target, Trophy,
    Zap, Languages, Sparkles, Shield, AlertTriangle, Flame, LogOut, Settings, User, ChevronDown, Globe, Menu, X, FileText, Sliders, Headphones
} from 'lucide-react';
import { trackEvent, EVENTS } from '../utils/analytics';
import { authFetch } from '../utils/authFetch';

// Available languages for learning
const AVAILABLE_LANGUAGES = [
    { code: 'english', name: 'English', flag: '🇺🇸', native: 'English', levels: ['beginner', 'intermediate', 'advanced'] },
    { code: 'spanish', name: 'Spanish', flag: '🇪🇸', native: 'Español', levels: ['beginner', 'intermediate'] },
    { code: 'french', name: 'French', flag: '🇫🇷', native: 'Français', levels: ['beginner', 'intermediate'] },
    { code: 'german', name: 'German', flag: '🇩🇪', native: 'Deutsch', levels: ['beginner'] },
    { code: 'japanese', name: 'Japanese', flag: '🇯🇵', native: '日本語', levels: ['beginner'] },
    { code: 'mandarin', name: 'Mandarin', flag: '🇨🇳', native: '中文', levels: ['beginner'] },
    { code: 'korean', name: 'Korean', flag: '🇰🇷', native: '한국어', levels: ['beginner'] },
    { code: 'portuguese', name: 'Portuguese', flag: '🇧🇷', native: 'Português', levels: ['beginner', 'intermediate'] },
    { code: 'hindi', name: 'Hindi', flag: '🇮🇳', native: 'हिंदी', levels: ['beginner', 'intermediate'] },
    { code: 'arabic', name: 'Arabic', flag: '🇸🇦', native: 'العربية', levels: ['beginner'] },
];

const Sidebar = ({ currentPage, navigateTo, stats }) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [currentLanguage, setCurrentLanguage] = useState('english');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const userMenuRef = useRef(null);
    const languageMenuRef = useRef(null);

    // Get user from localStorage
    const getStoredUser = () => {
        try {
            const auth = localStorage.getItem('voice_tutor_auth');
            if (auth) {
                const parsed = JSON.parse(auth);
                return parsed.user;
            }
        } catch (e) {
            return null;
        }
        return null;
    };

    const [user, setUser] = useState(getStoredUser());

    // Load saved language preference
    useEffect(() => {
        const savedLang = localStorage.getItem('voice_tutor_language');
        if (savedLang) {
            setCurrentLanguage(savedLang);
        }
    }, []);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
            if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
                setShowLanguageMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'practice', label: 'Free Practice', icon: Mic },
        { id: 'scenarios', label: 'Scenarios', icon: MessageSquare },
        { id: 'tongue-twisters', label: 'Pronunciation', icon: Languages },
        { id: 'daily-challenge', label: 'Daily Challenge', icon: Target },
        { id: 'daily-vocab', label: 'Daily Vocab', icon: Sparkles },
        { id: 'translate', label: 'Translator', icon: Globe },
        { id: 'vocabulary', label: 'Word Bank', icon: BookOpen },
        { id: 'progress', label: 'Progress', icon: Trophy },
        { id: 'bluf-generator', label: 'BLUF Generator', icon: FileText },
        { id: 'tone-calibrator', label: 'Tone Calibrator', icon: Sliders },
        { id: 'listening-simulator', label: 'Listening Sim', icon: Headphones },
    ];

    const streakAtRisk = stats?.streak_at_risk && stats?.streak_days > 0;
    const freezesAvailable = stats?.streak_freeze_available || 0;

    // Determine streak color based on days
    const getStreakColor = (days) => {
        if (days >= 30) return { color: '#ffd700', name: 'Gold', glow: '0 0 20px rgba(255, 215, 0, 0.5)' };
        if (days >= 14) return { color: '#c0c0c0', name: 'Silver', glow: '0 0 20px rgba(192, 192, 192, 0.4)' };
        if (days >= 7) return { color: '#cd7f32', name: 'Bronze', glow: '0 0 16px rgba(205, 127, 50, 0.4)' };
        if (days >= 3) return { color: '#f97316', name: 'Orange', glow: '0 0 12px rgba(249, 115, 22, 0.3)' };
        return { color: '#94a3b8', name: 'Gray', glow: 'none' };
    };

    const streakStyle = getStreakColor(stats?.streak_days || 0);

    // Get current language object
    const currentLangObj = AVAILABLE_LANGUAGES.find(l => l.code === currentLanguage) || AVAILABLE_LANGUAGES[0];

    // Handle logout
    const handleLogout = async () => {
        try {
            // Clear auth data
            localStorage.removeItem('voice_tutor_auth');
            localStorage.removeItem('voice_tutor_preferences');
            localStorage.removeItem('voice_tutor_onboarding');

            // Track logout event
            trackEvent(EVENTS.LOGOUT, { user_id: user?.id });

            // Call logout API (if exists)
            try {
                await authFetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            } catch (e) {
                // Ignore API errors
            }

            // Reload page to show onboarding
            window.location.reload();
        } catch (e) {
            console.error('Logout error:', e);
        }
    };

    // Handle language change
    const handleLanguageChange = (langCode) => {
        setCurrentLanguage(langCode);
        localStorage.setItem('voice_tutor_language', langCode);
        setShowLanguageMenu(false);

        // Track language change
        trackEvent(EVENTS.LANGUAGE_CHANGE, { language: langCode });

        // Update backend preference (when logged in)
        if (user) {
            authFetch(`/api/set-language?language=${langCode}`, {
                method: 'POST',
                credentials: 'include',
            }).catch(() => { });
        }
    };

    return (
        <>
            {/* Mobile Header */}
            <div style={{
                display: 'none',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '60px',
                background: 'rgba(10, 10, 26, 0.95)',
                backdropFilter: 'blur(20px)',
                zIndex: 100,
                padding: '0 16px',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
            }} className="mobile-header">
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '8px',
                    }}
                >
                    <Menu size={24} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: '800', color: 'white',
                    }}>N</div>
                    <span style={{ fontWeight: '700', fontSize: '16px' }} className="gradient-text">
                        Miss Nova
                    </span>
                </div>

                {/* Language quick switch */}
                <button
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '8px',
                        fontSize: '20px',
                    }}
                >
                    {currentLangObj.flag}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    zIndex: 200,
                    animation: 'fadeIn 0.2s ease',
                }} onClick={() => setIsMobileMenuOpen(false)}>
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '280px',
                        background: 'rgba(10, 10, 26, 0.98)',
                        padding: '20px',
                        overflowY: 'auto',
                    }} onClick={e => e.stopPropagation()}>
                        {/* Close button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                            }}
                        >
                            <X size={24} />
                        </button>

                        {/* Mobile nav items */}
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '40px' }}>
                            {navItems.map(item => {
                                const Icon = item.icon;
                                const isActive = currentPage === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            navigateTo(item.id);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        style={{
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                                            color: isActive ? '#fff' : 'var(--text-secondary)',
                                            fontSize: '15px',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <Icon size={20} />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Mobile logout */}
                        <button
                            onClick={handleLogout}
                            style={{
                                marginTop: '24px',
                                width: '100%',
                                padding: '14px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '12px',
                                color: '#ef4444',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside className="desktop-nav" style={{
                width: '260px',
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 14px',
                borderRight: '1px solid var(--border-subtle)',
                background: 'rgba(10, 10, 26, 0.95)',
                backdropFilter: 'blur(20px)',
                zIndex: 50,
                overflowY: 'auto',
            }}>
                {/* Logo */}
                <div style={{ padding: '8px 12px 24px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '20px', fontWeight: '800', color: 'white',
                        }}>N</div>
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '18px' }} className="gradient-text">
                                Miss Nova
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-2px' }}>
                                Communication Coach
                            </div>
                        </div>
                    </div>
                </div>

                {/* Language Selector */}
                <div ref={languageMenuRef} style={{ position: 'relative', marginBottom: '16px' }}>
                    <button
                        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>{currentLangObj.flag}</span>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {currentLangObj.name}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                Learning
                            </div>
                        </div>
                        <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>

                    {/* Language Dropdown */}
                    {showLanguageMenu && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '8px',
                            background: 'rgba(15, 15, 35, 0.98)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '12px',
                            padding: '8px',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            zIndex: 100,
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                        }}>
                            {AVAILABLE_LANGUAGES.map(lang => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLanguageChange(lang.code)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: currentLanguage === lang.code
                                            ? 'rgba(139, 92, 246, 0.15)'
                                            : 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                            {lang.name}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            {lang.native}
                                        </div>
                                    </div>
                                    {currentLanguage === lang.code && (
                                        <div style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: '#8b5cf6',
                                        }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* XP Level Bar */}
                {stats && (
                    <div style={{
                        padding: '12px 14px',
                        background: 'rgba(139, 92, 246, 0.06)',
                        borderRadius: '12px',
                        marginBottom: '16px',
                        border: '1px solid rgba(139, 92, 246, 0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Zap size={14} style={{ color: '#fbbf24' }} />
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24' }}>Level {stats.level}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {stats.xp_in_level}/{stats.xp_for_next_level} XP
                            </span>
                        </div>
                        <div className="xp-bar-bg">
                            <div className="xp-bar-fill" style={{
                                width: `${(stats.xp_in_level / stats.xp_for_next_level) * 100}%`
                            }} />
                        </div>
                    </div>
                )}

                {/* Glowing Streak Counter */}
                {stats && stats.streak_days > 0 && (
                    <div style={{
                        padding: '12px 14px',
                        background: streakAtRisk
                            ? 'rgba(239, 68, 68, 0.08)'
                            : `rgba(${streakStyle.name === 'Gold' ? '255, 215, 0' : streakStyle.name === 'Silver' ? '192, 192, 192' : streakStyle.name === 'Bronze' ? '205, 127, 50' : '249, 115, 22'}, 0.08)`,
                        borderRadius: '12px',
                        marginBottom: '16px',
                        border: streakAtRisk
                            ? '1px solid rgba(239, 68, 68, 0.2)'
                            : `1px solid ${streakStyle.color}30`,
                        transition: 'all 0.3s ease',
                        ...(streakAtRisk ? {
                            animation: 'pulse-subtle 2s ease-in-out infinite',
                        } : {}),
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                fontSize: '28px',
                                animation: streakAtRisk ? 'shake 0.5s ease infinite' : 'flame-pulse 1.5s ease-in-out infinite',
                                filter: `drop-shadow(${streakStyle.glow})`,
                                WebkitFilter: `drop-shadow(${streakStyle.glow})`,
                            }}>
                                {streakAtRisk ? '⚠️' : '🔥'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: '800',
                                    color: streakAtRisk ? '#ef4444' : streakStyle.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}>
                                    {stats.streak_days}
                                    <span style={{ fontSize: '12px', fontWeight: '600', opacity: 0.8 }}>
                                        day{stats.streak_days !== 1 ? 's' : ''}
                                    </span>
                                    {stats.streak_days >= 7 && !streakAtRisk && (
                                        <span style={{
                                            fontSize: '12px',
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            background: `${streakStyle.color}20`,
                                            color: streakStyle.color,
                                            fontWeight: '600',
                                        }}>
                                            {stats.streak_days >= 30 ? 'Gold' : stats.streak_days >= 14 ? 'Silver' : 'Bronze'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Nav Items */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => navigateTo(item.id)}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                                style={{ border: isActive ? undefined : 'none', background: isActive ? undefined : 'transparent' }}
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* User Profile & Logout Section */}
                <div style={{
                    padding: '14px',
                    borderTop: '1px solid var(--border-subtle)',
                    marginTop: '12px',
                }}>
                    {/* User Profile Button */}
                    <div ref={userMenuRef} style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: '700',
                                color: 'white',
                            }}>
                                {user?.username?.charAt(0)?.toUpperCase() || user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                    {user?.first_name || user?.username || 'User'}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    {user?.email || 'View profile'}
                                </div>
                            </div>
                            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                        </button>

                        {/* User Dropdown Menu */}
                        {showUserMenu && (
                            <div style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: 0,
                                right: 0,
                                marginBottom: '8px',
                                background: 'rgba(15, 15, 35, 0.98)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '12px',
                                padding: '8px',
                                zIndex: 100,
                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                            }}>
                                <button
                                    onClick={() => {
                                        navigateTo('progress');
                                        setShowUserMenu(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        color: 'var(--text-secondary)',
                                        fontSize: '13px',
                                    }}
                                >
                                    <User size={16} />
                                    <span>View Profile</span>
                                </button>

                                <button
                                    onClick={() => {
                                        navigateTo('settings');
                                        setShowUserMenu(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        color: 'var(--text-secondary)',
                                        fontSize: '13px',
                                    }}
                                >
                                    <Settings size={16} />
                                    <span>Settings</span>
                                </button>

                                <div style={{
                                    height: '1px',
                                    background: 'var(--border-subtle)',
                                    margin: '8px 0',
                                }} />

                                <button
                                    onClick={handleLogout}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        color: '#ef4444',
                                        fontSize: '13px',
                                    }}
                                >
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats Grid */}
                    {stats && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            marginTop: '12px',
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#a78bfa' }}>{stats.words_spoken}</div>
                                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Words</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#34d399' }}>{stats.average_accuracy}/10</div>
                                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Fluency</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Animations */}
                <style>{`
                    @keyframes pulse-subtle {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                        50% { box-shadow: 0 0 12px 2px rgba(239, 68, 68, 0.15); }
                    }
                    
                    @keyframes flame-pulse {
                        0%, 100% { 
                            transform: scale(1);
                            filter: drop-shadow(0 0 8px currentColor);
                        }
                        50% { 
                            transform: scale(1.1);
                            filter: drop-shadow(0 0 16px currentColor);
                        }
                    }
                    
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-2px); }
                        75% { transform: translateX(2px); }
                    }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    @media (max-width: 768px) {
                        .desktop-nav {
                            display: none !important;
                        }
                        .mobile-header {
                            display: flex !important;
                        }
                    }
                `}</style>
            </aside>
        </>
    );
};

export default Sidebar;