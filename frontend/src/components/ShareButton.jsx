import React, { useState, useRef } from 'react';
import { Share2, Copy, Check, Download, X, Twitter, Linkedin } from 'lucide-react';
import { trackEvent, EVENTS } from '../utils/analytics';

/**
 * ShareCard component — generates a shareable card for progress/badges
 * Addresses the "No Social/Sharing Features" gap (High Priority)
 */

const ShareButton = ({ stats, badge, variant = 'icon', style = {} }) => {
    const [showModal, setShowModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        setShowModal(true);
        trackEvent(badge ? EVENTS.SHARE_BADGE : EVENTS.SHARE_PROGRESS, {
            badge: badge?.name,
            level: stats?.level,
        });
    };

    const shareText = badge
        ? `🏆 I just earned the "${badge.name}" badge on Voice Tutor! ${badge.icon}\n${badge.description}\n\n🎯 Level ${stats?.level || 1} | 🔥 ${stats?.streak_days || 0} day streak | ⚡ ${stats?.xp?.toLocaleString() || '0'} XP\n\n#VoiceTutor #EnglishLearning #SpeakConfidently`
        : `📊 My Voice Tutor Progress:\n\n⚡ Level ${stats?.level || 1}\n🔥 ${stats?.streak_days || 0} day streak\n💬 ${stats?.session_count || 0} sessions completed\n📝 ${stats?.words_spoken?.toLocaleString() || '0'} words spoken\n🎯 ${stats?.average_accuracy || 0}/10 fluency score\n📚 ${stats?.vocabulary_count || 0} words learned\n\n#VoiceTutor #EnglishLearning #SpeakConfidently`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = shareText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: badge ? `Badge Earned: ${badge.name}` : 'My Voice Tutor Progress',
                    text: shareText,
                    url: window.location.origin,
                });
            } catch (e) {
                // User cancelled share
            }
        }
    };

    const handleTwitterShare = () => {
        const url = encodeURIComponent(window.location.origin);
        const text = encodeURIComponent(shareText);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    };

    const handleLinkedInShare = () => {
        const url = encodeURIComponent(window.location.origin);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    };

    return (
        <>
            {variant === 'icon' ? (
                <button
                    onClick={handleShare}
                    title="Share your progress"
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '6px',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        ...style,
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = '#8b5cf6';
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.background = 'none';
                    }}
                >
                    <Share2 size={16} />
                </button>
            ) : (
                <button
                    onClick={handleShare}
                    className="btn-secondary"
                    style={{
                        fontSize: '13px',
                        padding: '10px 18px',
                        ...style,
                    }}
                >
                    <Share2 size={14} /> Share Progress
                </button>
            )}

            {/* Share Modal */}
            {showModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '24px',
                        animation: 'fadeSlideIn 0.3s ease',
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
                >
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '20px',
                        padding: '28px',
                        maxWidth: '440px',
                        width: '100%',
                        position: 'relative',
                    }}>
                        {/* Close button */}
                        <button
                            onClick={() => setShowModal(false)}
                            style={{
                                position: 'absolute', top: '16px', right: '16px',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', padding: '4px',
                            }}
                        >
                            <X size={18} />
                        </button>

                        <h3 style={{
                            fontSize: '18px', fontWeight: '700', marginBottom: '6px',
                            display: 'flex', alignItems: 'center', gap: '10px',
                        }}>
                            <Share2 size={20} style={{ color: '#8b5cf6' }} />
                            {badge ? 'Share Your Achievement' : 'Share Your Progress'}
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                            Let others know about your learning journey!
                        </p>

                        {/* Preview Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.08))',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            borderRadius: '14px',
                            padding: '20px',
                            marginBottom: '20px',
                            fontSize: '13px',
                            lineHeight: '1.8',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'pre-line',
                        }}>
                            {shareText}
                        </div>

                        {/* Share Actions */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {/* Copy to clipboard */}
                            <button
                                onClick={handleCopy}
                                style={{
                                    flex: 1,
                                    padding: '12px 18px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-subtle)',
                                    background: copied ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    color: copied ? '#34d399' : 'var(--text-secondary)',
                                    fontSize: '13px', fontWeight: '600',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Copy Text'}
                            </button>

                            {/* Native share (mobile) */}
                            {typeof navigator !== 'undefined' && navigator.share && (
                                <button
                                    onClick={handleNativeShare}
                                    style={{
                                        flex: 1,
                                        padding: '12px 18px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        color: 'white',
                                        fontSize: '13px', fontWeight: '600',
                                    }}
                                >
                                    <Share2 size={16} /> Share
                                </button>
                            )}
                        </div>

                        {/* Social Links */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                            <button
                                onClick={handleTwitterShare}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(29, 161, 242, 0.2)',
                                    background: 'rgba(29, 161, 242, 0.08)',
                                    cursor: 'pointer',
                                    color: '#1DA1F2',
                                    fontSize: '12px', fontWeight: '600',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                }}
                            >
                                <Twitter size={14} /> Twitter / X
                            </button>
                            <button
                                onClick={handleLinkedInShare}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(10, 102, 194, 0.2)',
                                    background: 'rgba(10, 102, 194, 0.08)',
                                    cursor: 'pointer',
                                    color: '#0A66C2',
                                    fontSize: '12px', fontWeight: '600',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                }}
                            >
                                <Linkedin size={14} /> LinkedIn
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ShareButton;
