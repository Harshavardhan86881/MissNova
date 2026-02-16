import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, Clock, Flame, CheckCircle } from 'lucide-react';
import { trackEvent, EVENTS } from '../utils/analytics';

/**
 * NotificationManager — handles browser push notification permission and scheduling
 * Addresses the "No Push/Reminder Notifications" gap (High Priority)
 * Impacts: Day-1/7/30 Retention, Streak Continuation
 */

const NOTIF_PREFS_KEY = 'voice_tutor_notification_prefs';
const REMINDER_CHECK_KEY = 'voice_tutor_last_reminder_check';

function getNotifPrefs() {
    try {
        const data = localStorage.getItem(NOTIF_PREFS_KEY);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function saveNotifPrefs(prefs) {
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
}

/**
 * Schedule a browser notification (uses setTimeout since service workers are complex)
 */
function scheduleReminder(title, body, delayMs) {
    if (Notification.permission === 'granted') {
        setTimeout(() => {
            try {
                new Notification(title, {
                    body,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: 'voice-tutor-reminder',
                    renotify: true,
                });
            } catch (e) {
                console.warn('Notification failed:', e);
            }
        }, delayMs);
        trackEvent(EVENTS.NOTIFICATION_SCHEDULED, { title, delayMs });
    }
}

/**
 * Check & schedule daily reminders based on user's last visit
 */
export function checkAndScheduleReminders(streakDays = 0) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const prefs = getNotifPrefs();
    if (!prefs?.enabled) return;

    const lastCheck = localStorage.getItem(REMINDER_CHECK_KEY);
    const today = new Date().toISOString().split('T')[0];
    if (lastCheck === today) return;
    localStorage.setItem(REMINDER_CHECK_KEY, today);

    // Schedule a "don't forget" reminder for later today (8 hours from now)
    const eightHours = 8 * 60 * 60 * 1000;
    scheduleReminder(
        "🔥 Don't break your streak!",
        streakDays > 0
            ? `You're on a ${streakDays}-day streak! Practice for 5 minutes to keep it going.`
            : `Start a practice session to build your streak!`,
        eightHours
    );
}

/**
 * NotificationBanner — shown to users who haven't opted in/out
 */
export const NotificationBanner = ({ stats, onDismiss }) => {
    const [visible, setVisible] = useState(false);
    const [granted, setGranted] = useState(false);

    useEffect(() => {
        // Only show if notifications are supported and we haven't asked
        if (typeof Notification === 'undefined') return;
        const prefs = getNotifPrefs();
        if (prefs !== null) return; // Already decided
        if (Notification.permission === 'granted') {
            saveNotifPrefs({ enabled: true, askedAt: new Date().toISOString() });
            return;
        }
        if (Notification.permission === 'denied') {
            saveNotifPrefs({ enabled: false, askedAt: new Date().toISOString() });
            return;
        }

        // Show the banner after a delay (not immediately — let users settle in first)
        const timer = setTimeout(() => setVisible(true), 30000); // 30 seconds
        return () => clearTimeout(timer);
    }, []);

    const handleEnable = async () => {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setGranted(true);
                saveNotifPrefs({ enabled: true, askedAt: new Date().toISOString() });
                trackEvent(EVENTS.NOTIFICATION_PERMISSION_GRANTED);
                checkAndScheduleReminders(stats?.streak_days || 0);

                // Show success briefly, then hide
                setTimeout(() => {
                    setVisible(false);
                    onDismiss?.();
                }, 2000);
            } else {
                saveNotifPrefs({ enabled: false, askedAt: new Date().toISOString() });
                trackEvent(EVENTS.NOTIFICATION_PERMISSION_DENIED);
                setVisible(false);
                onDismiss?.();
            }
        } catch (e) {
            console.warn('Notification permission error:', e);
            setVisible(false);
        }
    };

    const handleDismiss = () => {
        saveNotifPrefs({ enabled: false, askedAt: new Date().toISOString(), dismissed: true });
        setVisible(false);
        onDismiss?.();
    };

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 150,
            maxWidth: '420px',
            width: 'calc(100% - 48px)',
            animation: 'toastIn 0.4s ease forwards',
        }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.1))',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '16px',
                padding: '18px 20px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            }}>
                {granted ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <CheckCircle size={24} style={{ color: '#34d399' }} />
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#34d399' }}>Reminders enabled!</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>We'll remind you to keep your streak alive</div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: 'rgba(139, 92, 246, 0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Bell size={20} style={{ color: '#a78bfa' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>
                                    🔔 Stay on track?
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '12px' }}>
                                    Get daily reminders to practice and keep your streak alive. Users with reminders learn 2x faster!
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleEnable}
                                        style={{
                                            padding: '8px 18px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                            color: 'white',
                                            fontSize: '12px', fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                        }}
                                    >
                                        <Bell size={12} /> Enable Reminders
                                    </button>
                                    <button
                                        onClick={handleDismiss}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'none',
                                            color: 'var(--text-muted)',
                                            fontSize: '12px', fontWeight: '500',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Not now
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', padding: '2px',
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default NotificationBanner;
