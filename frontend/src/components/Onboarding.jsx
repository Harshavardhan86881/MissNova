import React, { useState, useEffect, useCallback } from 'react';
import { Mic, Target, BookOpen, Sparkles, ArrowRight, ArrowLeft, CheckCircle, Zap, MessageSquare, Languages, Star, Eye, EyeOff, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import { trackEvent, EVENTS, completeOnboarding } from '../utils/analytics';
import { authFetch } from '../utils/authFetch';
import zxcvbn from 'zxcvbn';

const GOALS = [
    { id: 'confidence', label: 'Build Confidence', icon: '💪', desc: 'Speak without hesitation' },
    { id: 'grammar', label: 'Improve Grammar', icon: '📝', desc: 'Master sentence structures' },
    { id: 'vocabulary', label: 'Expand Vocabulary', icon: '📚', desc: 'Learn professional words' },
    { id: 'pronunciation', label: 'Better Pronunciation', icon: '🎤', desc: 'Sound more natural' },
    { id: 'professional', label: 'Professional English', icon: '💼', desc: 'Ace interviews & meetings' },
    { id: 'daily', label: 'Daily Conversations', icon: '☕', desc: 'Chat naturally in English' },
];

const LEVELS = [
    { id: 'beginner', label: 'Beginner', icon: '🌱', desc: 'I know basic English but struggle to form sentences', color: '#34d399' },
    { id: 'intermediate', label: 'Intermediate', icon: '🌿', desc: 'I can communicate but make frequent mistakes', color: '#fbbf24' },
    { id: 'advanced', label: 'Advanced', icon: '🌳', desc: 'I speak well but want to sound more natural', color: '#a78bfa' },
];

const DAILY_TARGETS = [
    { id: '5min', label: '5 min/day', desc: 'Quick daily touch', icon: '⚡' },
    { id: '10min', label: '10 min/day', desc: 'Steady progress', icon: '🎯' },
    { id: '20min', label: '20 min/day', desc: 'Serious learner', icon: '🚀' },
];

// Available languages
const LEARNING_LANGUAGES = [
    { code: 'english', name: 'English', flag: '🇺🇸', native: 'English' },
    { code: 'spanish', name: 'Spanish', flag: '🇪🇸', native: 'Español' },
    { code: 'french', name: 'French', flag: '🇫🇷', native: 'Français' },
    { code: 'german', name: 'German', flag: '🇩🇪', native: 'Deutsch' },
    { code: 'japanese', name: 'Japanese', flag: '🇯🇵', native: '日本語' },
    { code: 'mandarin', name: 'Mandarin Chinese', flag: '🇨🇳', native: '中文' },
    { code: 'korean', name: 'Korean', flag: '🇰🇷', native: '한국어' },
    { code: 'portuguese', name: 'Portuguese', flag: '🇧🇷', native: 'Português' },
    { code: 'hindi', name: 'Hindi', flag: '🇮🇳', native: 'हिंदी' },
    { code: 'arabic', name: 'Arabic', flag: '🇸🇦', native: 'العربية' },
];

// Password strength colors and labels
const STRENGTH_CONFIG = {
    0: { label: 'Very Weak', color: '#ef4444', width: '20%' },
    1: { label: 'Weak', color: '#f97316', width: '40%' },
    2: { label: 'Fair', color: '#fbbf24', width: '60%' },
    3: { label: 'Good', color: '#22c55e', width: '80%' },
    4: { label: 'Strong', color: '#8b5cf6', width: '100%' },
};

const Onboarding = ({ onComplete, navigateTo }) => {
    const [step, setStep] = useState(0);
    const [mode, setMode] = useState('welcome'); // welcome, login, signup, goals, level, target
    const [isExiting, setIsExiting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Auth form state
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(null);
    const [pwnedWarning, setPwnedWarning] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [resetPasswordEmail, setResetPasswordEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);

    // Onboarding preferences
    const [selectedGoals, setSelectedGoals] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('english');

    useEffect(() => {
        trackEvent(EVENTS.ONBOARDING_START);
    }, []);

    // Check password strength with zxcvbn
    useEffect(() => {
        if (password && mode === 'signup') {
            const result = zxcvbn(password);
            setPasswordStrength(result);
        } else {
            setPasswordStrength(null);
        }
    }, [password, mode]);

    // Toggle goal selection
    const toggleGoal = (id) => {
        setSelectedGoals(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    // Password strength indicator component
    const PasswordStrengthIndicator = ({ strength }) => {
        if (!strength) return null;

        const config = STRENGTH_CONFIG[strength.score] || STRENGTH_CONFIG[0];
        const suggestions = strength.feedback?.suggestions || [];

        return (
            <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Password strength</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: config.color }}>
                        {config.label}
                    </span>
                </div>
                <div style={{
                    height: '4px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%',
                        width: config.width,
                        background: config.color,
                        borderRadius: '2px',
                        transition: 'all 0.3s ease'
                    }} />
                </div>
                {suggestions.length > 0 && (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        {suggestions[0]}
                    </p>
                )}
            </div>
        );
    };

    // Handle signup
    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setPwnedWarning('');

        // Validate password strength
        if (!passwordStrength || passwordStrength.score < 2) {
            setError('Please choose a stronger password (at least "Fair" strength)');
            return;
        }

        // Validate confirm password
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    username,
                    password,
                    goals: selectedGoals,
                    preferred_level: selectedLevel,
                    daily_goal_minutes: selectedTarget === '5min' ? 5 : selectedTarget === '20min' ? 20 : 10,
                    learning_language: selectedLanguage,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Check for pwned password warning
                if (data.detail?.pwned) {
                    setPwnedWarning(data.detail.message);
                } else {
                    setError(data.detail?.message || 'Signup failed. Please try again.');
                }
                return;
            }

            // Save auth tokens
            if (data.access_token) {
                localStorage.setItem('voice_tutor_auth', JSON.stringify({
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    user: data.user,
                    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
                }));
                // Save selected language preference
                localStorage.setItem('voice_tutor_language', selectedLanguage);
                // Set language on backend
                authFetch(`/api/set-language?language=${selectedLanguage}`, { method: 'POST' }).catch(() => { });
            }

            trackEvent(EVENTS.ONBOARDING_COMPLETE, { method: 'signup' });
            completeOnboarding();
            setIsExiting(true);
            setTimeout(() => {
                onComplete();
                navigateTo('dashboard');
            }, 400);

        } catch (err) {
            setError('Unable to connect. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle login
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.detail?.message || 'Invalid email or password');
                return;
            }

            // Save auth tokens
            if (data.access_token) {
                localStorage.setItem('voice_tutor_auth', JSON.stringify({
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    user: data.user,
                    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
                }));
            }

            trackEvent(EVENTS.ONBOARDING_COMPLETE, { method: 'login' });
            completeOnboarding();
            setIsExiting(true);
            setTimeout(() => {
                onComplete();
                navigateTo('dashboard');
            }, 400);

        } catch (err) {
            setError('Unable to connect. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle forgot / reset password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmNewPassword) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetPasswordEmail, new_password: newPassword }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.detail?.message || 'Reset failed. Please try again.');
                return;
            }
            setResetSuccess(true);
        } catch (err) {
            setError('Unable to connect. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = (goToPage = 'dashboard') => {
        // Save preferences
        const prefs = {
            goals: selectedGoals,
            level: selectedLevel,
            dailyTarget: selectedTarget,
            completedAt: new Date().toISOString(),
        };
        localStorage.setItem('voice_tutor_preferences', JSON.stringify(prefs));
        completeOnboarding();

        setIsExiting(true);
        setTimeout(() => {
            onComplete();
            if (goToPage !== 'dashboard') {
                navigateTo(goToPage);
            }
        }, 400);
    };

    const handleSkip = () => {
        trackEvent(EVENTS.ONBOARDING_SKIP, { atStep: step });
        completeOnboarding();
        setIsExiting(true);
        setTimeout(() => onComplete(), 400);
    };

    // Render auth form (login/signup)
    const renderAuthForm = () => {
        // Forgot password / reset password sub-form
        if (forgotPasswordMode) {
            return (
                <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto', animation: 'fadeSlideIn 0.5s ease' }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(40px)',
                        WebkitBackdropFilter: 'blur(40px)', borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.08)', padding: '32px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '16px',
                                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px',
                            }}>
                                <Shield size={26} style={{ color: 'white' }} />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '6px' }}>Reset Password</h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Enter your email and a new password to regain access.
                            </p>
                        </div>

                        {resetSuccess ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <CheckCircle2 size={48} style={{ color: '#22c55e', margin: '0 auto 16px', display: 'block' }} />
                                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: '#22c55e' }}>
                                    Password Reset!
                                </h3>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                    Your password has been updated. You can now sign in with your new password.
                                </p>
                                <button
                                    onClick={() => {
                                        setForgotPasswordMode(false);
                                        setResetSuccess(false);
                                        setResetPasswordEmail('');
                                        setNewPassword('');
                                        setConfirmNewPassword('');
                                        setError('');
                                        setMode('login');
                                    }}
                                    style={{
                                        padding: '14px 32px', borderRadius: '12px', border: 'none',
                                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                                        color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                                    }}
                                >
                                    Sign In Now
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleResetPassword}>
                                {error && (
                                    <div style={{
                                        padding: '14px', background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px',
                                        marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px',
                                    }}>
                                        <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                                        <span style={{ fontSize: '13px', color: '#ef4444' }}>{error}</span>
                                    </div>
                                )}
                                <div style={{ marginBottom: '16px' }}>
                                    <label htmlFor="reset-email" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        Email Address
                                    </label>
                                    <input
                                        id="reset-email"
                                        name="email"
                                        type="email" value={resetPasswordEmail}
                                        autoComplete="email"
                                        onChange={(e) => setResetPasswordEmail(e.target.value)}
                                        placeholder="you@example.com" required
                                        style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '15px', color: '#fff', outline: 'none', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.background = 'rgba(139,92,246,0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                    />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label htmlFor="reset-new-password" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        New Password
                                    </label>
                                    <input
                                        id="reset-new-password"
                                        name="newPassword"
                                        type="password" value={newPassword}
                                        autoComplete="new-password"
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 8 characters" required minLength={8}
                                        style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '15px', color: '#fff', outline: 'none', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.background = 'rgba(139,92,246,0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                    />
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <label htmlFor="reset-confirm-password" style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                        Confirm New Password
                                    </label>
                                    <input
                                        id="reset-confirm-password"
                                        name="confirmNewPassword"
                                        type="password" value={confirmNewPassword}
                                        autoComplete="new-password"
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        placeholder="Repeat new password" required minLength={8}
                                        style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '15px', color: '#fff', outline: 'none', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.background = 'rgba(139,92,246,0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                                    />
                                </div>
                                <button type="submit" disabled={isLoading} style={{
                                    width: '100%', padding: '16px', border: 'none', borderRadius: '12px',
                                    background: isLoading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                                    color: '#fff', fontSize: '15px', fontWeight: '600',
                                    cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
                                    boxShadow: '0 8px 30px rgba(139,92,246,0.3)',
                                }}>
                                    {isLoading ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </form>
                        )}
                    </div>
                    <button onClick={() => { setForgotPasswordMode(false); setError(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '20px auto 0', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>
                        <ArrowLeft size={14} /> Back to Sign In
                    </button>
                </div>
            );
        }

        return (
        <div style={{
            width: '100%',
            maxWidth: '400px',
            margin: '0 auto',
            animation: 'fadeSlideIn 0.5s ease'
        }}>
            {/* Glassmorphism card */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}>
                {/* Tab switcher */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '4px',
                    marginBottom: '24px',
                }}>
                    <button
                        onClick={() => { setMode('login'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            border: 'none',
                            background: mode === 'login' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                            color: mode === 'login' ? '#fff' : 'var(--text-muted)',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => { setMode('signup'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '10px',
                            border: 'none',
                            background: mode === 'signup' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                            color: mode === 'signup' ? '#fff' : 'var(--text-muted)',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        Create Account
                    </button>
                </div>

                {/* Error message */}
                {error && (
                    <div style={{
                        padding: '14px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '12px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                    }}>
                        <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: '#ef4444' }}>{error}</span>
                    </div>
                )}

                {/* Pwned password warning */}
                {pwnedWarning && (
                    <div style={{
                        padding: '14px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: '12px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                    }}>
                        <Shield size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: '#f59e0b' }}>{pwnedWarning}</span>
                    </div>
                )}

                <form onSubmit={mode === 'signup' ? handleSignup : handleLogin}>
                    {/* Email field */}
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="auth-email" style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px'
                        }}>
                            Email
                        </label>
                        <input
                            id="auth-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                fontSize: '15px',
                                color: '#fff',
                                outline: 'none',
                                transition: 'all 0.2s ease',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                                e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                            }}
                        />
                    </div>

                    {/* Username field (signup only) */}
                    {mode === 'signup' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label htmlFor="auth-username" style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: 'var(--text-secondary)',
                                marginBottom: '8px'
                            }}>
                                Username
                            </label>
                            <input
                                id="auth-username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                placeholder="johndoe"
                                required
                                minLength={3}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    fontSize: '15px',
                                    color: '#fff',
                                    outline: 'none',
                                    transition: 'all 0.2s ease',
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                                    e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                }}
                            />
                        </div>
                    )}

                    {/* Password field */}
                    <div style={{ marginBottom: mode === 'signup' ? '8px' : '24px' }}>
                        <label htmlFor="auth-password" style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px'
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="auth-password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={mode === 'signup' ? 'Create a strong password' : 'Enter your password'}
                                required
                                minLength={8}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    paddingRight: '48px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    fontSize: '15px',
                                    color: '#fff',
                                    outline: 'none',
                                    transition: 'all 0.2s ease',
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                                    e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '14px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Password strength indicator (signup only) */}
                        {mode === 'signup' && password && (
                            <PasswordStrengthIndicator strength={passwordStrength} />
                        )}
                    </div>

                    {/* Confirm Password (signup only) */}
                    {mode === 'signup' && (
                        <div style={{ marginBottom: '24px' }}>
                            <label htmlFor="auth-confirm-password" style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: 'var(--text-secondary)',
                                marginBottom: '8px',
                            }}>
                                Confirm Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="auth-confirm-password"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repeat your password"
                                    required
                                    minLength={8}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        paddingRight: '48px',
                                        background: confirmPassword && password !== confirmPassword
                                            ? 'rgba(239,68,68,0.08)'
                                            : 'rgba(255,255,255,0.05)',
                                        border: confirmPassword && password !== confirmPassword
                                            ? '1px solid rgba(239,68,68,0.4)'
                                            : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        color: '#fff',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onFocus={(e) => {
                                        if (!(confirmPassword && password !== confirmPassword)) {
                                            e.target.style.borderColor = 'rgba(139,92,246,0.5)';
                                            e.target.style.background = 'rgba(139,92,246,0.1)';
                                        }
                                    }}
                                    onBlur={(e) => {
                                        if (!(confirmPassword && password !== confirmPassword)) {
                                            e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                            e.target.style.background = 'rgba(255,255,255,0.05)';
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{
                                        position: 'absolute', right: '14px', top: '50%',
                                        transform: 'translateY(-50%)', background: 'none',
                                        border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px',
                                    }}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {confirmPassword && password !== confirmPassword && (
                                <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px' }}>
                                    ✗ Passwords do not match
                                </p>
                            )}
                            {confirmPassword && password === confirmPassword && (
                                <p style={{ fontSize: '11px', color: '#22c55e', marginTop: '6px' }}>
                                    ✓ Passwords match
                                </p>
                            )}
                        </div>
                    )}

                    {/* Forgot password link (login only) */}
                    {mode === 'login' && (
                        <div style={{ textAlign: 'right', marginBottom: '20px', marginTop: '-8px' }}>
                            <button
                                type="button"
                                onClick={() => { setForgotPasswordMode(true); setError(''); }}
                                style={{
                                    background: 'none', border: 'none', color: '#a78bfa',
                                    fontSize: '13px', cursor: 'pointer', padding: '0',
                                    textDecoration: 'underline', textUnderlineOffset: '2px',
                                }}
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: isLoading
                                ? 'rgba(139, 92, 246, 0.5)'
                                : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 8px 30px rgba(139, 92, 246, 0.3)',
                        }}
                    >
                        {isLoading
                            ? (mode === 'signup' ? 'Creating Account...' : 'Signing In...')
                            : (mode === 'signup' ? 'Create Account' : 'Sign In')
                        }
                    </button>
                </form>

                {/* Security badges */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                    {[
                        { icon: <Shield size={14} />, text: 'Encrypted' },
                        { icon: <CheckCircle2 size={14} />, text: 'Breach Check' },
                        { icon: <Zap size={14} />, text: 'Secure Auth' },
                    ].map((badge, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                        }}>
                            {badge.icon}
                            <span>{badge.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Back button */}
            <button
                onClick={() => setMode('welcome')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: '20px auto 0',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    cursor: 'pointer',
                }}
            >
                <ArrowLeft size={14} /> Back to welcome
            </button>
        </div>
        );
    };

    // Render welcome step
    const renderWelcome = () => (
        <div style={{ textAlign: 'center', animation: 'fadeSlideIn 0.5s ease' }}>
            <div style={{
                width: '100px', height: '100px', borderRadius: '28px',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '48px', fontWeight: '900', color: 'white',
                margin: '0 auto 28px', boxShadow: '0 12px 40px rgba(139, 92, 246, 0.4)',
                animation: 'floatGlow 6s ease-in-out infinite',
            }}>N</div>

            <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '12px', lineHeight: '1.2' }}>
                Meet <span className="gradient-text">Miss Nova</span>
            </h1>
            <p style={{ fontSize: '17px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.6' }}>
                Your personal AI communication coach
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto 36px' }}>
                Practice speaking, expand your vocabulary, and build confidence — all with real-time AI feedback.
            </p>

            {/* Feature highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '420px', margin: '0 auto 36px' }}>
                {[
                    { icon: <Mic size={20} />, label: 'Voice Practice', color: '#8b5cf6' },
                    { icon: <MessageSquare size={20} />, label: 'Live Scenarios', color: '#ec4899' },
                    { icon: <Star size={20} />, label: 'Earn XP & Badges', color: '#fbbf24' },
                ].map((f, i) => (
                    <div key={i} style={{
                        padding: '16px 12px', borderRadius: '14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-subtle)',
                    }}>
                        <div style={{ color: f.color, marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>{f.icon}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{f.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                <button
                    onClick={() => setMode('signup')}
                    className="btn-primary"
                    style={{
                        padding: '14px 36px', fontSize: '16px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        boxShadow: '0 8px 30px rgba(139, 92, 246, 0.3)',
                    }}
                >
                    Get Started <ArrowRight size={18} />
                </button>
                <button
                    onClick={() => setMode('login')}
                    className="btn-secondary"
                    style={{ padding: '14px 28px', fontSize: '16px', borderRadius: '14px' }}
                >
                    Sign In
                </button>
            </div>
        </div>
    );

    // Render preferences steps
    const renderPreferences = () => {
        switch (step) {
            case 1:
                return (
                    <div style={{ animation: 'fadeSlideIn 0.5s ease' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', textAlign: 'center' }}>
                            What language do you want to learn? 🌍
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px', textAlign: 'center' }}>
                            Choose your target language — you can change this later
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '480px', margin: '0 auto' }}>
                            {LEARNING_LANGUAGES.map(lang => {
                                const isSelected = selectedLanguage === lang.code;
                                return (
                                    <button
                                        key={lang.code}
                                        onClick={() => setSelectedLanguage(lang.code)}
                                        style={{
                                            padding: '18px 16px',
                                            borderRadius: '14px',
                                            border: isSelected
                                                ? '2px solid rgba(139, 92, 246, 0.5)'
                                                : '1px solid var(--border-subtle)',
                                            background: isSelected
                                                ? 'rgba(139, 92, 246, 0.1)'
                                                : 'rgba(255,255,255,0.03)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s ease',
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            position: 'relative',
                                        }}
                                    >
                                        <span style={{ fontSize: '28px' }}>{lang.flag}</span>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                                                {lang.name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lang.native}</div>
                                        </div>
                                        {isSelected && (
                                            <CheckCircle size={18} style={{ position: 'absolute', top: '10px', right: '10px', color: '#8b5cf6' }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div style={{ animation: 'fadeSlideIn 0.5s ease' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', textAlign: 'center' }}>
                            What are your goals? 🎯
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px', textAlign: 'center' }}>
                            Select all that apply — we'll personalize your experience
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '480px', margin: '0 auto' }}>
                            {GOALS.map(goal => {
                                const isSelected = selectedGoals.includes(goal.id);
                                return (
                                    <button
                                        key={goal.id}
                                        onClick={() => toggleGoal(goal.id)}
                                        style={{
                                            padding: '18px 16px',
                                            borderRadius: '14px',
                                            border: isSelected
                                                ? '2px solid rgba(139, 92, 246, 0.5)'
                                                : '1px solid var(--border-subtle)',
                                            background: isSelected
                                                ? 'rgba(139, 92, 246, 0.1)'
                                                : 'rgba(255,255,255,0.03)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s ease',
                                            display: 'flex', alignItems: 'flex-start', gap: '12px',
                                            position: 'relative',
                                        }}
                                    >
                                        <span style={{ fontSize: '26px' }}>{goal.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                                                {goal.label}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{goal.desc}</div>
                                        </div>
                                        {isSelected && (
                                            <CheckCircle size={18} style={{ position: 'absolute', top: '10px', right: '10px', color: '#8b5cf6' }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div style={{ animation: 'fadeSlideIn 0.5s ease' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', textAlign: 'center' }}>
                            Your current level? 🌿
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px', textAlign: 'center' }}>
                            We'll match content to your skill level
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '420px', margin: '0 auto' }}>
                            {LEVELS.map(level => {
                                const isSelected = selectedLevel === level.id;
                                return (
                                    <button
                                        key={level.id}
                                        onClick={() => setSelectedLevel(level.id)}
                                        style={{
                                            padding: '22px 20px',
                                            borderRadius: '16px',
                                            border: isSelected
                                                ? `2px solid ${level.color}40`
                                                : '1px solid var(--border-subtle)',
                                            background: isSelected
                                                ? `${level.color}15`
                                                : 'rgba(255,255,255,0.03)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s ease',
                                            display: 'flex', alignItems: 'center', gap: '16px',
                                        }}
                                    >
                                        <span style={{ fontSize: '36px' }}>{level.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                {level.label}
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                                {level.desc}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <CheckCircle size={22} style={{ color: level.color, flexShrink: 0 }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div style={{ animation: 'fadeSlideIn 0.5s ease' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', textAlign: 'center' }}>
                            Daily practice goal ⏱️
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px', textAlign: 'center' }}>
                            Consistency beats intensity — even 5 minutes helps!
                        </p>

                        <div style={{ display: 'flex', gap: '14px', maxWidth: '420px', margin: '0 auto 36px', justifyContent: 'center' }}>
                            {DAILY_TARGETS.map(target => {
                                const isSelected = selectedTarget === target.id;
                                return (
                                    <button
                                        key={target.id}
                                        onClick={() => setSelectedTarget(target.id)}
                                        style={{
                                            flex: 1,
                                            padding: '22px 14px',
                                            borderRadius: '16px',
                                            border: isSelected
                                                ? '2px solid rgba(139, 92, 246, 0.5)'
                                                : '1px solid var(--border-subtle)',
                                            background: isSelected
                                                ? 'rgba(139, 92, 246, 0.1)'
                                                : 'rgba(255,255,255,0.03)',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>{target.icon}</div>
                                        <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                            {target.label}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{target.desc}</div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Quick Launch Buttons */}
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                🚀 Ready to start? Jump right in!
                            </h3>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => handleComplete('practice')}
                                    className="btn-primary"
                                    style={{
                                        padding: '14px 28px', fontSize: '15px',
                                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                        boxShadow: '0 6px 24px rgba(139, 92, 246, 0.3)',
                                    }}
                                >
                                    <Mic size={18} /> Free Practice
                                </button>
                                <button
                                    onClick={() => handleComplete('scenarios')}
                                    className="btn-secondary"
                                    style={{ padding: '14px 28px', fontSize: '15px' }}
                                >
                                    <MessageSquare size={16} /> Try a Scenario
                                </button>
                                <button
                                    onClick={() => handleComplete('dashboard')}
                                    className="btn-secondary"
                                    style={{ padding: '14px 28px', fontSize: '15px' }}
                                >
                                    Explore Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // Main render
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'var(--bg-primary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
            animation: isExiting ? 'fadeOut 0.4s ease forwards' : 'fadeSlideIn 0.5s ease',
        }}>
            {/* Background ambient */}
            <div className="bg-ambient" />

            {/* Skip button - only show for preference steps */}
            {step > 0 && mode !== 'login' && mode !== 'signup' && (
                <button
                    onClick={handleSkip}
                    style={{
                        position: 'absolute', top: '24px', right: '24px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500',
                        padding: '8px 16px', borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        zIndex: 10,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                    Skip →
                </button>
            )}

            {/* Progress dots - only for preference steps */}
            {mode !== 'welcome' && mode !== 'login' && mode !== 'signup' && (
                <div style={{
                    display: 'flex', gap: '8px', marginBottom: '40px',
                    position: 'relative', zIndex: 1,
                }}>
                    {[0, 1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            style={{
                                width: i === step ? '28px' : '8px',
                                height: '8px',
                                borderRadius: '999px',
                                background: i <= step
                                    ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                                    : 'rgba(255,255,255,0.1)',
                                transition: 'all 0.3s ease',
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Content */}
            <div style={{
                maxWidth: '560px', width: '100%',
                position: 'relative', zIndex: 1,
            }}>
                {mode === 'welcome' && renderWelcome()}
                {(mode === 'login' || mode === 'signup') && renderAuthForm()}
                {mode !== 'welcome' && mode !== 'login' && mode !== 'signup' && renderPreferences()}
            </div>

            {/* Navigation Buttons - only for preference steps */}
            {step > 0 && step < 4 && mode !== 'welcome' && mode !== 'login' && mode !== 'signup' && (
                <div style={{
                    display: 'flex', gap: '12px', marginTop: '36px',
                    position: 'relative', zIndex: 1,
                }}>
                    <button onClick={() => setStep(s => s - 1)} className="btn-secondary" style={{ padding: '12px 24px' }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <button
                        onClick={() => setStep(s => s + 1)}
                        className="btn-primary"
                        style={{ padding: '12px 32px' }}
                    >
                        Continue <ArrowRight size={16} />
                    </button>
                </div>
            )}

            <style>{`
                @keyframes fadeOut {
                    from { opacity: 1; transform: scale(1); }
                    to { opacity: 0; transform: scale(1.02); }
                }
                input::placeholder {
                    color: rgba(255, 255, 255, 0.3);
                }
            `}</style>
        </div>
    );
};

export default Onboarding;