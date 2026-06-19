// Axios API Configuration for Voice Tutor App
// - Automatic JWT Bearer token attachment
// - Token refresh handling
// - Cookie support for httpOnly tokens
import axios from 'axios';

// Create axios instance with base config
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for httpOnly cookies
});

// Token storage (for non-cookie fallback)
let accessToken = null;

// Get token from localStorage (fallback)
const getStoredToken = () => {
  try {
    const auth = localStorage.getItem('voice_tutor_auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      return parsed.accessToken;
    }
  } catch (e) {
    console.error('Failed to parse auth from storage:', e);
  }
  return null;
};

// Set token in memory and localStorage
export const setAuthToken = (token, refreshToken) => {
  accessToken = token;
  localStorage.setItem('voice_tutor_auth', JSON.stringify({
    accessToken: token,
    refreshToken: refreshToken,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
  }));
};

// Clear auth token
export const clearAuthToken = () => {
  accessToken = null;
  localStorage.removeItem('voice_tutor_auth');
};

// Check if token is expired or about to expire
const isTokenExpired = () => {
  try {
    const auth = localStorage.getItem('voice_tutor_auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      // Refresh if less than 2 minutes remaining
      return parsed.expiresAt ? Date.now() > parsed.expiresAt - 120000 : true;
    }
  } catch (e) {
    // Ignore errors
  }
  return true;
};

// Refresh access token using refresh token
const refreshAccessToken = async () => {
  try {
    const response = await axios.post('/api/auth/refresh', {}, {
      withCredentials: true, // Uses httpOnly cookie
    });
    
    if (response.data.access_token) {
      setAuthToken(response.data.access_token);
      return response.data.access_token;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    clearAuthToken();
    // Redirect to login if refresh fails
    window.location.href = '/';
  }
  return null;
};

// Request interceptor - attach Bearer token
api.interceptors.request.use(
  async (config) => {
    // First check memory token
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    }
    
    // Then check localStorage (for page refresh)
    const storedToken = getStoredToken();
    if (storedToken) {
      // Check if token is about to expire
      if (isTokenExpired()) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
        }
      } else {
        accessToken = storedToken;
        config.headers.Authorization = `Bearer ${storedToken}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Auth refresh failed:', refreshError);
        clearAuthToken();
        window.location.href = '/';
      }
    }
    
    return Promise.reject(error);
  }
);

// Export configured axios instance
export default api;

// Helper functions for common API calls
export const authAPI = {
  signup: async (data) => {
    const response = await api.post('/auth/signup', data);
    if (response.data.access_token) {
      setAuthToken(response.data.access_token, response.data.refresh_token);
    }
    return response.data;
  },
  
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.access_token) {
      setAuthToken(response.data.access_token, response.data.refresh_token);
    }
    return response.data;
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuthToken();
    }
  },
  
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  updateProfile: async (data) => {
    const response = await api.patch('/auth/profile', data);
    return response.data;
  },
  
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },
  
  checkPasswordStrength: async (password) => {
    const response = await api.post('/auth/password-strength', { password });
    return response.data;
  },
  
  checkPwnedPassword: async (password) => {
    const response = await api.post('/auth/check-pwned', { password });
    return response.data;
  },
};

export const gamificationAPI = {
  getStats: async () => {
    const response = await api.get('/gamification/stats');
    return response.data;
  },
  
  getLeaderboard: async (limit = 10) => {
    const response = await api.get(`/gamification/leaderboard?limit=${limit}`);
    return response.data;
  },
  
  getRank: async () => {
    const response = await api.get('/gamification/rank');
    return response.data;
  },
  
  getBadges: async () => {
    const response = await api.get('/gamification/badges');
    return response.data;
  },
  
  getDailyGoal: async () => {
    const response = await api.get('/gamification/daily-goal');
    return response.data;
  },
  
  triggerStreakFreeze: async () => {
    const response = await api.post('/gamification/streak-freeze');
    return response.data;
  },
};

// Session API for practice sessions
export const sessionAPI = {
  processText: async (text) => {
    const response = await api.post('/process-text', { text });
    return response.data;
  },
  
  scenarioChat: async (text, scenarioId, scenarioContext) => {
    const response = await api.post('/scenario-chat', {
      text,
      scenario_id: scenarioId,
      scenario_context: scenarioContext,
    });
    return response.data;
  },
  
  evaluateTongueTwister: async (text, target) => {
    const response = await api.post('/evaluate-tongue-twister', { text, target });
    return response.data;
  },
  
  completeDailyChallenge: async (text) => {
    const response = await api.post('/daily-challenge', { text });
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/stats');
    return response.data;
  },
};
