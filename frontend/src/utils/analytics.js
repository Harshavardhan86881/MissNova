/**
 * Analytics Event Tracking System
 * Tracks user behavior to measure key growth metrics:
 * - Activation Rate
 * - Time to First Value
 * - Session Duration
 * - Feature Discovery Rate
 * - Day-1/7/30 Retention signals
 * - Error/Friction Rate
 */

const ANALYTICS_STORAGE_KEY = 'voice_tutor_analytics';
const SESSION_KEY = 'voice_tutor_session';

// Event types
export const EVENTS = {
    // Session events
    SESSION_START: 'session_start',
    SESSION_END: 'session_end',
    PAGE_VIEW: 'page_view',

    // Activation events
    FIRST_PRACTICE: 'first_practice',
    FIRST_SCENARIO: 'first_scenario',
    FIRST_CHALLENGE: 'first_challenge',
    FIRST_VOCAB: 'first_vocab',
    ONBOARDING_START: 'onboarding_start',
    ONBOARDING_COMPLETE: 'onboarding_complete',
    ONBOARDING_SKIP: 'onboarding_skip',
    ONBOARDING_STEP: 'onboarding_step',

    // Feature usage events
    PRACTICE_START: 'practice_start',
    PRACTICE_COMPLETE: 'practice_complete',
    SCENARIO_START: 'scenario_start',
    SCENARIO_COMPLETE: 'scenario_complete',
    CHALLENGE_START: 'challenge_start',
    CHALLENGE_COMPLETE: 'challenge_complete',
    VOCAB_PRACTICE: 'vocab_practice',
    TONGUE_TWISTER_START: 'tongue_twister_start',
    TONGUE_TWISTER_COMPLETE: 'tongue_twister_complete',
    SHARE_PROGRESS: 'share_progress',
    SHARE_BADGE: 'share_badge',

    // Engagement events
    BADGE_EARNED: 'badge_earned',
    LEVEL_UP: 'level_up',
    STREAK_CONTINUE: 'streak_continue',
    STREAK_FREEZE_USED: 'streak_freeze_used',
    XP_EARNED: 'xp_earned',
    GOAL_SET: 'goal_set',
    GOAL_COMPLETE: 'goal_complete',

    // Notification events
    NOTIFICATION_PERMISSION_GRANTED: 'notification_permission_granted',
    NOTIFICATION_PERMISSION_DENIED: 'notification_permission_denied',
    NOTIFICATION_SCHEDULED: 'notification_scheduled',

    // Error events
    API_ERROR: 'api_error',
    MIC_PERMISSION_DENIED: 'mic_permission_denied',
    FEATURE_ERROR: 'feature_error',
};

// Initialize analytics storage
function getAnalyticsData() {
    try {
        const data = localStorage.getItem(ANALYTICS_STORAGE_KEY);
        return data ? JSON.parse(data) : { events: [], metrics: {}, firstVisit: null };
    } catch {
        return { events: [], metrics: {}, firstVisit: null };
    }
}

function saveAnalyticsData(data) {
    try {
        // Keep only last 500 events to prevent storage overflow
        if (data.events.length > 500) {
            data.events = data.events.slice(-500);
        }
        localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Analytics storage error:', e);
    }
}

// Session management
function getSessionData() {
    try {
        const data = sessionStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function saveSessionData(data) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Session storage error:', e);
    }
}

/**
 * Track an analytics event
 * @param {string} eventName - Event name from EVENTS enum
 * @param {object} properties - Additional event properties
 */
export function trackEvent(eventName, properties = {}) {
    const data = getAnalyticsData();

    const event = {
        event: eventName,
        timestamp: new Date().toISOString(),
        properties,
        sessionId: getSessionData()?.id || 'unknown',
    };

    data.events.push(event);

    // Update computed metrics
    updateMetrics(data, eventName, properties);

    saveAnalyticsData(data);

    // Debug logging in development
    if (import.meta.env?.DEV) {
        console.log(`📊 [Analytics] ${eventName}`, properties);
    }
}

/**
 * Start a new session
 */
export function startSession() {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
        id: sessionId,
        startTime: new Date().toISOString(),
        pagesViewed: [],
        featuresUsed: [],
    };
    saveSessionData(session);

    const data = getAnalyticsData();
    if (!data.firstVisit) {
        data.firstVisit = new Date().toISOString();
        saveAnalyticsData(data);
    }

    trackEvent(EVENTS.SESSION_START, { sessionId });
}

