import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PracticeChat from './components/PracticeChat';
import Scenarios from './components/Scenarios';
import ScenarioChat from './components/ScenarioChat';
import TongueTwisters from './components/TongueTwisters';
import VocabularyBank from './components/VocabularyBank';
import Progress from './components/Progress';
import DailyChallenge from './components/DailyChallenge';
import DailyVocab from './components/DailyVocab';
import TranslateInput from './components/TranslateInput';
import BLUFGenerator from './components/BLUFGenerator';
import ToneCalibrator from './components/ToneCalibrator';
import ListeningSimulator from './components/ListeningSimulator';
import BadgeToast from './components/BadgeToast';
import MobileNav from './components/MobileNav';
import Onboarding from './components/Onboarding';
import { NotificationBanner, checkAndScheduleReminders } from './components/NotificationManager';
import { trackPageView, trackEvent, EVENTS, isOnboardingComplete } from './utils/analytics';
import { authFetch } from './utils/authFetch';

// Check if user is logged in
const isLoggedIn = () => {
  try {
    const auth = localStorage.getItem('voice_tutor_auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      // Check if token exists and isn't expired
      if (parsed.accessToken && parsed.expiresAt) {
        return Date.now() < parsed.expiresAt;
      }
      // Has some auth data
      return !!parsed.accessToken;
    }
  } catch (e) {
    return false;
  }
  return false;
};

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [newBadges, setNewBadges] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('voice_tutor_language') || 'english';
  });

  // Listen for language changes from Sidebar or other components
  useEffect(() => {
    const handleStorageLang = (e) => {
      if (e.key === 'voice_tutor_language' && e.newValue) {
        setCurrentLanguage(e.newValue);
      }
    };
    // Also poll localStorage for same-tab changes
    const interval = setInterval(() => {
      const stored = localStorage.getItem('voice_tutor_language');
      if (stored && stored !== currentLanguage) {
        setCurrentLanguage(stored);
      }
    }, 1000);
    window.addEventListener('storage', handleStorageLang);
    return () => {
      window.removeEventListener('storage', handleStorageLang);
      clearInterval(interval);
    };
  }, [currentLanguage]);

  // On mount: try a silent token refresh first.
  // The /api/auth/refresh endpoint issues a new token from the token format itself
  // (user_id:username:hex) — it does NOT require the database to be populated.
  // This means even after a Vercel cold start (ephemeral DB wiped), existing
  // sessions are silently extended instead of forcing the user to re-login.
  useEffect(() => {
    const silentRefresh = async () => {
      const onboarded = isOnboardingComplete();
      let authenticated = isLoggedIn();

      // If we have ANY token (even expired), try to silently refresh it.
      // This resets the 30-day client-side expiry without a visible login screen.
      try {
        const raw = localStorage.getItem('voice_tutor_auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.accessToken) {
            const res = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${parsed.accessToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              // Update localStorage with new token + 30-day expiry
              localStorage.setItem('voice_tutor_auth', JSON.stringify({
                ...parsed,
                accessToken: data.access_token,
                expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
              }));
              authenticated = true;
            }
          }
        }
      } catch (_) {
        // Refresh failed — fall back to the local expiry check below
        authenticated = isLoggedIn();
      }

      setIsAuthenticated(authenticated);
      if (!authenticated || !onboarded) {
        setShowOnboarding(true);
      }
      setIsLoading(false);
    };

    silentRefresh();
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        // Schedule notifications based on streak data
        checkAndScheduleReminders(data.streak_days);
      }
    } catch (e) {
      trackEvent(EVENTS.API_ERROR, { endpoint: '/api/stats', error: e.message });
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleBadges = (badges) => {
    if (badges && badges.length > 0) {
      setNewBadges(prev => [...prev, ...badges]);
      badges.forEach(b => trackEvent(EVENTS.BADGE_EARNED, { badge: b.name }));
    }
  };

  const dismissBadge = () => {
    setNewBadges(prev => prev.slice(1));
  };

  const navigateTo = (page, data) => {
    if (page === 'scenario-chat' && data) {
      setSelectedScenario(data);
    }
    setCurrentPage(page);
    trackPageView(page);
    window.scrollTo(0, 0);
  };

  const handleOnboardingComplete = (userData) => {
    setShowOnboarding(false);
    setIsAuthenticated(true);
    // If user data was passed (from signup), use it
    if (userData) {
      localStorage.setItem('voice_tutor_auth', JSON.stringify({
        accessToken: userData.access_token,
        refreshToken: userData.refresh_token,
        user: userData.user,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      }));
    }
    fetchStats();
  };

  // Handle logout from anywhere in the app
  const handleLogout = () => {
    localStorage.removeItem('voice_tutor_auth');
    localStorage.removeItem('voice_tutor_preferences');
    localStorage.removeItem('voice_tutor_onboarding');
    setIsAuthenticated(false);
    setShowOnboarding(true);
    setStats(null);
  };

  // Listen for storage changes (logout from another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'voice_tutor_auth' && !e.newValue) {
        handleLogout();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: '900',
          color: 'white',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>N</div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  // Show onboarding for first-time users OR unauthenticated users
  if (showOnboarding || !isAuthenticated) {
    return <Onboarding onComplete={handleOnboardingComplete} navigateTo={navigateTo} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard stats={stats} navigateTo={navigateTo} />;
      case 'practice':
        return <PracticeChat onStatsUpdate={fetchStats} onBadges={handleBadges} language={currentLanguage} />;
      case 'scenarios':
        return <Scenarios navigateTo={navigateTo} />;
      case 'scenario-chat':
        return <ScenarioChat scenario={selectedScenario} navigateTo={navigateTo} onStatsUpdate={fetchStats} onBadges={handleBadges} language={currentLanguage} />;
      case 'tongue-twisters':
        return <TongueTwisters onStatsUpdate={fetchStats} onBadges={handleBadges} language={currentLanguage} />;
      case 'vocabulary':
        return <VocabularyBank />;
      case 'progress':
        return <Progress />;
      case 'daily-challenge':
        return <DailyChallenge onStatsUpdate={fetchStats} onBadges={handleBadges} language={currentLanguage} />;
      case 'daily-vocab':
        return <DailyVocab onStatsUpdate={fetchStats} onBadges={handleBadges} language={currentLanguage} />;
      case 'translate':
        return <TranslateInput onStatsUpdate={fetchStats} onBadges={handleBadges} />;
      case 'bluf-generator':
        return <BLUFGenerator />;
      case 'tone-calibrator':
        return <ToneCalibrator />;
      case 'listening-simulator':
        return <ListeningSimulator />;
      default:
        return <Dashboard stats={stats} navigateTo={navigateTo} />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Background ambient effect */}
      <div className="bg-ambient" />

      {/* Desktop Sidebar */}
      <Sidebar
        currentPage={currentPage}
        navigateTo={navigateTo}
        stats={stats}
      />

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: '260px',
        padding: '24px 32px',
        paddingBottom: '100px',
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
      }}>
        <div className="page-enter" key={currentPage}>
          {renderPage()}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav currentPage={currentPage} navigateTo={navigateTo} />

      {/* Badge Toast */}
      {newBadges.length > 0 && (
        <BadgeToast badge={newBadges[0]} onDismiss={dismissBadge} stats={stats} />
      )}

      {/* Notification Permission Banner */}
      <NotificationBanner stats={stats} />

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          main {
            margin-left: 0 !important;
            padding: 16px !important;
            padding-bottom: 90px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