/**
 * Track a page view
 * @param {string} pageName - Name of the page
 */
export function trackPageView(pageName) {
    const session = getSessionData();
    if (session) {
        if (!session.pagesViewed.includes(pageName)) {
            session.pagesViewed.push(pageName);
        }
        saveSessionData(session);
    }

    trackEvent(EVENTS.PAGE_VIEW, { page: pageName });
}

/**
 * Track feature usage
 * @param {string} featureName - Name of the feature used
 */
export function trackFeatureUse(featureName) {
    const session = getSessionData();
    if (session) {
        if (!session.featuresUsed.includes(featureName)) {
            session.featuresUsed.push(featureName);
        }
        saveSessionData(session);
    }
}

/**
 * Update computed metrics
 */
function updateMetrics(data, eventName, properties) {
    if (!data.metrics) data.metrics = {};

    // Track total sessions
    if (eventName === EVENTS.SESSION_START) {
        data.metrics.totalSessions = (data.metrics.totalSessions || 0) + 1;
    }

    // Track features discovered
    if (eventName === EVENTS.PAGE_VIEW) {
        if (!data.metrics.featuresDiscovered) data.metrics.featuresDiscovered = [];
        if (!data.metrics.featuresDiscovered.includes(properties.page)) {
            data.metrics.featuresDiscovered.push(properties.page);
        }
    }

    // Track first practice time (Time to First Value)
    if (eventName === EVENTS.FIRST_PRACTICE && !data.metrics.timeToFirstValue) {
        data.metrics.timeToFirstValue = new Date().toISOString();
        const firstVisit = new Date(data.firstVisit);
        data.metrics.timeToFirstValueMs = Date.now() - firstVisit.getTime();
    }

    // Track activation
    if ([EVENTS.FIRST_PRACTICE, EVENTS.ONBOARDING_COMPLETE].includes(eventName)) {
        data.metrics.activated = true;
        data.metrics.activationDate = new Date().toISOString();
    }

    // Track share events
    if ([EVENTS.SHARE_PROGRESS, EVENTS.SHARE_BADGE].includes(eventName)) {
        data.metrics.totalShares = (data.metrics.totalShares || 0) + 1;
    }

    // Track errors
    if ([EVENTS.API_ERROR, EVENTS.MIC_PERMISSION_DENIED, EVENTS.FEATURE_ERROR].includes(eventName)) {
        data.metrics.totalErrors = (data.metrics.totalErrors || 0) + 1;
    }

    // Track daily active days
    const today = new Date().toISOString().split('T')[0];
    if (!data.metrics.activeDays) data.metrics.activeDays = [];
    if (!data.metrics.activeDays.includes(today)) {
        data.metrics.activeDays.push(today);
        // Keep only last 60 days
        if (data.metrics.activeDays.length > 60) {
            data.metrics.activeDays = data.metrics.activeDays.slice(-60);
        }
    }
}

/**
 * Get onboarding status
 * @returns {boolean} Whether onboarding has been completed
 */
export function isOnboardingComplete() {
    const data = getAnalyticsData();
    return data.metrics?.onboardingComplete === true;
}

/**
 * Mark onboarding as complete
 */
export function completeOnboarding() {
    const data = getAnalyticsData();
    if (!data.metrics) data.metrics = {};
    data.metrics.onboardingComplete = true;
    saveAnalyticsData(data);
    trackEvent(EVENTS.ONBOARDING_COMPLETE);
}

/**
 * Get basic analytics summary (for future admin dashboard)
 */
export function getAnalyticsSummary() {
    const data = getAnalyticsData();
    const session = getSessionData();

    return {
        firstVisit: data.firstVisit,
        totalSessions: data.metrics?.totalSessions || 0,
        activated: data.metrics?.activated || false,
        featuresDiscovered: data.metrics?.featuresDiscovered?.length || 0,
        activeDays: data.metrics?.activeDays?.length || 0,
        totalShares: data.metrics?.totalShares || 0,
        totalErrors: data.metrics?.totalErrors || 0,
        onboardingComplete: data.metrics?.onboardingComplete || false,
        currentSession: session ? {
            pagesViewed: session.pagesViewed?.length || 0,
            featuresUsed: session.featuresUsed?.length || 0,
        } : null,
    };
}

// Auto start session on import
startSession();
